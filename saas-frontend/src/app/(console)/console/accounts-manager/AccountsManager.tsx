'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    ConsoleVendorAccount,
    ConsoleCustomerAccount,
    VendorDocType,
    VendorLifecycleStage
} from './types';
import { LifecycleStageBadge, DocTypeBadge, BillingOverrideBadge } from './components/AccountBadges';
import VendorDetailPanel from './components/VendorDetailPanel';
import CustomerDetailPanel from './components/CustomerDetailPanel';
import PaginationBar from './components/PaginationBar';
import useConsoleVendorAccounts from './hooks/UseConsoleVendorAccounts';
import useConsoleCustomerAccounts from './hooks/UseConsoleCustomerAccounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Users,
    Search,
    RefreshCw,
    Loader2,
    Store,
    Download,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type AccountTab = 'vendors' | 'customers';
const PAGE_SIZE = 50;

interface AccountsManagerProps {
    initialLifecycleFilter?: string | null;
    onFilterConsumed?: () => void;
}

export default function AccountsManager({ initialLifecycleFilter, onFilterConsumed }: AccountsManagerProps) {
    const [activeTab, setActiveTab] = useState<AccountTab>('vendors');
    const [selectedVendor, setSelectedVendor] = useState<ConsoleVendorAccount | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<ConsoleCustomerAccount | null>(null);

    // Vendor filters
    const [vendorSearch, setVendorSearch] = useState('');
    const [docTypeFilter, setDocTypeFilter] = useState<VendorDocType | 'all'>('all');
    const [lifecycleFilter, setLifecycleFilter] = useState<VendorLifecycleStage | 'all'>('all');

    // Customer filters
    const [customerSearch, setCustomerSearch] = useState('');

    // Pagination
    const [vendorPage, setVendorPage] = useState(0);
    const [customerPage, setCustomerPage] = useState(0);

    // Apply initial lifecycle filter from cross-tab navigation
    useEffect(() => {
        if (initialLifecycleFilter) {
            setLifecycleFilter(initialLifecycleFilter as VendorLifecycleStage);
            setActiveTab('vendors');
            setVendorPage(0);
            onFilterConsumed?.();
        }
    }, [initialLifecycleFilter, onFilterConsumed]);

    // Queries
    const vendorsQuery = useConsoleVendorAccounts({
        search: vendorSearch || undefined,
        docTypes: docTypeFilter !== 'all' ? [docTypeFilter] : undefined,
        lifecycleStages: lifecycleFilter !== 'all' ? [lifecycleFilter] : undefined,
        offset: vendorPage * PAGE_SIZE,
    });

    const customersQuery = useConsoleCustomerAccounts({
        search: customerSearch || undefined,
        offset: customerPage * PAGE_SIZE,
    });

    const vendors = vendorsQuery.data?.vendors || [];
    const customers = customersQuery.data?.customers || [];
    const vendorTotalCount = vendorsQuery.data?.totalCount || 0;
    const customerTotalCount = customersQuery.data?.totalCount || 0;

    const handleRefresh = () => {
        vendorsQuery.refetch();
        customersQuery.refetch();
    };

    const handleTabChange = (tab: AccountTab) => {
        setActiveTab(tab);
        setSelectedVendor(null);
        setSelectedCustomer(null);
    };

    // Reset page on filter change
    const handleVendorSearchChange = (value: string) => {
        setVendorSearch(value);
        setVendorPage(0);
    };
    const handleDocTypeChange = (value: VendorDocType | 'all') => {
        setDocTypeFilter(value);
        setVendorPage(0);
    };
    const handleLifecycleChange = (value: VendorLifecycleStage | 'all') => {
        setLifecycleFilter(value);
        setVendorPage(0);
    };
    const handleCustomerSearchChange = (value: string) => {
        setCustomerSearch(value);
        setCustomerPage(0);
    };

    const handleExportCsv = useCallback(() => {
        if (activeTab === 'vendors') {
            const headers = ['Name', 'Slug', 'Type', 'Lifecycle Stage', 'Payment Status', 'Next Billing', 'Plan', 'Published', 'Created'];
            const rows = vendors.map(v => [
                v.name || '',
                v.slug || '',
                v.docType || '',
                v.lifecycleStage || '',
                v.subscription?.payment_status || '',
                v.subscription?.next_billing_date || '',
                v.subscription?.plans?.map(p => p.name).join('; ') || '',
                v.publishedAt ? 'Yes' : 'No',
                v.createdDate || '',
            ]);
            downloadCsv(headers, rows, 'vendors-export.csv');
        } else {
            const headers = ['Name', 'Email', 'Vendors', 'Orders', 'Interests', 'Joined'];
            const rows = customers.map(c => [
                `${c.firstname || ''} ${c.lastname || ''}`.trim(),
                c.email || '',
                String(c.vendorCount),
                String(c.orderCount),
                c.spiritualInterests?.join('; ') || '',
                c.createdDate || '',
            ]);
            downloadCsv(headers, rows, 'customers-export.csv');
        }
    }, [activeTab, vendors, customers]);

    const isRefetching = vendorsQuery.isRefetching || customersQuery.isRefetching;

    return (
        <div className="h-full flex flex-col" data-testid="accounts-manager">
            {/* Header */}
            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-white">Accounts Manager</h1>
                            <p className="text-sm text-slate-400">View and manage vendor and customer accounts</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportCsv}
                            className="border-slate-700 hover:bg-slate-800"
                            data-testid="export-csv-btn"
                        >
                            <Download className="h-4 w-4" />
                            <span className="ml-2">Export CSV</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefetching}
                            className="border-slate-700 hover:bg-slate-800"
                            data-testid="refresh-accounts-btn"
                        >
                            {isRefetching ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            <span className="ml-2">Refresh</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tab Toggle + Filters */}
            <div className="p-4 border-b border-slate-800 flex items-center space-x-4">
                {/* Tab Toggle */}
                <div className="flex bg-slate-800 rounded-lg p-1">
                    <button
                        onClick={() => handleTabChange('vendors')}
                        data-testid="vendors-tab"
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            activeTab === 'vendors'
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Vendors
                    </button>
                    <button
                        onClick={() => handleTabChange('customers')}
                        data-testid="customers-tab"
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            activeTab === 'customers'
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Customers
                    </button>
                </div>

                {/* Filters */}
                {activeTab === 'vendors' ? (
                    <>
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                data-testid="vendor-search-input"
                                placeholder="Search by name or slug..."
                                value={vendorSearch}
                                onChange={(e) => handleVendorSearchChange(e.target.value)}
                                className="pl-10 bg-slate-800 border-slate-700"
                            />
                        </div>
                        <Select value={docTypeFilter} onValueChange={(v) => handleDocTypeChange(v as VendorDocType | 'all')}>
                            <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700" data-testid="doctype-filter">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="MERCHANT">Merchants</SelectItem>
                                <SelectItem value="PRACTITIONER">Practitioners</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={lifecycleFilter} onValueChange={(v) => handleLifecycleChange(v as VendorLifecycleStage | 'all')}>
                            <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700" data-testid="lifecycle-filter">
                                <SelectValue placeholder="Lifecycle" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stages</SelectItem>
                                <SelectItem value="CREATED">Created</SelectItem>
                                <SelectItem value="STRIPE_ONBOARDING">Stripe Onboarding</SelectItem>
                                <SelectItem value="FIRST_PAYOUT">First Payout</SelectItem>
                                <SelectItem value="CARD_ADDED">Card Added</SelectItem>
                                <SelectItem value="PUBLISHED">Published</SelectItem>
                                <SelectItem value="BILLING_ACTIVE">Billing Active</SelectItem>
                                <SelectItem value="BILLING_FAILED">Billing Failed</SelectItem>
                                <SelectItem value="BILLING_BLOCKED">Billing Blocked</SelectItem>
                            </SelectContent>
                        </Select>
                    </>
                ) : (
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            data-testid="customer-search-input"
                            placeholder="Search by email, first name, or last name..."
                            value={customerSearch}
                            onChange={(e) => handleCustomerSearchChange(e.target.value)}
                            className="pl-10 bg-slate-800 border-slate-700"
                        />
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 flex min-h-0">
                    {/* List */}
                    <div className={`flex-1 flex flex-col min-h-0 ${(selectedVendor || selectedCustomer) ? 'border-r border-slate-800' : ''}`}>
                        <div className="flex-1 overflow-y-auto">
                            {activeTab === 'vendors' ? (
                                vendorsQuery.isLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                                    </div>
                                ) : vendors.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <Store className="h-12 w-12 mb-4" />
                                        <p className="text-lg font-medium">No vendors found</p>
                                        <p className="text-sm">Try adjusting your filters</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-800">
                                        {vendors.map((vendor) => (
                                            <VendorRow
                                                key={vendor.id}
                                                vendor={vendor}
                                                isSelected={selectedVendor?.id === vendor.id}
                                                onClick={() => {
                                                    setSelectedVendor(vendor);
                                                    setSelectedCustomer(null);
                                                }}
                                            />
                                        ))}
                                    </div>
                                )
                            ) : (
                                customersQuery.isLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                                    </div>
                                ) : customers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <Users className="h-12 w-12 mb-4" />
                                        <p className="text-lg font-medium">No customers found</p>
                                        <p className="text-sm">Try adjusting your search</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-800">
                                        {customers.map((customer) => (
                                            <CustomerRow
                                                key={customer.id}
                                                customer={customer}
                                                isSelected={selectedCustomer?.id === customer.id}
                                                onClick={() => {
                                                    setSelectedCustomer(customer);
                                                    setSelectedVendor(null);
                                                }}
                                            />
                                        ))}
                                    </div>
                                )
                            )}
                        </div>

                        {/* Pagination */}
                        {activeTab === 'vendors' ? (
                            <PaginationBar
                                page={vendorPage}
                                totalCount={vendorTotalCount}
                                pageSize={PAGE_SIZE}
                                onPageChange={setVendorPage}
                            />
                        ) : (
                            <PaginationBar
                                page={customerPage}
                                totalCount={customerTotalCount}
                                pageSize={PAGE_SIZE}
                                onPageChange={setCustomerPage}
                            />
                        )}
                    </div>

                    {/* Detail Panel */}
                    {selectedVendor && (
                        <div className="w-[480px] flex-shrink-0">
                            <VendorDetailPanel
                                vendor={selectedVendor}
                                onClose={() => setSelectedVendor(null)}
                            />
                        </div>
                    )}
                    {selectedCustomer && (
                        <div className="w-[480px] flex-shrink-0">
                            <CustomerDetailPanel
                                customer={selectedCustomer}
                                onClose={() => setSelectedCustomer(null)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface VendorRowProps {
    vendor: ConsoleVendorAccount;
    isSelected: boolean;
    onClick: () => void;
}

function VendorRow({ vendor, isSelected, onClick }: VendorRowProps) {
    const sub = vendor.subscription;

    return (
        <div
            onClick={onClick}
            data-testid={`vendor-row-${vendor.id}`}
            className={`p-4 cursor-pointer transition-colors ${
                isSelected ? 'bg-slate-800' : 'hover:bg-slate-800/50'
            }`}
        >
            <div className="flex items-start justify-between mb-2">
                <div>
                    <p className="text-sm font-medium text-white">{vendor.name}</p>
                    <p className="text-xs text-slate-400">{vendor.slug}</p>
                </div>
                {vendor.createdDate && (
                    <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(vendor.createdDate), { addSuffix: true })}
                    </span>
                )}
            </div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                {vendor.docType && <DocTypeBadge docType={vendor.docType} />}
                <LifecycleStageBadge stage={vendor.lifecycleStage} />
                <BillingOverrideBadge
                    waived={sub?.waived}
                    waivedUntil={sub?.waivedUntil}
                    discountPercent={sub?.discountPercent}
                />
                {sub?.next_billing_date && (
                    <span className="text-xs text-slate-500">
                        Next: {sub.next_billing_date}
                    </span>
                )}
            </div>
        </div>
    );
}

interface CustomerRowProps {
    customer: ConsoleCustomerAccount;
    isSelected: boolean;
    onClick: () => void;
}

function CustomerRow({ customer, isSelected, onClick }: CustomerRowProps) {
    return (
        <div
            onClick={onClick}
            data-testid={`customer-row-${customer.id}`}
            className={`p-4 cursor-pointer transition-colors ${
                isSelected ? 'bg-slate-800' : 'hover:bg-slate-800/50'
            }`}
        >
            <div className="flex items-start justify-between mb-2">
                <div>
                    <p className="text-sm font-medium text-white">
                        {customer.firstname} {customer.lastname}
                    </p>
                    <p className="text-xs text-slate-400">{customer.email}</p>
                </div>
                {customer.createdDate && (
                    <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(customer.createdDate), { addSuffix: true })}
                    </span>
                )}
            </div>
            <div className="flex items-center space-x-4 text-xs text-slate-400">
                <span>{customer.vendorCount} vendor{customer.vendorCount !== 1 ? 's' : ''}</span>
                <span>{customer.orderCount} order{customer.orderCount !== 1 ? 's' : ''}</span>
                {customer.spiritualInterests && customer.spiritualInterests.length > 0 && (
                    <span className="text-purple-400">
                        {customer.spiritualInterests.length} interest{customer.spiritualInterests.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>
        </div>
    );
}

function downloadCsv(headers: string[], rows: string[][], filename: string) {
    const escapeCsvField = (field: string) => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    };

    const csvContent = [
        headers.map(escapeCsvField).join(','),
        ...rows.map(row => row.map(escapeCsvField).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
