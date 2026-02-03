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
    readingOptions?: {
      readingType?: string;
      requiresBirthTime?: boolean;
      astrologyReadingTypes?: string[];
      houseSystem?: string;
    };
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
      url: string;
      uploadedAt: string;
    }>;
    message?: string;
    deliveredAt?: string;
  };
}

export const useMyServiceOrders = (vendorId: string | undefined, status?: string, category?: string) => {
  return useQuery({
    queryKey: ['my-service-orders', vendorId, status, category],
    queryFn: async () => {
      const response = await gql<{
        myServiceOrders: ServiceOrder[];
      }>(`
        query MyServiceOrders($vendorId: ID!, $status: String, $category: String) {
          myServiceOrders(vendorId: $vendorId, status: $status, category: $category) {
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
              readingOptions {
                readingType
                requiresBirthTime
                astrologyReadingTypes
                houseSystem
              }
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
                url
                uploadedAt
              }
              message
              deliveredAt
            }
          }
        }
      `, { vendorId, status, category });

      return response.myServiceOrders;
    },
    enabled: !!vendorId,
  });
};
