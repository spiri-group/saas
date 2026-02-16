'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  useCreateChakraCheckin,
  ChakraCheckin,
  ChakraType,
  ChakraStatus,
  ChakraState,
} from '../../hooks';

interface Props {
  userId: string;
  existingCheckin?: ChakraCheckin | null;
  onSuccess: () => void;
}

const CHAKRAS: { value: ChakraType; label: string; color: string }[] = [
  { value: 'root', label: 'Root', color: 'bg-red-500' },
  { value: 'sacral', label: 'Sacral', color: 'bg-orange-500' },
  { value: 'solar_plexus', label: 'Solar Plexus', color: 'bg-yellow-500' },
  { value: 'heart', label: 'Heart', color: 'bg-green-500' },
  { value: 'throat', label: 'Throat', color: 'bg-blue-500' },
  { value: 'third_eye', label: 'Third Eye', color: 'bg-indigo-500' },
  { value: 'crown', label: 'Crown', color: 'bg-purple-500' },
];

const STATUSES: { value: ChakraStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'overactive', label: 'Overactive' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'weak', label: 'Weak' },
  { value: 'unclear', label: 'Unclear' },
];

interface FormData {
  date: string;
  checkInTime?: string;
  physicalState?: string;
  emotionalState?: string;
  mentalState?: string;
  observations?: string;
  actionTaken?: string;
}

export const ChakraCheckinForm: React.FC<Props> = ({ userId, existingCheckin, onSuccess }) => {
  const createMutation = useCreateChakraCheckin();
  const [overallBalance, setOverallBalance] = useState(existingCheckin?.overallBalance || 5);

  // Initialize chakra states
  const initialChakraStates: Record<ChakraType, ChakraStatus> = existingCheckin
    ? existingCheckin.chakras.reduce((acc, c) => ({ ...acc, [c.chakra]: c.status }), {} as Record<ChakraType, ChakraStatus>)
    : CHAKRAS.reduce((acc, c) => ({ ...acc, [c.value]: 'unclear' as ChakraStatus }), {} as Record<ChakraType, ChakraStatus>);

  const [chakraStates, setChakraStates] = useState<Record<ChakraType, ChakraStatus>>(initialChakraStates);

  const { register, handleSubmit } = useForm<FormData>({
    defaultValues: {
      date: existingCheckin?.date || new Date().toISOString().split('T')[0],
      checkInTime: existingCheckin?.checkInTime || '',
      physicalState: existingCheckin?.physicalState || '',
      emotionalState: existingCheckin?.emotionalState || '',
      mentalState: existingCheckin?.mentalState || '',
      observations: existingCheckin?.observations || '',
      actionTaken: existingCheckin?.actionTaken || '',
    }
  });

  const updateChakraStatus = (chakra: ChakraType, status: ChakraStatus) => {
    setChakraStates(prev => ({ ...prev, [chakra]: status }));
  };

  const onSubmit = async (data: FormData) => {
    const chakras: ChakraState[] = Object.entries(chakraStates).map(([chakra, status]) => ({
      chakra: chakra as ChakraType,
      status,
    }));

    // Determine dominant and weakest chakras
    const openChakras = chakras.filter(c => c.status === 'open' || c.status === 'balanced');
    const blockedChakras = chakras.filter(c => c.status === 'blocked' || c.status === 'weak');

    const input = {
      userId,
      date: data.date,
      checkInTime: data.checkInTime,
      chakras,
      overallBalance,
      dominantChakra: openChakras.length > 0 ? openChakras[0].chakra : undefined,
      weakestChakra: blockedChakras.length > 0 ? blockedChakras[0].chakra : undefined,
      physicalState: data.physicalState,
      emotionalState: data.emotionalState,
      mentalState: data.mentalState,
      observations: data.observations,
      actionTaken: data.actionTaken,
    };

    await createMutation.mutateAsync(input);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            {...register('date', { required: true })}
            dark
            data-testid="chakra-checkin-date"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkInTime">Time (Optional)</Label>
          <Input
            id="checkInTime"
            type="time"
            {...register('checkInTime')}
            dark
          />
        </div>
      </div>

      {/* Chakra Status Grid */}
      <div className="space-y-3">
        <Label>Chakra States</Label>
        <p className="text-sm text-slate-400">Tap each chakra to assess its current state</p>

        <div className="grid grid-cols-1 gap-3">
          {CHAKRAS.map((chakra) => (
            <div key={chakra.value} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
              <div className={`w-4 h-4 rounded-full ${chakra.color}`} />
              <div className="w-28 text-white font-medium">{chakra.label}</div>
              <div className="flex-1 grid grid-cols-3 md:grid-cols-6 gap-1">
                {STATUSES.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => updateChakraStatus(chakra.value, status.value)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      chakraStates[chakra.value] === status.value
                        ? status.value === 'open' || status.value === 'balanced'
                          ? 'bg-green-500 text-white'
                          : status.value === 'blocked' || status.value === 'weak'
                            ? 'bg-red-500 text-white'
                            : status.value === 'overactive'
                              ? 'bg-orange-500 text-white'
                              : 'bg-slate-500 text-white'
                        : 'bg-white/10 text-slate-400 hover:bg-white/20'
                    }`}
                    data-testid={`chakra-${chakra.value}-${status.value}`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall Balance */}
      <div className="space-y-2">
        <Label>Overall Balance (1-10): {overallBalance}</Label>
        <Slider
          value={[overallBalance]}
          onValueChange={(value) => setOverallBalance(value[0])}
          min={1}
          max={10}
          step={1}
          className="py-4"
        />
      </div>

      {/* State Assessment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="physicalState">Physical State</Label>
          <Input
            id="physicalState"
            {...register('physicalState')}
            placeholder="How does your body feel?"
            dark
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="emotionalState">Emotional State</Label>
          <Input
            id="emotionalState"
            {...register('emotionalState')}
            placeholder="How are you feeling emotionally?"
            dark
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mentalState">Mental State</Label>
          <Input
            id="mentalState"
            {...register('mentalState')}
            placeholder="How is your mental clarity?"
            dark
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observations">Observations</Label>
        <Textarea
          id="observations"
          {...register('observations')}
          placeholder="What did you notice during this check-in?"
          dark
          className="min-h-[80px]"
          data-testid="chakra-observations"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="actionTaken">Action Taken</Label>
        <Textarea
          id="actionTaken"
          {...register('actionTaken')}
          placeholder="What did you do to address any imbalances?"
          dark
          className="min-h-[60px]"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={createMutation.isPending}
          className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
          data-testid="save-chakra-checkin"
        >
          {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existingCheckin ? 'Update Check-In' : 'Save Check-In'}
        </Button>
      </div>
    </form>
  );
};
