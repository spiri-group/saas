'use client';

import React, { useState, useEffect, useCallback } from "react";
import { Panel, PanelHeader, PanelTitle, PanelDescription } from "@/components/ux/Panel";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save } from "lucide-react";

type Props = {
    sessionId: string;
    tourId: string;
};

const STORAGE_KEY_PREFIX = "spiri-session-notes";

const SessionNotes: React.FC<Props> = ({ sessionId, tourId }) => {
    const storageKey = `${STORAGE_KEY_PREFIX}-${tourId}-${sessionId}`;
    const [notes, setNotes] = useState("");
    const [saved, setSaved] = useState(false);

    // Load notes from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) setNotes(stored);
        } catch {
            // localStorage unavailable
        }
    }, [storageKey]);

    // Auto-save with debounce
    const saveNotes = useCallback((value: string) => {
        try {
            localStorage.setItem(storageKey, value);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            // localStorage unavailable
        }
    }, [storageKey]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (notes) saveNotes(notes);
        }, 1000);
        return () => clearTimeout(timeout);
    }, [notes, saveNotes]);

    return (
        <Panel dark>
            <PanelHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <PanelTitle as="h2">Session Notes</PanelTitle>
                        <PanelDescription>
                            Private notes for this session. Auto-saved to this device.
                        </PanelDescription>
                    </div>
                    {saved && (
                        <Badge variant="success" className="gap-1" data-testid="notes-saved-badge">
                            <Save className="w-3 h-3" />
                            Saved
                        </Badge>
                    )}
                </div>
            </PanelHeader>
            <Textarea
                placeholder="Weather conditions, special instructions, equipment notes, group observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[200px] text-base"
                aria-label="Session notes"
                data-testid="session-notes-textarea"
            />
        </Panel>
    );
};

export default SessionNotes;
