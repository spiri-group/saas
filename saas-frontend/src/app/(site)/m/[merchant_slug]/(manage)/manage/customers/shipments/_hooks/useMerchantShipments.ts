import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";
import type { Shipment } from "../provider";
import { currency_amount_type, recordref_type, variant_weight_type } from "@/utils/spiriverse";

const key = "shipments-by-merchant";

const queryFn = async (merchantId?: string): Promise<Shipment[]> => {
  if (!merchantId) {
    return [];
  }

  const resp = await gql<{
    vendor: {
      shipments: {
        orderRef: recordref_type;
        id: string;
        code: string;
        carrierInfo?: Shipment["carrierInfo"];
        sendFrom: {
          id: string;
          name: string;
          city: string;
          country: string;
          line1: string;
          line2?: string;
          postal_code: string;
          state?: string;
        };
        sendTo: {
          id: string;
          name: string;
          city: string;
          country: string;
          line1: string;
          line2?: string;
          postal_code: string;
          state?: string;
        };
        configuration: {
          boxes: {
            id: string;
            name: string;
            code: string;
            label: string;
            dimensions_cm: {
              depth: number;
              width: number;
              height: number;
            };
            volume: number;
            used_weight: number;
            used_volume: number;
            max_weight_kg: number;
            items: {
              id: string;
              forObject: recordref_type;
              variantId: string;
              name: string;
              quantity: number;
              price: currency_amount_type;
              weight: variant_weight_type
            }[];
          }[],
          pricing: {
            tax_amount: {
              amount: number;
              currency: string;
            };
            subtotal_amount: {
              amount: number;
              currency: string;
            };
          };
        };
      }[];
    };
  }>(`
    query get_shipments_by_merchant($vendorId:String!, $onlyUnfinalized:Boolean) {
      vendor(id:$vendorId) {
        shipments(onlyUnfinalized:$onlyUnfinalized) {
          orderRef {
            id
            partition
            container
          }
          id
          code
          sendFrom {
            id
            name
            city
            country
            line1
            line2
            postal_code
            state
          }
          sendTo {
            id
            name
            city
            country
            line1
            line2
            postal_code
            state
          }
          carrierInfo {
            rate_id
            code
            name
            service {
              code
              name
              delivery_days
            }
          }
          configuration {
            boxes {
              id
              code  
              name
              dimensions_cm {
                depth
                width
                height
              }
              volume
              used_weight
              used_volume
              max_weight_kg
              items {
                id
                forObject {
                  id
                  partition
                  container
                }
                variantId
                name
                quantity
                price {
                  amount
                  currency
                }
                weight {
                  amount
                  uom
                }
              }
            },
            pricing {
              tax_amount {
                amount
                currency
              }
              subtotal_amount {
                amount
                currency
              }
            }
          }
        }
      }
    }
  `,
  {
    vendorId: merchantId,
    onlyUnfinalized: true, // Fetch only unfinalized shipments
  });

  return resp.vendor.shipments.map((shipment) => ({
    orderRef: shipment.orderRef,
    id: shipment.id,
    code: shipment.code,
    sendFrom: shipment.sendFrom,
    sendTo: shipment.sendTo,
    carrierInfo: shipment.carrierInfo,
    suggestedBoxes: shipment.configuration.boxes.map((box) => ({
      id: box.id,
      code: box.code,
      name: box.name,
      dimensions_cm: box.dimensions_cm,
      volume: box.volume,
      used_weight: box.used_weight,
      used_volume: box.used_volume,
      max_weight_kg: box.max_weight_kg,
      items: box.items.map((item) => ({
        id: item.id,
        forObject: item.forObject,
        variantId: item.variantId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        packed: 0,
        weight: {
          amount: item.weight.amount,
          uom: item.weight.uom,
        }
      })),
    })),
    suggestedPricing: shipment.configuration.pricing,
    packedBoxes: []
  }));
};

const useMerchantShipments = (merchantId?: string) => {
  return useQuery({
    queryKey: [key, merchantId],
    queryFn: () => queryFn(merchantId),
  });
};

export default useMerchantShipments;
