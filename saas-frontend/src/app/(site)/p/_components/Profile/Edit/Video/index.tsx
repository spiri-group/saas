import useFormStatus from "@/components/utils/UseFormStatus"
import useEditPractitionerVideo, { UpdatePractitionerVideoFormSchema } from "./_hooks/UseEditPractitionerVideo"
import { escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import FileUploader from "@/components/ux/FileUploader"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { VideoIcon, XIcon } from "lucide-react"
import { useState } from "react"
// Reuse the VideoFrameSelector from merchant - it works with any vendor ID
import VideoFrameSelector from "../../../../../m/_components/Profile/Edit/Video/VideoFrameSelector"
import { media_type } from "@/utils/spiriverse"

type BLProps = {
    practitionerId: string
}

type Props = BLProps & {}

const useBL = ({ practitionerId }: BLProps) => {

    const status = useFormStatus();
    const {form, mutation, hasLoaded} = useEditPractitionerVideo(practitionerId)
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
        finish: async (values: UpdatePractitionerVideoFormSchema) =>
            status.submit(
                mutation.mutateAsync,
                values,
                escape_key
            ),
        removeVideo: () => {
            form.setValue('latestVideo', undefined, { shouldDirty: true })
            form.setValue('coverPhoto', undefined, { shouldDirty: true })
            setCaption('')
            setVideoId(`v-${Date.now()}`)
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

const EditPractitionerVideo: React.FC<Props> = (props) => {

    const bl = useBL(props)

    if (!bl.hasLoaded) return <></>

    return (
        <DialogContent
            className="w-[900px] max-w-[90vw] max-h-[80vh] overflow-y-auto"
            data-testid="edit-practitioner-video-dialog"
        >
            <DialogHeader>
                <div className="flex items-center space-x-2">
                    <VideoIcon className="h-5 w-5" />
                    <span>Post a Video Update</span>
                </div>
            </DialogHeader>
            <DialogDescription>
                Share a video update with your followers. It will appear in their feed.
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
                                                    className="w-full rounded-lg border border-slate-700"
                                                    style={{ aspectRatio: '9/16', objectFit: 'cover' }}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    className="absolute top-2 right-2"
                                                    onClick={bl.removeVideo}
                                                    data-testid="remove-video-btn"
                                                >
                                                    <XIcon className="h-4 w-4 mr-1" />
                                                    Remove
                                                </Button>
                                            </div>
                                        ) : (
                                            <FileUploader
                                                id="practitioner_video"
                                                className="w-full h-[500px] rounded-lg border-2 border-dashed border-slate-600 hover:border-slate-500 transition-colors flex items-center justify-center"
                                                style={{ aspectRatio: '9/16' }}
                                                {...field}
                                                value={undefined}
                                                connection={{
                                                    container: 'public',
                                                    relative_path: `vendor/${props.practitionerId}/video/${bl.videoId}`
                                                }}
                                                allowMultiple={false}
                                                acceptOnly={{
                                                    type: 'VIDEO'
                                                }}
                                                onDropAsync={() => {}}
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
                                        <p className="text-xs text-slate-400 mt-2">
                                            9:16 vertical format recommended
                                        </p>
                                    </FormItem>
                                )} />
                        </div>

                        {/* Right side - Caption and settings */}
                        <div className="flex-grow space-y-4">
                            {/* Video Caption */}
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
                                    className="w-full min-h-[100px] p-3 rounded-lg border border-slate-600 bg-slate-800 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors resize-none"
                                    placeholder="Share what inspired this video, or give your clients a preview..."
                                    maxLength={300}
                                    data-testid="video-caption-input"
                                />
                                <FormDescription className="text-xs flex justify-between">
                                    <span>Add a caption to give context to your video</span>
                                    <span className="text-slate-400">{(bl.currentVideo?.description || bl.caption).length}/300</span>
                                </FormDescription>
                            </div>

                            {/* Cover Photo Selector */}
                            {bl.currentVideo && (
                                <div className="border-t border-slate-700 pt-4">
                                    <VideoFrameSelector
                                        videoUrl={bl.currentVideo.url}
                                        merchantId={props.practitionerId}
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
                            data-testid="save-video-btn"
                        >
                            {bl.status.formState === "idle" ? "Post Update" : bl.status.button.title }
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

export default EditPractitionerVideo
