'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Droplets, Loader2, Moon, Zap } from 'lucide-react';
import {
  CleansingFormState,
  CrystalCollectionItem,
  CrystalCleansingLog,
  ChargingMethod,
  CLEANSING_METHODS,
  CHARGING_METHODS,
} from '../types';
import { useCreateCleansingLog } from '../hooks';

interface CleansingFormProps {
  userId: string;
  crystals: CrystalCollectionItem[];
  existingLog?: CrystalCleansingLog | null;
  onSuccess?: () => void;
}

const getDefaultFormState = (): CleansingFormState => ({
  crystalIds: [],
  crystalNames: [],
  method: 'moonlight',
  methodDetails: '',
  duration: undefined,
  moonPhase: '',
  didCharge: false,
  chargingMethod: undefined,
  chargingDetails: '',
  intention: '',
  notes: '',
});

const MOON_PHASES = [
  { key: 'new', label: 'New Moon' },
  { key: 'waxing_crescent', label: 'Waxing Crescent' },
  { key: 'first_quarter', label: 'First Quarter' },
  { key: 'waxing_gibbous', label: 'Waxing Gibbous' },
  { key: 'full', label: 'Full Moon' },
  { key: 'waning_gibbous', label: 'Waning Gibbous' },
  { key: 'third_quarter', label: 'Third Quarter' },
  { key: 'waning_crescent', label: 'Waning Crescent' },
];

const CleansingForm: React.FC<CleansingFormProps> = ({
  userId,
  crystals,
  existingLog,
  onSuccess,
}) => {
  const [formState, setFormState] = useState<CleansingFormState>(getDefaultFormState());
  const [customCrystals, setCustomCrystals] = useState<string>('');

  const createMutation = useCreateCleansingLog();

  const isEditing = !!existingLog;
  const isSubmitting = createMutation.isPending;

  useEffect(() => {
    if (existingLog) {
      setFormState({
        crystalIds: existingLog.crystalIds || [],
        crystalNames: existingLog.crystalNames || [],
        method: existingLog.method,
        methodDetails: existingLog.methodDetails || '',
        duration: existingLog.duration,
        moonPhase: existingLog.moonPhase || '',
        didCharge: existingLog.didCharge || false,
        chargingMethod: existingLog.chargingMethod,
        chargingDetails: existingLog.chargingDetails || '',
        intention: existingLog.intention || '',
        notes: existingLog.notes || '',
      });
    }
  }, [existingLog]);

  const handleCrystalToggle = (crystal: CrystalCollectionItem) => {
    setFormState(prev => {
      const crystalName = crystal.nickname || crystal.name;
      const isSelected = prev.crystalIds.includes(crystal.id);

      if (isSelected) {
        return {
          ...prev,
          crystalIds: prev.crystalIds.filter(id => id !== crystal.id),
          crystalNames: prev.crystalNames.filter(name => name !== crystalName),
        };
      } else {
        return {
          ...prev,
          crystalIds: [...prev.crystalIds, crystal.id],
          crystalNames: [...prev.crystalNames, crystalName],
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Combine selected crystals with custom crystals
    let finalCrystalNames = [...formState.crystalNames];
    if (customCrystals.trim()) {
      const additionalCrystals = customCrystals.split(',').map(c => c.trim()).filter(Boolean);
      finalCrystalNames = [...finalCrystalNames, ...additionalCrystals];
    }

    if (finalCrystalNames.length === 0) return;

    try {
      await createMutation.mutateAsync({
        userId,
        ...formState,
        crystalNames: finalCrystalNames,
      });

      onSuccess?.();
      setFormState(getDefaultFormState());
      setCustomCrystals('');
    } catch {
      // Error is handled by mutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" data-testid="cleansing-form">
      {/* Crystal Selection */}
      <div>
        <Label dark className="mb-2 block">
          Which crystals did you cleanse? <span className="text-red-400">*</span>
        </Label>

        {crystals.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3 max-h-40 overflow-y-auto p-2 bg-white/5 rounded-lg border border-white/10">
            {crystals.map((crystal) => (
              <label
                key={crystal.id}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                  formState.crystalIds.includes(crystal.id)
                    ? 'bg-purple-500/20 border border-purple-400/50'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <Checkbox
                  checked={formState.crystalIds.includes(crystal.id)}
                  onCheckedChange={() => handleCrystalToggle(crystal)}
                  className="border-white/30"
                  dark
                />
                <span className="text-slate-300 text-sm truncate">
                  {crystal.nickname || crystal.name}
                </span>
              </label>
            ))}
          </div>
        )}

        <Input
          value={customCrystals}
          onChange={(e) => setCustomCrystals(e.target.value)}
          placeholder="Or enter crystal names (comma separated)"
          dark
        />
        {formState.crystalNames.length > 0 && (
          <p className="text-xs text-slate-400 mt-1">
            Selected: {formState.crystalNames.join(', ')}
          </p>
        )}
      </div>

      {/* Cleansing Method */}
      <div>
        <Label dark className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-400" />
          Cleansing Method
        </Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {CLEANSING_METHODS.map((method) => (
            <button
              key={method.key}
              type="button"
              onClick={() => setFormState(prev => ({ ...prev, method: method.key }))}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                formState.method === method.key
                  ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
              }`}
            >
              {method.label}
            </button>
          ))}
        </div>
      </div>

      {/* Method Details */}
      <div>
        <Label htmlFor="methodDetails" dark>Method Details</Label>
        <Input
          id="methodDetails"
          value={formState.methodDetails}
          onChange={(e) => setFormState(prev => ({ ...prev, methodDetails: e.target.value }))}
          placeholder="e.g., White sage, Full moon overnight"
          dark
          className="mt-1"
        />
      </div>

      {/* Duration & Moon Phase */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration" dark>Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            value={formState.duration || ''}
            onChange={(e) => setFormState(prev => ({ ...prev, duration: e.target.value ? parseInt(e.target.value) : undefined }))}
            placeholder="e.g., 30"
            dark
            className="mt-1"
          />
        </div>

        <div>
          <Label dark className="flex items-center gap-1">
            <Moon className="w-3 h-3" />
            Moon Phase
          </Label>
          <Select
            value={formState.moonPhase || ''}
            onValueChange={(value) => setFormState(prev => ({ ...prev, moonPhase: value }))}
            dark
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select phase" />
            </SelectTrigger>
            <SelectContent>
              {MOON_PHASES.map((phase) => (
                <SelectItem key={phase.key} value={phase.key}>
                  {phase.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Charging Section */}
      <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
        <div className="flex items-center gap-3 mb-3">
          <Checkbox
            id="didCharge"
            checked={formState.didCharge}
            onCheckedChange={(checked) => setFormState(prev => ({ ...prev, didCharge: checked as boolean }))}
            className="border-yellow-400/50 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
            dark
          />
          <Label htmlFor="didCharge" dark className="cursor-pointer flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            I also charged these crystals
          </Label>
        </div>

        {formState.didCharge && (
          <div className="space-y-3 mt-3">
            <div>
              <Label dark className="text-sm">Charging Method</Label>
              <Select
                value={formState.chargingMethod || ''}
                onValueChange={(value) => setFormState(prev => ({ ...prev, chargingMethod: value as ChargingMethod }))}
                dark
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {CHARGING_METHODS.map((method) => (
                    <SelectItem key={method.key} value={method.key}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="chargingDetails" dark className="text-sm">Charging Details</Label>
              <Input
                id="chargingDetails"
                value={formState.chargingDetails}
                onChange={(e) => setFormState(prev => ({ ...prev, chargingDetails: e.target.value }))}
                placeholder="Any specific details about charging"
                dark
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Intention */}
      <div>
        <Label htmlFor="intention" dark>Intention</Label>
        <Textarea
          id="intention"
          value={formState.intention}
          onChange={(e) => setFormState(prev => ({ ...prev, intention: e.target.value }))}
          placeholder="What intention did you set during cleansing?"
          dark
          className="mt-1 min-h-[80px]"
        />
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="cleansingNotes" dark>Notes</Label>
        <Textarea
          id="cleansingNotes"
          value={formState.notes}
          onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Any other observations or notes"
          dark
          className="mt-1 min-h-[60px]"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || (formState.crystalNames.length === 0 && !customCrystals.trim())}
        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
        data-testid="cleansing-submit-button"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Logging...
          </>
        ) : (
          <>
            <Droplets className="w-4 h-4 mr-2" />
            {isEditing ? 'Update Log' : 'Log Cleansing Session'}
          </>
        )}
      </Button>
    </form>
  );
};

export default CleansingForm;
