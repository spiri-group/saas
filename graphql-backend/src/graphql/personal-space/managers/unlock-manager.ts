// ============================================
// Unlock Manager
// ============================================
// Handles all unlock-related operations: calculating activity metrics,
// checking unlock status, and recording unlock events.

import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { CosmosDataSource } from '../../../utils/database';
import { SpiritualInterest } from '../../user/types';
import {
  user_activity_metrics,
  user_unlock_state,
  unlock_status,
  unlock_event,
  unlockable_feature,
} from '../types/unlock-types';
import {
  FEATURE_REGISTRY,
  UNLOCK_CHECKS,
  getFeaturesForInterest,
} from './unlock-registry';

export class UnlockManager {
  private cosmos: CosmosDataSource;
  private readonly containerName = 'Main-PersonalSpace';
  private readonly userContainer = 'Main-User';

  constructor(cosmos: CosmosDataSource) {
    this.cosmos = cosmos;
  }

  // ============================================
  // Activity Metrics Calculation
  // ============================================

  /**
   * Calculate all activity metrics for a user
   * This is the foundation for all unlock checks
   */
  async getUserActivityMetrics(userId: string): Promise<user_activity_metrics> {
    // Get user creation date
    const userQuery = {
      query: 'SELECT c.createdAt FROM c WHERE c.id = @userId',
      parameters: [{ name: '@userId', value: userId }],
    };
    const userResults = await this.cosmos.run_query<{ createdAt?: string }>(
      this.userContainer,
      userQuery
    );
    const accountCreatedAt = userResults[0]?.createdAt || DateTime.now().toISO()!;

    // Get all personal space entries for this user
    const entriesQuery = {
      query: `
        SELECT c.docType, c.date, c.createdAt, c.entryType, c.vendor, c.symbols
        FROM c
        WHERE c.userId = @userId
        AND c.docType IN (
          'DREAM', 'READING_ENTRY', 'READING_REFLECTION',
          'SYNCHRONICITY', 'SPIRIT_MESSAGE', 'DEVELOPMENT_EXERCISE',
          'ENERGY_JOURNAL', 'CHAKRA_CHECKIN', 'SESSION_REFLECTION',
          'ATTUNEMENT_RECORD', 'PROTECTION_RITUAL', 'AURA_OBSERVATION',
          'CRYSTAL', 'CRYSTAL_CLEANSING', 'CRYSTAL_GRID',
          'DAILY_PASSAGE', 'PRAYER_ENTRY', 'SCRIPTURE_REFLECTION'
        )
      `,
      parameters: [{ name: '@userId', value: userId }],
    };
    const entries = await this.cosmos.run_query<{
      docType: string;
      date?: string;
      createdAt: string;
      entryType?: string;
      vendor?: string;
      symbols?: unknown[];
    }>(this.containerName, entriesQuery);

    // Calculate days active and streaks
    const uniqueDates = new Set<string>();
    for (const entry of entries) {
      const date = entry.date || entry.createdAt?.split('T')[0];
      if (date) {
        uniqueDates.add(date);
      }
    }
    const sortedDates = Array.from(uniqueDates).sort().reverse();
    const daysActive = sortedDates.length;

    // Calculate current streak
    let currentStreak = 0;
    if (sortedDates.length > 0) {
      const today = DateTime.now().toISODate()!;
      const yesterday = DateTime.now().minus({ days: 1 }).toISODate()!;

      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        currentStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const curr = DateTime.fromISO(sortedDates[i]);
          const prev = DateTime.fromISO(sortedDates[i - 1]);
          if (Math.floor(prev.diff(curr, 'days').days) === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Count entries by type
    const entryCounts = {
      // Mediumship
      dreams: 0,
      readingEntries: 0,
      readingReflections: 0,
      synchronicities: 0,
      spiritMessages: 0,
      developmentExercises: 0,
      // Energy
      energyJournalEntries: 0,
      chakraCheckins: 0,
      sessionReflections: 0,
      attunements: 0,
      protectionRituals: 0,
      auraObservations: 0,
      clearingEntries: 0,
      sessionsGiven: 0,
      // Crystals
      crystalsInCollection: 0,
      crystalCleansings: 0,
      crystalGrids: 0,
      acquisitionsWithVendor: 0,
      // Faith
      dailyPassagesRead: 0,
      prayerEntries: 0,
      scriptureReflections: 0,
      // Tarot
      cardPulls: 0,
    };

    for (const entry of entries) {
      switch (entry.docType) {
        case 'DREAM':
          entryCounts.dreams++;
          break;
        case 'READING_ENTRY':
          entryCounts.readingEntries++;
          entryCounts.cardPulls++;
          break;
        case 'READING_REFLECTION':
          entryCounts.readingReflections++;
          break;
        case 'SYNCHRONICITY':
          entryCounts.synchronicities++;
          break;
        case 'SPIRIT_MESSAGE':
          entryCounts.spiritMessages++;
          break;
        case 'DEVELOPMENT_EXERCISE':
          entryCounts.developmentExercises++;
          break;
        case 'ENERGY_JOURNAL':
          entryCounts.energyJournalEntries++;
          if (entry.entryType === 'clearing') {
            entryCounts.clearingEntries++;
          }
          if (entry.entryType === 'session_given') {
            entryCounts.sessionsGiven++;
          }
          break;
        case 'CHAKRA_CHECKIN':
          entryCounts.chakraCheckins++;
          break;
        case 'SESSION_REFLECTION':
          entryCounts.sessionReflections++;
          break;
        case 'ATTUNEMENT_RECORD':
          entryCounts.attunements++;
          break;
        case 'PROTECTION_RITUAL':
          entryCounts.protectionRituals++;
          break;
        case 'AURA_OBSERVATION':
          entryCounts.auraObservations++;
          break;
        case 'CRYSTAL':
          entryCounts.crystalsInCollection++;
          if (entry.vendor) {
            entryCounts.acquisitionsWithVendor++;
          }
          break;
        case 'CRYSTAL_CLEANSING':
          entryCounts.crystalCleansings++;
          break;
        case 'CRYSTAL_GRID':
          entryCounts.crystalGrids++;
          break;
        case 'DAILY_PASSAGE':
          entryCounts.dailyPassagesRead++;
          break;
        case 'PRAYER_ENTRY':
          entryCounts.prayerEntries++;
          break;
        case 'SCRIPTURE_REFLECTION':
          entryCounts.scriptureReflections++;
          break;
      }
    }

    // Get user settings (moon notifications, etc.)
    // For now, default to false - would need to query user settings
    const settings = {
      moonNotificationsEnabled: false,
    };

    return {
      userId,
      accountCreatedAt,
      daysActive,
      currentStreak,
      longestStreak: currentStreak, // Would need historical tracking for accurate longest
      lastActiveDate: sortedDates[0] || DateTime.now().toISODate()!,
      entryCounts,
      settings,
    };
  }

  // ============================================
  // Unlock Status Calculation
  // ============================================

  /**
   * Get complete unlock state for a user
   */
  async getUserUnlockState(
    userId: string,
    userInterests: SpiritualInterest[]
  ): Promise<user_unlock_state> {
    const metrics = await this.getUserActivityMetrics(userId);

    // Get existing unlock events for this user
    const unlockEventsQuery = {
      query: 'SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType',
      parameters: [
        { name: '@userId', value: userId },
        { name: '@docType', value: 'UNLOCK_EVENT' },
      ],
    };
    const unlockEvents = await this.cosmos.run_query<unlock_event>(
      this.containerName,
      unlockEventsQuery
    );
    const unlockEventMap = new Map(unlockEvents.map((e) => [e.featureId, e]));

    // Build unlock status for each interest area
    const buildStatusList = (interest: SpiritualInterest): unlock_status[] => {
      if (!userInterests.includes(interest)) {
        return [];
      }

      const features = getFeaturesForInterest(interest);
      return features.map((feature) => {
        const checkResult = UNLOCK_CHECKS[feature.id](metrics);
        const unlockEvent = unlockEventMap.get(feature.id);

        return {
          featureId: feature.id,
          featureName: feature.name,
          featureDescription: feature.description,
          interestArea: feature.interestArea,
          isUnlocked: checkResult.isUnlocked,
          progress: checkResult.progress,
          unlockedAt: unlockEvent?.unlockedAt,
          celebrationShown: unlockEvent?.celebrationShown ?? false,
          isPromptBased: feature.condition.type === 'prompt-based',
        };
      });
    };

    const crystals = buildStatusList(SpiritualInterest.CRYSTALS);
    const mediumship = buildStatusList(SpiritualInterest.MEDIUMSHIP);
    const energy = buildStatusList(SpiritualInterest.ENERGY);
    const faith = buildStatusList(SpiritualInterest.FAITH);
    const tarot: unlock_status[] = []; // Future

    // Find recently unlocked (unlocked but celebration not shown)
    const allStatuses = [...crystals, ...mediumship, ...energy, ...faith, ...tarot];
    const recentlyUnlocked = allStatuses.filter(
      (s) => s.isUnlocked && !s.celebrationShown && !s.isPromptBased
    );

    // Find upcoming unlocks (not yet unlocked, sorted by progress percentage)
    const upcomingUnlocks = allStatuses
      .filter((s) => !s.isUnlocked && s.progress && !s.isPromptBased)
      .sort((a, b) => (b.progress?.percentage ?? 0) - (a.progress?.percentage ?? 0))
      .slice(0, 3);

    // Record any new unlocks
    for (const status of recentlyUnlocked) {
      if (!unlockEventMap.has(status.featureId)) {
        await this.recordUnlockEvent(userId, status.featureId, metrics);
      }
    }

    return {
      userId,
      activityMetrics: metrics,
      crystals,
      mediumship,
      energy,
      faith,
      tarot,
      recentlyUnlocked,
      upcomingUnlocks,
    };
  }

  /**
   * Get unlock status for a specific feature
   */
  async getFeatureUnlockStatus(
    userId: string,
    featureId: unlockable_feature
  ): Promise<unlock_status | null> {
    const feature = FEATURE_REGISTRY[featureId];
    if (!feature) {
      return null;
    }

    const metrics = await this.getUserActivityMetrics(userId);
    const checkResult = UNLOCK_CHECKS[featureId](metrics);

    // Check for existing unlock event
    const unlockEventQuery = {
      query:
        'SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType AND c.featureId = @featureId',
      parameters: [
        { name: '@userId', value: userId },
        { name: '@docType', value: 'UNLOCK_EVENT' },
        { name: '@featureId', value: featureId },
      ],
    };
    const unlockEvents = await this.cosmos.run_query<unlock_event>(
      this.containerName,
      unlockEventQuery
    );
    const unlockEvent = unlockEvents[0];

    return {
      featureId: feature.id,
      featureName: feature.name,
      featureDescription: feature.description,
      interestArea: feature.interestArea,
      isUnlocked: checkResult.isUnlocked,
      progress: checkResult.progress,
      unlockedAt: unlockEvent?.unlockedAt,
      celebrationShown: unlockEvent?.celebrationShown ?? false,
      isPromptBased: feature.condition.type === 'prompt-based',
    };
  }

  // ============================================
  // Unlock Event Management
  // ============================================

  /**
   * Record that a feature was unlocked
   */
  private async recordUnlockEvent(
    userId: string,
    featureId: unlockable_feature,
    metrics: user_activity_metrics
  ): Promise<unlock_event> {
    const now = DateTime.now().toISO()!;
    const event: unlock_event = {
      id: uuidv4(),
      userId,
      docType: 'UNLOCK_EVENT',
      featureId,
      unlockedAt: now,
      celebrationShown: false,
      triggerMetrics: metrics.entryCounts,
      createdAt: now,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, event.id, event, [userId]);
    return event;
  }

  /**
   * Mark celebration as shown for a feature
   */
  async markCelebrationShown(
    userId: string,
    featureId: unlockable_feature
  ): Promise<boolean> {
    const now = DateTime.now().toISO()!;

    // Find the unlock event
    const query = {
      query:
        'SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType AND c.featureId = @featureId',
      parameters: [
        { name: '@userId', value: userId },
        { name: '@docType', value: 'UNLOCK_EVENT' },
        { name: '@featureId', value: featureId },
      ],
    };
    const events = await this.cosmos.run_query<unlock_event>(
      this.containerName,
      query
    );

    if (events.length === 0) {
      // Create the event if it doesn't exist
      const metrics = await this.getUserActivityMetrics(userId);
      const event = await this.recordUnlockEvent(userId, featureId, metrics);
      event.celebrationShown = true;
      event.celebrationShownAt = now;
      event.updatedAt = now;
      await this.cosmos.upsert_record(this.containerName, event.id, event, [userId]);
      return true;
    }

    const event = events[0];
    event.celebrationShown = true;
    event.celebrationShownAt = now;
    event.updatedAt = now;
    await this.cosmos.upsert_record(this.containerName, event.id, event, [userId]);
    return true;
  }

  // ============================================
  // Quick Check Methods (for navigation/UI)
  // ============================================

  /**
   * Quick check if a feature is unlocked (for UI gating)
   */
  async isFeatureUnlocked(
    userId: string,
    featureId: unlockable_feature
  ): Promise<boolean> {
    const metrics = await this.getUserActivityMetrics(userId);
    const checkResult = UNLOCK_CHECKS[featureId](metrics);
    return checkResult.isUnlocked;
  }

  /**
   * Get all unlocked features for a user (for navigation building)
   */
  async getUnlockedFeatures(
    userId: string,
    interest: SpiritualInterest
  ): Promise<unlockable_feature[]> {
    const features = getFeaturesForInterest(interest);
    const metrics = await this.getUserActivityMetrics(userId);

    return features
      .filter((feature) => {
        const checkResult = UNLOCK_CHECKS[feature.id](metrics);
        return checkResult.isUnlocked;
      })
      .map((feature) => feature.id);
  }
}
