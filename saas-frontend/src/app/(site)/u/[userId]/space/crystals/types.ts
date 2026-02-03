// ============================================
// Crystal & Stones Types
// ============================================

// Enums
export type CrystalColor =
  | 'clear'
  | 'white'
  | 'black'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'brown'
  | 'gray'
  | 'multicolor'
  | 'iridescent';

export type CrystalForm =
  | 'raw'
  | 'tumbled'
  | 'point'
  | 'cluster'
  | 'sphere'
  | 'palm_stone'
  | 'wand'
  | 'pyramid'
  | 'heart'
  | 'skull'
  | 'cabochon'
  | 'faceted'
  | 'slice'
  | 'geode'
  | 'jewelry'
  | 'other';

export type CrystalAcquisitionSource =
  | 'SPIRIVERSE'
  | 'ONLINE_SHOP'
  | 'LOCAL_SHOP'
  | 'FAIR_SHOW'
  | 'GIFT'
  | 'FOUND'
  | 'INHERITED'
  | 'TRADE'
  | 'OTHER';

export type CleansingMethod =
  | 'moonlight'
  | 'sunlight'
  | 'smoke'
  | 'sound'
  | 'water'
  | 'salt'
  | 'earth'
  | 'selenite'
  | 'breath'
  | 'visualization'
  | 'reiki'
  | 'other';

export type ChargingMethod =
  | 'moonlight'
  | 'sunlight'
  | 'crystal_cluster'
  | 'intention'
  | 'grid'
  | 'meditation'
  | 'earth'
  | 'other';

export type ChakraType =
  | 'root'
  | 'sacral'
  | 'solar_plexus'
  | 'heart'
  | 'throat'
  | 'third_eye'
  | 'crown'
  | 'earth_star'
  | 'soul_star';

// ============================================
// Crystal Collection Item
// ============================================

export interface CrystalCollectionItem {
  id: string;
  userId: string;
  name: string;
  crystalRefId?: string;
  addedDate: string;
  color?: CrystalColor;
  form?: CrystalForm;
  size?: string;
  weight?: number;
  origin?: string;
  primaryPurpose?: string;
  chakras?: ChakraType[];
  elements?: string[];
  zodiacSigns?: string[];
  nickname?: string;
  personalMeaning?: string;
  specialBond: boolean;
  energyNotes?: string;
  acquisitionSource?: CrystalAcquisitionSource;
  acquiredFrom?: string;
  acquiredDate?: string;
  purchasePrice?: number;
  currency?: string;
  isActive: boolean;
  location?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Crystal Wishlist Item
// ============================================

export interface CrystalWishlistItem {
  id: string;
  userId: string;
  name: string;
  crystalRefId?: string;
  addedDate: string;
  preferredForm?: CrystalForm;
  preferredSize?: string;
  preferredOrigin?: string;
  maxBudget?: number;
  currency?: string;
  purpose?: string;
  reason?: string;
  alertEnabled?: boolean;
  priority?: number;
  isAcquired: boolean;
  acquiredDate?: string;
  collectionItemId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Crystal Companion Log
// ============================================

export interface CrystalCompanionLog {
  id: string;
  userId: string;
  date: string;
  crystalId?: string;
  crystalName: string;
  reason?: string;
  intention?: string;
  location?: string;
  howItFelt?: string;
  effectivenessScore?: number;
  willContinue?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Crystal Cleansing Log
// ============================================

export interface CrystalCleansingLog {
  id: string;
  userId: string;
  date: string;
  crystalIds?: string[];
  crystalNames: string[];
  method: CleansingMethod;
  methodDetails?: string;
  duration?: number;
  moonPhase?: string;
  didCharge?: boolean;
  chargingMethod?: ChargingMethod;
  chargingDetails?: string;
  intention?: string;
  notes?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Crystal Grid
// ============================================

export interface GridCrystalPlacement {
  position: string;
  crystalId?: string;
  crystalName: string;
  role?: string;
}

export interface CrystalGrid {
  id: string;
  userId: string;
  name: string;
  createdDate: string;
  purpose: string;
  gridShape?: string;
  crystals: GridCrystalPlacement[];
  activatedDate?: string;
  deactivatedDate?: string;
  isActive: boolean;
  duration?: string;
  outcome?: string;
  effectivenessScore?: number;
  notes?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Crystal Statistics
// ============================================

export interface ColorDistribution {
  color: string;
  count: number;
  percentage: number;
}

export interface FormDistribution {
  form: string;
  count: number;
  percentage: number;
}

export interface ChakraDistribution {
  chakra: string;
  count: number;
}

export interface CrystalStats {
  totalCrystals: number;
  activeCrystals: number;
  inactiveCrystals: number;
  colorDistribution: ColorDistribution[];
  formDistribution: FormDistribution[];
  chakraDistribution: ChakraDistribution[];
  specialBondCount: number;
  recentlyAdded: CrystalCollectionItem[];
  companionStreak: number;
  totalCleansingsSessions: number;
  activeGrids: number;
  wishlistCount: number;
  acquiredFromWishlist: number;
}

// ============================================
// Filter Types
// ============================================

export interface CrystalCollectionFilters {
  color?: CrystalColor;
  form?: CrystalForm;
  chakra?: ChakraType;
  isActive?: boolean;
  specialBond?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CrystalWishlistFilters {
  priority?: number;
  isAcquired?: boolean;
  alertEnabled?: boolean;
  limit?: number;
  offset?: number;
}

export interface CrystalCompanionFilters {
  startDate?: string;
  endDate?: string;
  crystalId?: string;
  limit?: number;
  offset?: number;
}

export interface CrystalCleansingFilters {
  startDate?: string;
  endDate?: string;
  method?: CleansingMethod;
  crystalId?: string;
  limit?: number;
  offset?: number;
}

export interface CrystalGridFilters {
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================
// Form State Types
// ============================================

export interface CrystalFormState {
  name: string;
  crystalRefId?: string | null;
  color?: CrystalColor;
  form?: CrystalForm;
  size?: string;
  weight?: number;
  origin?: string;
  primaryPurpose?: string;
  chakras: ChakraType[];
  elements: string[];
  zodiacSigns: string[];
  nickname?: string;
  personalMeaning?: string;
  specialBond: boolean;
  energyNotes?: string;
  acquisitionSource?: CrystalAcquisitionSource;
  acquiredFrom?: string;
  acquiredDate?: string;
  purchasePrice?: number;
  currency?: string;
  location?: string;
  photoUrl?: string;
}

export interface WishlistFormState {
  name: string;
  crystalRefId?: string | null;
  preferredForm?: CrystalForm;
  preferredSize?: string;
  preferredOrigin?: string;
  maxBudget?: number;
  currency?: string;
  purpose?: string;
  reason?: string;
  alertEnabled: boolean;
  priority: number;
}

export interface CompanionFormState {
  crystalId?: string;
  crystalName: string;
  reason?: string;
  intention?: string;
  location?: string;
}

export interface CleansingFormState {
  crystalIds: string[];
  crystalNames: string[];
  method: CleansingMethod;
  methodDetails?: string;
  duration?: number;
  moonPhase?: string;
  didCharge: boolean;
  chargingMethod?: ChargingMethod;
  chargingDetails?: string;
  intention?: string;
  notes?: string;
}

export interface GridFormState {
  name: string;
  purpose: string;
  gridShape?: string;
  crystals: GridCrystalPlacement[];
  notes?: string;
}

// ============================================
// UI Option Arrays
// ============================================

export const CRYSTAL_COLORS: { key: CrystalColor; label: string }[] = [
  { key: 'clear', label: 'Clear/Transparent' },
  { key: 'white', label: 'White' },
  { key: 'black', label: 'Black' },
  { key: 'red', label: 'Red' },
  { key: 'orange', label: 'Orange' },
  { key: 'yellow', label: 'Yellow' },
  { key: 'green', label: 'Green' },
  { key: 'blue', label: 'Blue' },
  { key: 'purple', label: 'Purple' },
  { key: 'pink', label: 'Pink' },
  { key: 'brown', label: 'Brown' },
  { key: 'gray', label: 'Gray' },
  { key: 'multicolor', label: 'Multicolor' },
  { key: 'iridescent', label: 'Iridescent' },
];

export const CRYSTAL_FORMS: { key: CrystalForm; label: string }[] = [
  { key: 'raw', label: 'Raw/Natural' },
  { key: 'tumbled', label: 'Tumbled' },
  { key: 'point', label: 'Point/Tower' },
  { key: 'cluster', label: 'Cluster' },
  { key: 'sphere', label: 'Sphere' },
  { key: 'palm_stone', label: 'Palm Stone' },
  { key: 'wand', label: 'Wand' },
  { key: 'pyramid', label: 'Pyramid' },
  { key: 'heart', label: 'Heart' },
  { key: 'skull', label: 'Skull' },
  { key: 'cabochon', label: 'Cabochon' },
  { key: 'faceted', label: 'Faceted' },
  { key: 'slice', label: 'Slice/Slab' },
  { key: 'geode', label: 'Geode' },
  { key: 'jewelry', label: 'Jewelry' },
  { key: 'other', label: 'Other' },
];

export const ACQUISITION_SOURCES: { key: CrystalAcquisitionSource; label: string }[] = [
  { key: 'SPIRIVERSE', label: 'SpiriVerse' },
  { key: 'ONLINE_SHOP', label: 'Online Shop' },
  { key: 'LOCAL_SHOP', label: 'Local Shop' },
  { key: 'FAIR_SHOW', label: 'Fair/Show' },
  { key: 'GIFT', label: 'Gift' },
  { key: 'FOUND', label: 'Found' },
  { key: 'INHERITED', label: 'Inherited' },
  { key: 'TRADE', label: 'Trade' },
  { key: 'OTHER', label: 'Other' },
];

export const CLEANSING_METHODS: { key: CleansingMethod; label: string; icon?: string }[] = [
  { key: 'moonlight', label: 'Moonlight' },
  { key: 'sunlight', label: 'Sunlight' },
  { key: 'smoke', label: 'Smoke (Sage/Palo Santo)' },
  { key: 'sound', label: 'Sound (Singing Bowl)' },
  { key: 'water', label: 'Water' },
  { key: 'salt', label: 'Salt' },
  { key: 'earth', label: 'Earth/Soil' },
  { key: 'selenite', label: 'Selenite' },
  { key: 'breath', label: 'Breathwork' },
  { key: 'visualization', label: 'Visualization' },
  { key: 'reiki', label: 'Reiki' },
  { key: 'other', label: 'Other' },
];

export const CHARGING_METHODS: { key: ChargingMethod; label: string }[] = [
  { key: 'moonlight', label: 'Moonlight' },
  { key: 'sunlight', label: 'Sunlight' },
  { key: 'crystal_cluster', label: 'Crystal Cluster' },
  { key: 'intention', label: 'Intention Setting' },
  { key: 'grid', label: 'Crystal Grid' },
  { key: 'meditation', label: 'Meditation' },
  { key: 'earth', label: 'Earth' },
  { key: 'other', label: 'Other' },
];

export const CHAKRAS: { key: ChakraType; label: string; color: string }[] = [
  { key: 'earth_star', label: 'Earth Star', color: '#8B4513' },
  { key: 'root', label: 'Root', color: '#FF0000' },
  { key: 'sacral', label: 'Sacral', color: '#FF7F00' },
  { key: 'solar_plexus', label: 'Solar Plexus', color: '#FFFF00' },
  { key: 'heart', label: 'Heart', color: '#00FF00' },
  { key: 'throat', label: 'Throat', color: '#00BFFF' },
  { key: 'third_eye', label: 'Third Eye', color: '#4B0082' },
  { key: 'crown', label: 'Crown', color: '#8B00FF' },
  { key: 'soul_star', label: 'Soul Star', color: '#FFFFFF' },
];

export const GRID_SHAPES: { key: string; label: string }[] = [
  { key: 'flower_of_life', label: 'Flower of Life' },
  { key: 'seed_of_life', label: 'Seed of Life' },
  { key: 'metatron', label: "Metatron's Cube" },
  { key: 'sri_yantra', label: 'Sri Yantra' },
  { key: 'vesica_piscis', label: 'Vesica Piscis' },
  { key: 'triangle', label: 'Triangle' },
  { key: 'square', label: 'Square' },
  { key: 'circle', label: 'Circle' },
  { key: 'star', label: 'Star' },
  { key: 'custom', label: 'Custom' },
];

export const PRIORITY_OPTIONS = [
  { value: 1, label: 'Must Have' },
  { value: 2, label: 'High Priority' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'Low Priority' },
  { value: 5, label: 'Nice to Have' },
];

export const COMPANION_LOCATIONS: string[] = [
  'Pocket',
  'Necklace',
  'Bracelet',
  'Ring',
  'Bra',
  'Desk',
  'Altar',
  'Nightstand',
  'Purse/Bag',
  'Car',
  'Meditation Space',
];

// ============================================
// Crystal Reference Types
// ============================================

export type CrystalSystem =
  | 'cubic'
  | 'tetragonal'
  | 'orthorhombic'
  | 'hexagonal'
  | 'trigonal'
  | 'monoclinic'
  | 'triclinic'
  | 'amorphous';

export type ElementType = 'earth' | 'water' | 'fire' | 'air' | 'spirit';

export type ZodiacSign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export interface CrystalReference {
  id: string;
  name: string;
  alternateNames: string[];
  description: string;
  colors: CrystalColor[];
  crystalSystem?: CrystalSystem;
  mohsHardness?: number;
  commonForms: CrystalForm[];
  chakras: ChakraType[];
  elements: ElementType[];
  zodiacSigns: ZodiacSign[];
  planetaryAssociation?: string;
  numerology?: number;
  primaryProperties: string[];
  emotionalUses: string[];
  spiritualUses: string[];
  physicalAssociations: string[];
  cleansingMethods: CleansingMethod[];
  chargingMethods: ChargingMethod[];
  avoidMethods: string[];
  careNotes?: string;
  localities: string[];
  thumbnail?: string;
}

// ============================================
// Practitioner Insight Types
// ============================================

export type InsightType =
  | 'usage_tip'
  | 'pairing'
  | 'personal_experience'
  | 'warning'
  | 'alternative_use';

export type InsightStatus =
  | 'pending'
  | 'approved'
  | 'flagged'
  | 'removed';

export interface PractitionerInsight {
  id: string;
  crystalId: string;
  practitionerId: string;
  insightType: InsightType;
  content: string;
  agreeCount: number;
  agreedBy: string[];
  insightStatus: InsightStatus;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InsightFormState {
  crystalId: string;
  insightType: InsightType;
  content: string;
}

export const INSIGHT_TYPES: { key: InsightType; label: string; description: string }[] = [
  { key: 'usage_tip', label: 'Usage Tip', description: 'How to use this crystal effectively' },
  { key: 'pairing', label: 'Crystal Pairing', description: 'What crystals work well together' },
  { key: 'personal_experience', label: 'Personal Experience', description: 'Your story with this crystal' },
  { key: 'warning', label: 'Caution', description: 'Things to be aware of' },
  { key: 'alternative_use', label: 'Alternative Use', description: 'Creative or non-traditional uses' },
];

export const ELEMENTS: { key: ElementType; label: string; color: string }[] = [
  { key: 'earth', label: 'Earth', color: '#8B4513' },
  { key: 'water', label: 'Water', color: '#1E90FF' },
  { key: 'fire', label: 'Fire', color: '#FF4500' },
  { key: 'air', label: 'Air', color: '#87CEEB' },
  { key: 'spirit', label: 'Spirit', color: '#9370DB' },
];

export const ZODIAC_SIGNS: { key: ZodiacSign; label: string; symbol: string }[] = [
  { key: 'aries', label: 'Aries', symbol: '♈' },
  { key: 'taurus', label: 'Taurus', symbol: '♉' },
  { key: 'gemini', label: 'Gemini', symbol: '♊' },
  { key: 'cancer', label: 'Cancer', symbol: '♋' },
  { key: 'leo', label: 'Leo', symbol: '♌' },
  { key: 'virgo', label: 'Virgo', symbol: '♍' },
  { key: 'libra', label: 'Libra', symbol: '♎' },
  { key: 'scorpio', label: 'Scorpio', symbol: '♏' },
  { key: 'sagittarius', label: 'Sagittarius', symbol: '♐' },
  { key: 'capricorn', label: 'Capricorn', symbol: '♑' },
  { key: 'aquarius', label: 'Aquarius', symbol: '♒' },
  { key: 'pisces', label: 'Pisces', symbol: '♓' },
];
