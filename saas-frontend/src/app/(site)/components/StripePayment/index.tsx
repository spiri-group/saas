'use client'

import { address_details_type, currency_amount_type, recordref_type } from "@/utils/spiriverse";
import { Elements, PaymentElement, useElements } from "@stripe/react-stripe-js";
import { Stripe, loadStripe } from "@stripe/stripe-js";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isNullOrUndefined, isNullOrWhitespace } from "@/lib/functions";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { cn } from "@/lib/utils";
import useFormStatus, { FormState } from "@/components/utils/UseFormStatus";
import { gql } from "@/lib/services/gql";
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import useCheckOutstandingConsents from "../ConsentGuard/hooks/UseCheckOutstandingConsents";
import useRecordConsents from "../ConsentGuard/hooks/UseRecordConsents";
import { Rocket, Snail, Truck, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AddressInput, { GooglePlaceSchema } from "@/components/ux/AddressInput";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSession } from "next-auth/react";
import UseUserAddresses from "@/app/(site)/u/_hooks/useUserAddresses";

// Zod schemas for form validation
const manualAddressSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postal_code: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required")
});

// Form schema that handles both Google address and manual entry
const addressFormSchema = z.object({
  googleAddress: GooglePlaceSchema.nullable(),
  manualAddress: manualAddressSchema.optional()
});

type AddressFormData = z.infer<typeof addressFormSchema>;

type BLProps = {
    orderRef?: recordref_type,
    stripeAccountId?: string,
    clientSecret?: string,
    return_url?: string,
    type: "SETUP" | "PAYMENT",
    digitalOnly?: boolean
}

const tierIcons = {
  express: Rocket,
  standard: Truck,
  budget: Snail
};

function groupCarrierOptions(options) {
  const buckets = {
    budget: [] as typeof options,
    standard: [] as typeof options,
    express: [] as typeof options,
  };

  for (const option of options) {
    const days = option.delivery_days;
    if (days == null) continue; // skip undefined
    if (days >= 5) buckets.budget.push(option);
    else if (days <= 2) buckets.express.push(option);
    else buckets.standard.push(option);
  }

  function pickOptionForTier(tier: "budget" | "standard" | "express", options) {
    if (options.length === 0) return null;

    const withCost = options.map(opt => ({
      ...opt,
      totalCost: opt.total_rate.amount + opt.tax_amount.amount + opt.stripe_fee.amount,
      days: opt.delivery_days ?? 999
    }));

    if (tier === "budget") {
      return withCost.sort((a, b) => a.totalCost - b.totalCost)[0];
    }

    if (tier === "standard") {
      const sorted = withCost.sort((a, b) => a.totalCost - b.totalCost);
      return sorted[Math.floor(sorted.length / 2)];
    }

    if (tier === "express") {
      return withCost
        .sort((a, b) => a.days - b.days)[0];
    }

    return null;
  }

  return {
    budget: buckets.budget.length > 0 ? pickOptionForTier("budget", buckets.budget) : null,
    standard: buckets.standard.length > 0 ? pickOptionForTier("standard", buckets.standard) : null,
    express: buckets.express.length > 0 ? pickOptionForTier("express", buckets.express) : null,
  };
}

type carrierOption = {
    rate_id: string,
    carrier_friendly_name: string,
    carrier_code: string,
    service_code: string,
    service_type: string,
    estimated_delivery_date: string | null,
    delivery_days: number | null,
    tax_amount: {
        amount: number,
        currency: string
    },
    total_rate: {
        amount: number,
        currency: string
    },
    stripe_fee: {
        amount: number,
        currency: string
    }
}

const useBL = (props: BLProps) => {

    const [shippingAddress, setShippingAddress] = useState<any | null>(props.digitalOnly ? null : null);
    const [billingAddress, setBillingAddress] = useState<any | null>(null);
    const [shipments, setShipments] = useState<{
        id: string,
        sendFrom: {
            name: string
        }
        selectedCarrierAndService: {
            carrier_code: string,
            service_code: string,
        } | undefined,
        choices: {
            budget: carrierOption | null,
            standard: carrierOption | null,
            express: carrierOption | null
        },
        carrierOptions: Array<carrierOption>
    }[] | null>(props.digitalOnly ? [] : null); // If digitalOnly, no shipments
    const [stripe, setStripe] = useState<Stripe | null>(null); // Add this line
    const [salesTax, setSalesTax] = useState<currency_amount_type | null>(null);

    useEffect(() => {
        const run = async () => {
            if (props.clientSecret != null) {
                const key = process.env.NEXT_PUBLIC_stripe_token ?? ""
                if (!isNullOrWhitespace(props.stripeAccountId)) {
                    const stripe = await loadStripe(key, { stripeAccount: props.stripeAccountId });
                    setStripe(stripe)
                }   
                else {
                    const stripe = await loadStripe(key)
                    setStripe(stripe)
                }
            }
        }

        run()

    }, [props.clientSecret, props.stripeAccountId])



    const updateSelectedCarrier = async (shipmentId: string, carrier_code: string, service_code: string) => {
        if (props.digitalOnly) return; // No shipping in digital mode
        if (shipments != null) {
            const newShipments = shipments.map((shipment) => {
                if (shipment.id == shipmentId) {
                    return {
                        ...shipment,
                        selectedCarrierAndService: {
                            carrier_code: carrier_code,
                            service_code: service_code
                        }
                    }
                } else {
                    return shipment
                }
            })
            setShipments(newShipments)

            // we need to work out the rate id
            const shipment = shipments.find((shipment) => shipment.id == shipmentId)
            if (shipment == null) {
                return;
            }
            const option = shipment.carrierOptions.find((option) => option.carrier_code == carrier_code && option.service_code == service_code)
            if (option == null) {
                return;
            }
            const rateId = option.rate_id

            // now we call graphql to set the selected carrier and service
            await gql<{
                set_selected_carrier: boolean
            }>(`
                mutation SetSelectedCarrier($orderRef: RecordRefInput!, $shipmentId: ID!, $rateId: String!) {
                    set_rate_for_shipment(orderRef: $orderRef, shipmentId: $shipmentId, rateId: $rateId) {
                        rate_id
                    }
                }
            `, {
                orderRef: props.orderRef,
                shipmentId: shipmentId,
                rateId: rateId
            })
        }
    }

    // Update order address via GraphQL
    const updateOrderAddress = async (address: any, name: string, type: 'shipping' | 'billing') => {
      if (!props.orderRef) return;
      if (type === 'shipping' && props.digitalOnly) return;
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
        orderRef: props.orderRef,
        name: name,
        address: address,
        mode: type
      });
    };

    // Update both billing and shipping addresses in a single GraphQL call
    const updateOrderAddresses = async (billingAddress: any, billingName: string, shippingAddress?: any, shippingName?: string) => {
      if (!props.orderRef) return;
      
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
        orderRef: props.orderRef,
        billingAddress: billingAddress,
        billingName: billingName,
        shippingAddress: props.digitalOnly ? null : shippingAddress,
        shippingName: props.digitalOnly ? null : shippingName
      });
    };

    // Generate sales tax
    const generateSalesTax = async () => {
      if (!props.orderRef) return;
      
      const result = await gql<{
        generate_sales_tax: {
          code: string,
          tax: {
            amount: currency_amount_type
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
        orderRef: props.orderRef
      });

      setSalesTax(result.generate_sales_tax.tax.amount);
    };

    // Generate shipments
    const generateShipments = async () => {
      if (!props.orderRef || props.digitalOnly) return;
      
      const result = await gql<{
        generate_shipments: {
          id: string,
          sendFrom: {
            name: string
          },
          carrierOptions: Array<{
            rate_id: string,
            carrier_friendly_name: string,
            carrier_code: string,
            service_code: string,
            service_type: string,
            estimated_delivery_date: string | null,
            delivery_days: number | null,
            tax_amount: {
              amount: number,
              currency: string
            },
            total_rate: {
              amount: number,
              currency: string
            },
            stripe_fee: {
              amount: number,
              currency: string
            }
          }>
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
        orderRef: props.orderRef
      });

      setShipments(result.generate_shipments.map((shipment) => {
        return {
          ...shipment,
          choices: groupCarrierOptions(shipment.carrierOptions),
          selectedCarrierAndService: undefined
        }
      }));
    };

    return {
        updateOrderAddress,
        updateOrderAddresses,
        setSalesTax,
        setShipments,
        generateSalesTax,
        generateShipments,
        step2: {
          isLoading: props.digitalOnly ? salesTax == null : shipments == null || salesTax == null,
          isReadyToFinish: 
            props.digitalOnly
              ? (billingAddress != null && salesTax != null)
              : (shipments != null && shipments.every(x => !isNullOrUndefined(x.selectedCarrierAndService)))
                && (billingAddress != null && shippingAddress != null)
                && salesTax != null
        },
        shippingAddress, setShippingAddress, 
        billingAddress, setBillingAddress, 
        stripe, 
        shipments,
        updateSelectedCarrier,
        salesTax,
        shippingPrice: props.digitalOnly ? undefined : (shipments != null ? {
            amount: shipments.reduce((acc, shipment) => {
                      return acc + shipment.carrierOptions.reduce((acc, option) => {
                          if (isNullOrUndefined(shipment.selectedCarrierAndService)) return acc;

                          if (shipment.selectedCarrierAndService.carrier_code == option.carrier_code && shipment.selectedCarrierAndService.service_code == option.service_code) {
                              return acc + option.total_rate.amount + option.tax_amount.amount + option.stripe_fee.amount;
                          } else {
                              return acc;
                          }
                      }, 0);
                  }, 0)
            ,
            currency: shipments != null && shipments.length > 0 ? shipments[0].carrierOptions[0].total_rate.currency : "USD"
        } : undefined),
        client_secret: props.clientSecret ?? null,
        // make the return url the same as the current page if not set
        return_url: props.return_url ?? window.location.href
    }

}

type payment_summary_type = {
    quantity: number,
    subtotal: currency_amount_type,
    fees: currency_amount_type,
    total: currency_amount_type,
    discount: currency_amount_type
}

type CheckoutItem = {
    name: string;
    quantity: number;
    price: currency_amount_type;
    itemType?: 'PRODUCT' | 'SERVICE';
};

type Props = Omit<BLProps, 'digitalOnly'> & {
    payButtonTitle?: string,
    amount?: currency_amount_type,
    className?: string,
    items?: CheckoutItem[],
    paymentSummary?: payment_summary_type | null,
    onCancel?: () => void,
    onAlter?: () => void
}

// Internal props that include the computed digitalOnly flag
type InternalProps = Props & { digitalOnly: boolean }


type AddressPillData = {
  name: string;
  address: address_details_type;
};

const formatAddressPreview = (data: AddressPillData | null): string => {
  if (!data) return "";
  const { address } = data;
  const parts = [
    address.line1,
    address.city,
    address.state,
    address.country
  ].filter(Boolean);
  
  return parts.join(", ");
};

const AddressPill = ({ 
  title, 
  isExpanded, 
  onToggle, 
  onAddressChange, 
  isManualMode, 
  onToggleManual, 
  address,
  savedAddresses = []
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  onAddressChange: (data: AddressPillData) => void;
  isManualMode: boolean;
  onToggleManual: () => void;
  address?: AddressPillData;
  savedAddresses?: any[];
  digitalOnly?: boolean;
}) => {
  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      googleAddress: null,
      manualAddress: {
        name: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: ""
      }
    }
  });

  const handleGoogleAddressSelect = (place: any) => {
    if (place && place.components) {
      const addressData = {
        name: place.formattedAddress.split(',')[0],
        address: {
          line1: place.components.line1,
          line2: place.components.line2 || "",
          city: place.components.city,
          state: place.components.state || "",
          postal_code: place.components.postal_code,
          country: place.components.country
        }
      };
      onAddressChange(addressData);
      // Auto-close this pill after address selection
      setTimeout(() => {
        onToggle();
      }, 500);
    }
  };

  const onManualSubmit = (data: AddressFormData) => {
    if (data.manualAddress) {
      const addressData = {
        name: data.manualAddress.name,
        address: {
          line1: data.manualAddress.line1,
          line2: data.manualAddress.line2 || "",
          city: data.manualAddress.city,
          state: data.manualAddress.state || "",
          postal_code: data.manualAddress.postal_code,
          country: data.manualAddress.country
        }
      };
      onAddressChange(addressData);
      // Auto-close this pill after manual address submission
      setTimeout(() => {
        onToggle();
      }, 500);
    }
  };

  const handleSavedAddressSelect = (savedAddress: any) => {
    const addressData: AddressPillData = {
      name: savedAddress.address.formattedAddress.split(',')[0] || 'Saved Address',
      address: {
        line1: savedAddress.address.components.line1,
        city: savedAddress.address.components.city,
        state: savedAddress.address.components.state || "",
        postal_code: savedAddress.address.components.postal_code,
        country: savedAddress.address.components.country
      }
    };
    onAddressChange(addressData);
    // Auto-close this pill after saved address selection
    setTimeout(() => {
      onToggle();
    }, 500);
  };

  return (
    <motion.div
      layout
      className={cn(
        "transition-all duration-300",
        isExpanded ? "flex-1 flex flex-col" : "flex-shrink-0"
      )}
    >
      <Card 
        variant="secondary"
        className={cn(
          "transition-all duration-300 cursor-pointer",
          isExpanded ? "flex-1 flex flex-col" : "hover:bg-white/60"
        )}
      >
        <CardHeader 
          className="p-4 pb-2 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={cn(
                "w-3 h-3 rounded-full transition-colors duration-300",
                address ? "bg-green-500 shadow-sm" : "bg-gray-400"
              )} />
              <span className="font-medium">{title}</span>
              {address && (
                <span className="text-xs text-gray-600 truncate flex-1">
                  {formatAddressPreview(address)}
                </span>
              )}
            </div>
            {isExpanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {isExpanded && (
            <CardContent className="flex-1 flex flex-col justify-center p-6 pt-2">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {!isManualMode ? (
                <div className="space-y-4">
                  {/* Saved Addresses */}
                  {savedAddresses.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-700">Your Saved Addresses</span>
                      <div className="space-y-2">
                        {savedAddresses.map((savedAddress) => (
                          <button
                            key={savedAddress.id}
                            type="button"
                            onClick={() => handleSavedAddressSelect(savedAddress)}
                            className={cn(
                              "w-full p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors",
                              savedAddress.isDefault && "border-blue-500 bg-blue-50"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">
                                  {savedAddress.address.formattedAddress}
                                </div>
                                {savedAddress.isDefault && (
                                  <div className="text-xs text-blue-600 mt-1">Default Address</div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Google Address Search */}
                  <div className="space-y-3">
                    {savedAddresses.length > 0 && (
                      <span className="text-sm font-medium text-gray-700">Or Search for New Address</span>
                    )}
                    <Form {...form}>
                      <FormField
                        control={form.control}
                        name="googleAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <AddressInput
                                value={field.value}
                                placeholder="Search for an address..."
                                onChange={(place) => {
                                  field.onChange(place);
                                  handleGoogleAddressSelect(place);
                                }}
                                name={field.name}
                                onBlur={field.onBlur}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Form>
                    <button
                      type="button"
                      data-testid="manual-address-toggle"
                      onClick={onToggleManual}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Enter details manually
                    </button>
                  </div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onManualSubmit)} className="space-y-3">
                    <FormField
                      control={form.control}
                      name="manualAddress.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Full name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manualAddress.line1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 1</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Street address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manualAddress.line2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 2 (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Apartment, suite, etc." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="manualAddress.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="City" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="manualAddress.state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="State" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="manualAddress.postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Postal code" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="manualAddress.country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Country (e.g., US)" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" size="sm">Save Address</Button>
                      <button
                        type="button"
                        onClick={onToggleManual}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Use address search instead
                      </button>
                    </div>
                  </form>
                </Form>
                )}
              </motion.div>
            </CardContent>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

const MasterCheckout = ({
  bl,
  props,
  onCancel,
  onAlter,
  finish,
  isProcessing
}: {
  bl: ReturnType<typeof useBL>;
  props: InternalProps;
  onCancel?: () => void;
  onAlter?: () => void;
  finish: () => void;
  isProcessing?: boolean;
}) => {
  // Checkout consent
  const [checkoutConsentChecked, setCheckoutConsentChecked] = useState<Set<string>>(new Set());
  const recordConsents = useRecordConsents();

  const handleCheckoutConsentToggle = (documentType: string) => {
    setCheckoutConsentChecked(prev => {
      const next = new Set(prev);
      if (next.has(documentType)) {
        next.delete(documentType);
      } else {
        next.add(documentType);
      }
      return next;
    });
  };

  // Determine initial expanded section based on order type
  const getInitialSection = () => {
    return "billing";
  };

  const [expandedSection, setExpandedSection] = useState<string | null>(getInitialSection);
  const [shippingAddress, setShippingAddress] = useState<AddressPillData | null>(null);
  const [billingAddress, setBillingAddress] = useState<AddressPillData | null>(null);
  const [currentShipmentIndex, setCurrentShipmentIndex] = useState(0);

  // Get user data for saved addresses
  const { data: session, status } = useSession();
  const isUserLoading = status === "loading";
  const user = session?.user;
  const { data: userAddresses, isLoading: isAddressesLoading } = UseUserAddresses(user?.id || "");

  // Checkout consent - check for outstanding refund-policy and payment-terms
  const { data: checkoutConsents } = useCheckOutstandingConsents('checkout', !!user);

  // Service-specific consent - spiritual-services-disclaimer (only when ordering services)
  const hasServiceItems = props.items?.some(item => item.itemType === 'SERVICE') ?? false;
  const { data: serviceConsents } = useCheckOutstandingConsents('service-checkout', !!user && hasServiceItems);

  // Combine all outstanding checkout consents
  const allOutstandingConsents = [
    ...(checkoutConsents || []),
    ...(serviceConsents || []),
  ];
  const hasOutstandingCheckoutConsents = allOutstandingConsents.length > 0;
  const allCheckoutConsentsAccepted = !hasOutstandingCheckoutConsents ||
    allOutstandingConsents.every(c => checkoutConsentChecked.has(c.documentType));

  const handleFinishWithConsent = async () => {
    if (hasOutstandingCheckoutConsents) {
      const inputs = allOutstandingConsents.map(doc => ({
        documentType: doc.documentType,
        documentId: doc.documentId,
        version: doc.version,
        consentContext: 'checkout',
        documentTitle: doc.title,
      }));
      await recordConsents.mutateAsync(inputs);
    }
    finish();
  };

  const [isManualShipping, setIsManualShipping] = useState(false);
  const [isManualBilling, setIsManualBilling] = useState(false);

  // Default to manual entry if user has no saved addresses
  // This provides a better UX since Google Places autocomplete can be unreliable
  useEffect(() => {
    if (!isAddressesLoading && (!userAddresses || userAddresses.length === 0)) {
      setIsManualShipping(true);
      setIsManualBilling(true);
    }
  }, [isAddressesLoading, userAddresses]);

  // Determine loading stages
  const showGreeting = user && !isUserLoading;
  const isGuestCheckout = !isUserLoading && !user;
  const showPills = !isUserLoading && (!user || !isAddressesLoading);

  const handleShippingAddressChange = async (data: AddressPillData) => {
    setShippingAddress(data);
    await bl.updateOrderAddress(data.address, data.name, "shipping");
    bl.setShippingAddress(data.address);

    // Generate shipments when shipping address changes
    await bl.generateShipments();

    setTimeout(() => {
      setExpandedSection("shipping-options");
    }, 300);
  };

  const handleBillingAddressChange = async (data: AddressPillData) => {
    setBillingAddress(data);
    await bl.updateOrderAddress(data.address, data.name, "billing");
    bl.setBillingAddress(data.address);

    // Generate sales tax when billing address changes
    await bl.generateSalesTax();

    // Auto-progress to next section
    setTimeout(() => {
      setExpandedSection(props.digitalOnly ? "payment" : "shipping");
    }, 300);
  };

  const hasShippingSelected = bl.shipments?.every(x => !isNullOrUndefined(x.selectedCarrierAndService)) ?? false;
  
  const allComplete = props.digitalOnly 
    ? (billingAddress !== null && bl.step2.isReadyToFinish)
    : (shippingAddress !== null && billingAddress !== null && hasShippingSelected && bl.step2.isReadyToFinish);

  // Calculate totals for summary
  const total = props.paymentSummary?.total ?? props.amount ?? { amount: 0, currency: "USD" };
  const totalWithShipping = !props.digitalOnly && bl.shippingPrice
    ? {
        amount: total.amount + bl.shippingPrice.amount,
        currency: total.currency,
      }
    : total;
  const totalWithShippingAndTax = bl.salesTax != null 
    ? {
        amount: totalWithShipping.amount + bl.salesTax.amount,
        currency: totalWithShipping.currency
      }
    : totalWithShipping;
  const totalTax = bl.salesTax != null && (!props.digitalOnly ? bl.shippingPrice != null : true)
    ? {
        amount: bl.salesTax.amount,
        currency: bl.salesTax.currency
      }
    : undefined;

  // Auto-fill default billing address for logged-in users
  useEffect(() => {
    if (userAddresses && userAddresses.length > 0 && !billingAddress) {
      const defaultAddress = userAddresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        const addressData: AddressPillData = {
          name: defaultAddress.address.formattedAddress.split(',')[0] || 'Default Address',
          address: {
            line1: defaultAddress.address.components.line1,
            city: defaultAddress.address.components.city,
            state: defaultAddress.address.components.state || "",
            postal_code: defaultAddress.address.components.postal_code,
            country: defaultAddress.address.components.country
          }
        };

        setBillingAddress(addressData);
        if (!props.digitalOnly) {
          setShippingAddress(addressData);
        }
        
        // Update both addresses in a single GraphQL call
        const updateAddressesAndTriggerTasks = async () => {
          await bl.updateOrderAddresses(
            addressData.address, 
            addressData.name, 
            props.digitalOnly ? undefined : addressData.address,
            props.digitalOnly ? undefined : addressData.name
          );
          
          // Only set addresses in state after GraphQL call succeeds
          bl.setBillingAddress(addressData.address);
          
          // Also set as shipping address if not digital only
          if (!props.digitalOnly) {
            bl.setShippingAddress(addressData.address);
          }
          
          // After addresses are updated, trigger parallel calls for sales tax and shipments
          const promises: Promise<void>[] = [];

          // Generate sales tax
          promises.push(bl.generateSalesTax());
          
          // Generate shipments if not digital only
          if (!props.digitalOnly) {
            promises.push(bl.generateShipments());
          }
          
          // Execute all promises in parallel
          await Promise.all(promises);
        };
        
        updateAddressesAndTriggerTasks();
        
        // Auto-progress to next section - skip directly to shipping-options or payment since both addresses are set
        setTimeout(() => {
          setExpandedSection(props.digitalOnly ? "payment" : "shipping-options");
        }, 100);
      }
    }
  }, [userAddresses, billingAddress, bl, props.digitalOnly]);

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-4">
        {/* Loading and Greeting Section */}
        {isUserLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-gray-500">Loading checkout...</div>
          </div>
        )}
        
        {showGreeting && (
          <Card variant="tertiary" className="text-center py-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Hi {user.email?.split('@')[0] || 'there'}, let&apos;s checkout! 
            </h2>
          </Card>
        )}

        {isGuestCheckout && (
          <Card variant="tertiary" className="text-center py-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Let&apos;s get your order ready!
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Just a few details and you&apos;ll be all set.
            </p>
          </Card>
        )}

        {isAddressesLoading && showGreeting && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-pulse text-gray-500">Loading your addresses...</div>
          </div>
        )}
      </div>

      {/* Scrollable Pills Section - Only show when fully loaded */}
      {showPills && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 py-4">
          {/* Billing Address Pill */}
          <AddressPill
            title="Billing Address"
            isExpanded={expandedSection === "billing"}
            onToggle={() => setExpandedSection(expandedSection === "billing" ? null : "billing")}
            onAddressChange={handleBillingAddressChange}
            isManualMode={isManualBilling}
            onToggleManual={() => setIsManualBilling(!isManualBilling)}
            address={billingAddress ?? undefined}
            savedAddresses={userAddresses || []}
          />

          {/* Shipping Address Pill */}
          {!props.digitalOnly && (
            <AddressPill
              title="Shipping Address"
              isExpanded={expandedSection === "shipping"}
              onToggle={() => setExpandedSection(expandedSection === "shipping" ? null : "shipping")}
              onAddressChange={handleShippingAddressChange}
              isManualMode={isManualShipping}
              onToggleManual={() => setIsManualShipping(!isManualShipping)}
              address={shippingAddress ?? undefined}
              savedAddresses={userAddresses || []}
            />
          )}

          {/* Shipping Options Pill */}
          {!props.digitalOnly && (
            <ShippingPill
              isExpanded={expandedSection === "shipping-options"}
              onToggle={() => setExpandedSection(expandedSection === "shipping-options" ? null : "shipping-options")}
              shipments={bl.shipments}
              updateSelectedCarrier={bl.updateSelectedCarrier}
              hasShippingSelected={hasShippingSelected}
              currentShipmentIndex={currentShipmentIndex}
              setCurrentShipmentIndex={setCurrentShipmentIndex}
              onShippingComplete={() => {
                setTimeout(() => {
                  setExpandedSection("payment");
                }, 300);
              }}
            />
          )}

          {/* Payment Method Pill */}
          <PaymentMethodPill
            isExpanded={expandedSection === "payment"}
            onToggle={() => setExpandedSection(expandedSection === "payment" ? null : "payment")}
            hasPaymentMethod={false}
          />
        </div>

        )}

        {/* Payment Summary */}
        <Card variant="tertiary" className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Total</span>
            <CurrencySpan value={totalWithShippingAndTax} withAnimation={false} className="text-lg font-bold" />
          </div>
          <div className="space-y-1 text-sm text-black/60">
            {props.paymentSummary?.subtotal && (
              <div className="flex justify-between">
                <span>Subtotal</span>
                <CurrencySpan value={props.paymentSummary.subtotal} withAnimation={false} />
              </div>
            )}
            {props.paymentSummary?.fees && (
              <div className="flex justify-between">
                <span>Fees</span>
                <CurrencySpan value={props.paymentSummary.fees} withAnimation={false} />
              </div>
            )}
            {!props.digitalOnly && bl.shippingPrice && (
              <div className="flex justify-between">
                <span>Shipping</span>
                {hasShippingSelected ? (
                  <CurrencySpan value={bl.shippingPrice} withAnimation={false} />
                ) : (
                  <span className="text-orange-600">Select shipping option</span>
                )}
              </div>
            )}
            {totalTax && (
              <div className="flex justify-between">
                <span>Tax</span>
                <CurrencySpan value={totalTax} withAnimation={false} />
              </div>
            )}
          </div>
        </Card>

        {/* Checkout Consent */}
        {hasOutstandingCheckoutConsents && (
          <div className="space-y-2 pt-2" data-testid="checkout-consent-section">
            {allOutstandingConsents.map(doc => (
              <div key={doc.documentType} className="flex items-start space-x-2">
                <Checkbox
                  id={`checkout-consent-${doc.documentType}`}
                  data-testid={`checkout-consent-${doc.documentType}`}
                  checked={checkoutConsentChecked.has(doc.documentType)}
                  onCheckedChange={() => handleCheckoutConsentToggle(doc.documentType)}
                />
                <label
                  htmlFor={`checkout-consent-${doc.documentType}`}
                  className="text-xs text-gray-600 cursor-pointer select-none leading-tight"
                >
                  I agree to the{' '}
                  <a
                    href={`/legal/${doc.documentType}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    {doc.title}
                  </a>
                </label>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 flex justify-between">
          {onCancel &&
            <Button variant="link" onClick={onCancel}>
              Continue Shopping
            </Button>
          }
          { onAlter &&
            <Button variant="link" onClick={onAlter}>
              Change Order
            </Button>
          }
          <Button
            data-testid="finish-pay-btn"
            disabled={!allComplete || isProcessing || !allCheckoutConsentsAccepted}
            onClick={handleFinishWithConsent}
          >
            {isProcessing || recordConsents.isPending ? 'Processing...' : 'Finish & Pay'}
          </Button>
        </div>
    </div>
  );
};

const formatShippingPreview = (shipments: any[] | null): string => {
  if (!shipments || shipments.length === 0) return "";
  
  const selectedOptions = shipments
    .filter(s => s.selectedCarrierAndService)
    .map(s => {
      const option = s.carrierOptions.find(opt => 
        opt.carrier_code === s.selectedCarrierAndService?.carrier_code &&
        opt.service_code === s.selectedCarrierAndService?.service_code
      );
      if (option) {
        const days = option.delivery_days ? `${option.delivery_days}d` : "?d";
        return `${option.carrier_friendly_name} (${days})`;
      }
      return "";
    })
    .filter(Boolean);
  
  return selectedOptions.join(", ");
};

const ShippingPill = ({ 
  isExpanded, 
  onToggle, 
  shipments, 
  updateSelectedCarrier,
  hasShippingSelected,
  currentShipmentIndex,
  setCurrentShipmentIndex,
  onShippingComplete 
}: {
  isExpanded: boolean;
  onToggle: () => void;
  shipments: any[] | null;
  updateSelectedCarrier: (shipmentId: string, carrier_code: string, service_code: string) => void;
  hasShippingSelected: boolean;
  currentShipmentIndex: number;
  setCurrentShipmentIndex: (index: number) => void;
  onShippingComplete?: () => void;
}) => {
  return (
    <motion.div
      layout
      className={cn(
        "transition-all duration-300",
        isExpanded ? "flex-1 flex flex-col" : "flex-shrink-0"
      )}
    >
      <Card 
        variant="secondary"
        className={cn(
          "transition-all duration-300 cursor-pointer",
          isExpanded ? "flex-1 flex flex-col" : "hover:bg-white/60"
        )}
      >
        <CardHeader 
          className="p-4 pb-2 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={cn(
                "w-3 h-3 rounded-full transition-colors duration-300",
                hasShippingSelected ? "bg-green-500 shadow-sm" : "bg-gray-400"
              )} />
              <span className="font-medium">Shipping Options</span>
              {hasShippingSelected && (
                <span className="text-xs text-gray-600 truncate flex-1">
                  {formatShippingPreview(shipments)}
                </span>
              )}
            </div>
            {isExpanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {isExpanded && (
            <CardContent className="flex-1 flex flex-col justify-center p-6 pt-2">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {shipments == null && (
                  <div className="bg-slate-100 p-4 rounded animate-pulse">Loading shipping options...</div>
                )}
                
                {shipments && shipments.length > 0 && (
                  <>
                    {shipments.length === 1 ? (
                      // Single shipment - show directly without step progression
                      <div className="space-y-4">
                        <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-blue-900">
                              From: {shipments[0].sendFrom.name}
                            </span>
                            {shipments[0].selectedCarrierAndService && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col space-y-2">
                            {(["budget", "standard", "express"] as const).map((tier) => {
                              const option = shipments[0].choices[tier];
                              if (!option) return null;

                              const Icon = tierIcons[tier];
                              const isSelected = shipments[0].selectedCarrierAndService?.carrier_code === option.carrier_code &&
                                                shipments[0].selectedCarrierAndService?.service_code === option.service_code;

                              return (
                                <Button
                                  key={option.rate_id}
                                  variant={isSelected ? "default" : "outline"}
                                  className={cn(
                                    "w-full items-start text-left px-4 py-4 rounded-lg",
                                    "border bg-white hover:bg-muted/50 shadow-sm",
                                    isSelected && "border-primary bg-primary text-primary-foreground"
                                  )}
                                  onClick={() => {
                                    updateSelectedCarrier(shipments[0].id, option.carrier_code, option.service_code);
                                    // Auto-complete since it's a single shipment
                                    setTimeout(() => {
                                      onShippingComplete?.();
                                    }, 300);
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-2 h-full">
                                    <Icon className="w-4 h-4" />
                                    <span className="text-base font-semibold w-20">{tier[0].toUpperCase() + tier.slice(1)}</span>
                                  </div>

                                  <div className="ml-2 flex justify-between h-full w-full items-center">
                                    <div className="text-sm">
                                      Est. {option.delivery_days ?? "?"} day{option.delivery_days !== 1 ? "s" : ""}
                                    </div>
                                    <div className="text-sm font-medium">
                                      <CurrencySpan value={option.total_rate} withAnimation={false} />
                                    </div>
                                  </div>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Multiple shipments - use step progression
                      <>
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Shipping Progress
                            </span>
                            <span className="text-xs text-gray-500">
                              {shipments.filter(s => s.selectedCarrierAndService).length} of {shipments.length} complete
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${(shipments.filter(s => s.selectedCarrierAndService).length / shipments.length) * 100}%` 
                              }}
                            />
                          </div>
                        </div>

                        {/* Current Shipment */}
                        {currentShipmentIndex < shipments.length && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Merchant {currentShipmentIndex + 1} of {shipments.length}
                                </span>
                                {shipments[currentShipmentIndex].selectedCarrierAndService && (
                                  <Check className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                              
                              {/* Navigation Controls */}
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentShipmentIndex(Math.max(0, currentShipmentIndex - 1))}
                                  disabled={currentShipmentIndex === 0}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentShipmentIndex(Math.min(shipments.length - 1, currentShipmentIndex + 1))}
                                  disabled={currentShipmentIndex >= shipments.length - 1}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Current Shipment Card */}
                            <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-blue-900">
                                  From: {shipments[currentShipmentIndex].sendFrom.name}
                                </span>
                                {shipments[currentShipmentIndex].selectedCarrierAndService && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                    Selected
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col space-y-2">
                                {(["budget", "standard", "express"] as const).map((tier) => {
                                  const option = shipments[currentShipmentIndex].choices[tier];
                                  if (!option) return null;

                                  const Icon = tierIcons[tier];
                                  const isSelected = shipments[currentShipmentIndex].selectedCarrierAndService?.carrier_code === option.carrier_code &&
                                                    shipments[currentShipmentIndex].selectedCarrierAndService?.service_code === option.service_code;

                                  return (
                                    <Button
                                      key={option.rate_id}
                                      variant={isSelected ? "default" : "outline"}
                                      className={cn(
                                        "w-full items-start text-left px-4 py-4 rounded-lg",
                                        "border bg-white hover:bg-muted/50 shadow-sm",
                                        isSelected && "border-primary bg-primary text-primary-foreground"
                                      )}
                                      onClick={() => {
                                        updateSelectedCarrier(shipments[currentShipmentIndex].id, option.carrier_code, option.service_code);
                                        
                                        // Auto-advance to next incomplete shipment or complete if all done
                                        setTimeout(() => {
                                          const nextIncompleteIndex = shipments.findIndex((s, idx) => 
                                            idx > currentShipmentIndex && !s.selectedCarrierAndService
                                          );
                                          
                                          if (nextIncompleteIndex !== -1) {
                                            setCurrentShipmentIndex(nextIncompleteIndex);
                                          } else {
                                            // Check if all shipments are now complete
                                            const allComplete = shipments.every(s => s.selectedCarrierAndService || s.id === shipments[currentShipmentIndex].id);
                                            if (allComplete) {
                                              onShippingComplete?.();
                                            }
                                          }
                                        }, 300);
                                      }}
                                    >
                                      <div className="flex items-center gap-2 mb-2 h-full">
                                        <Icon className="w-4 h-4" />
                                        <span className="text-base font-semibold w-20">{tier[0].toUpperCase() + tier.slice(1)}</span>
                                      </div>

                                      <div className="ml-2 flex justify-between h-full w-full items-center">
                                        <div className="text-sm">
                                          Est. {option.delivery_days ?? "?"} day{option.delivery_days !== 1 ? "s" : ""}
                                        </div>
                                        <div className="text-sm font-medium">
                                          <CurrencySpan value={option.total_rate} withAnimation={false} />
                                        </div>
                                      </div>
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Complete Button (shown when all selections made) */}
                            {shipments.every(s => s.selectedCarrierAndService) && (
                              <Button 
                                onClick={() => onShippingComplete?.()}
                                className="w-full"
                              >
                                Complete Shipping Selection
                              </Button>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    <div className="text-xs text-muted-foreground text-center mt-2">
                      * All delivery estimates are in business days.
                    </div>
                  </>
                )}
              </motion.div>
            </CardContent>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

const PaymentMethodPill = ({ 
  isExpanded, 
  onToggle, 
  hasPaymentMethod
}: {
  isExpanded: boolean;
  onToggle: () => void;
  hasPaymentMethod: boolean;
}) => {
  return (
    <motion.div
      layout
      className={cn(
        "transition-all duration-300",
        isExpanded ? "flex-1 flex flex-col" : "flex-shrink-0"
      )}
    >
      <Card 
        variant="secondary"
        className={cn(
          "transition-all duration-300 cursor-pointer",
          isExpanded ? "flex-1 flex flex-col" : "hover:bg-white/60"
        )}
      >
        <CardHeader 
          className="p-4 pb-2 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={cn(
                "w-3 h-3 rounded-full transition-colors duration-300",
                hasPaymentMethod ? "bg-green-500 shadow-sm" : "bg-gray-400"
              )} />
              <span className="font-medium">Payment Method</span>
              {hasPaymentMethod && (
                <span className="text-xs text-gray-600 truncate flex-1">
                  Payment method ready
                </span>
              )}
            </div>
            {isExpanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {isExpanded && (
            <CardContent className="flex-1 flex flex-col justify-center p-6 pt-2">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col justify-center"
              >
                <PaymentElement options={{ terms: { card: "never" } }} />
              </motion.div>
            </CardContent>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};


const CheckoutMultistep = ({ bl, props }: { bl: ReturnType<typeof useBL>; props: InternalProps }) => {
  const elements = useElements();
  const status = useFormStatus();

  const finish = async () => {
    await status.submit(async () => {
      if (elements && bl.stripe) {
        const confirmParams = { return_url: bl.return_url };
        const resp =
          props.type === "SETUP"
            ? await bl.stripe.confirmSetup({ elements, confirmParams })
            : await bl.stripe.confirmPayment({ elements, confirmParams });
        console.error(resp.error);
      }
    }, {}, () => {});
  };

  return (
    <div className="flex flex-col space-y-4 h-full min-h-0">
      <MasterCheckout
        bl={bl}
        props={props}
        onCancel={props.onCancel}
        onAlter={props.onAlter}
        finish={finish}
        isProcessing={status.formState === FormState.PROCESSING}
      />
    </div>
  );
};

const UI = (props: Props) => {
  // Determine if order is digital-only based on item types
  // - If no items provided, default to digital-only (subscription/setup flows)
  // - If items provided, check if any require shipping (only PRODUCT type needs shipping)
  const digitalOnly = !props.items || props.items.length === 0
    ? true  // No items = digital flow (e.g., subscriptions)
    : props.items.every(item => item.itemType !== 'PRODUCT');  // Only products need shipping

  // Debug logging
  console.log('[StripePayment] Items:', props.items);
  console.log('[StripePayment] Computed digitalOnly:', digitalOnly);

  const bl = useBL({ ...props, digitalOnly });

  // Create enriched props with computed digitalOnly for child components
  const enrichedProps = { ...props, digitalOnly };

  return bl.client_secret && bl.stripe ? (
    <Elements stripe={bl.stripe} options={{ clientSecret: bl.client_secret }}>
      <CheckoutMultistep props={enrichedProps} bl={bl} />
    </Elements>
  ) : null;
};

export default UI;
