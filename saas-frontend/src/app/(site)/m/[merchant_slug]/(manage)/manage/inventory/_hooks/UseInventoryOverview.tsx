import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { stock_report_type } from "@/utils/spiriverse";

// Keep the original hook for summary stats only
export const UseInventoryOverview = (merchantId: string, locationId: string = "default") => {
  return useQuery({
    queryKey: ["inventory-overview", merchantId, locationId],
    queryFn: async () => {
      const response = await gql<{
        stockReport: stock_report_type;
      }>(`
        query StockReport($vendorId: String!, $locationId: String!) {
          stockReport(vendorId: $vendorId, locationId: $locationId) {
            total_products
            total_variants
            low_stock_items
            out_of_stock_items
            ooak_items
            total_value {
              amount
              currency
            }
            location_id
            generated_at
          }
        }
      `, {
        vendorId: merchantId,
        locationId: locationId
      });
      return response.stockReport;
    },
    enabled: !!merchantId,
  });
};

// New infinite scroll hook for inventory items
const queryFn = async (
  pageParam: { offset: number; limit: number },
  merchantId: string,
  locationId: string = "default",
  search?: string
) => {
  const response = await gql<{
    stockReportItems: {
      items: stock_report_type['items'];
      hasMore: boolean;
      totalCount: number;
    };
  }>(`
    query StockReportItems($vendorId: String!, $locationId: String!, $search: String, $offset: Int, $limit: Int) {
      stockReportItems(vendorId: $vendorId, locationId: $locationId, search: $search, offset: $offset, limit: $limit) {
        items {
          product_id
          product_name
          variant_id
          variant_name
          qty_on_hand
          qty_available
          qty_committed
          is_ooak
          low_stock_threshold
          value {
            amount
            currency
          }
          status
        }
        hasMore
        totalCount
      }
    }
  `, {
    vendorId: merchantId,
    locationId: locationId,
    search: search || null,
    offset: pageParam.offset,
    limit: pageParam.limit
  });
  return response.stockReportItems;
};

export const UseInventoryItems = (merchantId: string, locationId: string = "default", search?: string) => {
  const queryKey = ["inventory-items", merchantId, locationId, search];
  return {
    key: queryKey,
    query: useInfiniteQuery({
      queryKey: queryKey,
      queryFn: ({ pageParam }) => queryFn(pageParam, merchantId, locationId, search),
      initialPageParam: { offset: 0, limit: 50 },
      enabled: !!merchantId,
      getNextPageParam: (lastPage, allPages, lastPageParam) => {
        if (lastPage.hasMore) {
          return {
            offset: lastPageParam.offset + lastPageParam.limit,
            limit: 50
          };
        }
        return undefined;
      }
    })
  };
};