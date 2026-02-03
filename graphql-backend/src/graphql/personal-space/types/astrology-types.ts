import { recordref_type } from "../../0_shared/types";
// Import shared zodiac_sign from crystal-reference (no re-export to avoid duplicates)
import type { zodiac_sign } from "../../crystal-reference/types";

// ============================================
// Astrology Types
// ============================================

// Celestial bodies calculated in the chart
export type celestial_body =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'chiron'
  | 'northnode'
  | 'ascendant'
  | 'midheaven';

// Major aspects
export type aspect_type =
  | 'conjunction'   // 0°
  | 'sextile'       // 60°
  | 'square'        // 90°
  | 'trine'         // 120°
  | 'opposition';   // 180°

// Birth time precision
export type birth_time_precision =
  | 'exact'           // User knows exact time
  | 'approximate'     // User knows approximate range
  | 'unknown';        // User doesn't know time

// Approximate time ranges
export type approximate_time_range =
  | 'morning'      // 6am - 12pm, midpoint 9am
  | 'afternoon'    // 12pm - 6pm, midpoint 3pm
  | 'evening'      // 6pm - 12am, midpoint 9pm
  | 'night';       // 12am - 6am, midpoint 3am

// ============================================
// Birth Location
// ============================================

export interface birth_location_type {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;      // IANA timezone e.g. "Australia/Melbourne"
  note?: string;         // Optional note e.g. "Born in small town near..."
}

// ============================================
// Planetary Position
// ============================================

export interface planet_position_type {
  body: celestial_body;
  sign: zodiac_sign;
  degree: number;           // 0-29.99 within sign
  absoluteDegree: number;   // 0-359.99 in zodiac
  house?: number;           // 1-12, only if birth time known
  retrograde: boolean;
}

// ============================================
// House Cusp
// ============================================

export interface house_cusp_type {
  house: number;          // 1-12
  sign: zodiac_sign;
  degree: number;         // Degree within sign
}

// ============================================
// Aspect
// ============================================

export interface aspect_data_type {
  body1: celestial_body;
  body2: celestial_body;
  aspect: aspect_type;
  orb: number;            // How far from exact (in degrees)
  applying: boolean;      // Is the aspect applying or separating
}

// ============================================
// Birth Chart (Main Document)
// ============================================

export interface birth_chart_type {
  id: string;
  userId: string;
  docType: 'BIRTH_CHART';

  // Birth data (user input)
  birthDate: string;                           // ISO date "1985-03-15"
  birthTimePrecision: birth_time_precision;
  birthTime?: string;                          // "14:30" if exact
  birthTimeApproximate?: approximate_time_range; // if approximate
  birthLocation: birth_location_type;

  // Calculated chart data
  calculatedAt: string;
  planets: planet_position_type[];
  houses?: house_cusp_type[];                  // Only if birth time known/approximate
  aspects: aspect_data_type[];

  // Convenience fields for quick display
  sunSign: zodiac_sign;
  moonSign: zodiac_sign;
  risingSign?: zodiac_sign;                    // Only if birth time known

  // Flags
  housesAreApproximate?: boolean;              // True if using approximate birth time
  moonMayBeInaccurate?: boolean;               // True if moon changed signs that day

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// City Search Result
// ============================================

export interface city_search_result_type {
  id: string;            // Unique ID for the city
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population?: number;
  adminRegion?: string;  // State/province
}

// ============================================
// Input Types
// ============================================

export interface birth_location_input {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  note?: string;
}

export interface create_birth_chart_input {
  userId: string;
  birthDate: string;
  birthTimePrecision: birth_time_precision;
  birthTime?: string;
  birthTimeApproximate?: approximate_time_range;
  birthLocation: birth_location_input;
}

export interface update_birth_chart_input {
  id: string;
  userId: string;
  birthDate?: string;
  birthTimePrecision?: birth_time_precision;
  birthTime?: string;
  birthTimeApproximate?: approximate_time_range;
  birthLocation?: birth_location_input;
}

// ============================================
// Response Types
// ============================================

export interface birth_chart_response {
  success: boolean;
  message?: string;
  birthChart?: birth_chart_type;
}

export interface city_search_response {
  cities: city_search_result_type[];
}

// ============================================
// Transit Types
// ============================================

// Moon phases
export type moon_phase =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

// Transit planet position (current sky position)
export interface transit_position_type {
  body: celestial_body;
  sign: zodiac_sign;
  degree: number;           // 0-29.99 within sign
  absoluteDegree: number;   // 0-359.99 in zodiac
  retrograde: boolean;
  speed?: number;           // Degrees per day (for calculating ingress)
}

// Aspect between a transit planet and a natal planet
export interface transit_to_natal_aspect_type {
  transitPlanet: celestial_body;
  transitSign: zodiac_sign;
  transitDegree: number;
  natalPlanet: celestial_body;
  natalSign: zodiac_sign;
  natalDegree: number;
  aspect: aspect_type;
  orb: number;
  applying: boolean;        // Is the aspect getting tighter?
  exactDate?: string;       // When the aspect becomes exact (if applying)
  isActive: boolean;        // Within active orb threshold
}

// Moon phase information
export interface moon_phase_info_type {
  phase: moon_phase;
  phaseName: string;        // Human readable name
  illumination: number;     // 0-100 percentage
  sign: zodiac_sign;
  degree: number;
  nextPhase: moon_phase;
  nextPhaseDate: string;
}

// Full transit response (for today's transits)
export interface current_transits_type {
  calculatedAt: string;
  calculatedFor: string;    // Date transits were calculated for

  // Current planetary positions
  planets: transit_position_type[];

  // Moon phase
  moonPhase: moon_phase_info_type;

  // Transits to natal chart (only if birth chart exists)
  transitsToNatal?: transit_to_natal_aspect_type[];

  // Active transits (within tight orb - 3° applying, 1° separating)
  activeTransits?: transit_to_natal_aspect_type[];

  // Upcoming transits (aspects perfecting in next 7 days)
  upcomingTransits?: upcoming_transit_type[];

  // General transits (planet-to-planet in the sky)
  generalTransits?: transit_to_transit_aspect_type[];
}

// Upcoming transit prediction
export interface upcoming_transit_type {
  transitPlanet: celestial_body;
  natalPlanet: celestial_body;
  aspect: aspect_type;
  exactDate: string;
  orb: number;
  daysUntilExact: number;
  description?: string;
}

// Transit planet to transit planet aspects (current sky)
export interface transit_to_transit_aspect_type {
  planet1: celestial_body;
  planet1Sign: zodiac_sign;
  planet2: celestial_body;
  planet2Sign: zodiac_sign;
  aspect: aspect_type;
  orb: number;
  applying: boolean;
  exactDate?: string;
}

// Input for getting transits (optional date override)
export interface get_transits_input {
  userId?: string;          // If provided, compares to user's natal chart
  date?: string;            // ISO date, defaults to today
  timezone?: string;        // IANA timezone for calculations
  latitude?: number;        // For local moon calculations
  longitude?: number;
}

// Response type
export interface transits_response {
  success: boolean;
  message?: string;
  transits?: current_transits_type;
  hasBirthChart: boolean;   // Whether we have a birth chart to compare against
}

// ============================================
// Astrology Journal Types
// ============================================

// Mood options for journal entries
export type journal_mood =
  | 'heavy'
  | 'energised'
  | 'reflective'
  | 'anxious'
  | 'peaceful'
  | 'confused';

// Snapshot of active transit at time of entry
export interface transit_snapshot_aspect {
  transitingBody: celestial_body;
  natalBody: celestial_body;
  aspect: aspect_type;
  orb: number;
}

// Transit snapshot captured at time of journal entry
export interface transit_snapshot_type {
  moonSign: zodiac_sign;
  moonPhase: moon_phase;
  moonPhaseName: string;
  activeTransits: transit_snapshot_aspect[];
  retrogradePlanets: celestial_body[];
  capturedAt: string;
}

// Astrology journal entry
export interface astrology_journal_entry_type {
  id: string;
  userId: string;
  docType: 'ASTROLOGY_JOURNAL_ENTRY';

  // Auto-populated transit context
  transitSnapshot: transit_snapshot_type;

  // User input
  promptShown?: string;           // The prompt displayed, if any
  promptDismissed: boolean;       // Whether user dismissed the prompt
  content: string;                // Main journal text

  // Optional tags
  planetaryThemes: celestial_body[];  // User-selected planets
  mood?: journal_mood;

  // Linking
  linkedReadingId?: string;       // If reflecting on a specific reading

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: {
    id: string;
    partition: string[];
    container: string;
  };
}

// Input for creating a journal entry
export interface create_astrology_journal_input {
  userId: string;
  content: string;
  promptShown?: string;
  promptDismissed?: boolean;
  planetaryThemes?: celestial_body[];
  mood?: journal_mood;
  linkedReadingId?: string;
}

// Input for updating a journal entry
export interface update_astrology_journal_input {
  id: string;
  userId: string;
  content?: string;
  planetaryThemes?: celestial_body[];
  mood?: journal_mood;
  linkedReadingId?: string;
}

// Filters for querying journal entries
export interface astrology_journal_filters {
  startDate?: string;
  endDate?: string;
  planetaryThemes?: celestial_body[];  // Filter by tagged planets
  mood?: journal_mood;
  hasLinkedReading?: boolean;
  duringRetrograde?: celestial_body;   // e.g., 'mercury' for Mercury retrograde entries
  moonSign?: zodiac_sign;
  moonPhase?: moon_phase;
  limit?: number;
  offset?: number;
}

// Response type
export interface astrology_journal_response {
  success: boolean;
  message?: string;
  entry?: astrology_journal_entry_type;
}

// Prompt data
export interface journal_prompt_type {
  id: string;
  category: 'moon_sign' | 'planetary_transit' | 'retrograde' | 'general';
  triggerBody?: celestial_body;
  triggerSign?: zodiac_sign;
  prompt: string;
}
