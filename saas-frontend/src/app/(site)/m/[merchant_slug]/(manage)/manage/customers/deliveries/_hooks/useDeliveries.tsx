import { gql } from "@/lib/services/gql";
import { shipment_type } from "@/utils/spiriverse";
import { useRealTimeQueryList } from "@/components/utils/RealTime/useRealTimeQueryList";

const key = "deliveries";

const queryFn = async ({
  merchantId,
  statusCode,
  fromDate,
  toDate
}: {
  merchantId: string;
  statusCode?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  const resp = await gql<{ deliveries: shipment_type[] }>(
    `query getDeliveries(
      $merchantId: ID!
      $statusCode: String
      $fromDate: DateTime
      $toDate: DateTime
    ) {
      deliveries(
        merchantId: $merchantId
        statusCode: $statusCode
        fromDate: $fromDate
        toDate: $toDate
      ) {
        id
        code
        orderRef {
          id
          partition
          container
        }
        trackingStatus {
          status_code
        }
        sendTo {
          name
          city
        }
        carrierInfo {
          name
          service {
            name
          }
        }
      }
    }`,
    { merchantId, statusCode, fromDate, toDate }
  );

  return resp.deliveries;
};

const useDeliveries = ({
  merchantId,
  statusCode,
  fromDate,
  toDate,
}: {
  merchantId: string;
  statusCode?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  const queryKey = [key, merchantId, statusCode, fromDate, toDate];

  return useRealTimeQueryList<shipment_type>({
    queryKey,
    queryFn: () => queryFn({ merchantId, statusCode, fromDate, toDate }),
    realtimeEvent: "delivery",
    signalRGroup: `${merchantId}-deliveries`,
    selectId: (d) => [d.id, d.orderRef!.id, d.orderRef!.partition],
    enabled: !!merchantId,
  });
};

export default useDeliveries;
