'use client';

import { useState, useMemo } from 'react';
import { Grid3X3, Plus, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  GridForm,
  GridSection,
} from '../components';
import { CrystalGrid } from '../types';
import {
  useCrystalCollection,
  useCrystalGrids,
  useDeleteCrystalGrid,
  useUpdateCrystalGrid,
} from '../hooks';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingGrid, setEditingGrid] = useState<CrystalGrid | null>(null);

  const { data: crystals = [] } = useCrystalCollection(userId);
  const { data: grids = [], isLoading } = useCrystalGrids(userId);
  const deleteMutation = useDeleteCrystalGrid();
  const updateMutation = useUpdateCrystalGrid();

  const handleEdit = (grid: CrystalGrid) => {
    setEditingGrid(grid);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingGrid(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingGrid(null);
  };

  const handleActivate = async (grid: CrystalGrid) => {
    await updateMutation.mutateAsync({
      id: grid.id,
      userId,
      isActive: true,
      activatedDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleDeactivate = async (grid: CrystalGrid) => {
    await updateMutation.mutateAsync({
      id: grid.id,
      userId,
      isActive: false,
      deactivatedDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleDelete = async (grid: CrystalGrid) => {
    if (confirm(`Are you sure you want to delete the "${grid.name}" grid?`)) {
      await deleteMutation.mutateAsync({ id: grid.id, userId });
    }
  };

  // Calculate insights
  const insights = useMemo(() => {
    const totalGrids = grids.length;
    const activeGrids = grids.filter(g => g.isActive);
    const completedGrids = grids.filter(g => !g.isActive && g.deactivatedDate);

    // Grids with outcomes recorded
    const gridsWithOutcomes = completedGrids.filter(g => g.outcome).length;

    // Most common purpose
    const purposeCounts: Record<string, number> = {};
    grids.forEach(g => {
      if (g.purpose) {
        purposeCounts[g.purpose] = (purposeCounts[g.purpose] || 0) + 1;
      }
    });
    const topPurpose = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1])[0];

    // Total crystals used across all grids
    const totalCrystalsInGrids = grids.reduce((sum, g) => sum + (g.crystals?.length || 0), 0);

    return {
      totalGrids,
      activeCount: activeGrids.length,
      completedCount: completedGrids.length,
      gridsWithOutcomes,
      topPurpose: topPurpose ? { purpose: topPurpose[0], count: topPurpose[1] } : null,
      totalCrystalsInGrids,
      activeGrids,
    };
  }, [grids]);

  const hasData = grids.length > 0;

  return (
    <div className="min-h-screen-minus-nav p-6 relative overflow-hidden">
      {/* Atmospheric Background - Sacred Geometry theme */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-purple-400/8 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-rose-300/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Empty State - Centered welcoming design */}
        {!hasData && !isLoading && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-4 bg-pink-500/20 rounded-2xl mb-4">
              <Grid3X3 className="w-8 h-8 text-pink-400" />
            </div>
            <h1 className="text-3xl font-light text-white mb-2">Crystal Grids</h1>
            <p className="text-slate-400 mb-8">Sacred geometry amplifying your intentions into reality</p>

            <div className="p-8 rounded-xl bg-white/5 border border-white/10">
              <Grid3X3 className="w-12 h-12 text-pink-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Create Your First Crystal Grid</h3>
              <p className="text-slate-400 mb-4 max-w-md mx-auto">
                Combine the energy of your crystals in sacred geometric patterns to amplify your intentions and manifest your desires.
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                data-testid="create-grid-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Grid
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
                <div className="p-2 bg-pink-500/20 rounded-xl">
                  <Grid3X3 className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <h1 className="text-xl font-light text-white">Crystal Grids</h1>
                  <p className="text-slate-500 text-sm">Sacred geometry for manifestation</p>
                </div>
              </div>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg"
                data-testid="create-grid-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Grid
              </Button>
            </div>

            {/* Compact Stats Row */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <Grid3X3 className="w-4 h-4 text-pink-400" />
                <span className="text-white font-medium">{insights.totalGrids}</span>
                <span className="text-slate-400">grid{insights.totalGrids !== 1 ? 's' : ''}</span>
              </div>
              {insights.activeCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-500/10 rounded-lg animate-pulse">
                  <Zap className="w-4 h-4 text-pink-400" />
                  <span className="text-pink-300 font-medium">{insights.activeCount}</span>
                  <span className="text-pink-300/80">active</span>
                </div>
              )}
              {insights.completedCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">{insights.completedCount}</span>
                  <span className="text-emerald-300/80">completed</span>
                </div>
              )}
              {insights.totalCrystalsInGrids > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                  <span className="text-white font-medium">{insights.totalCrystalsInGrids}</span>
                  <span className="text-slate-400">crystals used</span>
                </div>
              )}
              {insights.topPurpose && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                  <span className="text-slate-400">Top purpose:</span>
                  <span className="text-white">{insights.topPurpose.purpose}</span>
                </div>
              )}
            </div>

            {/* Active Grids Note */}
            {insights.activeCount > 0 && (
              <div className="mb-6 p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
                <p className="text-pink-300 text-sm">
                  <Zap className="w-4 h-4 inline mr-2" />
                  {insights.activeGrids.map(g => g.name).join(', ')} — sending energy into the universe
                </p>
              </div>
            )}

            {/* Grids Section */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
              <GridSection
                grids={grids}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
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
              <Grid3X3 className="w-5 h-5 text-pink-400" />
              {editingGrid ? 'Edit Crystal Grid' : 'Create Crystal Grid'}
            </DialogTitle>
          </DialogHeader>

          <GridForm
            userId={userId}
            crystals={crystals}
            existingGrid={editingGrid}
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
