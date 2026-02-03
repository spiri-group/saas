import useFormStatus from "@/components/utils/UseFormStatus"
import useEditPractitionerOracleMessage, { UpdateOracleMessageFormSchema } from "./_hooks/UseEditPractitionerOracleMessage"
import { escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import FileUploader from "@/components/ux/FileUploader"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { Sparkles, XIcon, Play, Pause, Clock, AlertCircle } from "lucide-react"
import { useState, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"

type BLProps = {
    practitionerId: string
}

type Props = BLProps & {}

const useBL = ({ practitionerId }: BLProps) => {
    const status = useFormStatus();
    const { form, mutation, hasLoaded, currentOracleMessage, isExpired } = useEditPractitionerOracleMessage(practitionerId)
    const [audioId, setAudioId] = useState<string>(() => `oracle-${Date.now()}`)

    return {
        form,
        status,
        hasLoaded,
        audioId,
        currentOracleMessage,
        isExpired,
        currentFormAudio: form.watch('oracleMessage.audio'),
        currentFormMessage: form.watch('oracleMessage.message'),
        finish: async (values: UpdateOracleMessageFormSchema) =>
            status.submit(
                mutation.mutateAsync,
                values,
                escape_key
            ),
        removeOracleMessage: () => {
            form.setValue('oracleMessage', null, { shouldDirty: true })
            setAudioId(`oracle-${Date.now()}`)
        },
        setAudioFile: (audioData: any) => {
            form.setValue('oracleMessage', {
                id: `oracle-${Date.now()}`,
                audio: audioData,
                message: form.getValues('oracleMessage.message') || null
            }, { shouldDirty: true })
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
        <div className="flex items-center space-x-4 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-lg p-4 border border-purple-500/30" data-testid={testId}>
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
                <div className="w-full bg-slate-700/50 rounded-full h-2 mb-1">
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

const TimeRemaining: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) {
        return (
            <div className="flex items-center space-x-2 text-amber-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Expired - Post a new message to replace</span>
            </div>
        );
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return (
        <div className="flex items-center space-x-2 text-purple-400 text-sm">
            <Clock className="h-4 w-4" />
            <span>Expires in {hours}h {minutes}m</span>
        </div>
    );
};

const EditPractitionerOracleMessage: React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (!bl.hasLoaded) return <></>

    const hasExistingMessage = bl.currentOracleMessage && !bl.isExpired;
    const hasNewAudio = bl.currentFormAudio?.url;

    return (
        <DialogContent
            className="w-[600px] max-w-[90vw]"
            data-testid="edit-practitioner-oracle-message-dialog"
        >
            <DialogHeader>
                <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <span>Daily Oracle Message</span>
                </div>
            </DialogHeader>
            <DialogDescription>
                Share a voice message with divine guidance for your followers. Your oracle message will be visible for 24 hours.
            </DialogDescription>
            <Form {...bl.form}>
                <form className="mt-4 space-y-4" onSubmit={bl.form.handleSubmit(bl.finish)}>
                    {/* Show existing oracle message if not expired */}
                    {hasExistingMessage && !hasNewAudio && (
                        <div className="space-y-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-white">Current Oracle Message</h4>
                                <TimeRemaining expiresAt={bl.currentOracleMessage!.expiresAt} />
                            </div>
                            <AudioPlayer src={bl.currentOracleMessage!.audio.url} testId="oracle-audio-player-existing" />
                            {bl.currentOracleMessage?.message && (
                                <p className="text-sm text-slate-300 italic">&ldquo;{bl.currentOracleMessage.message}&rdquo;</p>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={bl.removeOracleMessage}
                                className="w-full"
                                data-testid="replace-oracle-btn"
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Post New Oracle Message
                            </Button>
                        </div>
                    )}

                    {/* Show upload area if no existing message or replacing */}
                    {(!hasExistingMessage || hasNewAudio || bl.isExpired) && (
                        <>
                            <FormField
                                control={bl.form.control}
                                name="oracleMessage.audio"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Voice Message</FormLabel>
                                        {hasNewAudio ? (
                                            <div className="space-y-3">
                                                <AudioPlayer src={bl.currentFormAudio!.url} testId="oracle-audio-player" />
                                                <div className="flex justify-end">
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => {
                                                            bl.form.setValue('oracleMessage', null, { shouldDirty: true })
                                                        }}
                                                        data-testid="remove-oracle-audio-btn"
                                                    >
                                                        <XIcon className="h-4 w-4 mr-1" />
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div data-testid="oracle-audio-uploader">
                                                <FileUploader
                                                    id="practitioner_oracle_audio"
                                                    className="w-full h-[120px] rounded-lg border-2 border-dashed border-purple-500/50 hover:border-purple-400/70 bg-purple-900/10 transition-colors flex items-center justify-center"
                                                    {...field}
                                                    value={undefined}
                                                    connection={{
                                                        container: 'public',
                                                        relative_path: `vendor/${props.practitionerId}/oracle/${bl.audioId}`
                                                    }}
                                                    allowMultiple={false}
                                                    acceptOnly={{
                                                        type: 'AUDIO'
                                                    }}
                                                    onDropAsync={() => { }}
                                                    onUploadCompleteAsync={(files) => {
                                                        if (files.length > 0) {
                                                            const file = files[0]
                                                            bl.setAudioFile({
                                                                name: file.name,
                                                                url: file.url,
                                                                urlRelative: file.urlRelative,
                                                                size: file.size,
                                                                type: file.type,
                                                                code: file.code || `oracle-${Date.now()}`,
                                                                title: 'Daily Oracle',
                                                                description: ''
                                                            })
                                                        }
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <FormDescription className="text-xs">
                                            Share wisdom, guidance, or a daily message with your community.
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />

                            {/* Optional caption */}
                            <FormField
                                control={bl.form.control}
                                name="oracleMessage.message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Caption <span className="text-slate-400">(Optional)</span>
                                        </FormLabel>
                                        <Textarea
                                            {...field}
                                            value={field.value || ''}
                                            placeholder="Add a caption that displays while your oracle plays..."
                                            className="resize-none bg-slate-800 border-slate-600"
                                            maxLength={200}
                                            rows={2}
                                            data-testid="oracle-message-input"
                                        />
                                        <FormDescription className="text-xs flex justify-between">
                                            <span>Text shown during audio playback</span>
                                            <span className="text-slate-400">{(field.value || '').length}/200</span>
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                        </>
                    )}

                    <DialogFooter className="mt-6">
                        <CancelDialogButton />
                        <Button
                            variant={bl.status.button.variant}
                            type="submit"
                            disabled={!bl.form.formState.isDirty}
                            data-testid="save-oracle-message-btn"
                        >
                            {bl.status.formState === "idle" ? (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Post Oracle
                                </>
                            ) : bl.status.button.title}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

export default EditPractitionerOracleMessage
