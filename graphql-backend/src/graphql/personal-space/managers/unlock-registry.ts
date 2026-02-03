// ============================================
// Feature Unlock Registry
// ============================================
// Central registry of all unlockable features, their conditions,
// and the logic to check unlock status.

import { SpiritualInterest } from '../../user/types';
import {
  feature_definition,
  unlockable_feature,
  unlock_check_fn,
  user_activity_metrics,
  unlock_progress,
} from '../types/unlock-types';

// ============================================
// Feature Definitions
// ============================================

export const FEATURE_REGISTRY: Record<unlockable_feature, feature_definition> = {
  // ==========================================
  // CRYSTALS
  // ==========================================
  'crystals:cleansing-log': {
    id: 'crystals:cleansing-log',
    name: 'Cleansing Log',
    description: 'Log cleansing sessions for your crystals (moonlight, smoke, sound, water, etc.)',
    interestArea: 'crystals',
    requiredInterest: SpiritualInterest.CRYSTALS,
    condition: {
      type: 'collection-count',
      targetCount: 5,
      description: 'Add 5 crystals to your collection',
    },
    icon: 'Droplets',
    route: '/space/crystals/cleansing',
    celebration: {
      title: 'Cleansing Log Unlocked!',
      message: 'You can now track how and when you cleanse your crystals. Keep your collection energetically clear!',
      ctaText: 'Log a Cleansing',
    },
  },

  'crystals:charging-reminders': {
    id: 'crystals:charging-reminders',
    name: 'Charging Reminders',
    description: 'Get reminders to charge your crystals during full moons and special events',
    interestArea: 'crystals',
    requiredInterest: SpiritualInterest.CRYSTALS,
    condition: {
      type: 'setting-enabled',
      settingKey: 'moonNotificationsEnabled',
      description: 'Enable moon notifications in settings',
    },
    icon: 'Moon',
    celebration: {
      title: 'Charging Reminders Activated!',
      message: 'We\'ll remind you when it\'s time to charge your crystals under the full moon.',
      ctaText: 'View Settings',
    },
  },

  'crystals:crystal-grids': {
    id: 'crystals:crystal-grids',
    name: 'Crystal Grids',
    description: 'Design and track crystal grid layouts for manifesting and energy work',
    interestArea: 'crystals',
    requiredInterest: SpiritualInterest.CRYSTALS,
    condition: {
      type: 'collection-count',
      targetCount: 10,
      description: 'Add 10 crystals to your collection',
    },
    icon: 'Grid3X3',
    route: '/space/crystals/grids',
    celebration: {
      title: 'Crystal Grids Unlocked!',
      message: 'Create powerful grid layouts combining the energies of your crystals.',
      ctaText: 'Create a Grid',
    },
  },

  'crystals:acquisition-journal': {
    id: 'crystals:acquisition-journal',
    name: 'Acquisition Journal',
    description: 'Tell the story of how you found each crystal - the journey matters!',
    interestArea: 'crystals',
    requiredInterest: SpiritualInterest.CRYSTALS,
    condition: {
      type: 'prompt-based',
      description: 'Available after adding your first crystal',
    },
    icon: 'BookOpen',
    celebration: {
      title: 'Tell Your Crystal Stories!',
      message: 'Every crystal has a story. Record how each one found its way to you.',
      ctaText: 'Add a Story',
    },
  },

  'crystals:pairing-notes': {
    id: 'crystals:pairing-notes',
    name: 'Pairing Notes',
    description: 'Document which crystals work well together based on your experience',
    interestArea: 'crystals',
    requiredInterest: SpiritualInterest.CRYSTALS,
    condition: {
      type: 'first-entry',
      docType: 'CRYSTAL_GRID',
      description: 'Create your first crystal grid',
    },
    icon: 'Link',
    celebration: {
      title: 'Pairing Notes Unlocked!',
      message: 'Record which crystals enhance each other and which don\'t resonate together.',
      ctaText: 'Add Pairing Notes',
    },
  },

  'crystals:shop-fair-log': {
    id: 'crystals:shop-fair-log',
    name: 'Shop & Fair Log',
    description: 'Track your favorite crystal vendors, shops, and gem fairs',
    interestArea: 'crystals',
    requiredInterest: SpiritualInterest.CRYSTALS,
    condition: {
      type: 'first-entry',
      docType: 'CRYSTAL_ACQUISITION_WITH_VENDOR',
      description: 'Add a crystal with a vendor tagged',
    },
    icon: 'Store',
    celebration: {
      title: 'Shop & Fair Log Unlocked!',
      message: 'Keep track of the shops and fairs where you find the best crystals.',
      ctaText: 'Log a Shop',
    },
  },

  // ==========================================
  // MEDIUMSHIP
  // ==========================================
  'mediumship:synchronicity-log': {
    id: 'mediumship:synchronicity-log',
    name: 'Synchronicity Log',
    description: 'Track meaningful coincidences and signs from the universe',
    interestArea: 'mediumship',
    requiredInterest: SpiritualInterest.MEDIUMSHIP,
    condition: {
      type: 'days-active',
      targetCount: 7,
      description: 'Be active on the platform for 7 days',
    },
    icon: 'Sparkles',
    route: '/space/mediumship/synchronicity',
    celebration: {
      title: 'Synchronicity Log Unlocked!',
      message: 'The universe is always sending signs. Now you can track the meaningful coincidences in your life.',
      ctaText: 'Log a Synchronicity',
    },
  },

  'mediumship:spirit-messages': {
    id: 'mediumship:spirit-messages',
    name: 'Spirit Messages',
    description: 'Log messages received from spirit guides, loved ones, and other sources',
    interestArea: 'mediumship',
    requiredInterest: SpiritualInterest.MEDIUMSHIP,
    condition: {
      type: 'first-entry',
      docType: 'READING_REFLECTION',
      description: 'Add your first reading reflection',
    },
    icon: 'MessageCircle',
    route: '/space/mediumship/messages',
    celebration: {
      title: 'Spirit Messages Unlocked!',
      message: 'Record the messages you receive from spirit - through meditation, dreams, or other channels.',
      ctaText: 'Log a Message',
    },
  },

  'mediumship:symbol-dictionary': {
    id: 'mediumship:symbol-dictionary',
    name: 'Symbol Dictionary',
    description: 'Build your personal dictionary of symbol meanings based on your experiences',
    interestArea: 'mediumship',
    requiredInterest: SpiritualInterest.MEDIUMSHIP,
    condition: {
      type: 'entry-count',
      docType: 'DREAM',
      targetCount: 5,
      description: 'Log 5 dream entries',
    },
    icon: 'BookMarked',
    route: '/space/mediumship/symbols',
    celebration: {
      title: 'Symbol Dictionary Unlocked!',
      message: 'Patterns are emerging! Create your personal dictionary of what symbols mean to YOU.',
      ctaText: 'View Symbols',
    },
  },

  'mediumship:loved-ones': {
    id: 'mediumship:loved-ones',
    name: 'Loved Ones in Spirit',
    description: 'Honor and track signs from loved ones who have passed',
    interestArea: 'mediumship',
    requiredInterest: SpiritualInterest.MEDIUMSHIP,
    condition: {
      type: 'prompt-based',
      description: 'Available around holidays and anniversaries',
    },
    icon: 'Heart',
    route: '/space/mediumship/loved-ones',
    celebration: {
      title: 'Remember Those in Spirit',
      message: 'Create profiles for loved ones who have passed and track the signs they send you.',
      ctaText: 'Add a Loved One',
    },
  },

  'mediumship:development-exercises': {
    id: 'mediumship:development-exercises',
    name: 'Development Exercises',
    description: 'Track your psychic and mediumship development practice sessions',
    interestArea: 'mediumship',
    requiredInterest: SpiritualInterest.MEDIUMSHIP,
    condition: {
      type: 'days-active',
      targetCount: 30,
      description: 'Be active on the platform for 30 days',
    },
    icon: 'Dumbbell',
    route: '/space/mediumship/development',
    celebration: {
      title: 'Development Exercises Unlocked!',
      message: 'You\'re committed! Track your psychic development practice and watch your accuracy improve.',
      ctaText: 'Log an Exercise',
    },
  },

  // ==========================================
  // ENERGY HEALING
  // ==========================================
  'energy:attunement-tracker': {
    id: 'energy:attunement-tracker',
    name: 'Attunement Tracker',
    description: 'Track Reiki and other energy attunements you\'ve received',
    interestArea: 'energy',
    requiredInterest: SpiritualInterest.ENERGY,
    condition: {
      type: 'first-entry',
      docType: 'ENERGY_SESSION_GIVEN',
      description: 'Log your first session as a practitioner',
    },
    icon: 'Zap',
    route: '/space/energy/attunements',
    celebration: {
      title: 'Attunement Tracker Unlocked!',
      message: 'Track your energy healing attunements and certifications.',
      ctaText: 'Add Attunement',
    },
  },

  'energy:protection-rituals': {
    id: 'energy:protection-rituals',
    name: 'Protection Rituals',
    description: 'Log shielding, cord cutting, and space clearing practices',
    interestArea: 'energy',
    requiredInterest: SpiritualInterest.ENERGY,
    condition: {
      type: 'entry-count',
      docType: 'ENERGY_CLEARING',
      targetCount: 5,
      description: 'Log 5 clearing entries',
    },
    icon: 'Shield',
    route: '/space/energy/protection',
    celebration: {
      title: 'Protection Rituals Unlocked!',
      message: 'Document your energetic protection practices - shielding, cord cutting, and space clearing.',
      ctaText: 'Log a Ritual',
    },
  },

  'energy:aura-observations': {
    id: 'energy:aura-observations',
    name: 'Aura Observations',
    description: 'Record aura readings for yourself and others',
    interestArea: 'energy',
    requiredInterest: SpiritualInterest.ENERGY,
    condition: {
      type: 'total-entries',
      docType: 'ENERGY_JOURNAL',
      targetCount: 10,
      description: 'Log 10 energy journal entries',
    },
    icon: 'Eye',
    route: '/space/energy/aura',
    celebration: {
      title: 'Aura Observations Unlocked!',
      message: 'Record the colors and patterns you perceive in auras.',
      ctaText: 'Log Observation',
    },
  },

  // ==========================================
  // TAROT & ORACLE (Future)
  // ==========================================
  'tarot:card-pattern-stats': {
    id: 'tarot:card-pattern-stats',
    name: 'Card Pattern Stats',
    description: 'See which cards appear most often in your readings',
    interestArea: 'tarot',
    requiredInterest: SpiritualInterest.MEDIUMSHIP, // Uses MEDIUMSHIP for now
    condition: {
      type: 'entry-count',
      docType: 'READING_ENTRY',
      targetCount: 10,
      description: 'Log 10 reading entries',
    },
    icon: 'BarChart3',
    celebration: {
      title: 'Card Patterns Unlocked!',
      message: 'Discover which cards keep appearing in your readings and what they might be telling you.',
      ctaText: 'View Patterns',
    },
  },

  'tarot:symbol-tracking': {
    id: 'tarot:symbol-tracking',
    name: 'Symbol Tracking',
    description: 'Cross-reference symbols across dreams and readings',
    interestArea: 'tarot',
    requiredInterest: SpiritualInterest.MEDIUMSHIP,
    condition: {
      type: 'entry-count',
      targetCount: 5,
      description: 'Log 5 entries with symbols tagged',
    },
    icon: 'Tags',
    celebration: {
      title: 'Symbol Tracking Unlocked!',
      message: 'See connections between symbols appearing in your dreams and readings.',
      ctaText: 'Explore Symbols',
    },
  },

  'tarot:spread-builder': {
    id: 'tarot:spread-builder',
    name: 'Spread Builder',
    description: 'Create and save your own custom tarot spreads',
    interestArea: 'tarot',
    requiredInterest: SpiritualInterest.MEDIUMSHIP,
    condition: {
      type: 'entry-count',
      docType: 'READING_ENTRY',
      targetCount: 20,
      description: 'Log 20 reading entries',
    },
    icon: 'LayoutGrid',
    celebration: {
      title: 'Spread Builder Unlocked!',
      message: 'Design custom spreads tailored to your unique reading style.',
      ctaText: 'Create Spread',
    },
  },
};

// ============================================
// Unlock Check Functions
// ============================================

export const UNLOCK_CHECKS: Record<unlockable_feature, unlock_check_fn> = {
  // CRYSTALS
  'crystals:cleansing-log': (metrics) => {
    const current = metrics.entryCounts.crystalsInCollection;
    const required = 5;
    return {
      isUnlocked: current >= required,
      progress: {
        current,
        required,
        label: `${current}/${required} crystals`,
        percentage: Math.min(100, Math.round((current / required) * 100)),
      },
    };
  },

  'crystals:charging-reminders': (metrics) => ({
    isUnlocked: metrics.settings.moonNotificationsEnabled,
    progress: {
      current: metrics.settings.moonNotificationsEnabled ? 1 : 0,
      required: 1,
      label: metrics.settings.moonNotificationsEnabled ? 'Enabled' : 'Enable in settings',
      percentage: metrics.settings.moonNotificationsEnabled ? 100 : 0,
    },
  }),

  'crystals:crystal-grids': (metrics) => {
    const current = metrics.entryCounts.crystalsInCollection;
    const required = 10;
    return {
      isUnlocked: current >= required,
      progress: {
        current,
        required,
        label: `${current}/${required} crystals`,
        percentage: Math.min(100, Math.round((current / required) * 100)),
      },
    };
  },

  'crystals:acquisition-journal': () => ({
    isUnlocked: true, // Prompt-based, always available
  }),

  'crystals:pairing-notes': (metrics) => ({
    isUnlocked: metrics.entryCounts.crystalGrids >= 1,
    progress: {
      current: metrics.entryCounts.crystalGrids,
      required: 1,
      label: metrics.entryCounts.crystalGrids >= 1 ? 'Unlocked' : 'Create first grid',
      percentage: metrics.entryCounts.crystalGrids >= 1 ? 100 : 0,
    },
  }),

  'crystals:shop-fair-log': (metrics) => ({
    isUnlocked: metrics.entryCounts.acquisitionsWithVendor >= 1,
    progress: {
      current: metrics.entryCounts.acquisitionsWithVendor,
      required: 1,
      label: metrics.entryCounts.acquisitionsWithVendor >= 1 ? 'Unlocked' : 'Tag a vendor',
      percentage: metrics.entryCounts.acquisitionsWithVendor >= 1 ? 100 : 0,
    },
  }),

  // MEDIUMSHIP
  'mediumship:synchronicity-log': (metrics) => {
    const current = metrics.daysActive;
    const required = 7;
    return {
      isUnlocked: current >= required,
      progress: {
        current,
        required,
        label: `Day ${current} of ${required}`,
        percentage: Math.min(100, Math.round((current / required) * 100)),
      },
    };
  },

  'mediumship:spirit-messages': (metrics) => ({
    isUnlocked: metrics.entryCounts.readingReflections >= 1,
    progress: {
      current: metrics.entryCounts.readingReflections,
      required: 1,
      label: metrics.entryCounts.readingReflections >= 1 ? 'Unlocked' : 'Add first reading reflection',
      percentage: metrics.entryCounts.readingReflections >= 1 ? 100 : 0,
    },
  }),

  'mediumship:symbol-dictionary': (metrics) => {
    const current = metrics.entryCounts.dreams;
    const required = 5;
    return {
      isUnlocked: current >= required,
      progress: {
        current,
        required,
        label: `${current}/${required} dream entries`,
        percentage: Math.min(100, Math.round((current / required) * 100)),
      },
    };
  },

  'mediumship:loved-ones': () => ({
    isUnlocked: true, // Prompt-based, always available
  }),

  'mediumship:development-exercises': (metrics) => {
    const current = metrics.daysActive;
    const required = 30;
    return {
      isUnlocked: current >= required,
      progress: {
        current,
        required,
        label: `Day ${current} of ${required}`,
        percentage: Math.min(100, Math.round((current / required) * 100)),
      },
    };
  },

  // ENERGY
  'energy:attunement-tracker': (metrics) => ({
    isUnlocked: metrics.entryCounts.sessionsGiven >= 1,
    progress: {
      current: metrics.entryCounts.sessionsGiven,
      required: 1,
      label: metrics.entryCounts.sessionsGiven >= 1 ? 'Unlocked' : 'Log first session given',
      percentage: metrics.entryCounts.sessionsGiven >= 1 ? 100 : 0,
    },
  }),

  'energy:protection-rituals': (metrics) => {
    const current = metrics.entryCounts.clearingEntries;
    const required = 5;
    return {
      isUnlocked: current >= required,
      progress: {
        current,
        required,
        label: `${current}/${required} clearing entries`,
        percentage: Math.min(100, Math.round((current / required) * 100)),
      },
    };
  },

  'energy:aura-observations': (metrics) => {
    const current = metrics.entryCounts.energyJournalEntries;
    const required = 10;
    return {
      isUnlocked: current >= required,
      progress: {
        current,
        required,
        label: `${current}/${required} journal entries`,
        percentage: Math.min(100, Math.round((current / required) * 100)),
      },
    };
  },

  // TAROT
  'tarot:card-pattern-stats': (metrics) => {
    const current = metrics.entryCounts.readingEntries;
    const required = 10;
    return {
      isUnlocked: current >= required,
      progress: {
        current,
        required,
        label: `${current}/${required} readings`,
        percentage: Math.min(100, Math.round((current / required) * 100)),
      },
    };
  },

  'tarot:symbol-tracking': (metrics) => {
    // This would need symbol-tagged entries count
    const current = 0; // Placeholder - needs implementation
    const required = 5;
    return {
      isUnlocked: current >= required,
      progress: {
        current,
        required,
        label: `${current}/${required} entries with symbols`,
        percentage: Math.min(100, Math.round((current / required) * 100)),
      },
    };
  },

  'tarot:spread-builder': (metrics) => {
    const current = metrics.entryCounts.readingEntries;
    const required = 20;
    return {
      isUnlocked: current >= required,
      progress: {
        current,
        required,
        label: `${current}/${required} readings`,
        percentage: Math.min(100, Math.round((current / required) * 100)),
      },
    };
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get all features for a specific interest area
 */
export function getFeaturesForInterest(interest: SpiritualInterest): feature_definition[] {
  return Object.values(FEATURE_REGISTRY).filter(
    (feature) => feature.requiredInterest === interest
  );
}

/**
 * Get features grouped by interest area
 */
export function getFeaturesByArea(): Record<string, feature_definition[]> {
  const grouped: Record<string, feature_definition[]> = {
    crystals: [],
    mediumship: [],
    energy: [],
    faith: [],
    tarot: [],
  };

  for (const feature of Object.values(FEATURE_REGISTRY)) {
    grouped[feature.interestArea].push(feature);
  }

  return grouped;
}

/**
 * Check if a specific feature is unlocked
 */
export function checkFeatureUnlock(
  featureId: unlockable_feature,
  metrics: user_activity_metrics
): { isUnlocked: boolean; progress?: unlock_progress } {
  const checkFn = UNLOCK_CHECKS[featureId];
  if (!checkFn) {
    return { isUnlocked: false };
  }
  return checkFn(metrics);
}
