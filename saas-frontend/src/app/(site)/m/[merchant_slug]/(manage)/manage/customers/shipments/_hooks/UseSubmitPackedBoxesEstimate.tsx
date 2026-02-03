'use client';

import { gql } from "@/lib/services/gql";
import { useMutation } from "@tanstack/react-query";
import { useShipmentsContext } from "../provider";
import { omit } from "@/lib/functions";
import { recordref_type } from "@/utils/spiriverse";

const UseSubmitPackedBoxesEstimate = () => {
    const { dispatch } = useShipmentsContext();

    return useMutation({
        mutationFn: async ({
            orderRef,
            shipmentId,
            packedBoxes,
            serviceCode,
            carrierCode,
            sendFrom,
            sendTo
        }: {
            orderRef: recordref_type;
            shipmentId: string;
            packedBoxes: any[];
            serviceCode: string;
            carrierCode: string;
            sendFrom: any;
            sendTo: any;
        }) => {

            dispatch({
                type: 'START_ESTIMATE',
                payload: shipmentId
            });

            // we need to set quantity to be the packed and then remove the packed field
            // from the packed box item, so we can use it in the mutation
            // this is because the packed field is not part of the mutation input
            let prepped_packedBoxes = packedBoxes.map((box) => ({
                ...box,
                items: box.items.map((item) => ({
                    ...item,
                    quantity: item.packed,
                })),
            }));
            prepped_packedBoxes = omit(prepped_packedBoxes, ['packed']);

            const resp = await gql<any>(
                `
                mutation SubmitPackedBoxesForEstimate(
                    $orderRef: RecordRefInput!
                    $shipmentId: ID!
                    $packedBoxes: [PackedBoxInput!]!
                    $serviceCode: String!
                    $carrierCode: String!
                    $sendFrom: ShippingAddressInput!
                    $sendTo: ShippingAddressInput!
                ) {
                    submit_packed_boxes_for_estimate(
                        orderRef: $orderRef
                        shipmentId: $shipmentId
                        packedBoxes: $packedBoxes
                        serviceCode: $serviceCode
                        carrierCode: $carrierCode
                        sendFrom: $sendFrom
                        sendTo: $sendTo
                    ) {
                        rate_id
                        carrier_code
                        service_code
                        service_type
                        delivery_days
                        carrier_friendly_name
                        total_rate {
                            amount
                            currency
                        }
                        tax_amount {
                            amount
                            currency
                        }
                    }
                }
                `,
                {
                    orderRef,
                    shipmentId,
                    packedBoxes: prepped_packedBoxes,
                    serviceCode,
                    carrierCode,
                    sendFrom,
                    sendTo
                }
            );

            return {
                shipmentId,
                estimate: resp.submit_packed_boxes_for_estimate,
                packedBoxes
            };
        },
        onSuccess: ({ shipmentId, estimate, packedBoxes }) => {
            dispatch({
                type: 'SET_ESTIMATE',
                payload: {
                    shipmentId,
                    estimate,
                    packedBoxes
                }
            });
        },
        onError: (err) => {
            dispatch({ type: 'SET_ERROR', payload: err as any });
        }
    });
};

export default UseSubmitPackedBoxesEstimate;