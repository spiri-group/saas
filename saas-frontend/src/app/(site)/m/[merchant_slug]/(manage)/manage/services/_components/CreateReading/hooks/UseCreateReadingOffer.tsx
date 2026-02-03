import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import { omit } from '@/lib/functions';

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

type PreReadingQuestion = {
  id: string;
  type: "SHORT_TEXT" | "LONG_TEXT" | "MULTIPLE_CHOICE" | "CHECKBOXES" | "DROPDOWN" | "DATE" | "NUMBER" | "EMAIL";
  question: string;
  description?: string;
  required: boolean;
  options?: QuestionOption[];
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
  preReadingQuestions?: PreReadingQuestion[];
  targetTimezones?: string[];
  requiresConsultation: boolean;
  scheduleId?: string; // Optional: Associate with specific availability schedule
}

export const useCreateReadingOffer = (merchantId: string) => {
  const queryClient = useQueryClient();

  const form = useForm<CreateReadingOfferSchema>({
    defaultValues: {
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
      currency: 'USD',
      turnaroundDays: 3,
      includePullCardSummary: false,
      includeVoiceNote: false,
      targetTimezones: [],
      requiresConsultation: false,
      scheduleId: undefined
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateReadingOfferSchema) => {
      // Remove url fields from thumbnail media (backend only expects urlRelative)
      let thumbnail = data.thumbnail ? { ...data.thumbnail } : undefined;

      if (thumbnail) {
        // Remove url from image.media if it exists
        if (thumbnail.image?.media) {
          thumbnail = {
            ...thumbnail,
            image: {
              ...thumbnail.image,
              media: omit(thumbnail.image.media, ['url']) as any
            }
          };
        }

        // Remove url from dynamicMode.video.media if it exists
        if (thumbnail.dynamicMode?.video?.media) {
          thumbnail = {
            ...thumbnail,
            dynamicMode: {
              ...thumbnail.dynamicMode,
              video: {
                ...thumbnail.dynamicMode.video,
                media: omit(thumbnail.dynamicMode.video.media, ['url']) as any
              }
            }
          };
        }

        // Remove url from dynamicMode.collage.images if they exist
        if (thumbnail.dynamicMode?.collage?.images) {
          thumbnail = {
            ...thumbnail,
            dynamicMode: {
              ...thumbnail.dynamicMode,
              collage: {
                ...thumbnail.dynamicMode.collage,
                images: thumbnail.dynamicMode.collage.images.map(img => omit(img, ['url']) as any)
              }
            }
          };
        }
      }

      const response = await gql<{
        create_reading_offer: {
          id: string;
          name: string;
          category: string;
        };
      }>(`
        mutation CreateReadingOffer($merchantId: ID!, $input: CreateReadingOfferInput!) {
          create_reading_offer(merchantId: $merchantId, input: $input) {
            id
            name
            category
            deliveryMode
            pricing {
              type
              fixedPrice {
                amount
                currency
              }
            }
          }
        }
      `, {
        merchantId: data.merchantId,
        input: {
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
          thumbnail: thumbnail, // Use the transformed thumbnail with dynamicMode
          targetTimezones: data.targetTimezones,
          requiresConsultation: data.requiresConsultation,
          scheduleId: data.scheduleId,
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
            preReadingQuestions: data.preReadingQuestions
          }
        }
      });

      return response.create_reading_offer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-services'] });
    }
  });

  return { form, mutation };
};
