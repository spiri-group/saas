'use client';

import { useState } from 'react';
import { Wind, History, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MeditationForm, MeditationHistory, MeditationStats } from './components';
import { useMeditations, useMeditationStats, MeditationJournalEntry } from './hooks';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingMeditation, setEditingMeditation] = useState<MeditationJournalEntry | null>(null);

  const { data: meditations, isLoading } = useMeditations(userId);
  const { data: stats, isLoading: statsLoading } = useMeditationStats(userId);

  const handleEdit = (meditation: MeditationJournalEntry) => {
    setEditingMeditation(meditation);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingMeditation(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMeditation(null);
  };

  return (
    <div className="min-h-screen-minus-nav p-6">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-500/20 rounded-xl">
              <Wind className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">Meditation Journal</h1>
              <p className="text-slate-400 text-sm">Track your practice and growth</p>
            </div>
          </div>

          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg"
            data-testid="new-meditation-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Log Session
          </Button>
        </div>

        {/* Stats Section */}
        <MeditationStats stats={stats} isLoading={statsLoading} />

        {/* History Section */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-medium text-white">Session History</h2>
          </div>

          <MeditationHistory
            meditations={meditations || []}
            onEdit={handleEdit}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-teal-400" />
              {editingMeditation ? 'Edit Session' : 'Log Meditation'}
            </DialogTitle>
          </DialogHeader>

          <MeditationForm
            userId={userId}
            existingMeditation={editingMeditation}
            onSuccess={handleFormSuccess}
          />
          <DialogClose asChild>
            <Button variant="ghost" className="w-full mt-2 opacity-70 hover:opacity-100">
              Cancel
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
