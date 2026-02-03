'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Storage key for last visited page
export const LAST_VISITED_KEY = 'spiriverse-last-visited';

export interface LastVisited {
  path: string;
  title: string;
  timestamp: number;
}

// Map paths to friendly titles
const PATH_TITLES: Record<string, string> = {
  '/astrology/birth-chart': 'Birth Chart',
  '/astrology/transits': 'Transit Tracker',
  '/astrology/journal': 'Astrology Journal',
  '/journal/card-pull': 'Tarot Journal',
  '/journal/dreams': 'Dream Journal',
  '/journal/meditation': 'Meditation Journal',
  '/journal/crystal': 'Crystal Journal',
  '/symbols': 'Symbol Dictionary',
  '/symbols/dictionary': 'Symbol Dictionary',
  '/symbols/my-card-symbols': 'My Symbols',
  '/readings/received': 'Readings',
  '/readings/request': 'Request Reading',
  '/mediumship/reflections': 'Reflections',
  '/mediumship/spirit-messages': 'Spirit Messages',
  '/mediumship/loved-ones': 'Loved Ones',
  '/mediumship/synchronicities': 'Synchronicity Log',
  '/mediumship/exercises': 'Development Exercises',
  '/crystals': 'Crystals',
  '/crystals/collection': 'Crystal Collection',
  '/crystals/wishlist': 'Crystal Wishlist',
  '/crystals/cleansing': 'Cleansing History',
  '/crystals/grids': 'Crystal Grids',
  '/energy': 'Energy Work',
  '/energy/chakra': 'Chakra Check-In',
  '/energy/journal': 'Energy Journal',
  '/energy/sessions': 'Session Reflections',
  '/faith/daily': 'Daily Passage',
  '/faith/prayer': 'Prayer Journal',
  '/faith/scripture': 'Scripture Reflections',
};

/**
 * Tracks page visits in localStorage for "pick up where you left off" feature.
 * Should be rendered in the layout to capture all page visits.
 */
const PageVisitTracker: React.FC = () => {
  const pathname = usePathname();

  useEffect(() => {
    // Don't track the home page
    if (!pathname || pathname.endsWith('/space')) return;

    // Extract the space-relative path
    const spaceIndex = pathname.indexOf('/space');
    if (spaceIndex === -1) return;
    const relativePath = pathname.slice(spaceIndex + 6); // after '/space'

    // Find matching title
    const title = PATH_TITLES[relativePath];
    if (!title) return; // Only track known pages

    try {
      const data: LastVisited = {
        path: pathname,
        title,
        timestamp: Date.now(),
      };
      localStorage.setItem(LAST_VISITED_KEY, JSON.stringify(data));
    } catch {
      // Ignore localStorage errors
    }
  }, [pathname]);

  return null; // This component doesn't render anything
};

export default PageVisitTracker;
