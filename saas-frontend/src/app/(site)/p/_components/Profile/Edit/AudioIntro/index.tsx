import useFormStatus from "@/components/utils/UseFormStatus"
import useEditPractitionerAudioIntro, { UpdateAudioIntroFormSchema } from "./_hooks/UseEditPractitionerAudioIntro"
import { escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import FileUploader from "@/components/ux/FileUploader"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { Mic, XIcon, Play, Pause } from "lucide-react"
import { useState, useRef } from "react"

type BLProps = {
    practitionerId: string
}

type Props = BLProps & {}

const useBL = ({ practitionerId }: BLProps) => {
    const status = useFormStatus();
    const { form, mutation, hasLoaded } = useEditPractitionerAudioIntro(practitionerId)
    const [audioId, setAudioId] = useState<string>(() => `audio-intro-${Date.now()}`)

    return {
        form,
        status,
        hasLoaded,
        audioId,
        currentAudio: form.watch('audioIntro'),
        finish: async (values: UpdateAudioIntroFormSchema) =>
            status.submit(
                mutation.mutateAsync,
                values,
                escape_key
            ),
        removeAudio: () => {
            form.setValue('audioIntro', null, { shouldDirty: true })
            setAudioId(`audio-intro-${Date.now()}`)
        }
    }
}

const AudioPlayer: React.FC<{ src: string; testId?: string }> = ({ src, testId }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center space-x-4 bg-slate-800 rounded-lg p-4" data-testid={testId}>
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onEnded={() => setIsPlaying(false)}
            />
            <button
                type="button"
                onClick={togglePlay}
                className="w-12 h-12 flex items-center justify-center bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"
            >
                {isPlaying ? (
                    <Pause className="h-5 w-5 text-white" />
                ) : (
                    <Play className="h-5 w-5 text-white ml-0.5" />
                )}
            </button>
            <div className="flex-grow">
                <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                    <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                    />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

const EditPractitionerAudioIntro: React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (!bl.hasLoaded) return <></>

    return (
        <DialogContent
            className="w-[600px] max-w-[90vw]"
            data-testid="edit-practitioner-audio-intro-dialog"
        >
            <DialogHeader>
                <div className="flex items-center space-x-2">
                    <Mic className="h-5 w-5" />
                    <span>Audio Introduction</span>
                </div>
            </DialogHeader>
            <DialogDescription>
                Share a voice greeting with your clients. Let them hear your warmth and energy before they even connect with you.
            </DialogDescription>
            <Form {...bl.form}>
                <form className="mt-4" onSubmit={bl.form.handleSubmit(bl.finish)}>
                    <FormField
                        control={bl.form.control}
                        name="audioIntro"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Your Voice Introduction</FormLabel>
                                {bl.currentAudio ? (
                                    <div className="space-y-3">
                                        <AudioPlayer src={bl.currentAudio.url} testId="audio-intro-player" />
                                        <div className="flex justify-end">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={bl.removeAudio}
                                                data-testid="remove-audio-intro-btn"
                                            >
                                                <XIcon className="h-4 w-4 mr-1" />
                                                Remove Audio
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div data-testid="audio-intro-uploader">
                                        <FileUploader
                                            id="practitioner_audio_intro"
                                            className="w-full h-[150px] rounded-lg border-2 border-dashed border-slate-600 hover:border-slate-500 transition-colors flex items-center justify-center"
                                            {...field}
                                            value={undefined}
                                            connection={{
                                                container: 'public',
                                                relative_path: `vendor/${props.practitionerId}/audio/${bl.audioId}`
                                            }}
                                            allowMultiple={false}
                                            acceptOnly={{
                                                type: 'AUDIO'
                                            }}
                                            onDropAsync={() => { }}
                                            onUploadCompleteAsync={(files) => {
                                                if (files.length > 0) {
                                                    const file = files[0]
                                                    const audioData = {
                                                        name: file.name,
                                                        url: file.url,
                                                        urlRelative: file.urlRelative,
                                                        size: file.size,
                                                        type: file.type,
                                                        code: file.code || `audio-intro-${Date.now()}`,
                                                        title: 'Audio Introduction',
                                                        description: ''
                                                    }
                                                    field.onChange(audioData)
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                                <FormDescription className="text-xs">
                                    Upload an MP3, WAV, or OGG file. Keep it brief (30-60 seconds recommended).
                                </FormDescription>
                            </FormItem>
                        )}
                    />

                    <DialogFooter className="mt-6">
                        <CancelDialogButton />
                        <Button
                            variant={bl.status.button.variant}
                            type="submit"
                            disabled={!bl.form.formState.isDirty}
                            data-testid="save-audio-intro-btn"
                        >
                            {bl.status.formState === "idle" ? "Save Audio" : bl.status.button.title}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

export default EditPractitionerAudioIntro
