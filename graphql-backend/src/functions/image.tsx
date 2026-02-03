import NodeCache from "node-cache";
import { vault } from "../services/vault";
import { LogManager } from "../utils/functions";
import { CosmosDataSource } from "../utils/database";
import { media_type } from "../graphql/0_shared/types";
 import { StorageDataSource } from "../services/storage";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import sharp from "sharp";

const myCache = new NodeCache();

export async function imageHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {

    let path = req.query.get("path");
    let w = req.query.get("w");
    let h = req.query.get("h");
    let q = req.query.get("q");
    let output = req.query.get("output");

    if (!path) {
        return {
            status: 400,
            body: "Path is required."
        }
        return;
    }

    const logger = new LogManager(context)
          
    var host = req.headers.get('host');
    if (host == null) {
        throw `Cannot start function without host`;
    }

    const keyVault = new vault(host, logger, myCache)
        
    const cosmos = new CosmosDataSource(logger, keyVault)
    const storage = new StorageDataSource(host, logger)
    
    await cosmos.init(host)

    const width = parseInt(w) || null;
    const height = parseInt(h) || null;
    const quality = parseInt(q) || 75;

    const productPathRegex = /^m\/([a-zA-Z0-9-]+)\/l\/([a-zA-Z0-9-]+)(?:\/([a-zA-Z0-9-]+))?$/;

    let urlRelative;

    try {
        if (productPathRegex.test(path)) {
            // Extract merchantId, productId, variantId and query the database for the blob path
            const [, merchantId, productId, variantId] = path.match(productPathRegex);

            const result = await cosmos.run_query<media_type>(
                `Main-Listing`,
                {
                    query: `
                        SELECT VALUE ${variantId ? 'v.thumbnail.image' : 'l.thumbnail.image'}
                        FROM l 
                        ${variantId ? 'JOIN v in l.variants' : ''}
                        WHERE l.vendorId = @merchantId
                        AND l.id = @productId
                        ${variantId ? 'AND v.id = @variantId' : ''}
                    `, parameters: [
                        { name: "@merchantId", value: merchantId },
                        { name: "@productId", value: productId },
                        ...(variantId ? [{ name: "@variantId", value: variantId }] : [])
                    ]
                }, true
            )

            if (result.length === 0) {
                return {
                    status: 404,
                    body: "Image not found for the specified merchantId, productId, and variantId."
                }
            }

            ({ urlRelative } = result[0]);

        } else {
            // If the path doesn't match the regex, assume it's a direct path to the image
            urlRelative = path;
        }

        const blobData = await storage.download(urlRelative);
        const blobDataBuffer = Buffer.from(blobData);

        let image = sharp(blobDataBuffer);

        // Step 3: Process the image (resize, format conversion)
        if (width || height) {
            image = image.resize(width, height, { fit: "inside" });
        }

        let format = output?.toLowerCase() || "jpeg";
        switch (format) {
            case "jpeg":
                image = image.jpeg({ quality });
                break;
            case "png":
                image = image.png();
                break;
            case "gif":
                image = image.gif();
                break;
            case "webp":
                image = image.webp({ quality });
                break;
            default:
                format = "jpeg"; // Fallback to JPEG
                image = image.jpeg({ quality });
        }

        const buffer = await image.toBuffer();

        return {
            status: 200,
            headers: {
                "Content-Type": `image/${format}`,
                "Cache-Control": "public, max-age=31536000", // Cache for 1 year
            },
            body: buffer,
        }
    } catch (error) {
        logger.error("Error processing image:", error);
        return {
            status: 500,
            body: "Internal Server Error",
        }
    }
};


app.http('image', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: imageHandler,
  extraOutputs: []
});
