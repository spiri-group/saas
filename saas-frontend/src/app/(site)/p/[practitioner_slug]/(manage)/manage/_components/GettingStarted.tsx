'use client';

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Sparkles, Lightbulb } from "lucide-react";
import Link from "next/link";

interface GettingStartedProps {
    slug: string;
    isOnboarded: boolean;
    hasServices: boolean;
    hasSchedule: boolean;
}

type ChecklistItemProps = {
    label: string;
    completed: boolean;
    onClick?: () => void;
    href?: string;
    testId: string;
};

const ChecklistItem: React.FC<ChecklistItemProps> = ({ label, completed, onClick, href, testId }) => {
    const Icon = completed ? CheckCircle2 : Circle;
    const content = (
        <div
            className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                completed
                    ? 'text-emerald-400'
                    : (href || onClick)
                        ? 'text-slate-300 hover:bg-white/10 cursor-pointer'
                        : 'text-slate-300'
            }`}
            data-testid={testId}
        >
            <Icon className={`w-5 h-5 flex-shrink-0 ${completed ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className={completed ? 'line-through text-slate-500' : ''}>{label}</span>
        </div>
    );

    if (onClick && !completed) {
        return <button onClick={onClick} className="w-full">{content}</button>;
    }

    if (href && !completed) {
        return <Link href={href}>{content}</Link>;
    }

    return content;
};

const GettingStarted: React.FC<GettingStartedProps> = ({ slug, isOnboarded, hasServices, hasSchedule }) => {
    if (isOnboarded) return null;

    const completedCount = [hasServices, hasSchedule].filter(Boolean).length;

    const handleCreateService = () => {
        const event = new CustomEvent("open-nav-external", {
            detail: {
                path: ["New Reading"],
                action: {
                    type: "dialog",
                    dialog: "Create Reading"
                }
            }
        });
        window.dispatchEvent(event);
    };

    return (
        <Card
            className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-purple-500/30 mb-6"
            data-testid="getting-started-checklist"
        >
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <CardTitle className="text-base text-white">Getting Started</CardTitle>
                    </div>
                    <span className="text-xs text-slate-400">{completedCount}/2 complete</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                    Complete these steps to start receiving bookings.
                </p>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-0.5">
                    <ChecklistItem
                        label="Create your first service (Reading, Healing, or Coaching)"
                        completed={hasServices}
                        onClick={handleCreateService}
                        testId="getting-started-services"
                    />
                    <ChecklistItem
                        label="Set your availability hours"
                        completed={hasSchedule}
                        href={`/p/${slug}/manage/availability`}
                        testId="getting-started-availability"
                    />
                </div>

                {/* Tip - not a checklist step */}
                <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-lg bg-white/5 text-slate-400 text-sm">
                    <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>
                        <Link href={`/p/${slug}/manage/readings`} className="text-purple-400 hover:text-purple-300">
                            Browse SpiriReadings
                        </Link>
                        {' '}to claim and fulfill reading requests
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};

export default GettingStarted;
