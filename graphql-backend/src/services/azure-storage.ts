import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const containerName = "service-deliverables";

/**
 * Azure Blob Storage service for handling service deliverable uploads
 * Supports video, audio, documents, and images for readings, healings, and coaching
 */
export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;

  constructor() {
    if (!connectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING environment variable is not set");
    }
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }

  /**
   * Upload a file to Azure Blob Storage
   * @param vendorId - Practitioner's vendor ID
   * @param orderId - Service order ID
   * @param fileName - Original file name
   * @param fileBuffer - File data as Buffer
   * @param mimeType - MIME type (e.g., "video/mp4", "audio/mp3")
   * @returns Blob URL
   */
  async uploadFile(
    vendorId: string,
    orderId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    const containerClient = this.blobServiceClient.getContainerClient(containerName);

    // Create container if doesn't exist
    // No access parameter = private by default, require signed URLs
    await containerClient.createIfNotExists();

    // Generate unique blob name with folder structure
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blobName = `${vendorId}/${orderId}/${timestamp}-${safeName}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload with metadata
    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
        blobCacheControl: "public, max-age=31536000"  // Cache for 1 year
      },
      metadata: {
        vendorId,
        orderId,
        originalName: fileName,
        uploadedAt: new Date().toISOString()
      }
    });

    return blockBlobClient.url;
  }

  /**
   * Generate a signed URL for temporary access to a blob
   * @param blobUrl - Full blob URL
   * @param expiryHours - Hours until expiry (default 24)
   * @returns Signed URL with SAS token
   */
  async generateSignedUrl(blobUrl: string, expiryHours: number = 24): Promise<string> {
    try {
      // Parse blob URL to get container and blob name
      const url = new URL(blobUrl);
      const pathParts = url.pathname.split('/').filter(Boolean);

      if (pathParts.length < 2) {
        throw new Error("Invalid blob URL format");
      }

      const containerName = pathParts[0];
      const blobName = pathParts.slice(1).join('/');

      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      // Generate SAS token
      const startsOn = new Date();
      const expiresOn = new Date(startsOn.getTime() + expiryHours * 60 * 60 * 1000);

      // Extract account name and key from connection string
      const accountName = this.extractAccountName(connectionString);
      const accountKey = this.extractAccountKey(connectionString);

      if (!accountName || !accountKey) {
        throw new Error("Could not extract credentials from connection string");
      }

      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

      const sasToken = generateBlobSASQueryParameters({
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse("r"), // Read only
        startsOn,
        expiresOn
      }, sharedKeyCredential).toString();

      return `${blobUrl}?${sasToken}`;
    } catch (error) {
      console.error("Error generating signed URL:", error);
      throw new Error(`Failed to generate signed URL: ${error}`);
    }
  }

  /**
   * Delete a file from blob storage
   * @param blobUrl - Full blob URL
   */
  async deleteFile(blobUrl: string): Promise<void> {
    try {
      const url = new URL(blobUrl);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const containerName = pathParts[0];
      const blobName = pathParts.slice(1).join('/');

      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      await blobClient.deleteIfExists();
    } catch (error) {
      console.error("Error deleting file:", error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * List all files for a specific order
   * @param vendorId - Practitioner's vendor ID
   * @param orderId - Service order ID
   * @returns Array of blob URLs
   */
  async listOrderFiles(vendorId: string, orderId: string): Promise<string[]> {
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const prefix = `${vendorId}/${orderId}/`;
    const files: string[] = [];

    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      const blobClient = containerClient.getBlobClient(blob.name);
      files.push(blobClient.url);
    }

    return files;
  }

  /**
   * Get file size in bytes
   * @param blobUrl - Full blob URL
   * @returns File size in bytes
   */
  async getFileSize(blobUrl: string): Promise<number> {
    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const containerName = pathParts[0];
    const blobName = pathParts.slice(1).join('/');

    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    const properties = await blobClient.getProperties();
    return properties.contentLength || 0;
  }

  // Helper methods
  private extractAccountName(connString: string): string | null {
    const match = connString.match(/AccountName=([^;]+)/);
    return match ? match[1] : null;
  }

  private extractAccountKey(connString: string): string | null {
    const match = connString.match(/AccountKey=([^;]+)/);
    return match ? match[1] : null;
  }
}

// Export singleton instance
export const azureStorage = new AzureStorageService();

// Export helper to determine file type from MIME type
export function getDeliverableFileType(mimeType: string): "VIDEO" | "AUDIO" | "DOCUMENT" | "IMAGE" {
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  if (mimeType.startsWith("image/")) return "IMAGE";
  return "DOCUMENT";
}

// Validate file type is allowed
export function isAllowedFileType(mimeType: string): boolean {
  const allowedTypes = [
    "video/mp4",
    "video/quicktime",  // MOV
    "audio/mpeg",       // MP3
    "audio/mp4",        // M4A
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  // DOCX
    "image/jpeg",
    "image/png"
  ];
  return allowedTypes.includes(mimeType);
}

// Max file size: 500MB
export const MAX_FILE_SIZE = 500 * 1024 * 1024;
