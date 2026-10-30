# Enables the daily backup of the license service to Azure Blob Storage.
# Run once, signed in with `az login` as an owner of the resource group:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-license-backup.ps1
# It creates the private container license-backups in the storage account that holds the
# license tables, lets the web app's managed identity write to that container only, removes
# copies older than 90 days with a lifecycle rule and turns the backup on. The web app restarts.
# Running the script again changes nothing that is already in place.
$ErrorActionPreference = "Stop"
$resourceGroup = "rg-bc-process-studio"
$appName = "thinknine-bc-license"
$container = "license-backups"
$retentionDays = 90

function Invoke-Az {
  $output = & az @args
  if ($LASTEXITCODE -ne 0) { throw "az $($args -join ' ') failed." }
  return $output
}

$settings = Invoke-Az webapp config appsettings list --resource-group $resourceGroup --name $appName --output json | ConvertFrom-Json
$tableUrl = ($settings | Where-Object { $_.name -eq "LICENSE_TABLE_ACCOUNT_URL" }).value
if ($tableUrl -notmatch '^https://([a-z0-9]{3,24})\.table\.core\.windows\.net/?$') {
  throw "LICENSE_TABLE_ACCOUNT_URL is not an Azure Table endpoint; the backup needs Table Storage."
}
$accountName = $Matches[1]
$account = Invoke-Az storage account show --name $accountName --output json | ConvertFrom-Json
Write-Output "Storage account: $accountName ($($account.resourceGroup))"

# The identity the service already uses for its tables.
$identityClientId = ($settings | Where-Object { $_.name -eq "LICENSE_MANAGED_IDENTITY_CLIENT_ID" }).value
if ($identityClientId) {
  $principalId = Invoke-Az identity list --query "[?clientId=='$identityClientId'].principalId | [0]" --output tsv
} else {
  $principalId = Invoke-Az webapp identity show --resource-group $resourceGroup --name $appName --query principalId --output tsv
}
if (-not $principalId) { throw "The web app's managed identity could not be found." }

# A private container, created through Azure Resource Manager so no data-plane role is needed here.
$existing = & az storage container-rm show --storage-account $account.id --name $container --output json 2>$null
if ($LASTEXITCODE -ne 0 -or -not $existing) {
  Invoke-Az storage container-rm create --storage-account $account.id --name $container --public-access off --output none
}
$containerScope = "$($account.id)/blobServices/default/containers/$container"
$assigned = Invoke-Az role assignment list --assignee $principalId --scope $containerScope `
  --role "Storage Blob Data Contributor" --output json | ConvertFrom-Json
if (-not $assigned) {
  Invoke-Az role assignment create --assignee-object-id $principalId --assignee-principal-type ServicePrincipal `
    --role "Storage Blob Data Contributor" --scope $containerScope --output none
}

# Old copies are deleted by the storage account itself. An existing lifecycle policy is never replaced.
$policy = & az storage account management-policy show --account-name $accountName --resource-group $account.resourceGroup --output json 2>$null
if ($LASTEXITCODE -eq 0 -and $policy) {
  if (($policy | ConvertFrom-Json).policy.rules.name -notcontains "license-backups-retention") {
    Write-Warning "The storage account already has a lifecycle policy. Add a rule that deletes blobs under '$container/licenses-' after $retentionDays days yourself."
  }
} else {
  $rule = @{ rules = @(@{ enabled = $true; name = "license-backups-retention"; type = "Lifecycle"
    definition = @{ filters = @{ blobTypes = @("blockBlob"); prefixMatch = @("$container/licenses-") }
      actions = @{ baseBlob = @{ delete = @{ daysAfterModificationGreaterThan = $retentionDays } } } } }) }
  $file = New-TemporaryFile
  try {
    $rule | ConvertTo-Json -Depth 10 | Set-Content -Path $file -Encoding utf8
    Invoke-Az storage account management-policy create --account-name $accountName `
      --resource-group $account.resourceGroup --policy "@$file" --output none
  } finally { Remove-Item $file -ErrorAction SilentlyContinue }
}

Invoke-Az webapp config appsettings set --resource-group $resourceGroup --name $appName `
  --settings LICENSE_BACKUP_ENABLED=true "LICENSE_BACKUP_CONTAINER=$container" --output none
Write-Output ""
Write-Output "Done. The service restarts and writes the first copy about five minutes after it starts."
Write-Output "The admin view shows the latest copy under Backup on the overview."
