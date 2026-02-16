'use client';

import { useState, useMemo } from 'react';
import { MessageCircle, Plus, CheckCircle2, Clock, Feather, Wind, Heart, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Panel } from '@/components/ui/panel';
import { format, formatDistanceToNow } from 'date-fns';
import useSpiritMessages, { SpiritMessage } from '../hooks/useSpiritMessages';
import { SpiritMessageForm } from './components/SpiritMessageForm';
import { SpiritMessageHistory } from './components/SpiritMessageHistory';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SpiritMessage | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<SpiritMessage | null>(null);

  const { data: entries, isLoading } = useSpiritMessages(userId);

  const handleEdit = (entry: SpiritMessage) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  // Group messages by source
  const messagesBySource = useMemo(() => {
    if (!entries) return {};
    return entries.reduce((acc, msg) => {
      const source = msg.sourceName || msg.source || 'Unknown Source';
      if (!acc[source]) acc[source] = [];
      acc[source].push(msg);
      return acc;
    }, {} as Record<string, SpiritMessage[]>);
  }, [entries]);

  // Get recent validated messages
  const recentValidated = useMemo(() => {
    if (!entries) return [];
    return entries.filter(e => e.validated).slice(0, 3);
  }, [entries]);

  // Most recent message
  const mostRecent = entries?.[0];

  return (
    <div className="min-h-screen-minus-nav">
      {/* Ethereal Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-blue-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-indigo-500/20">
            <MessageCircle className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Spirit Messages</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            A sacred record of communications received from those in spirit
          </p>
        </div>

        {/* Empty State */}
        {!isLoading && (!entries || entries.length === 0) && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl" />
              <div className="relative p-10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl border border-indigo-500/10 backdrop-blur-xl">
                <Wind className="w-12 h-12 text-indigo-400/40 mx-auto mb-2" />
                <Feather className="w-6 h-6 text-violet-400/40 absolute bottom-6 right-6 rotate-12" />
              </div>
            </div>
            <h2 className="text-2xl font-light text-white mb-3">Your Message Journal</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
              Record messages you receive from spirit through meditation, dreams, readings,
              or spontaneous knowing. Over time, you&apos;ll see patterns in how spirit communicates with you.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30 hover:scale-105"
            >
              <Feather className="w-5 h-5 mr-2" />
              Record Your First Message
            </Button>
          </div>
        )}

        {/* Active State */}
        {!isLoading && entries && entries.length > 0 && (
          <>
            {/* Validation Celebration */}
            {recentValidated.length > 0 && (
              <div className="mb-8 p-5 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 rounded-2xl border border-green-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">Messages Validated</h3>
                    <p className="text-slate-400 text-sm">
                      {recentValidated.length === 1
                        ? `Your message about "${recentValidated[0].messageContent.slice(0, 50)}..." was confirmed.`
                        : `${recentValidated.length} of your messages have been validated. Trust your connection.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action + Last Message */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Record New */}
              <button
                onClick={() => setShowForm(true)}
                className="group p-6 bg-gradient-to-br from-indigo-600/20 to-violet-600/20 rounded-2xl border border-indigo-500/30 hover:border-indigo-500/50 transition-all hover:scale-[1.02] text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-indigo-500/30 rounded-lg group-hover:bg-indigo-500/40 transition-colors">
                    <Plus className="w-5 h-5 text-indigo-300" />
                  </div>
                  <span className="text-white font-medium">Record Message</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Received a message? Write it down while it&apos;s fresh.
                </p>
              </button>

              {/* Last Message Card */}
              {mostRecent && (
                <button
                  onClick={() => setSelectedMessage(mostRecent)}
                  className="group p-6 bg-slate-800/50 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all text-left col-span-1 md:col-span-2"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{formatDistanceToNow(new Date(mostRecent.date), { addSuffix: true })}</span>
                      {mostRecent.validated && (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Validated
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  {mostRecent.sourceName && (
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-3 h-3 text-rose-400" />
                      <span className="text-rose-400 text-sm">{mostRecent.sourceName}</span>
                    </div>
                  )}
                  <p className="text-white line-clamp-2">&ldquo;{mostRecent.messageContent}&rdquo;</p>
                </button>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-6 mb-8 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <MessageCircle className="w-4 h-4 text-indigo-400" />
                <span><strong className="text-white">{entries.length}</strong> messages recorded</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span><strong className="text-white">{entries.filter(e => e.validated).length}</strong> validated</span>
              </div>
              {Object.keys(messagesBySource).length > 1 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span><strong className="text-white">{Object.keys(messagesBySource).length}</strong> sources</span>
                </div>
              )}
            </div>

            {/* Messages List */}
            <div className="bg-slate-800/30 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-white font-medium">Your Messages</h2>
              </div>
              <SpiritMessageHistory
                entries={entries}
                onEdit={handleEdit}
                onView={setSelectedMessage}
                isLoading={isLoading}
                userId={userId}
              />
            </div>
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
              <MessageCircle className="relative w-12 h-12 text-indigo-400 animate-pulse" />
            </div>
            <p className="text-slate-400 mt-4">Loading your messages...</p>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="border-indigo-500/20 sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Feather className="w-5 h-5 text-indigo-400" />
              {editingEntry ? 'Edit Message' : 'What Did You Receive?'}
            </DialogTitle>
          </DialogHeader>

          <SpiritMessageForm
            userId={userId}
            existingEntry={editingEntry}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="border-indigo-500/20 sm:max-w-lg">
          {selectedMessage && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Clock className="w-4 h-4" />
                    {format(new Date(selectedMessage.date), 'MMMM d, yyyy')}
                  </div>
                  {selectedMessage.validated && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Validated
                    </Badge>
                  )}
                </div>
                {selectedMessage.sourceName && (
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <span className="text-rose-400">From {selectedMessage.sourceName}</span>
                  </div>
                )}
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* The Message */}
                <div className="p-5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <Sparkles className="w-4 h-4 text-indigo-400 mb-2" />
                  <p className="text-white leading-relaxed italic">
                    &ldquo;{selectedMessage.messageContent}&rdquo;
                  </p>
                </div>

                {/* How Received */}
                {selectedMessage.receptionMethod && (
                  <div className="text-sm">
                    <span className="text-slate-500">Received through:</span>{' '}
                    <span className="text-slate-300">{selectedMessage.receptionMethod}</span>
                  </div>
                )}

                {/* Context */}
                {selectedMessage.receptionContext && (
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Context</div>
                    <p className="text-slate-300 text-sm">{selectedMessage.receptionContext}</p>
                  </div>
                )}

                {/* Your Interpretation */}
                {selectedMessage.interpretation && (
                  <Panel dark className="p-4 rounded-xl">
                    <div className="text-sm text-slate-500 mb-1">Your Interpretation</div>
                    <p className="text-slate-300 text-sm">{selectedMessage.interpretation}</p>
                  </Panel>
                )}

                {/* Validation Notes */}
                {selectedMessage.validated && selectedMessage.validationNotes && (
                  <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                    <div className="text-sm text-green-400 mb-1">Validation</div>
                    <p className="text-slate-300 text-sm">{selectedMessage.validationNotes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedMessage(null);
                      handleEdit(selectedMessage);
                    }}
                    className="flex-1 border-slate-700 hover:bg-slate-800"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => setSelectedMessage(null)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
