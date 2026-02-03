import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FileUploader from "@/components/ux/FileUploader";
import { media_type } from "@/utils/spiriverse";
import UseEditBannerConfig, { BannerConfigFormSchema } from "./_hooks/UseEditBannerConfig";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import useFormStatus from "@/components/utils/UseFormStatus";
import { escape_key } from "@/lib/functions";
import { DialogContent, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BLProps = {
    merchantId: string
}

const useBL = (props: BLProps) => {
    const editBanner = UseEditBannerConfig(props.merchantId)
    const formStatus = useFormStatus();

    return {
        form: editBanner.form,
        formStatus,
        hasLoaded: editBanner.hasLoaded,
        submit: async (values: BannerConfigFormSchema) => {
            await formStatus.submit(
                editBanner.mutation.mutateAsync,
                values,
                escape_key
            )
        }
    }
}

type Props = BLProps

const EditCatalogueBanner : React.FC<Props> = (props) => {
    const bl = useBL(props);
    
    if (!bl.hasLoaded) return <></>;

    const backgroundType = bl.form.watch('bannerConfig.backgroundType');

    return (   
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <h1 className="text-2xl font-bold">Customize Catalogue Banner</h1>
                <DialogDescription>
                    Create a compelling banner at the top of your catalogue that showcases your promise to customers. Customize the background and message to attract visitors.
                </DialogDescription>
            </DialogHeader>
            
            <Form {...bl.form}>
                <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col space-y-6">
                    <Tabs defaultValue="background" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="background">Background</TabsTrigger>
                            <TabsTrigger value="text">Text & Message</TabsTrigger>
                        </TabsList>

                        <TabsContent value="background" className="space-y-4 mt-4">
                            <FormField
                                control={bl.form.control}
                                name="bannerConfig.backgroundType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Background Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select background type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="COLOR">Solid Color</SelectItem>
                                                <SelectItem value="GRADIENT">Gradient</SelectItem>
                                                <SelectItem value="IMAGE">Background Image</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />

                            {backgroundType === 'COLOR' && (
                                <FormField
                                    control={bl.form.control}
                                    name="bannerConfig.backgroundColor"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Background Color</FormLabel>
                                            <FormControl>
                                                <div className="flex items-center space-x-2">
                                                    <Input
                                                        type="color"
                                                        {...field}
                                                        className="w-20 h-10"
                                                    />
                                                    <Input
                                                        type="text"
                                                        {...field}
                                                        placeholder="#6366f1"
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            )}

                            {backgroundType === 'GRADIENT' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={bl.form.control}
                                            name="bannerConfig.gradientStart"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Start Color</FormLabel>
                                                    <FormControl>
                                                        <div className="flex items-center space-x-2">
                                                            <Input
                                                                type="color"
                                                                {...field}
                                                                className="w-16 h-10"
                                                            />
                                                            <Input
                                                                type="text"
                                                                {...field}
                                                                placeholder="#6366f1"
                                                                className="flex-1"
                                                            />
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={bl.form.control}
                                            name="bannerConfig.gradientEnd"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>End Color</FormLabel>
                                                    <FormControl>
                                                        <div className="flex items-center space-x-2">
                                                            <Input
                                                                type="color"
                                                                {...field}
                                                                className="w-16 h-10"
                                                            />
                                                            <Input
                                                                type="text"
                                                                {...field}
                                                                placeholder="#8b5cf6"
                                                                className="flex-1"
                                                            />
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={bl.form.control}
                                        name="bannerConfig.gradientDirection"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Gradient Direction</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select direction" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="TO_RIGHT">Left to Right</SelectItem>
                                                        <SelectItem value="TO_LEFT">Right to Left</SelectItem>
                                                        <SelectItem value="TO_BOTTOM">Top to Bottom</SelectItem>
                                                        <SelectItem value="TO_TOP">Bottom to Top</SelectItem>
                                                        <SelectItem value="TO_BOTTOM_RIGHT">Diagonal ↘</SelectItem>
                                                        <SelectItem value="TO_BOTTOM_LEFT">Diagonal ↙</SelectItem>
                                                        <SelectItem value="TO_TOP_RIGHT">Diagonal ↗</SelectItem>
                                                        <SelectItem value="TO_TOP_LEFT">Diagonal ↖</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            {backgroundType === 'IMAGE' && (
                                <FormField
                                    control={bl.form.control}
                                    name="bannerConfig.backgroundImage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Background Image</FormLabel>
                                            <FormControl>
                                                <FileUploader
                                                    id={props.merchantId}
                                                    className="h-[200px] w-full border border-dashed"
                                                    connection={{
                                                        container: "public",
                                                        relative_path: `merchant/${props.merchantId}/banner-bg`
                                                    }}
                                                    acceptOnly={{
                                                        type: "IMAGE",
                                                        orientation: "LANDSCAPE"
                                                    }}
                                                    targetImage={{
                                                        height: 400,
                                                        width: 1200
                                                    }}
                                                    value={field.value?.url ? [field.value.url] : []}
                                                    targetImageVariants={[]}
                                                    onDropAsync={() => field.onChange(null)}
                                                    onUploadCompleteAsync={(files: media_type[]) => field.onChange(files[0])}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="text" className="space-y-4 mt-4">
                            <FormField
                                control={bl.form.control}
                                name="bannerConfig.promiseText"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Banner Message</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="e.g., Find peace after the unexplained."
                                                className="min-h-[100px]"
                                                maxLength={200}
                                            />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">
                                            Craft a compelling message that captures the transformation you offer. 
                                            {field.value?.length || 0}/200 characters
                                        </p>
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={bl.form.control}
                                    name="bannerConfig.textColor"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Text Color</FormLabel>
                                            <FormControl>
                                                <div className="flex items-center space-x-2">
                                                    <Input
                                                        type="color"
                                                        {...field}
                                                        className="w-16 h-10"
                                                    />
                                                    <Input
                                                        type="text"
                                                        {...field}
                                                        placeholder="#ffffff"
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={bl.form.control}
                                    name="bannerConfig.textSize"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Text Size</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select size" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="SMALL">Small</SelectItem>
                                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                                    <SelectItem value="LARGE">Large</SelectItem>
                                                    <SelectItem value="XLARGE">Extra Large</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={bl.form.control}
                                name="bannerConfig.textAlignment"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Text Alignment</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select alignment" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="LEFT">Left</SelectItem>
                                                <SelectItem value="CENTER">Center</SelectItem>
                                                <SelectItem value="RIGHT">Right</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                        </TabsContent>
                    </Tabs>

                    {/* Preview Section */}
                    <div className="border rounded-lg p-4 bg-slate-50">
                        <h3 className="text-sm font-semibold mb-3">Preview</h3>
                        <BannerPreview config={bl.form.watch('bannerConfig')} />
                    </div>

                    <div className="flex flex-row space-x-3">
                        <CancelDialogButton />
                        <Button 
                            type="submit" 
                            className="flex-1"
                            variant={bl.formStatus.button.variant}
                        >
                            {bl.formStatus.formState === "idle" ? "Save Banner" : bl.formStatus.button.title}
                        </Button>
                    </div>
                </form>
            </Form>
        </DialogContent>
    )
}

// Preview component
const BannerPreview: React.FC<{ config: any }> = ({ config }) => {
    const getBackgroundStyle = () => {
        if (config.backgroundType === 'COLOR') {
            return { backgroundColor: config.backgroundColor || '#6366f1' };
        }
        if (config.backgroundType === 'GRADIENT') {
            const direction = config.gradientDirection?.replace('TO_', '').replace('_', ' ').toLowerCase() || 'bottom';
            return {
                background: `linear-gradient(to ${direction}, ${config.gradientStart || '#6366f1'}, ${config.gradientEnd || '#8b5cf6'})`
            };
        }
        if (config.backgroundType === 'IMAGE' && config.backgroundImage?.url) {
            return {
                backgroundImage: `url(${config.backgroundImage.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            };
        }
        return { backgroundColor: '#6366f1' };
    };

    const getTextSizeClass = () => {
        switch (config.textSize) {
            case 'SMALL': return 'text-lg';
            case 'MEDIUM': return 'text-2xl';
            case 'LARGE': return 'text-3xl';
            case 'XLARGE': return 'text-4xl';
            default: return 'text-3xl';
        }
    };

    const getAlignmentClass = () => {
        switch (config.textAlignment) {
            case 'LEFT': return 'text-left';
            case 'CENTER': return 'text-center';
            case 'RIGHT': return 'text-right';
            default: return 'text-center';
        }
    };

    return (
        <div
            className="w-full h-32 flex items-center justify-center p-6 rounded-md"
            style={getBackgroundStyle()}
        >
            <p
                className={`font-bold ${getTextSizeClass()} ${getAlignmentClass()}`}
                style={{ color: config.textColor || '#ffffff' }}
            >
                {config.promiseText || 'Your promise message will appear here...'}
            </p>
        </div>
    );
};

export default EditCatalogueBanner;
