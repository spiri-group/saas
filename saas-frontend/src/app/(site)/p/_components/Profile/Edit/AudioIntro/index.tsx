import useFormStatus from "@/components/utils/UseFormStatus"
import useEditPractitionerAudioIntro, { UpdateAudioIntroFormSchema } from "./_hooks/UseEditPractitionerAudioIntro"
import { escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import FileUploader from "@/components/ux/FileUploader"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { Mic, XIcon, Play, Pause, Square, Upload } from "lucide-react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import axios from "axios"
import { v4 as uuid } from "uuid"
import { MediaType } from "@/utils/common_types"
import { toast } from "sonner"

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

type AudioRecorderProps = {
    practitionerId: string;
    audioId: string;
    onRecordingComplete: (audioData: {
        name: string;
        url: string;
        urlRelative: string;
        size: string;
        type: string;
        code: string;
        title: string;
        description: string;
    }) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ practitionerId, audioId, onRecordingComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (recordedUrl) URL.revokeObjectURL(recordedUrl);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [recordedUrl]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Set up audio analysis for level meter
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const updateLevel = () => {
                if (!analyserRef.current) return;
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                setAudioLevel(avg / 255);
                animationRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
            });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
                setRecordedBlob(blob);
                const url = URL.createObjectURL(blob);
                setRecordedUrl(url);

                // Clean up
                stream.getTracks().forEach(track => track.stop());
                streamRef.current = null;
                audioContext.close();
                if (animationRef.current) cancelAnimationFrame(animationRef.current);
                setAudioLevel(0);
            };

            mediaRecorder.start(100);
            setIsRecording(true);
            setRecordingTime(0);
            setRecordedBlob(null);
            if (recordedUrl) {
                URL.revokeObjectURL(recordedUrl);
                setRecordedUrl(null);
            }

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Failed to start recording:', err);
            toast.error('Could not access microphone. Please check your browser permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const discardRecording = () => {
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedBlob(null);
        setRecordedUrl(null);
        setRecordingTime(0);
    };

    const uploadRecording = async () => {
        if (!recordedBlob) return;

        setIsUploading(true);
        try {
            const filename = `recording-${Date.now()}.webm`;
            const file = new File([recordedBlob], filename, { type: recordedBlob.type });

            const formData = new FormData();
            formData.append("files", file);

            const relativePath = `vendor/${practitionerId}/audio/${audioId}`;
            await axios.post("/api/azure_upload", formData, {
                headers: {
                    container: 'public',
                    relative_path: relativePath,
                    target: JSON.stringify(null),
                    variants: JSON.stringify(null)
                }
            });

            const finalFilename = filename.replace(/%20/g, "-").replace(/ /g, "-");
            const url = `https://${process.env.NEXT_PUBLIC_STORAGE_ACCOUNT}.blob.core.windows.net/public/${relativePath}/${encodeURIComponent(finalFilename)}`;

            onRecordingComplete({
                name: finalFilename,
                url,
                urlRelative: `public/${relativePath}/${finalFilename}`,
                size: "SQUARE",
                type: MediaType.AUDIO,
                code: uuid(),
                title: 'Audio Introduction',
                description: ''
            });

            toast.success('Recording uploaded successfully');
        } catch (error) {
            console.error('Failed to upload recording:', error);
            toast.error('Failed to upload recording. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-4" data-testid="audio-recorder">
            {!recordedUrl ? (
                <div className="flex flex-col items-center space-y-4 p-6 rounded-lg border-2 border-dashed border-slate-600">
                    {/* Level meter */}
                    {isRecording && (
                        <div className="flex items-center space-x-1 h-8" data-testid="audio-level-meter">
                            {Array.from({ length: 20 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1.5 rounded-full transition-all duration-75"
                                    style={{
                                        height: `${Math.max(4, audioLevel * (8 + Math.sin(i * 0.5 + Date.now() * 0.005) * 4) * 4)}px`,
                                        backgroundColor: audioLevel > 0.6 ? '#ef4444' : audioLevel > 0.3 ? '#f59e0b' : '#a855f7'
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    <div className="text-2xl font-mono tabular-nums">
                        {formatTime(recordingTime)}
                    </div>

                    {recordingTime >= 60 && isRecording && (
                        <p className="text-xs text-amber-400">30-60 seconds recommended</p>
                    )}

                    <div className="flex space-x-3">
                        {!isRecording ? (
                            <Button
                                type="button"
                                onClick={startRecording}
                                className="bg-red-600 hover:bg-red-700"
                                data-testid="start-recording-btn"
                            >
                                <Mic className="h-4 w-4 mr-2" />
                                Start Recording
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={stopRecording}
                                variant="destructive"
                                data-testid="stop-recording-btn"
                            >
                                <Square className="h-4 w-4 mr-2" />
                                Stop Recording
                            </Button>
                        )}
                    </div>

                    {!isRecording && (
                        <p className="text-xs text-slate-400 text-center">
                            Click to start recording your voice introduction.
                            <br />Keep it brief - 30 to 60 seconds is ideal.
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    <AudioPlayer src={recordedUrl} testId="recorded-audio-preview" />
                    <div className="flex justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={discardRecording}
                            data-testid="discard-recording-btn"
                        >
                            <XIcon className="h-4 w-4 mr-1" />
                            Re-record
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={uploadRecording}
                            disabled={isUploading}
                            className="bg-purple-600 hover:bg-purple-700"
                            data-testid="upload-recording-btn"
                        >
                            {isUploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Use This Recording
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
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
                                    <Tabs defaultValue="record" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="record" data-testid="record-tab">
                                                <Mic className="h-4 w-4 mr-2" />
                                                Record Audio
                                            </TabsTrigger>
                                            <TabsTrigger value="upload" data-testid="upload-tab">
                                                <Upload className="h-4 w-4 mr-2" />
                                                Upload File
                                            </TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="record" className="mt-4">
                                            <AudioRecorder
                                                practitionerId={props.practitionerId}
                                                audioId={bl.audioId}
                                                onRecordingComplete={(audioData) => {
                                                    field.onChange(audioData);
                                                }}
                                            />
                                        </TabsContent>
                                        <TabsContent value="upload" className="mt-4">
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
                                                <p className="text-xs text-slate-400 mt-2">
                                                    Supported formats: MP3, WAV, OGG, FLAC
                                                </p>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                )}
                                <FormDescription className="text-xs">
                                    Keep it brief - 30 to 60 seconds is recommended.
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
