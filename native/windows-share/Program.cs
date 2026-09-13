using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace BCProcessStudio.Share;

internal record ShareRequest(int schemaVersion, string action, string title,
    string supportEmail, string reportJson, string markdown,
    string? pdfBase64 = null, bool includeTechnicalPackage = false);

internal static class Protocol
{
    internal const int MaxBytes = 24 * 1024 * 1024;
    internal static ShareRequest Read(Stream input)
    {
        Span<byte> header = stackalloc byte[4];
        input.ReadExactly(header);
        int length = System.Buffers.Binary.BinaryPrimitives.ReadInt32LittleEndian(header);
        if (length <= 0 || length > MaxBytes) throw new InvalidDataException("Invalid message size.");
        byte[] bytes = new byte[length];
        input.ReadExactly(bytes);
        var request = JsonSerializer.Deserialize<ShareRequest>(bytes)
            ?? throw new InvalidDataException("Missing message.");
        Validate(request);
        return request;
    }
    internal static void Validate(ShareRequest request)
    {
        if (!((request.schemaVersion == 1 && request.action == "shareBugReport") ||
              (request.schemaVersion == 2 && request.action == "shareBugReportPdf")))
            throw new InvalidDataException("Unsupported request.");
        if (string.IsNullOrWhiteSpace(request.title) || request.title.Length > 300 ||
            request.title.Contains('\r') || request.title.Contains('\n'))
            throw new InvalidDataException("Invalid title.");
        if (string.IsNullOrEmpty(request.supportEmail) || request.supportEmail.Length > 254 ||
            !Regex.IsMatch(request.supportEmail, @"^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+\z"))
            throw new InvalidDataException("Invalid support address.");
        if (request.schemaVersion == 2) {
            DecodePdf(request);
            if (!request.includeTechnicalPackage) return;
        }
        if (string.IsNullOrWhiteSpace(request.reportJson) || request.markdown == null)
            throw new InvalidDataException("Missing report.");
        using var document = JsonDocument.Parse(request.reportJson);
        if (document.RootElement.ValueKind != JsonValueKind.Object)
            throw new InvalidDataException("Invalid report.");
    }
    internal static byte[] DecodePdf(ShareRequest request)
    {
        if (string.IsNullOrEmpty(request.pdfBase64) || request.pdfBase64.Length > MaxBytes)
            throw new InvalidDataException("Missing or oversized PDF.");
        byte[] bytes = Convert.FromBase64String(request.pdfBase64);
        if (bytes.Length < 5 || !bytes.AsSpan(0, 5).SequenceEqual("%PDF-"u8))
            throw new InvalidDataException("Invalid PDF signature.");
        return bytes;
    }
    internal static void Reply(object value)
    {
        // Keep stdout open for the native connection until the sharing window closes.
        Stream output = Console.OpenStandardOutput();
        byte[] bytes = JsonSerializer.SerializeToUtf8Bytes(value);
        Span<byte> header = stackalloc byte[4];
        System.Buffers.Binary.BinaryPrimitives.WriteInt32LittleEndian(header, bytes.Length);
        output.Write(header); output.Write(bytes); output.Flush();
    }
}

internal static class ReportFile
{
    internal static string[] CreateFiles(ShareRequest request)
    {
        if (request.schemaVersion == 1) return new[] { Create(request) };
        string directory = DirectoryForReport();
        string pdf = Path.Combine(directory, "felrapport.pdf");
        File.WriteAllBytes(pdf, Protocol.DecodePdf(request));
        if (!request.includeTechnicalPackage) return new[] { pdf };
        string zip = Path.Combine(directory, "tekniskt-paket.zip");
        using (var archive = ZipFile.Open(zip, ZipArchiveMode.Create)) {
            Add(archive, "felrapport.md", request.markdown);
            Add(archive, "felrapport.json", request.reportJson);
        }
        return new[] { pdf, zip };
    }
    private static string DirectoryForReport()
    {
        string directory = Path.Combine(Environment.GetFolderPath(
            Environment.SpecialFolder.LocalApplicationData), "Thinknine", "BCProcessStudio",
            "SharedReports", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        return directory;
    }
    // Neither file paths nor archive entry names come from the browser payload.
    internal static string Create(ShareRequest request)
    {
        string directory = DirectoryForReport();
        string path = Path.Combine(directory, "felrapport.zip");
        using var archive = ZipFile.Open(path, ZipArchiveMode.Create);
        Add(archive, "felrapport.md", request.markdown);
        Add(archive, "felrapport.json", request.reportJson);
        return path;
    }
    private static void Add(ZipArchive archive, string name, string content)
    {
        using var writer = new StreamWriter(archive.CreateEntry(name,
            CompressionLevel.Optimal).Open(), new UTF8Encoding(false));
        writer.Write(content);
    }
}

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        if (args.Contains("--self-test")) { SelfTest.Run(); return; }
        bool test = args.Contains("--test");
        try
        {
            if (!test && !args.Any(arg => Regex.IsMatch(arg, @"^chrome-extension://[a-p]{32}/$")))
                throw new InvalidDataException("Browser origin required.");
            var request = test ? new ShareRequest(1, "shareBugReport", "BC Process Studio – delningstest",
                "support@example.com", "{\"synthetic\":true}", "# Testfil\n\nInga kunduppgifter. Skicka inte mejlet.")
                : Protocol.Read(Console.OpenStandardInput());
            Protocol.Validate(request);
            string[] paths = ReportFile.CreateFiles(request);
            ApplicationConfiguration.Initialize();
            Application.Run(new ShareForm(request, paths, test));
        }
        catch
        {
            if (!test) Protocol.Reply(new { ok = false, error = "Windows sharing helper could not prepare the report." });
            else MessageBox.Show("Delningstestet kunde inte startas.");
            Environment.ExitCode = 1;
        }
    }
}
