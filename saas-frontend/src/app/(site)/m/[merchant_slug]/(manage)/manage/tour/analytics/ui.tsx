'use client';

import React, { useState, useMemo } from "react";
import { Panel, PanelHeader, PanelTitle, PanelDescription } from "@/components/ux/Panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    TrendingUp,
    TrendingDown,
    Users,
    DollarSign,
    CheckCircle2,
    Calendar,
    BarChart3,
    AlertCircle
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import UseTourAnalytics, { TourAnalytics, DateRangeInput } from "./hooks/UseTourAnalytics";
import { subDays, startOfDay, endOfDay } from "date-fns";

type BLProps = {
    merchantId: string;
};

type Props = BLProps;

type DateRangeOption = {
    label: string;
    value: string;
    getRange: () => DateRangeInput;
};

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
    {
        label: "Last 7 days",
        value: "7d",
        getRange: () => ({
            from: startOfDay(subDays(new Date(), 7)).toISOString(),
            to: endOfDay(new Date()).toISOString()
        })
    },
    {
        label: "Last 30 days",
        value: "30d",
        getRange: () => ({
            from: startOfDay(subDays(new Date(), 30)).toISOString(),
            to: endOfDay(new Date()).toISOString()
        })
    },
    {
        label: "Last 90 days",
        value: "90d",
        getRange: () => ({
            from: startOfDay(subDays(new Date(), 90)).toISOString(),
            to: endOfDay(new Date()).toISOString()
        })
    },
    {
        label: "All time",
        value: "all",
        getRange: () => ({})
    }
];

const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: currency || 'AUD'
    }).format(amount);
};

const useBL = (props: BLProps) => {
    const [selectedRange, setSelectedRange] = useState<string>("30d");

    const dateRange = useMemo(() => {
        const option = DATE_RANGE_OPTIONS.find(opt => opt.value === selectedRange);
        return option?.getRange() || {};
    }, [selectedRange]);

    const analyticsQuery = UseTourAnalytics(props.merchantId, dateRange);

    return {
        selectedRange,
        setSelectedRange,
        analytics: analyticsQuery.data,
        isLoading: analyticsQuery.isLoading,
        isError: analyticsQuery.isError,
        error: analyticsQuery.error
    };
};

// Metric Card Component
const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    testId: string;
}> = ({ title, value, subtitle, icon, trend, trendValue, testId }) => {
    return (
        <Card data-testid={testId}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className="text-muted-foreground">
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold" data-testid={`${testId}-value`}>{value}</div>
                {subtitle && (
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`${testId}-subtitle`}>
                        {subtitle}
                    </p>
                )}
                {trend && trendValue && (
                    <div className="flex items-center mt-2">
                        {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500 mr-1" />}
                        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 mr-1" />}
                        <span className={`text-xs ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {trendValue}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// Top Tours Bar Chart Component
const TopToursChart: React.FC<{
    tours: TourAnalytics['topTours'];
    currency: string;
}> = ({ tours, currency }) => {
    if (!tours || tours.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p>No tour data available</p>
            </div>
        );
    }

    const maxBookings = Math.max(...tours.map(t => t.bookingCount));

    return (
        <div className="space-y-4" data-testid="top-tours-chart">
            {tours.map((tour, index) => (
                <div key={tour.tourId} className="space-y-2" data-testid={`tour-row-${tour.tourId}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                                {index + 1}
                            </Badge>
                            <span className="font-medium text-sm truncate max-w-[200px]" title={tour.tourName}>
                                {tour.tourName}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                                {tour.bookingCount} bookings
                            </span>
                            <span className="font-medium">
                                {formatCurrency(tour.revenue.amount, currency)}
                            </span>
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(tour.bookingCount / maxBookings) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

// Booking Status Breakdown Component
const BookingStatusBreakdown: React.FC<{
    status: TourAnalytics['bookingsByStatus'];
    total: number;
}> = ({ status, total }) => {
    const items = [
        { label: 'Confirmed', count: status.confirmed, color: 'bg-green-500' },
        { label: 'Pending', count: status.pending, color: 'bg-yellow-500' },
        { label: 'Cancelled', count: status.cancelled, color: 'bg-red-500' }
    ];

    return (
        <div className="space-y-4" data-testid="booking-status-breakdown">
            <div className="flex w-full h-3 rounded-full overflow-hidden bg-slate-100">
                {items.map(item => (
                    item.count > 0 && (
                        <div
                            key={item.label}
                            className={`${item.color} transition-all duration-300`}
                            style={{ width: `${(item.count / total) * 100}%` }}
                        />
                    )
                ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
                {items.map(item => (
                    <div key={item.label} className="text-center" data-testid={`status-${item.label.toLowerCase()}`}>
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <div className={`w-3 h-3 rounded-full ${item.color}`} />
                            <span className="text-sm text-muted-foreground">{item.label}</span>
                        </div>
                        <p className="text-lg font-semibold">{item.count}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Loading Skeleton Component
const LoadingSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 animate-pulse" data-testid="loading-skeleton">
            {/* Metric Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <div className="h-4 bg-slate-200 rounded w-24" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 bg-slate-200 rounded w-32 mb-2" />
                            <div className="h-3 bg-slate-200 rounded w-20" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Panel>
                    <PanelHeader>
                        <div className="h-5 bg-slate-200 rounded w-32" />
                    </PanelHeader>
                    <div className="space-y-4 mt-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-slate-200 rounded" />
                        ))}
                    </div>
                </Panel>
                <Panel>
                    <PanelHeader>
                        <div className="h-5 bg-slate-200 rounded w-32" />
                    </PanelHeader>
                    <div className="h-48 bg-slate-200 rounded mt-4" />
                </Panel>
            </div>
        </div>
    );
};

const UI: React.FC<Props> = (props) => {
    const bl = useBL(props);

    return (
        <div className="space-y-6" data-testid="tour-analytics-page">
            {/* Header */}
            <Panel>
                <PanelHeader className="flex flex-row items-center justify-between">
                    <div>
                        <PanelTitle as="h1">Tour Analytics</PanelTitle>
                        <PanelDescription>
                            Track performance metrics for your tours and bookings
                        </PanelDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <Select
                            value={bl.selectedRange}
                            onValueChange={bl.setSelectedRange}
                        >
                            <SelectTrigger className="w-[180px]" data-testid="date-range-selector">
                                <SelectValue placeholder="Select date range" />
                            </SelectTrigger>
                            <SelectContent>
                                {DATE_RANGE_OPTIONS.map(option => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        data-testid={`date-range-${option.value}`}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </PanelHeader>
            </Panel>

            {/* Loading State */}
            {bl.isLoading && <LoadingSkeleton />}

            {/* Error State */}
            {bl.isError && (
                <Alert variant="destructive" data-testid="error-alert">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error loading analytics</AlertTitle>
                    <AlertDescription>
                        Failed to load analytics data. Please try again later.
                    </AlertDescription>
                </Alert>
            )}

            {/* Analytics Data */}
            {!bl.isLoading && !bl.isError && bl.analytics && (
                <>
                    {/* Metric Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Total Bookings"
                            value={bl.analytics.totalBookings}
                            icon={<Users className="w-4 h-4" />}
                            testId="metric-total-bookings"
                        />
                        <MetricCard
                            title="Total Revenue"
                            value={formatCurrency(
                                bl.analytics.totalRevenue.amount,
                                bl.analytics.totalRevenue.currency
                            )}
                            icon={<DollarSign className="w-4 h-4" />}
                            testId="metric-total-revenue"
                        />
                        <MetricCard
                            title="Check-in Rate"
                            value={`${bl.analytics.checkInRate}%`}
                            subtitle="of confirmed bookings"
                            icon={<CheckCircle2 className="w-4 h-4" />}
                            testId="metric-checkin-rate"
                        />
                        <MetricCard
                            title="Avg. Booking Value"
                            value={formatCurrency(
                                bl.analytics.averageBookingValue.amount,
                                bl.analytics.averageBookingValue.currency
                            )}
                            icon={<BarChart3 className="w-4 h-4" />}
                            testId="metric-avg-booking"
                        />
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Tours */}
                        <Panel>
                            <PanelHeader>
                                <PanelTitle>Top Tours</PanelTitle>
                                <PanelDescription>
                                    Tours ranked by number of bookings
                                </PanelDescription>
                            </PanelHeader>
                            <div className="mt-4">
                                <TopToursChart
                                    tours={bl.analytics.topTours}
                                    currency={bl.analytics.totalRevenue.currency}
                                />
                            </div>
                        </Panel>

                        {/* Booking Status Breakdown */}
                        <Panel>
                            <PanelHeader>
                                <PanelTitle>Booking Status</PanelTitle>
                                <PanelDescription>
                                    Breakdown of bookings by status
                                </PanelDescription>
                            </PanelHeader>
                            <div className="mt-4">
                                <BookingStatusBreakdown
                                    status={bl.analytics.bookingsByStatus}
                                    total={bl.analytics.totalBookings}
                                />
                            </div>
                        </Panel>
                    </div>

                    {/* Empty State */}
                    {bl.analytics.totalBookings === 0 && (
                        <Panel className="text-center py-12">
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-4 rounded-full bg-slate-100">
                                    <BarChart3 className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">No bookings yet</h3>
                                    <p className="text-muted-foreground">
                                        Analytics will appear here once you start receiving bookings.
                                    </p>
                                </div>
                            </div>
                        </Panel>
                    )}
                </>
            )}
        </div>
    );
};

export default UI;
