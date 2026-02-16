'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid3X3, Plus, X, Loader2, Save } from 'lucide-react';
import {
  GridFormState,
  GridCrystalPlacement,
  CrystalCollectionItem,
  CrystalGrid,
  GRID_SHAPES,
} from '../types';
import { useCreateCrystalGrid, useUpdateCrystalGrid } from '../hooks';

interface GridFormProps {
  userId: string;
  crystals: CrystalCollectionItem[];
  existingGrid?: CrystalGrid | null;
  onSuccess?: () => void;
}

const getDefaultFormState = (): GridFormState => ({
  name: '',
  purpose: '',
  gridShape: '',
  crystals: [],
  notes: '',
});

const GRID_POSITIONS = [
  { key: 'center', label: 'Center (Focus Stone)' },
  { key: 'north', label: 'North' },
  { key: 'south', label: 'South' },
  { key: 'east', label: 'East' },
  { key: 'west', label: 'West' },
  { key: 'northeast', label: 'Northeast' },
  { key: 'northwest', label: 'Northwest' },
  { key: 'southeast', label: 'Southeast' },
  { key: 'southwest', label: 'Southwest' },
  { key: 'inner_1', label: 'Inner Ring 1' },
  { key: 'inner_2', label: 'Inner Ring 2' },
  { key: 'inner_3', label: 'Inner Ring 3' },
  { key: 'outer_1', label: 'Outer Ring 1' },
  { key: 'outer_2', label: 'Outer Ring 2' },
  { key: 'outer_3', label: 'Outer Ring 3' },
];

const CRYSTAL_ROLES = [
  { key: 'focus', label: 'Focus Stone' },
  { key: 'way', label: 'Way Stone' },
  { key: 'desire', label: 'Desire Stone' },
  { key: 'amplifier', label: 'Amplifier' },
  { key: 'protection', label: 'Protection' },
  { key: 'grounding', label: 'Grounding' },
  { key: 'support', label: 'Support' },
];

const GridForm: React.FC<GridFormProps> = ({
  userId,
  crystals,
  existingGrid,
  onSuccess,
}) => {
  const [formState, setFormState] = useState<GridFormState>(getDefaultFormState());

  const createMutation = useCreateCrystalGrid();
  const updateMutation = useUpdateCrystalGrid();

  const isEditing = !!existingGrid;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (existingGrid) {
      setFormState({
        name: existingGrid.name,
        purpose: existingGrid.purpose,
        gridShape: existingGrid.gridShape || '',
        crystals: existingGrid.crystals,
        notes: existingGrid.notes || '',
      });
    }
  }, [existingGrid]);

  const handleAddPlacement = () => {
    setFormState(prev => ({
      ...prev,
      crystals: [
        ...prev.crystals,
        { position: '', crystalName: '', role: '' },
      ],
    }));
  };

  const handleUpdatePlacement = (index: number, updates: Partial<GridCrystalPlacement>) => {
    setFormState(prev => ({
      ...prev,
      crystals: prev.crystals.map((placement, i) =>
        i === index ? { ...placement, ...updates } : placement
      ),
    }));
  };

  const handleRemovePlacement = (index: number) => {
    setFormState(prev => ({
      ...prev,
      crystals: prev.crystals.filter((_, i) => i !== index),
    }));
  };

  const handleSelectCrystal = (index: number, crystalId: string) => {
    if (crystalId === 'custom') {
      handleUpdatePlacement(index, { crystalId: undefined, crystalName: '' });
    } else {
      const crystal = crystals.find(c => c.id === crystalId);
      if (crystal) {
        handleUpdatePlacement(index, {
          crystalId: crystal.id,
          crystalName: crystal.nickname || crystal.name,
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.name.trim() || !formState.purpose.trim()) return;
    if (formState.crystals.length === 0 || !formState.crystals.some(c => c.crystalName.trim())) return;

    const validCrystals = formState.crystals.filter(c => c.crystalName.trim() && c.position);

    try {
      if (isEditing && existingGrid) {
        await updateMutation.mutateAsync({
          id: existingGrid.id,
          userId,
          name: formState.name.trim(),
          purpose: formState.purpose.trim(),
          gridShape: formState.gridShape || undefined,
          crystals: validCrystals,
          notes: formState.notes || undefined,
        });
      } else {
        await createMutation.mutateAsync({
          userId,
          name: formState.name.trim(),
          purpose: formState.purpose.trim(),
          gridShape: formState.gridShape || undefined,
          crystals: validCrystals,
          notes: formState.notes || undefined,
        });
      }

      onSuccess?.();

      if (!isEditing) {
        setFormState(getDefaultFormState());
      }
    } catch {
      // Error is handled by mutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" data-testid="grid-form">
      {/* Grid Name */}
      <div>
        <Label htmlFor="gridName" dark>
          Grid Name <span className="text-red-400">*</span>
        </Label>
        <Input
          id="gridName"
          value={formState.name}
          onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Abundance Grid, Love Manifestation"
          dark
          className="mt-1"
          data-testid="grid-name-input"
        />
      </div>

      {/* Purpose */}
      <div>
        <Label htmlFor="gridPurpose" dark>
          Purpose/Intention <span className="text-red-400">*</span>
        </Label>
        <Textarea
          id="gridPurpose"
          value={formState.purpose}
          onChange={(e) => setFormState(prev => ({ ...prev, purpose: e.target.value }))}
          placeholder="What is this grid designed to manifest or support?"
          dark
          className="mt-1 min-h-[80px]"
        />
      </div>

      {/* Grid Shape */}
      <div>
        <Label dark>Grid Shape</Label>
        <Select
          value={formState.gridShape || ''}
          onValueChange={(value) => setFormState(prev => ({ ...prev, gridShape: value }))}
          dark
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select sacred geometry" />
          </SelectTrigger>
          <SelectContent>
            {GRID_SHAPES.map((shape) => (
              <SelectItem key={shape.key} value={shape.key}>
                {shape.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Crystal Placements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label dark>
            Crystal Placements <span className="text-red-400">*</span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddPlacement}
            className="text-purple-400 hover:text-purple-300 hover:bg-purple-400/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Crystal
          </Button>
        </div>

        {formState.crystals.length === 0 ? (
          <div className="p-4 border border-dashed border-white/20 rounded-lg text-center">
            <p className="text-slate-400 text-sm">No crystals added yet</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddPlacement}
              className="mt-2 text-purple-400 hover:text-purple-300"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add First Crystal
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {formState.crystals.map((placement, index) => (
              <div
                key={index}
                className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">Crystal #{index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePlacement(index)}
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Crystal Selection */}
                  <div>
                    <Label dark className="text-xs">Crystal</Label>
                    <Select
                      value={placement.crystalId || 'custom'}
                      onValueChange={(value) => handleSelectCrystal(index, value)}
                      dark
                    >
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {crystals.map((crystal) => (
                          <SelectItem key={crystal.id} value={crystal.id}>
                            {crystal.nickname || crystal.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Other (enter name)</SelectItem>
                      </SelectContent>
                    </Select>
                    {!placement.crystalId && (
                      <Input
                        value={placement.crystalName}
                        onChange={(e) => handleUpdatePlacement(index, { crystalName: e.target.value })}
                        placeholder="Crystal name"
                        dark
                        className="mt-1 text-sm"
                      />
                    )}
                  </div>

                  {/* Position */}
                  <div>
                    <Label dark className="text-xs">Position</Label>
                    <Select
                      value={placement.position}
                      onValueChange={(value) => handleUpdatePlacement(index, { position: value })}
                      dark
                    >
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRID_POSITIONS.map((pos) => (
                          <SelectItem key={pos.key} value={pos.key}>
                            {pos.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <Label dark className="text-xs">Role</Label>
                  <Select
                    value={placement.role || ''}
                    onValueChange={(value) => handleUpdatePlacement(index, { role: value })}
                    dark
                  >
                    <SelectTrigger className="mt-1 text-sm">
                      <SelectValue placeholder="Crystal's role in grid" />
                    </SelectTrigger>
                    <SelectContent>
                      {CRYSTAL_ROLES.map((role) => (
                        <SelectItem key={role.key} value={role.key}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="gridNotes" dark>Notes</Label>
        <Textarea
          id="gridNotes"
          value={formState.notes}
          onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Any additional notes about your grid setup"
          dark
          className="mt-1 min-h-[60px]"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || !formState.name.trim() || !formState.purpose.trim() || !formState.crystals.some(c => c.crystalName.trim() && c.position)}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
        data-testid="grid-submit-button"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isEditing ? 'Saving...' : 'Creating...'}
          </>
        ) : (
          <>
            {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Grid3X3 className="w-4 h-4 mr-2" />}
            {isEditing ? 'Save Grid' : 'Create Grid'}
          </>
        )}
      </Button>
    </form>
  );
};

export default GridForm;
