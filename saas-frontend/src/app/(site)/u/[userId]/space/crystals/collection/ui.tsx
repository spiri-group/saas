'use client';

import { useState, useMemo } from 'react';
import { Gem, Plus, Sparkles, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CrystalForm,
  CrystalCollection,
} from '../components';
import { CrystalCollectionItem } from '../types';
import {
  useCrystalCollection,
  useDeleteCrystal,
} from '../hooks';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingCrystal, setEditingCrystal] = useState<CrystalCollectionItem | null>(null);

  const { data: crystals = [], isLoading } = useCrystalCollection(userId);
  const deleteMutation = useDeleteCrystal();

  const handleEdit = (crystal: CrystalCollectionItem) => {
    setEditingCrystal(crystal);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCrystal(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCrystal(null);
  };

  const handleDelete = async (crystal: CrystalCollectionItem) => {
    if (confirm(`Are you sure you want to remove "${crystal.nickname || crystal.name}" from your collection?`)) {
      await deleteMutation.mutateAsync({ id: crystal.id, userId });
    }
  };

  // Calculate insights
  const insights = useMemo(() => {
    const totalCrystals = crystals.length;

    // Most common color
    const colorCounts: Record<string, number> = {};
    crystals.forEach(c => {
      if (c.color) {
        colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
      }
    });
    const topColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0];

    // Chakras covered
    const chakraSet = new Set<string>();
    crystals.forEach(c => {
      if (c.chakras) c.chakras.forEach(ch => chakraSet.add(ch));
    });
    const chakrasCovered = chakraSet.size;

    // Recently added (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentlyAdded = crystals.filter(c => new Date(c.createdAt) >= weekAgo).length;

    return {
      totalCrystals,
      topColor: topColor ? { color: topColor[0], count: topColor[1] } : null,
      chakrasCovered,
      recentlyAdded,
    };
  }, [crystals]);

  const hasData = crystals.length > 0;

  return (
    <div className="min-h-screen-minus-nav p-6 relative overflow-hidden">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-violet-400/8 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-indigo-300/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Empty State - Centered welcoming design */}
        {!hasData && !isLoading && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-4 bg-purple-500/20 rounded-2xl mb-4">
              <Gem className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-3xl font-light text-white mb-2">My Collection</h1>
            <p className="text-slate-400 mb-8">Your sacred stone family, each with a story to tell</p>

            <div className="p-8 rounded-xl bg-white/5 border border-white/10">
              <Gem className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Begin Your Crystal Journey</h3>
              <p className="text-slate-400 mb-4 max-w-md mx-auto">
                Add your first sacred stone and start building a collection that reflects your spiritual path.
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                data-testid="add-crystal-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Crystal
              </Button>
            </div>
          </div>
        )}

        {/* Has Data - Compact layout */}
        {hasData && (
          <>
            {/* Compact Header Row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-xl">
                  <Gem className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-light text-white">My Collection</h1>
                  <p className="text-slate-500 text-sm">Your sacred stone family</p>
                </div>
              </div>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
                data-testid="add-crystal-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Crystal
              </Button>
            </div>

            {/* Compact Stats Row */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <Heart className="w-4 h-4 text-purple-400" />
                <span className="text-white font-medium">{insights.totalCrystals}</span>
                <span className="text-slate-400">crystal{insights.totalCrystals !== 1 ? 's' : ''}</span>
              </div>
              {insights.recentlyAdded > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">{insights.recentlyAdded}</span>
                  <span className="text-emerald-300/80">this week</span>
                </div>
              )}
              {insights.chakrasCovered > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-white font-medium">{insights.chakrasCovered}</span>
                  <span className="text-slate-400">chakra{insights.chakrasCovered !== 1 ? 's' : ''}</span>
                </div>
              )}
              {insights.topColor && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                  <span className="text-slate-400">Most common:</span>
                  <span className="text-white">{insights.topColor.color}</span>
                </div>
              )}
            </div>

            {/* Collection Grid */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
              <CrystalCollection
                crystals={crystals}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          </>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-purple-400" />
              {editingCrystal ? 'Edit Crystal' : 'Add Crystal to Collection'}
            </DialogTitle>
          </DialogHeader>

          <CrystalForm
            userId={userId}
            existingCrystal={editingCrystal}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
