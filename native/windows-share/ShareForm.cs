using Windows.ApplicationModel.DataTransfer;
using Windows.Storage;
using System.Runtime.InteropServices;
using WinRT;

namespace BCProcessStudio.Share;

[ComImport, Guid("3A3DCD6C-3EAB-43DC-BCDE-45671CE800C8")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IDataTransferManagerInterop
{
    IntPtr GetForWindow(IntPtr window, ref Guid iid);
    void ShowShareUIForWindow(IntPtr window);
}

internal sealed class ShareForm : Form
{
    private readonly ShareRequest request;
    private readonly string[] paths;
    private readonly Label status = new() { AutoSize = true, MaximumSize = new Size(600, 0) };
    private DataTransferManager? manager;
    private IDataTransferManagerInterop? interop;
    internal ShareForm(ShareRequest request, string[] paths, bool test)
    {
        this.request = request; this.paths = paths;
        Text = "BC Process Studio – dela felrapport";
        Width = 680; Height = 360; StartPosition = FormStartPosition.CenterScreen;
        var panel = new FlowLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(20),
            FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoScroll = true };
        Controls.Add(panel);
        panel.Controls.Add(new Label { Text = "Välj Outlook i Windows delningsdialog. Du skickar själv mejlet.", AutoSize = true });
        AddCopy(panel, "Supportadress", request.supportEmail);
        AddCopy(panel, "Ämne", request.title);
        var share = new Button { Text = "Dela bifogad rapport", AutoSize = true };
        share.Click += (_, _) => ShowShare(); panel.Controls.Add(share);
        panel.Controls.Add(status);
        panel.Controls.Add(new Label { AutoSize = true, MaximumSize = new Size(600, 0),
            Text = "Mottagare och ämne kan behöva klistras in i Outlook. Bifogas: " +
                string.Join(", ", paths.Select(Path.GetFileName)) +
                "\nLokala rapportkopior finns i: " + Path.GetDirectoryName(paths[0]) });
        Shown += (_, _) =>
        {
            try
            {
                interop = DataTransferManager.As<IDataTransferManagerInterop>();
                Guid iid = new("a5caee9b-8708-49d1-8d36-67d25a8da00c");
                IntPtr pointer = interop.GetForWindow(Handle, ref iid);
                try { manager = MarshalInterface<DataTransferManager>.FromAbi(pointer); }
                finally { Marshal.Release(pointer); }
                manager.DataRequested += OnDataRequested;
                if (!test) Protocol.Reply(new { ok = true, status = "helperReady" });
                // User clicks Share: keeps Windows foreground/user-action requirements explicit.
                status.Text = "Rapporten är klar. Klicka på Dela bifogad rapport.";
            }
            catch
            {
                status.Text = "Windows-delning kunde inte startas. Ingen rapport har skickats.";
                if (!test) Protocol.Reply(new { ok = false, error = "Windows sharing is unavailable." });
            }
        };
        FormClosed += (_, _) => { if (manager != null) manager.DataRequested -= OnDataRequested; };
    }
    private static void AddCopy(Control parent, string label, string value)
    {
        parent.Controls.Add(new Label { Text = label, AutoSize = true });
        var row = new FlowLayoutPanel { AutoSize = true, WrapContents = false };
        row.Controls.Add(new TextBox { Text = value, ReadOnly = true, Width = 460 });
        var copy = new Button { Text = "Kopiera", AutoSize = true };
        copy.Click += (_, _) => System.Windows.Forms.Clipboard.SetText(value);
        row.Controls.Add(copy); parent.Controls.Add(row);
    }
    private void ShowShare()
    {
        try { interop?.ShowShareUIForWindow(Handle); }
        catch { status.Text = "Delningsdialogen kunde inte öppnas. Försök igen."; }
    }
    private async void OnDataRequested(DataTransferManager sender, DataRequestedEventArgs args)
    {
        var deferral = args.Request.GetDeferral();
        try
        {
            var files = new List<IStorageItem>();
            foreach (string path in paths) files.Add(await StorageFile.GetFileFromPathAsync(path));
            args.Request.Data.Properties.Title = request.title;
            args.Request.Data.Properties.Description = "Felrapport från BC Process Studio";
            args.Request.Data.SetStorageItems(files);
        }
        catch { args.Request.FailWithDisplayText("Rapportfilen kunde inte läsas."); }
        finally { deferral.Complete(); }
    }
}
