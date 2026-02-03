import useFormStatus from "@/components/utils/UseFormStatus"
import useEditPractitionerModalities, { EditPractitionerModalitiesSchema } from "./_hooks/UseEditPractitionerModalities"
import { escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { MODALITIES, SPECIALIZATIONS } from "../../../../_constants/practitionerOptions"

type Props = {
    practitionerId: string
}

const useBL = ({ practitionerId }: Props) => {
    const status = useFormStatus();
    const { form, mutation, isLoading, hasLoaded, toggleArrayValue } = useEditPractitionerModalities(practitionerId)

    return {
        form,
        status,
        isLoading,
        hasLoaded,
        toggleArrayValue,
        finish: async (values: EditPractitionerModalitiesSchema) =>
            status.submit(
                mutation.mutateAsync,
                values,
                escape_key
            )
    }
}

const EditPractitionerModalities: React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (bl.isLoading || !bl.hasLoaded) {
        return (
            <DialogContent className="w-[600px]" data-testid="edit-practitioner-modalities-dialog">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            </DialogContent>
        )
    }

    return (
        <DialogContent className="w-[600px] max-h-[90vh] overflow-y-auto" data-testid="edit-practitioner-modalities-dialog">
            <DialogHeader>
                <DialogTitle>Edit Modalities &amp; Specializations</DialogTitle>
                <DialogDescription>
                    Update the types of services you offer and your areas of focus.
                </DialogDescription>
            </DialogHeader>
            <Form {...bl.form}>
                <form className="mt-4 space-y-6" onSubmit={bl.form.handleSubmit(bl.finish)}>
                    <FormField
                        control={bl.form.control}
                        name="modalities"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Modalities</FormLabel>
                                <FormDescription>Select the types of readings and services you offer</FormDescription>
                                <div className="flex flex-wrap gap-2 mt-2" data-testid="modalities-select">
                                    {MODALITIES.map((modality) => (
                                        <Badge
                                            key={modality.value}
                                            variant={field.value.includes(modality.value) ? 'default' : 'outline'}
                                            className={cn(
                                                'cursor-pointer transition-all',
                                                field.value.includes(modality.value)
                                                    ? 'bg-purple-600 hover:bg-purple-700'
                                                    : 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
                                            )}
                                            onClick={() => bl.toggleArrayValue('modalities', modality.value)}
                                            data-testid={`modality-${modality.value}`}
                                        >
                                            {modality.label}
                                        </Badge>
                                    ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={bl.form.control}
                        name="specializations"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Specializations</FormLabel>
                                <FormDescription>What areas do you focus on?</FormDescription>
                                <div className="flex flex-wrap gap-2 mt-2" data-testid="specializations-select">
                                    {SPECIALIZATIONS.map((spec) => (
                                        <Badge
                                            key={spec.value}
                                            variant={field.value.includes(spec.value) ? 'default' : 'outline'}
                                            className={cn(
                                                'cursor-pointer transition-all',
                                                field.value.includes(spec.value)
                                                    ? 'bg-violet-600 hover:bg-violet-700'
                                                    : 'hover:bg-violet-100 dark:hover:bg-violet-900/30'
                                            )}
                                            onClick={() => bl.toggleArrayValue('specializations', spec.value)}
                                            data-testid={`specialization-${spec.value}`}
                                        >
                                            {spec.label}
                                        </Badge>
                                    ))}
                                </div>
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
                            data-testid="save-modalities-btn"
                        >
                            {bl.status.formState === "idle" ? "Save Changes" : bl.status.button.title}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

export default EditPractitionerModalities
