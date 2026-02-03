import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type RescheduleRequestInput = {
    bookingId: string;
    customerId: string;
    newDate: string;
    newTime: {
        start: string;
        end: string;
    };
};

const useRequestReschedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: RescheduleRequestInput) => {
            const resp = await gql<{
                request_reschedule: {
                    code: string;
                    success: boolean;
                    message: string;
                    booking: any;
                    rescheduleCount: number;
                    maxReschedules: number;
                };
            }>(`
                mutation RequestReschedule($input: RescheduleRequestInput!) {
                    request_reschedule(input: $input) {
                        code
                        success
                        message
                        booking {
                            id
                            date
                            time {
                                start
                                end
                            }
                        }
                        rescheduleCount
                        maxReschedules
                    }
                }
            `, { input });

            return resp.request_reschedule;
        },
        onSuccess: () => {
            // Invalidate service bookings queries
            queryClient.invalidateQueries({ queryKey: ['serviceBookings'] });
            queryClient.invalidateQueries({ queryKey: ['customerServiceOrders'] });
        }
    });
};

export default useRequestReschedule;
