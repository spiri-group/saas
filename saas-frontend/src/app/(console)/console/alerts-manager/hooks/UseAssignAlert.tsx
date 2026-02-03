'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { PlatformAlert } from '../types';

interface AssignAlertInput {
    id: string;
    assigneeId?: string;
}

interface AssignAlertResponse {
    code: string;
    success: boolean;
    message: string;
    alert?: PlatformAlert;
}

const useAssignAlert = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: AssignAlertInput) => {
            const response = await gql<{
                assignPlatformAlert: AssignAlertResponse;
            }>(`
                mutation AssignPlatformAlert($id: ID!, $assigneeId: ID) {
                    assignPlatformAlert(id: $id, assigneeId: $assigneeId) {
                        code
                        success
                        message
                        alert {
                            id
                            code
                            assigneeId
                            assignee {
                                id
                                firstname
                                lastname
                                email
                            }
                            updatedDate
                        }
                    }
                }
            `, input);
            return response.assignPlatformAlert;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-alerts'] });
        },
    });
};

export default useAssignAlert;
