import { X, Loader2, ExternalLink, Store, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import useConsoleVendorAccounts from '../../accounts-manager/hooks/UseConsoleVendorAccounts';
import { VendorLifecycleStage } from '../../accounts-manager/types';
import { STAGE_LABELS, STAGE_COLORS } from '../types';

interface StageAccountsListProps {
    stage: string;
    onClose: () => void;
}

export default function StageAccountsList({ stage, onClose }: StageAccountsListProps) {
    const { data, isLoading } = useConsoleVendorAccounts({
        lifecycleStages: [stage as VendorLifecycleStage],
        limit: 50,
    });

    const colors = STAGE_COLORS[stage] || STAGE_COLORS.CREATED;
    const label = STAGE_LABELS[stage] || stage;

    return (
        <div
            className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden animate-in slide-in-from-top-2 duration-200"
            data-testid="stage-accounts-list"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                    <span className={`text-sm font-medium ${colors.text}`}>{label}</span>
                    {data && (
                        <span className="text-xs text-slate-500">
                            {data.totalCount} {data.totalCount === 1 ? 'account' : 'accounts'}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
                    data-testid="close-stage-accounts"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    <span className="text-sm text-slate-400 ml-2">Loading accounts...</span>
                </div>
            ) : !data || data.vendors.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm" data-testid="stage-accounts-empty">
                    No accounts at this stage
                </div>
            ) : (
                <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-800">
                            <tr className="border-b border-slate-700/50">
                                <th className="text-left px-4 py-2 text-slate-400 font-medium">Name</th>
                                <th className="text-left px-4 py-2 text-slate-400 font-medium">Type</th>
                                <th className="text-left px-4 py-2 text-slate-400 font-medium">Created</th>
                                <th className="text-left px-4 py-2 text-slate-400 font-medium">Payment</th>
                                <th className="text-right px-4 py-2 text-slate-400 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.vendors.map(vendor => (
                                <tr
                                    key={vendor.id}
                                    className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20"
                                    data-testid={`stage-account-${vendor.id}`}
                                >
                                    <td className="px-4 py-2.5">
                                        <span className="text-white font-medium">{vendor.name}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="inline-flex items-center space-x-1.5">
                                            {vendor.docType === 'MERCHANT' ? (
                                                <Store className="h-3.5 w-3.5 text-indigo-400" />
                                            ) : (
                                                <User className="h-3.5 w-3.5 text-purple-400" />
                                            )}
                                            <span className={vendor.docType === 'MERCHANT' ? 'text-indigo-400' : 'text-purple-400'}>
                                                {vendor.docType === 'MERCHANT' ? 'Merchant' : 'Practitioner'}
                                            </span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-400">
                                        {vendor.createdDate
                                            ? formatDistanceToNow(new Date(vendor.createdDate), { addSuffix: true })
                                            : '\u2014'}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {vendor.subscription?.payment_status === 'success' ? (
                                            <span className="text-green-400">Active</span>
                                        ) : vendor.subscription?.payment_status === 'failed' ? (
                                            <span className="text-red-400">Failed</span>
                                        ) : vendor.subscription?.waived ? (
                                            <span className="text-yellow-400">Waived</span>
                                        ) : (
                                            <span className="text-slate-500">
                                                {vendor.subscription?.payment_status || 'None'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <a
                                            href={`/m/${vendor.slug}/manage`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-xs text-slate-400 hover:text-white transition-colors"
                                            data-testid={`view-vendor-${vendor.id}`}
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.hasMore && (
                        <div className="text-center py-2 text-xs text-slate-500 border-t border-slate-700/30">
                            Showing first 50 of {data.totalCount} accounts
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
