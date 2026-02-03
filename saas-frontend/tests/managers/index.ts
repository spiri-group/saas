/**
 * Test Managers
 *
 * Centralized managers for common e2e test operations.
 * These reduce code duplication across test files.
 */

export { PurchaseManager } from './PurchaseManager';
export type { BillingAddress, PurchaseResult, PurchaseOptions } from './PurchaseManager';

export { DialogManager, DEFAULT_TEST_PNG_BASE64 } from './DialogManager';

export { ServiceManager } from './ServiceManager';
export type { ServiceDetails, AstrologyServiceDetails, CreatedService } from './ServiceManager';
