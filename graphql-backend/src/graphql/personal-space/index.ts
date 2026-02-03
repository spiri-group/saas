import { serverContext } from "../../services/azFunction";
import { PersonalSpaceManager } from "./manager";
import { UnlockManager } from "./managers/unlock-manager";
import { FEATURE_REGISTRY, getFeaturesForInterest } from "./managers/unlock-registry";
import { createMutationResolver, createQueryResolver } from "../../utils/resolvers";
import { SpiritualInterest } from "../user/types";
import { unlockable_feature } from "./types/unlock-types";
import {
  // Astrology types
  create_birth_chart_input,
  update_birth_chart_input,
  get_transits_input,
  create_astrology_journal_input,
  update_astrology_journal_input,
  astrology_journal_filters,
} from "./types/astrology-types";
import {
  // Mediumship types
  synchronicity_filters,
  create_synchronicity_input,
  update_synchronicity_input,
  spirit_message_filters,
  create_spirit_message_input,
  update_spirit_message_input,
  personal_symbol_filters,
  create_personal_symbol_input,
  update_personal_symbol_input,
  create_user_card_symbols_input,
  update_user_card_symbols_input,
  loved_one_filters,
  create_loved_one_input,
  update_loved_one_input,
  development_exercise_filters,
  create_development_exercise_input,
  update_development_exercise_input,
  reading_reflection_filters,
  create_reading_reflection_input,
  update_reading_reflection_input,
} from "./types/mediumship-types";
import {
  reading_entry_filters,
  create_reading_entry_input,
  update_reading_entry_input,
  card_pull_filters,
  create_card_pull_input,
  update_card_pull_input,
  dream_filters,
  create_dream_input,
  update_dream_input,
  meditation_filters,
  create_meditation_input,
  update_meditation_input,
  // Crystal types
  crystal_collection_filters,
  crystal_wishlist_filters,
  crystal_companion_filters,
  crystal_cleansing_filters,
  crystal_grid_filters,
  create_crystal_collection_input,
  update_crystal_collection_input,
  create_crystal_wishlist_input,
  update_crystal_wishlist_input,
  create_crystal_companion_input,
  update_crystal_companion_input,
  create_crystal_cleansing_input,
  update_crystal_cleansing_input,
  create_crystal_grid_input,
  update_crystal_grid_input,
  // Energy Healing types
  energy_journal_filters,
  chakra_checkin_filters,
  session_reflection_filters,
  create_energy_journal_input,
  update_energy_journal_input,
  create_chakra_checkin_input,
  update_chakra_checkin_input,
  create_session_reflection_input,
  update_session_reflection_input,
  // Faith types
  daily_passage_filters,
  prayer_journal_filters,
  scripture_reflection_filters,
  reflect_on_passage_input,
  create_prayer_journal_input,
  update_prayer_journal_input,
  create_scripture_reflection_input,
  update_scripture_reflection_input,
  prayer_status
} from "./types";
import { searchDreamSymbols } from "./tarot-symbols";

const manager = (context: serverContext) => new PersonalSpaceManager(context.dataSources.cosmos);
const unlockManager = (context: serverContext) => new UnlockManager(context.dataSources.cosmos);

const resolvers = {
  Query: {
    // ============================================
    // Reading Entry Queries (New)
    // ============================================
    readingEntries: createQueryResolver(
      (ds, args: { userId: string; filters?: reading_entry_filters }) =>
        ds.getReadingEntries(args.userId, args.filters)
    )(manager),

    readingEntry: createQueryResolver(
      (ds, args: { id: string; userId: string }) => ds.getReadingEntry(args.id, args.userId)
    )(manager),

    readingEntryByDate: createQueryResolver(
      (ds, args: { userId: string; date: string }) => ds.getReadingEntryByDate(args.userId, args.date)
    )(manager),

    recentReadingEntries: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.getRecentReadingEntries(args.userId, args.limit || 5)
    )(manager),

    // ============================================
    // Legacy Card Pull Queries (Backwards Compatibility)
    // ============================================
    cardPulls: createQueryResolver(
      (ds, args: { userId: string; filters?: card_pull_filters }) =>
        ds.getCardPulls(args.userId, args.filters)
    )(manager),

    cardPull: createQueryResolver(
      (ds, args: { id: string; userId: string }) => ds.getCardPull(args.id, args.userId)
    )(manager),

    cardPullByDate: createQueryResolver(
      (ds, args: { userId: string; date: string }) => ds.getCardPullByDate(args.userId, args.date)
    )(manager),

    recentCardPulls: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.getRecentCardPulls(args.userId, args.limit || 5)
    )(manager),

    // ============================================
    // Card Pattern Statistics
    // ============================================
    cardPatternStats: createQueryResolver(
      (ds, args: { userId: string; period?: string }) => ds.getCardPatternStats(args.userId, args.period)
    )(manager),

    // ============================================
    // Symbol Pattern Statistics
    // ============================================
    symbolPatternStats: createQueryResolver(
      (ds, args: { userId: string }) => ds.getSymbolPatternStats(args.userId)
    )(manager),

    // ============================================
    // Symbol Queries
    // ============================================
    userSymbols: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.getUserSymbols(args.userId, args.limit || 50)
    )(manager),

    userSymbol: createQueryResolver(
      (ds, args: { userId: string; symbolName: string }) =>
        ds.getUserSymbolMeaning(args.userId, args.symbolName)
    )(manager),

    symbolSuggestions: (_parent: any, args: { query: string; limit?: number }) => {
      // This doesn't need the database - it's purely from the symbol mappings
      return searchDreamSymbols(args.query, args.limit || 10).map(s => ({
        id: s.name.toLowerCase().replace(/\s+/g, '-'),
        name: s.name,
        normalizedName: s.name.toLowerCase(),
        category: s.category,
        systemMeanings: s.meanings,
        associatedCards: [],
        isSystemSymbol: true,
        createdAt: new Date().toISOString()
      }));
    },

    // Dream Journal Queries
    dreams: createQueryResolver(
      (ds, args: { userId: string; filters?: dream_filters }) =>
        ds.getDreams(args.userId, args.filters)
    )(manager),

    dream: createQueryResolver(
      (ds, args: { id: string; userId: string }) => ds.getDream(args.id, args.userId)
    )(manager),

    dreamByDate: createQueryResolver(
      (ds, args: { userId: string; date: string }) => ds.getDreamByDate(args.userId, args.date)
    )(manager),

    recentDreams: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.getRecentDreams(args.userId, args.limit || 5)
    )(manager),

    searchDreams: createQueryResolver(
      (ds, args: { userId: string; query: string; limit?: number }) =>
        ds.searchDreams(args.userId, args.query, args.limit || 20)
    )(manager),

    // Meditation Journal Queries
    meditations: createQueryResolver(
      (ds, args: { userId: string; filters?: meditation_filters }) =>
        ds.getMeditations(args.userId, args.filters)
    )(manager),

    meditation: createQueryResolver(
      (ds, args: { id: string; userId: string }) => ds.getMeditation(args.id, args.userId)
    )(manager),

    recentMeditations: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.getRecentMeditations(args.userId, args.limit || 5)
    )(manager),

    meditationStats: createQueryResolver(
      (ds, args: { userId: string }) => ds.getMeditationStats(args.userId)
    )(manager),

    // ============================================
    // Crystal & Stones Queries
    // ============================================

    // Collection
    crystalCollection: createQueryResolver(
      (ds, args: { userId: string; filters?: crystal_collection_filters }) =>
        ds.getCrystalCollection(args.userId, args.filters)
    )(manager),

    crystal: createQueryResolver(
      (ds, args: { id: string; userId: string }) => ds.getCrystal(args.id, args.userId)
    )(manager),

    // Wishlist
    crystalWishlist: createQueryResolver(
      (ds, args: { userId: string; filters?: crystal_wishlist_filters }) =>
        ds.getCrystalWishlist(args.userId, args.filters)
    )(manager),

    wishlistItem: createQueryResolver(
      (ds, args: { id: string; userId: string }) => ds.getWishlistItem(args.id, args.userId)
    )(manager),

    wishlistItemByCrystalRef: createQueryResolver(
      (ds, args: { userId: string; crystalRefId: string }) => ds.getWishlistItemByCrystalRef(args.userId, args.crystalRefId)
    )(manager),

    // Companion
    crystalCompanionLogs: createQueryResolver(
      (ds, args: { userId: string; filters?: crystal_companion_filters }) =>
        ds.getCrystalCompanionLogs(args.userId, args.filters)
    )(manager),

    todaysCompanion: createQueryResolver(
      (ds, args: { userId: string }) => ds.getTodaysCompanion(args.userId)
    )(manager),

    // Cleansing
    crystalCleansingLogs: createQueryResolver(
      (ds, args: { userId: string; filters?: crystal_cleansing_filters }) =>
        ds.getCrystalCleansingLogs(args.userId, args.filters)
    )(manager),

    // Grids
    crystalGrids: createQueryResolver(
      (ds, args: { userId: string; filters?: crystal_grid_filters }) =>
        ds.getCrystalGrids(args.userId, args.filters)
    )(manager),

    crystalGrid: createQueryResolver(
      (ds, args: { id: string; userId: string }) => ds.getCrystalGrid(args.id, args.userId)
    )(manager),

    // Stats
    crystalStats: createQueryResolver(
      (ds, args: { userId: string }) => ds.getCrystalStats(args.userId)
    )(manager),

    // ============================================
    // Energy Healing Queries
    // ============================================

    // Energy Journal
    energyJournalEntries: createQueryResolver(
      (ds, args: { userId: string; filters?: energy_journal_filters }) =>
        ds.getEnergyJournalEntries(args.userId, args.filters)
    )(manager),

    energyJournalEntry: createQueryResolver(
      (ds, args: { id: string; userId: string }) => ds.getEnergyJournalEntry(args.id, args.userId)
    )(manager),

    recentEnergyJournalEntries: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.getEnergyJournalEntries(args.userId, { limit: args.limit || 5 })
    )(manager),

    // Chakra Check-In
    chakraCheckins: createQueryResolver(
      (ds, args: { userId: string; filters?: chakra_checkin_filters }) =>
        ds.getChakraCheckins(args.userId, args.filters)
    )(manager),

    chakraCheckin: createQueryResolver(
      (ds, args: { id: string; userId: string }) => ds.getChakraCheckin(args.id, args.userId)
    )(manager),

    todaysChakraCheckin: createQueryResolver(
      (ds, args: { userId: string }) => ds.getTodaysChakraCheckin(args.userId)
    )(manager),

    // Session Reflections
    sessionReflections: createQueryResolver(
      (ds, args: { userId: string; filters?: session_reflection_filters }) =>
        ds.getSessionReflections(args.userId, args.filters)
    )(manager),

    sessionReflection: createQueryResolver(
      (ds, args: { id: string; userId: string }) => ds.getSessionReflection(args.id, args.userId)
    )(manager),

    recentSessionReflections: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.getSessionReflections(args.userId, { limit: args.limit || 5 })
    )(manager),

    // Energy Stats
    energyStats: createQueryResolver(
      (ds, args: { userId: string }) => ds.getEnergyStats(args.userId)
    )(manager),

    // ============================================
    // Prayer & Faith Queries
    // ============================================

    // Daily Passage
    todaysPassage: createQueryResolver(
      (ds, args: { userId: string }) => ds.faith.getTodaysPassage(args.userId)
    )(manager),

    dailyPassages: createQueryResolver(
      (ds, args: { userId: string; filters?: daily_passage_filters }) =>
        ds.faith.getDailyPassages(args.userId, args.filters)
    )(manager),

    dailyPassage: createQueryResolver(
      (ds, args: { id: string; userId: string }) => ds.faith.getDailyPassage(args.id, args.userId)
    )(manager),

    // Prayer Journal
    prayerJournalEntries: createQueryResolver(
      (ds, args: { userId: string; filters?: prayer_journal_filters }) =>
        ds.faith.getPrayerJournalEntries(args.userId, args.filters)
    )(manager),

    prayerJournalEntry: createQueryResolver(
      (ds, args: { id: string; userId: string }) => ds.faith.getPrayerJournalEntry(args.id, args.userId)
    )(manager),

    recentPrayers: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.faith.getRecentPrayers(args.userId, args.limit || 5)
    )(manager),

    answeredPrayers: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.faith.getAnsweredPrayers(args.userId, args.limit || 10)
    )(manager),

    prayerRequests: createQueryResolver(
      (ds, args: { userId: string; status?: prayer_status }) =>
        ds.faith.getPrayerRequests(args.userId, args.status)
    )(manager),

    // Scripture Reflections
    scriptureReflections: createQueryResolver(
      (ds, args: { userId: string; filters?: scripture_reflection_filters }) =>
        ds.faith.getScriptureReflections(args.userId, args.filters)
    )(manager),

    scriptureReflection: createQueryResolver(
      (ds, args: { id: string; userId: string }) => ds.faith.getScriptureReflection(args.id, args.userId)
    )(manager),

    recentScriptureReflections: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.faith.getRecentScriptureReflections(args.userId, args.limit || 5)
    )(manager),

    scriptureByBook: createQueryResolver(
      (ds, args: { userId: string; book: string; limit?: number }) =>
        ds.faith.getScriptureByBook(args.userId, args.book, args.limit || 20)
    )(manager),

    // Faith Stats
    faithStats: createQueryResolver(
      (ds, args: { userId: string }) => ds.faith.getFaithStats(args.userId)
    )(manager),

    // ============================================
    // Mediumship Queries
    // ============================================

    // Synchronicities
    synchronicities: createQueryResolver(
      (ds, args: { userId: string; filters?: synchronicity_filters }) =>
        ds.mediumship.getSynchronicities(args.userId, args.filters)
    )(manager),

    synchronicity: createQueryResolver(
      (ds, args: { id: string; userId: string }) =>
        ds.mediumship.getSynchronicity(args.id, args.userId)
    )(manager),

    recentSynchronicities: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.mediumship.getSynchronicities(args.userId, { limit: args.limit || 5 })
    )(manager),

    // Spirit Messages
    spiritMessages: createQueryResolver(
      (ds, args: { userId: string; filters?: spirit_message_filters }) =>
        ds.mediumship.getSpiritMessages(args.userId, args.filters)
    )(manager),

    spiritMessage: createQueryResolver(
      (ds, args: { id: string; userId: string }) =>
        ds.mediumship.getSpiritMessage(args.id, args.userId)
    )(manager),

    recentSpiritMessages: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.mediumship.getSpiritMessages(args.userId, { limit: args.limit || 5 })
    )(manager),

    // Personal Symbols
    personalSymbols: createQueryResolver(
      (ds, args: { userId: string; filters?: personal_symbol_filters }) =>
        ds.mediumship.getPersonalSymbols(args.userId, args.filters)
    )(manager),

    personalSymbol: createQueryResolver(
      (ds, args: { id: string; userId: string }) =>
        ds.mediumship.getPersonalSymbol(args.id, args.userId)
    )(manager),

    personalSymbolByName: createQueryResolver(
      (ds, args: { userId: string; symbolName: string }) =>
        ds.mediumship.getPersonalSymbolByName(args.userId, args.symbolName)
    )(manager),

    // User Card Symbols
    userCardSymbols: createQueryResolver(
      (ds, args: { userId: string }) =>
        ds.mediumship.getUserCardSymbols(args.userId)
    )(manager),

    userCardSymbol: createQueryResolver(
      (ds, args: { id: string; userId: string }) =>
        ds.mediumship.getUserCardSymbol(args.id, args.userId)
    )(manager),

    userCardSymbolByCardName: createQueryResolver(
      (ds, args: { userId: string; cardName: string }) =>
        ds.mediumship.getUserCardSymbolByCardName(args.userId, args.cardName)
    )(manager),

    // Loved Ones
    lovedOnes: createQueryResolver(
      (ds, args: { userId: string; filters?: loved_one_filters }) =>
        ds.mediumship.getLovedOnes(args.userId, args.filters)
    )(manager),

    lovedOne: createQueryResolver(
      (ds, args: { id: string; userId: string }) =>
        ds.mediumship.getLovedOne(args.id, args.userId)
    )(manager),

    // Development Exercises
    developmentExercises: createQueryResolver(
      (ds, args: { userId: string; filters?: development_exercise_filters }) =>
        ds.mediumship.getDevelopmentExercises(args.userId, args.filters)
    )(manager),

    developmentExercise: createQueryResolver(
      (ds, args: { id: string; userId: string }) =>
        ds.mediumship.getDevelopmentExercise(args.id, args.userId)
    )(manager),

    recentDevelopmentExercises: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.mediumship.getDevelopmentExercises(args.userId, { limit: args.limit || 5 })
    )(manager),

    // Reading Reflections
    readingReflections: createQueryResolver(
      (ds, args: { userId: string; filters?: reading_reflection_filters }) =>
        ds.mediumship.getReadingReflections(args.userId, args.filters)
    )(manager),

    readingReflection: createQueryResolver(
      (ds, args: { id: string; userId: string }) =>
        ds.mediumship.getReadingReflection(args.id, args.userId)
    )(manager),

    recentReadingReflections: createQueryResolver(
      (ds, args: { userId: string; limit?: number }) =>
        ds.mediumship.getReadingReflections(args.userId, { limit: args.limit || 5 })
    )(manager),

    // Mediumship Stats
    mediumshipStats: createQueryResolver(
      (ds, args: { userId: string }) => ds.mediumship.getMediumshipStats(args.userId)
    )(manager),

    // ============================================
    // Astrology Queries
    // ============================================

    // Birth Chart
    birthChart: createQueryResolver(
      (ds, args: { userId: string }) => ds.astrology.getBirthChart(args.userId)
    )(manager),

    // City Search
    searchCities: createQueryResolver(
      (ds, args: { query: string; limit?: number }) =>
        ds.astrology.searchCities(args.query, args.limit || 20)
    )(manager),

    // Current Transits
    currentTransits: async (_: any, args: { input?: get_transits_input }, context: serverContext) => {
      const ds = manager(context);
      const authenticatedUserId = context.userId;
      return ds.astrology.getTransits(args.input || {}, authenticatedUserId);
    },

    // Astrology Journal Queries
    astrologyJournalEntries: createQueryResolver(
      (ds, args: { userId: string; filters?: astrology_journal_filters }) =>
        ds.astrology.getJournalEntries(args.userId, args.filters)
    )(manager),

    astrologyJournalEntry: createQueryResolver(
      (ds, args: { id: string; userId: string }) =>
        ds.astrology.getJournalEntry(args.id, args.userId)
    )(manager),

    astrologyJournalPrompt: async (_: any, args: { userId: string }, context: serverContext) => {
      const ds = manager(context);
      return ds.astrology.getJournalPrompt(args.userId);
    },

    astrologyJournalStats: createQueryResolver(
      (ds, args: { userId: string }) => ds.astrology.getJournalStats(args.userId)
    )(manager),

    // ============================================
    // Progressive Unlock Queries
    // ============================================

    getUserUnlockState: async (_: any, args: { userId: string }, context: serverContext) => {
      const um = unlockManager(context);
      // Get user's interests from user profile
      const userQuery = {
        query: 'SELECT c.primarySpiritualInterest, c.secondarySpiritualInterests FROM c WHERE c.id = @userId',
        parameters: [{ name: '@userId', value: args.userId }]
      };
      const users = await context.dataSources.cosmos.run_query<{
        primarySpiritualInterest?: SpiritualInterest;
        secondarySpiritualInterests?: SpiritualInterest[];
      }>('Main-User', userQuery);

      const user = users[0];
      const interests: SpiritualInterest[] = [];
      if (user?.primarySpiritualInterest) interests.push(user.primarySpiritualInterest);
      if (user?.secondarySpiritualInterests) interests.push(...user.secondarySpiritualInterests);

      return um.getUserUnlockState(args.userId, interests);
    },

    getFeatureUnlockStatus: async (_: any, args: { userId: string; featureId: string }, context: serverContext) => {
      const um = unlockManager(context);
      return um.getFeatureUnlockStatus(args.userId, args.featureId as unlockable_feature);
    },

    getUserActivityMetrics: async (_: any, args: { userId: string }, context: serverContext) => {
      const um = unlockManager(context);
      return um.getUserActivityMetrics(args.userId);
    },

    getFeatureDefinition: (_: any, args: { featureId: string }) => {
      const feature = FEATURE_REGISTRY[args.featureId as unlockable_feature];
      if (!feature) return null;
      return {
        id: feature.id,
        name: feature.name,
        description: feature.description,
        interestArea: feature.interestArea,
        icon: feature.icon,
        route: feature.route,
        celebration: feature.celebration
      };
    },

    getFeaturesForInterest: (_: any, args: { interest: string }) => {
      const interest = args.interest.toUpperCase() as SpiritualInterest;
      const features = getFeaturesForInterest(interest);
      return features.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        interestArea: f.interestArea,
        icon: f.icon,
        route: f.route,
        celebration: f.celebration
      }));
    },

    isFeatureUnlocked: async (_: any, args: { userId: string; featureId: string }, context: serverContext) => {
      const um = unlockManager(context);
      return um.isFeatureUnlocked(args.userId, args.featureId as unlockable_feature);
    },

    getUnlockedFeatures: async (_: any, args: { userId: string; interest: string }, context: serverContext) => {
      const um = unlockManager(context);
      const interest = args.interest.toUpperCase() as SpiritualInterest;
      return um.getUnlockedFeatures(args.userId, interest);
    }
  },

  Mutation: {
    // ============================================
    // Reading Entry Mutations (New)
    // ============================================
    createReadingEntry: createMutationResolver(
      "createReadingEntry",
      (ds, args: { input: create_reading_entry_input }, userId: string) =>
        ds.createReadingEntry(args.input, userId)
    )(manager),

    updateReadingEntry: createMutationResolver(
      "updateReadingEntry",
      (ds, args: { input: update_reading_entry_input }, userId: string) =>
        ds.updateReadingEntry(args.input, userId)
    )(manager),

    deleteReadingEntry: createMutationResolver(
      "deleteReadingEntry",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.deleteReadingEntry(args.id, args.userId, authenticatedUserId)
    )(manager),

    // ============================================
    // Legacy Card Pull Mutations (Backwards Compatibility)
    // ============================================
    createCardPull: createMutationResolver(
      "createCardPull",
      (ds, args: { input: create_card_pull_input }, userId: string) =>
        ds.createCardPull(args.input, userId)
    )(manager),

    updateCardPull: createMutationResolver(
      "updateCardPull",
      (ds, args: { input: update_card_pull_input }, userId: string) =>
        ds.updateCardPull(args.input, userId)
    )(manager),

    deleteCardPull: createMutationResolver(
      "deleteCardPull",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.deleteCardPull(args.id, args.userId, authenticatedUserId)
    )(manager),

    // ============================================
    // Symbol Mutations
    // ============================================
    updateUserSymbolMeaning: createMutationResolver(
      "updateUserSymbolMeaning",
      (ds, args: { input: { userId: string; symbolName: string; personalMeaning: string } }, authenticatedUserId: string) =>
        ds.updateUserSymbolMeaning(args.input.userId, args.input.symbolName, args.input.personalMeaning, authenticatedUserId)
    )(manager),

    // Dream Journal Mutations
    createDream: createMutationResolver(
      "createDream",
      (ds, args: { input: create_dream_input }, userId: string) =>
        ds.createDream(args.input, userId)
    )(manager),

    updateDream: createMutationResolver(
      "updateDream",
      (ds, args: { input: update_dream_input }, userId: string) =>
        ds.updateDream(args.input, userId)
    )(manager),

    deleteDream: createMutationResolver(
      "deleteDream",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.deleteDream(args.id, args.userId, authenticatedUserId)
    )(manager),

    // Meditation Journal Mutations
    createMeditation: createMutationResolver(
      "createMeditation",
      (ds, args: { input: create_meditation_input }, userId: string) =>
        ds.createMeditation(args.input, userId)
    )(manager),

    updateMeditation: createMutationResolver(
      "updateMeditation",
      (ds, args: { input: update_meditation_input }, userId: string) =>
        ds.updateMeditation(args.input, userId)
    )(manager),

    deleteMeditation: createMutationResolver(
      "deleteMeditation",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.deleteMeditation(args.id, args.userId, authenticatedUserId)
    )(manager),

    // ============================================
    // Crystal & Stones Mutations
    // ============================================

    // Collection
    createCrystal: createMutationResolver(
      "createCrystal",
      (ds, args: { input: create_crystal_collection_input }, userId: string) =>
        ds.createCrystal(args.input, userId)
    )(manager),

    updateCrystal: createMutationResolver(
      "updateCrystal",
      (ds, args: { input: update_crystal_collection_input }, userId: string) =>
        ds.updateCrystal(args.input, userId)
    )(manager),

    deleteCrystal: createMutationResolver(
      "deleteCrystal",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.deleteCrystal(args.id, args.userId, authenticatedUserId)
    )(manager),

    // Wishlist
    createWishlistItem: createMutationResolver(
      "createWishlistItem",
      (ds, args: { input: create_crystal_wishlist_input }, userId: string) =>
        ds.createWishlistItem(args.input, userId)
    )(manager),

    updateWishlistItem: createMutationResolver(
      "updateWishlistItem",
      (ds, args: { input: update_crystal_wishlist_input }, userId: string) =>
        ds.updateWishlistItem(args.input, userId)
    )(manager),

    deleteWishlistItem: createMutationResolver(
      "deleteWishlistItem",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.deleteWishlistItem(args.id, args.userId, authenticatedUserId)
    )(manager),

    acquireFromWishlist: createMutationResolver(
      "acquireFromWishlist",
      (ds, args: { input: { wishlistItemId: string; userId: string; vendorName?: string; purchasePrice?: number; currency?: string; form?: string; origin?: string; photoUrl?: string } }, authenticatedUserId: string) =>
        ds.acquireFromWishlist(args.input.wishlistItemId, args.input.userId, authenticatedUserId, {
          vendorName: args.input.vendorName,
          purchasePrice: args.input.purchasePrice,
          currency: args.input.currency,
          form: args.input.form,
          origin: args.input.origin,
          photoUrl: args.input.photoUrl
        })
    )(manager),

    // Companion
    createCompanionLog: createMutationResolver(
      "createCompanionLog",
      (ds, args: { input: create_crystal_companion_input }, userId: string) =>
        ds.createCompanionLog(args.input, userId)
    )(manager),

    updateCompanionLog: createMutationResolver(
      "updateCompanionLog",
      (ds, args: { input: update_crystal_companion_input }, userId: string) =>
        ds.updateCompanionLog(args.input, userId)
    )(manager),

    // Cleansing
    createCleansingLog: createMutationResolver(
      "createCleansingLog",
      (ds, args: { input: create_crystal_cleansing_input }, userId: string) =>
        ds.createCleansingLog(args.input, userId)
    )(manager),

    updateCleansingLog: createMutationResolver(
      "updateCleansingLog",
      (ds, args: { input: update_crystal_cleansing_input }, userId: string) =>
        ds.updateCleansingLog(args.input, userId)
    )(manager),

    deleteCleansingLog: createMutationResolver(
      "deleteCleansingLog",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.deleteCleansingLog(args.id, args.userId, authenticatedUserId)
    )(manager),

    // Grids
    createCrystalGrid: createMutationResolver(
      "createCrystalGrid",
      (ds, args: { input: create_crystal_grid_input }, userId: string) =>
        ds.createCrystalGrid(args.input, userId)
    )(manager),

    updateCrystalGrid: createMutationResolver(
      "updateCrystalGrid",
      (ds, args: { input: update_crystal_grid_input }, userId: string) =>
        ds.updateCrystalGrid(args.input, userId)
    )(manager),

    deleteCrystalGrid: createMutationResolver(
      "deleteCrystalGrid",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.deleteCrystalGrid(args.id, args.userId, authenticatedUserId)
    )(manager),

    // ============================================
    // Energy Healing Mutations
    // ============================================

    // Energy Journal
    createEnergyJournalEntry: createMutationResolver(
      "createEnergyJournalEntry",
      (ds, args: { input: create_energy_journal_input }, userId: string) =>
        ds.createEnergyJournalEntry(args.input, userId)
    )(manager),

    updateEnergyJournalEntry: createMutationResolver(
      "updateEnergyJournalEntry",
      (ds, args: { input: update_energy_journal_input }, userId: string) =>
        ds.updateEnergyJournalEntry(args.input, userId)
    )(manager),

    deleteEnergyJournalEntry: createMutationResolver(
      "deleteEnergyJournalEntry",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.deleteEnergyJournalEntry(args.id, args.userId, authenticatedUserId)
    )(manager),

    // Chakra Check-In
    createChakraCheckin: createMutationResolver(
      "createChakraCheckin",
      (ds, args: { input: create_chakra_checkin_input }, userId: string) =>
        ds.createChakraCheckin(args.input, userId)
    )(manager),

    updateChakraCheckin: createMutationResolver(
      "updateChakraCheckin",
      (ds, args: { input: update_chakra_checkin_input }, userId: string) =>
        ds.updateChakraCheckin(args.input, userId)
    )(manager),

    deleteChakraCheckin: createMutationResolver(
      "deleteChakraCheckin",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.deleteChakraCheckin(args.id, args.userId, authenticatedUserId)
    )(manager),

    // Session Reflection
    createSessionReflection: createMutationResolver(
      "createSessionReflection",
      (ds, args: { input: create_session_reflection_input }, userId: string) =>
        ds.createSessionReflection(args.input, userId)
    )(manager),

    updateSessionReflection: createMutationResolver(
      "updateSessionReflection",
      (ds, args: { input: update_session_reflection_input }, userId: string) =>
        ds.updateSessionReflection(args.input, userId)
    )(manager),

    deleteSessionReflection: createMutationResolver(
      "deleteSessionReflection",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.deleteSessionReflection(args.id, args.userId, authenticatedUserId)
    )(manager),

    // ============================================
    // Prayer & Faith Mutations
    // ============================================

    // Daily Passage
    markPassageRead: createMutationResolver(
      "markPassageRead",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.faith.markPassageRead(args.id, args.userId, authenticatedUserId)
    )(manager),

    reflectOnPassage: createMutationResolver(
      "reflectOnPassage",
      (ds, args: { input: reflect_on_passage_input }, authenticatedUserId: string) =>
        ds.faith.reflectOnPassage(args.input, authenticatedUserId)
    )(manager),

    // Prayer Journal
    createPrayerJournalEntry: createMutationResolver(
      "createPrayerJournalEntry",
      (ds, args: { input: create_prayer_journal_input }, userId: string) =>
        ds.faith.createPrayerJournalEntry(args.input, userId)
    )(manager),

    updatePrayerJournalEntry: createMutationResolver(
      "updatePrayerJournalEntry",
      (ds, args: { input: update_prayer_journal_input }, userId: string) =>
        ds.faith.updatePrayerJournalEntry(args.input, userId)
    )(manager),

    deletePrayerJournalEntry: createMutationResolver(
      "deletePrayerJournalEntry",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.faith.deletePrayerJournalEntry(args.id, args.userId, authenticatedUserId)
    )(manager),

    markPrayerAnswered: createMutationResolver(
      "markPrayerAnswered",
      (ds, args: { id: string; userId: string; answeredDate?: string; answerDescription?: string }, authenticatedUserId: string) =>
        ds.faith.markPrayerAnswered(args.id, args.userId, authenticatedUserId, args.answeredDate, args.answerDescription)
    )(manager),

    // Scripture Reflections
    createScriptureReflection: createMutationResolver(
      "createScriptureReflection",
      (ds, args: { input: create_scripture_reflection_input }, userId: string) =>
        ds.faith.createScriptureReflection(args.input, userId)
    )(manager),

    updateScriptureReflection: createMutationResolver(
      "updateScriptureReflection",
      (ds, args: { input: update_scripture_reflection_input }, userId: string) =>
        ds.faith.updateScriptureReflection(args.input, userId)
    )(manager),

    deleteScriptureReflection: createMutationResolver(
      "deleteScriptureReflection",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.faith.deleteScriptureReflection(args.id, args.userId, authenticatedUserId)
    )(manager),

    // ============================================
    // Mediumship Mutations
    // ============================================

    // Synchronicities
    createSynchronicity: createMutationResolver(
      "createSynchronicity",
      (ds, args: { input: create_synchronicity_input }, userId: string) =>
        ds.mediumship.createSynchronicity(args.input, userId)
    )(manager),

    updateSynchronicity: createMutationResolver(
      "updateSynchronicity",
      (ds, args: { input: update_synchronicity_input }, userId: string) =>
        ds.mediumship.updateSynchronicity(args.input, userId)
    )(manager),

    deleteSynchronicity: createMutationResolver(
      "deleteSynchronicity",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.mediumship.deleteSynchronicity(args.id, args.userId, authenticatedUserId)
    )(manager),

    // Spirit Messages
    createSpiritMessage: createMutationResolver(
      "createSpiritMessage",
      (ds, args: { input: create_spirit_message_input }, userId: string) =>
        ds.mediumship.createSpiritMessage(args.input, userId)
    )(manager),

    updateSpiritMessage: createMutationResolver(
      "updateSpiritMessage",
      (ds, args: { input: update_spirit_message_input }, userId: string) =>
        ds.mediumship.updateSpiritMessage(args.input, userId)
    )(manager),

    deleteSpiritMessage: createMutationResolver(
      "deleteSpiritMessage",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.mediumship.deleteSpiritMessage(args.id, args.userId, authenticatedUserId)
    )(manager),

    // Personal Symbols
    createPersonalSymbol: createMutationResolver(
      "createPersonalSymbol",
      (ds, args: { input: create_personal_symbol_input }, userId: string) =>
        ds.mediumship.createPersonalSymbol(args.input, userId)
    )(manager),

    updatePersonalSymbol: createMutationResolver(
      "updatePersonalSymbol",
      (ds, args: { input: update_personal_symbol_input }, userId: string) =>
        ds.mediumship.updatePersonalSymbol(args.input, userId)
    )(manager),

    deletePersonalSymbol: createMutationResolver(
      "deletePersonalSymbol",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.mediumship.deletePersonalSymbol(args.id, args.userId, authenticatedUserId)
    )(manager),

    // User Card Symbols
    createUserCardSymbols: createMutationResolver(
      "createUserCardSymbols",
      (ds, args: { input: create_user_card_symbols_input }, userId: string) =>
        ds.mediumship.createUserCardSymbols(args.input, userId)
    )(manager),

    updateUserCardSymbols: createMutationResolver(
      "updateUserCardSymbols",
      (ds, args: { input: update_user_card_symbols_input }, userId: string) =>
        ds.mediumship.updateUserCardSymbols(args.input, userId)
    )(manager),

    deleteUserCardSymbols: createMutationResolver(
      "deleteUserCardSymbols",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.mediumship.deleteUserCardSymbols(args.id, args.userId, authenticatedUserId)
    )(manager),

    // Loved Ones
    createLovedOne: createMutationResolver(
      "createLovedOne",
      (ds, args: { input: create_loved_one_input }, userId: string) =>
        ds.mediumship.createLovedOne(args.input, userId)
    )(manager),

    updateLovedOne: createMutationResolver(
      "updateLovedOne",
      (ds, args: { input: update_loved_one_input }, userId: string) =>
        ds.mediumship.updateLovedOne(args.input, userId)
    )(manager),

    deleteLovedOne: createMutationResolver(
      "deleteLovedOne",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.mediumship.deleteLovedOne(args.id, args.userId, authenticatedUserId)
    )(manager),

    // Development Exercises
    createDevelopmentExercise: createMutationResolver(
      "createDevelopmentExercise",
      (ds, args: { input: create_development_exercise_input }, userId: string) =>
        ds.mediumship.createDevelopmentExercise(args.input, userId)
    )(manager),

    updateDevelopmentExercise: createMutationResolver(
      "updateDevelopmentExercise",
      (ds, args: { input: update_development_exercise_input }, userId: string) =>
        ds.mediumship.updateDevelopmentExercise(args.input, userId)
    )(manager),

    deleteDevelopmentExercise: createMutationResolver(
      "deleteDevelopmentExercise",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.mediumship.deleteDevelopmentExercise(args.id, args.userId, authenticatedUserId)
    )(manager),

    // Reading Reflections
    createReadingReflection: createMutationResolver(
      "createReadingReflection",
      (ds, args: { input: create_reading_reflection_input }, userId: string) =>
        ds.mediumship.createReadingReflection(args.input, userId)
    )(manager),

    updateReadingReflection: createMutationResolver(
      "updateReadingReflection",
      (ds, args: { input: update_reading_reflection_input }, userId: string) =>
        ds.mediumship.updateReadingReflection(args.input, userId)
    )(manager),

    deleteReadingReflection: createMutationResolver(
      "deleteReadingReflection",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.mediumship.deleteReadingReflection(args.id, args.userId, authenticatedUserId)
    )(manager),

    // ============================================
    // Astrology Mutations
    // ============================================

    createBirthChart: createMutationResolver(
      "createBirthChart",
      (ds, args: { input: create_birth_chart_input }, userId: string) =>
        ds.astrology.createBirthChart(args.input, userId)
    )(manager),

    updateBirthChart: createMutationResolver(
      "updateBirthChart",
      (ds, args: { input: update_birth_chart_input }, userId: string) =>
        ds.astrology.updateBirthChart(args.input, userId)
    )(manager),

    deleteBirthChart: createMutationResolver(
      "deleteBirthChart",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.astrology.deleteBirthChart(args.id, args.userId, authenticatedUserId)
    )(manager),

    // Astrology Journal Mutations
    createAstrologyJournalEntry: createMutationResolver(
      "createAstrologyJournalEntry",
      (ds, args: { input: create_astrology_journal_input }, userId: string) =>
        ds.astrology.createJournalEntry(args.input, userId)
    )(manager),

    updateAstrologyJournalEntry: createMutationResolver(
      "updateAstrologyJournalEntry",
      (ds, args: { input: update_astrology_journal_input }, userId: string) =>
        ds.astrology.updateJournalEntry(args.input, userId)
    )(manager),

    deleteAstrologyJournalEntry: createMutationResolver(
      "deleteAstrologyJournalEntry",
      (ds, args: { id: string; userId: string }, authenticatedUserId: string) =>
        ds.astrology.deleteJournalEntry(args.id, args.userId, authenticatedUserId)
    )(manager),

    // ============================================
    // Progressive Unlock Mutations
    // ============================================

    markCelebrationShown: async (_: any, args: { userId: string; featureId: string }, context: serverContext) => {
      const um = unlockManager(context);
      return um.markCelebrationShown(args.userId, args.featureId as unlockable_feature);
    }
  },

  // ============================================
  // Type Resolvers for Reading Entry
  // ============================================
  ReadingEntry: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    },
    // Ensure symbols and themes always return arrays
    symbols: (parent: any) => parent.symbols || [],
    themes: (parent: any) => parent.themes || []
  },

  // ============================================
  // Legacy DailyCardPull Type Resolver (Backwards Compatibility)
  // ============================================
  DailyCardPull: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    },
    // Extract deck from sourceDetails for legacy compatibility
    deck: (parent: any) => {
      // New format has deck in sourceDetails
      if (parent.sourceDetails?.deck) {
        return parent.sourceDetails.deck;
      }
      // Legacy format has deck at top level
      return parent.deck;
    },
    // Expose new fields on legacy type
    sourceType: (parent: any) => parent.sourceType || 'SELF',
    sourceDetails: (parent: any) => parent.sourceDetails || { deck: parent.deck },
    symbols: (parent: any) => parent.symbols || [],
    themes: (parent: any) => parent.themes || []
  },

  DreamJournalEntry: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    }
  },

  MeditationJournalEntry: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    }
  },

  // ============================================
  // Crystal Type Resolvers
  // ============================================
  CrystalCollectionItem: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    },
    crystalRef: async (parent: any, _: any, context: serverContext) => {
      if (!parent.crystalRefId) return null;
      try {
        return await context.dataSources.cosmos.get_record(
          "System-SettingTrees",
          parent.crystalRefId,
          "crystal-reference"
        );
      } catch {
        return null;
      }
    }
  },

  CrystalWishlistItem: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    },
    crystalRef: async (parent: any, _: any, context: serverContext) => {
      if (!parent.crystalRefId) return null;
      try {
        return await context.dataSources.cosmos.get_record(
          "System-SettingTrees",
          parent.crystalRefId,
          "crystal-reference"
        );
      } catch {
        return null;
      }
    }
  },

  CrystalCompanionLog: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    }
  },

  CrystalCleansingLog: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    }
  },

  CrystalGrid: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    }
  },

  // ============================================
  // Energy Healing Type Resolvers
  // ============================================
  EnergyJournalEntry: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    },
    sensations: (parent: any) => parent.sensations || [],
    techniquesUsed: (parent: any) => parent.techniquesUsed || [],
    toolsUsed: (parent: any) => parent.toolsUsed || []
  },

  ChakraCheckin: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    },
    chakras: (parent: any) => parent.chakras || []
  },

  SessionReflection: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    },
    sensations: (parent: any) => parent.sensations || [],
    areasWorkedOn: (parent: any) => parent.areasWorkedOn || []
  },

  // ============================================
  // Prayer & Faith Type Resolvers
  // ============================================
  DailyPassage: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    }
  },

  PrayerJournalEntry: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    },
    requests: (parent: any) => parent.requests || [],
    gratitude: (parent: any) => parent.gratitude || [],
    tags: (parent: any) => parent.tags || []
  },

  ScriptureReflection: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    },
    questions: (parent: any) => parent.questions || [],
    crossReferences: (parent: any) => parent.crossReferences || []
  },

  // ============================================
  // Astrology Type Resolvers
  // ============================================
  BirthChart: {
    ref: async (parent: any, _: any, _context: serverContext) => {
      return {
        id: parent.id,
        partition: [parent.userId],
        container: "Main-PersonalSpace"
      };
    },
    planets: (parent: any) => parent.planets || [],
    houses: (parent: any) => parent.houses || null,
    aspects: (parent: any) => parent.aspects || []
  }
};

export { resolvers };
