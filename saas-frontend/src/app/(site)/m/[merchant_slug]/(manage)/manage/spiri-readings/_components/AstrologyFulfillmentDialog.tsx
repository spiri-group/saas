'use client';

import { useState } from 'react';
import { ClaimedReadingRequest } from '../_hooks';
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
import { Loader2, Star, Camera, ImageIcon, Plus, Trash2 } from 'lucide-react';
import FileUploader from '@/components/ux/FileUploader';
import { media_type } from '@/utils/spiriverse';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface HighlightedAspectForm {
  planet1: string;
  planet2: string;
  aspect: string;
  interpretation: string;
}

interface AstrologyFulfillmentDialogProps {
  request: ClaimedReadingRequest;
  readerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ASPECT_OPTIONS = [
  'conjunction', 'sextile', 'square', 'trine', 'opposition',
];

const useFulfillAstrologyReadingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      requestId: string;
      readerId: string;
      interpretation: string;
      highlightedAspects?: HighlightedAspectForm[];
      chartImageUrl?: string;
      practitionerRecommendation?: string;
    }) => {
      const response = await gql<{
        fulfillAstrologyReadingRequest: {
          success: boolean;
          message?: string;
          readingRequest?: { id: string; requestStatus: string; fulfilledAt: string };
        };
      }>(`
        mutation FulfillAstrologyReadingRequest($input: FulfillAstrologyReadingRequestInput!) {
          fulfillAstrologyReadingRequest(input: $input) {
            success
            message
            readingRequest {
              id
              requestStatus
              fulfilledAt
            }
          }
        }
      `, { input });
      return response.fulfillAstrologyReadingRequest;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['claimed-reading-requests', variables.readerId] });
    },
  });
};

const AstrologyFulfillmentDialog: React.FC<AstrologyFulfillmentDialogProps> = ({
  request,
  readerId,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [interpretation, setInterpretation] = useState('');
  const [chartImageUrl, setChartImageUrl] = useState('');
  const [practitionerRecommendation, setPractitionerRecommendation] = useState('');
  const [aspects, setAspects] = useState<HighlightedAspectForm[]>([]);

  const fulfillMutation = useFulfillAstrologyReadingRequest();

  const addAspect = () => {
    setAspects([...aspects, { planet1: '', planet2: '', aspect: '', interpretation: '' }]);
  };

  const removeAspect = (index: number) => {
    setAspects(aspects.filter((_, i) => i !== index));
  };

  const updateAspect = (index: number, field: keyof HighlightedAspectForm, value: string) => {
    const updated = [...aspects];
    updated[index] = { ...updated[index], [field]: value };
    setAspects(updated);
  };

  const isValid = () => {
    if (!interpretation.trim()) return false;
    // All added aspects must be complete
    return aspects.every(a => a.planet1.trim() && a.planet2.trim() && a.aspect && a.interpretation.trim());
  };

  const handleSubmit = async () => {
    if (!isValid()) return;

    try {
      const result = await fulfillMutation.mutateAsync({
        requestId: request.id,
        readerId,
        interpretation: interpretation.trim(),
        highlightedAspects: aspects.length > 0 ? aspects.map(a => ({
          planet1: a.planet1.trim(),
          planet2: a.planet2.trim(),
          aspect: a.aspect,
          interpretation: a.interpretation.trim(),
        })) : undefined,
        chartImageUrl: chartImageUrl.trim() || undefined,
        practitionerRecommendation: practitionerRecommendation.trim() || undefined,
      });

      if (result.success) {
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Failed to fulfill astrology reading:', error);
    }
  };

  // Extract birth data from the request for display (from astrologyData on the request)
  const astrologyData = (request as any).astrologyData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full md:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700" data-testid="astrology-fulfillment-dialog">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-400" />
            Fulfill Astrology Reading
          </DialogTitle>
        </DialogHeader>

        {/* Request Summary */}
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 mb-4 space-y-2">
          <div>
            <p className="text-sm text-slate-400 mb-1">Topic:</p>
            <p className="text-white text-sm">{request.topic}</p>
          </div>
          {request.context && (
            <div>
              <p className="text-sm text-slate-400 mb-1">Context:</p>
              <p className="text-slate-300 text-sm">{request.context}</p>
            </div>
          )}
          {astrologyData && (
            <>
              <div>
                <p className="text-sm text-slate-400 mb-1">Focus Area:</p>
                <p className="text-purple-300 text-sm capitalize">{astrologyData.focusArea?.replaceAll('_', ' ')}</p>
              </div>
              {astrologyData.birthData && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Birth Data:</p>
                  <p className="text-slate-300 text-sm">
                    {astrologyData.birthData.birthDate}
                    {astrologyData.birthData.birthTime && ` at ${astrologyData.birthData.birthTime}`}
                    {astrologyData.birthData.birthLocation?.city && ` in ${astrologyData.birthData.birthLocation.city}`}
                    {astrologyData.birthData.birthLocation?.country && `, ${astrologyData.birthData.birthLocation.country}`}
                  </p>
                </div>
              )}
              {astrologyData.partnerBirthData && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Partner Birth Data:</p>
                  <p className="text-slate-300 text-sm">
                    {astrologyData.partnerBirthData.birthDate}
                    {astrologyData.partnerBirthData.birthTime && ` at ${astrologyData.partnerBirthData.birthTime}`}
                    {astrologyData.partnerBirthData.birthLocation?.city && ` in ${astrologyData.partnerBirthData.birthLocation.city}`}
                    {astrologyData.partnerBirthData.birthLocation?.country && `, ${astrologyData.partnerBirthData.birthLocation.country}`}
                  </p>
                </div>
              )}
              {astrologyData.specificPlanet && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Planet Focus:</p>
                  <p className="text-slate-300 text-sm capitalize">{astrologyData.specificPlanet}</p>
                </div>
              )}
              {astrologyData.specificLifeArea && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Life Area:</p>
                  <p className="text-slate-300 text-sm capitalize">{astrologyData.specificLifeArea}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Chart Image & Recommendation */}
          <div className="space-y-4">
            {/* Chart Image Upload */}
            <div className="space-y-2">
              <Label className="text-slate-200 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Chart image <span className="text-slate-500">(optional)</span>
              </Label>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                <FileUploader
                  id={`chart-photo-${request.id}`}
                  className="h-48 lg:h-56 w-full"
                  imageClassName="rounded-lg"
                  connection={{
                    container: 'public',
                    relative_path: `readings/${readerId}/${request.id}`
                  }}
                  acceptOnly={{ type: 'IMAGE' }}
                  allowMultiple={false}
                  value={chartImageUrl ? [chartImageUrl] : null}
                  onDropAsync={() => {}}
                  onUploadCompleteAsync={(files: media_type[]) => {
                    if (files.length > 0) {
                      setChartImageUrl(files[0].url);
                    }
                  }}
                  onRemoveAsync={() => {
                    setChartImageUrl('');
                  }}
                  includePreview={true}
                />
              </div>
              {chartImageUrl ? (
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  Chart uploaded
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Upload a screenshot of the chart you used
                </p>
              )}
            </div>

            {/* Practitioner Recommendation */}
            <div className="space-y-2">
              <Label className="text-slate-200">
                Recommended next steps <span className="text-slate-500">(optional)</span>
              </Label>
              <Textarea
                value={practitionerRecommendation}
                onChange={(e) => setPractitionerRecommendation(e.target.value)}
                placeholder="e.g., &quot;Based on your chart, I'd recommend a full synastry reading to understand your relationship dynamics better...&quot;"
                className="bg-slate-800/50 border-slate-700 text-white min-h-[100px]"
                data-testid="recommendation-input"
              />
              <p className="text-xs text-slate-500">
                This helps guide the client toward your services for deeper work
              </p>
            </div>
          </div>

          {/* Right column: Interpretation & Aspects */}
          <div className="space-y-4">
            {/* Main Interpretation */}
            <div className="space-y-2">
              <Label className="text-slate-200">
                Your interpretation <span className="text-red-400">*</span>
              </Label>
              <Textarea
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                placeholder="Write your astrological interpretation for the querent..."
                className="bg-slate-800/50 border-slate-700 text-white min-h-[200px]"
                data-testid="interpretation-input"
              />
            </div>

            {/* Highlighted Aspects */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-200">
                  Key aspects <span className="text-slate-500">(optional)</span>
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addAspect}
                  className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  data-testid="add-aspect-btn"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Aspect
                </Button>
              </div>

              {aspects.length > 0 && (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {aspects.map((aspect, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-slate-800/30 border border-slate-700 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-purple-400 text-sm font-medium">Aspect {index + 1}</span>
                        <button
                          onClick={() => removeAspect(index)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={aspect.planet1}
                          onChange={(e) => updateAspect(index, 'planet1', e.target.value)}
                          placeholder="Planet 1"
                          className="bg-slate-800/50 border-slate-700 text-white text-sm"
                          data-testid={`aspect-planet1-${index}`}
                        />
                        <select
                          value={aspect.aspect}
                          onChange={(e) => updateAspect(index, 'aspect', e.target.value)}
                          className="bg-slate-800/50 border border-slate-700 rounded-md text-white text-sm px-2"
                          data-testid={`aspect-type-${index}`}
                        >
                          <option value="">Aspect</option>
                          {ASPECT_OPTIONS.map(a => (
                            <option key={a} value={a} className="capitalize">{a}</option>
                          ))}
                        </select>
                        <Input
                          value={aspect.planet2}
                          onChange={(e) => updateAspect(index, 'planet2', e.target.value)}
                          placeholder="Planet 2"
                          className="bg-slate-800/50 border-slate-700 text-white text-sm"
                          data-testid={`aspect-planet2-${index}`}
                        />
                      </div>
                      <Textarea
                        value={aspect.interpretation}
                        onChange={(e) => updateAspect(index, 'interpretation', e.target.value)}
                        placeholder="What does this aspect mean for them..."
                        className="bg-slate-800/50 border-slate-700 text-white text-sm min-h-[60px]"
                        data-testid={`aspect-interpretation-${index}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300"
            data-testid="cancel-astrology-fulfillment"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid() || fulfillMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="submit-astrology-fulfillment"
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

export default AstrologyFulfillmentDialog;
