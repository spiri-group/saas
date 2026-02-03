'use client';

import { gql } from "@/lib/services/gql";
import { useMutation } from "@tanstack/react-query";
import { useShipmentsContext } from "../provider";
import { recordref_type } from "@/utils/spiriverse";

const UseConfirmAndFinalizeShipment = () => {
  const { dispatch } = useShipmentsContext();

  return useMutation({
    mutationFn: async ({
      orderRef,
      shipmentId
    }: {
      orderRef: recordref_type;
      shipmentId: string;
    }) => {
      dispatch({
        type: 'START_FINALIZE',
        payload: shipmentId
      });

      const resp = await gql<any>(
        `
        mutation ConfirmAndFinalizeShipment(
          $orderRef: RecordRefInput!
          $shipmentId: ID!
        ) {
          confirm_and_finalize_shipment(
            orderRef: $orderRef
            shipmentId: $shipmentId
          ) {
            shipmentId
            wasDeviated
            deviationType
            label {
              label_id
              tracking_number
              label_download {
                pdf
                png
                zpl
              }
              packages {
                package_id
                tracking_number
                label_download {
                  pdf
                  png
                  zpl
                }
              }
            }
          }
        }
        `,
        { orderRef, shipmentId }
      );


      return {
        shipmentId,
        wasDeviated: resp.confirm_and_finalize_shipment.wasDeviated,
        deviationType: resp.confirm_and_finalize_shipment.deviationType,
        shipmentLabel: {
          label_id: resp.confirm_and_finalize_shipment.label.label_id,
          tracking_number: resp.confirm_and_finalize_shipment.label.tracking_number,
          tracking_url: resp.confirm_and_finalize_shipment.label.tracking_url || '',
        },
        shipmentPackageLabels: resp.confirm_and_finalize_shipment.label.packages.map(p => ({
          package_id: p.package_id,
          tracking_number: p.tracking_number,
          label_download: p.label_download
        }))
      };
    },

    onSuccess: ({ shipmentId, shipmentLabel, shipmentPackageLabels, wasDeviated, deviationType }) => {
      dispatch({
        type: 'SET_FINALIZED',
        payload: {
          shipmentId,
          shipmentLabel,
          shipmentPackageLabels,
          packingMetadata: {
            wasDeviated,
            deviationType
          }
        }
      });
    },

    onError: (err) => {
      dispatch({
        type: 'SET_ERROR',
        payload: err as any
      });
    }
  });
};

export default UseConfirmAndFinalizeShipment;