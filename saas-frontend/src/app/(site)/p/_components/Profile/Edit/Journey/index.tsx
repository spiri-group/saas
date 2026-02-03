import useFormStatus from "@/components/utils/UseFormStatus"
import useEditPractitionerJourney, { EditPractitionerJourneySchema } from "./_hooks/UseEditPractitionerJourney"
import { escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { Button } from "@/components/ui/button"
import { Loader2, Compass } from "lucide-react"

type Props = {
    practitionerId: string
}

const useBL = ({ practitionerId }: Props) => {
    const status = useFormStatus();
    const { form, mutation, isLoading, hasLoaded } = useEditPractitionerJourney(practitionerId)

    return {
        form,
        status,
        isLoading,
        hasLoaded,
        finish: async (values: EditPractitionerJourneySchema) =>
            status.submit(
                mutation.mutateAsync,
                values,
                escape_key
            )
    }
}

const EditPractitionerJourney: React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (bl.isLoading || !bl.hasLoaded) {
        return (
            <DialogContent className="w-[600px]" data-testid="edit-practitioner-journey-dialog">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            </DialogContent>
        )
    }

    return (
        <DialogContent className="w-[600px] max-h-[90vh] overflow-y-auto" data-testid="edit-practitioner-journey-dialog">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-purple-500" />
                    Spiritual Journey &amp; Approach
                </DialogTitle>
                <DialogDescription>
                    Share your story and how you work with clients.
                </DialogDescription>
            </DialogHeader>
            <Form {...bl.form}>
                <form className="mt-4 space-y-6" onSubmit={bl.form.handleSubmit(bl.finish)}>
                    <FormField
                        control={bl.form.control}
                        name="spiritualJourney"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Your Spiritual Journey</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Share how you discovered your gifts, what drew you to this path, and the experiences that shaped your practice..."
                                        className="min-h-[150px] resize-y"
                                        maxLength={2000}
                                        data-testid="spiritual-journey-input"
                                    />
                                </FormControl>
                                <FormDescription>
                                    Help clients understand your background and what led you here ({field.value?.length || 0}/2000 characters)
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={bl.form.control}
                        name="approach"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Your Approach</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Describe your reading style, methodology, and what clients can expect during a session with you..."
                                        className="min-h-[120px] resize-y"
                                        maxLength={1000}
                                        data-testid="approach-input"
                                    />
                                </FormControl>
                                <FormDescription>
                                    Explain your unique approach and what makes your practice special ({field.value?.length || 0}/1000 characters)
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
                            data-testid="save-journey-btn"
                        >
                            {bl.status.formState === "idle" ? "Save Changes" : bl.status.button.title}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

export default EditPractitionerJourney
