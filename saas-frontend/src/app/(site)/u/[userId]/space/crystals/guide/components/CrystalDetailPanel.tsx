'use client';

import { useState } from 'react';
import {
  X,
  Gem,
  Heart,
  Sparkles,
  Droplets,
  Zap,
  MapPin,
  AlertTriangle,
  Plus,
  ThumbsUp,
  Flag,
  ExternalLink,
  Star,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Link from 'next/link';
import {
  CrystalReference,
  PractitionerInsight,
  InsightType,
  CHAKRAS,
  ELEMENTS,
  ZODIAC_SIGNS,
  CLEANSING_METHODS,
  CHARGING_METHODS,
  INSIGHT_TYPES,
} from '../../types';
import {
  useCrystalReference,
  useInsightsForCrystal,
  useCreateInsight,
  useAgreeWithInsight,
  useReportInsight,
  useCreateWishlistItem,
} from '../../hooks';

interface Props {
  crystal: CrystalReference;
  userId: string;
  onClose: () => void;
}

const CrystalDetailPanel: React.FC<Props> = ({ crystal, userId, onClose }) => {
  const [showInsightForm, setShowInsightForm] = useState(false);
  const [insightType, setInsightType] = useState<InsightType>('usage_tip');
  const [insightContent, setInsightContent] = useState('');
  const [addingToWishlist, setAddingToWishlist] = useState(false);

  // Hooks - fetch full crystal details
  const { data: fullCrystal } = useCrystalReference(crystal.id);
  const { data: insightsData } = useInsightsForCrystal(crystal.id);
  const createInsightMutation = useCreateInsight();
  const agreeWithInsightMutation = useAgreeWithInsight();
  const reportInsightMutation = useReportInsight();
  const createWishlistMutation = useCreateWishlistItem();

  const insights = insightsData?.insights || [];

  // Use full crystal data if loaded, otherwise fall back to partial data from list
  const crystalData = fullCrystal || crystal;

  // Safely access arrays that might be undefined
  const alternateNames = crystalData.alternateNames || [];
  const chakras = crystalData.chakras || [];
  const elements = crystalData.elements || [];
  const zodiacSigns = crystalData.zodiacSigns || [];
  const primaryProperties = crystalData.primaryProperties || [];
  const emotionalUses = crystalData.emotionalUses || [];
  const spiritualUses = crystalData.spiritualUses || [];
  const physicalAssociations = crystalData.physicalAssociations || [];
  const cleansingMethods = crystalData.cleansingMethods || [];
  const chargingMethods = crystalData.chargingMethods || [];
  const avoidMethods = crystalData.avoidMethods || [];
  const localities = crystalData.localities || [];

  const handleSubmitInsight = async () => {
    if (!insightContent.trim()) return;

    await createInsightMutation.mutateAsync({
      crystalId: crystal.id,
      insightType,
      content: insightContent.trim(),
      userId,
    });

    setInsightContent('');
    setShowInsightForm(false);
  };

  const handleAgree = async (insight: PractitionerInsight) => {
    await agreeWithInsightMutation.mutateAsync({
      insightId: insight.id,
      insightOwnerId: insight.practitionerId,
      crystalId: crystal.id,
    });
  };

  const handleReport = async (insight: PractitionerInsight) => {
    if (confirm('Are you sure you want to report this insight?')) {
      await reportInsightMutation.mutateAsync({
        insightId: insight.id,
        insightOwnerId: insight.practitionerId,
        crystalId: crystal.id,
        reason: 'Inappropriate content',
      });
    }
  };

  const handleAddToWishlist = async () => {
    setAddingToWishlist(true);
    try {
      await createWishlistMutation.mutateAsync({
        name: crystalData.name,
        crystalRefId: crystalData.id,
        alertEnabled: true,
        priority: 3,
        userId,
      });
      alert(`${crystalData.name} added to your wishlist!`);
    } catch {
      alert('Failed to add to wishlist');
    } finally {
      setAddingToWishlist(false);
    }
  };

  const getChakraInfo = (chakra: string) => CHAKRAS.find((c) => c.key === chakra);
  const getElementInfo = (element: string) => ELEMENTS.find((e) => e.key === element);
  const getZodiacInfo = (sign: string) => ZODIAC_SIGNS.find((z) => z.key === sign);
  const getCleansingLabel = (method: string) =>
    CLEANSING_METHODS.find((m) => m.key === method)?.label || method;
  const getChargingLabel = (method: string) =>
    CHARGING_METHODS.find((m) => m.key === method)?.label || method;
  const getInsightTypeInfo = (type: InsightType) => INSIGHT_TYPES.find((t) => t.key === type);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-white/20 text-white max-w-[95vw] w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto p-0" data-testid="crystal-detail-panel">
        {/* Header with Image */}
        <div className="relative">
          <div className="h-40 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center">
            {crystalData.thumbnail ? (
              <img
                src={crystalData.thumbnail}
                alt={crystalData.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Gem className="w-16 h-16 text-indigo-400/50" />
            )}
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            data-testid="close-detail-panel"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title and CTAs */}
          <DialogHeader className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl font-light text-white">
                  {crystalData.name}
                </DialogTitle>
                {alternateNames.length > 0 && (
                  <DialogDescription className="text-slate-400 mt-1">
                    Also known as: {alternateNames.join(', ')}
                  </DialogDescription>
                )}
              </div>
            </div>

            {/* Funnel CTAs */}
            <div className="flex gap-3" data-testid="funnel-ctas">
              <Button
                onClick={handleAddToWishlist}
                disabled={addingToWishlist}
                className="flex-1 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700"
                data-testid="add-to-wishlist-btn"
              >
                <Star className="w-4 h-4 mr-2" />
                {addingToWishlist ? 'Adding...' : 'Add to Wishlist'}
              </Button>
              <Link href={`/search?search=${encodeURIComponent(crystalData.name)}`} className="flex-1">
                <Button
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  data-testid="find-sellers-btn"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Find Sellers
                </Button>
              </Link>
            </div>
          </DialogHeader>

          {/* Description */}
          <div>
            <p className="text-slate-300 leading-relaxed">{crystalData.description}</p>
          </div>

          {/* Metaphysical Properties */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Metaphysical Properties
            </h3>

            {/* Chakras */}
            {chakras.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-2">Chakras</h4>
                <div className="flex flex-wrap gap-2">
                  {chakras.map((chakra) => {
                    const info = getChakraInfo(chakra);
                    return (
                      <Badge
                        key={chakra}
                        className="px-3 py-1"
                        style={{
                          backgroundColor: `${info?.color}20`,
                          borderColor: `${info?.color}40`,
                          color: info?.color,
                        }}
                        data-testid={`chakra-${chakra}`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full mr-2"
                          style={{ backgroundColor: info?.color }}
                        />
                        {info?.label || chakra}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Elements */}
            {elements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-2">Elements</h4>
                <div className="flex flex-wrap gap-2">
                  {elements.map((element) => {
                    const info = getElementInfo(element);
                    return (
                      <Badge
                        key={element}
                        className="px-3 py-1"
                        style={{
                          backgroundColor: `${info?.color}20`,
                          borderColor: `${info?.color}40`,
                          color: info?.color,
                        }}
                        data-testid={`element-${element}`}
                      >
                        {info?.label || element}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Zodiac Signs */}
            {zodiacSigns.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-2">Zodiac Signs</h4>
                <div className="flex flex-wrap gap-2">
                  {zodiacSigns.map((sign) => {
                    const info = getZodiacInfo(sign);
                    return (
                      <Badge
                        key={sign}
                        variant="outline"
                        className="border-white/20 text-slate-300"
                        data-testid={`zodiac-${sign}`}
                      >
                        {info?.symbol} {info?.label || sign}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Planetary Association & Numerology */}
            <div className="flex gap-4">
              {crystalData.planetaryAssociation && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-1">Planet</h4>
                  <span className="text-white">{crystalData.planetaryAssociation}</span>
                </div>
              )}
              {crystalData.numerology && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-1">Number</h4>
                  <span className="text-white">{crystalData.numerology}</span>
                </div>
              )}
            </div>
          </div>

          {/* Primary Properties */}
          {primaryProperties.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                Primary Properties
              </h3>
              <div className="flex flex-wrap gap-2">
                {primaryProperties.map((prop) => (
                  <Badge
                    key={prop}
                    className="bg-yellow-500/20 border-yellow-500/30 text-yellow-300"
                  >
                    {prop}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Uses */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {emotionalUses.length > 0 && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h4 className="text-sm font-medium text-pink-400 mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Emotional
                </h4>
                <ul className="text-sm text-slate-300 space-y-1">
                  {emotionalUses.map((use) => (
                    <li key={use}>• {use}</li>
                  ))}
                </ul>
              </div>
            )}

            {spiritualUses.length > 0 && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Spiritual
                </h4>
                <ul className="text-sm text-slate-300 space-y-1">
                  {spiritualUses.map((use) => (
                    <li key={use}>• {use}</li>
                  ))}
                </ul>
              </div>
            )}

            {physicalAssociations.length > 0 && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                  <Gem className="w-4 h-4" />
                  Physical*
                </h4>
                <ul className="text-sm text-slate-300 space-y-1">
                  {physicalAssociations.map((use) => (
                    <li key={use}>• {use}</li>
                  ))}
                </ul>
                <p className="text-xs text-slate-500 mt-2 italic">
                  *Not medical advice
                </p>
              </div>
            )}
          </div>

          {/* Care Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-400" />
              Care Instructions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cleansing */}
              {cleansingMethods.length > 0 && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="text-sm font-medium text-blue-300 mb-2">Cleansing Methods</h4>
                  <div className="flex flex-wrap gap-1">
                    {cleansingMethods.map((method) => (
                      <Badge
                        key={method}
                        variant="outline"
                        className="border-blue-500/30 text-blue-300"
                      >
                        {getCleansingLabel(method)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Charging */}
              {chargingMethods.length > 0 && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <h4 className="text-sm font-medium text-amber-300 mb-2">Charging Methods</h4>
                  <div className="flex flex-wrap gap-1">
                    {chargingMethods.map((method) => (
                      <Badge
                        key={method}
                        variant="outline"
                        className="border-amber-500/30 text-amber-300"
                      >
                        {getChargingLabel(method)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Warnings */}
            {avoidMethods.length > 0 && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <h4 className="text-sm font-medium text-red-300 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Avoid
                </h4>
                <div className="flex flex-wrap gap-1">
                  {avoidMethods.map((method) => (
                    <Badge
                      key={method}
                      variant="outline"
                      className="border-red-500/30 text-red-300"
                    >
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Care Notes */}
            {crystalData.careNotes && (
              <p className="text-sm text-slate-400 italic">{crystalData.careNotes}</p>
            )}
          </div>

          {/* Origins */}
          {localities.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-emerald-400" />
                Found In
              </h3>
              <div className="flex flex-wrap gap-2">
                {localities.map((locality) => (
                  <Badge
                    key={locality}
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-300"
                  >
                    {locality}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Practitioner Insights */}
          <div className="border-t border-white/10 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Community Insights
              </h3>
              <Button
                variant="ghost"
                onClick={() => setShowInsightForm(!showInsightForm)}
                className="text-indigo-400 hover:text-indigo-300"
                data-testid="add-insight-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Share Insight
              </Button>
            </div>

            {/* Add Insight Form */}
            {showInsightForm && (
              <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 space-y-4">
                <Select
                  value={insightType}
                  onValueChange={(v) => setInsightType(v as InsightType)}
                >
                  <SelectTrigger
                    className="bg-white/5 border-white/20 text-white"
                    data-testid="insight-type-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSIGHT_TYPES.map((type) => (
                      <SelectItem key={type.key} value={type.key}>
                        {type.label} - {type.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Share your experience or tip about this crystal..."
                  value={insightContent}
                  onChange={(e) => setInsightContent(e.target.value)}
                  className="bg-white/5 border-white/20 text-white min-h-[100px]"
                  data-testid="insight-content"
                />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowInsightForm(false)}
                    className="text-slate-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitInsight}
                    disabled={!insightContent.trim() || createInsightMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    data-testid="submit-insight-btn"
                  >
                    {createInsightMutation.isPending ? 'Submitting...' : 'Submit'}
                  </Button>
                </div>
              </div>
            )}

            {/* Insights List */}
            {insights.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No community insights yet. Be the first to share!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => {
                  const typeInfo = getInsightTypeInfo(insight.insightType);
                  return (
                    <div
                      key={insight.id}
                      className="p-4 rounded-lg bg-white/5 border border-white/10"
                      data-testid={`insight-${insight.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge
                          variant="outline"
                          className="border-indigo-500/30 text-indigo-300"
                        >
                          {typeInfo?.label || insight.insightType}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {new Date(insight.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-300 mb-3">{insight.content}</p>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleAgree(insight)}
                          disabled={agreeWithInsightMutation.isPending}
                          className="flex items-center gap-1 text-sm text-slate-400 hover:text-indigo-400 transition-colors"
                          data-testid={`agree-insight-${insight.id}`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{insight.agreeCount} agrees</span>
                        </button>
                        <button
                          onClick={() => handleReport(insight)}
                          disabled={reportInsightMutation.isPending}
                          className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Flag className="w-4 h-4" />
                          <span>Report</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom CTA */}
          <div className="border-t border-white/10 pt-6">
            <Link
              href={`/search?search=${encodeURIComponent(crystalData.name)}`}
              className="block"
            >
              <Button
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-6 text-lg"
                data-testid="find-sellers-bottom-btn"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Browse {crystalData.name} from Practitioners
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CrystalDetailPanel;
