import { createRemoteJWKSet, jwtVerify, importSPKI, flattenedVerify } from 'jose';
import * as crypto from 'crypto';

// ShipEngine JWKS endpoint
const SHIPENGINE_JWKS_URL = 'https://api.shipengine.com/jwks';

// Cache for JWKS
let jwksCache: { keys: any[], fetchedAt: number } | null = null;
const JWKS_CACHE_TTL = 3600000; // 1 hour in ms

/**
 * Fetch and cache the ShipEngine JWKS
 */
async function getJWKS(): Promise<any[]> {
    const now = Date.now();

    // Return cached if still valid
    if (jwksCache && (now - jwksCache.fetchedAt) < JWKS_CACHE_TTL) {
        return jwksCache.keys;
    }

    // Fetch fresh JWKS
    const response = await fetch(SHIPENGINE_JWKS_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch ShipEngine JWKS: ${response.status}`);
    }

    const jwks = await response.json();
    jwksCache = {
        keys: jwks.keys,
        fetchedAt: now
    };

    return jwks.keys;
}

/**
 * Find a key in the JWKS by key ID
 */
async function getKeyById(keyId: string): Promise<any> {
    let keys = await getJWKS();
    let key = keys.find(k => k.kid === keyId);

    // If key not found, refresh cache and try again
    if (!key) {
        jwksCache = null;
        keys = await getJWKS();
        key = keys.find(k => k.kid === keyId);
    }

    if (!key) {
        throw new Error(`Key with ID ${keyId} not found in ShipEngine JWKS`);
    }

    return key;
}

/**
 * Convert JWK to PEM format for crypto verification
 */
function jwkToPem(jwk: any): string {
    // For RSA keys, we need to convert the JWK to PEM format
    const keyObject = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    return keyObject.export({ type: 'spki', format: 'pem' }) as string;
}

export interface ShipEngineSignatureHeaders {
    signature: string | null;
    keyId: string | null;
    timestamp: string | null;
}

/**
 * Extract ShipEngine signature headers from the request
 */
export function extractSignatureHeaders(headers: { get(name: string): string | null }): ShipEngineSignatureHeaders {
    return {
        signature: headers.get('x-shipengine-signature') || headers.get('X-ShipEngine-Signature'),
        keyId: headers.get('x-shipengine-rsa-sha256-key-id') || headers.get('X-ShipEngine-RSA-SHA256-Key-ID'),
        timestamp: headers.get('x-shipengine-timestamp') || headers.get('X-ShipEngine-Timestamp')
    };
}

/**
 * Verify the ShipEngine webhook signature
 *
 * @param rawBody - The raw, unparsed request body
 * @param headers - The signature headers from the request
 * @returns true if signature is valid
 * @throws Error if signature is invalid or verification fails
 */
export async function verifyShipEngineSignature(
    rawBody: string,
    headers: ShipEngineSignatureHeaders
): Promise<boolean> {
    const { signature, keyId, timestamp } = headers;

    // Check all required headers are present
    if (!signature || !keyId || !timestamp) {
        throw new Error('Missing required ShipEngine signature headers');
    }

    // Verify timestamp is recent (within 5 minutes)
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    const timeDiff = Math.abs(now - webhookTime);
    const MAX_TIME_DIFF = 5 * 60 * 1000; // 5 minutes

    if (timeDiff > MAX_TIME_DIFF) {
        throw new Error(`Webhook timestamp too old or too far in future: ${timeDiff}ms difference`);
    }

    // Get the public key from JWKS
    const jwk = await getKeyById(keyId);
    const publicKeyPem = jwkToPem(jwk);

    // Verify the signature
    // ShipEngine signs: timestamp + "." + rawBody
    const signedPayload = `${timestamp}.${rawBody}`;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signedPayload);

    // Decode base64 signature
    const signatureBuffer = Buffer.from(signature, 'base64');

    const isValid = verifier.verify(publicKeyPem, signatureBuffer);

    if (!isValid) {
        throw new Error('Invalid ShipEngine webhook signature');
    }

    return true;
}
