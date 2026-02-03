#!/bin/bash

# Configure CORS for Azure Storage Account
# This allows video frame extraction from blob storage

STORAGE_ACCOUNT="stspvappdev002"
RESOURCE_GROUP="your-resource-group-name"  # UPDATE THIS

echo "Configuring CORS for storage account: $STORAGE_ACCOUNT"

# Set CORS rules for blob service
az storage cors add \
    --services b \
    --methods GET HEAD OPTIONS \
    --origins '*' \
    --allowed-headers '*' \
    --exposed-headers '*' \
    --max-age 3600 \
    --account-name $STORAGE_ACCOUNT

echo "CORS configuration complete!"
echo ""
echo "Verify with:"
echo "az storage cors list --services b --account-name $STORAGE_ACCOUNT"
