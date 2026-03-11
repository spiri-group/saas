import useFormStatus from "@/components/utils/UseFormStatus"
import useEditPractitionerVideo, { UpdatePractitionerVideoFormSchema } from "./_hooks/UseEditPractitionerVideo"
import useDeletePractitionerVideoUpdate from "./_hooks/UseDeletePractitionerVideoUpdate"
import { escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import FileUploader from "@/components/ux/FileUploader"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { VideoIcon, XIcon, Trash2, Loader2 } from "lucide-react"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { gql } from "@/lib/services/gql"
// Reuse the VideoFrameSelector from merchant - it works with any vendor ID
import VideoFrameSelector from "../../../../../m/_components/Profile/Edit/Video/VideoFrameSelector"
import { media_type } from "@/utils/spiriverse"

interface ExistingVideoUpdate {
    id: string
    media: { url: string; name?: string; type?: string }
    coverPhoto?: { url: string }
    caption?: string
    postedAt: string
}

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

const useExistingVideoUpdates = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-video-updates', practitionerId],
        queryFn: async () => {
            const response = await gql<{ vendor: { videoUpdates?: ExistingVideoUpdate[] } }>(
                `query GetPractitionerVideoUpdates($id: String!) {
                    vendor(id: $id) {
                        id
                        videoUpdates {
                            id
                            media { url name type }
                            coverPhoto { url }
                            caption
                            postedAt
                        }
                    }
                }`,
                { id: practitionerId }
            );
            return response.vendor;
        },
        enabled: !!practitionerId,
        select: (data) => data?.videoUpdates || [],
    });
}

const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

const EditPractitionerVideo: React.FC<Props> = (props) => {

    const bl = useBL(props)
    const { data: existingUpdates } = useExistingVideoUpdates(props.practitionerId)
    const deleteMutation = useDeletePractitionerVideoUpdate(props.practitionerId)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleDelete = async (videoUpdateId: string) => {
        setDeletingId(videoUpdateId)
        try {
            await deleteMutation.mutateAsync(videoUpdateId)
        } finally {
            setDeletingId(null)
        }
    }

    if (!bl.hasLoaded) return <></>

    const hasExisting = existingUpdates && existingUpdates.length > 0;

    return (
        <DialogContent
            className={`max-h-[85vh] overflow-hidden ${hasExisting ? 'w-[1100px] max-w-[95vw]' : 'w-[900px] max-w-[90vw]'}`}
            data-testid="edit-practitioner-video-dialog"
        >
            <DialogHeader>
                <div className="flex items-center space-x-2">
                    <VideoIcon className="h-5 w-5" />
                    <span>Video Updates</span>
                </div>
            </DialogHeader>
            <DialogDescription>
                {hasExisting ? 'Manage your video updates or post a new one.' : 'Share a video update with your followers.'}
            </DialogDescription>

            <div className={`flex gap-6 ${hasExisting ? 'flex-col lg:flex-row' : ''}`}>
                {/* Left / Main — Post New Video */}
                <div className="flex-1 min-w-0 overflow-y-auto max-h-[calc(85vh-8rem)]">
                    <Form {...bl.form}>
                        <form onSubmit={bl.form.handleSubmit(bl.finish)}>
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Video preview */}
                                <div className="flex-shrink-0 md:w-[280px]">
                                    <FormField
                                        control={bl.form.control}
                                        name="latestVideo"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel dark>Video Upload</FormLabel>
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

                                {/* Caption and settings */}
                                <div className="flex-grow space-y-4">
                                    <div className="space-y-2">
                                        <FormLabel dark>Caption</FormLabel>
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
                </div>

                {/* Right Sidebar — Existing Video Updates as square grid */}
                {hasExisting && (
                    <div className="lg:w-[200px] flex-shrink-0 lg:border-l lg:border-slate-700 lg:pl-6 overflow-y-auto max-h-[calc(85vh-8rem)]" data-testid="existing-video-updates">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                            Your Updates ({existingUpdates.length})
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            {existingUpdates.map((update) => (
                                <div
                                    key={update.id}
                                    className="group relative aspect-square rounded-lg overflow-hidden bg-slate-700"
                                    data-testid={`video-update-${update.id}`}
                                >
                                    {update.coverPhoto?.url ? (
                                        <img
                                            src={update.coverPhoto.url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <video
                                            src={update.media.url}
                                            preload="metadata"
                                            muted
                                            playsInline
                                            className="w-full h-full object-cover"
                                            onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }}
                                        />
                                    )}

                                    {/* Time badge */}
                                    <span className="absolute bottom-1 left-1 text-[9px] text-white/70 bg-black/60 rounded px-1 py-0.5">
                                        {formatTimeAgo(update.postedAt)}
                                    </span>

                                    {/* Delete button — hover overlay */}
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                        onClick={() => handleDelete(update.id)}
                                        disabled={deletingId === update.id}
                                        data-testid={`delete-video-update-${update.id}`}
                                    >
                                        {deletingId === update.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-3 w-3" />
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DialogContent>
    )
}

export default EditPractitionerVideo
