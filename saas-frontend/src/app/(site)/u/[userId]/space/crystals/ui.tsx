'use client';

import { useState, useMemo } from 'react';
import { Gem, Star, Sparkles, Droplets, Grid3X3, Plus, BarChart3, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CrystalForm,
  CrystalCollection,
  WishlistForm,
  WishlistSection,
  CompanionCard,
  CompanionForm,
  CleansingForm,
  CleansingHistory,
  GridForm,
  GridSection,
  StatsOverview,
} from './components';
import {
  CrystalCollectionItem,
  CrystalWishlistItem,
  CrystalCompanionLog,
  CrystalCleansingLog,
  CrystalGrid,
} from './types';
import {
  useCrystalCollection,
  useCrystalWishlist,
  useTodaysCompanion,
  useCrystalCleansingLogs,
  useCrystalGrids,
  useCrystalStats,
  useDeleteCrystal,
  useDeleteWishlistItem,
  useUpdateWishlistItem,
  useDeleteCleansingLog,
  useDeleteCrystalGrid,
  useUpdateCrystalGrid,
} from './hooks';

interface Props {
  userId: string;
}

type DialogType = 'crystal' | 'wishlist' | 'companion' | 'cleansing' | 'grid' | null;

const UI: React.FC<Props> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('collection');
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [editingCrystal, setEditingCrystal] = useState<CrystalCollectionItem | null>(null);
  const [editingWishlistItem, setEditingWishlistItem] = useState<CrystalWishlistItem | null>(null);
  const [editingCompanion, setEditingCompanion] = useState<CrystalCompanionLog | null>(null);
  const [editingGrid, setEditingGrid] = useState<CrystalGrid | null>(null);

  // Data hooks
  const { data: crystals = [], isLoading: loadingCrystals } = useCrystalCollection(userId);
  const { data: wishlistItems = [], isLoading: loadingWishlist } = useCrystalWishlist(userId);
  const { data: todaysCompanion, isLoading: loadingCompanion } = useTodaysCompanion(userId);
  const { data: cleansingLogs = [], isLoading: loadingCleansing } = useCrystalCleansingLogs(userId);
  const { data: grids = [], isLoading: loadingGrids } = useCrystalGrids(userId);
  const { data: stats, isLoading: loadingStats } = useCrystalStats(userId);

  // Mutation hooks
  const deleteCrystalMutation = useDeleteCrystal();
  const deleteWishlistMutation = useDeleteWishlistItem();
  const updateWishlistMutation = useUpdateWishlistItem();
  const deleteCleansingMutation = useDeleteCleansingLog();
  const deleteGridMutation = useDeleteCrystalGrid();
  const updateGridMutation = useUpdateCrystalGrid();

  // Dialog handlers
  const openDialog = (type: DialogType) => {
    setDialogType(type);
  };

  const closeDialog = () => {
    setDialogType(null);
    setEditingCrystal(null);
    setEditingWishlistItem(null);
    setEditingCompanion(null);
    setEditingGrid(null);
  };

  // Crystal handlers
  const handleEditCrystal = (crystal: CrystalCollectionItem) => {
    setEditingCrystal(crystal);
    setDialogType('crystal');
  };

  const handleDeleteCrystal = async (crystal: CrystalCollectionItem) => {
    if (confirm(`Are you sure you want to remove "${crystal.nickname || crystal.name}" from your collection?`)) {
      await deleteCrystalMutation.mutateAsync({ id: crystal.id, userId });
    }
  };

  // Wishlist handlers
  const handleEditWishlistItem = (item: CrystalWishlistItem) => {
    setEditingWishlistItem(item);
    setDialogType('wishlist');
  };

  const handleDeleteWishlistItem = async (item: CrystalWishlistItem) => {
    if (confirm(`Are you sure you want to remove "${item.name}" from your wishlist?`)) {
      await deleteWishlistMutation.mutateAsync({ id: item.id, userId });
    }
  };

  const handleMarkWishlistAcquired = async (item: CrystalWishlistItem) => {
    await updateWishlistMutation.mutateAsync({
      id: item.id,
      userId,
      isAcquired: true,
      acquiredDate: new Date().toISOString().split('T')[0],
    });
  };

  // Companion handlers
  const handleEditCompanion = (companion: CrystalCompanionLog) => {
    setEditingCompanion(companion);
    setDialogType('companion');
  };

  // Cleansing handlers
  const handleDeleteCleansing = async (log: CrystalCleansingLog) => {
    if (confirm('Are you sure you want to delete this cleansing session log?')) {
      await deleteCleansingMutation.mutateAsync({ id: log.id, userId });
    }
  };

  // Grid handlers
  const handleEditGrid = (grid: CrystalGrid) => {
    setEditingGrid(grid);
    setDialogType('grid');
  };

  const handleDeleteGrid = async (grid: CrystalGrid) => {
    if (confirm(`Are you sure you want to delete the "${grid.name}" grid?`)) {
      await deleteGridMutation.mutateAsync({ id: grid.id, userId });
    }
  };

  const handleActivateGrid = async (grid: CrystalGrid) => {
    await updateGridMutation.mutateAsync({
      id: grid.id,
      userId,
      isActive: true,
      activatedDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleDeactivateGrid = async (grid: CrystalGrid) => {
    await updateGridMutation.mutateAsync({
      id: grid.id,
      userId,
      isActive: false,
      deactivatedDate: new Date().toISOString().split('T')[0],
    });
  };

  // Calculate insights
  const insights = useMemo(() => {
    const totalCrystals = crystals.length;
    const activeWishlist = wishlistItems.filter(w => !w.isAcquired).length;
    const acquiredWishlist = wishlistItems.filter(w => w.isAcquired).length;
    const activeGrids = grids.filter(g => g.isActive).length;
    const companionStreak = stats?.companionStreak || 0;

    // Milestones
    const crystalMilestones = [
      { count: 100, message: 'A hundred sacred stones in your collection!' },
      { count: 50, message: 'Fifty crystals — a powerful collection!' },
      { count: 25, message: 'Twenty-five crystals and growing!' },
      { count: 10, message: 'Ten crystals — your collection is blooming!' },
      { count: 5, message: 'Five crystals — a beautiful beginning!' },
    ];
    const currentMilestone = crystalMilestones.find(m => totalCrystals >= m.count);

    // Unique chakras covered
    const chakraSet = new Set<string>();
    crystals.forEach(c => {
      if (c.chakras) c.chakras.forEach(ch => chakraSet.add(ch));
    });
    const chakrasCovered = chakraSet.size;

    return {
      totalCrystals,
      activeWishlist,
      acquiredWishlist,
      activeGrids,
      companionStreak,
      currentMilestone,
      chakrasCovered,
      hasActiveGrids: activeGrids > 0,
    };
  }, [crystals, wishlistItems, grids, stats]);

  const getDialogTitle = () => {
    switch (dialogType) {
      case 'crystal':
        return editingCrystal ? 'Edit Crystal' : 'Add Crystal to Collection';
      case 'wishlist':
        return editingWishlistItem ? 'Edit Wishlist Item' : 'Add to Wishlist';
      case 'companion':
        return editingCompanion ? 'Update Companion' : 'Set Today&apos;s Companion';
      case 'cleansing':
        return 'Log Cleansing Session';
      case 'grid':
        return editingGrid ? 'Edit Crystal Grid' : 'Create Crystal Grid';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen-minus-nav p-6 relative overflow-hidden">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-indigo-400/8 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-violet-300/5 rounded-full blur-3xl animate-pulse delay-500" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-fuchsia-400/5 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Centered Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-purple-500/20 rounded-2xl mb-4">
            <Gem className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Crystals & Stones</h1>
          <p className="text-slate-400">Your sacred collection of Earth&apos;s treasures</p>

          {insights.companionStreak > 0 && (
            <div className="mt-4">
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-4 py-1.5">
                <Flame className="w-4 h-4 mr-2" />
                {insights.companionStreak} day companion streak
              </Badge>
            </div>
          )}

          <div className="mt-6">
            <Button
              onClick={() => openDialog('crystal')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg px-6"
              data-testid="add-crystal-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Crystal
            </Button>
          </div>
        </div>

        {/* Milestone Celebration Banner */}
        {insights.currentMilestone && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-purple-300 font-medium">{insights.currentMilestone.message}</p>
                {insights.chakrasCovered > 0 && (
                  <p className="text-purple-200/70 text-sm">
                    Your collection resonates with {insights.chakrasCovered} chakra{insights.chakrasCovered !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Grids Banner */}
        {insights.hasActiveGrids && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/20 rounded-lg animate-pulse">
                <Grid3X3 className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="text-pink-300 font-medium">
                  {insights.activeGrids} Crystal Grid{insights.activeGrids !== 1 ? 's' : ''} Active
                </p>
                <p className="text-pink-200/70 text-sm">Sacred geometry is working for your highest good</p>
              </div>
            </div>
          </div>
        )}

        {/* Today's Companion Card */}
        <div className="mb-6">
          <CompanionCard
            companion={todaysCompanion || null}
            isLoading={loadingCompanion}
            onSetCompanion={() => openDialog('companion')}
            onEditCompanion={handleEditCompanion}
          />
        </div>

        {/* Stats Overview */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-medium text-white">Collection Overview</h2>
          </div>
          <StatsOverview stats={stats} isLoading={loadingStats} />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1">
            <TabsTrigger value="collection" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
              <Gem className="w-4 h-4 mr-2" />
              Collection
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-300">
              <Star className="w-4 h-4 mr-2" />
              Wishlist
            </TabsTrigger>
            <TabsTrigger value="cleansing" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">
              <Droplets className="w-4 h-4 mr-2" />
              Cleansing
            </TabsTrigger>
            <TabsTrigger value="grids" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-300">
              <Grid3X3 className="w-4 h-4 mr-2" />
              Grids
            </TabsTrigger>
          </TabsList>

          {/* Collection Tab */}
          <TabsContent value="collection">
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
              <CrystalCollection
                crystals={crystals}
                isLoading={loadingCrystals}
                onEdit={handleEditCrystal}
                onDelete={handleDeleteCrystal}
              />
            </div>
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist">
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-lg font-medium text-white">Crystal Wishlist</h2>
                </div>
                <Button
                  onClick={() => openDialog('wishlist')}
                  variant="ghost"
                  className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Wishlist
                </Button>
              </div>
              <WishlistSection
                items={wishlistItems}
                isLoading={loadingWishlist}
                onEdit={handleEditWishlistItem}
                onDelete={handleDeleteWishlistItem}
                onMarkAcquired={handleMarkWishlistAcquired}
              />
            </div>
          </TabsContent>

          {/* Cleansing Tab */}
          <TabsContent value="cleansing">
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-medium text-white">Cleansing Log</h2>
                </div>
                <Button
                  onClick={() => openDialog('cleansing')}
                  variant="ghost"
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Log Session
                </Button>
              </div>
              <CleansingHistory
                logs={cleansingLogs}
                isLoading={loadingCleansing}
                onDelete={handleDeleteCleansing}
              />
            </div>
          </TabsContent>

          {/* Grids Tab */}
          <TabsContent value="grids">
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5 text-pink-400" />
                  <h2 className="text-lg font-medium text-white">Crystal Grids</h2>
                </div>
                <Button
                  onClick={() => openDialog('grid')}
                  variant="ghost"
                  className="text-pink-400 hover:text-pink-300 hover:bg-pink-500/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Grid
                </Button>
              </div>
              <GridSection
                grids={grids}
                isLoading={loadingGrids}
                onEdit={handleEditGrid}
                onDelete={handleDeleteGrid}
                onActivate={handleActivateGrid}
                onDeactivate={handleDeactivateGrid}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Form Dialogs */}
      <Dialog open={dialogType !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="bg-slate-900 border-white/20 text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogType === 'crystal' && <Gem className="w-5 h-5 text-purple-400" />}
              {dialogType === 'wishlist' && <Star className="w-5 h-5 text-yellow-400" />}
              {dialogType === 'companion' && <Sparkles className="w-5 h-5 text-purple-400" />}
              {dialogType === 'cleansing' && <Droplets className="w-5 h-5 text-blue-400" />}
              {dialogType === 'grid' && <Grid3X3 className="w-5 h-5 text-pink-400" />}
              {getDialogTitle()}
            </DialogTitle>
          </DialogHeader>

          {dialogType === 'crystal' && (
            <CrystalForm
              userId={userId}
              existingCrystal={editingCrystal}
              onSuccess={closeDialog}
            />
          )}
          {dialogType === 'wishlist' && (
            <WishlistForm
              userId={userId}
              existingItem={editingWishlistItem}
              onSuccess={closeDialog}
            />
          )}
          {dialogType === 'companion' && (
            <CompanionForm
              userId={userId}
              crystals={crystals}
              existingLog={editingCompanion}
              onSuccess={closeDialog}
            />
          )}
          {dialogType === 'cleansing' && (
            <CleansingForm
              userId={userId}
              crystals={crystals}
              onSuccess={closeDialog}
            />
          )}
          {dialogType === 'grid' && (
            <GridForm
              userId={userId}
              crystals={crystals}
              existingGrid={editingGrid}
              onSuccess={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
