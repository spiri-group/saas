'use client';

import { useState } from 'react';
import { Moon, History, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DreamForm, DreamHistory } from './components';
import { useDreams, DreamJournalEntry } from './hooks';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingDream, setEditingDream] = useState<DreamJournalEntry | null>(null);

  const { data: dreams, isLoading } = useDreams(userId);

  const handleEdit = (dream: DreamJournalEntry) => {
    setEditingDream(dream);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDream(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDream(null);
  };

  return (
    <div className="min-h-screen-minus-nav flex flex-col p-6">
      <div className="flex-grow min-h-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 rounded-xl">
              <Moon className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">Dream Journal</h1>
              <p className="text-slate-400 text-sm">Record and interpret your dreams</p>
            </div>
          </div>

          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg cursor-pointer"
            data-testid="new-dream-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Dream
          </Button>
        </div>

        {/* History Section */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl flex-grow flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-medium text-white">Dream History</h2>
          </div>

          <div className="flex-grow min-h-0 overflow-y-auto">
            <DreamHistory
              dreams={dreams || []}
              onEdit={handleEdit}
              isLoading={isLoading}
              userId={userId}
            />
          </div>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="max-w-[95vw] w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-400" />
              {editingDream ? 'Edit Dream' : 'Record New Dream'}
            </DialogTitle>
          </DialogHeader>

          <DreamForm
            userId={userId}
            existingDream={editingDream}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
