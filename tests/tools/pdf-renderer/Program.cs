using Windows.Data.Pdf;
using Windows.Storage;
using Windows.Storage.Streams;
var source = await StorageFile.GetFileFromPathAsync(Path.GetFullPath(args[0]));
var pdf = await PdfDocument.LoadFromFileAsync(source);
Directory.CreateDirectory(args[1]);
for (uint i = 0; i < pdf.PageCount; i++) {
    using var page = pdf.GetPage(i);
    using var stream = new InMemoryRandomAccessStream();
    await page.RenderToStreamAsync(stream, new PdfPageRenderOptions { DestinationWidth = 1190 });
    stream.Seek(0);
    using var output = File.Create(Path.Combine(args[1], $"page-{i + 1}.png"));
    await stream.AsStreamForRead().CopyToAsync(output);
}
