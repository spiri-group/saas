//#region Order

import { currency_amount_type, media_type, recordref_type, stripe_details_type } from "../0_shared/types"
import { shipment_type, label_info_type } from "../logistics/types"
import { address_details_type, user_type } from "../user/types"
import { vendor_type } from "../vendor/types"
import { featuring_source_type } from "../featuring/types"

export type order_type = {
    id: string
    orderId: string
    docType: string
    code: number
    customerEmail: string,
    customer: user_type,
    forObject: recordref_type
    user?: user_type
    target: string
    ttl?: number | undefined
    lines: orderLine_type[]
    payments: order_payment_type[],
    shipments: shipment_type[],
    credits: order_credit_type[],
    paymentSummary: order_payment_summary_type,
    ref: recordref_type
    stripe?: stripe_details_type
    shipping?: {
        name: string,
        address: string,
        addressComponents: address_details_type
    },
    billing?: {
        name: string,
        address: string,
        addressComponents: address_details_type
    },
    delivery? : {
        name: string,
        address: string,
        addressComponents: address_details_type
    }
    paid_status: string
    discount: number
    createdDate: string
    status?: string
    source?: string
    voidedAt?: string
    voidedBy?: string
    checkoutLinkExpiresAt?: string
}

export type order_credit_type = {
    code: string,
    stripe_refundId: string,
    destination: {
        card?: {
            reference: string
        },
        type: "card"
    },
    currency: string,
    amount: number,
    date: string
}

export type order_payment_type = {
  id: string;
  code: string;
  stripe_chargeId: string;
  currency: string;
  charge: {
    subtotal: number;
    application?: {
      components: {
        processing: number;
      };
      actual: number;
    };
    stripe?: {
      estimate: number;
    };
    shipping?: {
      components: {
        subtotal: number;
        tax: number;
        stripe: number;
        currency: string;
      };
      estimate: number;
    };
    tax: number;
    paid: number;
  };
  payout: {
    customer_paid: number;
    application_fees: {
      components: {
        customer: {
          components: {
            processing: number;
          };
          total: number;
        };
        merchant: {
          components: {
            sale: number;
            listing: number;
          };
          total: number;
        };
        tax: number;
      };
      total: number;
    };
    stripe_fees: {
      components: {
        amount: number;
      };
      total: number;
    };
    summary: {
      sale_price_inc_tax: number;
      recieves: number;
      remaining: number;
    };
  };
  card_details: {
    brand: string;
    last4: string;
  };
  method_description: string;
  date: string;
};

export type order_balance_type = {
    subtotal: currency_amount_type
    fees: currency_amount_type
    tax: currency_amount_type
    total: currency_amount_type
    discount: currency_amount_type
    refund: currency_amount_type
}

export type order_payment_summary_type = {
    currency: string,
    due: order_balance_type,
    charged: {
        subtotal: number,
        fees: number,
        tax: number,
        paid: number
    },
    refunded: number,
    payout: order_payout_type
}

export type order_payout_type = {
    subtotal: number
    tax: number
    fees: number
    recieves: number
}

  

export type returnShippingEstimate_type = {
    id: string,
    rate_id: string,
    whoPayShipping: string,
    cost: currency_amount_type,
    boxes: returnShippingBox_type[],
    status: string,
    createdAt: string
}

export type returnShippingBox_type = {
    id: string,
    code: string,
    dimensions_cm: {
        depth: number,
        width: number,
        height: number
    },
    used_weight: number,
    items: any[]
}

export type orderLine_type = {
    id: string
    forObject: recordref_type | "inherit"
    variantId?: string
    item_description: string
    image?: media_type,
    merchantId: string
    merchant: vendor_type
    soldFrom: {
        state: string
        country: string
    },
    descriptor: string
    tax_code: string,
    price: currency_amount_type 
    quantity: number
    subtotal: currency_amount_type,
    tax: currency_amount_type,
    total: currency_amount_type,
    refunded: currency_amount_type,
    price_log: {
        stripe_refundId?: string,
        id: string
        datetime: string
        status: string
        type: "CHARGE" | "PARTIAL_REFUND" | "FULL_REFUND"
        price: currency_amount_type & {
            quantity: number
        },
        tax: currency_amount_type
        paymentId: string
    }[],
    refund_request_log: {
        id: string,
        datetime: string
        refund_quantity: number
        status: string
        reason?: {
            id: string,
            code: string,
            title: string
        },
        returnShippingEstimate?: returnShippingEstimate_type
        evidencePhotos?: media_type[]
        evidenceVideos?: media_type[]
    }[],
    discount: number
    stripe: stripe_details_type
    refund_status: string
    target: string
    description: string
    paid_status_log: {
        datetime: string
        status: 'PENDING' | 'SUCCESS'
        label: string,
        triggeredBy: string
    }[]
    inventory_status?: 'IN_STOCK' | 'BACKORDERED' | 'ALLOCATED';
    backordered_at?: string;
}

export type orderLine_tourBooking_type = orderLine_type & {
    ticketId: string
    sessionRef: recordref_type
}

export type orderLine_caseInvoice_type = orderLine_type & {
    interactionId: string
}

export type orderLine_servicePurchase_type = orderLine_type & {
    serviceId: string
    questionnaireResponses?: {
        questionId: string
        question: string
        answer: string | string[]
    }[]
    selectedAddOns?: string[]
    // Tracks if this service was purchased through a merchant's featured section
    // Used for revenue share calculation in payment processing
    featuringSource?: featuring_source_type
}

export type refund_policy_type = {
    id: string;
    merchantId: string;
    refundPolicy: {
      eligibility: {
        conditions: string[]; // Selected from a predefined list
        customConditions?: string; // Optional free-text input
        exclusions: string[]; // Selected from a predefined list
        customExclusions?: string; // Optional free-text input
      };
      refundTiers: {
        daysFromPurchase: number;
        refundPercentage: number;
      }[];
      refundProcess: {
        requiredInformation: string[];
        daysFromPurchase: number;
      };
      refundMethod: {
        options: ("Original payment method" | "Store credit" | "Bank transfer")[];
        processingTime: string;
      };
      returnPolicy: {
        requiresReturn: boolean;
        returnShippingCost: string;
        conditionRequirements: string;
      };
      partialRefundsOrExchanges: {
        partialRefunds: boolean;
        exchangeAvailable: boolean;
        conditions: string[];
      };
      nonRefundableSituations: string[];
      contact: {
        email: string;
        phone?: string;
      };
      lastUpdated: string;
    };
};  

export type refund_record_type = {
    id: string // Format: "orderId:refund:uniqueId"
    docType: "REFUND"
    orderId: string
    userId: string
    vendorId: string
    amount: number
    currency: string
    reason: string
    status: "ACTIVE" | "ARCHIVED" | "DELETED" // Record lifecycle status for Cosmos archiving
    refund_status: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | "REVERSED" // Refund workflow status
    requestedAt: string
    decisionAt?: string
    decidedBy?: string
    payments: {
        provider: string
        refundRef?: string
    }
    audit: {
        at: string
        by: string
        action: string
    }[]
    attachments: {
        type: string
        url: string
    }[]
    evidencePhotos?: media_type[]
    evidenceVideos?: media_type[]
    lines?: {
        id: string
        descriptor: string
        price: currency_amount_type
        quantity: number
        refund_quantity: number
        refund_status: string | null
    }[] // Item-level refund details
    returnShippingEstimate?: returnShippingEstimate_type
    returnShippingLabels?: label_info_type[]
    stripe?: stripe_details_type
    createdDate: string
    createdBy: string
    _etag?: string
}

//#endregion