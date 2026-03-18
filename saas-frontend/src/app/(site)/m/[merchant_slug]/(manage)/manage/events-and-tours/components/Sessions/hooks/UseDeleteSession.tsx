import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const UseDeleteSession = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (args: { sessionId: string; vendorId: string }) => {
            const resp = await gql<{
                delete_schedule: { success: boolean; message: string }
            }>(`
                mutation DeleteSchedule($id: String!, $vendorId: String!) {
                    delete_schedule(id: $id, vendorId: $vendorId) {
                        success
                        message
                    }
                }
            `, {
                id: args.sessionId,
                vendorId: args.vendorId
            });
            return resp.delete_schedule;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        }
    });
};

export default UseDeleteSession;
