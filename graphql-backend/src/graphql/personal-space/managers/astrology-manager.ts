import { CosmosDataSource } from "../../../utils/database";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import { Origin, Horoscope } from "circular-natal-horoscope-js";
import cityTimezones from "city-timezones";
import {
  birth_chart_type,
  birth_chart_response,
  create_birth_chart_input,
  update_birth_chart_input,
  city_search_result_type,
  planet_position_type,
  house_cusp_type,
  aspect_data_type,
  celestial_body,
  aspect_type,
  birth_time_precision,
  approximate_time_range,
  birth_location_type,
  transit_position_type,
  transit_to_natal_aspect_type,
  transit_to_transit_aspect_type,
  upcoming_transit_type,
  moon_phase_info_type,
  moon_phase,
  current_transits_type,
  transits_response,
  get_transits_input,
  // Journal types
  astrology_journal_entry_type,
  astrology_journal_response,
  create_astrology_journal_input,
  update_astrology_journal_input,
  astrology_journal_filters,
  transit_snapshot_type,
  transit_snapshot_aspect,
  journal_mood,
  journal_prompt_type,
} from "../types/astrology-types";
import { zodiac_sign } from "../../crystal-reference/types";

// Sign order for degree calculation
const SIGNS: zodiac_sign[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

// Map library planet keys to our celestial body types
const PLANET_MAP: Record<string, celestial_body> = {
  'sun': 'sun',
  'moon': 'moon',
  'mercury': 'mercury',
  'venus': 'venus',
  'mars': 'mars',
  'jupiter': 'jupiter',
  'saturn': 'saturn',
  'uranus': 'uranus',
  'neptune': 'neptune',
  'pluto': 'pluto',
  'chiron': 'chiron',
  'northnode': 'northnode',
};

// Aspect orbs
const ASPECT_ORBS = {
  sun: 8,
  moon: 8,
  default: 6,
};

// Aspect definitions
const ASPECTS: { name: aspect_type; angle: number }[] = [
  { name: 'conjunction', angle: 0 },
  { name: 'sextile', angle: 60 },
  { name: 'square', angle: 90 },
  { name: 'trine', angle: 120 },
  { name: 'opposition', angle: 180 },
];

// Transit-specific orbs (tighter than natal)
const TRANSIT_ORBS = {
  applying: 3,   // 3° when applying (getting tighter)
  separating: 1, // 1° when separating (moving away)
  active: 3,     // Considered "active" within 3°
  upcoming: 5,   // Look for aspects within 5° for upcoming
};

// Moon phase names
const MOON_PHASE_NAMES: Record<moon_phase, string> = {
  'new': 'New Moon',
  'waxing_crescent': 'Waxing Crescent',
  'first_quarter': 'First Quarter',
  'waxing_gibbous': 'Waxing Gibbous',
  'full': 'Full Moon',
  'waning_gibbous': 'Waning Gibbous',
  'last_quarter': 'Last Quarter',
  'waning_crescent': 'Waning Crescent',
};

// Transit planets to track (excluding ascendant/midheaven which are location-specific)
const TRANSIT_BODIES: celestial_body[] = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'chiron', 'northnode'
];

// Simple in-memory cache for transit positions
// Key format: "YYYY-MM-DD-HH" (hourly granularity)
const transitCache: Map<string, { positions: transit_position_type[]; timestamp: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Clean old cache entries periodically
const cleanCache = () => {
  const now = Date.now();
  for (const [key, value] of transitCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      transitCache.delete(key);
    }
  }
};

// ============================================
// Journal Prompts
// ============================================

const MOON_SIGN_PROMPTS: Record<zodiac_sign, string> = {
  aries: "Where do you feel impatient or ready to act?",
  taurus: "What feels stable right now? What needs grounding?",
  gemini: "What's on your mind? What conversations are circling?",
  cancer: "What emotions are surfacing? What needs nurturing?",
  leo: "Where do you want to be seen? What are you proud of?",
  virgo: "What details are you noticing? What needs organising?",
  libra: "What relationships are on your mind? Where do you seek balance?",
  scorpio: "What's beneath the surface? What intensity are you feeling?",
  sagittarius: "What are you curious about? Where do you want to expand?",
  capricorn: "What are you working toward? What responsibilities weigh on you?",
  aquarius: "What ideas are exciting you? Where do you want change?",
  pisces: "What are you feeling intuitively? What dreams are present?",
};

const PLANETARY_TRANSIT_PROMPTS: Partial<Record<celestial_body, string>> = {
  saturn: "What feels heavy, slow, or like hard work right now?",
  jupiter: "Where do you sense growth or opportunity?",
  mars: "What's driving you? Where do you feel friction or motivation?",
  venus: "What are you drawn to? What do you value right now?",
  mercury: "What thoughts keep returning? What needs to be communicated?",
  pluto: "What transformation is occurring? What needs to be released?",
  uranus: "Where do you crave freedom? What unexpected changes are happening?",
  neptune: "What are you dreaming about? Where do boundaries feel blurred?",
};

const RETROGRADE_PROMPTS: Partial<Record<celestial_body, string>> = {
  mercury: "What's being reviewed or revisited from your past?",
  venus: "What relationships or values are you reconsidering?",
  mars: "Where has your energy or motivation shifted?",
};

/**
 * Astrology Manager
 *
 * Handles birth chart storage and calculation:
 * - Store natal chart data
 * - Calculate planetary positions using Swiss Ephemeris
 * - Search cities database
 */
export class AstrologyManager {
  private cosmos: CosmosDataSource;
  private readonly containerName = "Main-PersonalSpace";

  constructor(cosmos: CosmosDataSource) {
    this.cosmos = cosmos;
  }

  // ============================================
  // CITY SEARCH
  // ============================================

  async searchCities(query: string, limit: number = 20): Promise<city_search_result_type[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      // Search using city-timezones package
      const results = cityTimezones.lookupViaCity(query);

      // Take top results by population
      const sorted = results
        .sort((a, b) => (b.pop || 0) - (a.pop || 0))
        .slice(0, limit);

      return sorted.map((city) => ({
        id: `${city.city_ascii}-${city.iso2}-${city.province}`,
        city: city.city,
        country: city.country,
        countryCode: city.iso2,
        latitude: city.lat,
        longitude: city.lng,
        timezone: city.timezone,
        population: city.pop,
        adminRegion: city.province,
      }));
    } catch (error) {
      console.error('City search error:', error);
      return [];
    }
  }

  // ============================================
  // BIRTH CHART CRUD
  // ============================================

  async getBirthChart(userId: string): Promise<birth_chart_type | null> {
    const query = {
      query: "SELECT * FROM c WHERE c.userId = @userId AND c.docType = 'BIRTH_CHART'",
      parameters: [{ name: "@userId", value: userId }],
    };

    const results = await this.cosmos.run_query<birth_chart_type>(
      this.containerName,
      query
    );

    if (results.length === 0) return null;

    return {
      ...results[0],
      ref: { id: results[0].id, partition: [userId], container: this.containerName },
    };
  }

  async createBirthChart(
    input: create_birth_chart_input,
    authenticatedUserId: string
  ): Promise<birth_chart_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    // Check if user already has a birth chart
    const existing = await this.getBirthChart(input.userId);
    if (existing) {
      return { success: false, message: "Birth chart already exists. Use update instead." };
    }

    // Calculate the chart
    const chartData = this.calculateChart(
      input.birthDate,
      input.birthTimePrecision,
      input.birthTime,
      input.birthTimeApproximate,
      input.birthLocation
    );

    const now = DateTime.now().toISO()!;
    const birthChart: birth_chart_type = {
      id: uuid(),
      userId: input.userId,
      docType: 'BIRTH_CHART',
      birthDate: input.birthDate,
      birthTimePrecision: input.birthTimePrecision,
      birthTime: input.birthTime,
      birthTimeApproximate: input.birthTimeApproximate,
      birthLocation: input.birthLocation,
      calculatedAt: now,
      planets: chartData.planets,
      houses: chartData.houses,
      aspects: chartData.aspects,
      sunSign: chartData.sunSign,
      moonSign: chartData.moonSign,
      risingSign: chartData.risingSign,
      housesAreApproximate: input.birthTimePrecision === 'approximate',
      moonMayBeInaccurate: chartData.moonMayBeInaccurate,
      createdAt: now,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(
      this.containerName,
      birthChart.id,
      birthChart,
      [input.userId]
    );

    return {
      success: true,
      birthChart: {
        ...birthChart,
        ref: { id: birthChart.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async updateBirthChart(
    input: update_birth_chart_input,
    authenticatedUserId: string
  ): Promise<birth_chart_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const existing = await this.getBirthChart(input.userId);
    if (!existing) {
      return { success: false, message: "Birth chart not found" };
    }

    // Merge updates
    const birthDate = input.birthDate ?? existing.birthDate;
    const birthTimePrecision = input.birthTimePrecision ?? existing.birthTimePrecision;
    const birthTime = input.birthTime ?? existing.birthTime;
    const birthTimeApproximate = input.birthTimeApproximate ?? existing.birthTimeApproximate;
    const birthLocation = input.birthLocation ?? existing.birthLocation;

    // Recalculate the chart
    const chartData = this.calculateChart(
      birthDate,
      birthTimePrecision,
      birthTime,
      birthTimeApproximate,
      birthLocation
    );

    const now = DateTime.now().toISO()!;
    const updates: Partial<birth_chart_type> = {
      birthDate,
      birthTimePrecision,
      birthTime,
      birthTimeApproximate,
      birthLocation,
      calculatedAt: now,
      planets: chartData.planets,
      houses: chartData.houses,
      aspects: chartData.aspects,
      sunSign: chartData.sunSign,
      moonSign: chartData.moonSign,
      risingSign: chartData.risingSign,
      housesAreApproximate: birthTimePrecision === 'approximate',
      moonMayBeInaccurate: chartData.moonMayBeInaccurate,
      updatedAt: now,
    };

    await this.cosmos.update_record(
      this.containerName,
      existing.id,
      input.userId,
      updates,
      authenticatedUserId
    );

    const updated: birth_chart_type = {
      ...existing,
      ...updates,
    };

    return {
      success: true,
      birthChart: {
        ...updated,
        ref: { id: updated.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async deleteBirthChart(
    id: string,
    userId: string,
    authenticatedUserId: string
  ): Promise<{ success: boolean; message?: string }> {
    if (userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const existing = await this.getBirthChart(userId);
    if (!existing || existing.id !== id) {
      return { success: false, message: "Birth chart not found" };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);

    return { success: true };
  }

  // ============================================
  // CHART CALCULATION
  // ============================================

  private calculateChart(
    birthDate: string,
    birthTimePrecision: birth_time_precision,
    birthTime?: string,
    birthTimeApproximate?: approximate_time_range,
    birthLocation?: birth_location_type
  ): {
    planets: planet_position_type[];
    houses?: house_cusp_type[];
    aspects: aspect_data_type[];
    sunSign: zodiac_sign;
    moonSign: zodiac_sign;
    risingSign?: zodiac_sign;
    moonMayBeInaccurate?: boolean;
  } {
    // Parse birth date
    const [year, month, day] = birthDate.split('-').map(Number);

    // Determine time to use for calculation
    let hour = 12;
    let minute = 0;
    let calculateHouses = false;

    if (birthTimePrecision === 'exact' && birthTime) {
      const [h, m] = birthTime.split(':').map(Number);
      hour = h;
      minute = m;
      calculateHouses = true;
    } else if (birthTimePrecision === 'approximate' && birthTimeApproximate) {
      // Use midpoint of range
      const midpoints: Record<approximate_time_range, number> = {
        'morning': 9,
        'afternoon': 15,
        'evening': 21,
        'night': 3,
      };
      hour = midpoints[birthTimeApproximate];
      calculateHouses = true; // Calculate but mark as approximate
    }
    // For 'unknown', we use noon (12:00) and don't calculate houses

    // Create Origin for the calculation
    const origin = new Origin({
      year,
      month: month - 1, // Library uses 0-indexed months
      date: day,
      hour,
      minute,
      latitude: birthLocation?.latitude || 0,
      longitude: birthLocation?.longitude || 0,
    });

    // Create Horoscope
    const horoscope = new Horoscope({
      origin,
      houseSystem: 'placidus',
      zodiac: 'tropical',
      aspectPoints: ['bodies', 'points', 'angles'],
      aspectWithPoints: ['bodies', 'points', 'angles'],
      aspectTypes: ['major'],
      customOrbs: {},
      language: 'en',
    });

    // Extract planetary positions
    const planets: planet_position_type[] = [];
    let sunSign: zodiac_sign = 'aries';
    let moonSign: zodiac_sign = 'aries';
    let risingSign: zodiac_sign | undefined;
    let moonMayBeInaccurate = false;

    // Get celestial bodies - CelestialBodies.all is an array, each item has a .key property
    if (horoscope.CelestialBodies?.all) {
      for (const bodyData of horoscope.CelestialBodies.all as any[]) {
        const planetKey = bodyData.key?.toLowerCase();
        if (planetKey && PLANET_MAP[planetKey]) {
          const sign = bodyData.Sign?.key?.toLowerCase() as zodiac_sign;
          const degree = bodyData.ChartPosition?.Ecliptic?.DecimalDegrees % 30;
          const absoluteDegree = bodyData.ChartPosition?.Ecliptic?.DecimalDegrees;

          const position: planet_position_type = {
            body: PLANET_MAP[planetKey],
            sign: sign || 'aries',
            degree: Math.round(degree * 100) / 100,
            absoluteDegree: Math.round(absoluteDegree * 100) / 100,
            retrograde: bodyData.isRetrograde || false,
          };

          // Add house if we're calculating houses
          if (calculateHouses && bodyData.House) {
            position.house = typeof bodyData.House === 'object' ? bodyData.House.id : bodyData.House;
          }

          planets.push(position);

          // Track sun and moon signs
          if (planetKey === 'sun') sunSign = sign || 'aries';
          if (planetKey === 'moon') moonSign = sign || 'aries';
        }
      }
    }

    // Get Ascendant (Rising Sign)
    if (calculateHouses && horoscope.Ascendant) {
      const ascData = horoscope.Ascendant as any;
      risingSign = ascData.Sign?.key?.toLowerCase() as zodiac_sign;

      planets.push({
        body: 'ascendant',
        sign: risingSign || 'aries',
        degree: Math.round((ascData.ChartPosition?.Ecliptic?.DecimalDegrees % 30) * 100) / 100,
        absoluteDegree: Math.round(ascData.ChartPosition?.Ecliptic?.DecimalDegrees * 100) / 100,
        retrograde: false,
        house: 1,
      });
    }

    // Get Midheaven
    if (calculateHouses && horoscope.Midheaven) {
      const mcData = horoscope.Midheaven as any;
      planets.push({
        body: 'midheaven',
        sign: mcData.Sign?.key?.toLowerCase() as zodiac_sign || 'aries',
        degree: Math.round((mcData.ChartPosition?.Ecliptic?.DecimalDegrees % 30) * 100) / 100,
        absoluteDegree: Math.round(mcData.ChartPosition?.Ecliptic?.DecimalDegrees * 100) / 100,
        retrograde: false,
        house: 10,
      });
    }

    // Get house cusps
    let houses: house_cusp_type[] | undefined;
    if (calculateHouses && horoscope.Houses) {
      houses = [];
      for (let i = 0; i < horoscope.Houses.length; i++) {
        const houseData = horoscope.Houses[i] as any;
        houses.push({
          house: i + 1,
          sign: houseData.Sign?.key?.toLowerCase() as zodiac_sign || 'aries',
          degree: Math.round((houseData.ChartPosition?.StartPosition?.Ecliptic?.DecimalDegrees % 30) * 100) / 100,
        });
      }
    }

    // Calculate aspects
    const aspects = this.calculateAspects(planets);

    // Check if moon might be inaccurate (if it's close to sign boundary and time is unknown)
    if (birthTimePrecision === 'unknown') {
      const moonPos = planets.find(p => p.body === 'moon');
      if (moonPos) {
        // Moon moves ~13° per day, so if degree < 6.5 or > 23.5, it might have changed signs
        if (moonPos.degree < 6.5 || moonPos.degree > 23.5) {
          moonMayBeInaccurate = true;
        }
      }
    }

    return {
      planets,
      houses,
      aspects,
      sunSign,
      moonSign,
      risingSign,
      moonMayBeInaccurate,
    };
  }

  private calculateAspects(planets: planet_position_type[]): aspect_data_type[] {
    const aspects: aspect_data_type[] = [];
    const mainBodies = planets.filter(p =>
      !['ascendant', 'midheaven'].includes(p.body) ||
      ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'].includes(p.body)
    );

    for (let i = 0; i < mainBodies.length; i++) {
      for (let j = i + 1; j < mainBodies.length; j++) {
        const p1 = mainBodies[i];
        const p2 = mainBodies[j];

        // Calculate angular distance
        let distance = Math.abs(p1.absoluteDegree - p2.absoluteDegree);
        if (distance > 180) distance = 360 - distance;

        // Determine orb based on planets involved
        const orb = (p1.body === 'sun' || p1.body === 'moon' ||
                    p2.body === 'sun' || p2.body === 'moon')
          ? ASPECT_ORBS.sun
          : ASPECT_ORBS.default;

        // Check each aspect type
        for (const aspectDef of ASPECTS) {
          const orbUsed = Math.abs(distance - aspectDef.angle);
          if (orbUsed <= orb) {
            // Determine if applying or separating
            // (simplified: based on faster planet approaching or moving away)
            const applying = p1.absoluteDegree < p2.absoluteDegree;

            aspects.push({
              body1: p1.body,
              body2: p2.body,
              aspect: aspectDef.name,
              orb: Math.round(orbUsed * 100) / 100,
              applying,
            });
            break; // Only one aspect per pair
          }
        }
      }
    }

    return aspects;
  }

  // ============================================
  // TRANSIT CALCULATIONS
  // ============================================

  async getTransits(
    input: get_transits_input,
    authenticatedUserId?: string
  ): Promise<transits_response> {
    try {
      // Get user's birth chart if userId provided
      let birthChart: birth_chart_type | null = null;
      if (input.userId && authenticatedUserId && input.userId === authenticatedUserId) {
        birthChart = await this.getBirthChart(input.userId);
      }

      // Determine the date for calculations
      const targetDate = input.date
        ? DateTime.fromISO(input.date, { zone: input.timezone || 'UTC' })
        : DateTime.now().setZone(input.timezone || 'UTC');

      // Calculate current planetary positions
      const currentPositions = this.calculateCurrentPositions(targetDate);

      // Calculate moon phase
      const moonPhase = this.calculateMoonPhase(targetDate, currentPositions);

      // Build the response
      const transits: current_transits_type = {
        calculatedAt: DateTime.now().toISO()!,
        calculatedFor: targetDate.toISODate()!,
        planets: currentPositions,
        moonPhase,
      };

      // If we have a birth chart, calculate transits to natal
      if (birthChart) {
        const transitsToNatal = this.calculateTransitsToNatal(
          currentPositions,
          birthChart.planets
        );

        // Filter to active transits (within tight orb)
        const activeTransits = transitsToNatal.filter(t => t.isActive);

        // Calculate upcoming transits (perfecting in next 7 days)
        const upcomingTransits = this.calculateUpcomingTransits(
          currentPositions,
          birthChart.planets,
          targetDate
        );

        transits.transitsToNatal = transitsToNatal;
        transits.activeTransits = activeTransits;
        transits.upcomingTransits = upcomingTransits;
      }

      // Calculate general transits (planet-to-planet in sky)
      transits.generalTransits = this.calculateGeneralTransits(currentPositions);

      return {
        success: true,
        transits,
        hasBirthChart: !!birthChart,
      };
    } catch (error) {
      console.error('Error calculating transits:', error);
      return {
        success: false,
        message: 'Failed to calculate transits',
        hasBirthChart: false,
      };
    }
  }

  private calculateCurrentPositions(date: DateTime): transit_position_type[] {
    // Check cache first (hourly granularity is sufficient for most planets)
    const cacheKey = `${date.toFormat('yyyy-MM-dd-HH')}`;
    const cached = transitCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.positions;
    }

    // Clean old cache entries
    cleanCache();

    const year = date.year;
    const month = date.month - 1; // Library uses 0-indexed months
    const day = date.day;
    const hour = date.hour;
    const minute = date.minute;

    // Create Origin for the calculation (use 0,0 for universal positions)
    const origin = new Origin({
      year,
      month,
      date: day,
      hour,
      minute,
      latitude: 0,
      longitude: 0,
    });

    // Create Horoscope
    const horoscope = new Horoscope({
      origin,
      houseSystem: 'placidus',
      zodiac: 'tropical',
      aspectPoints: ['bodies', 'points'],
      aspectWithPoints: ['bodies', 'points'],
      aspectTypes: ['major'],
      customOrbs: {},
      language: 'en',
    });

    const positions: transit_position_type[] = [];

    // Get celestial bodies - CelestialBodies.all is an ARRAY with objects that have a .key property
    if (horoscope.CelestialBodies) {
      for (const bodyData of horoscope.CelestialBodies.all as any[]) {
        const planetKey = bodyData.key?.toLowerCase();
        if (planetKey && PLANET_MAP[planetKey] && TRANSIT_BODIES.includes(PLANET_MAP[planetKey])) {
          const sign = bodyData.Sign?.key?.toLowerCase() as zodiac_sign;
          const degree = bodyData.ChartPosition?.Ecliptic?.DecimalDegrees % 30;
          const absoluteDegree = bodyData.ChartPosition?.Ecliptic?.DecimalDegrees;

          positions.push({
            body: PLANET_MAP[planetKey],
            sign: sign || 'aries',
            degree: Math.round(degree * 100) / 100,
            absoluteDegree: Math.round(absoluteDegree * 100) / 100,
            retrograde: bodyData.isRetrograde || false,
            speed: bodyData.speed, // degrees per day if available
          });
        }
      }
    }

    // Cache the calculated positions
    transitCache.set(cacheKey, { positions, timestamp: Date.now() });

    return positions;
  }

  private calculateMoonPhase(
    date: DateTime,
    positions: transit_position_type[]
  ): moon_phase_info_type {
    const sun = positions.find(p => p.body === 'sun');
    const moon = positions.find(p => p.body === 'moon');

    if (!sun || !moon) {
      // Fallback if we can't find sun/moon
      return {
        phase: 'new',
        phaseName: 'New Moon',
        illumination: 0,
        sign: 'aries',
        degree: 0,
        nextPhase: 'waxing_crescent',
        nextPhaseDate: date.plus({ days: 3 }).toISODate()!,
      };
    }

    // Calculate the angle between sun and moon
    let angle = moon.absoluteDegree - sun.absoluteDegree;
    if (angle < 0) angle += 360;

    // Determine phase based on angle
    let phase: moon_phase;
    let nextPhase: moon_phase;
    let daysToNext: number;

    if (angle < 22.5 || angle >= 337.5) {
      phase = 'new';
      nextPhase = 'waxing_crescent';
      daysToNext = Math.round((22.5 - (angle < 22.5 ? angle : angle - 360)) / 12);
    } else if (angle < 67.5) {
      phase = 'waxing_crescent';
      nextPhase = 'first_quarter';
      daysToNext = Math.round((67.5 - angle) / 12);
    } else if (angle < 112.5) {
      phase = 'first_quarter';
      nextPhase = 'waxing_gibbous';
      daysToNext = Math.round((112.5 - angle) / 12);
    } else if (angle < 157.5) {
      phase = 'waxing_gibbous';
      nextPhase = 'full';
      daysToNext = Math.round((157.5 - angle) / 12);
    } else if (angle < 202.5) {
      phase = 'full';
      nextPhase = 'waning_gibbous';
      daysToNext = Math.round((202.5 - angle) / 12);
    } else if (angle < 247.5) {
      phase = 'waning_gibbous';
      nextPhase = 'last_quarter';
      daysToNext = Math.round((247.5 - angle) / 12);
    } else if (angle < 292.5) {
      phase = 'last_quarter';
      nextPhase = 'waning_crescent';
      daysToNext = Math.round((292.5 - angle) / 12);
    } else {
      phase = 'waning_crescent';
      nextPhase = 'new';
      daysToNext = Math.round((337.5 - angle) / 12);
    }

    // Calculate illumination (0-100%)
    // Full moon at 180°, new moon at 0°/360°
    const illumination = Math.round(
      (1 - Math.cos(angle * Math.PI / 180)) / 2 * 100
    );

    return {
      phase,
      phaseName: MOON_PHASE_NAMES[phase],
      illumination,
      sign: moon.sign,
      degree: moon.degree,
      nextPhase,
      nextPhaseDate: date.plus({ days: Math.max(1, daysToNext) }).toISODate()!,
    };
  }

  private calculateTransitsToNatal(
    transitPositions: transit_position_type[],
    natalPlanets: planet_position_type[]
  ): transit_to_natal_aspect_type[] {
    const aspects: transit_to_natal_aspect_type[] = [];

    // Filter natal planets to main bodies (exclude asc/mc)
    const natalBodies = natalPlanets.filter(
      p => !['ascendant', 'midheaven'].includes(p.body)
    );

    for (const transit of transitPositions) {
      for (const natal of natalBodies) {
        // Calculate angular distance
        let distance = Math.abs(transit.absoluteDegree - natal.absoluteDegree);
        if (distance > 180) distance = 360 - distance;

        // Check each aspect type
        for (const aspectDef of ASPECTS) {
          const orbUsed = Math.abs(distance - aspectDef.angle);

          // Use transit orbs (tighter)
          const maxOrb = TRANSIT_ORBS.upcoming;
          if (orbUsed <= maxOrb) {
            // Determine if applying based on relative positions and retrograde status
            const applying = this.isAspectApplying(
              transit.absoluteDegree,
              natal.absoluteDegree,
              aspectDef.angle,
              transit.retrograde
            );

            // Check if within active orb
            const isActive = applying
              ? orbUsed <= TRANSIT_ORBS.applying
              : orbUsed <= TRANSIT_ORBS.separating;

            aspects.push({
              transitPlanet: transit.body,
              transitSign: transit.sign,
              transitDegree: transit.degree,
              natalPlanet: natal.body,
              natalSign: natal.sign,
              natalDegree: natal.degree,
              aspect: aspectDef.name,
              orb: Math.round(orbUsed * 100) / 100,
              applying,
              isActive,
            });
            break; // Only one aspect per transit-natal pair
          }
        }
      }
    }

    // Sort by orb (tightest first)
    return aspects.sort((a, b) => a.orb - b.orb);
  }

  private isAspectApplying(
    transitDegree: number,
    natalDegree: number,
    aspectAngle: number,
    isRetrograde: boolean = false
  ): boolean {
    // Calculate both possible target degrees for this aspect
    const targetDegree = (natalDegree + aspectAngle) % 360;
    const altTargetDegree = (natalDegree - aspectAngle + 360) % 360;

    // Calculate distances considering the circular nature of the zodiac
    const distToTarget = this.circularDistance(transitDegree, targetDegree);
    const distToAlt = this.circularDistance(transitDegree, altTargetDegree);

    // Use the closer target
    const closestTarget = distToTarget < distToAlt ? targetDegree : altTargetDegree;

    // Determine direction of motion needed to reach exact aspect
    // In direct motion, planets move counter-clockwise (increasing degrees)
    // In retrograde motion, planets move clockwise (decreasing degrees)
    const forwardDistance = (closestTarget - transitDegree + 360) % 360;
    const backwardDistance = (transitDegree - closestTarget + 360) % 360;

    // If moving forward (direct) and target is ahead, it's applying
    // If moving backward (retrograde) and target is behind, it's applying
    if (isRetrograde) {
      // Retrograde: applying if target is behind us (smaller forward distance means we passed it)
      return backwardDistance < forwardDistance;
    } else {
      // Direct: applying if target is ahead of us
      return forwardDistance < backwardDistance;
    }
  }

  private circularDistance(deg1: number, deg2: number): number {
    const diff = Math.abs(deg1 - deg2);
    return diff > 180 ? 360 - diff : diff;
  }

  private calculateUpcomingTransits(
    transitPositions: transit_position_type[],
    natalPlanets: planet_position_type[],
    currentDate: DateTime
  ): upcoming_transit_type[] {
    const upcoming: upcoming_transit_type[] = [];

    // Filter natal planets to main bodies
    const natalBodies = natalPlanets.filter(
      p => !['ascendant', 'midheaven'].includes(p.body)
    );

    // Average daily motion for each planet (approximate degrees per day, positive = direct)
    const avgDailyMotion: Record<string, number> = {
      sun: 1,
      moon: 13,
      mercury: 1.5,
      venus: 1.2,
      mars: 0.5,
      jupiter: 0.08,
      saturn: 0.03,
      uranus: 0.01,
      neptune: 0.006,
      pluto: 0.004,
      chiron: 0.02,
      northnode: 0.05, // Always retrograde but use positive for calculation
    };

    for (const transit of transitPositions) {
      // Use actual speed if available, otherwise use average
      // If retrograde, speed should be negative (moving backward through zodiac)
      let speed = transit.speed ?? avgDailyMotion[transit.body] ?? 0.1;
      if (transit.retrograde && speed > 0) {
        speed = -speed; // Make negative for retrograde
      }
      // North Node is always retrograde
      if (transit.body === 'northnode') {
        speed = -Math.abs(speed);
      }

      // Skip if speed is effectively zero (stationary)
      if (Math.abs(speed) < 0.001) continue;

      for (const natal of natalBodies) {
        // Check each aspect type
        for (const aspectDef of ASPECTS) {
          // Calculate both possible target degrees for this aspect
          const targetDegree = (natal.absoluteDegree + aspectDef.angle) % 360;
          const altTargetDegree = (natal.absoluteDegree - aspectDef.angle + 360) % 360;

          // Check both targets and find the one we're approaching
          for (const target of [targetDegree, altTargetDegree]) {
            // Calculate how far we need to travel to reach this target
            let distanceToTravel: number;

            if (speed > 0) {
              // Direct motion: traveling forward (increasing degrees)
              distanceToTravel = (target - transit.absoluteDegree + 360) % 360;
            } else {
              // Retrograde motion: traveling backward (decreasing degrees)
              distanceToTravel = (transit.absoluteDegree - target + 360) % 360;
            }

            // Calculate days until exact
            const daysUntilExact = distanceToTravel / Math.abs(speed);

            // Only track if within 7 days and not already exact (> 0.25 days)
            if (daysUntilExact > 0.25 && daysUntilExact <= 7) {
              const exactDate = currentDate.plus({ days: daysUntilExact });

              upcoming.push({
                transitPlanet: transit.body,
                natalPlanet: natal.body,
                aspect: aspectDef.name,
                exactDate: exactDate.toISODate()!,
                orb: Math.round(distanceToTravel * 100) / 100,
                daysUntilExact: Math.round(daysUntilExact * 10) / 10,
              });
              break; // Only add the closest of the two targets
            }
          }
        }
      }
    }

    // Sort by days until exact and deduplicate
    const seen = new Set<string>();
    return upcoming
      .sort((a, b) => a.daysUntilExact - b.daysUntilExact)
      .filter(t => {
        const key = `${t.transitPlanet}-${t.natalPlanet}-${t.aspect}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10);
  }

  private calculateGeneralTransits(
    positions: transit_position_type[]
  ): transit_to_transit_aspect_type[] {
    const aspects: transit_to_transit_aspect_type[] = [];

    // Only check slower-moving planets for general transits
    const outerPlanets = positions.filter(p =>
      ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron'].includes(p.body)
    );

    for (let i = 0; i < outerPlanets.length; i++) {
      for (let j = i + 1; j < outerPlanets.length; j++) {
        const p1 = outerPlanets[i];
        const p2 = outerPlanets[j];

        // Calculate angular distance
        let distance = Math.abs(p1.absoluteDegree - p2.absoluteDegree);
        if (distance > 180) distance = 360 - distance;

        // Check each aspect type with tighter orbs
        for (const aspectDef of ASPECTS) {
          const orbUsed = Math.abs(distance - aspectDef.angle);
          if (orbUsed <= 3) { // Tight 3° orb for general transits
            aspects.push({
              planet1: p1.body,
              planet1Sign: p1.sign,
              planet2: p2.body,
              planet2Sign: p2.sign,
              aspect: aspectDef.name,
              orb: Math.round(orbUsed * 100) / 100,
              applying: p1.absoluteDegree < p2.absoluteDegree,
            });
            break;
          }
        }
      }
    }

    return aspects;
  }

  // ============================================
  // ASTROLOGY JOURNAL
  // ============================================

  async getJournalEntries(
    userId: string,
    filters?: astrology_journal_filters
  ): Promise<astrology_journal_entry_type[]> {
    let queryText = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = 'ASTROLOGY_JOURNAL_ENTRY'";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
    ];

    // Apply filters
    if (filters?.startDate) {
      queryText += " AND c.createdAt >= @startDate";
      parameters.push({ name: "@startDate", value: filters.startDate });
    }
    if (filters?.endDate) {
      queryText += " AND c.createdAt <= @endDate";
      parameters.push({ name: "@endDate", value: filters.endDate });
    }
    if (filters?.mood) {
      queryText += " AND c.mood = @mood";
      parameters.push({ name: "@mood", value: filters.mood });
    }
    if (filters?.hasLinkedReading === true) {
      queryText += " AND IS_DEFINED(c.linkedReadingId) AND c.linkedReadingId != null";
    }
    if (filters?.hasLinkedReading === false) {
      queryText += " AND (NOT IS_DEFINED(c.linkedReadingId) OR c.linkedReadingId = null)";
    }
    if (filters?.moonSign) {
      queryText += " AND c.transitSnapshot.moonSign = @moonSign";
      parameters.push({ name: "@moonSign", value: filters.moonSign });
    }
    if (filters?.moonPhase) {
      queryText += " AND c.transitSnapshot.moonPhase = @moonPhase";
      parameters.push({ name: "@moonPhase", value: filters.moonPhase });
    }
    if (filters?.duringRetrograde) {
      queryText += " AND ARRAY_CONTAINS(c.transitSnapshot.retrogradePlanets, @retroPlanet)";
      parameters.push({ name: "@retroPlanet", value: filters.duringRetrograde });
    }

    // Order by creation date descending
    queryText += " ORDER BY c.createdAt DESC";

    // Apply pagination - Cosmos DB requires OFFSET with LIMIT, or use TOP for limit-only
    if (filters?.offset !== undefined && filters?.limit !== undefined) {
      // Both offset and limit - use OFFSET/LIMIT syntax
      queryText += " OFFSET @offset LIMIT @limit";
      parameters.push({ name: "@offset", value: filters.offset });
      parameters.push({ name: "@limit", value: filters.limit });
    } else if (filters?.limit !== undefined) {
      // Limit only - need to use subquery or just fetch all and slice
      // For simplicity, we'll add OFFSET 0 LIMIT
      queryText += " OFFSET 0 LIMIT @limit";
      parameters.push({ name: "@limit", value: filters.limit });
    } else if (filters?.offset !== undefined) {
      // Offset only - not supported, ignore offset without limit
      console.warn('Offset without limit is not supported in Cosmos DB');
    }

    const query = { query: queryText, parameters };
    const results = await this.cosmos.run_query<astrology_journal_entry_type>(
      this.containerName,
      query
    );

    // Apply planetaryThemes filter in-memory (CosmosDB array intersection is complex)
    let filtered = results;
    if (filters?.planetaryThemes && filters.planetaryThemes.length > 0) {
      filtered = results.filter(entry =>
        filters.planetaryThemes!.some(theme => entry.planetaryThemes.includes(theme))
      );
    }

    return filtered.map(entry => ({
      ...entry,
      ref: { id: entry.id, partition: [userId], container: this.containerName },
    }));
  }

  async getJournalEntry(id: string, userId: string): Promise<astrology_journal_entry_type | null> {
    const query = {
      query: "SELECT * FROM c WHERE c.id = @id AND c.userId = @userId AND c.docType = 'ASTROLOGY_JOURNAL_ENTRY'",
      parameters: [
        { name: "@id", value: id },
        { name: "@userId", value: userId },
      ],
    };

    const results = await this.cosmos.run_query<astrology_journal_entry_type>(
      this.containerName,
      query
    );

    if (results.length === 0) return null;

    return {
      ...results[0],
      ref: { id: results[0].id, partition: [userId], container: this.containerName },
    };
  }

  async createJournalEntry(
    input: create_astrology_journal_input,
    authenticatedUserId: string
  ): Promise<astrology_journal_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    // Get current transit snapshot
    const transitSnapshot = await this.captureTransitSnapshot(input.userId);

    const now = DateTime.now().toISO()!;
    const entry: astrology_journal_entry_type = {
      id: uuid(),
      userId: input.userId,
      docType: 'ASTROLOGY_JOURNAL_ENTRY',
      transitSnapshot,
      promptShown: input.promptShown,
      promptDismissed: input.promptDismissed ?? false,
      content: input.content,
      planetaryThemes: input.planetaryThemes || [],
      mood: input.mood,
      linkedReadingId: input.linkedReadingId,
      createdAt: now,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(
      this.containerName,
      entry.id,
      entry,
      [input.userId]
    );

    return {
      success: true,
      entry: {
        ...entry,
        ref: { id: entry.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async updateJournalEntry(
    input: update_astrology_journal_input,
    authenticatedUserId: string
  ): Promise<astrology_journal_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const existing = await this.getJournalEntry(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Journal entry not found" };
    }

    const now = DateTime.now().toISO()!;
    const updates: Partial<astrology_journal_entry_type> = {
      updatedAt: now,
    };

    if (input.content !== undefined) updates.content = input.content;
    if (input.planetaryThemes !== undefined) updates.planetaryThemes = input.planetaryThemes;
    if (input.mood !== undefined) updates.mood = input.mood;
    if (input.linkedReadingId !== undefined) updates.linkedReadingId = input.linkedReadingId;

    await this.cosmos.update_record(
      this.containerName,
      input.id,
      input.userId,
      updates,
      authenticatedUserId
    );

    const updated: astrology_journal_entry_type = {
      ...existing,
      ...updates,
    };

    return {
      success: true,
      entry: {
        ...updated,
        ref: { id: updated.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async deleteJournalEntry(
    id: string,
    userId: string,
    authenticatedUserId: string
  ): Promise<{ success: boolean; message?: string }> {
    if (userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const existing = await this.getJournalEntry(id, userId);
    if (!existing) {
      return { success: false, message: "Journal entry not found" };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);

    return { success: true };
  }

  async getJournalPrompt(userId: string): Promise<journal_prompt_type | null> {
    // Get current transits
    const transitsResult = await this.getTransits({ userId }, userId);
    if (!transitsResult.success || !transitsResult.transits) {
      return null;
    }

    const transits = transitsResult.transits;

    // Priority 1: Retrograde prompts (if Mercury, Venus, or Mars is retrograde)
    const importantRetrogrades = transits.planets
      .filter(p => p.retrograde && ['mercury', 'venus', 'mars'].includes(p.body));
    if (importantRetrogrades.length > 0) {
      const retroPlanet = importantRetrogrades[0];
      const prompt = RETROGRADE_PROMPTS[retroPlanet.body];
      if (prompt) {
        return {
          id: `retrograde-${retroPlanet.body}`,
          category: 'retrograde',
          triggerBody: retroPlanet.body,
          prompt,
        };
      }
    }

    // Priority 2: Personal transit aspects (if user has birth chart)
    if (transitsResult.hasBirthChart && transits.activeTransits && transits.activeTransits.length > 0) {
      // Find the tightest outer planet transit
      const significantTransit = transits.activeTransits.find(t =>
        ['saturn', 'jupiter', 'pluto', 'uranus', 'neptune'].includes(t.transitPlanet)
      );
      if (significantTransit) {
        const prompt = PLANETARY_TRANSIT_PROMPTS[significantTransit.transitPlanet];
        if (prompt) {
          return {
            id: `transit-${significantTransit.transitPlanet}-${significantTransit.natalPlanet}`,
            category: 'planetary_transit',
            triggerBody: significantTransit.transitPlanet,
            prompt,
          };
        }
      }
    }

    // Priority 3: Moon sign prompt
    const moonSign = transits.moonPhase.sign;
    const moonPrompt = MOON_SIGN_PROMPTS[moonSign];
    if (moonPrompt) {
      return {
        id: `moon-${moonSign}`,
        category: 'moon_sign',
        triggerSign: moonSign,
        prompt: moonPrompt,
      };
    }

    return null;
  }

  private async captureTransitSnapshot(userId: string): Promise<transit_snapshot_type> {
    const now = DateTime.now();

    // Get current positions
    const positions = this.calculateCurrentPositions(now);

    // Get moon info
    const moonPhaseInfo = this.calculateMoonPhase(now, positions);

    // Get birth chart for personal transits
    const birthChart = await this.getBirthChart(userId);

    // Calculate active transits if birth chart exists
    let activeTransits: transit_snapshot_aspect[] = [];
    if (birthChart) {
      const transitsToNatal = this.calculateTransitsToNatal(positions, birthChart.planets);
      activeTransits = transitsToNatal
        .filter(t => t.isActive)
        .map(t => ({
          transitingBody: t.transitPlanet,
          natalBody: t.natalPlanet,
          aspect: t.aspect,
          orb: t.orb,
        }));
    }

    // Find retrograde planets
    const retrogradePlanets = positions
      .filter(p => p.retrograde)
      .map(p => p.body);

    return {
      moonSign: moonPhaseInfo.sign,
      moonPhase: moonPhaseInfo.phase,
      moonPhaseName: moonPhaseInfo.phaseName,
      activeTransits,
      retrogradePlanets,
      capturedAt: now.toISO()!,
    };
  }

  async getJournalStats(userId: string): Promise<{
    totalEntries: number;
    entriesByMoonPhase: Record<string, number>;
    entriesByMood: Record<string, number>;
    mostTaggedPlanets: { planet: celestial_body; count: number }[];
  }> {
    const entries = await this.getJournalEntries(userId, { limit: 1000 });

    const entriesByMoonPhase: Record<string, number> = {};
    const entriesByMood: Record<string, number> = {};
    const planetCounts: Record<string, number> = {};

    for (const entry of entries) {
      // Count by moon phase
      const phase = entry.transitSnapshot.moonPhase;
      entriesByMoonPhase[phase] = (entriesByMoonPhase[phase] || 0) + 1;

      // Count by mood
      if (entry.mood) {
        entriesByMood[entry.mood] = (entriesByMood[entry.mood] || 0) + 1;
      }

      // Count planetary themes
      for (const planet of entry.planetaryThemes) {
        planetCounts[planet] = (planetCounts[planet] || 0) + 1;
      }
    }

    // Sort planets by count
    const mostTaggedPlanets = Object.entries(planetCounts)
      .map(([planet, count]) => ({ planet: planet as celestial_body, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEntries: entries.length,
      entriesByMoonPhase,
      entriesByMood,
      mostTaggedPlanets,
    };
  }
}
