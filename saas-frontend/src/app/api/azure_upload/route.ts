import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import sharp from 'sharp';
import { NextResponse } from 'next/server';
import internal from 'stream';

async function uploadToBlobStorage(data: internal.Readable | ArrayBuffer, blobClient: BlockBlobClient) {
  try {
    const blobExists = await blobClient.exists();
    if (blobExists) {
      console.warn(`Warning: The blob named ${blobClient.name} already exists. It will be overwritten.`);
    }

    if (data instanceof internal.Readable) {
      await blobClient.uploadStream(data);
    } else if (data instanceof ArrayBuffer) {
      await blobClient.uploadData(data);
    } else {
      throw new Error('Invalid data type for upload. Must be a Readable stream or ArrayBuffer.');
    }

    const props = await blobClient.getProperties();

    // Log the final upload location
    console.log(`File uploaded successfully to: ${blobClient.url}`);

    const result = {
      relativePath: blobClient.name,
      name: blobClient.name.split('/').pop()!,
      url: blobClient.url,
      sizeBytes: props.contentLength ?? 0
    }

    return result;
  } catch (ex) {
    console.error('Error uploading to Blob Storage:', ex);
    throw ex; // Re-throw the error for centralized handling
  }
}

/**
 * Handles image upload to Azure Blob Storage.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A Promise that resolves when all uploads are complete.
 * @throws {Error} - If container is not passed in the request headers.
 */
export async function POST(req: Request) {

  const formData = await req.formData();

  // it may be sent through as either one file or many files
  // in the case that its one file it will be named file and in the case of many files it will be named files
  const files = formData.has('file') ? [formData.get('file') as File] : formData.getAll('files') as File[];

  try {
    const credential = new DefaultAzureCredential();
    // const credential = new AzureCliCredential();

    const blobEndpoint = `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`;
    const blobServiceClient = new BlobServiceClient(blobEndpoint, credential);

    const container = req.headers.get("container");
    if (!container) {
      throw new Error("Must pass container");
    }

    const containerClient = blobServiceClient.getContainerClient(container);
    // Check if the container exists
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      console.error(`Container "${container}" does not exist.`);
      return new NextResponse(JSON.stringify({ ok: false, error: `Container "${container}" does not exist.` }), { status: 400 });
    }

    console.log("🧪 Auth test — listing containers:");
    for await (const c of blobServiceClient.listContainers()) {
      console.log("📂", c.name);
    }
    console.log("🔍 Targeting storage account:", process.env.AZURE_STORAGE_ACCOUNT);


    try {
      const testBlobClient = containerClient.getBlockBlobClient('test-blob.txt');
      await testBlobClient.uploadData(Buffer.from('Hello, Azure!'), {
        blobHTTPHeaders: {
          blobContentType: 'text/plain'
        }
      });
      console.log(`✅ Uploaded test blob to: ${testBlobClient.url}`);
    } catch (err) {
      console.error('❌ Failed to upload test blob:', err?.statusCode || err?.response?.status, err.message);
    }

    
    const uploadPromises: Promise<{ relativePath: string; name: string; url: string, sizeBytes: number }>[] = [];
    const output = req.headers.get("output");

    if (files.length === 0) {
        return new NextResponse(JSON.stringify({ ok: false, error: 'No files found in request' }), { status: 400 });
    } else {
        console.log(`Uploading ${files.length} files to container ${container}...`);

        for(const file of files) {

          console.log(`Uploading file: ${file.name}`);

          const isImageFile = file.name.match(/\.(jpg|jpeg|png|gif|webp|avif|tiff|tif|svg|heic|heif)$/i)
            || (file.type && file.type.startsWith('image/'));
          if (
            isImageFile
            || (output != null && output.match(/image\/(png|jpeg|webp)/))
          ) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const image = sharp(buffer);

            const variantsHeader = req.headers.get("variants");
            const imageVariants = variantsHeader && variantsHeader !== "undefined" ? JSON.parse(variantsHeader) : [];

            // the file name used needs to not have the extension
            let filename = file.name.split('.')[0];
            // remove any %20 or space with a -
            filename = filename.replace(/%20/g, "-").replace(/ /g, "-");
            
            // we need to also upload as is but in webp format
            const originalBlobClient = containerClient.getBlockBlobClient(`${req.headers.get("relative_path")}/${filename}.webp`);
            uploadPromises.push(uploadToBlobStorage(image.webp(), originalBlobClient));

            for (const variant of imageVariants) {
              const { width, height, suffix, fit } = variant;
              let variantImage = image.clone().resize({ 
                width, height, 
                background: { r: 0, g: 0, b: 0, alpha: 0 }, 
                fit: fit || sharp.fit.contain  
              });
              let variantExtension = '.webp'; // Default extension
              switch(output) {
                case "image/png":
                  variantImage = variantImage.png();
                  variantExtension = '.png';
                  break;
                case "image/jpeg":
                  variantImage = variantImage.jpeg();
                  variantExtension = '.jpeg';
                  break;
                default:
                  variantImage = variantImage.webp();
                  variantExtension = '.webp';
              }
              const variantBlobClient = containerClient.getBlockBlobClient(`${req.headers.get("relative_path")}/${filename}-${suffix}${variantExtension}`);
              uploadPromises.push(uploadToBlobStorage(variantImage, variantBlobClient));
            }

          } else {
            // its not an image so we just upload it as is (but normalize the filename)
            let filename = file.name;
            // remove any %20 or space with a - to match frontend expectations
            filename = filename.replace(/%20/g, "-").replace(/ /g, "-");

            const blobClient = containerClient.getBlockBlobClient(`${req.headers.get("relative_path")}/${filename}`);
            uploadPromises.push(uploadToBlobStorage(await file.arrayBuffer(), blobClient));
          }

        }

    }

    // now we wait for all the uploads to finish
    const results = await Promise.allSettled(uploadPromises); // Wait for all uploads to finish
    const failed = results.filter(result => result.status === 'rejected');
    if (failed.length > 0) {
        console.error('Some file uploads failed:', failed);
        return new NextResponse(JSON.stringify({ ok: false, error: 'Internal server error' }), { status: 500 });
    } else {
        console.log('All files uploaded successfully!');
        return new NextResponse(JSON.stringify({ 
          ok: true,
          uploaded: results.filter(result => result.status === 'fulfilled').map(result => result.value)
        }), { status: 200 });
    }

  } catch (err) {
    console.error('Error during image upload handler:', err);
    return new NextResponse(JSON.stringify({ ok: false, error: 'Internal server error' }), { status: 500 });
  }

}