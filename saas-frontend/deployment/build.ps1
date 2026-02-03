param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "tst", "prd")]
    [string]$env_name,

    [Parameter(Mandatory = $true)]
    [string]$env_index,

    [Parameter(Mandatory = $false)]
    [switch]$notLocal
)

$isLocal = -not $notLocal

$app_name = "spiriverse"
$app_name_short = "spv"

# Ensure the index is zero-padded to 3 digits (e.g. 002)
$padded_index = ('{0:d3}' -f [int]$env_index)
$env = "$env_name-$padded_index"

$resource_group = "rg-$app_name-server-$env"
$function_app_name = "func-$app_name-server-$env"
$keyvault_name = "kv-$app_name_short-server-$env"
$web_app_name = "app-$app_name-app-$env"

$env_dict = @{}

Write-Output "🔑 Fetching Function App keys..."
$keys = az functionapp keys list `
  --name $function_app_name `
  --resource-group $resource_group `
  | ConvertFrom-Json

$env_dict["server_endpoint_code"] = $keys.functionKeys.client
$env_dict["server_endpoint"] = "https://$function_app_name.azurewebsites.net/api"
$env_dict["NEXT_PUBLIC_server_endpoint"] = $env_dict["server_endpoint"]
$env_dict["NEXT_PUBLIC_server_endpoint_code"] = $env_dict["server_endpoint_code"]

$env_dict["AZURE_STORAGE_ACCOUNT"] = "st${app_name_short}app$env_name$padded_index"
$env_dict["NEXT_PUBLIC_STORAGE_ACCOUNT"] = "st${app_name_short}app$env_name$padded_index"

Write-Output "🔐 Fetching secrets from Key Vault: $keyvault_name"
$env_dict["NEXTAUTH_SECRET"]         = az keyvault secret show --vault-name $keyvault_name --name "authjs-secret" --query value -o tsv
$env_dict["AUTH_AZURE_ACCESS_KEY"]   = az keyvault secret show --vault-name $keyvault_name --name "storage-key" --query value -o tsv
$env_dict["NEXT_PUBLIC_GOOGLE_KEY"]  = az keyvault secret show --vault-name $keyvault_name --name "google-key" --query value -o tsv
$env_dict["NEXT_PUBLIC_stripe_token"]= az keyvault secret show --vault-name $keyvault_name --name "stripe-pk" --query value -o tsv
$env_dict["CONSOLE_AZURE_AD_TENANT_ID"] = az keyvault secret show --vault-name $keyvault_name --name "console-azure-ad-tenant-id" --query value -o tsv
$env_dict["CONSOLE_AZURE_AD_CLIENT_ID"] = az keyvault secret show --vault-name $keyvault_name --name "console-azure-ad-client-id" --query value -o tsv
$env_dict["CONSOLE_AZURE_AD_CLIENT_SECRET"] = az keyvault secret show --vault-name $keyvault_name --name "console-azure-ad-client-secret" --query value -o tsv
$env_dict["CONSOLE_NEXTAUTH_SECRET"] = az keyvault secret show --vault-name $keyvault_name --name "console-nextauth-secret" --query value -o tsv

# Determine public-facing URLs
if ($env_name -eq "prd") {
    $env_dict["NEXTAUTH_URL"] = "https://www.$app_name.com"
    $env_dict["NEXT_PUBLIC_graphql_proxy"] = "https://www.$app_name.com/api/graphql"
} else {
    $web_host = "$web_app_name.azurewebsites.net"
    $env_dict["NEXTAUTH_URL"] = "https://$web_host"
    $env_dict["NEXT_PUBLIC_graphql_proxy"] = "https://$web_host/api/graphql"
}

# Local override
if ($isLocal) {
    $env_dict["NEXTAUTH_URL"] = "http://localhost:3000"
    $env_dict["NEXT_PUBLIC_graphql_proxy"] = "http://localhost:3000/api/graphql"
    $env_dict["server_endpoint"] = "http://localhost:7071/api"
    $env_dict["NEXT_PUBLIC_server_endpoint"] = "http://localhost:7071/api"
    $env_dict["NEXT_PUBLIC_server_endpoint_code"] = ""
    $env_dict["server_endpoint_code"] = ""
}

# Final output to site/.env
$targetFile = ".env"
Write-Output "📝 Writing environment file to $targetFile..."

$env_content = $env_dict.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" } | Out-String -Stream
$env_content = $env_content -join "`n"
$env_content | Set-Content -Path $targetFile -Encoding utf8

Write-Output "✅ .env file created at $targetFile"