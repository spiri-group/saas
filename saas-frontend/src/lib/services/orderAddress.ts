// Business logic for updating order addresses
import { gql } from './gql';
import { AddressPillData } from '../../app/(site)/components/StripePayment/types';

export const updateOrderAddressBL = async (orderRef: any, address: any, name: string, type: 'shipping' | 'billing', digitalOnly: boolean) => {
  if (!orderRef) return;
  if (type === 'shipping' && digitalOnly) return;
  await gql(`
    mutation update_order_address($orderRef: RecordRefInput!, $address: AddressDetailsInput!, $name: String!, $mode: String!) {
      update_order_address(orderRef: $orderRef, address: $address, name: $name, mode: $mode) {
        code
        order {
          id
        }
      }
    }
  `, {
    orderRef,
    name,
    address,
    mode: type
  });
};

export const updateBothAddressesBL = async (
  orderRef: any,
  billingData: AddressPillData,
  shippingData: AddressPillData | undefined,
  digitalOnly: boolean,
  setBillingAddress: (data: AddressPillData) => void,
  setShippingAddress: (data: AddressPillData) => void,
  bl: any,
  shippingAddress: AddressPillData | null,
  groupCarrierOptions: any
) => {
  if (!orderRef) return;

  setBillingAddress(billingData);
  bl.setBillingAddress(billingData.address);

  if (!digitalOnly && shippingData) {
    setShippingAddress(shippingData);
    bl.setShippingAddress(shippingData.address);
  }

  await gql(`
    mutation update_order_addresses($orderRef: RecordRefInput!, $billingAddress: AddressDetailsInput!, $billingName: String!, $shippingAddress: AddressDetailsInput, $shippingName: String) {
      update_order_addresses(orderRef: $orderRef, billingAddress: $billingAddress, billingName: $billingName, shippingAddress: $shippingAddress, shippingName: $shippingName) {
        code
        order {
          id
        }
      }
    }
  `, {
    orderRef,
    billingName: billingData.name,
    billingAddress: billingData.address,
    shippingName: shippingData?.name || null,
    shippingAddress: shippingData?.address || null
  });

  const generationPromises: Promise<any>[] = [];

  const generateSalesTax = async () => {
    const result = await gql<{
      generate_sales_tax: {
        code: string,
        tax: {
          amount: any
        }
      }
    }>(`
      mutation GenerateSalesTax($orderRef: RecordRefInput!) {
        generate_sales_tax(orderRef: $orderRef) {
          code
          tax {
            amount {
              amount
              currency
            }
          }
        }
      }
    `, {
      orderRef
    });
    bl.salesTax(result.generate_sales_tax.tax.amount);
  };

  generationPromises.push(generateSalesTax());

  if (!digitalOnly && (shippingData || shippingAddress)) {
    const generateShipments = async () => {
      const result = await gql<{
        generate_shipments: {
          id: string,
          sendFrom: {
            name: string
          },
          carrierOptions: Array<any>
        }[]
      }>(`
        mutation GenerateShipments($orderRef: RecordRefInput!) {
          generate_shipments(orderRef: $orderRef) {
            id
            sendFrom {
              name
            }
            carrierOptions {
              rate_id
              carrier_friendly_name
              carrier_code
              service_code
              service_type
              estimated_delivery_date
              delivery_days
              tax_amount {
                amount
                currency
              }
              total_rate {
                amount
                currency
              }
              stripe_fee {
                amount
                currency
              }
            }
          }
        }
      `, {
        orderRef
      });

      bl.setShipments(result.generate_shipments.map((shipment) => {
        return {
          ...shipment,
          choices: groupCarrierOptions(shipment.carrierOptions),
          selectedCarrierAndService: undefined
        }
      }));
    };

    generationPromises.push(generateShipments());
  }

  await Promise.all(generationPromises);
};
