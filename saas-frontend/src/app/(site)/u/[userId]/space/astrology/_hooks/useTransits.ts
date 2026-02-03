'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ZodiacSign, CelestialBody, AspectType } from './useBirthChart';

// ============================================
// Types
// ============================================

export type MoonPhase =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

export interface TransitPosition {
  body: CelestialBody;
  sign: ZodiacSign;
  degree: number;
  absoluteDegree: number;
  retrograde: boolean;
  speed?: number;
}

export interface TransitToNatalAspect {
  transitPlanet: CelestialBody;
  transitSign: ZodiacSign;
  transitDegree: number;
  natalPlanet: CelestialBody;
  natalSign: ZodiacSign;
  natalDegree: number;
  aspect: AspectType;
  orb: number;
  applying: boolean;
  exactDate?: string;
  isActive: boolean;
}

export interface TransitToTransitAspect {
  planet1: CelestialBody;
  planet1Sign: ZodiacSign;
  planet2: CelestialBody;
  planet2Sign: ZodiacSign;
  aspect: AspectType;
  orb: number;
  applying: boolean;
  exactDate?: string;
}

export interface UpcomingTransit {
  transitPlanet: CelestialBody;
  natalPlanet: CelestialBody;
  aspect: AspectType;
  exactDate: string;
  orb: number;
  daysUntilExact: number;
  description?: string;
}

export interface MoonPhaseInfo {
  phase: MoonPhase;
  phaseName: string;
  illumination: number;
  sign: ZodiacSign;
  degree: number;
  nextPhase: MoonPhase;
  nextPhaseDate: string;
}

export interface CurrentTransits {
  calculatedAt: string;
  calculatedFor: string;
  planets: TransitPosition[];
  moonPhase: MoonPhaseInfo;
  transitsToNatal?: TransitToNatalAspect[];
  activeTransits?: TransitToNatalAspect[];
  upcomingTransits?: UpcomingTransit[];
  generalTransits?: TransitToTransitAspect[];
}

export interface TransitsResponse {
  success: boolean;
  message?: string;
  transits?: CurrentTransits;
  hasBirthChart: boolean;
}

export interface GetTransitsInput {
  userId?: string;
  date?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

// ============================================
// GraphQL Fragments
// ============================================

const TRANSIT_FIELDS = `
  calculatedAt
  calculatedFor
  planets {
    body
    sign
    degree
    absoluteDegree
    retrograde
    speed
  }
  moonPhase {
    phase
    phaseName
    illumination
    sign
    degree
    nextPhase
    nextPhaseDate
  }
  transitsToNatal {
    transitPlanet
    transitSign
    transitDegree
    natalPlanet
    natalSign
    natalDegree
    aspect
    orb
    applying
    exactDate
    isActive
  }
  activeTransits {
    transitPlanet
    transitSign
    transitDegree
    natalPlanet
    natalSign
    natalDegree
    aspect
    orb
    applying
    exactDate
    isActive
  }
  upcomingTransits {
    transitPlanet
    natalPlanet
    aspect
    exactDate
    orb
    daysUntilExact
    description
  }
  generalTransits {
    planet1
    planet1Sign
    planet2
    planet2Sign
    aspect
    orb
    applying
    exactDate
  }
`;

// ============================================
// Hooks
// ============================================

export const useCurrentTransits = (input?: GetTransitsInput) => {
  return useQuery({
    queryKey: ['current-transits', input?.userId, input?.date, input?.timezone],
    queryFn: async () => {
      const response = await gql<{
        currentTransits: TransitsResponse;
      }>(`
        query GetCurrentTransits($input: GetTransitsInput) {
          currentTransits(input: $input) {
            success
            message
            hasBirthChart
            transits {
              ${TRANSIT_FIELDS}
            }
          }
        }
      `, { input: input || {} });
      return response.currentTransits;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });
};

// ============================================
// Helper Data
// ============================================

export const MOON_PHASES: { key: MoonPhase; name: string; symbol: string; description: string }[] = [
  { key: 'new', name: 'New Moon', symbol: '🌑', description: 'New beginnings, setting intentions' },
  { key: 'waxing_crescent', name: 'Waxing Crescent', symbol: '🌒', description: 'Building momentum, taking action' },
  { key: 'first_quarter', name: 'First Quarter', symbol: '🌓', description: 'Challenges, decision making' },
  { key: 'waxing_gibbous', name: 'Waxing Gibbous', symbol: '🌔', description: 'Refinement, adjustments' },
  { key: 'full', name: 'Full Moon', symbol: '🌕', description: 'Culmination, manifestation' },
  { key: 'waning_gibbous', name: 'Waning Gibbous', symbol: '🌖', description: 'Gratitude, sharing wisdom' },
  { key: 'last_quarter', name: 'Last Quarter', symbol: '🌗', description: 'Release, letting go' },
  { key: 'waning_crescent', name: 'Waning Crescent', symbol: '🌘', description: 'Rest, reflection' },
];

export const getMoonPhaseInfo = (phase: MoonPhase) => {
  return MOON_PHASES.find(p => p.key === phase);
};

// ============================================
// Transit Descriptions
// ============================================

export const getTransitDescription = (
  transitPlanet: CelestialBody,
  natalPlanet: CelestialBody,
  aspect: AspectType
): string => {
  const transitNames: Record<CelestialBody, string> = {
    sun: 'Sun',
    moon: 'Moon',
    mercury: 'Mercury',
    venus: 'Venus',
    mars: 'Mars',
    jupiter: 'Jupiter',
    saturn: 'Saturn',
    uranus: 'Uranus',
    neptune: 'Neptune',
    pluto: 'Pluto',
    chiron: 'Chiron',
    northnode: 'North Node',
    ascendant: 'Ascendant',
    midheaven: 'Midheaven',
  };

  const aspectDescriptions: Record<AspectType, string> = {
    conjunction: 'merging with',
    sextile: 'harmonizing with',
    square: 'challenging',
    trine: 'flowing with',
    opposition: 'opposing',
  };

  return `Transit ${transitNames[transitPlanet]} ${aspectDescriptions[aspect]} your natal ${transitNames[natalPlanet]}`;
};

// Planet categories for display grouping
export const PERSONAL_PLANETS: CelestialBody[] = ['sun', 'moon', 'mercury', 'venus', 'mars'];
export const SOCIAL_PLANETS: CelestialBody[] = ['jupiter', 'saturn'];
export const OUTER_PLANETS: CelestialBody[] = ['uranus', 'neptune', 'pluto'];
export const POINTS: CelestialBody[] = ['chiron', 'northnode'];

// Speed classifications (for transit timing)
export const PLANET_SPEEDS: Record<CelestialBody, { avgDaysInSign: number; category: 'fast' | 'medium' | 'slow' }> = {
  sun: { avgDaysInSign: 30, category: 'fast' },
  moon: { avgDaysInSign: 2.5, category: 'fast' },
  mercury: { avgDaysInSign: 21, category: 'fast' },
  venus: { avgDaysInSign: 26, category: 'fast' },
  mars: { avgDaysInSign: 57, category: 'medium' },
  jupiter: { avgDaysInSign: 365, category: 'medium' },
  saturn: { avgDaysInSign: 912, category: 'slow' },
  uranus: { avgDaysInSign: 2556, category: 'slow' },
  neptune: { avgDaysInSign: 5110, category: 'slow' },
  pluto: { avgDaysInSign: 7665, category: 'slow' },
  chiron: { avgDaysInSign: 1522, category: 'slow' },
  northnode: { avgDaysInSign: 548, category: 'medium' },
  ascendant: { avgDaysInSign: 0, category: 'fast' },
  midheaven: { avgDaysInSign: 0, category: 'fast' },
};

// Get transit significance (outer planet transits are more significant)
export const getTransitSignificance = (
  transitPlanet: CelestialBody,
  natalPlanet: CelestialBody
): 'high' | 'medium' | 'low' => {
  const transitSpeed = PLANET_SPEEDS[transitPlanet]?.category;

  // Outer planet transits to personal planets are most significant
  if (transitSpeed === 'slow' && PERSONAL_PLANETS.includes(natalPlanet)) {
    return 'high';
  }

  // Saturn/Jupiter to personal planets
  if (transitSpeed === 'medium' && PERSONAL_PLANETS.includes(natalPlanet)) {
    return 'medium';
  }

  // Everything else is low significance (fast transits, etc.)
  return 'low';
};

// Aspect color coding
export const ASPECT_COLORS: Record<AspectType, { bg: string; text: string; border: string }> = {
  conjunction: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  sextile: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  square: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  trine: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  opposition: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
};

// ============================================
// World Transit Descriptions (for GeneralTransits)
// ============================================

// Generic aspect descriptions for fallback
const ASPECT_THEMES: Record<AspectType, { nature: string; keywords: string }> = {
  conjunction: { nature: 'Merging', keywords: 'intensified energy, new cycle beginning' },
  sextile: { nature: 'Harmonious', keywords: 'opportunities, easy flow, cooperation' },
  square: { nature: 'Challenging', keywords: 'tension, growth through friction, action required' },
  trine: { nature: 'Flowing', keywords: 'natural ease, talents activated, good fortune' },
  opposition: { nature: 'Balancing', keywords: 'awareness, finding middle ground, relationships' },
};

// Planet themes for generating descriptions
const PLANET_THEMES: Record<CelestialBody, { domain: string; energy: string }> = {
  sun: { domain: 'identity & vitality', energy: 'self-expression' },
  moon: { domain: 'emotions & needs', energy: 'feelings' },
  mercury: { domain: 'communication & thinking', energy: 'mental activity' },
  venus: { domain: 'love & values', energy: 'relationships' },
  mars: { domain: 'action & drive', energy: 'motivation' },
  jupiter: { domain: 'growth & expansion', energy: 'optimism' },
  saturn: { domain: 'structure & responsibility', energy: 'discipline' },
  uranus: { domain: 'change & innovation', energy: 'breakthroughs' },
  neptune: { domain: 'dreams & spirituality', energy: 'intuition' },
  pluto: { domain: 'transformation & power', energy: 'deep change' },
  chiron: { domain: 'healing & wisdom', energy: 'growth through wounds' },
  northnode: { domain: 'destiny & purpose', energy: 'life direction' },
  ascendant: { domain: 'self-presentation', energy: 'first impressions' },
  midheaven: { domain: 'career & public life', energy: 'ambitions' },
};

// Specific descriptions for major outer planet combinations
const SPECIFIC_WORLD_TRANSITS: Record<string, Record<AspectType, string>> = {
  'saturn-uranus': {
    conjunction: 'Old structures meet innovation. Time to build the future on solid foundations.',
    sextile: 'Opportunities to modernize traditions. Practical innovation flows more easily.',
    square: 'Tension between stability and change. Existing structures feel restrictive.',
    trine: 'Positive integration of old and new. Progressive changes feel natural.',
    opposition: 'Push-pull between security and freedom. Finding balance between tradition and progress.',
  },
  'saturn-neptune': {
    conjunction: 'Dreams meet reality. Time to give form to ideals or face disillusionment.',
    sextile: 'Practical spirituality. Opportunities to manifest dreams through discipline.',
    square: 'Confusion vs clarity. Reality checks on ideals. Boundaries may feel unclear.',
    trine: 'Spiritual discipline flows easily. Dreams can be practically realized.',
    opposition: 'Idealism vs pragmatism. Navigating between fantasy and harsh reality.',
  },
  'saturn-pluto': {
    conjunction: 'Major restructuring of power. Intense pressure to transform foundations.',
    sextile: 'Opportunities for deep, lasting change. Power structures can shift positively.',
    square: 'Power struggles and control issues. Old systems under intense pressure.',
    trine: 'Empowered transformation. Deep changes feel manageable and productive.',
    opposition: 'Confronting power dynamics. Major shifts in authority and control.',
  },
  'jupiter-saturn': {
    conjunction: 'New 20-year social cycle begins. Expansion meets structure.',
    sextile: 'Growth within limits. Opportunities for sustainable expansion.',
    square: 'Tension between growth and caution. Optimism vs realism.',
    trine: 'Balanced growth. Expansion feels stable and well-supported.',
    opposition: 'Finding balance between risk and security. Growth meets reality check.',
  },
  'jupiter-uranus': {
    conjunction: 'Sudden breakthroughs and lucky surprises. Innovation expands rapidly.',
    sextile: 'Opportunities for positive change. New ideas gain traction easily.',
    square: 'Restless energy for change. Risk of overextending or recklessness.',
    trine: 'Freedom and growth align beautifully. Exciting opportunities flow.',
    opposition: 'Balancing freedom with excess. Big changes may feel unstable.',
  },
  'jupiter-neptune': {
    conjunction: 'Spiritual expansion and heightened idealism. Dreams feel limitless.',
    sextile: 'Creative and spiritual opportunities. Imagination flows productively.',
    square: 'Beware of over-idealism or escapism. Boundaries may blur.',
    trine: 'Faith and optimism align. Spiritual growth feels natural.',
    opposition: 'Idealism meets reality. Discernment needed between hope and delusion.',
  },
  'jupiter-pluto': {
    conjunction: 'Intense ambition and transformation. Power can expand dramatically.',
    sextile: 'Opportunities for empowerment. Positive transformation through growth.',
    square: 'Power struggles may intensify. Watch for excess or manipulation.',
    trine: 'Empowered growth. Transformation feels abundant and positive.',
    opposition: 'Confronting power and truth. Major shifts in beliefs and resources.',
  },
  'uranus-neptune': {
    conjunction: 'Generational shift in consciousness. Spiritual and technological awakening.',
    sextile: 'Innovative spirituality. Technology and intuition work together.',
    square: 'Confusion meets chaos. Ideals clash with desire for change.',
    trine: 'Inspired innovation. Creativity and intuition blend harmoniously.',
    opposition: 'Balancing dreams with revolution. Spiritual vs technological tension.',
  },
  'uranus-pluto': {
    conjunction: 'Revolutionary transformation. Intense generational upheaval and rebirth.',
    sextile: 'Opportunities for radical positive change. Evolution through innovation.',
    square: 'Intense pressure for change. Power structures face disruption.',
    trine: 'Transformative breakthroughs. Deep change feels liberating.',
    opposition: 'Revolution vs control. Major collective transformation underway.',
  },
  'neptune-pluto': {
    conjunction: 'Massive generational shift. Spiritual transformation at deepest level.',
    sextile: 'Subtle but profound evolution. Spiritual and psychological growth opportunities.',
    square: 'Deep unconscious tension. Spiritual crises may surface collectively.',
    trine: 'Profound spiritual evolution. Transformation flows from the depths.',
    opposition: 'Collective shadow work. Confronting deepest fears and illusions.',
  },
};

/**
 * Get a beginner-friendly description for a world transit (planet-to-planet aspect)
 */
export const getWorldTransitDescription = (
  planet1: CelestialBody,
  planet2: CelestialBody,
  aspect: AspectType
): string => {
  // Normalize the key (always put slower planet second for consistent lookup)
  const planetOrder: CelestialBody[] = ['moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'chiron', 'uranus', 'neptune', 'pluto'];
  const idx1 = planetOrder.indexOf(planet1);
  const idx2 = planetOrder.indexOf(planet2);

  const [faster, slower] = idx1 < idx2 ? [planet1, planet2] : [planet2, planet1];
  const key = `${faster}-${slower}`;

  // Check for specific description
  if (SPECIFIC_WORLD_TRANSITS[key]?.[aspect]) {
    return SPECIFIC_WORLD_TRANSITS[key][aspect];
  }

  // Generate a generic description based on planet themes and aspect nature
  const theme1 = PLANET_THEMES[planet1];
  const theme2 = PLANET_THEMES[planet2];
  const aspectTheme = ASPECT_THEMES[aspect];

  if (theme1 && theme2 && aspectTheme) {
    return `${aspectTheme.nature} energy between ${theme1.domain} and ${theme2.domain}. ${aspectTheme.keywords}.`;
  }

  // Fallback
  return `${aspectTheme?.nature || 'Dynamic'} aspect bringing ${aspectTheme?.keywords || 'change'}.`;
};
