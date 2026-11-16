// Runs only on the page a link in an assignment email opens (/open on the license service):
// passes the suite and test ids from the link to BC Process Studio, which opens the test in
// this tab. Nothing else on the page is read.
(() => {
  const params = new URLSearchParams(location.search);
  chrome.runtime.sendMessage({ type: "T9_OPEN_LINK", suiteId: params.get("suite") || "",
    testRunId: params.get("test") || "" }, () => { void chrome.runtime.lastError; });
})();
