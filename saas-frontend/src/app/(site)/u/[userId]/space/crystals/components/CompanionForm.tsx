'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  CompanionFormState,
  CrystalCollectionItem,
  CrystalCompanionLog,
  COMPANION_LOCATIONS,
} from '../types';
import { useCreateCompanionLog, useUpdateCompanionLog } from '../hooks';

interface CompanionFormProps {
  userId: string;
  crystals: CrystalCollectionItem[];
  existingLog?: CrystalCompanionLog | null;
  onSuccess?: () => void;
}

const getDefaultFormState = (): CompanionFormState => ({
  crystalId: undefined,
  crystalName: '',
  reason: '',
  intention: '',
  location: '',
});

const CompanionForm: React.FC<CompanionFormProps> = ({
  userId,
  crystals,
  existingLog,
  onSuccess,
}) => {
  const [formState, setFormState] = useState<CompanionFormState>(getDefaultFormState());
  const [customCrystal, setCustomCrystal] = useState(false);

  const createMutation = useCreateCompanionLog();
  const updateMutation = useUpdateCompanionLog();

  const isEditing = !!existingLog;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (existingLog) {
      const matchingCrystal = crystals.find(c => c.id === existingLog.crystalId);
      setFormState({
        crystalId: existingLog.crystalId,
        crystalName: existingLog.crystalName,
        reason: existingLog.reason || '',
        intention: existingLog.intention || '',
        location: existingLog.location || '',
      });
      setCustomCrystal(!matchingCrystal);
    }
  }, [existingLog, crystals]);

  const handleCrystalSelect = (crystalId: string) => {
    if (crystalId === 'custom') {
      setCustomCrystal(true);
      setFormState(prev => ({ ...prev, crystalId: undefined, crystalName: '' }));
    } else {
      setCustomCrystal(false);
      const crystal = crystals.find(c => c.id === crystalId);
      if (crystal) {
        setFormState(prev => ({
          ...prev,
          crystalId: crystal.id,
          crystalName: crystal.nickname || crystal.name,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.crystalName.trim()) return;

    try {
      if (isEditing && existingLog) {
        await updateMutation.mutateAsync({
          id: existingLog.id,
          userId,
          ...formState,
          crystalName: formState.crystalName.trim(),
        });
      } else {
        await createMutation.mutateAsync({
          userId,
          ...formState,
          crystalName: formState.crystalName.trim(),
        });
      }

      onSuccess?.();

      if (!isEditing) {
        setFormState(getDefaultFormState());
        setCustomCrystal(false);
      }
    } catch {
      // Error is handled by mutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" data-testid="companion-form">
      {/* Crystal Selection */}
      <div>
        <Label className="text-slate-300">
          Which crystal is with you? <span className="text-red-400">*</span>
        </Label>
        <Select
          value={customCrystal ? 'custom' : formState.crystalId || ''}
          onValueChange={handleCrystalSelect}
        >
          <SelectTrigger className="mt-1 bg-white/5 border-white/20 text-white">
            <SelectValue placeholder="Select a crystal" />
          </SelectTrigger>
          <SelectContent>
            {crystals.map((crystal) => (
              <SelectItem key={crystal.id} value={crystal.id}>
                {crystal.nickname || crystal.name}
              </SelectItem>
            ))}
            <SelectItem value="custom">
              Other crystal (not in collection)
            </SelectItem>
          </SelectContent>
        </Select>

        {customCrystal && (
          <Input
            value={formState.crystalName}
            onChange={(e) => setFormState(prev => ({ ...prev, crystalName: e.target.value }))}
            placeholder="Enter crystal name"
            className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-slate-500"
          />
        )}
      </div>

      {/* Location */}
      <div>
        <Label className="text-slate-300">Where is it?</Label>
        <Select
          value={formState.location || ''}
          onValueChange={(value) => setFormState(prev => ({ ...prev, location: value }))}
        >
          <SelectTrigger className="mt-1 bg-white/5 border-white/20 text-white">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {COMPANION_LOCATIONS.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reason */}
      <div>
        <Label htmlFor="reason" className="text-slate-300">Why this crystal today?</Label>
        <Textarea
          id="reason"
          value={formState.reason}
          onChange={(e) => setFormState(prev => ({ ...prev, reason: e.target.value }))}
          placeholder="What drew you to choose this crystal?"
          className="mt-1 bg-white/5 border-white/20 text-white placeholder:text-slate-500 min-h-[80px]"
        />
      </div>

      {/* Intention */}
      <div>
        <Label htmlFor="intention" className="text-slate-300">Your Intention</Label>
        <Textarea
          id="intention"
          value={formState.intention}
          onChange={(e) => setFormState(prev => ({ ...prev, intention: e.target.value }))}
          placeholder="What do you hope to manifest or feel today?"
          className="mt-1 bg-white/5 border-white/20 text-white placeholder:text-slate-500 min-h-[80px]"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || !formState.crystalName.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
        data-testid="companion-submit-button"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            {isEditing ? 'Update Companion' : 'Set as Today&apos;s Companion'}
          </>
        )}
      </Button>
    </form>
  );
};

export default CompanionForm;
