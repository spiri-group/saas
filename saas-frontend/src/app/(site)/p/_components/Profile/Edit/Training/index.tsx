import useFormStatus from "@/components/utils/UseFormStatus"
import useEditPractitionerTraining, { EditPractitionerTrainingSchema } from "./_hooks/UseEditPractitionerTraining"
import { escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Plus, Trash2, GraduationCap } from "lucide-react"

type Props = {
    practitionerId: string
}

const useBL = ({ practitionerId }: Props) => {
    const status = useFormStatus();
    const { form, mutation, isLoading, hasLoaded, fields, addCredential, removeCredential } = useEditPractitionerTraining(practitionerId)

    return {
        form,
        status,
        isLoading,
        hasLoaded,
        fields,
        addCredential,
        removeCredential,
        finish: async (values: EditPractitionerTrainingSchema) =>
            status.submit(
                mutation.mutateAsync,
                values,
                escape_key
            )
    }
}

const EditPractitionerTraining: React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (bl.isLoading || !bl.hasLoaded) {
        return (
            <DialogContent className="w-[700px]" data-testid="edit-practitioner-training-dialog">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            </DialogContent>
        )
    }

    return (
        <DialogContent className="w-[700px] max-h-[90vh] overflow-y-auto" data-testid="edit-practitioner-training-dialog">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-purple-500" />
                    Training &amp; Credentials
                </DialogTitle>
                <DialogDescription>
                    Add your certifications, training programs, and credentials to build trust with clients.
                </DialogDescription>
            </DialogHeader>
            <Form {...bl.form}>
                <form className="mt-4 space-y-4" onSubmit={bl.form.handleSubmit(bl.finish)}>
                    {bl.fields.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-lg">
                            <GraduationCap className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                            <p className="text-slate-400 mb-4">
                                No credentials added yet. Add your training and certifications.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={bl.addCredential}
                                data-testid="add-first-credential-btn"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Your First Credential
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bl.fields.map((field, index) => (
                                <CredentialCard
                                    key={field.id}
                                    index={index}
                                    form={bl.form}
                                    onRemove={() => bl.removeCredential(index)}
                                />
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={bl.addCredential}
                                className="w-full"
                                data-testid="add-another-credential-btn"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Another Credential
                            </Button>
                        </div>
                    )}

                    <DialogFooter className="pt-4">
                        <CancelDialogButton />
                        <Button
                            variant={bl.status.button.variant}
                            type="submit"
                            disabled={bl.status.formState !== "idle"}
                            data-testid="save-training-btn"
                        >
                            {bl.status.formState === "idle" ? "Save Credentials" : bl.status.button.title}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

interface CredentialCardProps {
    index: number
    form: ReturnType<typeof useEditPractitionerTraining>['form']
    onRemove: () => void
}

const CredentialCard: React.FC<CredentialCardProps> = ({ index, form, onRemove }) => {
    return (
        <Card dark data-testid={`credential-card-${index}`}>
            <CardContent className="p-3">
                <div className="flex gap-3 items-start">
                    <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_90px] gap-2">
                            <FormField
                                control={form.control}
                                name={`training.${index}.title`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel dark className="text-xs">Title *</FormLabel>
                                        <FormControl>
                                            <Input
                                                dark
                                                {...field}
                                                placeholder="e.g., Reiki Master Certification"
                                                data-testid={`credential-title-${index}`}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name={`training.${index}.institution`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel dark className="text-xs">Institution</FormLabel>
                                        <FormControl>
                                            <Input
                                                dark
                                                {...field}
                                                value={field.value || ""}
                                                placeholder="e.g., International Reiki Association"
                                                data-testid={`credential-institution-${index}`}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name={`training.${index}.year`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel dark className="text-xs">Year</FormLabel>
                                        <FormControl>
                                            <Input
                                                dark
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={4}
                                                {...field}
                                                value={field.value || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                    field.onChange(val ? parseInt(val) : null);
                                                }}
                                                placeholder="2020"
                                                data-testid={`credential-year-${index}`}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name={`training.${index}.description`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            dark
                                            {...field}
                                            value={field.value || ""}
                                            placeholder="Brief description (optional)"
                                            data-testid={`credential-description-${index}`}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Remove Button */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onRemove}
                        className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-900/20 mt-5"
                        data-testid={`remove-credential-${index}`}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export default EditPractitionerTraining
