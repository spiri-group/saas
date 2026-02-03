'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSignalRConnection } from '@/components/utils/SignalRProvider';

interface AlertUpdateData {
    id: string;
    alertType?: string;
    severity?: string;
    alertStatus?: string;
    assigneeId?: string;
}

const useAlertsRealTime = () => {
    const queryClient = useQueryClient();
    const signalR = useSignalRConnection();

    useEffect(() => {
        if (!signalR?.connection) return;

        const handleAlertUpdate = (messages: { type: string; data: AlertUpdateData }[]) => {
            console.log('[UseAlertsRealTime] Received alert update:', messages);

            // Invalidate queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ['platform-alerts'] });
            queryClient.invalidateQueries({ queryKey: ['platform-alert-stats'] });
        };

        // Subscribe to platformAlert channel
        signalR.connection.on('platformAlert', handleAlertUpdate);

        // Join the console-alerts group
        signalR.connection.invoke('JoinGroup', 'console-alerts').catch((err: Error) => {
            console.error('[UseAlertsRealTime] Failed to join group:', err);
        });

        return () => {
            signalR.connection?.off('platformAlert', handleAlertUpdate);
            signalR.connection?.invoke('LeaveGroup', 'console-alerts').catch((err: Error) => {
                console.error('[UseAlertsRealTime] Failed to leave group:', err);
            });
        };
    }, [signalR?.connection, queryClient]);
};

export default useAlertsRealTime;
