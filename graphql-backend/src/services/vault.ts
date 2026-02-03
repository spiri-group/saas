import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { LogManager } from '../utils/functions';
import NodeCache from 'node-cache';

export class vault {
    public client: SecretClient;
    private logger: LogManager;
    private cache: NodeCache

    constructor(host: string, log:LogManager, cache: NodeCache) {
        this.logger = log;
        this.cache = cache;

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

        const vaultName = `kv-spv-server-${env_name}-${env_index}`;
        // Removed verbose "Talking to vault" log - only log errors
        const credential = new DefaultAzureCredential();
        const url = `https://${vaultName}.vault.azure.net`;
        this.client = new SecretClient(url, credential);
        // Removed verbose "returning client" log
    }

    get = async (secretName: string): Promise<string | undefined> => {
        const secret = this.cache.get<string>(secretName);
        if (secret != undefined) return secret;
        else {
            // Removed verbose "Cache miss" log - happens constantly
            try {
                const secretObj = await this.client.getSecret(secretName);
                if (secretObj.value == undefined) {
                    return undefined;
                } else {
                    this.cache.set(secretName, secretObj.value)
                    // Removed verbose "successfully obtained" log - only log errors
                    return secretObj.value;
                }
            } catch (e) {
                // Only log failures, not every secret fetch
                this.logger.error(`KeyVault :: Failed to get secret ${secretName}`);
                throw e;
            }
        }
    }

}