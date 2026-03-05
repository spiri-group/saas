import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';

type ServiceQuestion = {
  id: string;
  type: string;
  question: string;
  description?: string;
  required: boolean;
  options?: Array<{ id: string; label: string }>;
  scaleMax?: number;
};

interface CreateHealingOfferSchema {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  healingType: string;
  modality?: string;
  deliveryFormat: string;
  price: string;
  currency: string;
  turnaroundDays: number;
  includeEnergyReport: boolean;
  includeFollowUp: boolean;
  targetTimezones?: string[];
  requiresConsultation: boolean;
  scheduleId?: string;
  questionnaire?: ServiceQuestion[];
}

export const useCreateHealingOffer = (merchantId: string) => {
  const queryClient = useQueryClient();

  const form = useForm<CreateHealingOfferSchema>({
    defaultValues: {
      id: uuidv4(),
      merchantId,
      name: '',
      description: '',
      healingType: 'Reiki',
      modality: '',
      deliveryFormat: 'RECORDED_VIDEO',
      price: '',
      currency: 'USD',
      turnaroundDays: 3,
      includeEnergyReport: false,
      includeFollowUp: false,
      targetTimezones: [],
      requiresConsultation: false,
      scheduleId: undefined,
      questionnaire: []
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateHealingOfferSchema) => {
      const response = await gql<{
        create_healing_offer: {
          id: string;
          name: string;
          category: string;
        };
      }>(`
        mutation CreateHealingOffer($merchantId: ID!, $input: CreateHealingOfferInput!) {
          create_healing_offer(merchantId: $merchantId, input: $input) {
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
          questionnaire: (data.questionnaire || []).map(q => ({
            id: q.id,
            question: q.question,
            type: q.type,
            required: q.required,
            ...(q.options && { options: q.options.map(o => o.label) }),
          })),
          healingOptions: {
            healingType: data.healingType,
            includeEnergyReport: data.includeEnergyReport,
            includeFollowUp: data.includeFollowUp,
            modality: data.modality
          }
        }
      });

      return response.create_healing_offer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-services'] });
    }
  });

  return { form, mutation };
};
