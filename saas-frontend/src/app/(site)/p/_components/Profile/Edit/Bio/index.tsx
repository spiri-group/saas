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
import FileUploader from "@/components/ux/FileUploader"
import { media_type } from "@/utils/spiriverse"
import Image from "next/image"

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
                                            <FileUploader
                                                id="profile-picture"
                                                connection={{
                                                    container: 'public',
                                                    relative_path: `practitioner/${props.practitionerId}/profile`
                                                }}
                                                acceptOnly={{ type: 'IMAGE' }}
                                                allowMultiple={false}
                                                onDropAsync={() => {}}
                                                onUploadCompleteAsync={(files: media_type[]) => {
                                                    if (files.length > 0) {
                                                        field.onChange(files[0])
                                                    }
                                                }}
                                                className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center hover:border-purple-400 transition-colors cursor-pointer"
                                            >
                                                <div className="text-center">
                                                    <Camera className="w-8 h-8 mx-auto text-slate-400" />
                                                    <span className="text-xs text-slate-400 mt-1 block">Upload</span>
                                                </div>
                                            </FileUploader>
                                        )}
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
                            disabled={bl.status.formState !== "idle"}
                            data-testid="save-bio-btn"
                        >
                            {bl.status.formState === "idle" ? "Save Changes" : bl.status.button.title}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

export default EditPractitionerBio
