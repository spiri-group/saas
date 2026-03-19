'use client';

import { useState, useEffect } from 'react';
import { Pin, PinOff, Trash2, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
    AccountNote,
    useAddAccountNote,
    useDeleteAccountNote,
    useTogglePinAccountNote,
} from '../hooks/UseAccountNotes';

const QUICK_NOTES = [
    'Company is',
    'Phone is',
    'Met at',
    'Interested in',
    'Follow up:',
    'Referred by',
];

interface AccountNotesProps {
    accountId: string;
    accountType: 'vendor' | 'customer';
    notes: AccountNote[];
}

export default function AccountNotes({ accountId, accountType, notes }: AccountNotesProps) {
    const [value, setValue] = useState('');
    const [activeQuickNote, setActiveQuickNote] = useState<string | null>(null);
    const [localNotes, setLocalNotes] = useState<AccountNote[]>(notes);

    // Sync from props when parent data refreshes or account changes
    useEffect(() => {
        setLocalNotes(notes);
    }, [notes]);

    const addNote = useAddAccountNote();
    const deleteNote = useDeleteAccountNote();
    const togglePin = useTogglePinAccountNote();

    const handleAdd = async () => {
        const trimmed = value.trim();
        if (!trimmed) return;

        const content = activeQuickNote ? `${activeQuickNote} ${trimmed}` : trimmed;

        try {
            const result = await addNote.mutateAsync({
                accountId,
                accountType,
                note: { content },
            });
            if (result.success) {
                if (result.notes) setLocalNotes(result.notes);
                setValue('');
                setActiveQuickNote(null);
                toast.success('Note added');
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error('Failed to add note');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAdd();
        }
        if (e.key === 'Escape') {
            setActiveQuickNote(null);
            setValue('');
        }
    };

    const handleQuickNoteClick = (prefix: string) => {
        if (activeQuickNote === prefix) {
            setActiveQuickNote(null);
        } else {
            setActiveQuickNote(prefix);
            setValue('');
        }
    };

    const handleDelete = async (noteId: string) => {
        try {
            const result = await deleteNote.mutateAsync({ accountId, accountType, noteId });
            if (result.notes) setLocalNotes(result.notes);
        } catch {
            toast.error('Failed to delete note');
        }
    };

    const handleTogglePin = async (noteId: string) => {
        try {
            const result = await togglePin.mutateAsync({ accountId, accountType, noteId });
            if (result.notes) setLocalNotes(result.notes);
        } catch {
            toast.error('Failed to pin note');
        }
    };

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-white">Quick Notes</h3>

            {/* Quick note buttons */}
            <div className="flex flex-wrap gap-1.5">
                {QUICK_NOTES.map((prefix) => (
                    <button
                        key={prefix}
                        data-testid={`quick-note-${prefix.replace(/\s+/g, '-').toLowerCase()}`}
                        onClick={() => handleQuickNoteClick(prefix)}
                        className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                            activeQuickNote === prefix
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                        }`}
                    >
                        {prefix}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div className="flex gap-2">
                <div className="flex-1 min-w-0 relative">
                    {activeQuickNote && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-purple-400 pointer-events-none">
                            {activeQuickNote}
                        </span>
                    )}
                    <input
                        data-testid="note-input"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={activeQuickNote ? `Enter value...` : 'Type a note...'}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                        style={activeQuickNote ? { paddingLeft: `${activeQuickNote.length * 6.5 + 20}px` } : undefined}
                    />
                </div>
                <button
                    data-testid="add-note-btn"
                    onClick={handleAdd}
                    disabled={!value.trim() || addNote.isPending}
                    className="flex-shrink-0 h-9 w-9 rounded-lg bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    {addNote.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Plus className="h-3.5 w-3.5" />
                    )}
                </button>
            </div>

            {/* Notes list */}
            {localNotes.length > 0 && (
                <div className="space-y-1.5">
                    {localNotes.map((note) => (
                        <div
                            key={note.id}
                            data-testid={`note-${note.id}`}
                            className={`group flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                                note.pinned
                                    ? 'bg-amber-900/20 border border-amber-500/20'
                                    : 'bg-slate-800'
                            }`}
                        >
                            <div className="flex-1 min-w-0">
                                <span className="text-slate-200">{note.content}</span>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {note.createdBy} &middot; {new Date(note.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                                <button
                                    data-testid={`pin-note-${note.id}`}
                                    onClick={() => handleTogglePin(note.id)}
                                    className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                                    title={note.pinned ? 'Unpin' : 'Pin'}
                                >
                                    {note.pinned ? (
                                        <PinOff className="h-3 w-3" />
                                    ) : (
                                        <Pin className="h-3 w-3" />
                                    )}
                                </button>
                                <button
                                    data-testid={`delete-note-${note.id}`}
                                    onClick={() => handleDelete(note.id)}
                                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
