import FileUploader from "@/components/ux/FileUploader"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import UseEditVendorBranding, { UpdateVendorFormSchema } from "./_hooks/UseEditVendorBranding"
import ComboBox from "@/components/ux/ComboBox"
import ColorPickerDropDown from "@/components/ux/ColorPickerDropDown"
import BackgroundPicker from "@/components/ux/BackgroundPicker"
import { Button } from "@/components/ui/button"
import useFormStatus from "@/components/utils/UseFormStatus"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CircleHelpIcon, SettingsIcon, ZapIcon, MoreHorizontalIcon } from "lucide-react"
import { BASE_THEMES, getBaseThemeById, getThemeSchemeById } from "./constants/themePacks"
import { Switch } from "@/components/ui/switch"


//this should require from our tailwind config
const available_font_keys = ["clean", "written", "gothic", "robot"]

type BLProps = {
    merchantId: string
}

const useBL = (props: BLProps) => {
    
    const editVendor = UseEditVendorBranding(props.merchantId)
    const formStatus = useFormStatus();

    const applyMasterFont = (fontFamily: string) => {
        // Set all font families to the selected master font
        editVendor.form.setValue('font.brand.family', fontFamily);
        editVendor.form.setValue('font.headings.family', fontFamily);
        editVendor.form.setValue('font.accent.family', fontFamily);
        editVendor.form.setValue('font.default.family', fontFamily);
        editVendor.form.setValue('panels.primary.family', fontFamily);
        editVendor.form.setValue('panels.accent.family', fontFamily);
    };

    const applyTheme = (themeId: string, scheme: 'light' | 'dark') => {
        const theme = getBaseThemeById(themeId);
        const schemeData = getThemeSchemeById(scheme);
        if (!theme || !schemeData) return;

        editVendor.form.setValue('selectedTheme', themeId);
        editVendor.form.setValue('selectedScheme', scheme);
        
        // Apply theme values based on new system
        editVendor.form.setValue('colors.primary', {
            background: theme.colors.primary,
            foreground: scheme === 'dark' ? '#ffffff' : '#000000'
        });
        editVendor.form.setValue('colors.links', theme.colors.links);
        editVendor.form.setValue('background.color', schemeData.background);
        
        // Set font colors based on scheme
        editVendor.form.setValue('font.brand', {
            family: editVendor.form.getValues('font.brand.family') || "clean", 
            color: schemeData.foreground
        });
        editVendor.form.setValue('font.headings', {
            family: editVendor.form.getValues('font.headings.family') || "clean", 
            color: schemeData.foreground
        });
        editVendor.form.setValue('font.default', {
            family: editVendor.form.getValues('font.default.family') || "clean", 
            color: schemeData.foreground
        });
        editVendor.form.setValue('font.accent', {
            family: editVendor.form.getValues('font.accent.family') || "clean", 
            color: schemeData.foreground
        });
        
        // Set panel defaults
        editVendor.form.setValue('panels.primary', {
            family: editVendor.form.getValues('panels.primary.family') || "clean", 
            color: schemeData.foreground
        });
        editVendor.form.setValue('panels.accent', {
            family: editVendor.form.getValues('panels.accent.family') || "clean", 
            color: schemeData.foreground
        });
        editVendor.form.setValue('panels.background', {
            color: schemeData.background,
            transparency: 0.9
        });
        
        // In easy mode, always remove background image to keep it simple
        if (editVendor.form.getValues('mode') === 'easy') {
            editVendor.form.setValue('background.image', null);
        }
    };

    const switchMode = (mode: 'easy' | 'advanced') => {
        editVendor.form.setValue('mode', mode);
        
        if (mode === 'easy') {
            // Apply current theme when switching to easy mode
            const currentTheme = editVendor.form.getValues('selectedTheme') || 'midnight';
            const currentScheme = editVendor.form.getValues('selectedScheme') || 'light';
            applyTheme(currentTheme, currentScheme);
        }
    };

    return {
        form: editVendor.form,
        formStatus: formStatus,
        values: editVendor.form.getValues(),
        hasLoaded: editVendor.hasLoaded,
        applyTheme,
        applyMasterFont,
        switchMode,
        submit: async (values: UpdateVendorFormSchema) => {
            await formStatus.submit(
                editVendor.mutation.mutateAsync,
                values,
                () => {
                    // we just want it to reset the form but with the new values
                    editVendor.form.reset(values)
                    // we also want to reset the form status
                    formStatus.reset()
                }
            )
        }
    }
}

type Props = BLProps & {
    close: () => void
}

const MerchantBrandingComponent : React.FC<Props> = (props) => {
    const bl = useBL(props)

    const transparency_options = [
        {
            value: 0,
            label: "None"
        },
        {
            value: 2.0,
            label: "Light"
        },
        {
            value: 5.0,
            label: "Medium"
        },
        {
            value: 7.5,
            label: "High"
        },
        {
            value: 9.0,
            label: "Highest"
        },
        {
            value: 10.0,
            label: "Full"
        }
    ]

    const isEasyMode = bl.values.mode === 'easy';
    const currentTheme = bl.values.selectedTheme || 'midnight';
    const currentScheme = bl.values.selectedScheme || 'light';

    return (
        <TooltipProvider>
        <div className="fixed left-0 rounded-r-xl p-3 mt-2 w-[200px] bg-white min-h-full">
            <h2 className="mb-3 text-sm">Your branding</h2>
            { bl.hasLoaded && 
                <Form {...bl.form}>
                    <form onSubmit={bl.form.handleSubmit(bl.submit)}>
                    {/* Mode Toggle */}
                    <div className="flex flex-col mb-4 p-2 bg-gray-50 rounded-lg">
                        <FormField
                            name="mode"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between space-y-0">
                                    <div className="flex items-center space-x-2">
                                        {isEasyMode ? <ZapIcon className="h-4 w-4" /> : <SettingsIcon className="h-4 w-4" />}
                                        <FormLabel className="text-xs font-bold">
                                            {isEasyMode ? 'Easy Mode' : 'Advanced'}
                                        </FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value === 'advanced'}
                                            onCheckedChange={(checked) => {
                                                bl.switchMode(checked ? 'advanced' : 'easy');
                                            }}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    {isEasyMode ? (
                        <div className="flex flex-col space-y-4">
                            {/* Scheme Selection */}
                            <FormField
                                name="selectedScheme"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-bold">UI Scheme</FormLabel>
                                        <FormControl>
                                            <div className="flex space-x-2">
                                                <Button
                                                    type="button"
                                                    variant={field.value === 'light' ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        field.onChange('light');
                                                        bl.applyTheme(currentTheme, 'light');
                                                    }}
                                                >
                                                    Light
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={field.value === 'dark' ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        field.onChange('dark');
                                                        bl.applyTheme(currentTheme, 'dark');
                                                    }}
                                                >
                                                    Dark
                                                </Button>
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Theme Selection */}
                            <FormField
                                name="selectedTheme"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-bold">Theme</FormLabel>
                                        <FormControl>
                                            <ComboBox
                                                value={BASE_THEMES.find(theme => theme.id === field.value)}
                                                items={BASE_THEMES}
                                                fieldMapping={{
                                                    keyColumn: "id",
                                                    labelColumn: "name"
                                                }}
                                                objectName="theme"
                                                onChange={(selected) => {
                                                    if (selected) {
                                                        bl.applyTheme(selected.id, currentScheme);
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Master Font Selection */}
                            <FormItem>
                                <FormLabel className="text-sm font-bold">Font Style</FormLabel>
                                <FormControl>
                                    <ComboBox
                                        value={bl.values.font?.brand?.family || "clean"}
                                        items={available_font_keys}
                                        objectName="font"
                                        onChange={(selected) => {
                                            if (selected) {
                                                bl.applyMasterFont(selected);
                                            }
                                        }}
                                    />
                                </FormControl>
                                
                                {/* More Options Popover - Padded as extension of Font Style */}
                                <div className="ml-4 mt-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="link" size="sm" className="text-left justify-start px-0 text-xs">
                                                <MoreHorizontalIcon className="h-3 w-3 mr-1" />
                                                More options
                                            </Button>
                                        </PopoverTrigger>
                                <PopoverContent className="w-80" align="start">
                                    <div className="flex flex-col space-y-4">
                                        {/* Individual Font Customization */}
                                        <div className="flex flex-col space-y-3">
                                            <FormLabel className="text-sm font-bold">Individual Fonts</FormLabel>
                                            
                                            {/* Brand Font */}
                                            <div className="flex flex-col space-y-2">
                                                <FormLabel className="text-xs">Merchant Name</FormLabel>
                                                <div className="flex flex-row space-x-2">
                                                    <FormField
                                                        name={`font.brand.color`}
                                                        control={bl.form.control}
                                                        render={({ field }) => (
                                                            <ColorPickerDropDown 
                                                                className="h-8 w-8"
                                                                placeholder={"Color"}
                                                                {...field} />
                                                        )} />
                                                    <FormField
                                                        name={`font.brand.family`}
                                                        control={bl.form.control}
                                                        render={({ field }) => (
                                                            <ComboBox
                                                                {...field}
                                                                items={available_font_keys}
                                                            />
                                                        )} />
                                                </div>
                                            </div>

                                            {/* Heading Font */}
                                            <div className="flex flex-col space-y-2">
                                                <FormLabel className="text-xs">Headings</FormLabel>
                                                <div className="flex flex-row space-x-2">
                                                    <FormField
                                                        name={`font.headings.color`}
                                                        control={bl.form.control}
                                                        render={({ field }) => (
                                                            <ColorPickerDropDown 
                                                                className="h-8 w-8"
                                                                placeholder={"Color"}
                                                                {...field} />
                                                        )} />
                                                    <FormField
                                                        name={`font.headings.family`}
                                                        control={bl.form.control}
                                                        render={({ field }) => (
                                                            <ComboBox
                                                                {...field}
                                                                items={available_font_keys}
                                                            />
                                                        )} />
                                                </div>
                                            </div>

                                            {/* Accent Font */}
                                            <div className="flex flex-col space-y-2">
                                                <FormLabel className="text-xs">Accent Text</FormLabel>
                                                <div className="flex flex-row space-x-2">
                                                    <FormField
                                                        name={`font.accent.color`}
                                                        control={bl.form.control}
                                                        render={({ field }) => (
                                                            <ColorPickerDropDown 
                                                                className="h-8 w-8"
                                                                placeholder={"Color"}
                                                                {...field} />
                                                        )} />
                                                    <FormField
                                                        name={`font.accent.family`}
                                                        control={bl.form.control}
                                                        render={({ field }) => (
                                                            <ComboBox
                                                                {...field}
                                                                items={available_font_keys}
                                                            />
                                                        )} />
                                                </div>
                                            </div>

                                            {/* Default Font */}
                                            <div className="flex flex-col space-y-2">
                                                <FormLabel className="text-xs">Body Text</FormLabel>
                                                <div className="flex flex-row space-x-2">
                                                    <FormField
                                                        name={`font.default.color`}
                                                        control={bl.form.control}
                                                        render={({ field }) => (
                                                            <ColorPickerDropDown 
                                                                className="h-8 w-8"
                                                                placeholder={"Color"}
                                                                {...field} />
                                                        )} />
                                                    <FormField
                                                        name={`font.default.family`}
                                                        control={bl.form.control}
                                                        render={({ field }) => (
                                                            <ComboBox
                                                                {...field}
                                                                items={available_font_keys}
                                                            />
                                                        )} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                                    </Popover>
                                </div>
                            </FormItem>

                            {/* Social Icon Style */}
                            <FormField
                                name="social.style"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-bold">Social Icon Style</FormLabel>
                                        <FormControl>
                                            <ComboBox
                                                value={field.value || 'solid'}
                                                items={['solid', 'outline']}
                                                objectName="style"
                                                onChange={(selected) => {
                                                    if (selected) {
                                                        field.onChange(selected);
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Logo Upload (available in both modes) */}
                            <FormField
                                control={bl.form.control}
                                name="logo"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3">
                                    <FormLabel className="font-bold text-sm">Logo</FormLabel>
                                    <FormControl>
                                        <FileUploader
                                            id={`${props.merchantId}-logo`}
                                            objectFit="cover"
                                            className="flex-grow h-[35px]"
                                            value={field.value ? [field.value.url] : []}
                                            acceptOnly={{
                                                type: "IMAGE"
                                            }}
                                            connection={{
                                                container: "public",
                                                relative_path: `merchant/${props.merchantId}/logo`
                                            }}
                                            targetImage={{
                                                width: 400,
                                                height: (2 / 3) * 400
                                            }}
                                            targetImageVariants={[]}
                                            allowMultiple={false}
                                            includePreview={false}
                                            onRemoveAsync={() => {
                                                field.onChange(null)
                                            }}  
                                            buttonProps={{
                                                variant: "link"
                                            }}
                                            onDropAsync={() => {}}
                                            onUploadCompleteAsync={async (files) => {
                                                field.onChange({
                                                    ...files[0],
                                                    title: "Logo Image",
                                                    description: "A logo image",
                                                    hashtags: []
                                                })
                                            }}
                                            />
                                    </FormControl>
                                </FormItem>        
                                )}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col space-y-4">
                            {/* Master Font Selection */}
                            <FormItem>
                                <FormLabel className="text-sm font-bold">Font Style</FormLabel>
                                <FormControl>
                                    <ComboBox
                                        value={bl.values.font?.brand?.family || "clean"}
                                        items={available_font_keys}
                                        objectName="font"
                                        onChange={(selected) => {
                                            if (selected) {
                                                bl.applyMasterFont(selected);
                                            }
                                        }}
                                    />
                                </FormControl>
                                
                                {/* More Options Popover - Only Font Options */}
                                <div className="ml-4 mt-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="link" size="sm" className="text-left justify-start px-0 text-xs">
                                                <MoreHorizontalIcon className="h-3 w-3 mr-1" />
                                                More font options
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80" align="start">
                                            <div className="flex flex-col space-y-4">
                                                {/* Individual Font Controls */}
                                                <div className="flex flex-col space-y-3">
                                                    <FormLabel className="text-sm font-bold">Individual Fonts</FormLabel>
                                                    
                                                    {/* Brand Font */}
                                                    <div className="flex flex-col space-y-2">
                                                        <FormLabel className="text-xs">Merchant Name</FormLabel>
                                                        <div className="flex flex-row space-x-2">
                                                            <FormField
                                                                name={`font.brand.color`}
                                                                control={bl.form.control}
                                                                render={({ field }) => (
                                                                    <ColorPickerDropDown 
                                                                        className="h-8 w-8"
                                                                        placeholder={"Color"}
                                                                        {...field} />
                                                                )} />
                                                            <FormField
                                                                name={`font.brand.family`}
                                                                control={bl.form.control}
                                                                render={({ field }) => (
                                                                    <ComboBox
                                                                        {...field}
                                                                        items={available_font_keys}
                                                                    />
                                                                )} />
                                                        </div>
                                                    </div>

                                                    {/* Heading Font */}
                                                    <div className="flex flex-col space-y-2">
                                                        <FormLabel className="text-xs">Headings</FormLabel>
                                                        <div className="flex flex-row space-x-2">
                                                            <FormField
                                                                name={`font.headings.color`}
                                                                control={bl.form.control}
                                                                render={({ field }) => (
                                                                    <ColorPickerDropDown 
                                                                        className="h-8 w-8"
                                                                        placeholder={"Color"}
                                                                        {...field} />
                                                                )} />
                                                            <FormField
                                                                name={`font.headings.family`}
                                                                control={bl.form.control}
                                                                render={({ field }) => (
                                                                    <ComboBox
                                                                        {...field}
                                                                        items={available_font_keys}
                                                                    />
                                                                )} />
                                                        </div>
                                                    </div>

                                                    {/* Accent Font */}
                                                    <div className="flex flex-col space-y-2">
                                                        <FormLabel className="text-xs">Accent Text</FormLabel>
                                                        <div className="flex flex-row space-x-2">
                                                            <FormField
                                                                name={`font.accent.color`}
                                                                control={bl.form.control}
                                                                render={({ field }) => (
                                                                    <ColorPickerDropDown 
                                                                        className="h-8 w-8"
                                                                        placeholder={"Color"}
                                                                        {...field} />
                                                                )} />
                                                            <FormField
                                                                name={`font.accent.family`}
                                                                control={bl.form.control}
                                                                render={({ field }) => (
                                                                    <ComboBox
                                                                        {...field}
                                                                        items={available_font_keys}
                                                                    />
                                                                )} />
                                                        </div>
                                                    </div>

                                                    {/* Default Font */}
                                                    <div className="flex flex-col space-y-2">
                                                        <FormLabel className="text-xs">Body Text</FormLabel>
                                                        <div className="flex flex-row space-x-2">
                                                            <FormField
                                                                name={`font.default.color`}
                                                                control={bl.form.control}
                                                                render={({ field }) => (
                                                                    <ColorPickerDropDown 
                                                                        className="h-8 w-8"
                                                                        placeholder={"Color"}
                                                                        {...field} />
                                                                )} />
                                                            <FormField
                                                                name={`font.default.family`}
                                                                control={bl.form.control}
                                                                render={({ field }) => (
                                                                    <ComboBox
                                                                        {...field}
                                                                        items={available_font_keys}
                                                                    />
                                                                )} />
                                                        </div>
                                                    </div>

                                                    {/* Panel Font Controls */}
                                                    <div className="flex flex-col space-y-2">
                                                        <FormLabel className="text-xs">Panel Primary Font</FormLabel>
                                                        <div className="flex flex-row space-x-2">
                                                            <FormField
                                                                name={`panels.primary.color`}
                                                                control={bl.form.control}
                                                                render={({ field }) => (
                                                                    <ColorPickerDropDown 
                                                                        className="h-8 w-8"
                                                                        placeholder={"Color"}
                                                                        {...field} />
                                                                )} />
                                                            <FormField
                                                                name={`panels.primary.family`}
                                                                control={bl.form.control}
                                                                render={({ field }) => (
                                                                    <ComboBox
                                                                        {...field}
                                                                        items={available_font_keys}
                                                                    />
                                                                )} />
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col space-y-2">
                                                        <FormLabel className="text-xs">Panel Accent Font</FormLabel>
                                                        <div className="flex flex-row space-x-2">
                                                            <FormField
                                                                name={`panels.accent.color`}
                                                                control={bl.form.control}
                                                                render={({ field }) => (
                                                                    <ColorPickerDropDown 
                                                                        className="h-8 w-8"
                                                                        placeholder={"Color"}
                                                                        {...field} />
                                                                )} />
                                                            <FormField
                                                                name={`panels.accent.family`}
                                                                control={bl.form.control}
                                                                render={({ field }) => (
                                                                    <ComboBox
                                                                        {...field}
                                                                        items={available_font_keys}
                                                                    />
                                                                )} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </FormItem>

                            {/* Advanced Mode Main Options */}
                            <div className="flex flex-col space-y-4">
                                {/* Background Section */}
                                <div className="flex flex-col mt-3">
                                    <span className="text-sm font-bold mb-1">Main background</span>
                                    <div className="flex flex-col p-2">
                                        <FormField
                                            name={`background`}
                                            control={bl.form.control}
                                            render={({ field }) => (
                                                <BackgroundPicker 
                                                    {...field}
                                                    id={`${props.merchantId}-background`}
                                                    connection={{
                                                        container: "public",
                                                        relative_path: `merchant/${props.merchantId}/background`
                                                    }}
                                                    />
                                            )} />
                                        <FormField
                                            name={`panels.background.transparency`}
                                            control={bl.form.control}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row space-x-2 items-center">
                                                    <FormLabel className="text-xs">Overlay</FormLabel>
                                                    <FormControl>
                                                        <ComboBox
                                                            value={field.value != undefined ? transparency_options.filter(x => x.value === (field.value * 10))[0] : undefined}
                                                            items={transparency_options}
                                                            fieldMapping={{
                                                                keyColumn: "value",
                                                                labelColumn: "label"
                                                            }}
                                                            objectName="transparency"
                                                            onChange={(selected) => {
                                                                if (selected == undefined) return;
                                                                const transparency = (selected.value / 10)
                                                                field.onChange(transparency)
                                                            }} 
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                    </div>
                                </div>

                                {/* Primary Colors Section */}
                                <div className="flex flex-col mt-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex flex-row space-x-1 mb-2 items-center">
                                                <CircleHelpIcon className="h-4 w-4" />
                                                <label className="text-sm font-bold">Buttons, icons ...</label>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Set your primary colour that will be used for buttons, links, icons and other interactive elements.
                                        </TooltipContent>
                                    </Tooltip>
                                    <div className="flex flex-col px-2">
                                        <FormField
                                            name={`colors.primary.background`}
                                            control={bl.form.control}
                                            render={({ field }) => (
                                                <div className="flex flex-row space-x-3 items-center">
                                                    <ColorPickerDropDown 
                                                        className="h-8 w-8"
                                                        placeholder={""}
                                                        {...field} />
                                                    <FormLabel>Primary</FormLabel>
                                                </div>
                                            )} />
                                        <FormField
                                            name={`colors.primary.foreground`}
                                            control={bl.form.control}
                                            render={({ field }) => (
                                                <div className="flex flex-row space-x-3 mt-3 items-center">
                                                    <ColorPickerDropDown 
                                                        className="h-8 w-8"
                                                        placeholder={""}
                                                        {...field} />
                                                    <FormLabel>Text</FormLabel>
                                                </div>
                                            )} />
                                        <FormField
                                            name={`colors.links`}
                                            control={bl.form.control}
                                            render={({ field }) => (
                                                <div className="flex flex-row space-x-3 mt-3 items-center">
                                                    <ColorPickerDropDown 
                                                        className="h-8 w-8"
                                                        placeholder={""}
                                                        {...field} />
                                                    <FormLabel>Links</FormLabel>
                                                </div>
                                            )} />
                                    </div>
                                </div>

                                {/* Panels Section */}
                                <div className="flex flex-col mt-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex flex-row space-x-1 items-center">
                                                <CircleHelpIcon className="h-4 w-4" />
                                                <label className="text-sm font-bold">Panels</label>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Style the rectangles (Panels) that contain your content e.g. Catalogue, Contact Information.
                                        </TooltipContent>
                                    </Tooltip>
                                    <div className="flex flex-col space-y-2 p-2">
                                        <FormField
                                            name={`panels.background.color`}
                                            control={bl.form.control}
                                            render={({ field }) => (
                                                <div className="flex flex-row space-x-3 items-center">
                                                    <ColorPickerDropDown 
                                                        className="h-8 w-8"
                                                        placeholder={"Colour"}
                                                        {...field} />
                                                    <FormLabel>Background</FormLabel>
                                                </div>
                                            )} />
                                    </div>
                                </div>
                            </div>

                            {/* Social Icon Style */}
                            <FormField
                                name="social.style"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-bold">Social Icon Style</FormLabel>
                                        <FormControl>
                                            <ComboBox
                                                value={field.value || 'solid'}
                                                items={['solid', 'outline']}
                                                objectName="style"
                                                onChange={(selected) => {
                                                    if (selected) {
                                                        field.onChange(selected);
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Logo Upload (available in both modes) */}
                            <FormField
                                control={bl.form.control}
                                name="logo"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3">
                                    <FormLabel className="font-bold text-sm">Logo</FormLabel>
                                    <FormControl>
                                        <FileUploader
                                            id={`${props.merchantId}-logo`}
                                            objectFit="cover"
                                            className="flex-grow h-[35px]"
                                            value={field.value ? [field.value.url] : []}
                                            acceptOnly={{
                                                type: "IMAGE"
                                            }}
                                            connection={{
                                                container: "public",
                                                relative_path: `merchant/${props.merchantId}/logo`
                                            }}
                                            targetImage={{
                                                width: 400,
                                                height: (2 / 3) * 400
                                            }}
                                            targetImageVariants={[]}
                                            allowMultiple={false}
                                            includePreview={false}
                                            onRemoveAsync={() => {
                                                field.onChange(null)
                                            }}  
                                            buttonProps={{
                                                variant: "link"
                                            }}
                                            onDropAsync={() => {}}
                                            onUploadCompleteAsync={async (files) => {
                                                field.onChange({
                                                    ...files[0],
                                                    title: "Logo Image",
                                                    description: "A logo image",
                                                    hashtags: []
                                                })
                                            }}
                                            />
                                    </FormControl>
                                </FormItem>        
                                )}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 grid-rows-3 gap-2 mt-3">
                        <Button disabled={!bl.form.formState.isDirty}  variant="destructive" type="reset" onClick={() => {
                            bl.form.reset()
                        }}>Reset</Button>
                        <Button variant={bl.formStatus.button.variant} type="submit">
                            {bl.formStatus.formState == "idle" ? "Save" : bl.formStatus.button.title }</Button>
                        <Button variant="outline" onClick={props.close}>Go Back</Button>
                    </div>
                    </form>
                </Form>
            }
        </div>
        </TooltipProvider>
    )
}

export default MerchantBrandingComponent