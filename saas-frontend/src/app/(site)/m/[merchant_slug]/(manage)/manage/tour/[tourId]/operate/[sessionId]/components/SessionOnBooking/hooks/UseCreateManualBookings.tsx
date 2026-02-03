import { gql } from "@/lib/services/gql";

import { booking_type, recordref_type, tour_ticket_variant_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PhoneSchema } from "@/components/ux/PhoneInput";

// Ticket selection schema
const ticketSchema = z.object({
    variantId: z.string().min(1, "Please select a ticket type"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1")
});

// Main form schema
const manualBookingFormSchema = z.object({
    email: z.string().email({
        message: "Please enter a valid email",
    }),
    firstname: z.string().min(2, {
        message: "First name must be at least 2 characters long",
    }),
    lastname: z.string().min(2, {
        message: "Last name must be at least 2 characters long",
    }),
    phoneNumber: PhoneSchema.optional(),
    tickets: z.array(ticketSchema).min(1, "Please add at least one ticket"),
    markAsPaid: z.boolean(),
    paymentMethod: z.string().optional(),
    notes: z.string().optional()
});

export type ManualBookingFormValues = z.infer<typeof manualBookingFormSchema>;

const UseCreateManualBookings = (sessionRef: recordref_type, ticketVariants: tour_ticket_variant_type[]) => {

    const queryClient = useQueryClient();

    const form = useForm<ManualBookingFormValues>({
        resolver: zodResolver(manualBookingFormSchema),
        defaultValues: {
            email: "",
            firstname: "",
            lastname: "",
            phoneNumber: {
                raw: "",
                displayAs: "",
                value: ""
            },
            tickets: ticketVariants.length > 0 ? [{ variantId: ticketVariants[0].id, quantity: 1 }] : [],
            markAsPaid: false,
            paymentMethod: "",
            notes: ""
        }
    });

    const { mutateAsync, isPending } = useMutation({
        mutationFn: async (values: ManualBookingFormValues) => {
            const response = await gql<{
                create_manual_tour_bookings: {
                    success: boolean;
                    message: string;
                    bookings: booking_type[]
                }
            }>(
                `
                    mutation create_manual_tour_bookings($bookings: [ManualBookingInput]!, $sessionRef: RecordRefInput!) {
                        create_manual_tour_bookings(bookings: $bookings, sessionRef: $sessionRef) {
                            success
                            message
                            bookings {
                                id,
                                code,
                                userId,
                                customerEmail,
                                user {
                                    firstname
                                    lastname
                                },
                                ticketStatus,
                                paid {
                                    datetime
                                    type
                                },
                                notes,
                                totalAmount {
                                    amount
                                    currency
                                },
                                order {
                                    id
                                    ref {
                                        id
                                        partition
                                        container
                                    }
                                    paymentSummary {
                                        due {
                                            total {
                                                amount
                                                currency
                                            }
                                        }
                                    }
                                },
                                checkedIn {
                                    datetime
                                },
                                lastMessageRef {
                                    id,
                                    partition,
                                    container
                                },
                                lastMessage {
                                    text
                                },
                                ref {
                                    id,
                                    partition,
                                    container
                                }
                            }
                        }
                    }
                `,
                {
                    bookings: [{
                        userDetails: {
                            email: values.email,
                            firstname: values.firstname,
                            lastname: values.lastname,
                            phoneNumber: values.phoneNumber?.value ? values.phoneNumber : undefined
                        },
                        tickets: values.tickets,
                        markAsPaid: values.markAsPaid,
                        paymentMethod: values.markAsPaid ? values.paymentMethod : undefined,
                        notes: values.notes || undefined
                    }],
                    sessionRef
                }
            );

            if (!response.create_manual_tour_bookings.success) {
                throw new Error(response.create_manual_tour_bookings.message);
            }

            return response.create_manual_tour_bookings.bookings;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["bookings-for-tour-session", sessionRef], (old: booking_type[] | undefined) => {
                if (old == undefined) return data;
                return [...data, ...old];
            });
        }
    });

    return {
        form,
        isPending,
        submit: form.handleSubmit(async (values: ManualBookingFormValues) => {
            await mutateAsync(values);
            // press the escape key to close the modal
            const esc = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(esc);
        })
    };
};

export default UseCreateManualBookings;
