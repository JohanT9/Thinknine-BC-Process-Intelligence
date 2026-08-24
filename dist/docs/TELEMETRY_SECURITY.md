# Telemetry security and privacy

Authentication uses Microsoft Entra authorization code with PKCE (`S256`) as a
public client. The configured app needs delegated Application Insights API
`Data.Read` and read access to the selected Application Insights resource. It
does not need write permission.

The extension stores only public tenant/client/resource IDs, enabled state, and
an optional expected environment label. No client secret, API key, password,
access token, refresh token, or authorization header is stored in extension
storage, source, manifest, or release output. The access token remains only in
service-worker memory and expires quickly.

Requests go only to the configured tenant at `login.microsoftonline.com` and
the fixed Microsoft endpoint `api.applicationinsights.io`. Nothing is sent to
Thinknine, OpenAI, or an issue tracker. Query errors are reduced to status and a
sanitized message. Raw records can contain customer-sensitive technical data;
they remain local, are collapsed in the workspace, excluded from concise text
export, and bounded to 500 records/one MiB per query. A future sanitized support
package remains a separate export boundary.
