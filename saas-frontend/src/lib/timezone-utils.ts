import { DateTime } from 'luxon';

/**
 * Quality levels for booking times based on local hour
 */
export type TimeQuality = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Color codes for time quality visualization
 */
export const TIME_QUALITY_COLORS = {
  excellent: '#10b981', // Green - Business hours
  good: '#84cc16',      // Light green - Extended hours
  fair: '#f59e0b',      // Orange - Early/late
  poor: '#ef4444'       // Red - Night time
} as const;

/**
 * Calculate quality score for a given hour (0-23)
 * Business logic: 9AM-5PM is excellent, 7AM-9PM is good, 6AM-11PM is fair, rest is poor
 */
export function calculateTimeQuality(localHour: number): TimeQuality {
  if (localHour >= 9 && localHour < 17) return 'excellent';  // 9AM-5PM: Business hours
  if (localHour >= 7 && localHour < 21) return 'good';       // 7AM-9PM: Waking hours
  if (localHour >= 6 && localHour < 23) return 'fair';       // 6AM-11PM: Extended hours
  return 'poor';  // 11PM-6AM: Night time
}

/**
 * Get color for time quality
 */
export function getQualityColor(quality: TimeQuality): string {
  return TIME_QUALITY_COLORS[quality];
}

/**
 * Get quality description
 */
export function getQualityDescription(quality: TimeQuality): string {
  switch (quality) {
    case 'excellent':
      return 'Perfect time - business hours';
    case 'good':
      return 'Good time - waking hours';
    case 'fair':
      return 'Okay time - early morning or late evening';
    case 'poor':
      return 'Poor time - night hours';
  }
}

/**
 * Convert practitioner's availability window to customer's local time
 */
export function convertTimezoneWindow(
  startHour: number,
  endHour: number,
  practitionerTz: string,
  customerTz: string,
  date: string = DateTime.now().toISODate()!
): { start: number; end: number; quality: TimeQuality } {
  // Create datetime in practitioner's timezone
  const practitionerStart = DateTime.fromObject(
    { year: parseInt(date.split('-')[0]), month: parseInt(date.split('-')[1]), day: parseInt(date.split('-')[2]), hour: startHour },
    { zone: practitionerTz }
  );

  // Convert to customer's timezone
  const customerStart = practitionerStart.setZone(customerTz);
  const customerStartHour = customerStart.hour;

  // Calculate the duration
  const durationHours = endHour - startHour;
  const customerEndHour = (customerStartHour + durationHours) % 24;

  // Calculate average quality across the window
  const midpointHour = Math.floor((customerStartHour + customerEndHour) / 2) % 24;
  const quality = calculateTimeQuality(midpointHour);

  return {
    start: customerStartHour,
    end: customerEndHour,
    quality
  };
}

/**
 * Major world regions with their representative timezones
 */
export const WORLD_REGIONS = [
  { name: 'North America - East', timezone: 'America/New_York', lat: 40.7128, lng: -74.0060 },
  { name: 'North America - Central', timezone: 'America/Chicago', lat: 41.8781, lng: -87.6298 },
  { name: 'North America - Mountain', timezone: 'America/Denver', lat: 39.7392, lng: -104.9903 },
  { name: 'North America - West', timezone: 'America/Los_Angeles', lat: 34.0522, lng: -118.2437 },
  { name: 'Europe - West', timezone: 'Europe/London', lat: 51.5074, lng: -0.1278 },
  { name: 'Europe - Central', timezone: 'Europe/Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'Europe - East', timezone: 'Europe/Istanbul', lat: 41.0082, lng: 28.9784 },
  { name: 'Middle East', timezone: 'Asia/Dubai', lat: 25.2048, lng: 55.2708 },
  { name: 'Asia - South', timezone: 'Asia/Kolkata', lat: 28.6139, lng: 77.2090 },
  { name: 'Asia - Southeast', timezone: 'Asia/Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Asia - East', timezone: 'Asia/Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Australia - East', timezone: 'Australia/Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'Australia - West', timezone: 'Australia/Perth', lat: -31.9505, lng: 115.8605 },
  { name: 'South America - East', timezone: 'America/Sao_Paulo', lat: -23.5505, lng: -46.6333 },
  { name: 'Africa - West', timezone: 'Africa/Lagos', lat: 6.5244, lng: 3.3792 },
  { name: 'Africa - East', timezone: 'Africa/Nairobi', lat: -1.2864, lng: 36.8172 },
] as const;

/**
 * Calculate timezone impact data for world map visualization
 */
export function calculateTimezoneImpact(
  practitionerTz: string,
  startHour: number,
  endHour: number,
  date?: string
) {
  return WORLD_REGIONS.map((region) => {
    const converted = convertTimezoneWindow(
      startHour,
      endHour,
      practitionerTz,
      region.timezone,
      date
    );

    return {
      ...region,
      localStart: converted.start,
      localEnd: converted.end,
      quality: converted.quality,
      color: getQualityColor(converted.quality),
      description: getQualityDescription(converted.quality),
      formattedTime: `${formatHour(converted.start)} - ${formatHour(converted.end)}`
    };
  });
}

/**
 * Format hour as 12-hour time
 */
function formatHour(hour: number): string {
  const adjustedHour = hour % 24;
  const period = adjustedHour >= 12 ? 'PM' : 'AM';
  const displayHour = adjustedHour === 0 ? 12 : adjustedHour > 12 ? adjustedHour - 12 : adjustedHour;
  return `${displayHour}:00 ${period}`;
}

/**
 * Get timezone offset string (e.g., "UTC+5:30")
 */
export function getTimezoneOffset(timezone: string, date?: string): string {
  const dt = date
    ? DateTime.fromISO(date, { zone: timezone })
    : DateTime.now().setZone(timezone);

  const offsetMinutes = dt.offset;
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? '+' : '-';

  return minutes > 0
    ? `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`
    : `UTC${sign}${hours}`;
}

/**
 * Format time range with timezone
 */
export function formatTimeRangeWithTimezone(
  startHour: number,
  endHour: number,
  timezone: string,
  date?: string
): string {
  const offset = getTimezoneOffset(timezone, date);
  return `${formatHour(startHour)} - ${formatHour(endHour)} ${offset}`;
}
