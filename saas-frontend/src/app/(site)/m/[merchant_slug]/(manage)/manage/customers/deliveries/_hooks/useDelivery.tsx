import { gql } from "@/lib/services/gql";
import { recordref_type, shipment_type } from "@/utils/spiriverse";
import { useRealTimeQuery } from "@/components/utils/RealTime/useRealTimeQuery";

const queryFn = async (orderRef: recordref_type, shipmentId: string) => {
  const resp = await gql<{ delivery: shipment_type }>(
    `query getDelivery($orderRef: RecordRefInput!, $shipmentId: ID!) {
      delivery(orderRef: $orderRef, shipmentId: $shipmentId) {
        id
        code
        orderRef {
          id
          partition
        }
        trackingStatus {
          status_code
          description
          occurred_at
          location
        }
        trackingEvents {
          status_code
          status_description
          occurred_at
          location
        }
        sendTo {
          name
          city
          country
        }
        sendFrom {
          name
          city
          country
        }
        carrierInfo {
          name
          service {
            name
          }
        }
        label {
          tracking_number
          tracking_url
          label_download {
            pdf
          }
        }
        finalizedConfiguration {
          boxes {
            used_weight
            dimensions_cm {
              width
              height
              depth
            }
            items {
              forObject {
                id
                partition
              }
              variantId
              name
              quantity
            }
          }
        }
      }
    }`,
    {
      orderRef,
      shipmentId,
    }
  );

  return resp.delivery;
};

const useDelivery = ({
  orderRef,
  shipmentId,
  merchantId,
  enabled = true,
}: {
  orderRef: recordref_type;
  shipmentId: string;
  merchantId: string;
  enabled?: boolean;
}) => {
  return useRealTimeQuery<shipment_type>({
    queryKey: ["delivery", orderRef.id, orderRef.partition, shipmentId],
    queryFn: () => queryFn(orderRef, shipmentId),
    realtimeEvent: "delivery", // your SignalR event name
    signalRGroup: `${merchantId}-deliveries`,
    selectId: (d) => d ? [d.id, d.orderRef!.id, d.orderRef!.partition] : [],
    enabled,
  });
};

export default useDelivery;
