# Creates the Azure identity that GitHub Actions uses to deploy the license service.
# Run once, signed in with `az login` as an owner of the resource group:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-license-deploy-identity.ps1
# The identity can only deploy to the license web app. GitHub signs in with OpenID Connect,
# so no password or publish profile is created. Running the script again changes nothing.
$ErrorActionPreference = "Stop"
$resourceGroup = "rg-bc-process-studio"
$appName = "thinknine-bc-license"
$identityName = "id-bc-license-deploy"
$repository = "JohanT9/Thinknine-BC-Process-Intelligence"
# This repository's OIDC tokens name the owner and repository with their immutable IDs
# (repo:Owner@id/Repo@id:...). Entra compares the subject exactly, so it must match the
# environment as the workflow spells it. The plain form covers the older subject format.
$subjects = @{ "github-production" = "repo:${repository}:environment:production";
  "github-production-immutable" = "repo:JohanT9@187523751/Thinknine-BC-Process-Intelligence@1322950871:environment:production" }

function Invoke-Az {
  $output = & az @args
  if ($LASTEXITCODE -ne 0) { throw "az $($args -join ' ') failed." }
  return $output
}

$account = Invoke-Az account show --output json | ConvertFrom-Json
Write-Output "Subscription: $($account.name) ($($account.id))"

$identity = Invoke-Az identity create --resource-group $resourceGroup --name $identityName --output json | ConvertFrom-Json

$credentials = Invoke-Az identity federated-credential list --resource-group $resourceGroup `
  --identity-name $identityName --output json | ConvertFrom-Json
foreach ($name in $subjects.Keys) {
  $subject = $subjects[$name]
  if (-not ($credentials | Where-Object { $_.subject -ceq $subject })) {
    Invoke-Az identity federated-credential create --name $name `
      --resource-group $resourceGroup --identity-name $identityName `
      --issuer "https://token.actions.githubusercontent.com" --subject $subject `
      --audiences "api://AzureADTokenExchange" --output none
  }
}

$appId = Invoke-Az webapp show --resource-group $resourceGroup --name $appName --query id --output tsv
$assigned = Invoke-Az role assignment list --assignee $identity.principalId --scope $appId `
  --role "Website Contributor" --output json | ConvertFrom-Json
if (-not $assigned) {
  # A new identity can take a moment to become visible to role assignments.
  for ($attempt = 1; $attempt -le 6; $attempt++) {
    & az role assignment create --assignee-object-id $identity.principalId `
      --assignee-principal-type ServicePrincipal --role "Website Contributor" --scope $appId --output none
    if ($LASTEXITCODE -eq 0) { break }
    if ($attempt -eq 6) { throw "The role assignment could not be created." }
    Start-Sleep -Seconds 10
  }
}

Write-Output ""
Write-Output "Done. Add these as GitHub repository variables (Settings > Secrets and variables > Actions > Variables):"
Write-Output "AZURE_CLIENT_ID=$($identity.clientId)"
Write-Output "AZURE_TENANT_ID=$($account.tenantId)"
Write-Output "AZURE_SUBSCRIPTION_ID=$($account.id)"
