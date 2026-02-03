import useFormStatus from "@/components/utils/UseFormStatus"
import useEditMerchantVideo, { UpdateVendorVideoFormSchema } from "./_hooks/UseEditMerchantVideo"
import { escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import FileUploader from "@/components/ux/FileUploader"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { VideoIcon, XIcon } from "lucide-react"
import { useState } from "react"
import VideoFrameSelector from "./VideoFrameSelector"
import { media_type } from "@/utils/spiriverse"

type BLProps = {
    merchantId: string
}

type Props = BLProps & {

}

const useBL = ({ merchantId }: BLProps) => {

    const status = useFormStatus();
    const {form, mutation, hasLoaded} = useEditMerchantVideo(merchantId)
    const [caption, setCaption] = useState<string>('')
    const [videoId, setVideoId] = useState<string>(() => `v-${Date.now()}`)

    return {
        form,
        status,
        hasLoaded,
        caption,
        setCaption,
        videoId,
        currentVideo: form.watch('latestVideo'),
        finish: async (values: UpdateVendorVideoFormSchema) =>
            status.submit(
                mutation.mutateAsync,
                values,
                escape_key
            ),
        removeVideo: () => {
            // This now only clears the form, doesn't delete from array
            form.setValue('latestVideo', undefined, { shouldDirty: true })
            form.setValue('coverPhoto', undefined, { shouldDirty: true })
            setCaption('')
            setVideoId(`v-${Date.now()}`) // Generate new ID when video is removed
        },
        handleFrameSelect: () => {
            // This function is no longer used - frame selection now uploads directly
            console.warn('handleFrameSelect called but should not be used');
        },
        handleCustomCoverUpload: (file: any) => {
            const coverPhoto: media_type = {
                name: file.name,
                url: file.url,
                urlRelative: file.urlRelative,
                size: file.size || 'SQUARE',
                type: file.type,
                code: file.code || `cover-${Date.now()}`,
                sizeBytes: file.sizeBytes
            };
            form.setValue('coverPhoto', coverPhoto, { shouldDirty: true });
        }
    }
}

const EditMerchantVideo: React.FC<Props> = (props) => {

    const bl = useBL(props)

    if (!bl.hasLoaded) return <></>

    return (
        <DialogContent className="w-[900px] max-w-[90vw] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                <div className="flex items-center space-x-2">
                    <VideoIcon className="h-5 w-5" />
                    <span>Update Your Latest Video</span>
                </div>
            </DialogHeader>
            <DialogDescription>
                Upload a video to showcase your latest updates. TikTok-style vertical format (9:16) works best!
            </DialogDescription>
            <Form {...bl.form}>
                <form className="mt-4" onSubmit={bl.form.handleSubmit(bl.finish)}>
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Left side - Video preview */}
                        <div className="flex-shrink-0 md:w-[280px]">
                            <FormField
                                control={bl.form.control}
                                name="latestVideo"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Video Upload</FormLabel>
                                        {bl.currentVideo ? (
                                            <div className="relative">
                                                <video
                                                    src={bl.currentVideo.url}
                                                    controls
                                                    className="w-full rounded-lg border border-slate-200"
                                                    style={{ aspectRatio: '9/16', objectFit: 'cover' }}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    className="absolute top-2 right-2"
                                                    onClick={bl.removeVideo}
                                                >
                                                    <XIcon className="h-4 w-4 mr-1" />
                                                    Remove
                                                </Button>
                                            </div>
                                        ) : (
                                            <FileUploader
                                                id="merchant_video"
                                                className="w-full h-[500px] rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors flex items-center justify-center"
                                                style={{ aspectRatio: '9/16' }}
                                                {...field}
                                                value={undefined}
                                                connection={{
                                                    container: 'public',
                                                    relative_path: `vendor/${props.merchantId}/video/${bl.videoId}`
                                                }}
                                                allowMultiple={false}
                                                acceptOnly={{
                                                    type: 'VIDEO'
                                                }}
                                                onDropAsync={() => {
                                                    // Handle drop start
                                                }}
                                                onUploadCompleteAsync={(files) => {
                                                    if (files.length > 0) {
                                                        const file = files[0]
                                                        const videoData = {
                                                            name: file.name,
                                                            url: file.url,
                                                            urlRelative: file.urlRelative,
                                                            size: file.size,
                                                            type: file.type,
                                                            title: 'Latest Video Update',
                                                            description: bl.caption,
                                                            hashtags: []
                                                        }
                                                        field.onChange(videoData)
                                                    }
                                                }}
                                            />
                                        )}
                                        <p className="text-xs text-slate-500 mt-2">
                                            9:16 vertical format recommended
                                        </p>
                                    </FormItem>
                                )} />
                        </div>

                        {/* Right side - Caption and settings */}
                        <div className="flex-grow space-y-4">
                            {/* Video Caption - Always show */}
                            <div className="space-y-2">
                                <FormLabel>Caption</FormLabel>
                                <textarea
                                    value={bl.currentVideo?.description || bl.caption}
                                    onChange={(e) => {
                                        const newCaption = e.target.value
                                        bl.setCaption(newCaption)
                                        if (bl.currentVideo) {
                                            bl.form.setValue('latestVideo.description', newCaption, { shouldDirty: true })
                                        }
                                    }}
                                    className="w-full min-h-[100px] p-3 rounded-lg border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-colors resize-none"
                                    placeholder="Write a caption for your video..."
                                    maxLength={300}
                                />
                                <FormDescription className="text-xs flex justify-between">
                                    <span>Add a caption to describe your video (TikTok style!)</span>
                                    <span className="text-slate-400">{(bl.currentVideo?.description || bl.caption).length}/300</span>
                                </FormDescription>
                            </div>

                            {/* Cover Photo Selector */}
                            {bl.currentVideo && (
                                <div className="border-t border-slate-200 pt-4">
                                    <VideoFrameSelector
                                        videoUrl={bl.currentVideo.url}
                                        merchantId={props.merchantId}
                                        videoId={bl.videoId}
                                        onCustomUpload={bl.handleCustomCoverUpload}
                                        currentCover={bl.form.watch('coverPhoto')?.url}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <CancelDialogButton />
                        <Button
                            variant={bl.status.button.variant}
                            type="submit"
                            disabled={!bl.form.formState.isDirty}
                        >
                            {bl.status.formState === "idle" ? "Save Video" : bl.status.button.title }
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

export default EditMerchantVideo
