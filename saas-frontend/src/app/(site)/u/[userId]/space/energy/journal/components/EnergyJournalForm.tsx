'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  useCreateEnergyJournal,
  useUpdateEnergyJournal,
  EnergyJournalEntry,
  EnergyEntryType,
  EnergyModality,
  SessionRole,
} from '../../hooks';

interface Props {
  userId: string;
  existingEntry?: EnergyJournalEntry | null;
  onSuccess: () => void;
}

const ENTRY_TYPES: { value: EnergyEntryType; label: string }[] = [
  { value: 'meditation', label: 'Meditation' },
  { value: 'clearing', label: 'Clearing' },
  { value: 'grounding', label: 'Grounding' },
  { value: 'session_given', label: 'Session Given' },
  { value: 'session_received', label: 'Session Received' },
  { value: 'self_practice', label: 'Self Practice' },
  { value: 'attunement', label: 'Attunement' },
  { value: 'protection_ritual', label: 'Protection Ritual' },
  { value: 'observation', label: 'Observation' },
];

const MODALITIES: { value: EnergyModality; label: string }[] = [
  { value: 'reiki', label: 'Reiki' },
  { value: 'pranic_healing', label: 'Pranic Healing' },
  { value: 'quantum_touch', label: 'Quantum Touch' },
  { value: 'theta_healing', label: 'Theta Healing' },
  { value: 'healing_touch', label: 'Healing Touch' },
  { value: 'chakra_balancing', label: 'Chakra Balancing' },
  { value: 'aura_cleansing', label: 'Aura Cleansing' },
  { value: 'crystal_healing', label: 'Crystal Healing' },
  { value: 'sound_healing', label: 'Sound Healing' },
  { value: 'breathwork', label: 'Breathwork' },
  { value: 'grounding', label: 'Grounding' },
  { value: 'shielding', label: 'Shielding' },
  { value: 'cord_cutting', label: 'Cord Cutting' },
  { value: 'entity_clearing', label: 'Entity Clearing' },
  { value: 'space_clearing', label: 'Space Clearing' },
  { value: 'distance_healing', label: 'Distance Healing' },
  { value: 'self_healing', label: 'Self Healing' },
  { value: 'other', label: 'Other' },
];

interface FormData {
  date: string;
  entryType: EnergyEntryType;
  title?: string;
  modality?: EnergyModality;
  duration?: number;
  role?: SessionRole;
  practitionerName?: string;
  clientInitials?: string;
  sessionNotes?: string;
  preSessionFeeling?: string;
  postSessionFeeling?: string;
  energyLevel?: number;
  insights?: string;
  notes?: string;
  intention?: string;
}

export const EnergyJournalForm: React.FC<Props> = ({ userId, existingEntry, onSuccess }) => {
  const createMutation = useCreateEnergyJournal();
  const updateMutation = useUpdateEnergyJournal();
  const [energyLevel, setEnergyLevel] = useState(existingEntry?.energyLevel || 5);

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: {
      date: existingEntry?.date || new Date().toISOString().split('T')[0],
      entryType: existingEntry?.entryType || 'self_practice',
      title: existingEntry?.title || '',
      modality: existingEntry?.modality,
      duration: existingEntry?.duration,
      role: existingEntry?.role,
      practitionerName: existingEntry?.practitionerName || '',
      clientInitials: existingEntry?.clientInitials || '',
      sessionNotes: existingEntry?.sessionNotes || '',
      preSessionFeeling: existingEntry?.preSessionFeeling || '',
      postSessionFeeling: existingEntry?.postSessionFeeling || '',
      insights: existingEntry?.insights || '',
      notes: existingEntry?.notes || '',
      intention: existingEntry?.intention || '',
    }
  });

  const entryType = watch('entryType');
  const isSessionEntry = entryType === 'session_given' || entryType === 'session_received';

  const onSubmit = async (data: FormData) => {
    const input = {
      userId,
      ...data,
      energyLevel,
    };

    if (existingEntry) {
      await updateMutation.mutateAsync({
        id: existingEntry.id,
        ...input,
      });
    } else {
      await createMutation.mutateAsync(input);
    }

    onSuccess();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            {...register('date', { required: true })}
            dark
            data-testid="energy-journal-date"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="entryType">Entry Type</Label>
          <Select
            dark
            value={watch('entryType')}
            onValueChange={(value) => setValue('entryType', value as EnergyEntryType)}
          >
            <SelectTrigger data-testid="energy-entry-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {ENTRY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title (Optional)</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="Give this entry a title..."
          dark
          data-testid="energy-journal-title"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="modality">Modality</Label>
          <Select
            dark
            value={watch('modality') || ''}
            onValueChange={(value) => setValue('modality', value as EnergyModality)}
          >
            <SelectTrigger data-testid="energy-modality">
              <SelectValue placeholder="Select modality" />
            </SelectTrigger>
            <SelectContent>
              {MODALITIES.map((mod) => (
                <SelectItem key={mod.value} value={mod.value}>
                  {mod.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            {...register('duration', { valueAsNumber: true })}
            placeholder="30"
            dark
            data-testid="energy-duration"
          />
        </div>
      </div>

      {isSessionEntry && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="role">Your Role</Label>
            <Select
              dark
              value={watch('role') || ''}
              onValueChange={(value) => setValue('role', value as SessionRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="practitioner">Practitioner</SelectItem>
                <SelectItem value="recipient">Recipient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {entryType === 'session_received' && (
            <div className="space-y-2">
              <Label htmlFor="practitionerName">Practitioner Name</Label>
              <Input
                id="practitionerName"
                {...register('practitionerName')}
                placeholder="Enter name..."
                dark
              />
            </div>
          )}

          {entryType === 'session_given' && (
            <div className="space-y-2">
              <Label htmlFor="clientInitials">Client Initials</Label>
              <Input
                id="clientInitials"
                {...register('clientInitials')}
                placeholder="J.D."
                dark
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="intention">Intention</Label>
        <Input
          id="intention"
          {...register('intention')}
          placeholder="What was your intention?"
          dark
          data-testid="energy-intention"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="preSessionFeeling">Before Session</Label>
          <Input
            id="preSessionFeeling"
            {...register('preSessionFeeling')}
            placeholder="How did you feel before?"
            dark
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postSessionFeeling">After Session</Label>
          <Input
            id="postSessionFeeling"
            {...register('postSessionFeeling')}
            placeholder="How did you feel after?"
            dark
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Energy Level (1-10): {energyLevel}</Label>
        <Slider
          value={[energyLevel]}
          onValueChange={(value) => setEnergyLevel(value[0])}
          min={1}
          max={10}
          step={1}
          className="py-4"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="insights">Insights</Label>
        <Textarea
          id="insights"
          {...register('insights')}
          placeholder="What insights or messages did you receive?"
          dark
          className="min-h-[80px]"
          data-testid="energy-insights"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Any other observations..."
          dark
          className="min-h-[80px]"
          data-testid="energy-notes"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
          data-testid="save-energy-entry"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existingEntry ? 'Update Entry' : 'Save Entry'}
        </Button>
      </div>
    </form>
  );
};
