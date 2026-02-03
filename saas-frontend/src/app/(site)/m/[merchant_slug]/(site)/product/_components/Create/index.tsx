import UseCreateProduct, { CreateProductSchema, CrystalFormValues, CrystalGradeValues, CrystalColorValues } from "./hooks/UseCreateProduct";
import { isNullOrUndefined } from "@/lib/functions";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import CreateProductField from "./component/UpsertProductFields";
import UpsertVariants from "./component/UpsertVariants";
import { TooltipProvider } from "@/components/ui/tooltip";
import VisuallyHidden from "@/components/ux/VisuallyHidden";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import ListProductSuccess from "./component/ListProductSuccess";
import { recordref_type } from "@/utils/spiriverse";
import ThumbnailInput from "@/components/ux/ThumbnailInput";
import HierarchicalCategoryPicker from "./component/HierarchicalCategoryPicker";
import UseVendorLocations from "@/app/(site)/m/_hooks/UseVendorLocations";
import useVendorRefundPolicies from "@/app/(site)/m/_components/Profile/Edit/RefundPolicies/_hooks/UseVendorRefundPolicies";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeftIcon, ChevronRightIcon, PackageIcon, TagIcon, ZapIcon, GaugeIcon, ArchiveIcon, CrownIcon, ShieldCheckIcon, Gem, MapPin, Palette } from "lucide-react";
import { toast } from "sonner";
import ComboBox from "@/components/ux/ComboBox";
import CrystalTypeSelector from "./component/CrystalTypeSelector";
import { CrystalReference } from "./hooks/UseCrystalReferences";

type BLProps = {
    merchantId: string,
    merchantCurrency: string,
}

const useBL = (props: BLProps) => {

    const { form, mutation: createProduct, values, status, changeDefaultCurrency } = UseCreateProduct(props.merchantId, props.merchantCurrency)

    const [productRef, setProductRef] = useState<recordref_type | null>(null)
    const [currentStep, setCurrentStep] = useState(1)
    const [selectedCrystal, setSelectedCrystal] = useState<CrystalReference | null>(null)
    const merchant_locations = UseVendorLocations(props.merchantId)

    const soldFrom = form.watch('soldFromLocationId')
    const location = merchant_locations.data?.find(l => l.id == soldFrom)
    const refund_policies = useVendorRefundPolicies(props.merchantId, "PRODUCT", location?.address.components.country)

    // Check for missing prerequisites
    const hasLocations = merchant_locations.data && merchant_locations.data.length > 0
    const hasRefundPolicies = refund_policies.data && refund_policies.data.length > 0
    const isDataLoading = merchant_locations.isLoading || refund_policies.isLoading

    useEffect(() => {
        // set the sold from location to the first location
        if (!isNullOrUndefined(merchant_locations.data)
            && merchant_locations.data.length > 0
        ) {
            const location = merchant_locations.data[0]
            form.setValue('soldFromLocationId', location.id, { shouldValidate: true })
        }
    }, [merchant_locations.data])

    // Watch for changes in noRefunds and productReturnPolicyId to manage their interaction
    const noRefunds = form.watch('noRefunds')
    const productReturnPolicyId = form.watch('productReturnPolicyId')

    useEffect(() => {
        if (noRefunds && productReturnPolicyId) {
            // When noRefunds is checked, clear productReturnPolicyId
            form.setValue('productReturnPolicyId', undefined, { shouldValidate: true })
        }
    }, [noRefunds])

    useEffect(() => {
        // When productReturnPolicyId is selected, clear noRefunds
        if (productReturnPolicyId && noRefunds) {
            form.setValue('noRefunds', false, { shouldValidate: true })
        }
    }, [productReturnPolicyId])

    
    const validateStep1 = async () => {
        if (!checkPrerequisites()) return false;

        // Manual validation checks for required fields
        if (!values.name || values.name.trim() === '') {
            toast.error("Product name is required");
            return false;
        }

        if (!values.category) {
            toast.error("A category is required");
            return false;
        }

        if (!values.soldFromLocationId) {
            toast.error("Sold from location is required");
            return false;
        }

        // Check crystal-specific validation
        if (values.productType === 'CRYSTAL') {
            if (!values.typeData?.crystal?.crystalRefId) {
                toast.error("Crystal type is required for crystal products");
                return false;
            }
            if (!values.typeData?.crystal?.crystalForm) {
                toast.error("Crystal form is required for crystal products");
                return false;
            }
        }

        // Check refund policy selection
        if (!values.noRefunds && !values.productReturnPolicyId) {
            toast.error("Refund policy is required or check 'No refunds'");
            return false;
        }

        // If refunds are enabled, check refund rules
        if (!values.noRefunds) {
            if (values.refundRules?.refundWithoutReturn === undefined) {
                toast.error("Please select whether you want the item sent back");
                return false;
            }
            if (!values.refundRules?.refundTiming) {
                toast.error("Please select when the refund should be released");
                return false;
            }
        }

        if (!values.thumbnail_content_set) {
            toast.error("Product image is required");
            return false;
        }

        return true;
    };

    const validateStep2 = async () => {
        const result = await form.trigger(['pricingStrategy']);
        if (!result) {
            toast.error("Please select your pricing goal before proceeding");
        }
        return result;
    };

    const validateStep3 = async () => {
        // Trigger validation for all variant-related fields to show visual errors
        const result = await form.trigger(['variants']);
        
        if (!result) {
            // Show specific validation errors
            const errors = form.formState.errors;
            if (errors.variants) {
                if (Array.isArray(errors.variants)) {
                    // Find the first variant with errors
                    const firstErrorIndex = errors.variants.findIndex(variant => variant != null);
                    if (firstErrorIndex >= 0) {
                        toast.error(`Please fix errors in Variant ${firstErrorIndex + 1}`);
                    } else {
                        toast.error("Please fix variant errors");
                    }
                } else if (errors.variants.message) {
                    toast.error(errors.variants.message);
                } else {
                    toast.error("Please complete all variant information");
                }
            } else {
                toast.error("Please complete all variant information");
            }
        }
        
        return result;
    };

    const handleNext = async () => {
        if (currentStep === 1) {
            const isValid = await validateStep1();
            if (isValid) {
                setCurrentStep(2);
            }
        } else if (currentStep === 2) {
            const isValid = await validateStep2();
            if (isValid) {
                setCurrentStep(3);
            }
        } else if (currentStep === 3) {
            const isValid = await validateStep3();
            if (isValid) {
                // Submit the form directly after step 3
                const formValues = form.getValues();
                status.submit(async () => {
                    // create the product
                    const resp = await createProduct.mutateAsync(formValues)
                    return resp.ref
                }, {}, (result: recordref_type) => {
                    setProductRef(result)
                });
            }
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const hasVariants = () => {
        return values.variants && values.variants.length > 0;
    };


    const checkPrerequisites = () => {
        if (!isDataLoading) {
            if (!hasLocations) {
                toast.error("No locations configured. Please add a location in Profile > Customise > Locations");
                return false;
            }
            // Only require refund policies if noRefunds is not selected
            if (!hasRefundPolicies && !values.noRefunds) {
                toast.error("No refund policies available. Please add a refund policy in Profile > Refund Policies or select 'No refunds'");
                return false;
            }
        }
        return true;
    };


    return {
        form,
        status,
        values,
        locations: merchant_locations.data,
        refundPolicies: refund_policies.data ?? [],
        changeDefaultCurrency,
        productRef,
        currentStep,
        handleNext,
        handlePrevious,
        hasVariants,
        isDataLoading,
        selectedCrystal,
        setSelectedCrystal,
        submit: async (values: CreateProductSchema) => {
            await status.submit(async () => {
                // create the product
                const resp = await createProduct.mutateAsync(values)
                return resp.ref
            }, {}, (result: recordref_type) => {
                setProductRef(result)
            });
        }
    }
}

type Props = BLProps & {

}

const CreateProduct : React.FC<Props> = (props) => {
    const bl = useBL(props);


    return (
        isNullOrUndefined(bl.productRef) ? 
        (
            <DialogContent className="w-[1000px] h-[900px] flex flex-col"> 
                <VisuallyHidden>
                    <DialogTitle>Create product</DialogTitle>
                    <DialogDescription>Fill in the form to create a new product for your catalogue.</DialogDescription>
                </VisuallyHidden>
                
                {/* Progress indicator with close button */}
                <div className="flex items-center justify-between mb-4 px-4 pt-2">
                    <div className="flex items-center space-x-2">
                        <div className={`h-1 w-8 rounded-full transition-colors ${
                            bl.currentStep >= 1 ? 'bg-primary' : 'bg-muted'
                        }`}></div>
                        <span className={`text-xs font-medium transition-colors ${
                            bl.currentStep === 1 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                        }`}>
                            Product Details
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className={`h-1 w-8 rounded-full transition-colors ${
                            bl.currentStep >= 2 ? 'bg-primary' : 'bg-muted'
                        }`}></div>
                        <span className={`text-xs font-medium transition-colors ${
                            bl.currentStep === 2 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                        }`}>
                            Properties
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className={`h-1 w-8 rounded-full transition-colors ${
                            bl.currentStep >= 3 ? 'bg-primary' : 'bg-muted'
                        }`}></div>
                        <span className={`text-xs font-medium transition-colors ${
                            bl.currentStep === 3 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                        }`}>
                            Variants
                        </span>
                    </div>
                    <Button variant="outline" onClick={() => {
                        // Dispatch a custom event to close the dialog
                        const event = new CustomEvent('close-dialog');
                        window.dispatchEvent(event);
                    }}>
                        ✕ Close
                    </Button>
                </div>


                <TooltipProvider>
                <Form {...bl.form}>
                    <form onSubmit={(e) => {
                    e.preventDefault();
                    }} className="flex-grow flex flex-col space-y-4 min-h-0">
                        {/* Step 1: Product Details */}
                        {bl.currentStep === 1 && (
                            <div className="flex-grow flex flex-col space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-start gap-6 text-base">
                                            <div className="flex items-center">
                                                <PackageIcon className="h-4 w-4 mr-2" />
                                                Product Information
                                            </div>
                                            <FormField
                                                name="name"
                                                control={bl.form.control}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1 flex flex-row items-center space-x-3 space-y-0">
                                                        <FormLabel className="text-sm font-medium">Product Name *</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Enter product name" autoFocus />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-2">
                                        {/* Product Type Selector */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <FormField
                                                name="productType"
                                                control={bl.form.control}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-medium">Product Type</FormLabel>
                                                        <FormControl>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant={field.value === 'STANDARD' ? 'default' : 'outline'}
                                                                    className={cn("flex-1 gap-2", field.value === 'STANDARD' && "ring-2 ring-primary")}
                                                                    onClick={() => {
                                                                        field.onChange('STANDARD');
                                                                        // Clear crystal data when switching to standard
                                                                        bl.form.setValue('typeData', undefined);
                                                                        bl.setSelectedCrystal(null);
                                                                    }}
                                                                    data-testid="product-type-standard"
                                                                >
                                                                    <PackageIcon className="h-4 w-4" />
                                                                    Standard Product
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant={field.value === 'CRYSTAL' ? 'default' : 'outline'}
                                                                    className={cn("flex-1 gap-2", field.value === 'CRYSTAL' && "ring-2 ring-primary ring-offset-2 ring-violet-500")}
                                                                    onClick={() => {
                                                                        field.onChange('CRYSTAL');
                                                                        // Initialize crystal data structure
                                                                        bl.form.setValue('typeData', {
                                                                            crystal: {
                                                                                crystalRefId: '',
                                                                                crystalForm: 'raw',
                                                                            }
                                                                        });
                                                                    }}
                                                                    data-testid="product-type-crystal"
                                                                >
                                                                    <Gem className="h-4 w-4 text-violet-500" />
                                                                    Crystal / Mineral
                                                                </Button>
                                                            </div>
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Crystal-specific fields when CRYSTAL is selected */}
                                        {bl.values.productType === 'CRYSTAL' && (
                                            <Card className="border-violet-500/30 bg-violet-500/5">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="flex items-center text-sm text-violet-400">
                                                        <Gem className="h-4 w-4 mr-2" />
                                                        Crystal Details
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                        {/* Crystal Type Selector */}
                                                        <FormField
                                                            name="typeData.crystal.crystalRefId"
                                                            control={bl.form.control}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-sm font-medium">Crystal Type *</FormLabel>
                                                                    <FormControl>
                                                                        <CrystalTypeSelector
                                                                            value={field.value}
                                                                            selectedCrystal={bl.selectedCrystal}
                                                                            onSelect={(crystal) => {
                                                                                field.onChange(crystal.id);
                                                                                bl.setSelectedCrystal(crystal);
                                                                                // Optionally auto-fill the product name
                                                                                if (!bl.values.name || bl.values.name.trim() === '') {
                                                                                    bl.form.setValue('name', crystal.name);
                                                                                }
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        {/* Crystal Form */}
                                                        <FormField
                                                            name="typeData.crystal.crystalForm"
                                                            control={bl.form.control}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-sm font-medium">Crystal Form *</FormLabel>
                                                                    <FormControl>
                                                                        <Select value={field.value} onValueChange={field.onChange}>
                                                                            <SelectTrigger data-testid="crystal-form-select">
                                                                                <SelectValue placeholder="Select form" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {CrystalFormValues.map((form) => (
                                                                                    <SelectItem key={form} value={form}>
                                                                                        {form.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                        {/* Crystal Grade (optional) */}
                                                        <FormField
                                                            name="typeData.crystal.crystalGrade"
                                                            control={bl.form.control}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                                                                        <CrownIcon className="h-3 w-3" />
                                                                        Grade
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Select value={field.value || ''} onValueChange={(val) => field.onChange(val || undefined)}>
                                                                            <SelectTrigger data-testid="crystal-grade-select">
                                                                                <SelectValue placeholder="Optional" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="">None</SelectItem>
                                                                                {CrystalGradeValues.map((grade) => (
                                                                                    <SelectItem key={grade} value={grade}>
                                                                                        {grade}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />

                                                        {/* Crystal Color (optional) */}
                                                        <FormField
                                                            name="typeData.crystal.crystalColor"
                                                            control={bl.form.control}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                                                                        <Palette className="h-3 w-3" />
                                                                        Color
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Select value={field.value || ''} onValueChange={(val) => field.onChange(val || undefined)}>
                                                                            <SelectTrigger data-testid="crystal-color-select">
                                                                                <SelectValue placeholder="Optional" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="">None</SelectItem>
                                                                                {CrystalColorValues.map((color) => (
                                                                                    <SelectItem key={color} value={color}>
                                                                                        {color.replace(/\b\w/g, c => c.toUpperCase())}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />

                                                        {/* Crystal Locality (optional) */}
                                                        <FormField
                                                            name="typeData.crystal.crystalLocality"
                                                            control={bl.form.control}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                                                                        <MapPin className="h-3 w-3" />
                                                                        Locality / Origin
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            {...field}
                                                                            value={field.value || ''}
                                                                            placeholder="e.g., Brazil, Madagascar"
                                                                            data-testid="crystal-locality-input"
                                                                        />
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>

                                                    {/* Show selected crystal info */}
                                                    {bl.selectedCrystal && (
                                                        <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm">
                                                            <div className="font-medium text-violet-300">{bl.selectedCrystal.name}</div>
                                                            {bl.selectedCrystal.chakras && bl.selectedCrystal.chakras.length > 0 && (
                                                                <div className="text-muted-foreground mt-1">
                                                                    Chakras: {bl.selectedCrystal.chakras.join(', ')}
                                                                </div>
                                                            )}
                                                            {bl.selectedCrystal.elements && bl.selectedCrystal.elements.length > 0 && (
                                                                <div className="text-muted-foreground">
                                                                    Elements: {bl.selectedCrystal.elements.join(', ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )}

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Left side - Category */}
                                            <FormField
                                                name="category"
                                                control={bl.form.control}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormLabel className="text-sm font-medium">Category *</FormLabel>
                                                        <FormControl>
                                                            <HierarchicalCategoryPicker
                                                                merchantId={props.merchantId}
                                                                selectedCategoryId={field.value}
                                                                onCategorySelect={(categoryId) => {
                                                                    field.onChange(categoryId);
                                                                }}
                                                                placeholder="Select a category"
                                                                className={cn(bl.form.formState.errors.category ? "border-red-500" : "")}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />

                                            {/* Right side - Location and Policy */}
                                            {!isNullOrUndefined(bl.locations) && (
                                                <div className="space-y-4">
                                                    <FormField
                                                        name="soldFromLocationId"
                                                        control={bl.form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-sm font-medium">Sold From *</FormLabel>
                                                                <FormControl>
                                                                    <ComboBox
                                                                        withSearch={false}
                                                                        objectName="locations"
                                                                        onChange={(value) => {
                                                                            if (isNullOrUndefined(value)) return;
                                                                            field.onChange(value.id)
                                                                        }}
                                                                        value={bl.locations!.length > 0 ? bl.locations!.find(l => l.id == field.value) : undefined}
                                                                        items={bl.locations ?? []}
                                                                        fieldMapping={{
                                                                            keyColumn: "id",
                                                                            labelColumn: "title"
                                                                        }} />
                                                                </FormControl>
                                                            </FormItem>
                                                        )} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Second row - Refund Settings */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                            <FormField
                                                name="productReturnPolicyId"
                                                control={bl.form.control}
                                                render={({field}) => (
                                                    <FormItem className="flex flex-col space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <FormLabel className="text-sm font-medium">Refund Policy *</FormLabel>
                                                            <FormField
                                                                name="noRefunds"
                                                                control={bl.form.control}
                                                                render={({field: noRefundsField}) => (
                                                                    <div className="flex items-center space-x-2">
                                                                        <Checkbox
                                                                            id="no-refunds-checkbox"
                                                                            checked={noRefundsField.value || false}
                                                                            onCheckedChange={(checked) => {
                                                                                noRefundsField.onChange(checked);
                                                                                if (checked) {
                                                                                    // Clear refund policy when no refunds is selected
                                                                                    field.onChange(undefined);
                                                                                }
                                                                            }}
                                                                        />
                                                                        <label
                                                                            htmlFor="no-refunds-checkbox"
                                                                            className="text-xs font-semibold text-foreground cursor-pointer select-none"
                                                                        >
                                                                            No refunds allowed
                                                                        </label>
                                                                    </div>
                                                                )}
                                                            />
                                                        </div>
                                                        <FormControl>
                                                            <ComboBox
                                                                withSearch={true}
                                                                objectName="Refund Policy"
                                                                disabled={bl.form.watch('noRefunds')}
                                                                onChange={(value) => {
                                                                    if (isNullOrUndefined(value)) return;
                                                                    field.onChange(value.id);
                                                                    // Clear no refunds when a refund policy is selected
                                                                    if (bl.form.watch('noRefunds')) {
                                                                        bl.form.setValue('noRefunds', false);
                                                                    }
                                                                }}
                                                                value={bl.refundPolicies.length > 0 ? bl.refundPolicies.find(rp => rp.id == field.value) : undefined}
                                                                items={bl.refundPolicies ?? []}
                                                                fieldMapping={{
                                                                    keyColumn: "id",
                                                                    labelColumn: "title"
                                                                }} />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />

                                            {/* Do you want the item sent back? */}
                                            {!bl.values.noRefunds && (
                                                <FormField
                                                    name="refundRules.refundWithoutReturn"
                                                    control={bl.form.control}
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-col space-y-2">
                                                            <FormLabel className="text-sm font-medium">Do you want the item sent back?</FormLabel>
                                                            <FormControl>
                                                                <Select
                                                                    value={field.value === false ? "yes" : "no"}
                                                                    onValueChange={(value) => field.onChange(value === "no")}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select option" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="yes">Yes - require return</SelectItem>
                                                                        <SelectItem value="no">No - refund without return</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormControl>
                                                        </FormItem>
                                                    )} />
                                            )}

                                            {/* When should the refund be released? */}
                                            {!bl.values.noRefunds && (
                                                <FormField
                                                    name="refundRules.refundTiming"
                                                    control={bl.form.control}
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-col space-y-2">
                                                            <FormLabel className="text-sm font-medium">When should the refund be released?</FormLabel>
                                                            <FormControl>
                                                                <Select value={field.value} onValueChange={field.onChange}>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select timing" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="immediate">Immediately</SelectItem>
                                                                        <SelectItem value="carrier_scan">When carrier scans return</SelectItem>
                                                                        <SelectItem value="delivered">When return is delivered</SelectItem>
                                                                        <SelectItem value="manual">Manual approval</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormControl>
                                                        </FormItem>
                                                    )} />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>


                                {/* Catalogue Image Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-base">
                                            <PackageIcon className="h-4 w-4 mr-2" />
                                            Catalogue Image
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <FormField
                                            control={bl.form.control}
                                            name={`thumbnail`}
                                            render={({field}) => (
                                                <FormItem className="relative">
                                                    <FormControl>
                                                        <ThumbnailInput 
                                                            thumbnailType="square"
                                                            objectFit={"contain"}
                                                            withPrice={true}
                                                            relativePath={`merchant/${props.merchantId}/product/${bl.values.id}/thumbnail`}
                                                            easyModeOnly={true}
                                                            layout="landscape"
                                                            {...field}
                                                            onChange={(data) => {
                                                                field.onChange(data);
                                                                if (!isNullOrUndefined(data.title.content)) {
                                                                    bl.form.setValue(`thumbnail_content_set`, true, { shouldValidate: true });
                                                                }
                                                            }} />
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Step 2: Product Properties & Strategy */}
                        {bl.currentStep === 2 && (
                            <div className="flex-grow flex flex-col space-y-4">
                                {/* Pricing Strategy Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-base">
                                            <TagIcon className="h-4 w-4 mr-2" />
                                            Pricing Strategy
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <FormField
                                            name="pricingStrategy"
                                            control={bl.form.control}
                                            render={({ field }) => (
                                                <FormItem className="w-full">
                                                    <FormLabel className="text-sm font-medium">What&apos;s your main goal with this product?</FormLabel>
                                                    <FormControl>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="w-full mt-3">
                                                                <SelectValue placeholder="Choose your pricing goal" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="volume">
                                                                    <div className="flex items-center gap-2">
                                                                        <ZapIcon className="h-4 w-4" />
                                                                        <span>Sell more units (volume focus)</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="unit-profit">
                                                                    <div className="flex items-center gap-2">
                                                                        <GaugeIcon className="h-4 w-4" />
                                                                        <span>Make steady profit per unit (unit profit focus)</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="inventory">
                                                                    <div className="flex items-center gap-2">
                                                                        <ArchiveIcon className="h-4 w-4" />
                                                                        <span>Clear stock quickly (inventory focus)</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="premium">
                                                                    <div className="flex items-center gap-2">
                                                                        <CrownIcon className="h-4 w-4" />
                                                                        <span>Position as premium (brand/value focus)</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="risk-averse">
                                                                    <div className="flex items-center gap-2">
                                                                        <ShieldCheckIcon className="h-4 w-4" />
                                                                        <span>Stay safe / cover costs (risk-averse baseline)</span>
                                                                    </div>
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                    </CardContent>
                                </Card>

                                {/* Product Properties Card */}
                                <Card className="flex flex-col flex-grow min-h-0">
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-base">
                                            <TagIcon className="h-4 w-4 mr-2" />
                                            Product Properties
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow min-h-0">
                                        <FormField
                                            name="properties"
                                            render={({ field }) => (
                                                <FormItem className="h-full">
                                                    <FormControl>
                                                        <CreateProductField 
                                                            className="h-full w-full"
                                                            form={bl.form} {...field}/>
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Step 3: Variants */}
                        {bl.currentStep === 3 && (
                            <div className="flex-grow flex flex-col min-h-0">
                                <Card className="flex-grow flex flex-col min-h-0">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center justify-between text-base ">
                                            <div className="flex items-center">
                                                <PackageIcon className="h-4 w-4 mr-2" />
                                                Product Variants
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>Pricing:</span>
                                                <FormField
                                                    name="pricingStrategy"
                                                    control={bl.form.control}
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="w-48 h-8 text-xs">
                                                                <SelectValue placeholder="Choose strategy" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="volume">
                                                                    <div className="flex items-center gap-2">
                                                                        <ZapIcon className="h-3 w-3" />
                                                                        <span>Sell more units</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="unit-profit">
                                                                    <div className="flex items-center gap-2">
                                                                        <GaugeIcon className="h-3 w-3" />
                                                                        <span>Make steady profit</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="inventory">
                                                                    <div className="flex items-center gap-2">
                                                                        <ArchiveIcon className="h-3 w-3" />
                                                                        <span>Clear stock quickly</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="premium">
                                                                    <div className="flex items-center gap-2">
                                                                        <CrownIcon className="h-3 w-3" />
                                                                        <span>Position as premium</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="risk-averse">
                                                                    <div className="flex items-center gap-2">
                                                                        <ShieldCheckIcon className="h-3 w-3" />
                                                                        <span>Stay safe / cover costs</span>
                                                                    </div>
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )} />
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow min-h-0">
                                        <FormField
                                            control={bl.form.control}
                                            name="variants"
                                            render={({ field }) => (
                                                <UpsertVariants 
                                                    properties={bl.values.properties ?? []}
                                                    relativePath={`merchant/${props.merchantId}/product/${bl.values.id}`}
                                                    productName={bl.values.name}
                                                    {...field} />
                                            )} />
                                    </CardContent>
                                </Card>
                            </div>
                        )}


                        {/* Navigation Footer */}
                        <DialogFooter className="flex flex-row items-center sm:justify-between w-full">
                            <div className="flex space-x-2">
                                <CancelDialogButton />
                            </div>
                            <div className="flex space-x-2">
                                {bl.currentStep > 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={bl.handlePrevious}
                                        disabled={bl.status.formState !== 'idle'}
                                    >
                                        <ChevronLeftIcon className="h-4 w-4 mr-2" />
                                        Previous
                                    </Button>
                                )}
                                {bl.currentStep < 3 ? (
                                    <Button 
                                        type="button"
                                        onClick={bl.handleNext}
                                        disabled={bl.status.formState !== 'idle'}
                                    >
                                        Next
                                        <ChevronRightIcon className="h-4 w-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button 
                                        variant={bl.status.button.variant} 
                                        type="button"
                                        onClick={() => {
                                            const formValues = bl.form.getValues();
                                            bl.submit(formValues);
                                        }}
                                        disabled={bl.status.formState !== 'idle'}
                                    >
                                        {bl.status.formState === 'idle' ? "List Product" : bl.status.button.title}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
                </TooltipProvider>
            </DialogContent>
        ) : (
            <ListProductSuccess forObject={bl.productRef} />
        )
    )
}

export default CreateProduct;