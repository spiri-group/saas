'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import {
  useCreateScriptureReflection,
  useUpdateScriptureReflection,
  ScriptureReflection,
  ScriptureBookType,
} from '../../hooks';

interface Props {
  userId: string;
  existingEntry?: ScriptureReflection | null;
  onSuccess: () => void;
}

const BOOK_TYPES: { value: ScriptureBookType; label: string }[] = [
  { value: 'old_testament', label: 'Old Testament' },
  { value: 'new_testament', label: 'New Testament' },
  { value: 'psalms', label: 'Psalms' },
  { value: 'proverbs', label: 'Proverbs' },
  { value: 'gospels', label: 'Gospels' },
  { value: 'epistles', label: 'Epistles' },
  { value: 'prophets', label: 'Prophets' },
  { value: 'wisdom', label: 'Wisdom Literature' },
  { value: 'other', label: 'Other' },
];

const READING_CONTEXTS = [
  'Morning devotion',
  'Bible study',
  'Church service',
  'Small group',
  'Personal reading',
  'Meditation',
  'Prayer time',
  'Other',
];

const BIBLE_VERSIONS = [
  'NIV',
  'ESV',
  'KJV',
  'NKJV',
  'NLT',
  'NASB',
  'MSG',
  'AMP',
  'CSB',
  'Other',
];

interface FormData {
  date: string;
  reference: string;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  bookType?: ScriptureBookType;
  text?: string;
  whatSpokeToMe: string;
  personalApplication?: string;
  readingContext?: string;
  version?: string;
  prayerResponse?: string;
}

export const ScriptureReflectionForm: React.FC<Props> = ({ userId, existingEntry, onSuccess }) => {
  const createMutation = useCreateScriptureReflection();
  const updateMutation = useUpdateScriptureReflection();
  const [questions, setQuestions] = useState<string[]>(existingEntry?.questions || []);
  const [crossReferences, setCrossReferences] = useState<string[]>(existingEntry?.crossReferences || []);
  const [newQuestion, setNewQuestion] = useState('');
  const [newCrossRef, setNewCrossRef] = useState('');

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: {
      date: existingEntry?.date || new Date().toISOString().split('T')[0],
      reference: existingEntry?.reference || '',
      book: existingEntry?.book || '',
      chapter: existingEntry?.chapter,
      verseStart: existingEntry?.verseStart,
      verseEnd: existingEntry?.verseEnd,
      bookType: existingEntry?.bookType,
      text: existingEntry?.text || '',
      whatSpokeToMe: existingEntry?.whatSpokeToMe || '',
      personalApplication: existingEntry?.personalApplication || '',
      readingContext: existingEntry?.readingContext || '',
      version: existingEntry?.version || '',
      prayerResponse: existingEntry?.prayerResponse || '',
    }
  });

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setQuestions([...questions, newQuestion.trim()]);
      setNewQuestion('');
    }
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addCrossRef = () => {
    if (newCrossRef.trim()) {
      setCrossReferences([...crossReferences, newCrossRef.trim()]);
      setNewCrossRef('');
    }
  };

  const removeCrossRef = (index: number) => {
    setCrossReferences(crossReferences.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    const input = {
      userId,
      ...data,
      chapter: data.chapter || undefined,
      verseStart: data.verseStart || undefined,
      verseEnd: data.verseEnd || undefined,
      questions: questions.length > 0 ? questions : undefined,
      crossReferences: crossReferences.length > 0 ? crossReferences : undefined,
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
            data-testid="scripture-date"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">Bible Version</Label>
          <Select
            value={watch('version') || ''}
            onValueChange={(value) => setValue('version', value)}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700">
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {BIBLE_VERSIONS.map((version) => (
                <SelectItem key={version} value={version}>
                  {version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference">Scripture Reference</Label>
        <Input
          id="reference"
          {...register('reference', { required: true })}
          placeholder="e.g., John 3:16-17 or Psalm 23"
          className="bg-slate-800 border-slate-700"
          data-testid="scripture-reference"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="book">Book</Label>
          <Input
            id="book"
            {...register('book')}
            placeholder="e.g., John"
            className="bg-slate-800 border-slate-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chapter">Chapter</Label>
          <Input
            id="chapter"
            type="number"
            {...register('chapter', { valueAsNumber: true })}
            placeholder="3"
            className="bg-slate-800 border-slate-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bookType">Book Type</Label>
          <Select
            value={watch('bookType') || ''}
            onValueChange={(value) => setValue('bookType', value as ScriptureBookType)}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {BOOK_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="verseStart">Verse Start</Label>
          <Input
            id="verseStart"
            type="number"
            {...register('verseStart', { valueAsNumber: true })}
            placeholder="16"
            className="bg-slate-800 border-slate-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="verseEnd">Verse End</Label>
          <Input
            id="verseEnd"
            type="number"
            {...register('verseEnd', { valueAsNumber: true })}
            placeholder="17"
            className="bg-slate-800 border-slate-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="readingContext">Reading Context</Label>
        <Select
          value={watch('readingContext') || ''}
          onValueChange={(value) => setValue('readingContext', value)}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700">
            <SelectValue placeholder="When/where did you read this?" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {READING_CONTEXTS.map((context) => (
              <SelectItem key={context} value={context}>
                {context}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="text">Scripture Text (Optional)</Label>
        <Textarea
          id="text"
          {...register('text')}
          placeholder="Copy the passage text here..."
          className="bg-slate-800 border-slate-700 min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatSpokeToMe">What Spoke to Me</Label>
        <Textarea
          id="whatSpokeToMe"
          {...register('whatSpokeToMe', { required: true })}
          placeholder="What stood out? What touched your heart?"
          className="bg-slate-800 border-slate-700 min-h-[100px]"
          data-testid="what-spoke-to-me"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="personalApplication">Personal Application</Label>
        <Textarea
          id="personalApplication"
          {...register('personalApplication')}
          placeholder="How can you apply this to your life?"
          className="bg-slate-800 border-slate-700 min-h-[80px]"
          data-testid="personal-application"
        />
      </div>

      {/* Questions */}
      <div className="space-y-2">
        <Label>Questions to Explore</Label>
        <div className="flex gap-2">
          <Input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Add a question..."
            className="bg-slate-800 border-slate-700"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addQuestion}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {questions.length > 0 && (
          <div className="space-y-2 mt-2">
            {questions.map((question, index) => (
              <div key={index} className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-300 flex-1">{question}</span>
                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cross References */}
      <div className="space-y-2">
        <Label>Cross References</Label>
        <div className="flex gap-2">
          <Input
            value={newCrossRef}
            onChange={(e) => setNewCrossRef(e.target.value)}
            placeholder="Add a related verse (e.g., Romans 8:28)"
            className="bg-slate-800 border-slate-700"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCrossRef())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addCrossRef}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {crossReferences.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {crossReferences.map((ref, index) => (
              <Badge key={index} variant="secondary" className="bg-emerald-500/20 text-emerald-300">
                {ref}
                <button
                  type="button"
                  onClick={() => removeCrossRef(index)}
                  className="ml-1 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="prayerResponse">Prayer Response</Label>
        <Textarea
          id="prayerResponse"
          {...register('prayerResponse')}
          placeholder="A prayer in response to what you read..."
          className="bg-slate-800 border-slate-700 min-h-[80px]"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
          data-testid="save-scripture-reflection"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existingEntry ? 'Update Reflection' : 'Save Reflection'}
        </Button>
      </div>
    </form>
  );
};
