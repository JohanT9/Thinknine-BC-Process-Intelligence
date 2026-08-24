# 4.6 Issue Package and external issue milestone

Technical Bug Reports can now generate a provider-neutral preview, copy or
export an offline package, and explicitly create an Azure DevOps work item or
GitHub issue. Local evidence remains authoritative. Packages detect stale source
state; duplicate clicks are blocked; existing external references require
deliberate confirmation; uncertain timeouts are not retried automatically.

Azure DevOps uses Microsoft Entra delegated PKCE and can upload selected
screenshots. GitHub uses an administrator-deployed GitHub App broker and maps
title/body/labels; GitHub's issue REST API has no general binary attachment
upload, so screenshots stay in the offline package and are reported as partial.

No real Azure DevOps organization, GitHub repository, or broker was used during
this milestone. Deterministic fake providers cover submission and failure
behavior. Production requires registered applications, destination allow-lists,
permission review, broker deployment for GitHub, and sanitized pilot tests.
