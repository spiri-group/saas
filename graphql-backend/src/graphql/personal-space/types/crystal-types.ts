import { recordref_type } from "../../0_shared/types";
import type { crystal_color, crystal_form, chakra_type, cleansing_method, charging_method } from "../../crystal-reference/types";

// ============================================
// Crystals & Stones Types (Personal Space Specific)
// ============================================

// Acquisition source types (unique to personal space)
export type crystal_acquisition_source =
  | 'SPIRIVERSE'      // Bought from SpiriVerse marketplace
  | 'ONLINE_SHOP'     // Other online shops
  | 'LOCAL_SHOP'      // Local crystal/metaphysical shop
  | 'FAIR_SHOW'       // Crystal fair, gem show, market
  | 'GIFT'            // Received as gift
  | 'FOUND'           // Found in nature
  | 'INHERITED'       // Family heirloom
  | 'TRADE'           // Traded with another collector
  | 'OTHER';

// ============================================
// Crystal Collection Item (Core)
// ============================================

export interface crystal_collection_item_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_COLLECTION';

  // Required fields
  name: string;              // "Amethyst", "Clear Quartz", etc.
  crystalRefId?: string;     // Link to crystal reference database
  addedDate: string;         // When added to collection

  // Physical properties
  color?: crystal_color;
  form?: crystal_form;
  size?: string;             // "Small", "Medium", "Large" or dimensions
  weight?: number;           // Weight in grams
  origin?: string;           // Country/region of origin if known

  // Metaphysical properties
  primaryPurpose?: string;   // Main use: "protection", "love", "clarity"
  chakras?: chakra_type[];   // Associated chakras
  elements?: string[];       // Fire, Water, Air, Earth, Spirit
  zodiacSigns?: string[];    // Astrological associations

  // Personal relationship
  nickname?: string;         // Personal name for this crystal
  personalMeaning?: string;  // What this crystal means to you
  specialBond?: boolean;     // Is this a go-to crystal?
  energyNotes?: string;      // How its energy feels to you

  // Acquisition info (embedded for quick reference)
  acquisitionSource?: crystal_acquisition_source;
  acquiredFrom?: string;     // Vendor name, person's name, location
  acquiredDate?: string;     // When acquired
  purchasePrice?: number;
  currency?: string;

  // Status
  isActive: boolean;         // Still in collection (vs gifted/lost)
  location?: string;         // Where it's stored: "altar", "bedroom", "office"

  // Media
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Crystal Wishlist Item (Core)
// ============================================

export interface crystal_wishlist_item_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_WISHLIST';

  // Required
  name: string;              // Crystal name
  crystalRefId?: string;     // Link to crystal reference database
  addedDate: string;

  // Preferences
  preferredForm?: crystal_form;
  preferredSize?: string;
  preferredOrigin?: string;
  maxBudget?: number;
  currency?: string;

  // Why do you want it?
  purpose?: string;          // "healing", "collection", "gift"
  reason?: string;           // Personal reason for wanting it

  // Marketplace integration
  alertEnabled?: boolean;    // Notify when available on SpiriVerse
  priority?: number;         // 1 (must have) to 5 (nice to have)

  // Status
  isAcquired: boolean;       // Found and bought it?
  acquiredDate?: string;
  collectionItemId?: string; // Link to collection item if acquired

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Crystal Companion Log (Core)
// ============================================

// Daily crystal companion - what crystal is with you today?
export interface crystal_companion_log_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_COMPANION';

  // Required
  date: string;              // ISO date (YYYY-MM-DD)
  crystalId?: string;        // Reference to collection item (optional)
  crystalName: string;       // Name of crystal (in case not in collection)

  // Context
  reason?: string;           // Why this crystal today?
  intention?: string;        // Intention set with the crystal
  location?: string;         // "pocket", "necklace", "desk", "altar"

  // Reflection (can be added later)
  howItFelt?: string;        // How the day went with this crystal
  effectivenessScore?: number; // 1-5 how effective it felt
  willContinue?: boolean;    // Will you carry it tomorrow?

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Cleansing Log (Progressive - unlocks after 5 crystals)
// ============================================

export interface crystal_cleansing_log_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_CLEANSING';

  // Required
  date: string;
  crystalIds?: string[];     // Which crystals were cleansed
  crystalNames: string[];    // Names (for display without lookup)

  // Cleansing details
  method: cleansing_method;
  methodDetails?: string;    // e.g., "Full moon", "White sage", "Tibetan bowl"
  duration?: number;         // Duration in minutes
  moonPhase?: string;        // If lunar cleansing

  // Charging (often done together)
  didCharge?: boolean;
  chargingMethod?: charging_method;
  chargingDetails?: string;
  intention?: string;        // Intention set during charging

  // Notes
  notes?: string;
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Crystal Grid (Progressive - unlocks after 10 crystals)
// ============================================

export interface grid_crystal_placement {
  position: string;          // "center", "inner-1", "outer-3", etc.
  crystalId?: string;        // Reference to collection item
  crystalName: string;
  role?: string;             // "focus stone", "way stones", "desire stones"
}

export interface crystal_grid_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_GRID';

  // Required
  name: string;              // Grid name
  createdDate: string;
  purpose: string;           // Main intention/purpose

  // Grid configuration
  gridShape?: string;        // "flower of life", "seed of life", "metatron", "custom"
  crystals: grid_crystal_placement[];

  // Activation
  activatedDate?: string;
  deactivatedDate?: string;  // When grid was taken down
  isActive: boolean;

  // Tracking
  duration?: string;         // How long grid was active
  outcome?: string;          // What happened / did it work?
  effectivenessScore?: number; // 1-5

  // Notes
  notes?: string;
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Crystal Input/Response Types
// ============================================

// Collection inputs
export interface create_crystal_collection_input {
  userId: string;
  name: string;
  crystalRefId?: string;     // Link to crystal reference database
  addedDate?: string;
  color?: crystal_color;
  form?: crystal_form;
  size?: string;
  weight?: number;
  origin?: string;
  primaryPurpose?: string;
  chakras?: chakra_type[];
  elements?: string[];
  zodiacSigns?: string[];
  nickname?: string;
  personalMeaning?: string;
  specialBond?: boolean;
  energyNotes?: string;
  acquisitionSource?: crystal_acquisition_source;
  acquiredFrom?: string;
  acquiredDate?: string;
  purchasePrice?: number;
  currency?: string;
  location?: string;
  photoUrl?: string;
}

export interface update_crystal_collection_input {
  id: string;
  userId: string;
  name?: string;
  crystalRefId?: string;     // Link to crystal reference database
  color?: crystal_color;
  form?: crystal_form;
  size?: string;
  weight?: number;
  origin?: string;
  primaryPurpose?: string;
  chakras?: chakra_type[];
  elements?: string[];
  zodiacSigns?: string[];
  nickname?: string;
  personalMeaning?: string;
  specialBond?: boolean;
  energyNotes?: string;
  acquisitionSource?: crystal_acquisition_source;
  acquiredFrom?: string;
  acquiredDate?: string;
  purchasePrice?: number;
  currency?: string;
  isActive?: boolean;
  location?: string;
  photoUrl?: string;
}

// Wishlist inputs
export interface create_crystal_wishlist_input {
  userId: string;
  name: string;
  crystalRefId?: string;     // Link to crystal reference database
  preferredForm?: crystal_form;
  preferredSize?: string;
  preferredOrigin?: string;
  maxBudget?: number;
  currency?: string;
  purpose?: string;
  reason?: string;
  alertEnabled?: boolean;
  priority?: number;
}

export interface update_crystal_wishlist_input {
  id: string;
  userId: string;
  name?: string;
  crystalRefId?: string;     // Link to crystal reference database
  preferredForm?: crystal_form;
  preferredSize?: string;
  preferredOrigin?: string;
  maxBudget?: number;
  currency?: string;
  purpose?: string;
  reason?: string;
  alertEnabled?: boolean;
  priority?: number;
  isAcquired?: boolean;
  acquiredDate?: string;
  collectionItemId?: string;
}

// Companion log inputs
export interface create_crystal_companion_input {
  userId: string;
  date?: string;
  crystalId?: string;
  crystalName: string;
  reason?: string;
  intention?: string;
  location?: string;
}

export interface update_crystal_companion_input {
  id: string;
  userId: string;
  crystalId?: string;
  crystalName?: string;
  reason?: string;
  intention?: string;
  location?: string;
  howItFelt?: string;
  effectivenessScore?: number;
  willContinue?: boolean;
}

// Cleansing log inputs
export interface create_crystal_cleansing_input {
  userId: string;
  date?: string;
  crystalIds?: string[];
  crystalNames: string[];
  method: cleansing_method;
  methodDetails?: string;
  duration?: number;
  moonPhase?: string;
  didCharge?: boolean;
  chargingMethod?: charging_method;
  chargingDetails?: string;
  intention?: string;
  notes?: string;
  photoUrl?: string;
}

export interface update_crystal_cleansing_input {
  id: string;
  userId: string;
  crystalIds?: string[];
  crystalNames?: string[];
  method?: cleansing_method;
  methodDetails?: string;
  duration?: number;
  moonPhase?: string;
  didCharge?: boolean;
  chargingMethod?: charging_method;
  chargingDetails?: string;
  intention?: string;
  notes?: string;
  photoUrl?: string;
}

// Grid inputs
export interface create_crystal_grid_input {
  userId: string;
  name: string;
  createdDate?: string;
  purpose: string;
  gridShape?: string;
  crystals: grid_crystal_placement[];
  notes?: string;
  photoUrl?: string;
}

export interface update_crystal_grid_input {
  id: string;
  userId: string;
  name?: string;
  purpose?: string;
  gridShape?: string;
  crystals?: grid_crystal_placement[];
  activatedDate?: string;
  deactivatedDate?: string;
  isActive?: boolean;
  duration?: string;
  outcome?: string;
  effectivenessScore?: number;
  notes?: string;
  photoUrl?: string;
}

// Response types
export interface crystal_collection_response {
  success: boolean;
  message?: string;
  crystal?: crystal_collection_item_type;
}

export interface crystal_wishlist_response {
  success: boolean;
  message?: string;
  wishlistItem?: crystal_wishlist_item_type;
}

export interface crystal_companion_response {
  success: boolean;
  message?: string;
  companionLog?: crystal_companion_log_type;
}

export interface crystal_cleansing_response {
  success: boolean;
  message?: string;
  cleansingLog?: crystal_cleansing_log_type;
}

export interface crystal_grid_response {
  success: boolean;
  message?: string;
  grid?: crystal_grid_type;
}

export interface delete_crystal_response {
  success: boolean;
  message?: string;
}

// Filter types
export interface crystal_collection_filters {
  color?: crystal_color;
  form?: crystal_form;
  chakra?: chakra_type;
  isActive?: boolean;
  specialBond?: boolean;
  search?: string;          // Search by name/nickname
  limit?: number;
  offset?: number;
}

export interface crystal_wishlist_filters {
  priority?: number;
  isAcquired?: boolean;
  alertEnabled?: boolean;
  limit?: number;
  offset?: number;
}

export interface crystal_companion_filters {
  startDate?: string;
  endDate?: string;
  crystalId?: string;
  limit?: number;
  offset?: number;
}

export interface crystal_cleansing_filters {
  startDate?: string;
  endDate?: string;
  method?: cleansing_method;
  crystalId?: string;
  limit?: number;
  offset?: number;
}

export interface crystal_grid_filters {
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================
// Charging Reminder (Progressive - after enabling moon notifications)
// ============================================

export interface charging_reminder_type {
  id: string;
  userId: string;
  docType: 'CHARGING_REMINDER';

  // Which crystals to remind about
  crystalIds?: string[];
  crystalNames: string[];

  // Reminder settings
  reminderType: 'full_moon' | 'new_moon' | 'custom';
  customDate?: string;           // For custom reminders
  isRecurring: boolean;
  recurringInterval?: string;    // "monthly", "weekly"

  // Notification preferences
  notifyBefore?: number;         // Hours before event
  notificationMethod?: 'push' | 'email' | 'both';

  // Status
  isActive: boolean;
  lastTriggered?: string;
  nextTrigger?: string;

  // Notes
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Acquisition Journal (Progressive - prompt after each new collection entry)
// ============================================

export interface acquisition_journal_type {
  id: string;
  userId: string;
  docType: 'ACQUISITION_JOURNAL';

  // Link to collection item
  crystalId: string;
  crystalName: string;

  // The story
  date: string;                  // Acquisition date
  story?: string;                // The full story of how you found it
  circumstances?: string;        // What led you to this crystal?
  initialFeeling?: string;       // How it felt when you first held it
  calledToYou?: boolean;         // Did you feel called to it?

  // Vendor/Source details (expanded from collection item)
  vendorName?: string;
  vendorContact?: string;
  vendorWebsite?: string;
  eventName?: string;            // If from a fair/show
  eventLocation?: string;

  // Photos
  photoUrls?: string[];          // Multiple photos of the acquisition

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Pairing Notes (Progressive - after first grid logged)
// ============================================

export interface crystal_pairing_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_PAIRING';

  // The pairing
  crystal1Id?: string;
  crystal1Name: string;
  crystal2Id?: string;
  crystal2Name: string;

  // How they work together
  pairingPurpose: string;        // What you use this pairing for
  synergy?: string;              // How their energies combine
  effectivenessScore?: number;   // 1-5 how well they work together
  discovered?: string;           // How you discovered this pairing

  // Context
  bestUsedFor?: string[];        // Situations where this pairing shines
  avoidWhen?: string[];          // When not to use together
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Shop/Fair Log (Progressive - after first acquisition with vendor tagged)
// ============================================

export interface crystal_shop_log_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_SHOP_LOG';

  // Vendor info
  vendorName: string;
  vendorType: 'online_shop' | 'local_shop' | 'fair_booth' | 'market_stall' | 'private_seller';

  // Contact & location
  website?: string;
  socialMedia?: string;          // Instagram, etc.
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;

  // For fairs/shows
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;

  // Your experience
  visitDate?: string;
  rating?: number;               // 1-5
  specialties?: string[];        // What they're known for
  priceRange?: string;           // "budget", "mid", "premium"
  notes?: string;
  wouldRecommend?: boolean;
  wouldReturn?: boolean;

  // Purchases from this vendor
  purchaseCount?: number;
  totalSpent?: number;
  currency?: string;

  // Photos
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Crystal Statistics Types
// ============================================

export interface crystal_stats {
  // Collection overview
  totalCrystals: number;
  activeCrystals: number;
  inactiveCrystals: number;

  // By category
  colorDistribution: { color: string; count: number; percentage: number }[];
  formDistribution: { form: string; count: number; percentage: number }[];
  chakraDistribution: { chakra: string; count: number }[];

  // Special
  specialBondCount: number;
  recentlyAdded: crystal_collection_item_type[];

  // Activity
  companionStreak: number;   // Days in a row with a companion crystal
  totalCleansingsSessions: number;
  activeGrids: number;

  // Wishlist
  wishlistCount: number;
  acquiredFromWishlist: number;
}
