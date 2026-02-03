# SpiriVerse Email Templates - Master List

**Generated**: 2025-10-10
**Total Templates**: 124 (54 exist, 70 opportunities)
**Authentication Method**: Passwordless (Email verification codes/OTP only)

---

## Quick Stats

| Category | Exists | Missing | Total |
|----------|--------|---------|-------|
| Authentication & Account | 2 | 1 | 3 |
| Merchant Operations | 4 | 12 | 16 |
| Product Orders & Payments | 3 | 19 | 22 |
| Shipping & Logistics | 0 | 8 | 8 |
| Tours & Events | 15 | 8 | 23 |
| Case Management | 20 | 6 | 26 |
| Support & Notifications | 0 | 9 | 9 |
| Payment & Billing | 0 | 6 | 6 |
| Marketing & Engagement | 0 | 8 | 8 |
| **TOTAL** | **54** | **69** | **123** |

---

## Complete Template List

### **Authentication & Account (3 templates)**

#### 1. ✅ `verification-code` (EXISTS)
**Description**: OTP/verification code for passwordless login and account verification (email is verified by successfully receiving and entering code)
**Category**: Transactional
**Trigger**: User requests login or account verification
**Variables**: `{{verificationCode}}`, `{{userName}}`, `{{expirationTime}}`
**Subject**: Your Verification Code: {{verificationCode}}

#### 2. ❌ `account-locked`
**Description**: Security alert after multiple failed verification attempts
**Category**: System
**Trigger**: 5+ failed login attempts in 15 minutes
**Variables**: `{{userName}}`, `{{lockoutTime}}`, `{{supportEmail}}`
**Subject**: Account Security Alert

#### 3. ❌ `account-deleted`
**Description**: Confirmation of account deletion with data retention policy
**Category**: Transactional
**Trigger**: User confirms account deletion
**Variables**: `{{userName}}`, `{{deletionDate}}`, `{{dataRetentionDays}}`
**Subject**: Account Deletion Confirmed

#### 4. ✅ `merchant-welcome-message` (EXISTS)
**Description**: Welcome email after merchant completes signup
**Category**: Marketing
**Trigger**: Merchant signup completed
**Variables**: `{{merchantName}}`, `{{userName}}`, `{{dashboardUrl}}`, `{{supportEmail}}`
**Subject**: Welcome to SpiriVerse, {{merchantName}}!

---

### **Merchant Operations (16 templates)**

#### 5. ✅ `merchant-request` (EXISTS)
**Description**: Customer inquiry sent to merchant via platform
**Category**: Support
**Variables**: `{{merchantName}}`, `{{customerName}}`, `{{customerEmail}}`, `{{messageBody}}`, `{{respondUrl}}`
**Subject**: New Customer Inquiry from {{customerName}}

#### 8. ✅ `merchant-signup-invoice` (EXISTS)
**Description**: Initial subscription invoice for merchant account
**Category**: Transactional
**Variables**: `{{merchantName}}`, `{{invoiceNumber}}`, `{{invoiceAmount}}`, `{{subscriptionPlan}}`, `{{invoiceUrl}}`
**Subject**: Invoice #{{invoiceNumber}} - SpiriVerse Subscription


#### 12. ❌ `merchant-payout-processed`
**Description**: Stripe payout completed with transaction details
**Category**: Transactional
**Trigger**: Stripe payout succeeds
**Variables**: `{{merchantName}}`, `{{payoutAmount}}`, `{{payoutDate}}`, `{{accountLastFour}}`, `{{periodCovered}}`
**Subject**: Payout Processed - ${{payoutAmount}}

#### 13. ❌ `merchant-payout-failed`
**Description**: Payout failure alert with resolution steps
**Category**: System
**Trigger**: Stripe payout fails
**Variables**: `{{merchantName}}`, `{{failureReason}}`, `{{updatePaymentUrl}}`, `{{supportEmail}}`
**Subject**: Action Required - Payout Failed

#### 14. ❌ `merchant-subscription-renewal`
**Description**: Upcoming subscription renewal reminder (7 days before)
**Category**: Transactional
**Trigger**: 7 days before renewal date
**Variables**: `{{merchantName}}`, `{{renewalDate}}`, `{{renewalAmount}}`, `{{subscriptionPlan}}`, `{{updatePaymentUrl}}`
**Subject**: Subscription Renewal Reminder

#### 15. ❌ `merchant-subscription-expired`
**Description**: Subscription lapsed notification with reactivation link
**Category**: System
**Trigger**: Subscription payment fails and grace period ends
**Variables**: `{{merchantName}}`, `{{expirationDate}}`, `{{reactivateUrl}}`, `{{supportEmail}}`
**Subject**: Subscription Expired - Reactivate Your Account

#### 16. ❌ `merchant-subscription-payment-failed`
**Description**: Payment method declined with update instructions
**Category**: System
**Trigger**: Subscription payment fails
**Variables**: `{{merchantName}}`, `{{failureReason}}`, `{{retryDate}}`, `{{updatePaymentUrl}}`
**Subject**: Payment Failed - Update Payment Method

#### 17. ❌ `merchant-low-stock-alert`
**Description**: Inventory below threshold warning with SKU details
**Category**: System
**Trigger**: Variant qty_on_hand <= low_stock_threshold
**Variables**: `{{merchantName}}`, `{{productName}}`, `{{variantName}}`, `{{currentStock}}`, `{{threshold}}`, `{{manageInventoryUrl}}`
**Subject**: Low Stock Alert - {{productName}}

#### 18. ❌ `merchant-new-order-notification`
**Description**: New order received with order summary and fulfillment deadline
**Category**: Transactional
**Trigger**: Customer completes order payment
**Variables**: `{{merchantName}}`, `{{orderNumber}}`, `{{orderDate}}`, `{{orderTotal}}`, `{{orderItems}}`, `{{fulfillmentDeadline}}`, `{{orderDetailsUrl}}`
**Subject**: New Order #{{orderNumber}}

#### 19. ❌ `merchant-refund-requested`
**Description**: Customer requested refund with 7-day inspection window reminder
**Category**: Support
**Trigger**: Customer initiates refund request
**Variables**: `{{merchantName}}`, `{{orderNumber}}`, `{{refundAmount}}`, `{{customerName}}`, `{{refundReason}}`, `{{inspectionDeadline}}`, `{{processRefundUrl}}`
**Subject**: Refund Request - Order #{{orderNumber}}

#### 20. ❌ `merchant-stripe-verification-required`
**Description**: Stripe Connect onboarding incomplete reminder
**Category**: System
**Trigger**: Merchant hasn't completed Stripe onboarding after 7 days
**Variables**: `{{merchantName}}`, `{{daysRemaining}}`, `{{verificationUrl}}`, `{{requiredDocuments}}`
**Subject**: Complete Your Payment Setup

#### 21. ❌ `merchant-first-sale-congratulations`
**Description**: Milestone celebration for first product/ticket sold
**Category**: Marketing
**Trigger**: First sale completed
**Variables**: `{{merchantName}}`, `{{productName}}`, `{{saleAmount}}`, `{{customerName}}`
**Subject**: Congratulations on Your First Sale!

---

### **Product Orders & Payments (22 templates)**

#### 22. ✅ `product-purchase-success-customer` (EXISTS)
**Description**: Order payment confirmed with receipt and tracking info
**Category**: Transactional
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{orderDate}}`, `{{orderTotal}}`, `{{orderItems}}`, `{{trackingNumber}}`, `{{orderDetailsUrl}}`
**Subject**: Order Confirmation #{{orderNumber}}

#### 23. ✅ `order-fee-creation` (EXISTS)
**Description**: Order processing fee invoice
**Category**: Transactional
**Variables**: `{{orderNumber}}`, `{{feeAmount}}`, `{{feeDescription}}`, `{{customerName}}`
**Subject**: Order Fee for #{{orderNumber}}

#### 24. ✅ `product-refund-request-requires-merchant-payment` (EXISTS)
**Description**: Refund requires merchant action notification
**Category**: Transactional
**Variables**: `{{orderNumber}}`, `{{refundAmount}}`, `{{merchantName}}`, `{{refundReason}}`, `{{actionUrl}}`, `{{deadline}}`
**Subject**: Refund Request for Order #{{orderNumber}}

#### 25. ❌ `order-confirmation-customer`
**Description**: Order placed successfully with estimated delivery
**Category**: Transactional
**Trigger**: Order created (before payment)
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{orderTotal}}`, `{{orderItems}}`, `{{estimatedDelivery}}`, `{{paymentUrl}}`
**Subject**: Order Received #{{orderNumber}}

#### 26. ❌ `order-cancelled-customer`
**Description**: Order cancellation confirmation with refund timeline
**Category**: Transactional
**Trigger**: Customer or merchant cancels order
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{cancellationDate}}`, `{{refundAmount}}`, `{{refundTimeline}}`
**Subject**: Order Cancelled #{{orderNumber}}

#### 27. ❌ `order-shipped-customer`
**Description**: Shipment notification with tracking number
**Category**: Transactional
**Trigger**: Merchant creates shipping label
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{trackingNumber}}`, `{{trackingUrl}}`, `{{carrier}}`, `{{estimatedDelivery}}`
**Subject**: Your Order Has Shipped #{{orderNumber}}

#### 28. ❌ `order-delivered-customer`
**Description**: Delivery confirmation with review request
**Category**: Transactional
**Trigger**: Carrier confirms delivery
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{deliveryDate}}`, `{{deliveryAddress}}`, `{{reviewUrl}}`
**Subject**: Order Delivered #{{orderNumber}}

#### 29. ❌ `order-ready-for-pickup-customer`
**Description**: Local pickup ready notification
**Category**: Transactional
**Trigger**: Merchant marks order ready for pickup
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{pickupLocation}}`, `{{pickupHours}}`, `{{pickupDeadline}}`
**Subject**: Ready for Pickup #{{orderNumber}}

#### 30. ❌ `order-return-approved-customer`
**Description**: Return authorization granted with shipping label
**Category**: Transactional
**Trigger**: Merchant approves return request
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{returnLabelUrl}}`, `{{returnInstructions}}`, `{{returnDeadline}}`
**Subject**: Return Approved #{{orderNumber}}

#### 31. ❌ `order-return-received-merchant`
**Description**: Return package received by merchant
**Category**: Transactional
**Trigger**: ShipEngine delivery confirmation on return label
**Variables**: `{{merchantName}}`, `{{orderNumber}}`, `{{customerName}}`, `{{receivedDate}}`, `{{inspectionDeadline}}`
**Subject**: Return Received - Order #{{orderNumber}}

#### 32. ❌ `order-exchange-processed-customer`
**Description**: Exchange order created with new tracking
**Category**: Transactional
**Trigger**: Merchant processes exchange
**Variables**: `{{originalOrderNumber}}`, `{{newOrderNumber}}`, `{{customerName}}`, `{{exchangeItems}}`, `{{trackingNumber}}`
**Subject**: Exchange Processed - New Order #{{newOrderNumber}}

#### 33. ❌ `refund-approved-customer`
**Description**: Refund approved with processing timeline
**Category**: Transactional
**Trigger**: Merchant approves refund
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{refundAmount}}`, `{{processingDays}}`, `{{refundMethod}}`
**Subject**: Refund Approved #{{orderNumber}}

#### 34. ❌ `refund-processed-customer`
**Description**: Refund payment sent to original payment method
**Category**: Transactional
**Trigger**: Stripe refund succeeds
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{refundAmount}}`, `{{refundDate}}`, `{{paymentMethodLastFour}}`
**Subject**: Refund Completed #{{orderNumber}}

#### 35. ❌ `refund-rejected-customer`
**Description**: Refund request denied with reason
**Category**: Transactional
**Trigger**: Merchant rejects refund
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{rejectionReason}}`, `{{appealUrl}}`, `{{supportEmail}}`
**Subject**: Refund Request Update #{{orderNumber}}

#### 36. ❌ `partial-refund-processed-customer`
**Description**: Partial refund issued with itemized breakdown
**Category**: Transactional
**Trigger**: Merchant processes partial refund
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{refundAmount}}`, `{{refundedItems}}`, `{{refundReason}}`
**Subject**: Partial Refund Processed #{{orderNumber}}

#### 37. ❌ `backorder-notification-customer`
**Description**: Item temporarily out of stock, order will ship when restocked
**Category**: Transactional
**Trigger**: Order placed for backordered item
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{backorderedItems}}`, `{{estimatedRestockDate}}`
**Subject**: Backorder Notification #{{orderNumber}}

#### 38. ❌ `backorder-allocated-customer`
**Description**: Backordered item now in stock and ready to ship
**Category**: Transactional
**Trigger**: Inventory restocked and auto-allocated to order
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{allocatedItems}}`, `{{estimatedShipDate}}`
**Subject**: Your Backordered Item is Ready #{{orderNumber}}

#### 39. 📝 `refund-auto-processed-customer` (TODO in CLAUDE.md)
**Description**: System auto-processed refund after 7-day merchant inspection window
**Category**: System
**Trigger**: Return delivered + 7 days, no merchant action
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{refundAmount}}`, `{{autoProcessDate}}`, `{{refundTimeline}}`
**Subject**: Refund Processed #{{orderNumber}}

#### 40. 📝 `refund-auto-processed-merchant` (TODO in CLAUDE.md)
**Description**: Merchant missed refund deadline, system processed automatically
**Category**: System
**Trigger**: Same as above
**Variables**: `{{merchantName}}`, `{{orderNumber}}`, `{{refundAmount}}`, `{{missedDeadline}}`, `{{nextSteps}}`
**Subject**: Auto-Refund Processed - Order #{{orderNumber}}

#### 41. 📝 `refund-escalation-support` (TODO in CLAUDE.md)
**Description**: Refund not processed after 30 days, escalated to support
**Category**: System
**Trigger**: 30 days after label payment, no refund
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{merchantName}}`, `{{labelCost}}`, `{{escalationDate}}`
**Subject**: [ESCALATION] Refund Not Processed - Order #{{orderNumber}}

#### 42. 📝 `label-cost-refunded-customer` (TODO in CLAUDE.md)
**Description**: Return shipping label cost refunded to customer
**Category**: System
**Trigger**: 30-day safety net triggered
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{labelCost}}`, `{{refundDate}}`, `{{supportEmail}}`
**Subject**: Label Cost Refunded #{{orderNumber}}

#### 43. ❌ `payment-receipt-customer`
**Description**: Itemized receipt for completed payment
**Category**: Transactional
**Trigger**: Payment succeeds
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{paymentDate}}`, `{{paymentAmount}}`, `{{paymentMethod}}`, `{{receiptUrl}}`
**Subject**: Payment Receipt #{{orderNumber}}

---

### **Shipping & Logistics (8 templates)**

#### 44. ❌ `shipping-label-created-merchant`
**Description**: Shipping label purchased confirmation
**Category**: Transactional
**Trigger**: Merchant finalizes shipment
**Variables**: `{{merchantName}}`, `{{orderNumber}}`, `{{labelCost}}`, `{{trackingNumber}}`, `{{carrier}}`
**Subject**: Shipping Label Created #{{orderNumber}}

#### 45. ❌ `shipping-tracking-update-customer`
**Description**: Package tracking status update from carrier
**Category**: Transactional
**Trigger**: ShipEngine webhook (in transit, out for delivery, etc.)
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{trackingStatus}}`, `{{trackingLocation}}`, `{{trackingUrl}}`
**Subject**: Tracking Update #{{orderNumber}}

#### 46. ❌ `shipping-delayed-customer`
**Description**: Shipment delay notification with new ETA
**Category**: Transactional
**Trigger**: Carrier reports delay
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{delayReason}}`, `{{newETA}}`, `{{trackingUrl}}`
**Subject**: Delivery Delay #{{orderNumber}}

#### 47. ❌ `shipping-exception-customer`
**Description**: Delivery exception alert (weather, address issue, etc.)
**Category**: Transactional
**Trigger**: Carrier reports exception
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{exceptionType}}`, `{{resolution}}`, `{{contactUrl}}`
**Subject**: Delivery Exception #{{orderNumber}}

#### 48. ❌ `shipping-out-for-delivery-customer`
**Description**: Package out for delivery today notification
**Category**: Transactional
**Trigger**: Carrier status "out for delivery"
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{deliveryWindow}}`, `{{deliveryAddress}}`, `{{trackingUrl}}`
**Subject**: Out for Delivery Today #{{orderNumber}}

#### 49. ❌ `shipping-failed-delivery-attempt-customer`
**Description**: Delivery attempt failed, next steps
**Category**: Transactional
**Trigger**: Carrier reports failed delivery
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{failureReason}}`, `{{nextAttemptDate}}`, `{{pickupLocation}}`
**Subject**: Delivery Attempt Failed #{{orderNumber}}

#### 50. ❌ `shipping-return-to-sender-customer`
**Description**: Package unable to deliver, returning to merchant
**Category**: Transactional
**Trigger**: Carrier returns package
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{returnReason}}`, `{{refundTimeline}}`, `{{contactUrl}}`
**Subject**: Package Returning #{{orderNumber}}

#### 51. ❌ `shipping-return-label-generated-customer`
**Description**: Return shipping label ready to print
**Category**: Transactional
**Trigger**: Customer initiates return
**Variables**: `{{orderNumber}}`, `{{customerName}}`, `{{returnLabelUrl}}`, `{{returnInstructions}}`, `{{returnDeadline}}`
**Subject**: Return Label Ready #{{orderNumber}}

---

### **Tours & Events (23 templates)**

#### 52-68. ✅ Tour Templates (15 EXIST)
All existing tour templates are documented in the migration guide with full variable lists.

#### 69. ❌ `tour-reminder-customer`
**Description**: Event happening soon reminder (24 hours and 1 week before)
**Category**: Transactional
**Trigger**: Scheduled job 1 week and 24 hours before event
**Variables**: `{{tourName}}`, `{{customerName}}`, `{{eventDate}}`, `{{eventTime}}`, `{{eventLocation}}`, `{{ticketUrl}}`
**Subject**: Reminder: {{tourName}} is {{timeUntil}}

#### 70. ❌ `tour-cancelled-customer`
**Description**: Tour/event cancelled with full refund details
**Category**: Transactional
**Trigger**: Merchant cancels event
**Variables**: `{{tourName}}`, `{{customerName}}`, `{{cancellationReason}}`, `{{refundAmount}}`, `{{refundTimeline}}`
**Subject**: Event Cancelled: {{tourName}}

#### 71. ❌ `tour-updated-customer`
**Description**: Tour details changed (time, location, etc.)
**Category**: Transactional
**Trigger**: Merchant updates event details
**Variables**: `{{tourName}}`, `{{customerName}}`, `{{changedDetails}}`, `{{newDateTime}}`, `{{cancelUrl}}`
**Subject**: Event Update: {{tourName}}

#### 72. ❌ `tour-check-in-instructions-customer`
**Description**: Day-of check-in details with QR code
**Category**: Transactional
**Trigger**: Day of event (morning)
**Variables**: `{{tourName}}`, `{{customerName}}`, `{{checkInTime}}`, `{{checkInLocation}}`, `{{qrCodeUrl}}`, `{{contactPhone}}`
**Subject**: Check-In Info: {{tourName}} Today

#### 73. ❌ `tour-post-event-feedback-customer`
**Description**: Request review and feedback after event
**Category**: Marketing
**Trigger**: 1 day after event ends
**Variables**: `{{tourName}}`, `{{customerName}}`, `{{eventDate}}`, `{{reviewUrl}}`, `{{incentive}}`
**Subject**: How Was {{tourName}}?

#### 74. ❌ `tour-waitlist-available-customer`
**Description**: Spot opened up on waitlisted tour
**Category**: Transactional
**Trigger**: Booking cancelled, waitlist customer gets priority
**Variables**: `{{tourName}}`, `{{customerName}}`, `{{availableSpots}}`, `{{bookingDeadline}}`, `{{bookUrl}}`
**Subject**: Spot Available: {{tourName}}

#### 75. ❌ `tour-sold-out-merchant`
**Description**: Tour reached capacity
**Category**: Marketing
**Trigger**: Last ticket sold
**Variables**: `{{merchantName}}`, `{{tourName}}`, `{{soldOutDate}}`, `{{totalAttendees}}`, `{{waitlistCount}}`
**Subject**: Sold Out! {{tourName}}

#### 76. ❌ `event-ticket-transfer-sender`
**Description**: Ticket transfer initiated confirmation
**Category**: Transactional
**Trigger**: Customer transfers ticket to another person
**Variables**: `{{senderName}}`, `{{recipientEmail}}`, `{{tourName}}`, `{{ticketQuantity}}`, `{{transferUrl}}`
**Subject**: Ticket Transfer Sent for {{tourName}}

#### 77. ❌ `event-ticket-transfer-recipient`
**Description**: You've received tickets with acceptance link
**Category**: Transactional
**Trigger**: Ticket transferred to recipient
**Variables**: `{{recipientName}}`, `{{senderName}}`, `{{tourName}}`, `{{ticketQuantity}}`, `{{acceptUrl}}`
**Subject**: You've Received Tickets for {{tourName}}

---

### **Case Management (26 templates)**

#### 78-97. ✅ Case Templates (20 EXIST)
All existing case management templates are documented in the migration guide.

#### 98. ❌ `case-assigned-investigator-customer`
**Description**: Investigator has been assigned to your case
**Category**: Transactional
**Trigger**: Customer accepts application or platform assigns
**Variables**: `{{trackingCode}}`, `{{customerName}}`, `{{investigatorName}}`, `{{investigatorBio}}`, `{{nextSteps}}`
**Subject**: Investigator Assigned - Case {{trackingCode}}

#### 99. ❌ `case-status-update-customer`
**Description**: Case status changed notification
**Category**: Transactional
**Trigger**: Case status changes (e.g., In Progress → Under Review)
**Variables**: `{{trackingCode}}`, `{{customerName}}`, `{{oldStatus}}`, `{{newStatus}}`, `{{statusDescription}}`, `{{caseUrl}}`
**Subject**: Status Update - Case {{trackingCode}}

#### 100. ❌ `case-evidence-uploaded-customer`
**Description**: New evidence added to your case
**Category**: Transactional
**Trigger**: Investigator uploads evidence
**Variables**: `{{trackingCode}}`, `{{customerName}}`, `{{investigatorName}}`, `{{evidenceType}}`, `{{evidenceUrl}}`
**Subject**: New Evidence - Case {{trackingCode}}

#### 101. ❌ `case-deadline-reminder-merchant`
**Description**: Case deadline approaching (24 hours before)
**Category**: System
**Trigger**: Scheduled job 24 hours before deadline
**Variables**: `{{merchantName}}`, `{{trackingCode}}`, `{{deadline}}`, `{{requiredAction}}`, `{{caseUrl}}`
**Subject**: Deadline Reminder - Case {{trackingCode}}

#### 102. ❌ `case-closed-customer`
**Description**: Case resolved with outcome summary
**Category**: Transactional
**Trigger**: Case marked as closed
**Variables**: `{{trackingCode}}`, `{{customerName}}`, `{{closureDate}}`, `{{outcome}}`, `{{feedbackUrl}}`
**Subject**: Case Closed - {{trackingCode}}

#### 103. ❌ `case-escalated-support`
**Description**: Case escalated to platform support team
**Category**: System
**Trigger**: Customer or merchant escalates case
**Variables**: `{{trackingCode}}`, `{{escalationReason}}`, `{{escalatedBy}}`, `{{escalationDate}}`, `{{assignedAgent}}`
**Subject**: [ESCALATION] Case {{trackingCode}}

---

### **Support & Notifications (9 templates)**

#### 104. ❌ `support-ticket-created-customer`
**Description**: Support request received with ticket number
**Category**: Transactional
**Trigger**: Customer submits support form
**Variables**: `{{ticketNumber}}`, `{{customerName}}`, `{{subject}}`, `{{expectedResponseTime}}`, `{{ticketUrl}}`
**Subject**: Support Ticket #{{ticketNumber}} Created

#### 105. ❌ `support-ticket-replied-customer`
**Description**: Support team responded to your ticket
**Category**: Transactional
**Trigger**: Support agent replies to ticket
**Variables**: `{{ticketNumber}}`, `{{customerName}}`, `{{agentName}}`, `{{replyPreview}}`, `{{ticketUrl}}`
**Subject**: Reply on Ticket #{{ticketNumber}}

#### 106. ❌ `support-ticket-resolved-customer`
**Description**: Support ticket closed, satisfaction survey
**Category**: Transactional
**Trigger**: Agent marks ticket resolved
**Variables**: `{{ticketNumber}}`, `{{customerName}}`, `{{resolution}}`, `{{surveyUrl}}`, `{{reopenUrl}}`
**Subject**: Ticket #{{ticketNumber}} Resolved

#### 107. ❌ `wishlist-item-on-sale-customer`
**Description**: Wishlist item now on sale or back in stock
**Category**: Marketing
**Trigger**: Product price reduced or inventory restocked
**Variables**: `{{customerName}}`, `{{productName}}`, `{{discount}}`, `{{newPrice}}`, `{{productUrl}}`
**Subject**: Price Drop: {{productName}}

#### 108. ❌ `abandoned-cart-customer`
**Description**: Items still in cart reminder (24 hours after)
**Category**: Marketing
**Trigger**: Cart inactive for 24 hours
**Variables**: `{{customerName}}`, `{{cartItems}}`, `{{cartTotal}}`, `{{cartUrl}}`, `{{expirationDate}}`
**Subject**: You Left Items in Your Cart

#### 109. ❌ `new-message-customer`
**Description**: New platform message or chat notification
**Category**: Transactional
**Trigger**: User receives message via platform chat
**Variables**: `{{recipientName}}`, `{{senderName}}`, `{{messagePreview}}`, `{{messageUrl}}`
**Subject**: New Message from {{senderName}}

#### 110. ❌ `review-request-customer`
**Description**: Request product or service review after purchase
**Category**: Marketing
**Trigger**: 7 days after delivery confirmed
**Variables**: `{{customerName}}`, `{{productName}}`, `{{orderDate}}`, `{{reviewUrl}}`, `{{incentive}}`
**Subject**: How Did We Do?

#### 111. ❌ `account-security-alert`
**Description**: Unusual login activity detected
**Category**: System
**Trigger**: Login from new device/location
**Variables**: `{{userName}}`, `{{loginTime}}`, `{{loginLocation}}`, `{{deviceType}}`, `{{secureAccountUrl}}`
**Subject**: New Login Detected

#### 112. ❌ `data-export-ready`
**Description**: Personal data export file ready to download
**Category**: Transactional
**Trigger**: Data export request completed
**Variables**: `{{userName}}`, `{{exportDate}}`, `{{fileSize}}`, `{{downloadUrl}}`, `{{expirationDate}}`
**Subject**: Your Data Export is Ready

---

### **Payment & Billing (6 templates)**

#### 113. ❌ `payment-method-expiring-customer`
**Description**: Credit card expiring soon, update required
**Category**: System
**Trigger**: 30 days before card expiration
**Variables**: `{{customerName}}`, `{{cardLastFour}}`, `{{expirationDate}}`, `{{updatePaymentUrl}}`
**Subject**: Payment Method Expiring Soon

#### 114. ❌ `payment-method-failed-customer`
**Description**: Payment declined, update payment method
**Category**: System
**Trigger**: Payment attempt fails
**Variables**: `{{customerName}}`, `{{failureReason}}`, `{{amountDue}}`, `{{retryDate}}`, `{{updatePaymentUrl}}`
**Subject**: Payment Failed - Action Required

#### 115. ❌ `payment-method-updated-customer`
**Description**: Payment method successfully updated
**Category**: Transactional
**Trigger**: Customer updates payment method
**Variables**: `{{customerName}}`, `{{newCardLastFour}}`, `{{updateDate}}`
**Subject**: Payment Method Updated

#### 116. ❌ `invoice-generated-customer`
**Description**: Invoice generated with PDF attachment
**Category**: Transactional
**Trigger**: Subscription invoice created
**Variables**: `{{invoiceNumber}}`, `{{customerName}}`, `{{invoiceDate}}`, `{{invoiceAmount}}`, `{{invoiceUrl}}`, `{{pdfAttachment}}`
**Subject**: Invoice #{{invoiceNumber}}

#### 117. ❌ `stripe-payout-merchant`
**Description**: Payout sent to bank account
**Category**: Transactional
**Trigger**: Stripe payout succeeds
**Variables**: `{{merchantName}}`, `{{payoutAmount}}`, `{{payoutDate}}`, `{{accountLastFour}}`, `{{transactionId}}`
**Subject**: Payout Sent - ${{payoutAmount}}

#### 118. ❌ `subscription-payment-reminder`
**Description**: Upcoming subscription charge notification
**Category**: Transactional
**Trigger**: 3 days before subscription renewal
**Variables**: `{{customerName}}`, `{{chargeDate}}`, `{{chargeAmount}}`, `{{subscriptionName}}`, `{{updatePaymentUrl}}`
**Subject**: Upcoming Charge: {{subscriptionName}}

---

### **Marketing & Engagement (8 templates)**

#### 119. ❌ `newsletter-subscription-confirmed`
**Description**: Newsletter signup confirmation with preferences
**Category**: Marketing
**Trigger**: User subscribes to newsletter
**Variables**: `{{subscriberName}}`, `{{subscriptionDate}}`, `{{frequency}}`, `{{preferencesUrl}}`, `{{unsubscribeUrl}}`
**Subject**: Welcome to Our Newsletter

#### 120. ❌ `merchant-spotlight-followers`
**Description**: Featured merchant update to followers
**Category**: Marketing
**Trigger**: Merchant promoted as spotlight
**Variables**: `{{followerName}}`, `{{merchantName}}`, `{{spotlightReason}}`, `{{merchantUrl}}`
**Subject**: Merchant Spotlight: {{merchantName}}

#### 121. ❌ `new-product-launch-followers`
**Description**: New product announcement to merchant followers
**Category**: Marketing
**Trigger**: Merchant publishes new product
**Variables**: `{{followerName}}`, `{{merchantName}}`, `{{productName}}`, `{{productDescription}}`, `{{productUrl}}`
**Subject**: New from {{merchantName}}: {{productName}}

#### 122. ❌ `seasonal-promotion-customers`
**Description**: Seasonal sale or promotion announcement
**Category**: Marketing
**Trigger**: Marketing campaign launched
**Variables**: `{{customerName}}`, `{{promotionName}}`, `{{discount}}`, `{{startDate}}`, `{{endDate}}`, `{{shopUrl}}`
**Subject**: {{promotionName}} - {{discount}} Off

#### 123. ❌ `referral-reward-earned`
**Description**: Referral program reward credit applied
**Category**: Marketing
**Trigger**: Referred user completes first purchase
**Variables**: `{{referrerName}}`, `{{rewardAmount}}`, `{{referredName}}`, `{{accountBalanceUrl}}`
**Subject**: You Earned ${{rewardAmount}}!

#### 124. ❌ `inactive-account-reengagement`
**Description**: We miss you, come back incentive
**Category**: Marketing
**Trigger**: No activity for 90 days
**Variables**: `{{userName}}`, `{{incentiveOffer}}`, `{{discountCode}}`, `{{expirationDate}}`, `{{shopUrl}}`
**Subject**: We Miss You, {{userName}}

#### 125. ❌ `birthday-greeting-customer`
**Description**: Birthday greeting with special offer
**Category**: Marketing
**Trigger**: Customer's birthday (from profile)
**Variables**: `{{customerName}}`, `{{birthdayOffer}}`, `{{discountCode}}`, `{{expirationDate}}`
**Subject**: Happy Birthday, {{customerName}}!

#### 126. ❌ `anniversary-customer`
**Description**: Account anniversary celebration
**Category**: Marketing
**Trigger**: Anniversary of account creation
**Variables**: `{{customerName}}`, `{{yearsActive}}`, `{{anniversaryOffer}}`, `{{milestones}}`
**Subject**: {{yearsActive}} Year Anniversary!

---

## Priority Implementation Guide

### **Phase 1: Critical Transactional (Weeks 1-2) - 14 Templates**
Must-have emails that directly impact trust and operations:

1. Order confirmation
2. Order shipped
3. Order delivered
4. Merchant payout processed/failed
5. Low stock alert
6. Backorder allocated
7. Auto-refund safety net (4 templates from CLAUDE.md)
8. Shipping tracking updates
9. Refund processed
10. New order notification (merchant)

### **Phase 2: Core Operations (Weeks 3-4) - 20 Templates**
Important operational emails:

1. Account verification
2. Merchant application workflow (3 templates)
3. Refund workflow (approved, rejected)
4. Subscription management (renewal, expired, payment failed)
5. Tour reminders and updates
6. Case status updates
7. Shipping exceptions
8. Return processing

### **Phase 3: Enhanced Experience (Weeks 5-6) - 18 Templates**
UX improvements:

1. Support ticket workflow
2. Payment alerts
3. Inventory notifications
4. Shipping status updates
5. Case evidence/deadlines
6. Account security

### **Phase 4: Engagement & Marketing (Ongoing) - 18 Templates**
Growth and retention:

1. Abandoned cart
2. Review requests
3. Wishlist alerts
4. Newsletter
5. Referrals
6. Seasonal promotions
7. Merchant spotlights
8. Birthday/anniversary

---

## Technical Notes

### **Email Service**
- Provider: SendGrid
- Backend: `/graphql-backend/src/services/sendgrid.ts`
- Template Maps: `/graphql-backend/src/client/email_templates.ts`, `/saas-frontend/src/utils/email_templates.ts`

### **Template Storage**
- Database: Cosmos DB `System-Settings` container
- Partition: `email-templates`
- GraphQL: `emailTemplates`, `upsertEmailTemplate`, `deleteEmailTemplate`

### **Assets**
- Storage: Azure Blob `public` container
- Path: `email-templates/`
- Access: Via GraphQL `emailAssets` query

### **Variables**
- Syntax: `{{variableName}}` (Handlebars)
- Common: `{{userName}}`, `{{companyName}}`, `{{supportEmail}}`, `{{currentYear}}`

---

**Next Action**: Begin Phase 1 migration with existing templates, then create high-priority missing templates.
