/**
 * Email Template Variable Schemas
 *
 * Defines available variables for email templates based on GraphQL types.
 * These are used by the VariablePicker component to provide smart variable insertion.
 */

export interface VariableDefinition {
  key: string;
  label: string;
  description?: string;
  example?: string;
  type?: 'string' | 'number' | 'date' | 'currency' | 'boolean';
}

export interface VariableCategory {
  category: string;
  description: string;
  variables: VariableDefinition[];
}

/**
 * Order-related variables
 * Based on order_type from GraphQL
 */
export const ORDER_VARIABLES: VariableCategory = {
  category: 'Order',
  description: 'Information about the order',
  variables: [
    { key: 'order.code', label: 'Order Number', description: 'Order confirmation number', example: '#12345', type: 'number' },
    { key: 'order.customerEmail', label: 'Customer Email', description: 'Email address of the customer', example: 'customer@example.com', type: 'string' },
    { key: 'order.createdDate', label: 'Order Date', description: 'Date the order was placed', example: 'Jan 15, 2025', type: 'date' },
    { key: 'order.paid_status', label: 'Payment Status', description: 'Current payment status', example: 'PAID', type: 'string' },
    { key: 'order.paymentSummary.currency', label: 'Currency', description: 'Order currency code', example: 'USD', type: 'string' },
    { key: 'order.paymentSummary.due.total.amount', label: 'Total Amount', description: 'Total order amount', example: '$99.99', type: 'currency' },
    { key: 'order.paymentSummary.due.subtotal.amount', label: 'Subtotal', description: 'Order subtotal before tax', example: '$85.00', type: 'currency' },
    { key: 'order.paymentSummary.due.tax.amount', label: 'Tax Amount', description: 'Total tax', example: '$7.50', type: 'currency' },
    { key: 'order.paymentSummary.due.discount.amount', label: 'Discount', description: 'Total discount applied', example: '$10.00', type: 'currency' },
  ]
};

/**
 * Customer-related variables
 * Based on user_type from GraphQL
 */
export const CUSTOMER_VARIABLES: VariableCategory = {
  category: 'Customer',
  description: 'Information about the customer',
  variables: [
    { key: 'customer.firstName', label: 'First Name', description: 'Customer first name', example: 'John', type: 'string' },
    { key: 'customer.lastName', label: 'Last Name', description: 'Customer last name', example: 'Doe', type: 'string' },
    { key: 'customer.fullName', label: 'Full Name', description: 'Customer full name', example: 'John Doe', type: 'string' },
    { key: 'customer.email', label: 'Email', description: 'Customer email address', example: 'john@example.com', type: 'string' },
  ]
};

/**
 * Shipping address variables
 * Based on address_details_type from GraphQL
 */
export const SHIPPING_VARIABLES: VariableCategory = {
  category: 'Shipping',
  description: 'Shipping address and details',
  variables: [
    { key: 'shipping.name', label: 'Recipient Name', description: 'Name for shipping', example: 'John Doe', type: 'string' },
    { key: 'shipping.address', label: 'Full Address', description: 'Complete shipping address', example: '123 Main St, City, ST 12345', type: 'string' },
    { key: 'shipping.addressComponents.line1', label: 'Address Line 1', description: 'Street address', example: '123 Main St', type: 'string' },
    { key: 'shipping.addressComponents.line2', label: 'Address Line 2', description: 'Apt, suite, etc.', example: 'Apt 4B', type: 'string' },
    { key: 'shipping.addressComponents.city', label: 'City', description: 'City name', example: 'San Francisco', type: 'string' },
    { key: 'shipping.addressComponents.state', label: 'State/Province', description: 'State or province', example: 'CA', type: 'string' },
    { key: 'shipping.addressComponents.zip', label: 'ZIP/Postal Code', description: 'Postal code', example: '94102', type: 'string' },
    { key: 'shipping.addressComponents.country', label: 'Country', description: 'Country name', example: 'United States', type: 'string' },
  ]
};

/**
 * Order line item variables
 * Based on orderLine_type from GraphQL
 */
export const LINE_ITEM_VARIABLES: VariableCategory = {
  category: 'Line Items',
  description: 'Individual items in the order (use in loops)',
  variables: [
    { key: 'item.descriptor', label: 'Product Name', description: 'Product name/descriptor', example: 'Blue Widget', type: 'string' },
    { key: 'item.quantity', label: 'Quantity', description: 'Quantity ordered', example: '2', type: 'number' },
    { key: 'item.price.amount', label: 'Unit Price', description: 'Price per item', example: '$29.99', type: 'currency' },
    { key: 'item.subtotal.amount', label: 'Line Subtotal', description: 'Subtotal for this line', example: '$59.98', type: 'currency' },
    { key: 'item.tax.amount', label: 'Line Tax', description: 'Tax for this line', example: '$5.40', type: 'currency' },
    { key: 'item.total.amount', label: 'Line Total', description: 'Total for this line', example: '$65.38', type: 'currency' },
  ]
};

/**
 * Refund-related variables
 * Based on refund_record_type from GraphQL
 */
export const REFUND_VARIABLES: VariableCategory = {
  category: 'Refund',
  description: 'Refund request information',
  variables: [
    { key: 'refund.amount', label: 'Refund Amount', description: 'Amount being refunded', example: '$49.99', type: 'currency' },
    { key: 'refund.currency', label: 'Currency', description: 'Refund currency', example: 'USD', type: 'string' },
    { key: 'refund.reason', label: 'Refund Reason', description: 'Reason for refund', example: 'Product damaged', type: 'string' },
    { key: 'refund.status', label: 'Refund Status', description: 'Current refund status', example: 'APPROVED', type: 'string' },
    { key: 'refund.requestedAt', label: 'Request Date', description: 'Date refund was requested', example: 'Jan 20, 2025', type: 'date' },
    { key: 'refund.decisionAt', label: 'Decision Date', description: 'Date decision was made', example: 'Jan 21, 2025', type: 'date' },
  ]
};

/**
 * Merchant/Vendor variables
 * Based on vendor_type from GraphQL
 */
export const MERCHANT_VARIABLES: VariableCategory = {
  category: 'Merchant',
  description: 'Store/merchant information',
  variables: [
    { key: 'merchant.name', label: 'Store Name', description: 'Business name', example: 'Acme Store', type: 'string' },
    { key: 'merchant.email', label: 'Support Email', description: 'Merchant support email', example: 'support@acmestore.com', type: 'string' },
    { key: 'merchant.phone', label: 'Phone Number', description: 'Merchant phone number', example: '(555) 123-4567', type: 'string' },
    { key: 'merchant.website', label: 'Website URL', description: 'Store website', example: 'https://acmestore.com', type: 'string' },
  ]
};

/**
 * Payment method variables
 * Based on order_payment_type from GraphQL
 */
export const PAYMENT_VARIABLES: VariableCategory = {
  category: 'Payment',
  description: 'Payment method information',
  variables: [
    { key: 'payment.method_description', label: 'Payment Method', description: 'Description of payment method', example: 'Visa ending in 1234', type: 'string' },
    { key: 'payment.card_details.brand', label: 'Card Brand', description: 'Credit card brand', example: 'Visa', type: 'string' },
    { key: 'payment.card_details.last4', label: 'Card Last 4', description: 'Last 4 digits of card', example: '1234', type: 'string' },
    { key: 'payment.date', label: 'Payment Date', description: 'Date payment was made', example: 'Jan 15, 2025', type: 'date' },
  ]
};

/**
 * Refund line item variables
 * Based on refund line items from GraphQL
 */
export const REFUND_LINE_ITEM_VARIABLES: VariableCategory = {
  category: 'Refund Line Items',
  description: 'Individual items being refunded (use in loops)',
  variables: [
    { key: 'item.descriptor', label: 'Product Name', description: 'Product name/descriptor', example: 'Blue Widget', type: 'string' },
    { key: 'item.refund_quantity', label: 'Refund Quantity', description: 'Quantity being refunded', example: '1', type: 'number' },
    { key: 'item.price.amount', label: 'Unit Price', description: 'Price per item', example: '$29.99', type: 'currency' },
    { key: 'item.refund_status', label: 'Refund Status', description: 'Status of this item', example: 'APPROVED', type: 'string' },
  ]
};

/**
 * Shipment box variables
 * Based on shipment boxes from logistics system
 */
export const SHIPMENT_BOX_VARIABLES: VariableCategory = {
  category: 'Shipment Boxes',
  description: 'Shipping boxes in a shipment (use in loops)',
  variables: [
    { key: 'box.code', label: 'Box Code', description: 'Tracking/box identifier', example: 'BOX-001', type: 'string' },
    { key: 'box.used_weight', label: 'Weight', description: 'Box weight', example: '5.2 lbs', type: 'number' },
    { key: 'box.dimensions_cm.width', label: 'Width (cm)', description: 'Box width in centimeters', example: '30', type: 'number' },
    { key: 'box.dimensions_cm.height', label: 'Height (cm)', description: 'Box height in centimeters', example: '20', type: 'number' },
    { key: 'box.dimensions_cm.depth', label: 'Depth (cm)', description: 'Box depth in centimeters', example: '15', type: 'number' },
  ]
};

/**
 * Booking-related variables
 * For scheduled service bookings (practitioner availability)
 */
export const BOOKING_VARIABLES: VariableCategory = {
  category: 'Booking',
  description: 'Scheduled session booking information',
  variables: [
    { key: 'booking.serviceName', label: 'Service Name', description: 'Name of the booked service', example: 'Tarot Reading', type: 'string' },
    { key: 'booking.bookingDate', label: 'Booking Date', description: 'Date of the session', example: 'Monday, Jan 20, 2025', type: 'date' },
    { key: 'booking.bookingTime', label: 'Booking Time', description: 'Time of the session', example: '2:00 PM - 3:00 PM', type: 'string' },
    { key: 'booking.deliveryMethod', label: 'Session Type', description: 'How the session will be delivered', example: 'Online Session', type: 'string' },
    { key: 'booking.amount', label: 'Amount', description: 'Payment amount', example: '$75.00', type: 'currency' },
    { key: 'booking.confirmationDeadline', label: 'Confirmation Deadline', description: 'Deadline for practitioner to confirm', example: 'Jan 18, 2025 at 5:00 PM', type: 'date' },
    { key: 'booking.meetingLink', label: 'Meeting Link', description: 'Video call link (for online sessions)', example: 'https://zoom.us/j/123456', type: 'string' },
    { key: 'booking.meetingPasscode', label: 'Meeting Passcode', description: 'Passcode for video call', example: '123456', type: 'string' },
    { key: 'booking.practitionerAddress', label: 'Practitioner Address', description: 'Location for in-person sessions', example: '123 Main St, Brooklyn, NY', type: 'string' },
    { key: 'booking.customerAddress', label: 'Customer Address', description: 'Customer location for mobile sessions', example: '456 Oak Ave, Queens, NY', type: 'string' },
    { key: 'booking.rejectionReason', label: 'Rejection Reason', description: 'Reason if booking was declined', example: 'Scheduling conflict', type: 'string' },
  ]
};

/**
 * Practitioner variables
 * Information about the practitioner
 */
export const PRACTITIONER_VARIABLES: VariableCategory = {
  category: 'Practitioner',
  description: 'Information about the practitioner',
  variables: [
    { key: 'practitioner.name', label: 'Practitioner Name', description: 'Practitioner display name', example: 'Sarah Johnson', type: 'string' },
    { key: 'practitioner.email', label: 'Practitioner Email', description: 'Practitioner email address', example: 'sarah@example.com', type: 'string' },
    { key: 'practitioner.profileUrl', label: 'Profile URL', description: 'Link to practitioner profile', example: 'https://spiriverse.com/p/sarah-johnson', type: 'string' },
    { key: 'practitioner.dashboardUrl', label: 'Dashboard URL', description: 'Link to practitioner dashboard', example: 'https://spiriverse.com/p/sarah-johnson/manage/bookings', type: 'string' },
  ]
};

/**
 * Get all variable categories
 */
export const ALL_VARIABLE_CATEGORIES: VariableCategory[] = [
  ORDER_VARIABLES,
  CUSTOMER_VARIABLES,
  SHIPPING_VARIABLES,
  LINE_ITEM_VARIABLES,
  REFUND_VARIABLES,
  REFUND_LINE_ITEM_VARIABLES,
  PAYMENT_VARIABLES,
  MERCHANT_VARIABLES,
  SHIPMENT_BOX_VARIABLES,
  BOOKING_VARIABLES,
  PRACTITIONER_VARIABLES,
];

/**
 * Data source definitions for table blocks
 * Maps loopable data collections to their available fields
 */
export interface DataSourceDefinition {
  value: string;
  label: string;
  description: string;
  fields: VariableDefinition[];
}

export const TABLE_DATA_SOURCES: DataSourceDefinition[] = [
  {
    value: 'order.lines',
    label: 'Order Line Items',
    description: 'Product items in an order',
    fields: LINE_ITEM_VARIABLES.variables
  },
  {
    value: 'refund.lines',
    label: 'Refund Line Items',
    description: 'Items being refunded',
    fields: REFUND_LINE_ITEM_VARIABLES.variables
  },
  {
    value: 'shipment.boxes',
    label: 'Shipment Boxes',
    description: 'Boxes in a shipment',
    fields: SHIPMENT_BOX_VARIABLES.variables
  },
];

/**
 * Get fields for a specific data source
 */
export function getFieldsForDataSource(dataSource: string): VariableDefinition[] {
  const source = TABLE_DATA_SOURCES.find(ds => ds.value === dataSource);
  return source?.fields || [];
}

/**
 * Get all variables as a flat list
 */
export function getAllVariables(): VariableDefinition[] {
  return ALL_VARIABLE_CATEGORIES.flatMap(category => category.variables);
}

/**
 * Search variables by keyword
 */
export function searchVariables(query: string): VariableDefinition[] {
  const lowerQuery = query.toLowerCase();
  return getAllVariables().filter(variable =>
    variable.label.toLowerCase().includes(lowerQuery) ||
    variable.key.toLowerCase().includes(lowerQuery) ||
    variable.description?.toLowerCase().includes(lowerQuery)
  );
}
