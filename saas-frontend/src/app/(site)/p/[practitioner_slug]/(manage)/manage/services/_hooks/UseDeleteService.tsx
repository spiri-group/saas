import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

const useDeleteService = (practitionerId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (serviceId: string) => {
            const response = await gql<{
                delete_listing: {
                    success: boolean;
                    message: string;
                };
            }>(`
                mutation DeleteService($id: String!, $vendorId: String!) {
                    delete_listing(id: $id, vendorId: $vendorId) {
                        code
                        success
                        message
                    }
                }
            `, {
                id: serviceId,
                vendorId: practitionerId,
            });

            return response.delete_listing;
        },
        onSuccess: (_data, serviceId) => {
            queryClient.setQueryData(['practitioner-services', practitionerId], (old: any[] | undefined) => {
                if (!old) return old;
                return old.filter((s) => s.id !== serviceId);
            });
            queryClient.invalidateQueries({ queryKey: ['practitioner-services', practitionerId] });
        },
    });
};

export default useDeleteService;
