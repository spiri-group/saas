param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "tst", "prd")]
    [string]$env_name,

    [Parameter(Mandatory=$true)]
    [string]$env_index
)

# -------------------------------------------------

$environments = @{
    "dev" = "development"
    "tst" = "test"
    "prd" = "production"
    # Add more environments as needed
}

$app_name = "spiriverse"
$app_name_short = "spv"

$env = "$env_name-$env_index"
Write-Output "Configuring for $env"

# Define variables
$resource_group_server_prefix = "rg-$app_name-server-$env_name-$env_index"
$signalR_prefix = "signalr-$app_name-server-$env_name-001"
$settingsFileName = "local.settings.$($environments[$env_name]).json"
$settingsPath = "../settings/$settingsFileName"

# Get the connection string from Azure SignalR service
$connectionString = az signalr key list --name $signalR_prefix --resource-group $resource_group_server_prefix --query primaryConnectionString --output tsv

# Function to create settings file if it doesn't exist
function Create-SettingsFile {
    param (
        [string]$filePath
    )

    if (-Not (Test-Path $filePath)) {
        # Ensure the directory exists
        $directory = Split-Path $filePath
        if (-Not (Test-Path $directory)) {
            New-Item -ItemType Directory -Path $directory -Force | Out-Null
        }

        # Define the default content
        $defaultContent = @'
{
    "IsEncrypted": false,
    "Values": {
        "FUNCTIONS_WORKER_RUNTIME": "node",
        "AzureWebJobsFeatureFlags": "EnableWorkerIndexing",
        "AzureWebJobsStorage": "UseDevelopmentStorage=true",
        "AzureSignalRConnectionString": ""
    },
    "ConnectionStrings": {},
    "Host": {
        "CORS": "http://localhost:3000",
        "CORSCredentials": true
    }
}
'@

        # Write the content to the file
        $defaultContent | Set-Content -Path $filePath -Encoding utf8
    }
}

# Create settings file if it doesn't exist
Create-SettingsFile -filePath $settingsPath

# Update the settings file
$content = Get-Content $settingsPath
$content = $content -replace '"AzureSignalRConnectionString": ".*?"', "`"AzureSignalRConnectionString`": `"$connectionString`""
$content | Set-Content $settingsPath
