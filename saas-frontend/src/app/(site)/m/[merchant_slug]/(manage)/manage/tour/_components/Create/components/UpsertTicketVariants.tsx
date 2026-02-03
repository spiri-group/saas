'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Trash2, Plus, Users } from "lucide-react";
import { v4 as uuid } from "uuid";
import { ControllerRenderProps, useFormContext } from "react-hook-form";
import CurrencyInput from "react-currency-input-field";
import { getCurrencySymbols } from "@/lib/functions";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

type TicketVariant = {
    id: string;
    name: string;
    description?: string;
    price: {
        amount: number;
        currency: string;
    };
    peopleCount: number;
    qty_on_hand: number;
    track_inventory: boolean;
    low_stock_threshold?: number;
    allow_backorder?: boolean;
};

type Props = ControllerRenderProps<any, "ticketVariants"> & {
    currency: string;
};

const UpsertTicketVariants: React.FC<Props> = ({ value, onChange, currency }) => {
    const form = useFormContext();
    const variants = (value as TicketVariant[]) || [];

    const addVariant = () => {
        const newVariant: TicketVariant = {
            id: uuid(),
            name: "",
            description: "",
            price: {
                amount: 0,
                currency
            },
            peopleCount: 1,
            qty_on_hand: 0,
            track_inventory: true,
            low_stock_threshold: 5,
            allow_backorder: false
        };
        onChange([...variants, newVariant]);
    };

    const removeVariant = (index: number) => {
        const newVariants = variants.filter((_, i) => i !== index);
        onChange(newVariants);
    };

    return (
        <div className="space-y-4 h-full overflow-y-auto">
            {variants.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="mb-2">No ticket variants yet</p>
                    <p className="text-sm">Add ticket types like Adult, Child, Family Pass, etc.</p>
                </div>
            )}

            {variants.map((variant, index) => (
                <Card key={variant.id} className="relative" data-testid={`ticket-variant-card-${index}`}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Ticket Variant {index + 1}
                            </CardTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVariant(index)}
                                className="h-8 w-8 p-0"
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Ticket Name and Description */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                name={`ticketVariants.${index}.name`}
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ticket Name *</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="e.g. Adult, Child, Family"
                                                data-testid={`ticket-name-${index}`}
                                                className={cn(
                                                    form.formState.errors?.ticketVariants?.[index]?.name && "border-destructive"
                                                )}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                name={`ticketVariants.${index}.peopleCount`}
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>People Count *</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="number"
                                                min={1}
                                                placeholder="1"
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                                className={cn(
                                                    form.formState.errors?.ticketVariants?.[index]?.peopleCount && "border-destructive"
                                                )}
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">
                                            How many people does this ticket cover?
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            name={`ticketVariants.${index}.description`}
                            control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder="Brief description of this ticket type"
                                            className="resize-none h-16"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {/* Price */}
                        <FormField
                            name={`ticketVariants.${index}.price.amount`}
                            control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Price *</FormLabel>
                                    <FormControl>
                                        <CurrencyInput
                                            placeholder="0.00"
                                            decimalsLimit={2}
                                            value={field.value}
                                            data-testid={`ticket-price-${index}`}
                                            className={cn(
                                                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                form.formState.errors?.ticketVariants?.[index]?.price?.amount && "border-destructive"
                                            )}
                                            prefix={getCurrencySymbols(currency).prefix}
                                            onValueChange={(value) => {
                                                field.onChange(value ? parseFloat(value) : 0);
                                            }}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {/* Inventory Management */}
                        <div className="border-t pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <FormLabel className="text-sm font-medium">Inventory Management</FormLabel>
                                <FormField
                                    name={`ticketVariants.${index}.track_inventory`}
                                    control={form.control}
                                    render={({ field }) => (
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`track-${index}`}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                            <label
                                                htmlFor={`track-${index}`}
                                                className="text-xs font-medium cursor-pointer"
                                            >
                                                Track inventory
                                            </label>
                                        </div>
                                    )}
                                />
                            </div>

                            {form.watch(`ticketVariants.${index}.track_inventory`) && (
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                        name={`ticketVariants.${index}.qty_on_hand`}
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Initial Stock *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        min={0}
                                                        placeholder="0"
                                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                        className={cn(
                                                            form.formState.errors?.ticketVariants?.[index]?.qty_on_hand && "border-destructive"
                                                        )}
                                                    />
                                                </FormControl>
                                                <FormDescription className="text-xs">
                                                    Available tickets
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        name={`ticketVariants.${index}.low_stock_threshold`}
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Low Stock Alert</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        min={0}
                                                        placeholder="5"
                                                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                                                    />
                                                </FormControl>
                                                <FormDescription className="text-xs">
                                                    Alert threshold
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        name={`ticketVariants.${index}.allow_backorder`}
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col justify-end">
                                                <div className="flex items-center space-x-2 h-10">
                                                    <Checkbox
                                                        id={`backorder-${index}`}
                                                        checked={field.value || false}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <label
                                                        htmlFor={`backorder-${index}`}
                                                        className="text-xs font-medium cursor-pointer"
                                                    >
                                                        Allow backorders
                                                    </label>
                                                </div>
                                                <FormDescription className="text-xs">
                                                    Accept when sold out
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}

            <Button
                type="button"
                variant="outline"
                onClick={addVariant}
                className="w-full"
                data-testid="add-ticket-variant-btn"
            >
                <Plus className="h-4 w-4 mr-2" />
                Add Ticket Variant
            </Button>
        </div>
    );
};

export default UpsertTicketVariants;
