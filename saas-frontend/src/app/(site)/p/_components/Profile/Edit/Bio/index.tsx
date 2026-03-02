import useFormStatus from "@/components/utils/UseFormStatus"
import useEditPractitionerBio, { EditPractitionerBioSchema } from "./_hooks/UseEditPractitionerBio"
import { escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { Button } from "@/components/ui/button"
import { Loader2, Camera, Trash2 } from "lucide-react"
import ProfilePictureCropDialog from "@/components/ux/ProfilePictureCropDialog"
import Image from "next/image"
import { useRef, useState } from "react"
import axios from "axios"
import { toast } from "sonner"

type Props = {
    practitionerId: string
}

const useBL = ({ practitionerId }: Props) => {
    const status = useFormStatus();
    const { form, mutation, isLoading, hasLoaded } = useEditPractitionerBio(practitionerId)

    return {
        form,
        status,
        isLoading,
        hasLoaded,
        finish: async (values: EditPractitionerBioSchema) =>
            status.submit(
                mutation.mutateAsync,
                values,
                escape_key
            )
    }
}

const EditPractitionerBio: React.FC<Props> = (props) => {
    const bl = useBL(props)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [showCropDialog, setShowCropDialog] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            setShowCropDialog(true)
        }
        // Reset so the same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleCropConfirm = async (croppedBlob: Blob) => {
        setShowCropDialog(false)
        setSelectedFile(null)
        setIsUploading(true)

        try {
            const filename = `profile-picture-${Date.now()}`
            const file = new File([croppedBlob], `${filename}.png`, { type: 'image/png' })

            const formData = new FormData()
            formData.append('file', file)

            const uploadResponse = await axios.post('/api/azure_upload', formData, {
                headers: {
                    container: 'public',
                    relative_path: `practitioner/${props.practitionerId}/profile`,
                }
            })

            if (uploadResponse.data.ok) {
                const url = `https://${process.env.NEXT_PUBLIC_STORAGE_ACCOUNT}.blob.core.windows.net/public/practitioner/${props.practitionerId}/profile/${encodeURIComponent(filename)}.webp`

                // Wait for the image to be available
                await new Promise<void>((resolve) => {
                    let attempts = 0
                    const checkImage = () => {
                        const img = new window.Image()
                        img.onload = () => resolve()
                        img.onerror = () => {
                            if (attempts < 10) {
                                attempts++
                                setTimeout(checkImage, 1000)
                            } else {
                                resolve()
                            }
                        }
                        img.src = url
                    }
                    checkImage()
                })

                bl.form.setValue('logo', {
                    name: `${filename}.webp`,
                    url,
                    urlRelative: `public/practitioner/${props.practitionerId}/profile/${filename}.webp`,
                    size: 'SQUARE',
                    type: 'IMAGE',
                    title: 'Profile Picture',
                    description: '',
                }, { shouldDirty: true })
            } else {
                toast.error('Failed to upload profile picture. Please try again.')
            }
        } catch (error) {
            console.error('Profile picture upload failed:', error)
            toast.error('Failed to upload profile picture. Please try again.')
        } finally {
            setIsUploading(false)
        }
    }

    const handleCropCancel = () => {
        setShowCropDialog(false)
        setSelectedFile(null)
    }

    if (bl.isLoading || !bl.hasLoaded) {
        return (
            <DialogContent className="w-[600px]" data-testid="edit-practitioner-bio-dialog">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            </DialogContent>
        )
    }

    return (
        <>
            <DialogContent className="w-[600px] max-h-[90vh] overflow-y-auto" data-testid="edit-practitioner-bio-dialog">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update your profile picture, headline, and bio. This is what potential clients see when they visit your profile.
                    </DialogDescription>
                </DialogHeader>
                <Form {...bl.form}>
                    <form className="mt-4 space-y-6" onSubmit={bl.form.handleSubmit(bl.finish)}>
                        {/* Profile Picture */}
                        <FormField
                            control={bl.form.control}
                            name="logo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Profile Picture</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-4">
                                            {field.value?.url ? (
                                                <div className="relative group">
                                                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-200">
                                                        <Image
                                                            src={field.value.url}
                                                            alt="Profile picture"
                                                            width={96}
                                                            height={96}
                                                            className="object-cover w-full h-full"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => field.onChange(null)}
                                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center"
                                                        data-testid="remove-profile-picture-btn"
                                                    >
                                                        <Trash2 className="w-6 h-6 text-white" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center hover:border-purple-400 transition-colors cursor-pointer"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    data-testid="upload-profile-picture-btn"
                                                >
                                                    {isUploading ? (
                                                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                                    ) : (
                                                        <div className="text-center">
                                                            <Camera className="w-8 h-8 mx-auto text-slate-400" />
                                                            <span className="text-xs text-slate-400 mt-1 block">Upload</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.webp"
                                                className="hidden"
                                                onChange={handleFileSelect}
                                                data-testid="profile-picture-file-input"
                                            />
                                            <div className="text-sm text-slate-500">
                                                <p>Recommended: Square image, at least 200x200px</p>
                                                <p>Formats: JPG, PNG, WebP</p>
                                            </div>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={bl.form.control}
                            name="headline"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Professional Headline</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="e.g., Intuitive Tarot Reader & Spiritual Guide"
                                            maxLength={150}
                                            data-testid="headline-input"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        A short, catchy description of what you do ({field.value?.length || 0}/150 characters)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={bl.form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bio</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder="Tell potential clients about yourself, your experience, and your approach to readings..."
                                            className="min-h-[200px] resize-y"
                                            data-testid="bio-input"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Share your story and what makes your practice unique (minimum 50 characters)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <CancelDialogButton />
                            <Button
                                variant={bl.status.button.variant}
                                type="submit"
                                disabled={bl.status.formState !== "idle" || isUploading}
                                data-testid="save-bio-btn"
                            >
                                {isUploading ? "Uploading..." : bl.status.formState === "idle" ? "Save Changes" : bl.status.button.title}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>

            <ProfilePictureCropDialog
                file={selectedFile}
                open={showCropDialog}
                onConfirm={handleCropConfirm}
                onCancel={handleCropCancel}
            />
        </>
    )
}

export default EditPractitionerBio
