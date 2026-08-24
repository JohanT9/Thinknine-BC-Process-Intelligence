# Azure DevOps integration

Azure DevOps is an optional destination adapter over Issue Package. It uses
Microsoft Entra ID user-delegated OAuth authorization-code flow with PKCE and
the Azure DevOps resource scope
`499b84ac-1321-427f-aa17-267ca6975798/.default`. Tokens are opaque, short-lived,
held only in service-worker memory, never logged, persisted, exported, or added
to a Bug Report. PATs and legacy Azure DevOps OAuth are not implemented.

Configuration is public metadata: organization, project, work item type, area,
iteration, description/severity field names, tags, tenant, public client ID,
and scope. Test Connection authenticates and reads work-item-type metadata but
does not create an item. The Entra application should receive only delegated
work-item permissions required to inspect metadata and create work items.

Field mapping is centralized:

- title -> `System.Title`;
- safe escaped description -> configured field, default `System.Description`;
- optional area/iteration -> their System fields;
- configured tags -> `System.Tags`;
- human severity -> configured severity field only.

Process templates differ, so no specialized field is assumed. Configuration can
fall back to title and description. Work item type is explicit. The adapter
uploads selected screenshots through the Work Item attachment API and adds
relations after creation. If item creation succeeds but an attachment fails,
the external reference is retained and the result is `partial-success`.

Microsoft recommends Entra OAuth for new Azure DevOps integrations and has
deprecated the older Azure DevOps OAuth registration model:
https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth

