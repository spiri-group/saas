import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type PurchasedReading = {
  id: string;
  customerId: string;
  vendorId: string;
  purchaseDate: string;
  orderStatus: 'PAID' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
  service: {
    id: string;
    name: string;
    category: string;
    description?: string;
    turnaroundDays?: number;
    thumbnail?: {
      image: {
        media: {
          url: string;
        };
      };
    };
    vendor: {
      id: string;
      name: string;
      slug: string;
    };
    // Reading-specific options
    readingOptions?: {
      readingType?: string; // 'Tarot', 'Oracle', 'Psychic', 'Mediumship', 'Other'
      deckUsed?: string;
    };
  };
  questionnaireResponses?: Array<{
    questionId: string;
    question: string;
    answer: string;
  }>;
  deliverables?: {
    files?: Array<{
      id: string;
      name: string;
      type: string;
      url: string;
    }>;
    message?: string;
    deliveredAt?: string;
  };
  price?: {
    amount: number;
    currency: string;
  };
};

/**
 * Hook to fetch customer's purchased reading services
 * These are ASYNC reading services purchased from merchants (not SpiriReading requests)
 */
export const useMyPurchasedReadings = (userId: string) => {
  return useQuery({
    queryKey: ['my-purchased-readings', userId],
    queryFn: async () => {
      const response = await gql<{
        customerServiceOrders: PurchasedReading[];
      }>(`
        query GetMyPurchasedReadings($customerId: ID!) {
          customerServiceOrders(customerId: $customerId) {
            id
            customerId
            vendorId
            purchaseDate
            orderStatus
            service {
              id
              name
              category
              description
              turnaroundDays
              thumbnail {
                image {
                  media {
                    url
                  }
                }
              }
              vendor {
                id
                name
                slug
              }
              readingOptions {
                readingType
                deckUsed
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
              }
              message
              deliveredAt
            }
            price {
              amount
              currency
            }
          }
        }
      `, { customerId: userId });

      // Filter to only return READING category services
      return (response.customerServiceOrders || []).filter(
        order => order.service.category === 'READING'
      );
    },
    enabled: !!userId,
  });
};
