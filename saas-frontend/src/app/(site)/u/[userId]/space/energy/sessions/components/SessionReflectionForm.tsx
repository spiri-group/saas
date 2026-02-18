'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateSessionReflection,
  SessionReflection,
  EnergyModality,
} from '../../hooks';

interface Props {
  userId: string;
  existingReflection?: SessionReflection | null;
  onSuccess: () => void;
}

const MODALITIES: { value: EnergyModality; label: string }[] = [
  { value: 'reiki', label: 'Reiki' },
  { value: 'pranic_healing', label: 'Pranic Healing' },
  { value: 'crystal_healing', label: 'Crystal Healing' },
  { value: 'sound_healing', label: 'Sound Healing' },
  { value: 'breathwork', label: 'Breathwork' },
  { value: 'meditation', label: 'Meditation' },
  { value: 'chakra_balancing', label: 'Chakra Balancing' },
  { value: 'acupuncture', label: 'Acupuncture' },
  { value: 'qigong', label: 'Qigong' },
  { value: 'theta_healing', label: 'Theta Healing' },
  { value: 'shamanic', label: 'Shamanic Healing' },
  { value: 'other', label: 'Other' },
];

const SESSION_ROLES = [
  { value: 'practitioner', label: 'Practitioner (I gave the session)' },
  { value: 'recipient', label: 'Recipient (I received the session)' },
  { value: 'self', label: 'Self Practice' },
];

const COMMON_SENSATIONS = [
  'warmth',
  'tingling',
  'coolness',
  'heaviness',
  'lightness',
  'pulsing',
  'vibration',
  'pressure',
  'release',
  'emotional',
];

interface FormData {
  sessionDate: string;
  practitionerName: string;
  sessionType?: string;
  duration?: number;
  preSessionState?: string;
  duringSession?: string;
  postSessionState?: string;
  messagesReceived?: string;
  aftercare?: string;
  personalNotes?: string;
  shiftsNoticed?: string;
  followUpDate?: string;
}

export const SessionReflectionForm: React.FC<Props> = ({ userId, existingReflection, onSuccess }) => {
  const createMutation = useCreateSessionReflection();
  const [modality, setModality] = useState<EnergyModality>(existingReflection?.modality || 'reiki');
  const [role, setRole] = useState(existingReflection?.role || 'recipient');
  const [rating, setRating] = useState(existingReflection?.overallRating || 0);
  const [wouldRecommend, setWouldRecommend] = useState(existingReflection?.wouldRecommend || false);
  const [sensations, setSensations] = useState<string[]>(existingReflection?.sensations || []);
  const [areasWorkedOn, setAreasWorkedOn] = useState<string[]>(existingReflection?.areasWorkedOn || []);
  const [customArea, setCustomArea] = useState('');

  const { register, handleSubmit } = useForm<FormData>({
    defaultValues: {
      sessionDate: existingReflection?.date || new Date().toISOString().split('T')[0],
      practitionerName: existingReflection?.practitionerName || '',
      sessionType: existingReflection?.sessionType || '',
      duration: existingReflection?.duration || 60,
      preSessionState: existingReflection?.preSessionState || '',
      duringSession: existingReflection?.duringSession || '',
      postSessionState: existingReflection?.postSessionState || '',
      messagesReceived: existingReflection?.messagesReceived || '',
      aftercare: existingReflection?.aftercare || '',
      personalNotes: existingReflection?.personalNotes || '',
      shiftsNoticed: existingReflection?.shiftsNoticed || '',
      followUpDate: existingReflection?.followUpDate || '',
    }
  });

  const toggleSensation = (sensation: string) => {
    setSensations(prev =>
      prev.includes(sensation)
        ? prev.filter(s => s !== sensation)
        : [...prev, sensation]
    );
  };

  const addCustomArea = () => {
    if (customArea.trim() && !areasWorkedOn.includes(customArea.trim())) {
      setAreasWorkedOn(prev => [...prev, customArea.trim()]);
      setCustomArea('');
    }
  };

  const removeArea = (area: string) => {
    setAreasWorkedOn(prev => prev.filter(a => a !== area));
  };

  const onSubmit = async (data: FormData) => {
    const input = {
      userId,
      date: data.sessionDate,
      practitionerName: data.practitionerName,
      modality,
      role,
      sessionType: data.sessionType,
      duration: data.duration,
      preSessionState: data.preSessionState,
      duringSession: data.duringSession,
      postSessionState: data.postSessionState,
      sensations,
      areasWorkedOn,
      messagesReceived: data.messagesReceived,
      aftercare: data.aftercare,
      personalNotes: data.personalNotes,
      wouldRecommend,
      overallRating: rating,
      shiftsNoticed: data.shiftsNoticed,
      followUpDate: data.followUpDate,
    };

    await createMutation.mutateAsync(input);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sessionDate">Session Date</Label>
          <Input
            id="sessionDate"
            type="date"
            {...register('sessionDate', { required: true })}
            dark
            data-testid="session-date"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min={5}
            max={480}
            {...register('duration', { valueAsNumber: true })}
            dark
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Modality</Label>
          <Select dark value={modality} onValueChange={(v) => setModality(v as EnergyModality)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODALITIES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Your Role</Label>
          <Select dark value={role} onValueChange={(v) => setRole(v as 'practitioner' | 'recipient' | 'self')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SESSION_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {role !== 'self' && (
        <div className="space-y-2">
          <Label htmlFor="practitionerName">
            {role === 'practitioner' ? 'Client Name' : 'Practitioner Name'}
          </Label>
          <Input
            id="practitionerName"
            {...register('practitionerName')}
            placeholder={role === 'practitioner' ? 'Enter client name' : 'Enter practitioner name'}
            dark
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="sessionType">Session Type / Focus</Label>
        <Input
          id="sessionType"
          {...register('sessionType')}
          placeholder="e.g., Chakra balancing, Trauma release, General healing"
          dark
        />
      </div>

      {/* Session States */}
      <div className="space-y-4">
        <Label className="text-base">Session Experience</Label>

        <div className="space-y-2">
          <Label htmlFor="preSessionState" dark className="text-sm">Before the session</Label>
          <Textarea
            id="preSessionState"
            {...register('preSessionState')}
            placeholder="How were you feeling before the session?"
            dark
            className="min-h-[60px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duringSession" dark className="text-sm">During the session</Label>
          <Textarea
            id="duringSession"
            {...register('duringSession')}
            placeholder="What did you experience during the session?"
            dark
            className="min-h-[60px]"
            data-testid="session-during"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postSessionState" dark className="text-sm">After the session</Label>
          <Textarea
            id="postSessionState"
            {...register('postSessionState')}
            placeholder="How did you feel after the session?"
            dark
            className="min-h-[60px]"
          />
        </div>
      </div>

      {/* Sensations */}
      <div className="space-y-2">
        <Label>Sensations Experienced</Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_SENSATIONS.map((sensation) => (
            <button
              key={sensation}
              type="button"
              onClick={() => toggleSensation(sensation)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                sensations.includes(sensation)
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/10 text-slate-400 hover:bg-white/20'
              }`}
            >
              {sensation}
            </button>
          ))}
        </div>
      </div>

      {/* Areas Worked On */}
      <div className="space-y-2">
        <Label>Areas Worked On</Label>
        <div className="flex gap-2">
          <Input
            value={customArea}
            onChange={(e) => setCustomArea(e.target.value)}
            placeholder="e.g., Heart chakra, Lower back, Crown"
            dark
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomArea())}
          />
          <Button type="button" variant="outline" onClick={addCustomArea}>
            Add
          </Button>
        </div>
        {areasWorkedOn.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {areasWorkedOn.map((area) => (
              <span
                key={area}
                className="px-2 py-1 text-sm bg-teal-500/20 text-teal-300 rounded-full flex items-center gap-1"
              >
                {area}
                <button
                  type="button"
                  onClick={() => removeArea(area)}
                  className="ml-1 hover:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="messagesReceived">Messages or Insights Received</Label>
        <Textarea
          id="messagesReceived"
          {...register('messagesReceived')}
          placeholder="Any messages, visions, or insights during the session"
          dark
          className="min-h-[60px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="shiftsNoticed">Shifts Noticed</Label>
        <Textarea
          id="shiftsNoticed"
          {...register('shiftsNoticed')}
          placeholder="Any shifts in energy, emotions, or physical sensations"
          dark
          className="min-h-[60px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="aftercare">Aftercare Notes</Label>
        <Textarea
          id="aftercare"
          {...register('aftercare')}
          placeholder="Recommended aftercare or integration practices"
          dark
          className="min-h-[60px]"
        />
      </div>

      {/* Rating */}
      <div className="space-y-2">
        <Label>Overall Rating</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="p-1 hover:scale-110 transition-transform"
            >
              {star <= rating ? (
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              ) : (
                <StarOff className="w-6 h-6 text-slate-600" />
              )}
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-slate-400">{rating}/5</span>
          )}
        </div>
      </div>

      {/* Would Recommend */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="wouldRecommend"
          checked={wouldRecommend}
          onCheckedChange={(checked) => setWouldRecommend(checked as boolean)}
          dark
        />
        <Label htmlFor="wouldRecommend" className="cursor-pointer">
          Would recommend this practitioner/session type
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="followUpDate">Follow-up Date (Optional)</Label>
          <Input
            id="followUpDate"
            type="date"
            {...register('followUpDate')}
            dark
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="personalNotes">Personal Notes</Label>
        <Textarea
          id="personalNotes"
          {...register('personalNotes')}
          placeholder="Any additional private notes about this session"
          dark
          className="min-h-[60px]"
          data-testid="session-notes"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={createMutation.isPending}
          className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
          data-testid="save-session-reflection"
        >
          {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existingReflection ? 'Update Reflection' : 'Save Reflection'}
        </Button>
      </div>
    </form>
  );
};
