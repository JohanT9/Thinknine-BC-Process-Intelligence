using System.Text.Json;
using System.Buffers.Binary;

namespace BCProcessStudio.Share;

internal static class SelfTest
{
    internal static void Run()
    {
        var request = new ShareRequest(1, "shareBugReport", "Fel vid Registrera vikt",
            "support@example.com", "{\"synthetic\":true}", "# Felrapport");
        var bytes = JsonSerializer.SerializeToUtf8Bytes(request);
        using var stream = new MemoryStream();
        var header = new byte[4]; BinaryPrimitives.WriteInt32LittleEndian(header, bytes.Length);
        stream.Write(header); stream.Write(bytes); stream.Position = 0;
        if (Protocol.Read(stream) != request) throw new Exception("Framing failed.");
        Reject(request with { action = "runCommand" });
        Reject(request with { supportEmail = "support@example.com\r\nBcc: other@example.com" });
        Reject(request with { reportJson = "not JSON" });
        Reject(request with { schemaVersion = 2 });
        Reject(request with { title = "bad\nheader" });
        using var invalid = new MemoryStream(new byte[] { 255, 255, 255, 127 });
        try { Protocol.Read(invalid); throw new Exception("Size limit failed."); }
        catch (InvalidDataException) { }
        Protocol.Reply(new { ok = true, tests = 7 });
    }
    private static void Reject(ShareRequest request)
    {
        try { Protocol.Validate(request); }
        catch { return; }
        throw new Exception("Invalid request accepted.");
    }
}
