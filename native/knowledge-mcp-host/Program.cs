using System.Diagnostics;
using System.Text;
using System.Text.Json;

internal static class Program
{
    private const int MaxMessageBytes = 1024 * 1024;
    private static readonly HashSet<string> AllowedTools = new(StringComparer.Ordinal)
    {
        "bc_process_resolve_object",
        "bc_process_resolve_action"
    };

    private static async Task<int> Main()
    {
        var serverPath = FindServerPath();
        if (serverPath is null)
        {
            Console.Error.WriteLine("Knowledge MCP server files were not found.");
            return 2;
        }

        var start = new ProcessStartInfo("node")
        {
            UseShellExecute = false,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        start.ArgumentList.Add(serverPath);

        using var mcp = new Process { StartInfo = start, EnableRaisingEvents = true };
        try
        {
            if (!mcp.Start()) return 3;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine($"Could not start Node.js for the knowledge MCP server: {error.Message}");
            return 3;
        }

        _ = DrainErrorsAsync(mcp.StandardError);
        var output = ForwardServerResponsesAsync(mcp.StandardOutput, Console.OpenStandardOutput());
        var input = ForwardHostRequestsAsync(Console.OpenStandardInput(), mcp);
        var completed = await Task.WhenAny(input, output);
        if (completed == input)
        {
            // Edge closes the native host's stdin when the port disconnects.
            // Propagate EOF into MCP so Node can exit cleanly instead of being
            // killed and making the native host report exit code -1.
            try { mcp.StandardInput.Close(); } catch { }
            try
            {
                await mcp.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(5));
                await output;
            }
            catch (TimeoutException)
            {
                try { if (!mcp.HasExited) mcp.Kill(entireProcessTree: true); } catch { }
                await mcp.WaitForExitAsync();
                return 4;
            }
        }
        else
        {
            try { if (!mcp.HasExited) mcp.Kill(entireProcessTree: true); } catch { }
            await mcp.WaitForExitAsync();
        }
        return mcp.ExitCode;
    }

    private static string? FindServerPath()
    {
        var configured = Environment.GetEnvironmentVariable("BC_PROCESS_STUDIO_MCP_SERVER");
        if (!string.IsNullOrWhiteSpace(configured) && File.Exists(configured))
            return Path.GetFullPath(configured);

        for (var directory = new DirectoryInfo(AppContext.BaseDirectory);
             directory is not null; directory = directory.Parent)
        {
            var candidate = Path.Combine(directory.FullName,
                "services", "knowledge-mcp-server", "src", "server.js");
            if (File.Exists(candidate)) return candidate;
        }
        return null;
    }

    private static async Task ForwardHostRequestsAsync(Stream input, Process mcp)
    {
        var lengthBytes = new byte[4];
        while (await ReadExactlyAsync(input, lengthBytes))
        {
            var length = BitConverter.ToInt32(lengthBytes, 0);
            if (length is <= 0 or > MaxMessageBytes) return;
            var payload = new byte[length];
            if (!await ReadExactlyAsync(input, payload)) return;

            JsonDocument message;
            try { message = JsonDocument.Parse(payload); }
            catch { return; }
            using (message)
            {
                var root = message.RootElement;
                if (root.TryGetProperty("method", out var method) && method.GetString() == "tools/call" &&
                    (!root.TryGetProperty("params", out var parameters) ||
                     !parameters.TryGetProperty("name", out var name) ||
                     !AllowedTools.Contains(name.GetString() ?? "")))
                {
                    await WriteErrorAsync(Console.OpenStandardOutput(), root, -32602,
                        "Only the two read-only BC Process Studio knowledge tools are allowed.");
                    continue;
                }
            }

            var json = Encoding.UTF8.GetString(payload);
            await mcp.StandardInput.WriteLineAsync(json);
            await mcp.StandardInput.FlushAsync();
        }
    }

    private static async Task ForwardServerResponsesAsync(StreamReader reader, Stream output)
    {
        while (await reader.ReadLineAsync() is { } line)
        {
            var payload = Encoding.UTF8.GetBytes(line);
            if (payload.Length is <= 0 or > MaxMessageBytes) return;
            var header = BitConverter.GetBytes(payload.Length);
            await output.WriteAsync(header);
            await output.WriteAsync(payload);
            await output.FlushAsync();
        }
    }

    private static async Task<bool> ReadExactlyAsync(Stream stream, byte[] buffer)
    {
        var offset = 0;
        while (offset < buffer.Length)
        {
            var count = await stream.ReadAsync(buffer.AsMemory(offset, buffer.Length - offset));
            if (count == 0) return offset == 0 ? false : throw new EndOfStreamException();
            offset += count;
        }
        return true;
    }

    private static async Task WriteErrorAsync(Stream output, JsonElement request, int code, string text)
    {
        if (!request.TryGetProperty("id", out var id)) return;
        var response = JsonSerializer.SerializeToUtf8Bytes(new
        {
            jsonrpc = "2.0",
            id,
            error = new { code, message = text }
        });
        await output.WriteAsync(BitConverter.GetBytes(response.Length));
        await output.WriteAsync(response);
        await output.FlushAsync();
    }

    private static async Task DrainErrorsAsync(StreamReader reader)
    {
        while (await reader.ReadLineAsync() is not null) { }
    }
}
