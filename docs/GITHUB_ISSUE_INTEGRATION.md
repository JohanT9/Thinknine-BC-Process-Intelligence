# GitHub Issue integration

GitHub is an optional destination adapter over the same Issue Package. It maps
title, common Markdown body, and configured labels. Issue type is GitHub Issue;
Azure DevOps work-item semantics are not invented.

Production authentication uses an administrator-deployed GitHub App broker.
The extension authenticates to that HTTPS broker through Microsoft Entra PKCE;
the broker owns GitHub App credentials and installation/user tokens. No GitHub
client secret, private key, access token, or refresh token is distributed in or
stored by the extension. The GitHub App must be installed only on intended
repositories and granted minimum Issues write and Metadata read permissions.

GitHub's REST Create Issue contract supports title, body, and labels but does
not expose a general binary issue-attachment upload endpoint. Release asset
upload is a different resource and is not misused. Selected screenshots remain
available in the offline package; creating a GitHub issue with attachments
therefore returns an explicit partial result rather than pretending upload
succeeded.

The broker must provide authenticated `test` and idempotent `create` operations,
verify the configured repository allow-list, enforce body/rate limits, redact
logs, and return the issue number and HTTPS URL. Ambiguous creation timeouts are
not automatically retried.

Official references:

- https://docs.github.com/en/rest/issues/issues
- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app

