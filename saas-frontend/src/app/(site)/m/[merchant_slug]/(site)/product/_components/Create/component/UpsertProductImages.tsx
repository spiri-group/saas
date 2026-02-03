import { Carousel, CarouselButton, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ux/Carousel"
import FileUploader from "@/components/ux/FileUploader"
import { isNullOrUndefined } from "@/lib/functions"
import { cn } from "@/lib/utils"
import { media_type, MediaType } from "@/utils/spiriverse"
import { Trash2Icon } from "lucide-react"
import { ControllerRenderProps } from "react-hook-form"
import { z } from "zod"

export type MediaInputSchema = z.infer<typeof MediaInputSchema>
export const MediaInputSchema = z.object({
    name: z.string(),
    url: z.string(),
    urlRelative: z.string(),
    size: z.string(),
    type: z.enum([MediaType.IMAGE, MediaType.VIDEO]),
    code: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    hashtags: z.array(z.string()).optional()
})

type Props = ControllerRenderProps<{
  [key: string]: MediaInputSchema[]
}, any> & {
    id: string,
    aspectRatio: "video" | "square",
    relativePath: string,
    maxImages?: number
}

const UpsertProductImages: React.FC<Props> = ({ aspectRatio = "video", maxImages = 10, ...props}) => {

    const getDimensions = (shape) => {
        switch (shape) {
            case "video":
                return { width: 500, height: 300 };
            case "square":
                return { width: 300, height: 300 };
            default:
                return { width: 500, height: 300 };
        }
    };
    const { width, height } = getDimensions(aspectRatio);

    return (
        <div className="flex flex-col">
            <Carousel className="flex flex-col" orientation="horizontal">
                <CarouselContent 
                    outerClassName={`w-[${width}px] h-[${height}px]`} 
                    className="w-full h-full" 
                    style={{ paddingBottom: "1rem" }}>                
                {(isNullOrUndefined(props.value) || props.value.length === 0) && (
                    <CarouselItem className="bg-gray-100 w-full h-full">
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                            No images uploaded
                        </div>
                    </CarouselItem>
                 )}
                {!isNullOrUndefined(props.value) && props.value.map((image) => {
                    return (
                        <CarouselItem key={image.code} className="flex-none w-full">
                            <img className="w-full h-full" src={image.url} alt={image.title} />
                        </CarouselItem>
                    )
                })}
                </CarouselContent>
                <div className="flex flex-row items-center w-full">
                    { (props.value ?? []).length < maxImages && (
                    <FileUploader
                        className="p-1 w-24 flex-none"
                        buttonProps={{
                            className: "w-full"
                        }}
                        id={`new-image-${props.id}`}
                        targetImage={{ width, height }}
                        targetImageVariants={[]}
                        connection={{
                            container: "public",
                            relative_path: `${props.relativePath}/images`
                        }}
                        includePreview={false}
                        onDropAsync={() => {}}
                        onUploadCompleteAsync={(files: media_type[]) => {
                            // we need to add a title to each new image
                            const current_length = (props.value ?? []).length
                            const new_images = files.map((file, idx) => {
                                return {
                                    ...file,
                                    type: MediaType.IMAGE,
                                    title: `Image ${current_length + idx + 1}` 
                                } as MediaInputSchema
                            })
                            props.onChange((props.value ?? []).concat(new_images))
                        }} />
                    )}
                    <CarouselButton
                        className="mx-2"
                        disabled={isNullOrUndefined(props.value) || props.value.length === 0}
                        onSelect={(idx) => {
                            const newImages = [...props.value]
                            newImages.splice(idx, 1)
                            props.onChange(newImages)
                        }}
                        size="icon" type="button" variant="ghost">
                        <Trash2Icon size={16} />
                    </CarouselButton>
                    <div className="grid grid-cols-2 gap-2">
                        <CarouselPrevious />
                        <CarouselNext />
                    </div>
                    <div className={cn("flex items-center justify-center text-xs ml-auto", isNullOrUndefined(props.value) || props.value.length === 0 ? "bg-gray-100" : "bg-primary", "flex-none p-2 w-auto aspect-square rounded-full")}>
                        <span className="font-bold">{(props.value ?? []).length}</span>/{maxImages}
                    </div>
                </div>
            </Carousel>
        </div>
    )
}

export default UpsertProductImages