'use client';

import React, { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader, PanelTitle, PanelDescription } from "@/components/ux/Panel";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Download, CheckCircle2 } from "lucide-react";
import { recordref_type } from "@/utils/spiriverse";
import UseSessionBookings from "./SessionOnBooking/hooks/UseSessionBookings";
import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { session_type } from "@/utils/spiriverse";
import { DateTime } from "luxon";
import { isBookingPaid } from "../utils";

type Props = {
    sessionRef: recordref_type;
    merchantId: string;
    tourId: string;
    sessionId: string;
};

const ManifestPrintView: React.FC<Props> = ({ sessionRef, merchantId, tourId, sessionId }) => {
    const { data: bookings } = UseSessionBookings(sessionRef);

    const sessionQuery = useQuery({
        queryKey: ['session-header', merchantId, tourId, sessionId],
        queryFn: async () => {
            const { session } = await gql<{ session: session_type }>(
                `query get_session($vendorId: ID!, $listingId: ID!, $sessionId: ID!) {
                    session(vendorId: $vendorId, listingId: $listingId, sessionId: $sessionId) {
                        sessionTitle, date, time { start end }
                    }
                }`, { vendorId: merchantId, listingId: tourId, sessionId }
            );
            return {
                title: session.sessionTitle,
                date: DateTime.fromISO(session.date).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY),
                startTime: DateTime.fromISO(`${session.date}T${session.time.start}`).toLocaleString(DateTime.TIME_SIMPLE),
                endTime: DateTime.fromISO(`${session.date}T${session.time.end}`).toLocaleString(DateTime.TIME_SIMPLE),
            };
        },
        enabled: !!merchantId && !!tourId && !!sessionId,
        staleTime: 60000,
    });

    const sortedBookings = useMemo(() => {
        if (!bookings) return [];
        return [...bookings].sort((a, b) => {
            const nameA = `${a.user?.lastname || ''} ${a.user?.firstname || ''}`.toLowerCase();
            const nameB = `${b.user?.lastname || ''} ${b.user?.firstname || ''}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }, [bookings]);

    const handlePrint = useCallback(() => {
        if (!sortedBookings.length || !sessionQuery.data) return;

        const session = sessionQuery.data;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Guest List - ${session.title}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: #1a1a1a; }
                    h1 { font-size: 20px; margin-bottom: 4px; }
                    .subtitle { font-size: 14px; color: #666; margin-bottom: 16px; }
                    .stats { display: flex; gap: 16px; margin-bottom: 16px; font-size: 13px; }
                    .stats span { background: #f3f4f6; padding: 4px 10px; border-radius: 4px; }
                    table { width: 100%; border-collapse: collapse; font-size: 13px; }
                    th { text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb; font-weight: 600; }
                    td { padding: 8px; border-bottom: 1px solid #f3f4f6; }
                    tr:nth-child(even) { background: #fafafa; }
                    .check-col { width: 40px; text-align: center; }
                    .check-box { width: 18px; height: 18px; border: 2px solid #d1d5db; border-radius: 3px; display: inline-block; }
                    .checked { background: #22c55e; border-color: #22c55e; }
                    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
                    .badge-paid { background: #dcfce7; color: #166534; }
                    .badge-unpaid { background: #fef2f2; color: #991b1b; }
                    .footer { margin-top: 20px; font-size: 11px; color: #9ca3af; text-align: center; }
                    @media print { body { padding: 10px; } }
                </style>
            </head>
            <body>
                <h1>${session.title}</h1>
                <div class="subtitle">${session.date} &bull; ${session.startTime} - ${session.endTime}</div>
                <div class="stats">
                    <span><strong>${sortedBookings.length}</strong> guests</span>
                    <span><strong>${sortedBookings.filter(b => b.checkedIn).length}</strong> checked in</span>
                    <span><strong>${sortedBookings.filter(b => !isBookingPaid(b)).length}</strong> unpaid</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th class="check-col"></th>
                            <th>#</th>
                            <th>Guest Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Code</th>
                            <th>Status</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedBookings.map((b, i) => `
                            <tr>
                                <td class="check-col">
                                    <span class="check-box ${b.checkedIn ? 'checked' : ''}"></span>
                                </td>
                                <td>${i + 1}</td>
                                <td><strong>${b.user?.firstname || ''} ${b.user?.lastname || ''}</strong></td>
                                <td>${b.customerEmail || ''}</td>
                                <td>${b.user?.phoneNumber?.displayAs || ''}</td>
                                <td style="font-family: monospace">${b.code || ''}</td>
                                <td><span class="badge ${isBookingPaid(b) ? 'badge-paid' : 'badge-unpaid'}">${isBookingPaid(b) ? 'Paid' : 'Unpaid'}</span></td>
                                <td>${b.notes || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    Printed ${DateTime.now().toLocaleString(DateTime.DATETIME_MED)} &bull; SpiriVerse
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 250);
        }
    }, [sortedBookings, sessionQuery.data]);

    const handleExportCSV = useCallback(() => {
        if (!sortedBookings.length || !sessionQuery.data) return;

        const session = sessionQuery.data;

        const escapeCSV = (str: string) => {
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const rows = [
            ['#', 'First Name', 'Last Name', 'Email', 'Phone', 'Code', 'Paid', 'Checked In', 'Notes'],
            ...sortedBookings.map((b, i) => [
                String(i + 1),
                escapeCSV(b.user?.firstname || ''),
                escapeCSV(b.user?.lastname || ''),
                escapeCSV(b.customerEmail || ''),
                escapeCSV(b.user?.phoneNumber?.displayAs || ''),
                b.code || '',
                isBookingPaid(b) ? 'Yes' : 'No',
                b.checkedIn ? 'Yes' : 'No',
                escapeCSV(b.notes || ''),
            ])
        ];

        const csv = rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `guest-list-${session.title?.replace(/\s+/g, '-').toLowerCase()}-${session.date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [sortedBookings, sessionQuery.data]);

    const totalGuests = bookings?.length || 0;

    return (
        <div className="space-y-4">
            <Panel dark>
                <PanelHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <PanelTitle as="h2">Guest List</PanelTitle>
                            <PanelDescription>
                                {totalGuests} guest{totalGuests !== 1 ? 's' : ''} for this session
                            </PanelDescription>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handlePrint}
                                disabled={!bookings || bookings.length === 0}
                                className="h-11 gap-2"
                                data-testid="print-manifest-btn"
                            >
                                <Printer className="w-5 h-5" />
                                Print
                            </Button>
                            <Button
                                onClick={handleExportCSV}
                                disabled={!bookings || bookings.length === 0}
                                variant="outline"
                                className="h-11 gap-2"
                                data-testid="export-csv-btn"
                            >
                                <Download className="w-5 h-5" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </PanelHeader>

                {/* Inline guest list preview */}
                {sortedBookings.length > 0 && (
                    <Table className="mt-2" data-testid="guest-list-preview">
                        <TableHeader>
                            <TableRow className="text-sm">
                                <TableHead className="w-8">#</TableHead>
                                <TableHead>Guest</TableHead>
                                <TableHead className="hidden md:table-cell">Email</TableHead>
                                <TableHead className="hidden md:table-cell">Phone</TableHead>
                                <TableHead className="text-center">Checked In</TableHead>
                                <TableHead className="text-center">Paid</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedBookings.map((b, i) => (
                                <TableRow key={b.id}>
                                    <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                                    <TableCell>
                                        <span className="font-medium text-sm">
                                            {b.user?.firstname} {b.user?.lastname}
                                        </span>
                                        {b.code && (
                                            <span className="text-xs font-mono text-muted-foreground ml-2">#{b.code}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                        {b.customerEmail}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                        {b.user?.phoneNumber?.displayAs}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {b.checkedIn ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={isBookingPaid(b) ? 'success' : 'danger'}>
                                            {isBookingPaid(b) ? 'Paid' : 'Unpaid'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {totalGuests === 0 && (
                    <p className="text-sm text-muted-foreground mt-4">No guests to display.</p>
                )}
            </Panel>
        </div>
    );
};

export default ManifestPrintView;
