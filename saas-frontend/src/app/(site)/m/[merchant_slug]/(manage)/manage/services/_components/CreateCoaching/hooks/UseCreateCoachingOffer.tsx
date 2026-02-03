import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';

interface CreateCoachingOfferSchema {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  coachingType: string;
  focusArea?: string;
  deliveryFormat: string;
  price: string;
  currency: string;
  turnaroundDays: number;
  includeJournal: boolean;
  includeWorkbook: boolean;
  targetTimezones?: string[];
  requiresConsultation: boolean;
  scheduleId?: string;
}

export const useCreateCoachingOffer = (merchantId: string) => {
  const queryClient = useQueryClient();

  const form = useForm<CreateCoachingOfferSchema>({
    defaultValues: {
      id: uuidv4(),
      merchantId,
      name: '',
      description: '',
      coachingType: 'Life Path',
      focusArea: '',
      deliveryFormat: 'RECORDED_VIDEO',
      price: '',
      currency: 'USD',
      turnaroundDays: 3,
      includeJournal: false,
      includeWorkbook: false,
      targetTimezones: [],
      requiresConsultation: false,
      scheduleId: undefined
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateCoachingOfferSchema) => {
      const response = await gql<{
        create_coaching_offer: {
          id: string;
          name: string;
          category: string;
        };
      }>(`
        mutation CreateCoachingOffer($merchantId: ID!, $input: CreateCoachingOfferInput!) {
          create_coaching_offer(merchantId: $merchantId, input: $input) {
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
          turnaroundDays: data.requiresConsultation ? undefined : data.turnaroundDays,
          deliveryFormats: data.requiresConsultation ? undefined : [data.deliveryFormat],
          targetTimezones: data.targetTimezones,
          requiresConsultation: data.requiresConsultation,
          scheduleId: data.scheduleId,
          coachingOptions: {
            coachingType: data.coachingType,
            includeJournal: data.includeJournal,
            includeWorkbook: data.includeWorkbook,
            focusArea: data.focusArea
          }
        }
      });

      return response.create_coaching_offer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-services'] });
    }
  });

  return { form, mutation };
};
