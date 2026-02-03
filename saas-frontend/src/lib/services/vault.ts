import { SecretClient } from '@azure/keyvault-secrets';
import azure_identity from './azure_identity';

const cache = new Map<string, string>();

export class vault {
    public client : SecretClient;

    constructor() {
        const {credential, ...env_details} = azure_identity();
        const vaultName = `kv-${env_details.app_name_short}-server-${env_details.env_name}-${env_details.env_index}`;
        const url = `https://${vaultName}.vault.azure.net`;
        this.client = new SecretClient(url, credential);
    }

    async getSecret(secretName: string) {
        
        if (cache.has(secretName)) {
            return cache.get(secretName);
        }

        const secret = await this.client.getSecret(secretName);
        if (secret == null || secret.value == null) {
            return null;
        }
        
        cache.set(secretName, secret.value);
        return secret.value;
    }

}