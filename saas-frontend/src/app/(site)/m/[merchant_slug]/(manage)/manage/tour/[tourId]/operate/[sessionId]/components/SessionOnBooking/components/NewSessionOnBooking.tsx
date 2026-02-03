'use client';

import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormControl, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { recordref_type } from "@/utils/spiriverse";
import UseCreateManualBookings from "../hooks/UseCreateManualBookings";
import UseTourDetails from "../hooks/UseTourDetails";
import { useParams } from "next/navigation";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import PhoneInput from "@/components/ux/PhoneInput";
import { useFieldArray } from "react-hook-form";
import { Plus, Trash2, Loader2 } from "lucide-react";
import CurrencySpan from "@/components/ux/CurrencySpan";

type Props = {
    sessionRef: recordref_type;
};

const PAYMENT_METHODS = [
    { value: "CASH", label: "Cash" },
    { value: "CARD_ON_SITE", label: "Card (on-site terminal)" },
    { value: "BANK_TRANSFER", label: "Bank Transfer" },
    { value: "OTHER", label: "Other" }
];

const NewSessionOnBooking: React.FC<Props> = (props) => {
    const params = useParams<{ merchant_slug: string; tourId: string; sessionId: string }>();
    const merchantId = params?.merchant_slug?.split("-").pop() || "";
    const tourId = params?.tourId || "";

    const { data: tour, isLoading: tourLoading } = UseTourDetails(merchantId, tourId);
    const ticketVariants = tour?.ticketVariants || [];

    const { form, submit, isPending } = UseCreateManualBookings(props.sessionRef, ticketVariants);

    // Type assertion for form control to fix react-hook-form generic compatibility
    const control = form.control;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "tickets"
    });

    const watchedTickets = form.watch("tickets");
    const watchMarkAsPaid = form.watch("markAsPaid");

    // Calculate total amount
    const totalAmount = watchedTickets.reduce((sum, ticket) => {
        const variant = ticketVariants.find(v => v.id === ticket.variantId);
        if (variant) {
            return sum + (variant.price.amount * ticket.quantity);
        }
        return sum;
    }, 0);

    const currency = ticketVariants[0]?.price?.currency || "AUD";

    if (tourLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle data-testid="manual-booking-dialog-title">Create Manual Booking</DialogTitle>
                <DialogDescription>
                    Create a booking for walk-in, phone, or other off-platform customers.
                </DialogDescription>
            </DialogHeader>

            <Form {...form}>
                <form onSubmit={submit} className="space-y-4 mt-4" data-testid="manual-booking-form">
                    {/* Customer Details Section */}
                    <div className="space-y-3">
                        <h3 className="font-medium text-sm">Customer Details</h3>

                        <FormField
                            control={control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="customer@example.com"
                                            data-testid="manual-booking-email"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <FormField
                                control={control}
                                name="firstname"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="First name"
                                                data-testid="manual-booking-firstname"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="lastname"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Last name"
                                                data-testid="manual-booking-lastname"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone Number (optional)</FormLabel>
                                    <FormControl>
                                        <PhoneInput
                                            defaultCountry="AU"
                                            data-testid="manual-booking-phone"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Ticket Selection Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="font-medium text-sm">Tickets</h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ variantId: ticketVariants[0]?.id || "", quantity: 1 })}
                                disabled={ticketVariants.length === 0}
                                data-testid="manual-booking-add-ticket"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Ticket
                            </Button>
                        </div>

                        {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-3 items-end" data-testid={`manual-booking-ticket-row-${index}`}>
                                <FormField
                                    control={control}
                                    name={`tickets.${index}.variantId`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel className={index > 0 ? "sr-only" : ""}>Ticket Type</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger data-testid={`manual-booking-ticket-type-${index}`}>
                                                        <SelectValue placeholder="Select ticket type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {ticketVariants.map((variant) => (
                                                        <SelectItem key={variant.id} value={variant.id}>
                                                            {variant.name} - <CurrencySpan value={variant.price} />
                                                            {variant.peopleCount > 1 && ` (${variant.peopleCount} people)`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name={`tickets.${index}.quantity`}
                                    render={({ field }) => (
                                        <FormItem className="w-24">
                                            <FormLabel className={index > 0 ? "sr-only" : ""}>Qty</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    data-testid={`manual-booking-ticket-qty-${index}`}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {fields.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => remove(index)}
                                        data-testid={`manual-booking-remove-ticket-${index}`}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                        ))}

                        {/* Total */}
                        <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-medium">Total:</span>
                            <span className="text-lg font-bold" data-testid="manual-booking-total">
                                <CurrencySpan value={{ amount: totalAmount, currency }} />
                            </span>
                        </div>
                    </div>

                    {/* Payment Section */}
                    <div className="space-y-3">
                        <h3 className="font-medium text-sm">Payment</h3>

                        <FormField
                            control={control}
                            name="markAsPaid"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            data-testid="manual-booking-mark-paid"
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Mark as paid</FormLabel>
                                        <p className="text-xs text-muted-foreground">
                                            Check this if the customer has already paid (cash, card on-site, etc.)
                                        </p>
                                    </div>
                                </FormItem>
                            )}
                        />

                        {watchMarkAsPaid && (
                            <FormField
                                control={control}
                                name="paymentMethod"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Method</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger data-testid="manual-booking-payment-method">
                                                    <SelectValue placeholder="Select payment method" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {PAYMENT_METHODS.map((method) => (
                                                    <SelectItem key={method.value} value={method.value}>
                                                        {method.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>

                    {/* Notes Section */}
                    <FormField
                        control={control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes (optional)</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Any special requests or notes about this booking..."
                                        className="resize-none"
                                        rows={2}
                                        data-testid="manual-booking-notes"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Form Actions */}
                    <div className="flex flex-row space-x-3 pt-4">
                        <CancelDialogButton data-testid="manual-booking-cancel" />
                        <Button
                            className="flex-grow"
                            type="submit"
                            disabled={isPending}
                            data-testid="manual-booking-submit"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Booking"
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </>
    );
};

export default NewSessionOnBooking;
