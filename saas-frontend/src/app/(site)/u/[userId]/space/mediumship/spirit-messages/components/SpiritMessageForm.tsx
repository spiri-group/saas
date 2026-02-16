'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateSpiritMessage,
  useUpdateSpiritMessage,
  SpiritMessage,
  SpiritSource,
  ReceptionMethod,
} from '../../hooks';

interface Props {
  userId: string;
  existingEntry?: SpiritMessage | null;
  onSuccess: () => void;
}

const SPIRIT_SOURCES: { value: SpiritSource; label: string }[] = [
  { value: 'guide', label: 'Spirit Guide' },
  { value: 'loved_one', label: 'Loved One in Spirit' },
  { value: 'angel', label: 'Angel' },
  { value: 'ancestor', label: 'Ancestor' },
  { value: 'higher_self', label: 'Higher Self' },
  { value: 'collective', label: 'Collective Consciousness' },
  { value: 'nature_spirit', label: 'Nature Spirit' },
  { value: 'unknown', label: 'Unknown Source' },
  { value: 'other', label: 'Other' },
];

const RECEPTION_METHODS: { value: ReceptionMethod; label: string; description: string }[] = [
  { value: 'clairvoyance', label: 'Clairvoyance', description: 'Seeing visions or images' },
  { value: 'clairaudience', label: 'Clairaudience', description: 'Hearing words or sounds' },
  { value: 'clairsentience', label: 'Clairsentience', description: 'Feeling sensations or emotions' },
  { value: 'claircognizance', label: 'Claircognizance', description: 'Knowing without knowing how' },
  { value: 'dreams', label: 'Dreams', description: 'Received during sleep' },
  { value: 'meditation', label: 'Meditation', description: 'During meditation practice' },
  { value: 'automatic_writing', label: 'Automatic Writing', description: 'Writing channeled messages' },
  { value: 'pendulum', label: 'Pendulum', description: 'Through pendulum work' },
  { value: 'cards', label: 'Cards', description: 'Through oracle/tarot cards' },
  { value: 'signs', label: 'Signs', description: 'Physical signs and symbols' },
  { value: 'other', label: 'Other', description: 'Another method' },
];

interface FormData {
  date: string;
  messageContent: string;
  source: SpiritSource;
  sourceName?: string;
  sourceDescription?: string;
  receptionMethod: ReceptionMethod;
  receptionContext?: string;
  clarity: number;
  evidentialDetails?: string;
  interpretation?: string;
  validated: boolean;
  validationNotes?: string;
  actionTaken?: string;
  outcome?: string;
}

export const SpiritMessageForm: React.FC<Props> = ({ userId, existingEntry, onSuccess }) => {
  const createMutation = useCreateSpiritMessage();
  const updateMutation = useUpdateSpiritMessage();
  const [emotionsDuring, setEmotionsDuring] = useState<string[]>(existingEntry?.emotionsDuring || []);
  const [emotionsAfter, setEmotionsAfter] = useState<string[]>(existingEntry?.emotionsAfter || []);
  const [newEmotionDuring, setNewEmotionDuring] = useState('');
  const [newEmotionAfter, setNewEmotionAfter] = useState('');

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: {
      date: existingEntry?.date || new Date().toISOString().split('T')[0],
      messageContent: existingEntry?.messageContent || '',
      source: existingEntry?.source || 'unknown',
      sourceName: existingEntry?.sourceName || '',
      sourceDescription: existingEntry?.sourceDescription || '',
      receptionMethod: existingEntry?.receptionMethod || 'clairsentience',
      receptionContext: existingEntry?.receptionContext || '',
      clarity: existingEntry?.clarity || 5,
      evidentialDetails: existingEntry?.evidentialDetails || '',
      interpretation: existingEntry?.interpretation || '',
      validated: existingEntry?.validated || false,
      validationNotes: existingEntry?.validationNotes || '',
      actionTaken: existingEntry?.actionTaken || '',
      outcome: existingEntry?.outcome || '',
    }
  });

  const addEmotionDuring = () => {
    if (newEmotionDuring.trim() && !emotionsDuring.includes(newEmotionDuring.trim())) {
      setEmotionsDuring([...emotionsDuring, newEmotionDuring.trim()]);
      setNewEmotionDuring('');
    }
  };

  const addEmotionAfter = () => {
    if (newEmotionAfter.trim() && !emotionsAfter.includes(newEmotionAfter.trim())) {
      setEmotionsAfter([...emotionsAfter, newEmotionAfter.trim()]);
      setNewEmotionAfter('');
    }
  };

  const onSubmit = async (data: FormData) => {
    const input = {
      userId,
      ...data,
      emotionsDuring: emotionsDuring.length > 0 ? emotionsDuring : undefined,
      emotionsAfter: emotionsAfter.length > 0 ? emotionsAfter : undefined,
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
  const clarity = watch('clarity');
  const source = watch('source');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date Received</Label>
          <Input
            id="date"
            type="date"
            {...register('date', { required: true })}
            dark
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select
            value={watch('source')}
            onValueChange={(value) => setValue('source', value as SpiritSource)}
          >
            <SelectTrigger dark>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent dark>
              {SPIRIT_SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(source === 'loved_one' || source === 'guide' || source === 'ancestor') && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sourceName">Name (if known)</Label>
            <Input
              id="sourceName"
              {...register('sourceName')}
              placeholder="Who sent the message?"
              dark
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sourceDescription">Description</Label>
            <Input
              id="sourceDescription"
              {...register('sourceDescription')}
              placeholder="Any identifying details?"
              dark
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="receptionMethod">How Did You Receive It?</Label>
        <Select
          value={watch('receptionMethod')}
          onValueChange={(value) => setValue('receptionMethod', value as ReceptionMethod)}
        >
          <SelectTrigger dark>
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent dark>
            {RECEPTION_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                <div>
                  <div>{m.label}</div>
                  <div className="text-xs text-slate-400">{m.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="receptionContext">Context</Label>
        <Input
          id="receptionContext"
          {...register('receptionContext')}
          placeholder="What were you doing when you received this?"
          dark
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="messageContent">The Message</Label>
        <Textarea
          id="messageContent"
          {...register('messageContent', { required: true })}
          placeholder="What message did you receive? Include all details..."
          dark className="min-h-[120px]"
          data-testid="message-content"
        />
      </div>

      {/* Clarity Score */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Clarity of Message</Label>
          <span className="text-indigo-400 font-medium">{clarity}/10</span>
        </div>
        <Slider
          value={[clarity]}
          onValueChange={(value) => setValue('clarity', value[0])}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>Vague/Unclear</span>
          <span>Crystal Clear</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="evidentialDetails">Evidential Details</Label>
        <Textarea
          id="evidentialDetails"
          {...register('evidentialDetails')}
          placeholder="Any specific names, dates, facts that could be verified?"
          dark className="min-h-[60px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="interpretation">Your Interpretation</Label>
        <Textarea
          id="interpretation"
          {...register('interpretation')}
          placeholder="What do you think this message means?"
          dark className="min-h-[60px]"
        />
      </div>

      {/* Emotions During */}
      <div className="space-y-2">
        <Label>Emotions During Reception</Label>
        <div className="flex gap-2">
          <Input
            value={newEmotionDuring}
            onChange={(e) => setNewEmotionDuring(e.target.value)}
            placeholder="How did you feel?"
            dark
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmotionDuring())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addEmotionDuring}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {emotionsDuring.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {emotionsDuring.map((emotion, index) => (
              <Badge key={index} variant="secondary" className="bg-indigo-500/20 text-indigo-300">
                {emotion}
                <button
                  type="button"
                  onClick={() => setEmotionsDuring(emotionsDuring.filter((_, i) => i !== index))}
                  className="ml-1 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Emotions After */}
      <div className="space-y-2">
        <Label>Emotions After</Label>
        <div className="flex gap-2">
          <Input
            value={newEmotionAfter}
            onChange={(e) => setNewEmotionAfter(e.target.value)}
            placeholder="How do you feel now?"
            dark
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmotionAfter())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addEmotionAfter}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {emotionsAfter.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {emotionsAfter.map((emotion, index) => (
              <Badge key={index} variant="secondary" className="bg-green-500/20 text-green-300">
                {emotion}
                <button
                  type="button"
                  onClick={() => setEmotionsAfter(emotionsAfter.filter((_, i) => i !== index))}
                  className="ml-1 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {existingEntry && (
        <>
          <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
            <Switch
              id="validated"
              checked={watch('validated')}
              onCheckedChange={(checked) => setValue('validated', checked)}
            />
            <Label htmlFor="validated" className="text-sm text-slate-400">
              Message has been validated
            </Label>
          </div>

          {watch('validated') && (
            <div className="space-y-2">
              <Label htmlFor="validationNotes">Validation Notes</Label>
              <Textarea
                id="validationNotes"
                {...register('validationNotes')}
                placeholder="How was this message validated?"
                dark className="min-h-[60px]"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="actionTaken">Action Taken</Label>
            <Textarea
              id="actionTaken"
              {...register('actionTaken')}
              placeholder="What did you do in response to this message?"
              dark className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcome">Outcome</Label>
            <Textarea
              id="outcome"
              {...register('outcome')}
              placeholder="What was the result?"
              dark className="min-h-[60px]"
            />
          </div>
        </>
      )}

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          data-testid="save-spirit-message"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existingEntry ? 'Update Message' : 'Save Message'}
        </Button>
      </div>
    </form>
  );
};
