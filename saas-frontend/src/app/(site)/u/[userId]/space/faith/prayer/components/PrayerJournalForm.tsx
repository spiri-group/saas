'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  useCreatePrayerEntry,
  useUpdatePrayerEntry,
  PrayerJournalEntry,
  PrayerType,
  PrayerStatus,
} from '../../hooks';

interface Props {
  userId: string;
  existingEntry?: PrayerJournalEntry | null;
  onSuccess: () => void;
}

const PRAYER_TYPES: { value: PrayerType; label: string; description: string }[] = [
  { value: 'praise', label: 'Praise', description: 'Glorifying God for who He is' },
  { value: 'thanksgiving', label: 'Thanksgiving', description: 'Expressing gratitude for blessings' },
  { value: 'petition', label: 'Petition', description: 'Personal requests and needs' },
  { value: 'intercession', label: 'Intercession', description: 'Praying for others' },
  { value: 'confession', label: 'Confession', description: 'Acknowledging sins and seeking forgiveness' },
  { value: 'meditation', label: 'Meditation', description: 'Quiet reflection and listening' },
  { value: 'contemplation', label: 'Contemplation', description: 'Silent communion with God' },
  { value: 'devotional', label: 'Devotional', description: 'Scripture-based prayer time' },
];

const PRAYER_STATUS: { value: PrayerStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'answered', label: 'Answered' },
  { value: 'answered_differently', label: 'Answered Differently' },
];

interface FormData {
  date: string;
  prayerType: PrayerType;
  title?: string;
  content: string;
  status?: PrayerStatus;
  prayingFor?: string;
  scriptureReference?: string;
  scriptureText?: string;
  insights?: string;
  feelingBefore?: string;
  feelingAfter?: string;
  isPrivate?: boolean;
}

export const PrayerJournalForm: React.FC<Props> = ({ userId, existingEntry, onSuccess }) => {
  const createMutation = useCreatePrayerEntry();
  const updateMutation = useUpdatePrayerEntry();
  const [requests, setRequests] = useState<string[]>(existingEntry?.requests || []);
  const [gratitude, setGratitude] = useState<string[]>(existingEntry?.gratitude || []);
  const [tags, setTags] = useState<string[]>(existingEntry?.tags || []);
  const [newRequest, setNewRequest] = useState('');
  const [newGratitude, setNewGratitude] = useState('');
  const [newTag, setNewTag] = useState('');

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: {
      date: existingEntry?.date || new Date().toISOString().split('T')[0],
      prayerType: existingEntry?.prayerType || 'petition',
      title: existingEntry?.title || '',
      content: existingEntry?.content || '',
      status: existingEntry?.status || 'active',
      prayingFor: existingEntry?.prayingFor || '',
      scriptureReference: existingEntry?.scriptureReference || '',
      scriptureText: existingEntry?.scriptureText || '',
      insights: existingEntry?.insights || '',
      feelingBefore: existingEntry?.feelingBefore || '',
      feelingAfter: existingEntry?.feelingAfter || '',
      isPrivate: existingEntry?.isPrivate ?? true,
    }
  });

  const prayerType = watch('prayerType');
  const showPrayingFor = prayerType === 'intercession' || prayerType === 'petition';

  const addRequest = () => {
    if (newRequest.trim()) {
      setRequests([...requests, newRequest.trim()]);
      setNewRequest('');
    }
  };

  const removeRequest = (index: number) => {
    setRequests(requests.filter((_, i) => i !== index));
  };

  const addGratitude = () => {
    if (newGratitude.trim()) {
      setGratitude([...gratitude, newGratitude.trim()]);
      setNewGratitude('');
    }
  };

  const removeGratitude = (index: number) => {
    setGratitude(gratitude.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim().toLowerCase())) {
      setTags([...tags, newTag.trim().toLowerCase()]);
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    const input = {
      userId,
      ...data,
      requests: requests.length > 0 ? requests : undefined,
      gratitude: gratitude.length > 0 ? gratitude : undefined,
      tags: tags.length > 0 ? tags : undefined,
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
            className="bg-slate-800 border-slate-700"
            data-testid="prayer-date"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prayerType">Prayer Type</Label>
          <Select
            value={watch('prayerType')}
            onValueChange={(value) => setValue('prayerType', value as PrayerType)}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700" data-testid="prayer-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {PRAYER_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <div>{type.label}</div>
                    <div className="text-xs text-slate-400">{type.description}</div>
                  </div>
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
          placeholder="Give this prayer a title..."
          className="bg-slate-800 border-slate-700"
          data-testid="prayer-title"
        />
      </div>

      {showPrayingFor && (
        <div className="space-y-2">
          <Label htmlFor="prayingFor">Praying For</Label>
          <Input
            id="prayingFor"
            {...register('prayingFor')}
            placeholder="Who or what are you praying for?"
            className="bg-slate-800 border-slate-700"
            data-testid="praying-for"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="content">Prayer Content</Label>
        <Textarea
          id="content"
          {...register('content', { required: true })}
          placeholder="Write your prayer here..."
          className="bg-slate-800 border-slate-700 min-h-[120px]"
          data-testid="prayer-content"
        />
      </div>

      {/* Prayer Requests */}
      <div className="space-y-2">
        <Label>Specific Requests</Label>
        <div className="flex gap-2">
          <Input
            value={newRequest}
            onChange={(e) => setNewRequest(e.target.value)}
            placeholder="Add a specific request..."
            className="bg-slate-800 border-slate-700"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequest())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addRequest}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {requests.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {requests.map((request, index) => (
              <Badge key={index} variant="secondary" className="bg-indigo-500/20 text-indigo-300">
                {request}
                <button
                  type="button"
                  onClick={() => removeRequest(index)}
                  className="ml-1 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Gratitude Items */}
      {(prayerType === 'thanksgiving' || prayerType === 'praise') && (
        <div className="space-y-2">
          <Label>Things I&apos;m Grateful For</Label>
          <div className="flex gap-2">
            <Input
              value={newGratitude}
              onChange={(e) => setNewGratitude(e.target.value)}
              placeholder="Add gratitude item..."
              className="bg-slate-800 border-slate-700"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGratitude())}
            />
            <Button type="button" variant="outline" size="icon" onClick={addGratitude}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {gratitude.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {gratitude.map((item, index) => (
                <Badge key={index} variant="secondary" className="bg-green-500/20 text-green-300">
                  {item}
                  <button
                    type="button"
                    onClick={() => removeGratitude(index)}
                    className="ml-1 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scripture Reference */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="scriptureReference">Scripture Reference</Label>
          <Input
            id="scriptureReference"
            {...register('scriptureReference')}
            placeholder="e.g., John 3:16"
            className="bg-slate-800 border-slate-700"
            data-testid="scripture-reference"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={watch('status')}
            onValueChange={(value) => setValue('status', value as PrayerStatus)}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700" data-testid="prayer-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {PRAYER_STATUS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scriptureText">Scripture Text (Optional)</Label>
        <Textarea
          id="scriptureText"
          {...register('scriptureText')}
          placeholder="Copy the verse text here..."
          className="bg-slate-800 border-slate-700 min-h-[60px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="feelingBefore">How I Feel Before</Label>
          <Input
            id="feelingBefore"
            {...register('feelingBefore')}
            placeholder="Anxious, grateful, hopeful..."
            className="bg-slate-800 border-slate-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="feelingAfter">How I Feel After</Label>
          <Input
            id="feelingAfter"
            {...register('feelingAfter')}
            placeholder="Peaceful, relieved, hopeful..."
            className="bg-slate-800 border-slate-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="insights">Insights or What I Heard</Label>
        <Textarea
          id="insights"
          {...register('insights')}
          placeholder="Any thoughts, impressions, or messages received during prayer..."
          className="bg-slate-800 border-slate-700 min-h-[80px]"
          data-testid="prayer-insights"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add a tag..."
            className="bg-slate-800 border-slate-700"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addTag}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-slate-300">
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="ml-1 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Switch
            id="isPrivate"
            checked={watch('isPrivate')}
            onCheckedChange={(checked) => setValue('isPrivate', checked)}
          />
          <Label htmlFor="isPrivate" className="text-sm text-slate-400">
            Keep private
          </Label>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          data-testid="save-prayer-entry"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existingEntry ? 'Update Prayer' : 'Save Prayer'}
        </Button>
      </div>
    </form>
  );
};
