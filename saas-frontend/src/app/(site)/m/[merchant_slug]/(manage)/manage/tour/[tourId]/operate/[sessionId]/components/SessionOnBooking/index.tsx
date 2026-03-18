'use client'

import React, { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Panel } from "@/components/ux/Panel"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CommunicationModeType, booking_type, recordref_type } from "@/utils/spiriverse"
import { useParams } from "next/navigation"
import { ArrowUpDown, ChevronDownCircleIcon, Download, Mail, MessageCircle, Pencil, Phone, Search, Plus, Users, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import CopyButton from "@/components/ux/CopyButton"
import UseCreatePaymentLink from "./hooks/UseCreatePaymentLink"

import UseSessionBookings from "./hooks/UseSessionBookings"
import UseMarkBookingPaid from "./hooks/UseMarkBookingPaid"
import UseCheckInBooking from "../CheckIn/hooks/UseCheckInBooking"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import CurrencySpan from "@/components/ux/CurrencySpan"
import ChatControl from "@/components/ux/ChatControl"
import NewSessionOnBooking from "./components/NewSessionOnBooking"
import UpdateSessionOnBooking from "./components/UpdateSessionOnBooking"
import UseCancelBooking from "./hooks/UseCancelBooking"
import { format } from "date-fns"
import { DateTime } from "luxon"
import { gql } from "@/lib/services/gql"
import { session_type } from "@/utils/spiriverse"
import { isBookingPaid, getAmountDue } from "../../utils"

type SortMode = 'default' | 'name' | 'status';

const useBL = () => {
    const params = useParams<{ merchant_slug: string, tourId: string, sessionId: string}>();

    if (params == null) throw new Error("No params")

    // Extract merchant ID from slug (e.g., "my-shop-abc123" -> "abc123")
    const merchantId = params.merchant_slug?.split("-").pop() || "";

    const [createManualBookingOpen, setCreateManualBookingOpen] = useState<boolean>()
    const [selectedOrderRef, setSelectedOrderRef] = useState<recordref_type | null>(null)
    const [updateBooking, setUpdateBooking] = useState<booking_type | null>(null)
    const [searchFilter, setSearchFilter] = useState("")
    const [showChat, setShowChat] = useState(false)
    const [sortMode, setSortMode] = useState<SortMode>('default')
    const [confirmMarkPaid, setConfirmMarkPaid] = useState<booking_type | null>(null)

    const sessionRef = {
        id: params.sessionId,
        partition: [merchantId, params.tourId],
        container: "Tour-Session"
    }
    const sessionWithBookings = UseSessionBookings(sessionRef)

    // Session time data — shares cache with BookingInfoHeader via same query key
    const sessionTimeQuery = useQuery({
        queryKey: ['session-header', merchantId, params.tourId, params.sessionId],
        queryFn: async () => {
            const { session } = await gql<{ session: session_type }>(
                `query get_session($vendorId: ID!, $listingId: ID!, $sessionId: ID!) {
                    session(vendorId: $vendorId, listingId: $listingId, sessionId: $sessionId) {
                        date,
                        time { start end }
                    }
                }`, { vendorId: merchantId, listingId: params.tourId, sessionId: params.sessionId }
            );
            return {
                start: DateTime.fromISO(`${session.date}T${session.time.start}`),
                end: DateTime.fromISO(`${session.date}T${session.time.end}`)
            };
        },
        enabled: !!merchantId && !!params.tourId && !!params.sessionId,
        staleTime: 60000,
    });

    // Track whether we're past session start for no-show highlighting
    const [now, setNow] = useState(DateTime.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(DateTime.now()), 30000);
        return () => clearInterval(interval);
    }, []);

    const sessionStarted = sessionTimeQuery.data ? now >= sessionTimeQuery.data.start : false;
    const sessionEnded = sessionTimeQuery.data ? now >= sessionTimeQuery.data.end : false;

    const [confirmCancel, setConfirmCancel] = useState<booking_type | null>(null);

    const markBookingAsPaid = UseMarkBookingPaid(sessionRef)
    const createPaymentLink = UseCreatePaymentLink(sessionRef)
    const checkInBooking = UseCheckInBooking(sessionRef)
    const cancelBooking = UseCancelBooking(sessionRef)

    const handleCheckIn = async (booking: booking_type) => {
        if (!booking.code) return;

        try {
            await checkInBooking.mutateAsync({
                bookingCode: booking.code,
                sessionId: params.sessionId,
                vendorId: merchantId
            });
        } catch (error) {
            console.error("Failed to check in booking:", error);
        }
    };

    const handleCheckInAll = async () => {
        const uncheckedBookings = allBookings.filter(b => b.checkedIn == null && b.code);
        for (const booking of uncheckedBookings) {
            try {
                await checkInBooking.mutateAsync({
                    bookingCode: booking.code!,
                    sessionId: params.sessionId,
                    vendorId: merchantId
                });
            } catch (error) {
                console.error("Failed to check in booking:", error);
            }
        }
    };

    const allBookings = sessionWithBookings.data == null ? [] : sessionWithBookings.data;

    const filteredBookings = useMemo(() => {
        let result = allBookings;

        // Filter
        if (searchFilter.trim()) {
            const term = searchFilter.toLowerCase();
            result = result.filter(b =>
                `${b.user?.firstname} ${b.user?.lastname}`.toLowerCase().includes(term) ||
                b.customerEmail?.toLowerCase().includes(term) ||
                b.code?.toLowerCase().includes(term)
            );
        }

        // Sort
        if (sortMode === 'name') {
            result = [...result].sort((a, b) => {
                const nameA = `${a.user?.lastname || ''} ${a.user?.firstname || ''}`.toLowerCase();
                const nameB = `${b.user?.lastname || ''} ${b.user?.firstname || ''}`.toLowerCase();
                return nameA.localeCompare(nameB);
            });
        } else if (sortMode === 'status') {
            result = [...result].sort((a, b) => {
                // Unchecked first, then checked in
                if (a.checkedIn == null && b.checkedIn != null) return -1;
                if (a.checkedIn != null && b.checkedIn == null) return 1;
                return 0;
            });
        }

        return result;
    }, [allBookings, searchFilter, sortMode]);

    const summary = useMemo(() => {
        const total = allBookings.length;
        const checkedIn = allBookings.filter(b => b.checkedIn != null).length;
        const paid = allBookings.filter(b => isBookingPaid(b)).length;
        const unpaid = total - paid;
        const unchecked = allBookings.filter(b => b.checkedIn == null).length;
        const noShows = sessionStarted ? allBookings.filter(b => b.checkedIn == null && isBookingPaid(b)).length : 0;
        return { total, checkedIn, paid, unpaid, unchecked, noShows };
    }, [allBookings, sessionStarted]);

    const exportBookingsCsv = () => {
        const rows = [
            ['Name', 'Email', 'Phone', 'Code', 'Tickets', 'Paid', 'Checked In', 'Check-in Time'],
            ...allBookings.map(b => [
                `${b.user?.firstname || ''} ${b.user?.lastname || ''}`.trim(),
                b.customerEmail || '',
                (b.user as any)?.phone || '',
                b.code || '',
                (b.sessions?.[0]?.tickets || []).map((t: any) => `${t.quantity}x ${t.variantId}`).join('; '),
                isBookingPaid(b) ? 'Yes' : 'No',
                b.checkedIn ? 'Yes' : 'No',
                b.checkedIn?.datetime ? format(new Date(b.checkedIn.datetime), 'h:mm a') : '',
            ])
        ];
        const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bookings-${params.sessionId}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return {
        createManualBookingOpen,
        setCreateManualBookingOpen,
        exportBookingsCsv,
        confirmCancel,
        setConfirmCancel,
        cancelBooking,
        merchantId,
        sessionRef,
        bookings: filteredBookings,
        allBookings,
        summary,
        searchFilter,
        setSearchFilter,
        sortMode,
        setSortMode,
        selectedOrderRef: {
            get: selectedOrderRef,
            set: setSelectedOrderRef
        },
        updateBooking: {
            get: updateBooking,
            set: setUpdateBooking
        },
        confirmMarkPaid,
        setConfirmMarkPaid,
        markBookingAsPaid,
        createPaymentLink,
        showChat,
        setShowChat,
        handleCheckIn,
        handleCheckInAll,
        isCheckingIn: checkInBooking.isPending,
        sessionStarted,
        sessionEnded,
        sessionTime: sessionTimeQuery.data
    }
}

/** Booking summary badges shown above the booking list */
const BookingSummary: React.FC<{ summary: { total: number; checkedIn: number; paid: number; unpaid: number; noShows: number } }> = ({ summary }) => (
    <div className="flex flex-wrap gap-2" data-testid="booking-summary">
        <Badge variant="secondary" className="gap-1 text-sm py-1">
            <Users className="w-3.5 h-3.5" />
            {summary.total} bookings
        </Badge>
        <Badge variant="success" className="gap-1 text-sm py-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {summary.checkedIn} checked in
        </Badge>
        {summary.unpaid > 0 && (
            <Badge variant="danger" className="gap-1 text-sm py-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {summary.unpaid} unpaid
            </Badge>
        )}
        {summary.noShows > 0 && (
            <Badge variant="warning" className="gap-1 text-sm py-1" data-testid="no-show-badge">
                <AlertCircle className="w-3.5 h-3.5" />
                {summary.noShows} no-show{summary.noShows !== 1 ? 's' : ''}
            </Badge>
        )}
    </div>
);

/** Format checked-in datetime consistently */
const formatCheckedInTime = (datetime: string) => {
    try {
        return format(new Date(datetime), "h:mm a");
    } catch {
        return datetime;
    }
};

const SessionOnBooking : React.FC = () => {
    const bl = useBL();

    return (
    <>
        {/* Main layout — single responsive view that works on mobile, iPad, and desktop */}
        <div className="h-full flex flex-col">
            {/* Top bar: summary + actions */}
            <div className="flex flex-col gap-3 mb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <BookingSummary summary={bl.summary} />
                    <div className="flex flex-row gap-2">
                        {/* Check in all — only when there are unchecked bookings */}
                        {bl.summary.unchecked > 0 && (
                            <Button
                                variant="outline"
                                className="h-11"
                                onClick={bl.handleCheckInAll}
                                disabled={bl.isCheckingIn}
                                data-testid="check-in-all-btn"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Check in all ({bl.summary.unchecked})
                            </Button>
                        )}
                        {bl.allBookings.length > 0 && (
                            <Button
                                variant="outline"
                                className="h-11"
                                onClick={bl.exportBookingsCsv}
                                data-testid="export-bookings-btn"
                            >
                                <Download className="w-4 h-4 mr-1" />
                                Export
                            </Button>
                        )}
                        <Dialog open={bl.createManualBookingOpen} onOpenChange={bl.setCreateManualBookingOpen}>
                            <DialogTrigger asChild>
                                <Button variant="default" className="h-11" data-testid="create-booking-btn">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Create booking
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="flex flex-col p-8 max-w-lg max-h-[90vh] overflow-y-auto">
                                {bl.sessionRef != null && (
                                    <NewSessionOnBooking sessionRef={bl.sessionRef} />
                                )}
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Search + Sort controls */}
                {bl.allBookings.length > 0 && (
                    <div className="flex flex-row gap-2 items-center">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or code..."
                                value={bl.searchFilter}
                                onChange={(e) => bl.setSearchFilter(e.target.value)}
                                className="pl-9 h-11 text-base"
                                data-testid="booking-search-input"
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-11 gap-1" data-testid="sort-bookings-btn">
                                    <ArrowUpDown className="w-4 h-4" />
                                    <span className="hidden sm:inline">Sort</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => bl.setSortMode('default')}>
                                    Default order {bl.sortMode === 'default' && '✓'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => bl.setSortMode('name')}>
                                    By name (A-Z) {bl.sortMode === 'name' && '✓'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => bl.setSortMode('status')}>
                                    Unchecked first {bl.sortMode === 'status' && '✓'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-2 flex-grow">
                {/* Bookings panel */}
                <Panel className="flex-grow">
                    {bl.allBookings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" data-testid="no-bookings-empty-state">
                            <Users className="w-10 h-10 mb-3 opacity-40" />
                            <p className="text-base font-medium">No bookings yet</p>
                            <p className="text-sm mt-1">Create a manual booking or wait for customers to book online.</p>
                        </div>
                    ) : bl.bookings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Search className="w-8 h-8 mb-2 opacity-40" />
                            <p className="text-base">No bookings match &quot;{bl.searchFilter}&quot;</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop/iPad table — hidden on small phones */}
                            <Table className="hidden sm:table" data-testid="bookings-table">
                                <TableHeader>
                                    <TableRow className="text-sm">
                                        <TableHead> Guest </TableHead>
                                        <TableHead className="text-center"> Status </TableHead>
                                        <TableHead className="text-center"> Balance </TableHead>
                                        <TableHead className="text-center"> Actions </TableHead>
                                        <TableHead className="text-center hidden md:table-cell"> Contact </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bl.bookings.map(booking => {
                                        const isNoShow = bl.sessionStarted && booking.checkedIn == null && isBookingPaid(booking);
                                        return (
                                        <TableRow key={booking.id} className={isNoShow ? "bg-yellow-50" : ""} data-testid={`booking-row-${booking.id}`}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm md:text-base">
                                                        {booking.user?.firstname} {booking.user?.lastname}
                                                    </span>
                                                    <span className="text-xs md:text-sm text-muted-foreground">
                                                        {booking.customerEmail}
                                                    </span>
                                                    {booking.code && (
                                                        <span className="text-xs font-mono text-muted-foreground">
                                                            #{booking.code}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {booking.checkedIn == null ? (
                                                    <Button
                                                        variant="default"
                                                        className="h-11 px-4"
                                                        onClick={() => bl.handleCheckIn(booking)}
                                                        disabled={bl.isCheckingIn}
                                                        data-testid={`check-in-${booking.id}`}
                                                    >
                                                        Check In
                                                    </Button>
                                                ) : (
                                                    <Badge variant="success" className="text-sm py-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                        {formatCheckedInTime(booking.checkedIn.datetime)}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    "text-center text-sm",
                                                    isBookingPaid(booking) ? "text-green-800" : "text-red-800 font-bold"
                                                )}
                                                data-testid={`booking-balance-${booking.id}`}
                                            >
                                                {isBookingPaid(booking)
                                                    ? <span>Paid</span>
                                                    : <CurrencySpan defaultLabel="" delay={500} value={getAmountDue(booking)} />
                                                }
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col items-center gap-1" data-testid={`booking-actions-${booking.id}`}>
                                                    {!isBookingPaid(booking) ? (
                                                        <>
                                                            {booking.order && booking.payment_link != null
                                                                ? <CopyButton textToCopy={`${typeof window !== 'undefined' ? window.location.origin : ''}/${booking.payment_link}`}>Copy payment link</CopyButton>
                                                                : booking.order && <Button variant="link" className="h-11" onClick={() => bl.createPaymentLink.mutation.mutate(booking.ref)} data-testid={`create-payment-link-${booking.id}`}>Create Payment Link</Button>}
                                                            <div className="flex gap-2">
                                                                <Button type="button" variant="link" className="h-11" onClick={() => bl.setConfirmMarkPaid(booking)} data-testid={`mark-paid-${booking.id}`}>Mark paid</Button>
                                                                <Button variant="link" className="h-11" onClick={() => bl.updateBooking.set(booking)} data-testid={`update-booking-${booking.id}`}>Update</Button>
                                                                <Button variant="link" className="h-11 text-red-500 hover:text-red-600" onClick={() => bl.setConfirmCancel(booking)} data-testid={`cancel-booking-${booking.id}`}>Cancel</Button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <Button variant="link" className="h-11" onClick={() => bl.updateBooking.set(booking)} data-testid={`change-booking-${booking.id}`}>
                                                            Change
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <div className="flex gap-1 justify-center">
                                                    {booking.user?.phoneNumber?.displayAs && (
                                                        <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
                                                            <a href={`tel:${booking.user.phoneNumber.displayAs}`} data-testid={`call-${booking.id}`}>
                                                                <Phone className="h-5 w-5" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {booking.customerEmail && (
                                                        <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
                                                            <a href={`mailto:${booking.customerEmail}`} data-testid={`email-${booking.id}`}>
                                                                <Mail className="h-5 w-5" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {booking.order && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-11 w-11"
                                                            onClick={() => {
                                                                bl.selectedOrderRef.set(booking.order!.ref);
                                                                bl.setShowChat(true);
                                                            }}
                                                            data-testid={`message-${booking.id}`}
                                                        >
                                                            <MessageCircle className="h-5 w-5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {/* Mobile card list — phones only */}
                            <ul className="sm:hidden space-y-2" data-testid="bookings-mobile-list">
                                {bl.bookings.map(booking => (
                                    <li key={booking.ref.id} className="border bg-card rounded-lg p-3" data-testid={`mobile-booking-row-${booking.id}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <span className="font-medium text-base">
                                                    {booking.user?.firstname} {booking.user?.lastname}
                                                </span>
                                                {booking.code && (
                                                    <span className="text-xs font-mono text-muted-foreground ml-2">#{booking.code}</span>
                                                )}
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => bl.updateBooking.set(booking)} data-testid={`mobile-edit-${booking.id}`}>
                                                <Pencil size={18} />
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {/* Payment status */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "text-sm h-11",
                                                            isBookingPaid(booking)
                                                                ? "text-green-800 border-green-300 bg-green-50"
                                                                : "text-red-600 border-red-300 bg-red-50"
                                                        )}
                                                        data-testid={`mobile-payment-status-${booking.id}`}
                                                    >
                                                        <ChevronDownCircleIcon size={16} className="mr-1" />
                                                        {isBookingPaid(booking)
                                                            ? "Paid"
                                                            : <CurrencySpan defaultLabel="" value={getAmountDue(booking)} delay={500} />
                                                        }
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    {!isBookingPaid(booking) && (
                                                        <DropdownMenuItem onClick={() => bl.setConfirmMarkPaid(booking)}>
                                                            Mark as paid
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={() => bl.updateBooking.set(booking)}>
                                                        Edit booking
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-500" onClick={() => bl.setConfirmCancel(booking)}>
                                                        Cancel booking
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            {/* Check-in */}
                                            <Button
                                                variant={booking.checkedIn ? "secondary" : "default"}
                                                className={cn("text-sm h-11", booking.checkedIn && "bg-green-100 text-green-800")}
                                                onClick={() => !booking.checkedIn && bl.handleCheckIn(booking)}
                                                disabled={bl.isCheckingIn || !!booking.checkedIn}
                                                data-testid={`mobile-checkin-${booking.id}`}
                                            >
                                                {booking.checkedIn ? (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                                        {formatCheckedInTime(booking.checkedIn.datetime)}
                                                    </>
                                                ) : "Check in"}
                                            </Button>

                                            {/* Contact — only show if there's at least one contact method */}
                                            {(booking.user?.phoneNumber?.displayAs || booking.customerEmail) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" className="h-11 w-11 p-0">
                                                            <MessageCircle size={18} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        {booking.user?.phoneNumber?.displayAs && (
                                                            <DropdownMenuItem asChild>
                                                                <a href={`tel:${booking.user.phoneNumber.displayAs}`}>
                                                                    <Phone className="h-4 w-4 mr-2" /> Call
                                                                </a>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {booking.customerEmail && (
                                                            <DropdownMenuItem asChild>
                                                                <a href={`mailto:${booking.customerEmail}`}>
                                                                    <Mail className="h-4 w-4 mr-2" /> Email
                                                                </a>
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </Panel>

                {/* Chat panel — only shows when a customer is selected, collapsible */}
                {bl.showChat && bl.selectedOrderRef.get != null && (
                    <Panel className="lg:w-2/5 lg:max-w-md">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Customer Chat</span>
                            <Button
                                variant="ghost"
                                className="h-11"
                                onClick={() => {
                                    bl.setShowChat(false);
                                    bl.selectedOrderRef.set(null);
                                }}
                                data-testid="close-chat-btn"
                            >
                                Close
                            </Button>
                        </div>
                        <ChatControl
                            allowResponseCodes={false}
                            merchantId={bl.merchantId}
                            vendorSettings={{ withUserName: false, withCompanyLogo: false, withCompanyName: false }}
                            forObject={bl.selectedOrderRef.get}
                            withDiscussion={true}
                            defaultMode={CommunicationModeType.PLATFORM}
                            withAttachments={true}
                        />
                    </Panel>
                )}
            </div>

            {/* Update booking dialog */}
            <Dialog open={bl.updateBooking.get != null} onOpenChange={() => bl.updateBooking.set(null)}>
                <DialogContent className="flex flex-col p-8 min-w-[450px] max-w-[95vw] min-h-[330px] mt-2">
                    {bl.updateBooking.get != null &&
                        <UpdateSessionOnBooking
                            sessionRef={bl.sessionRef}
                            bookingRef={bl.updateBooking.get.ref as recordref_type}
                            order={bl.updateBooking.get.order}
                        />
                    }
                </DialogContent>
            </Dialog>

            {/* Confirm mark-as-paid dialog */}
            <Dialog open={bl.confirmMarkPaid != null} onOpenChange={() => bl.setConfirmMarkPaid(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Mark as paid?</DialogTitle>
                        <DialogDescription>
                            This will mark the booking for{' '}
                            <span className="font-medium text-foreground">
                                {bl.confirmMarkPaid?.user?.firstname} {bl.confirmMarkPaid?.user?.lastname}
                            </span>{' '}
                            as paid. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" className="h-11" onClick={() => bl.setConfirmMarkPaid(null)}>Cancel</Button>
                        <Button
                            className="h-11"
                            data-testid="confirm-mark-paid-btn"
                            onClick={() => {
                                if (bl.confirmMarkPaid) {
                                    bl.markBookingAsPaid.mutation.mutate(bl.confirmMarkPaid.ref);
                                    bl.setConfirmMarkPaid(null);
                                }
                            }}
                        >
                            Yes, mark as paid
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Confirm cancel booking dialog */}
            <Dialog open={bl.confirmCancel != null} onOpenChange={() => bl.setConfirmCancel(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Cancel booking?</DialogTitle>
                        <DialogDescription>
                            This will cancel the booking for{' '}
                            <span className="font-medium text-foreground">
                                {bl.confirmCancel?.user?.firstname} {bl.confirmCancel?.user?.lastname}
                            </span>
                            . If they paid online, a refund will be initiated via Stripe.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" className="h-11" onClick={() => bl.setConfirmCancel(null)}>Keep Booking</Button>
                        <Button
                            variant="destructive"
                            className="h-11"
                            data-testid="confirm-cancel-booking-btn"
                            disabled={bl.cancelBooking.isPending}
                            onClick={async () => {
                                if (bl.confirmCancel) {
                                    await bl.cancelBooking.mutateAsync({
                                        bookingRef: bl.confirmCancel.ref,
                                        vendorId: bl.merchantId,
                                        reason: 'Cancelled by merchant'
                                    });
                                    bl.setConfirmCancel(null);
                                }
                            }}
                        >
                            {bl.cancelBooking.isPending ? 'Cancelling...' : 'Cancel Booking'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    </>
    )
}

export default SessionOnBooking;
