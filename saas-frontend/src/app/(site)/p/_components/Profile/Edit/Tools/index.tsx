import useFormStatus from "@/components/utils/UseFormStatus"
import useEditPractitionerTools, { EditPractitionerToolsSchema } from "./_hooks/UseEditPractitionerTools"
import { escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Plus, Trash2, Wand2, ImageIcon } from "lucide-react"
import FileUploader from "@/components/ux/FileUploader"
import { media_type } from "@/utils/spiriverse"
import Image from "next/image"

type Props = {
    practitionerId: string
}

const useBL = ({ practitionerId }: Props) => {
    const status = useFormStatus();
    const { form, mutation, isLoading, hasLoaded, fields, addTool, removeTool } = useEditPractitionerTools(practitionerId)

    return {
        form,
        status,
        isLoading,
        hasLoaded,
        fields,
        addTool,
        removeTool,
        practitionerId,
        finish: async (values: EditPractitionerToolsSchema) =>
            status.submit(
                mutation.mutateAsync,
                values,
                escape_key
            )
    }
}

const EditPractitionerTools: React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (bl.isLoading || !bl.hasLoaded) {
        return (
            <DialogContent className="w-[700px]" data-testid="edit-practitioner-tools-dialog">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            </DialogContent>
        )
    }

    return (
        <DialogContent className="w-[700px] max-h-[90vh] overflow-y-auto" data-testid="edit-practitioner-tools-dialog">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-purple-500" />
                    Tools Collection
                </DialogTitle>
                <DialogDescription>
                    Showcase the tools you use in your practice - tarot decks, crystals, pendulums, and more.
                </DialogDescription>
            </DialogHeader>
            <Form {...bl.form}>
                <form className="mt-4 space-y-4" onSubmit={bl.form.handleSubmit(bl.finish)}>
                    {bl.fields.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                            <Wand2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-slate-500 dark:text-slate-400 mb-4">
                                No tools added yet. Add your first tool to showcase your practice.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={bl.addTool}
                                data-testid="add-first-tool-btn"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Your First Tool
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bl.fields.map((field, index) => (
                                <ToolCard
                                    key={field.id}
                                    index={index}
                                    form={bl.form}
                                    practitionerId={bl.practitionerId}
                                    onRemove={() => bl.removeTool(index)}
                                />
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={bl.addTool}
                                className="w-full"
                                data-testid="add-another-tool-btn"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Another Tool
                            </Button>
                        </div>
                    )}

                    <DialogFooter className="pt-4">
                        <CancelDialogButton />
                        <Button
                            variant={bl.status.button.variant}
                            type="submit"
                            disabled={bl.status.formState !== "idle"}
                            data-testid="save-tools-btn"
                        >
                            {bl.status.formState === "idle" ? "Save Tools" : bl.status.button.title}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

interface ToolCardProps {
    index: number
    form: ReturnType<typeof useEditPractitionerTools>['form']
    practitionerId: string
    onRemove: () => void
}

const ToolCard: React.FC<ToolCardProps> = ({ index, form, practitionerId, onRemove }) => {
    const toolId = form.watch(`tools.${index}.id`);
    const currentImage = form.watch(`tools.${index}.image`);

    const handleImageUpload = (files: media_type[]) => {
        if (files.length > 0) {
            form.setValue(`tools.${index}.image`, files[0], { shouldDirty: true });
        }
    };

    const handleImageRemove = () => {
        form.setValue(`tools.${index}.image`, null, { shouldDirty: true });
    };

    return (
        <Card className="bg-slate-50 dark:bg-slate-800/50" data-testid={`tool-card-${index}`}>
            <CardContent className="p-4">
                <div className="flex gap-4">
                    {/* Image Upload Section */}
                    <div className="w-24 h-24 flex-shrink-0">
                        {currentImage?.url ? (
                            <div className="relative w-full h-full group">
                                <Image
                                    src={currentImage.url}
                                    alt="Tool image"
                                    fill
                                    className="object-cover rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={handleImageRemove}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
                                >
                                    <Trash2 className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        ) : (
                            <FileUploader
                                id={`tool-image-${index}`}
                                connection={{
                                    container: 'public',
                                    relative_path: `practitioner/${practitionerId}/tools/${toolId}`
                                }}
                                acceptOnly={{ type: 'IMAGE' }}
                                allowMultiple={false}
                                onDropAsync={() => {}}
                                onUploadCompleteAsync={handleImageUpload}
                                className="w-full h-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center hover:border-purple-400 transition-colors cursor-pointer"
                            >
                                <div className="text-center p-2">
                                    <ImageIcon className="w-6 h-6 mx-auto text-slate-400" />
                                    <span className="text-xs text-slate-400 mt-1">Add Image</span>
                                </div>
                            </FileUploader>
                        )}
                    </div>

                    {/* Form Fields */}
                    <div className="flex-1 space-y-3">
                        <FormField
                            control={form.control}
                            name={`tools.${index}.name`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm">Tool Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="e.g., Rider-Waite Tarot Deck"
                                            data-testid={`tool-name-${index}`}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name={`tools.${index}.description`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm">Description (optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            value={field.value || ""}
                                            placeholder="Brief description of this tool..."
                                            className="resize-none h-16"
                                            data-testid={`tool-description-${index}`}
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
                        className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        data-testid={`remove-tool-${index}`}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export default EditPractitionerTools
