'use client';

import { AlertSeverity, AlertStatus, AlertType } from '../types';
import { cn } from '@/lib/utils';

interface AlertStatusBadgeProps {
    status: AlertStatus;
    className?: string;
}

export const AlertStatusBadge = ({ status, className }: AlertStatusBadgeProps) => {
    const statusConfig: Record<AlertStatus, { label: string; className: string }> = {
        NEW: { label: 'New', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        INVESTIGATING: { label: 'Investigating', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
        AWAITING_RESPONSE: { label: 'Awaiting Response', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
        RESOLVED: { label: 'Resolved', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
        DISMISSED: { label: 'Dismissed', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    };

    const config = statusConfig[status];

    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                config.className,
                className
            )}
        >
            {config.label}
        </span>
    );
};

interface AlertSeverityBadgeProps {
    severity: AlertSeverity;
    className?: string;
}

export const AlertSeverityBadge = ({ severity, className }: AlertSeverityBadgeProps) => {
    const severityConfig: Record<AlertSeverity, { label: string; className: string }> = {
        LOW: { label: 'Low', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
        MEDIUM: { label: 'Medium', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
        HIGH: { label: 'High', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
        CRITICAL: { label: 'Critical', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    };

    const config = severityConfig[severity];

    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                config.className,
                className
            )}
        >
            {config.label}
        </span>
    );
};

interface AlertTypeBadgeProps {
    type: AlertType;
    className?: string;
}

export const AlertTypeBadge = ({ type, className }: AlertTypeBadgeProps) => {
    const typeConfig: Record<AlertType, { label: string; className: string }> = {
        PAYMENT_TIMEOUT: { label: 'Payment Timeout', className: 'bg-red-500/10 text-red-400' },
        WEBHOOK_FAILURE: { label: 'Webhook Failure', className: 'bg-orange-500/10 text-orange-400' },
        ORDER_ERROR: { label: 'Order Error', className: 'bg-yellow-500/10 text-yellow-400' },
        FRONTEND_ERROR: { label: 'Frontend Error', className: 'bg-blue-500/10 text-blue-400' },
        BACKEND_ERROR: { label: 'Backend Error', className: 'bg-purple-500/10 text-purple-400' },
        INTEGRATION_ERROR: { label: 'Integration Error', className: 'bg-pink-500/10 text-pink-400' },
    };

    const config = typeConfig[type];

    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                config.className,
                className
            )}
        >
            {config.label}
        </span>
    );
};
