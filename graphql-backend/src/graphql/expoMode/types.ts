import { currency_amount_type } from "../0_shared/types";

export const EXPO_MODE_CONTAINER = "Main-ExpoMode";
export const DOC_TYPE_EXPO = "expo";
export const DOC_TYPE_EXPO_ITEM = "expo-item";
export const DOC_TYPE_EXPO_SALE = "expo-sale";

export type ExpoStatus = "SETUP" | "LIVE" | "PAUSED" | "ENDED";
export type ExpoItemSource = "SERVICE" | "AD_HOC";
export type ExpoSaleChannel = "QR" | "WALK_UP";
export type ExpoSalePaymentMethod = "STRIPE" | "CASH" | "OTHER";
export type ExpoSaleStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type expo_type = {
    id: string;
    partitionKey: string;          // = vendorId
    docType: "expo";
    vendorId: string;
    code: string;                  // 8-char shareable code (URL: /expo/{code})
    expoName: string;
    expoStatus: ExpoStatus;
    // Stats (denormalized)
    totalSales: number;
    totalRevenue: number;          // cents
    totalItemsSold: number;
    totalCustomers: number;
    // Timestamps
    createdAt: string;
    goLiveAt?: string;
    pausedAt?: string;
    endedAt?: string;
    modifiedDate?: string;
};

export type expoItem_type = {
    id: string;
    partitionKey: string;          // = expoId
    docType: "expo-item";
    expoId: string;
    vendorId: string;              // denormalized
    // Source
    itemSource: ExpoItemSource;
    serviceId?: string;            // if SERVICE
    serviceName?: string;          // denormalized
    // Details
    itemName: string;
    itemDescription?: string;
    itemImage?: string;
    price: currency_amount_type;
    // Inventory
    trackInventory: boolean;       // false for services (unlimited/capped)
    quantityBrought?: number;      // how many brought to expo
    quantitySold: number;
    // Display
    sortOrder: number;
    isActive: boolean;             // toggleable mid-expo
    createdAt: string;
    modifiedDate?: string;
};

export type expoSaleItem_type = {
    itemId: string;
    itemName: string;
    quantity: number;
    unitPrice: currency_amount_type;
    lineTotal: currency_amount_type;
};

export type expoSale_type = {
    id: string;
    partitionKey: string;          // = expoId
    docType: "expo-sale";
    expoId: string;
    vendorId: string;              // denormalized
    // Customer (optional for walk-ups)
    customerName?: string;
    customerEmail?: string;
    // Sale
    saleChannel: ExpoSaleChannel;
    paymentMethod: ExpoSalePaymentMethod;
    items: expoSaleItem_type[];
    subtotal: currency_amount_type;
    saleStatus: ExpoSaleStatus;
    saleNumber: number;            // sequential within expo
    // Stripe (QR sales only)
    stripePaymentIntentId?: string;
    stripePaymentIntentSecret?: string;
    // Timestamps
    createdAt: string;
    paidAt?: string;
    modifiedDate?: string;
};
