'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
    page: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}

export default function PaginationBar({ page, totalCount, pageSize, onPageChange }: PaginationBarProps) {
    if (totalCount <= pageSize) return null;

    const totalPages = Math.ceil(totalCount / pageSize);
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalCount);

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800" data-testid="pagination-bar">
            <span className="text-sm text-slate-400">
                Showing {start}-{end} of {totalCount}
            </span>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 0}
                    className="border-slate-700 hover:bg-slate-800"
                    data-testid="pagination-prev"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="ml-1">Previous</span>
                </Button>
                <span className="text-sm text-slate-400 px-2">
                    Page {page + 1} of {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="border-slate-700 hover:bg-slate-800"
                    data-testid="pagination-next"
                >
                    <span className="mr-1">Next</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
