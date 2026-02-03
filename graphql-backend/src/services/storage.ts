import { DefaultAzureCredential } from "@azure/identity";
import { LogManager } from "../utils/functions";
import { BlobClient } from "@azure/storage-blob";

export class StorageDataSource {
    public storageName: string;

    constructor(host: string, log:LogManager) {

        let env_name = null;
        let env_index = null;
        if (host.includes("localhost") || host.includes("127.0.0.1")) {
            env_name = "dev";
            env_index = "002";
        }
        else {
            let res = host.match(/func-spiriverse-server-([a-z]+)-([0-9]+)/);
            if (res == null) throw `Could not determine environment from host ${host}`;
            env_name = res[1];
            env_index = res[2];             
        }

        if (env_name == null || env_index == null) throw `Could not determine environment from host ${host}`;

        this.storageName = `stspvapp${env_name}${env_index}`;
        // Removed verbose "Using storage account" log - only log errors
    } 

    async download(relativePath: string) {
        const container = relativePath.split("/")[0];
        const path = relativePath.split("/").slice(1).join("/");

        const blobClient = new BlobClient(`https://${this.storageName}.blob.core.windows.net/${container}/${path}`, new DefaultAzureCredential());
        return await blobClient.downloadToBuffer();
    }

    async delete(relativePath: string): Promise<boolean> {
        try {
            const container = relativePath.split("/")[0];
            const path = relativePath.split("/").slice(1).join("/");

            const blobClient = new BlobClient(`https://${this.storageName}.blob.core.windows.net/${container}/${path}`, new DefaultAzureCredential());
            const deleteResult = await blobClient.deleteIfExists();
            return deleteResult.succeeded;
        } catch (error) {
            console.error(`Failed to delete blob ${relativePath}:`, error);
            return false;
        }
    }

    toUrl(relativePath: string) {
        return `https://${this.storageName}.blob.core.windows.net/${relativePath}`
    }
}