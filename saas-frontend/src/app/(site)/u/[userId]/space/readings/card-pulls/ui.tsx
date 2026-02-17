'use client';

import { useState } from 'react';
import { Sparkles, History, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CardPullForm, CardPullHistory } from './components';
import { useCardPulls, DailyCardPull } from './hooks';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingPull, setEditingPull] = useState<DailyCardPull | null>(null);

  const { data: pulls, isLoading } = useCardPulls(userId);

  const handleEdit = (pull: DailyCardPull) => {
    setEditingPull(pull);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPull(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPull(null);
  };

  return (
    <div className="min-h-screen-minus-nav p-6">
      <div className="h-full mih-h-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">Card Pulls</h1>
              <p className="text-slate-400 text-sm">Record and track your readings</p>
            </div>
          </div>

          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
            data-testid="new-pull-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Pull
          </Button>
        </div>

        {/* History Section */}
        <div className="flex-grow backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-medium text-white">Recent Pulls</h2>
          </div>

          <CardPullHistory
            pulls={pulls || []}
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
              <Sparkles className="w-5 h-5 text-purple-400" />
              {editingPull ? 'Edit Card Pull' : 'New Card Pull'}
            </DialogTitle>
          </DialogHeader>

          <CardPullForm
            userId={userId}
            existingPull={editingPull}
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
