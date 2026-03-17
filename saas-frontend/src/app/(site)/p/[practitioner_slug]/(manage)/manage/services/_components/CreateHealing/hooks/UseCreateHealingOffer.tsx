import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import { type ExistingServiceData } from '../../CreateReading/hooks/UseCreateReadingOffer';

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
  consultationType: 'ONLINE' | 'IN_PERSON';
  scheduleId?: string;
  scheduleConfig: {
    useAllSlots: boolean;
    selectedSlotIds: string[];
    bufferMinutes: number;
  };
  questionnaire?: ServiceQuestion[];
}

function mapQuestionnaireFromApi(questions?: ExistingServiceData['questionnaire']): ServiceQuestion[] {
  if (!questions) return [];
  return questions.map(q => ({
    id: q.id,
    question: q.question,
    type: q.type,
    required: q.required,
    description: q.description,
    scaleMax: q.scaleMax,
    options: q.options?.map((opt, i) => ({ id: `opt-${i}`, label: opt })),
  }));
}

export const useCreateHealingOffer = (merchantId: string, editingService?: ExistingServiceData) => {
  const queryClient = useQueryClient();
  const isEditing = !!editingService;

  const form = useForm<CreateHealingOfferSchema>({
    defaultValues: editingService ? {
      id: editingService.id,
      merchantId,
      name: editingService.name,
      description: editingService.description || '',
      healingType: 'Reiki',
      modality: editingService.healingOptions?.modalities?.[0] || '',
      deliveryFormat: editingService.deliveryFormats?.[0]?.format || 'RECORDED_VIDEO',
      price: editingService.pricing?.fixedPrice ? String(editingService.pricing.fixedPrice.amount / 100) : '',
      currency: editingService.pricing?.fixedPrice?.currency || 'USD',
      turnaroundDays: editingService.turnaroundDays || 3,
      includeEnergyReport: false,
      includeFollowUp: false,
      targetTimezones: editingService.targetTimezones || [],
      requiresConsultation: editingService.deliveryMode === 'SYNC',
      consultationType: (editingService.consultationType as 'ONLINE' | 'IN_PERSON') || 'ONLINE',
      scheduleId: undefined,
      scheduleConfig: editingService.scheduleConfig ? {
        useAllSlots: editingService.scheduleConfig.useAllSlots,
        selectedSlotIds: editingService.scheduleConfig.selectedSlotIds || [],
        bufferMinutes: editingService.scheduleConfig.bufferMinutes,
      } : {
        useAllSlots: true,
        selectedSlotIds: [],
        bufferMinutes: 15,
      },
      questionnaire: mapQuestionnaireFromApi(editingService.questionnaire),
    } : {
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
      consultationType: 'ONLINE' as const,
      scheduleId: undefined,
      scheduleConfig: {
        useAllSlots: true,
        selectedSlotIds: [],
        bufferMinutes: 15,
      },
      questionnaire: []
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateHealingOfferSchema) => {
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
        turnaroundDays: data.requiresConsultation ? undefined : data.turnaroundDays,
        deliveryFormats: data.requiresConsultation ? undefined : [data.deliveryFormat],
        targetTimezones: data.targetTimezones,
        requiresConsultation: data.requiresConsultation,
        consultationType: data.requiresConsultation ? data.consultationType : undefined,
        scheduleId: data.scheduleId,
        scheduleConfig: data.requiresConsultation ? {
          useAllSlots: data.scheduleConfig.useAllSlots,
          selectedSlotIds: data.scheduleConfig.useAllSlots ? [] : data.scheduleConfig.selectedSlotIds,
          bufferMinutes: data.scheduleConfig.bufferMinutes,
        } : undefined,
        questionnaire: (data.questionnaire || []).map(q => ({
          id: q.id,
          question: q.question,
          type: q.type,
          required: q.required,
          ...(q.options && { options: q.options.map(o => o.label) }),
          ...(q.description && { description: q.description }),
          ...(q.scaleMax != null && { scaleMax: q.scaleMax }),
        })),
        healingOptions: {
          healingType: data.healingType,
          includeEnergyReport: data.includeEnergyReport,
          includeFollowUp: data.includeFollowUp,
          modality: data.modality
        }
      };

      if (isEditing) {
        input.id = data.id;
        const response = await gql<{
          update_healing_offer: { id: string; name: string; category: string };
        }>(`
          mutation UpdateHealingOffer($merchantId: ID!, $input: UpdateHealingOfferInput!) {
            update_healing_offer(merchantId: $merchantId, input: $input) {
              id
              name
              category
            }
          }
        `, { merchantId: data.merchantId, input });
        return response.update_healing_offer;
      } else {
        const response = await gql<{
          create_healing_offer: { id: string; name: string; category: string };
        }>(`
          mutation CreateHealingOffer($merchantId: ID!, $input: CreateHealingOfferInput!) {
            create_healing_offer(merchantId: $merchantId, input: $input) {
              id
              name
              category
            }
          }
        `, { merchantId: data.merchantId, input });
        return response.create_healing_offer;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practitioner-services', merchantId] });
    }
  });

  return { form, mutation, isEditing };
};
