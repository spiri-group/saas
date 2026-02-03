import { recordref_type, RecordStatus } from "../0_shared/types";

// Crystal Reference Database Types
// Stored in System-SettingTrees with configId = "crystal-reference"

export const CRYSTAL_REFERENCE_CONFIG_ID = "crystal-reference";
export const CRYSTAL_REFERENCE_CONTAINER = "System-SettingTrees";

// Enums for crystal properties
export type crystal_color =
  | "clear"
  | "white"
  | "black"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "brown"
  | "gray"
  | "gold"
  | "silver"
  | "multicolor"
  | "iridescent";

export type crystal_system =
  | "cubic"
  | "tetragonal"
  | "orthorhombic"
  | "hexagonal"
  | "trigonal"
  | "monoclinic"
  | "triclinic"
  | "amorphous";

export type crystal_form =
  | "raw"
  | "tumbled"
  | "point"
  | "cluster"
  | "sphere"
  | "palm_stone"
  | "tower"
  | "wand"
  | "pyramid"
  | "heart"
  | "skull"
  | "cabochon"
  | "faceted"
  | "slice"
  | "geode"
  | "jewelry"
  | "freeform"
  | "cube"
  | "carving"
  | "blade"
  | "fan"
  | "other";

export type chakra_type =
  | "root"
  | "sacral"
  | "solar_plexus"
  | "heart"
  | "throat"
  | "third_eye"
  | "crown"
  | "earth_star"
  | "soul_star";

export type element_type = "earth" | "water" | "fire" | "air" | "spirit";

export type zodiac_sign =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export type cleansing_method =
  | "moonlight"
  | "sunlight"
  | "smoke"
  | "sound"
  | "water"
  | "salt"
  | "earth"
  | "selenite"
  | "clear_quartz"
  | "breath"
  | "visualization"
  | "reiki"
  | "other";

export type charging_method =
  | "moonlight"
  | "sunlight"
  | "water"
  | "crystal_cluster"
  | "intention"
  | "grid"
  | "meditation"
  | "earth"
  | "other";

// Main Crystal Reference Type
export type crystal_reference_type = {
  // Identity
  id: string; // URL-safe slug, e.g., "amethyst"
  configId: string; // Always "crystal-reference" (partition key)
  docType: "crystal"; // Discriminator

  // Basic Info
  name: string; // Display name, e.g., "Amethyst"
  alternateNames: string[]; // ["Chevron Amethyst", "Brandberg Amethyst"]
  description: string; // Rich text description

  // Physical Properties
  colors: crystal_color[];
  crystalSystem?: crystal_system;
  mohsHardness?: number; // 1-10 scale
  commonForms: crystal_form[];

  // Metaphysical Properties
  chakras: chakra_type[];
  elements: element_type[];
  zodiacSigns: zodiac_sign[];
  planetaryAssociation?: string; // "Jupiter", "Moon", etc.
  numerology?: number; // 1-9

  // Uses & Meanings
  primaryProperties: string[]; // ["intuition", "calm", "spiritual_awareness"]
  emotionalUses: string[]; // ["anxiety relief", "grief support"]
  spiritualUses: string[]; // ["meditation", "psychic development"]
  physicalAssociations: string[]; // ["headaches", "sleep"] - NOT medical claims

  // Care Instructions
  cleansingMethods: cleansing_method[];
  chargingMethods: charging_method[];
  avoidMethods: string[]; // ["prolonged_sunlight", "salt_water"]
  careNotes?: string; // Additional care instructions

  // Source Information
  localities: string[]; // ["Brazil", "Uruguay", "Madagascar"]

  // Media
  thumbnail?: string; // URL to representative image

  // Metadata
  ref?: recordref_type;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
};

// Input types for mutations
export type create_crystal_reference_input = {
  id?: string; // Auto-generated from name if not provided
  name: string;
  alternateNames?: string[];
  description: string;
  colors: crystal_color[];
  crystalSystem?: crystal_system;
  mohsHardness?: number;
  commonForms: crystal_form[];
  chakras: chakra_type[];
  elements: element_type[];
  zodiacSigns: zodiac_sign[];
  planetaryAssociation?: string;
  numerology?: number;
  primaryProperties: string[];
  emotionalUses?: string[];
  spiritualUses?: string[];
  physicalAssociations?: string[];
  cleansingMethods: cleansing_method[];
  chargingMethods: charging_method[];
  avoidMethods?: string[];
  careNotes?: string;
  localities: string[];
  thumbnail?: string;
};

export type update_crystal_reference_input = {
  id: string;
  name?: string;
  alternateNames?: string[];
  description?: string;
  colors?: crystal_color[];
  crystalSystem?: crystal_system;
  mohsHardness?: number;
  commonForms?: crystal_form[];
  chakras?: chakra_type[];
  elements?: element_type[];
  zodiacSigns?: zodiac_sign[];
  planetaryAssociation?: string;
  numerology?: number;
  primaryProperties?: string[];
  emotionalUses?: string[];
  spiritualUses?: string[];
  physicalAssociations?: string[];
  cleansingMethods?: cleansing_method[];
  chargingMethods?: charging_method[];
  avoidMethods?: string[];
  careNotes?: string;
  localities?: string[];
  thumbnail?: string;
};

// Query filter types
export type crystal_reference_filters = {
  search?: string; // Full-text search on name, alternateNames, description
  colors?: crystal_color[];
  chakras?: chakra_type[];
  elements?: element_type[];
  zodiacSigns?: zodiac_sign[];
  properties?: string[]; // Search in primaryProperties
};

// Response types
export type crystal_reference_response = {
  success: boolean;
  message?: string;
  crystal?: crystal_reference_type;
};

export type crystal_reference_list_response = {
  crystals: crystal_reference_type[];
  totalCount: number;
};
