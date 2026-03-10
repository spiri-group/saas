import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import { omit } from '@/lib/functions';
import UseVendorCurrency from '@/app/(site)/m/_hooks/UseVendorCurrency';

type MediaFile = {
  name: string;
  url: string;
  urlRelative: string;
  size: "SQUARE" | "RECTANGLE_HORIZONTAL" | "RECTANGLE_VERTICAL";
  type: "AUDIO" | "VIDEO" | "IMAGE";
  code: string;
  sizeBytes?: number;
  durationSeconds?: number;
};

type ThumbnailData = {
  image?: {
    media?: MediaFile;
    zoom: number;
    objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  };
  dynamicMode?: {
    type: "VIDEO" | "COLLAGE";
    video?: {
      media?: MediaFile;
      autoplay?: boolean;
      muted?: boolean;
    };
    collage?: {
      images: MediaFile[];
      transitionDuration?: number;
      crossFade?: boolean;
    };
  };
  panelTone?: "light" | "dark";
  bgColor?: string;
  stamp?: {
    text?: string;
    enabled: boolean;
    bgColor: string;
    textColor: string;
  };
  title?: {
    content?: string;
  };
  moreInfo?: {
    content?: string;
  };
};

type QuestionOption = {
  id: string;
  label: string;
};

type ServiceQuestion = {
  id: string;
  type: "SHORT_TEXT" | "LONG_TEXT" | "MULTIPLE_CHOICE" | "CHECKBOXES" | "DROPDOWN" | "DATE" | "NUMBER" | "RATING" | "LINEAR_SCALE" | "YES_NO" | "PHONE" | "TIME" | "PHOTO";
  question: string;
  description?: string;
  required: boolean;
  options?: QuestionOption[];
  scaleMax?: number;
};

interface CreateReadingOfferSchema {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  readingType: string;
  deckUsed?: string;
  availableTopics?: string;
  astrologyReadingTypes?: string[];
  houseSystem?: string;
  requiresBirthTime?: boolean;
  focusAreas?: string;
  customReadingDetails?: string;
  deliveryFormat: string;
  price: string;
  currency: string;
  turnaroundDays: number;
  includePullCardSummary: boolean;
  includeVoiceNote: boolean;
  thumbnail?: ThumbnailData;
  questionnaire?: ServiceQuestion[];
  targetTimezones?: string[];
  requiresConsultation: boolean;
  scheduleId?: string;
}

export type ExistingServiceData = {
  id: string;
  name: string;
  category: string;
  deliveryMode: string;
  description: string;
  thumbnail?: any;
  pricing?: {
    type: string;
    fixedPrice?: { amount: number; currency: string };
  };
  turnaroundDays?: number;
  deliveryFormats?: { format: string }[];
  targetTimezones?: string[];
  questionnaire?: {
    id: string;
    question: string;
    type: string;
    required: boolean;
    options?: string[];
    description?: string;
    scaleMax?: number;
  }[];
  readingOptions?: {
    readingType?: string;
    includePullCardSummary?: boolean;
    includeVoiceNote?: boolean;
    deckUsed?: string;
    availableTopics?: string;
    astrologyReadingTypes?: string[];
    houseSystem?: string;
    requiresBirthTime?: boolean;
    focusAreas?: string;
    customReadingDetails?: string;
  };
  healingOptions?: any;
  coachingOptions?: any;
};

function mapQuestionnaireFromApi(questions?: ExistingServiceData['questionnaire']): ServiceQuestion[] {
  if (!questions) return [];
  return questions.map(q => ({
    id: q.id,
    question: q.question,
    type: q.type as ServiceQuestion['type'],
    required: q.required,
    description: q.description,
    scaleMax: q.scaleMax,
    options: q.options?.map((opt, i) => ({ id: `opt-${i}`, label: opt })),
  }));
}

function stripThumbnailUrls(thumbnail?: ThumbnailData): ThumbnailData | undefined {
  if (!thumbnail) return undefined;

  let result = { ...thumbnail };

  if (result.image?.media) {
    result = {
      ...result,
      image: {
        ...result.image,
        media: omit(result.image.media, ['url']) as any
      }
    };
  }

  if (result.dynamicMode?.video?.media) {
    result = {
      ...result,
      dynamicMode: {
        ...result.dynamicMode,
        video: {
          ...result.dynamicMode.video,
          media: omit(result.dynamicMode.video.media, ['url']) as any
        }
      }
    };
  }

  if (result.dynamicMode?.collage?.images) {
    result = {
      ...result,
      dynamicMode: {
        ...result.dynamicMode,
        collage: {
          ...result.dynamicMode.collage,
          images: result.dynamicMode.collage.images.map(img => omit(img, ['url']) as any)
        }
      }
    };
  }

  return result;
}

export const useCreateReadingOffer = (merchantId: string, editingService?: ExistingServiceData) => {
  const queryClient = useQueryClient();
  const vendorCurrency = UseVendorCurrency(merchantId);
  const isEditing = !!editingService;

  const form = useForm<CreateReadingOfferSchema>({
    defaultValues: editingService ? {
      id: editingService.id,
      merchantId,
      name: editingService.name,
      description: editingService.description || '',
      readingType: editingService.readingOptions?.readingType || 'Tarot',
      deckUsed: editingService.readingOptions?.deckUsed || '',
      availableTopics: editingService.readingOptions?.availableTopics || '',
      astrologyReadingTypes: editingService.readingOptions?.astrologyReadingTypes || [],
      houseSystem: editingService.readingOptions?.houseSystem || 'placidus',
      requiresBirthTime: editingService.readingOptions?.requiresBirthTime || false,
      focusAreas: editingService.readingOptions?.focusAreas || '',
      customReadingDetails: editingService.readingOptions?.customReadingDetails || '',
      deliveryFormat: editingService.deliveryFormats?.[0]?.format || 'RECORDED_VIDEO',
      price: editingService.pricing?.fixedPrice ? String(editingService.pricing.fixedPrice.amount / 100) : '',
      currency: editingService.pricing?.fixedPrice?.currency || 'AUD',
      turnaroundDays: editingService.turnaroundDays || 3,
      includePullCardSummary: editingService.readingOptions?.includePullCardSummary || false,
      includeVoiceNote: editingService.readingOptions?.includeVoiceNote || false,
      thumbnail: editingService.thumbnail,
      questionnaire: mapQuestionnaireFromApi(editingService.questionnaire),
      targetTimezones: editingService.targetTimezones || [],
      requiresConsultation: editingService.deliveryMode === 'SYNC',
      scheduleId: undefined,
    } : {
      id: uuidv4(),
      merchantId,
      name: '',
      description: '',
      readingType: 'Tarot',
      deckUsed: '',
      availableTopics: '',
      astrologyReadingTypes: [],
      houseSystem: 'placidus',
      requiresBirthTime: false,
      focusAreas: '',
      customReadingDetails: '',
      deliveryFormat: 'RECORDED_VIDEO',
      price: '',
      currency: 'AUD',
      turnaroundDays: 3,
      includePullCardSummary: false,
      includeVoiceNote: false,
      targetTimezones: [],
      requiresConsultation: false,
      scheduleId: undefined,
      questionnaire: []
    }
  });

  // Update currency when vendor data loads (only for new services)
  useEffect(() => {
    if (!isEditing && vendorCurrency.data?.vendor?.currency) {
      form.setValue('currency', vendorCurrency.data.vendor.currency);
    }
  }, [vendorCurrency.data, form, isEditing]);

  const mutation = useMutation({
    mutationFn: async (data: CreateReadingOfferSchema) => {
      const thumbnail = stripThumbnailUrls(data.thumbnail);

      const input: any = {
        name: data.name,
        description: data.description,
        pricing: {
          type: 'FIXED',
          fixedPrice: {
            amount: parseFloat(data.price) * 100,
            currency: data.currency
          }
        },
        turnaroundDays: data.requiresConsultation ? undefined : parseInt(String(data.turnaroundDays), 10),
        deliveryFormats: data.requiresConsultation ? undefined : [data.deliveryFormat],
        thumbnail,
        targetTimezones: data.targetTimezones,
        requiresConsultation: data.requiresConsultation,
        scheduleId: data.scheduleId,
        questionnaire: (data.questionnaire || []).map(q => ({
          id: q.id,
          question: q.question,
          type: q.type,
          required: q.required,
          ...(q.options && { options: q.options.map(o => o.label) }),
          ...(q.description && { description: q.description }),
          ...(q.scaleMax != null && { scaleMax: q.scaleMax }),
        })),
        readingOptions: {
          readingType: data.readingType,
          includePullCardSummary: data.includePullCardSummary,
          includeVoiceNote: data.includeVoiceNote,
          deckUsed: data.deckUsed,
          availableTopics: data.availableTopics,
          astrologyReadingTypes: data.astrologyReadingTypes,
          houseSystem: data.houseSystem,
          requiresBirthTime: data.requiresBirthTime,
          focusAreas: data.focusAreas,
          customReadingDetails: data.customReadingDetails,
        }
      };

      if (isEditing) {
        input.id = data.id;
        const response = await gql<{
          update_reading_offer: { id: string; name: string; category: string };
        }>(`
          mutation UpdateReadingOffer($merchantId: ID!, $input: UpdateReadingOfferInput!) {
            update_reading_offer(merchantId: $merchantId, input: $input) {
              id
              name
              category
            }
          }
        `, { merchantId: data.merchantId, input });
        return response.update_reading_offer;
      } else {
        const response = await gql<{
          create_reading_offer: { id: string; name: string; category: string };
        }>(`
          mutation CreateReadingOffer($merchantId: ID!, $input: CreateReadingOfferInput!) {
            create_reading_offer(merchantId: $merchantId, input: $input) {
              id
              name
              category
            }
          }
        `, { merchantId: data.merchantId, input });
        return response.create_reading_offer;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practitioner-services', merchantId] });
    }
  });

  return { form, mutation, isEditing };
};
