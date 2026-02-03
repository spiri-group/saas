import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface ServiceOrder {
  id: string;
  customerId: string;
  vendorId: string;
  purchaseDate: string;
  // Using "orderStatus" instead of "status" to avoid conflict with Cosmos soft-delete
  orderStatus: string;
  service: {
    id: string;
    name: string;
    category: string;
    turnaroundDays?: number;
  };
  price: {
    amount: number;
    currency: string;
  };
  questionnaireResponses?: Array<{
    questionId: string;
    question: string;
    answer: string;
  }>;
  deliverables?: {
    files: Array<{
      id: string;
      name: string;
      type: string;
      mimeType: string;
      size: number;
      url: string;
      uploadedAt: string;
    }>;
    message?: string;
    deliveredAt?: string;
  };
}

export const useServiceOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['service-order', orderId],
    queryFn: async () => {
      const response = await gql<{
        serviceOrderById: ServiceOrder;
      }>(`
        query ServiceOrderById($orderId: ID!) {
          serviceOrderById(orderId: $orderId) {
            id
            customerId
            vendorId
            purchaseDate
            orderStatus
            service {
              id
              name
              category
              turnaroundDays
            }
            price {
              amount
              currency
            }
            questionnaireResponses {
              questionId
              question
              answer
            }
            deliverables {
              files {
                id
                name
                type
                mimeType
                size
                url
                uploadedAt
              }
              message
              deliveredAt
            }
          }
        }
      `, { orderId });

      return response.serviceOrderById;
    },
    enabled: !!orderId,
  });
};
