import { Button } from "@/components/ui/button"
import { DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Form } from "@/components/ui/form"
import ThumbnailBuilder from "@/components/ux/ThumbnailBuilder"
import { useZodFormHandler } from "@/components/ux/ZodFormHandler"
import { omit } from "@/lib/functions"
import { gql } from "@/lib/services/gql"
import { ThumbnailSchema } from "@/shared/schemas/thumbnail"
import { recordref_type } from "@/utils/spiriverse"
import { useQueryClient } from "@tanstack/react-query"
import { z } from "zod"

const EditThumbnail: React.FC<{
    forObject: recordref_type,
    existingThumbnail: ThumbnailSchema,
    onSuccess: (value: ThumbnailSchema) => void,
    thumbnailType?: string,
    onCancel: () => void,
    withPrice?: boolean,
    initialMode?: string,
    objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down"
}> = ({ forObject, existingThumbnail, onSuccess, onCancel }) => {
    const queryClient = useQueryClient();
    
    const { form, control, handleSubmit, status } = useZodFormHandler({
        schema: z.object({
            thumbnail: ThumbnailSchema
        }),
        defaultValues: {
            thumbnail: existingThumbnail
        },
        onSubmit: async (data) => {
            // Remove url fields from thumbnail media (backend only expects urlRelative)
            let thumbnail = data.thumbnail ? { ...data.thumbnail } : undefined;

            if (thumbnail) {
                // Remove url from image.media if it exists
                if (thumbnail.image?.media) {
                    thumbnail = {
                        ...thumbnail,
                        image: {
                            ...thumbnail.image,
                            media: omit(thumbnail.image.media, ['url']) as any
                        }
                    };
                }

                // Remove url from dynamicMode.video.media if it exists
                if (thumbnail.dynamicMode?.video?.media) {
                    thumbnail = {
                        ...thumbnail,
                        dynamicMode: {
                            ...thumbnail.dynamicMode,
                            video: {
                                ...thumbnail.dynamicMode.video,
                                media: omit(thumbnail.dynamicMode.video.media, ['url']) as any
                            }
                        }
                    };
                }

                // Remove url from dynamicMode.collage.images if they exist
                if (thumbnail.dynamicMode?.collage?.images) {
                    thumbnail = {
                        ...thumbnail,
                        dynamicMode: {
                            ...thumbnail.dynamicMode,
                            collage: {
                                ...thumbnail.dynamicMode.collage,
                                images: thumbnail.dynamicMode.collage.images.map(img => omit(img, ['url']) as any)
                            }
                        }
                    };
                }
            }

            // we need to call out to graphql to update the thumbnail
            await gql<{
                upsertThumbnail: {
                    success
                }
            }>(`
                mutation upsert_thumbnail($forObject: RecordRefInput!, $thumbnail: ThumbnailInput!) {
                    upsertThumbnail(forObject: $forObject, thumbnail: $thumbnail) {
                        code
                        success
                        message
                    }
                }`, {
                thumbnail,
                forObject
            });

            return data;
        },
        onError: (errors) => {
            console.error(errors);
        },
        onSuccess: (values) => {
            onSuccess(values.thumbnail);

            // lets invalidate any search results that may be cached
            // as we are not sure if the thumbnail is cached or not
            queryClient.invalidateQueries({
                queryKey: ["catalogue"],
                exact: false
            });

        }
    })

    const getRelativePath = () => {
        const container = forObject.container?.toUpperCase() || "";
        if (container.includes("LISTING")) {
            return `merchant/${forObject.partition[0]}/product/${forObject.id}/thumbnail`;
        }
        if (container.includes("VENDOR")) {
            return `vendor/${forObject.id}`;
        }
        // Add more cases here as needed
        return '';
    };

    const relativePath = getRelativePath();

    const uploadToAzure = async (file: File, fileType: 'IMAGE' | 'VIDEO'): Promise<any> => {
        const formData = new FormData();
        formData.append('files', file);

        const originalExtension = file.name.split('.').pop()?.toLowerCase() || '';
        const isVideo = ['mp4', 'mov', 'avi', 'mkv'].includes(originalExtension);

        let finalFilename = file.name.split('.')[0];
        if (isVideo) {
            finalFilename = `${finalFilename}.${originalExtension}`;
        } else {
            finalFilename = `${finalFilename}.webp`;
        }
        finalFilename = finalFilename.replace(/%20/g, '-').replace(/ /g, '-');

        const container = 'public';

        await fetch('/api/azure_upload', {
            method: 'POST',
            body: formData,
            headers: {
                'container': container,
                'relative_path': relativePath
            }
        });

        const url = `https://${process.env.NEXT_PUBLIC_STORAGE_ACCOUNT}.blob.core.windows.net/${container}/${relativePath}/${encodeURIComponent(finalFilename)}`;
        const urlRelative = `${container}/${relativePath}/${finalFilename}`;

        return {
            code: Math.random().toString(36).substring(7),
            name: finalFilename,
            url,
            urlRelative,
            type: fileType,
            size: 'RECTANGLE_HORIZONTAL' as const,
            sizeBytes: file.size,
            ...(isVideo && { durationSeconds: 5 })
        };
    };

    return (
        <DialogContent className="max-w-5xl w-full">
            <Form {...form}>
                <form onSubmit={handleSubmit} className="w-full">
                    <ThumbnailBuilder
                        control={control}
                        name="thumbnail"
                        onUploadCoverPhoto={(file) => uploadToAzure(file, 'IMAGE')}
                        onUploadVideo={(file) => uploadToAzure(file, 'VIDEO')}
                        onUploadCollageImage={(file) => uploadToAzure(file, 'IMAGE')}
                    />
                    <DialogFooter className="flex flex-row gap-3 mt-3">
                        <Button 
                            className="flex-none"
                            type="button" variant="link" onClick={() => {
                            form.reset();
                            onCancel()
                        }}>Cancel</Button>
                        <Button 
                            variant={status.formState === "idle" ? "default" : status.button.variant} 
                            disabled={status.formState === "processing"}
                            type="submit" className="flex-grow">
                            {status.formState === "idle" ? "Save" : status.button.title}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

export default EditThumbnail;