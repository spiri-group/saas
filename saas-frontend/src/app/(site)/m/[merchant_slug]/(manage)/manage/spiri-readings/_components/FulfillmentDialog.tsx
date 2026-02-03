'use client';

import { useState } from 'react';
import { ClaimedReadingRequest, useFulfillReadingRequest } from '../_hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Sparkles, Camera, ImageIcon } from 'lucide-react';
import FileUploader from '@/components/ux/FileUploader';
import { media_type } from '@/utils/spiriverse';
import TarotCardPicker from './TarotCardPicker';

interface ReadingCardForm {
  name: string;
  reversed: boolean;
  position: string;
  interpretation: string;
}

interface FulfillmentDialogProps {
  request: ClaimedReadingRequest;
  readerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const getPositionSuggestions = (spreadType: string, index: number): string => {
  if (spreadType === 'SINGLE') return 'Guidance';
  if (spreadType === 'THREE_CARD') {
    return ['Past', 'Present', 'Future'][index] || `Card ${index + 1}`;
  }
  if (spreadType === 'FIVE_CARD') {
    return ['Present', 'Challenge', 'Past', 'Future', 'Potential'][index] || `Card ${index + 1}`;
  }
  return `Card ${index + 1}`;
};

const getCardCount = (spreadType: string): number => {
  switch (spreadType) {
    case 'SINGLE': return 1;
    case 'THREE_CARD': return 3;
    case 'FIVE_CARD': return 5;
    default: return 1;
  }
};

const FulfillmentDialog: React.FC<FulfillmentDialogProps> = ({
  request,
  readerId,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const cardCount = getCardCount(request.spreadType);
  const initialCards: ReadingCardForm[] = Array.from({ length: cardCount }, (_, i) => ({
    name: '',
    reversed: false,
    position: getPositionSuggestions(request.spreadType, i),
    interpretation: '',
  }));

  const [photoUrl, setPhotoUrl] = useState('');
  const [cards, setCards] = useState<ReadingCardForm[]>(initialCards);
  const [overallMessage, setOverallMessage] = useState('');

  const fulfillMutation = useFulfillReadingRequest();

  const updateCard = (index: number, field: keyof ReadingCardForm, value: string | boolean) => {
    const updated = [...cards];
    updated[index] = { ...updated[index], [field]: value };
    setCards(updated);
  };

  const isValid = () => {
    if (!photoUrl.trim()) return false;
    return cards.every(card => card.name.trim() && card.interpretation.trim());
  };

  const handleSubmit = async () => {
    if (!isValid()) return;

    try {
      const result = await fulfillMutation.mutateAsync({
        requestId: request.id,
        readerId,
        photoUrl: photoUrl.trim(),
        cards: cards.map(c => ({
          name: c.name.trim(),
          reversed: c.reversed,
          position: c.position.trim(),
          interpretation: c.interpretation.trim(),
        })),
        overallMessage: overallMessage.trim() || undefined,
      });

      if (result.success) {
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Failed to fulfill reading:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full md:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700" data-testid="fulfillment-dialog">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Fulfill Reading Request
          </DialogTitle>
        </DialogHeader>

        {/* Request Summary */}
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 mb-4">
          <p className="text-sm text-slate-400 mb-1">Topic:</p>
          <p className="text-white text-sm">{request.topic}</p>
          {request.context && (
            <>
              <p className="text-sm text-slate-400 mt-2 mb-1">Context:</p>
              <p className="text-slate-300 text-sm">{request.context}</p>
            </>
          )}
        </div>

        {/* Two-column layout on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Photo Upload */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-200 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Photo of your spread <span className="text-red-400">*</span>
              </Label>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                <FileUploader
                  id={`spread-photo-${request.id}`}
                  className="h-48 lg:h-64 w-full"
                  imageClassName="rounded-lg"
                  connection={{
                    container: 'public',
                    relative_path: `readings/${readerId}/${request.id}`
                  }}
                  acceptOnly={{ type: 'IMAGE' }}
                  allowMultiple={false}
                  value={photoUrl ? [photoUrl] : null}
                  onDropAsync={() => {}}
                  onUploadCompleteAsync={(files: media_type[]) => {
                    if (files.length > 0) {
                      setPhotoUrl(files[0].url);
                    }
                  }}
                  onRemoveAsync={() => {
                    setPhotoUrl('');
                  }}
                  includePreview={true}
                />
              </div>
              {photoUrl ? (
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  Photo uploaded successfully
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Click or drag to upload a photo of your card spread
                </p>
              )}
            </div>

            {/* Overall Message - moved to left column on desktop */}
            <div className="space-y-2 hidden lg:block">
              <Label className="text-slate-200">
                Overall message <span className="text-slate-500">(optional)</span>
              </Label>
              <Textarea
                value={overallMessage}
                onChange={(e) => setOverallMessage(e.target.value)}
                placeholder="Share any overall insights or guidance for the querent..."
                className="bg-slate-800/50 border-slate-700 text-white min-h-[120px]"
                data-testid="overall-message-input"
              />
            </div>
          </div>

          {/* Right column: Cards */}
          <div className="space-y-4">
            <Label className="text-slate-200">
              Cards in your reading <span className="text-red-400">*</span>
            </Label>

            <div className="space-y-3 lg:max-h-[50vh] lg:overflow-y-auto lg:pr-2">
              {cards.map((card, index) => (
                <div
                  key={index}
                  className="p-3 lg:p-4 rounded-lg bg-slate-800/30 border border-slate-700 space-y-2 lg:space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-purple-400 text-sm font-medium">
                      {card.position || `Card ${index + 1}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`reversed-${index}`} className="text-xs text-slate-400">
                        Reversed
                      </Label>
                      <Switch
                        id={`reversed-${index}`}
                        checked={card.reversed}
                        onCheckedChange={(checked) => updateCard(index, 'reversed', checked)}
                        data-testid={`fulfill-card-reversed-${index}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 lg:gap-3">
                    <div>
                      <TarotCardPicker
                        value={card.name}
                        onChange={(value) => updateCard(index, 'name', value)}
                        placeholder="Type or select card..."
                        data-testid={`fulfill-card-name-${index}`}
                      />
                    </div>
                    <div>
                      <Input
                        value={card.position}
                        onChange={(e) => updateCard(index, 'position', e.target.value)}
                        placeholder="Position"
                        className="bg-slate-800/50 border-slate-700 text-white text-sm"
                        data-testid={`fulfill-card-position-${index}`}
                      />
                    </div>
                  </div>

                  <Textarea
                    value={card.interpretation}
                    onChange={(e) => updateCard(index, 'interpretation', e.target.value)}
                    placeholder="Your interpretation for this card..."
                    className="bg-slate-800/50 border-slate-700 text-white text-sm min-h-[60px] lg:min-h-[80px]"
                    data-testid={`fulfill-card-interpretation-${index}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overall Message - shown on mobile only */}
        <div className="space-y-2 lg:hidden">
          <Label className="text-slate-200">
            Overall message <span className="text-slate-500">(optional)</span>
          </Label>
          <Textarea
            value={overallMessage}
            onChange={(e) => setOverallMessage(e.target.value)}
            placeholder="Share any overall insights or guidance for the querent..."
            className="bg-slate-800/50 border-slate-700 text-white min-h-[100px]"
            data-testid="overall-message-input-mobile"
          />
        </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-600 text-slate-300"
              data-testid="cancel-fulfillment-button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid() || fulfillMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="submit-fulfillment-button"
            >
              {fulfillMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Complete Reading'
              )}
            </Button>
          </div>

          {fulfillMutation.isError && (
            <p className="text-red-400 text-sm text-center">
              Failed to submit reading. Please try again.
            </p>
          )}
      </DialogContent>
    </Dialog>
  );
};

export default FulfillmentDialog;
