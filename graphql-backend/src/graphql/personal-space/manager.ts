import { CosmosDataSource } from "../../utils/database";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import {
  reading_entry_type,
  create_reading_entry_input,
  update_reading_entry_input,
  reading_entry_filters,
  reading_entry_response,
  delete_reading_entry_response,
  symbol_tag,
  user_symbol_meaning_type,
  dream_journal_type,
  create_dream_input,
  update_dream_input,
  dream_filters,
  dream_response,
  delete_dream_response,
  meditation_journal_type,
  create_meditation_input,
  update_meditation_input,
  meditation_filters,
  meditation_response,
  delete_meditation_response,
  // Legacy type aliases
  daily_card_pull_type,
  create_card_pull_input,
  update_card_pull_input,
  card_pull_filters,
  card_pull_response,
  delete_card_pull_response,
  // Crystal types
  crystal_collection_item_type,
  crystal_wishlist_item_type,
  crystal_companion_log_type,
  crystal_cleansing_log_type,
  crystal_grid_type,
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
  crystal_collection_response,
  crystal_wishlist_response,
  crystal_companion_response,
  crystal_cleansing_response,
  crystal_grid_response,
  delete_crystal_response,
  crystal_collection_filters,
  crystal_wishlist_filters,
  crystal_companion_filters,
  crystal_cleansing_filters,
  crystal_grid_filters,
  crystal_stats,
  // Energy Healing types (re-exported for API compatibility)
  energy_journal_type,
  chakra_checkin_type,
  session_reflection_type,
  create_energy_journal_input,
  update_energy_journal_input,
  create_chakra_checkin_input,
  update_chakra_checkin_input,
  create_session_reflection_input,
  update_session_reflection_input,
  energy_journal_response,
  chakra_checkin_response,
  session_reflection_response,
  delete_energy_response,
  energy_journal_filters,
  chakra_checkin_filters,
  session_reflection_filters,
  energy_stats
} from "./types";
import { extractSymbolsFromCard, getSymbolCategory, isMajorArcana, getCardSuit, normalizeCardName } from "./tarot-symbols";
import { card_pattern_stats, card_frequency, suit_distribution, symbol_pattern_stats, symbol_occurrence, PatternPeriod } from "./types";
import { EnergyHealingManager, FaithManager, MediumshipManager, AstrologyManager } from "./managers";

export class PersonalSpaceManager {
  private containerName = "Main-PersonalSpace";
  private cosmos: CosmosDataSource;

  // Delegated managers for domain-specific operations
  public readonly energy: EnergyHealingManager;
  public readonly faith: FaithManager;
  public readonly mediumship: MediumshipManager;
  public readonly astrology: AstrologyManager;

  constructor(cosmos: CosmosDataSource) {
    this.cosmos = cosmos;
    this.energy = new EnergyHealingManager(cosmos);
    this.faith = new FaithManager(cosmos);
    this.mediumship = new MediumshipManager(cosmos);
    this.astrology = new AstrologyManager(cosmos);
  }

  // ============================================
  // Reading Entry Queries (Enhanced Card Pulls)
  // ============================================

  async getReadingEntries(userId: string, filters?: reading_entry_filters): Promise<reading_entry_type[]> {
    // Query both new READING_ENTRY and legacy CARD_PULL documents
    let query = "SELECT * FROM c WHERE c.userId = @userId AND (c.docType = @docType OR c.docType = @legacyDocType)";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "READING_ENTRY" },
      { name: "@legacyDocType", value: "CARD_PULL" }
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      parameters.push({ name: "@startDate", value: filters.startDate });
    }

    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      parameters.push({ name: "@endDate", value: filters.endDate });
    }

    if (filters?.sourceType) {
      query += " AND c.sourceType = @sourceType";
      parameters.push({ name: "@sourceType", value: filters.sourceType });
    }

    if (filters?.deck) {
      // Check both new structure and legacy structure
      query += " AND (c.sourceDetails.deck = @deck OR c.deck = @deck)";
      parameters.push({ name: "@deck", value: filters.deck });
    }

    if (filters?.hasQuestion === true) {
      query += " AND IS_DEFINED(c.question) AND c.question != null AND c.question != ''";
    } else if (filters?.hasQuestion === false) {
      query += " AND (NOT IS_DEFINED(c.question) OR c.question = null OR c.question = '')";
    }

    if (filters?.hasSymbol) {
      query += " AND EXISTS(SELECT VALUE s FROM s IN c.symbols WHERE s.name = @symbolName)";
      parameters.push({ name: "@symbolName", value: filters.hasSymbol });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    const results = await this.cosmos.run_query<reading_entry_type>(this.containerName, querySpec);

    // Normalize legacy records to new format
    return results.map(r => this.normalizeReadingEntry(r));
  }

  async getReadingEntry(id: string, userId: string): Promise<reading_entry_type | null> {
    // Try new docType first
    let entry = await this.cosmos.get_record_by_doctype<reading_entry_type>(
      this.containerName,
      id,
      userId,
      "READING_ENTRY"
    );

    // Fall back to legacy docType
    if (!entry) {
      entry = await this.cosmos.get_record_by_doctype<reading_entry_type>(
        this.containerName,
        id,
        userId,
        "CARD_PULL"
      );
    }

    return entry ? this.normalizeReadingEntry(entry) : null;
  }

  async getReadingEntryByDate(userId: string, date: string): Promise<reading_entry_type | null> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @userId AND (c.docType = @docType OR c.docType = @legacyDocType) AND c.date = @date",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "READING_ENTRY" },
        { name: "@legacyDocType", value: "CARD_PULL" },
        { name: "@date", value: date }
      ]
    };

    const results = await this.cosmos.run_query<reading_entry_type>(this.containerName, querySpec);
    return results.length > 0 ? this.normalizeReadingEntry(results[0]) : null;
  }

  async getRecentReadingEntries(userId: string, limit: number = 5): Promise<reading_entry_type[]> {
    const querySpec = {
      query: `SELECT TOP ${limit} * FROM c WHERE c.userId = @userId AND (c.docType = @docType OR c.docType = @legacyDocType) ORDER BY c.date DESC`,
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "READING_ENTRY" },
        { name: "@legacyDocType", value: "CARD_PULL" }
      ]
    };

    const results = await this.cosmos.run_query<reading_entry_type>(this.containerName, querySpec);
    return results.map(r => this.normalizeReadingEntry(r));
  }

  /**
   * Normalize legacy CARD_PULL records to new READING_ENTRY format
   */
  private normalizeReadingEntry(entry: any): reading_entry_type {
    // If it's already in new format, return as-is
    if (entry.docType === 'READING_ENTRY' && entry.sourceType) {
      return entry;
    }

    // Convert legacy CARD_PULL to READING_ENTRY format
    return {
      ...entry,
      docType: 'READING_ENTRY',
      sourceType: 'SELF',
      sourceDetails: {
        deck: entry.deck
      },
      symbols: entry.symbols || [],
      themes: entry.themes || [],
    };
  }

  // ============================================
  // Reading Entry Mutations
  // ============================================

  async createReadingEntry(input: create_reading_entry_input, authenticatedUserId: string): Promise<reading_entry_response> {
    // Verify the user is creating for themselves
    if (input.userId !== authenticatedUserId) {
      return {
        success: false,
        message: "You can only create reading entries for yourself"
      };
    }

    const id = uuid();
    const now = DateTime.now().toISO();
    const date = input.date || DateTime.now().toISODate();

    // Auto-extract symbols from cards (using personal symbols if defined)
    const autoSymbols = await this.extractSymbolsFromCards(input.cards.map(c => c.name), input.userId);

    // Merge auto-extracted with manually provided symbols
    const allSymbols: symbol_tag[] = [
      ...autoSymbols,
      ...(input.symbols || []).map(s => ({
        ...s,
        autoExtracted: s.autoExtracted ?? false
      }))
    ];

    // Dedupe by name
    const uniqueSymbols = this.dedupeSymbols(allSymbols);

    const readingEntry: Omit<reading_entry_type, '_id'> = {
      id,
      userId: input.userId,
      docType: 'READING_ENTRY',
      date: date!,
      sourceType: input.sourceType,
      sourceDetails: input.sourceDetails,
      cards: input.cards,
      spreadType: input.spreadType,
      question: input.question,
      firstImpression: input.firstImpression,
      reflection: input.reflection,
      resonanceScore: input.resonanceScore,
      symbols: uniqueSymbols,
      themes: input.themes || [],
      followUpDate: input.followUpDate,
      photoUrl: input.photoUrl,
      createdAt: now!,
      updatedAt: now!
    };

    const created = await this.cosmos.add_record<reading_entry_type>(
      this.containerName,
      readingEntry,
      input.userId,
      authenticatedUserId
    );

    // Update user symbol meanings
    await this.updateUserSymbolOccurrences(input.userId, uniqueSymbols, 'reading', authenticatedUserId);

    return {
      success: true,
      message: "Reading entry created successfully",
      readingEntry: created
    };
  }

  async updateReadingEntry(input: update_reading_entry_input, authenticatedUserId: string): Promise<reading_entry_response> {
    const existingEntry = await this.getReadingEntry(input.id, input.userId);
    if (!existingEntry) {
      return {
        success: false,
        message: "Reading entry not found"
      };
    }

    if (existingEntry.userId !== authenticatedUserId) {
      return {
        success: false,
        message: "You can only update your own reading entries"
      };
    }

    const updates: Partial<reading_entry_type> = {
      updatedAt: DateTime.now().toISO()!
    };

    if (input.sourceDetails !== undefined) updates.sourceDetails = input.sourceDetails;
    if (input.cards !== undefined) {
      updates.cards = input.cards;
      // Re-extract symbols if cards changed (using personal symbols if defined)
      const autoSymbols = await this.extractSymbolsFromCards(input.cards.map(c => c.name), input.userId);
      // Convert input symbols to symbol_tag or use existing
      const manualSymbols: symbol_tag[] = input.symbols
        ? input.symbols.filter(s => !s.autoExtracted).map(s => ({ ...s, autoExtracted: s.autoExtracted ?? false }))
        : existingEntry.symbols.filter(s => !s.autoExtracted);
      updates.symbols = this.dedupeSymbols([...autoSymbols, ...manualSymbols]);
    }
    if (input.spreadType !== undefined) updates.spreadType = input.spreadType;
    if (input.question !== undefined) updates.question = input.question;
    if (input.firstImpression !== undefined) updates.firstImpression = input.firstImpression;
    if (input.reflection !== undefined) updates.reflection = input.reflection;
    if (input.resonanceScore !== undefined) updates.resonanceScore = input.resonanceScore;
    if (input.symbols !== undefined && !input.cards) {
      // Only update symbols directly if cards weren't also updated
      const autoSymbols = existingEntry.symbols.filter(s => s.autoExtracted);
      const manualSymbols: symbol_tag[] = input.symbols.map(s => ({
        ...s,
        autoExtracted: s.autoExtracted ?? false
      }));
      updates.symbols = this.dedupeSymbols([...autoSymbols, ...manualSymbols]);
    }
    if (input.themes !== undefined) updates.themes = input.themes;
    if (input.followUpDate !== undefined) updates.followUpDate = input.followUpDate;
    if (input.outcome !== undefined) updates.outcome = input.outcome;
    if (input.photoUrl !== undefined) updates.photoUrl = input.photoUrl;

    await this.cosmos.update_record(
      this.containerName,
      input.id,
      input.userId,
      updates,
      authenticatedUserId
    );

    const updatedEntry = await this.getReadingEntry(input.id, input.userId);

    return {
      success: true,
      message: "Reading entry updated successfully",
      readingEntry: updatedEntry!
    };
  }

  async deleteReadingEntry(id: string, userId: string, authenticatedUserId: string): Promise<delete_reading_entry_response> {
    const existingEntry = await this.getReadingEntry(id, userId);
    if (!existingEntry) {
      return {
        success: false,
        message: "Reading entry not found"
      };
    }

    if (existingEntry.userId !== authenticatedUserId) {
      return {
        success: false,
        message: "You can only delete your own reading entries"
      };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);

    return {
      success: true,
      message: "Reading entry deleted successfully"
    };
  }

  // ============================================
  // Symbol Helpers
  // ============================================

  /**
   * Extract symbols from tarot cards, using personal user symbols when defined
   *
   * For each card:
   * 1. Check if user has personal symbols defined for that card
   * 2. If usePersonalOnly is true, ONLY use personal symbols
   * 3. Otherwise, merge personal symbols with default symbols
   * 4. Fall back to default symbols if no personal symbols defined
   */
  private async extractSymbolsFromCards(cardNames: string[], userId: string): Promise<symbol_tag[]> {
    const symbolMap = new Map<string, symbol_tag>();

    // Fetch all user card symbols at once for efficiency
    const userCardSymbols = await this.mediumship.getUserCardSymbols(userId);
    const userSymbolsByCard = new Map(
      userCardSymbols.map(ucs => [ucs.normalizedCardName, ucs])
    );

    for (const cardName of cardNames) {
      const normalizedName = cardName.toLowerCase().trim();
      const userCardConfig = userSymbolsByCard.get(normalizedName);

      let symbolsToAdd: string[] = [];

      if (userCardConfig) {
        // User has personal symbols for this card
        if (userCardConfig.usePersonalOnly) {
          // Only use personal symbols
          symbolsToAdd = userCardConfig.personalSymbols;
        } else {
          // Merge: personal symbols first, then defaults
          const defaultSymbols = extractSymbolsFromCard(cardName);
          symbolsToAdd = [...userCardConfig.personalSymbols, ...defaultSymbols];
        }
      } else {
        // No personal symbols, use defaults
        symbolsToAdd = extractSymbolsFromCard(cardName);
      }

      for (const symbolName of symbolsToAdd) {
        if (!symbolMap.has(symbolName)) {
          symbolMap.set(symbolName, {
            name: symbolName,
            category: getSymbolCategory(symbolName),
            autoExtracted: true
          });
        }
      }
    }

    return Array.from(symbolMap.values());
  }

  private dedupeSymbols(symbols: symbol_tag[]): symbol_tag[] {
    const seen = new Map<string, symbol_tag>();
    for (const symbol of symbols) {
      const key = symbol.name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, symbol);
      } else {
        // Keep manual over auto-extracted
        const existing = seen.get(key)!;
        if (existing.autoExtracted && !symbol.autoExtracted) {
          seen.set(key, symbol);
        }
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Update user's symbol occurrence tracking
   *
   * This method syncs symbols to both:
   * 1. USER_SYMBOL_MEANING (legacy system for basic tracking)
   * 2. PERSONAL_SYMBOL (Mediumship Symbol Dictionary with richer features)
   */
  private async updateUserSymbolOccurrences(
    userId: string,
    symbols: symbol_tag[],
    entryType: 'reading' | 'dream' | 'synchronicity',
    authenticatedUserId: string
  ): Promise<void> {
    const now = DateTime.now().toISO()!;
    const today = now.split('T')[0];

    for (const symbol of symbols) {
      const normalizedName = symbol.name.toLowerCase();

      // ========================================
      // Update PERSONAL_SYMBOL (Mediumship Symbol Dictionary)
      // This is the primary tracking system going forward
      // ========================================
      const existingPersonalSymbol = await this.mediumship.getPersonalSymbolByName(userId, symbol.name);

      if (existingPersonalSymbol) {
        // Update existing personal symbol
        const updates: Record<string, unknown> = {
          lastEncountered: today,
          totalOccurrences: existingPersonalSymbol.totalOccurrences + 1,
          updatedAt: now
        };

        if (entryType === 'reading') {
          updates.readingOccurrences = existingPersonalSymbol.readingOccurrences + 1;
        } else if (entryType === 'dream') {
          updates.dreamOccurrences = existingPersonalSymbol.dreamOccurrences + 1;
        } else if (entryType === 'synchronicity') {
          updates.synchronicityOccurrences = existingPersonalSymbol.synchronicityOccurrences + 1;
        }

        await this.cosmos.update_record(
          this.containerName,
          existingPersonalSymbol.id,
          userId,
          updates,
          authenticatedUserId
        );
      } else {
        // Create new personal symbol (auto-discovered from entry)
        const newPersonalSymbol = {
          id: uuid(),
          docType: 'PERSONAL_SYMBOL',
          userId,
          symbolName: symbol.name,
          normalizedName,
          category: symbol.category,
          personalMeaning: '', // User can add later
          firstEncountered: today,
          lastEncountered: today,
          totalOccurrences: 1,
          dreamOccurrences: entryType === 'dream' ? 1 : 0,
          readingOccurrences: entryType === 'reading' ? 1 : 0,
          synchronicityOccurrences: entryType === 'synchronicity' ? 1 : 0,
          createdAt: now,
          updatedAt: now
        };

        await this.cosmos.add_record(
          this.containerName,
          newPersonalSymbol,
          userId,
          authenticatedUserId
        );
      }

      // ========================================
      // Update USER_SYMBOL_MEANING (legacy system - for backwards compatibility)
      // ========================================
      const existing = await this.getUserSymbolMeaning(userId, normalizedName);

      if (existing) {
        // Update existing
        const updates: Partial<user_symbol_meaning_type> = {
          totalOccurrences: existing.totalOccurrences + 1,
          lastSeen: now,
          updatedAt: now
        };

        if (entryType === 'reading') {
          updates.readingOccurrences = existing.readingOccurrences + 1;
        } else {
          updates.dreamOccurrences = existing.dreamOccurrences + 1;
        }

        await this.cosmos.update_record(
          this.containerName,
          existing.id,
          userId,
          updates,
          authenticatedUserId
        );
      } else {
        // Create new
        const userSymbol: Omit<user_symbol_meaning_type, '_id'> = {
          id: uuid(),
          docType: 'USER_SYMBOL_MEANING',
          userId,
          symbolId: symbol.symbolId || '',
          symbolName: symbol.name,
          personalMeaning: '',
          totalOccurrences: 1,
          dreamOccurrences: entryType === 'dream' ? 1 : 0,
          readingOccurrences: entryType === 'reading' ? 1 : 0,
          firstSeen: now,
          lastSeen: now,
          commonContexts: symbol.context ? [symbol.context] : [],
          createdAt: now,
          updatedAt: now
        };

        await this.cosmos.add_record(
          this.containerName,
          userSymbol,
          userId,
          authenticatedUserId
        );
      }
    }
  }

  /**
   * Public method to update user symbols from a SpiriReading.
   * Called when a user receives a fulfilled reading to track their symbol encounters.
   */
  async updateSymbolsFromSpiriReading(
    userId: string,
    cardNames: string[],
    authenticatedUserId: string
  ): Promise<void> {
    // Extract symbols from each card
    const symbols: symbol_tag[] = [];

    for (const cardName of cardNames) {
      const extractedSymbols = extractSymbolsFromCard(cardName);
      for (const symbolName of extractedSymbols) {
        symbols.push({
          name: symbolName,
          category: getSymbolCategory(symbolName),
          autoExtracted: true
        });
      }
    }

    // Dedupe symbols
    const uniqueSymbols = this.dedupeSymbols(symbols);

    // Update user's symbol dictionary with 'reading' type
    await this.updateUserSymbolOccurrences(userId, uniqueSymbols, 'reading', authenticatedUserId);
  }

  // ============================================
  // User Symbol Queries
  // ============================================

  async getUserSymbols(userId: string, limit: number = 50): Promise<user_symbol_meaning_type[]> {
    const querySpec = {
      query: `SELECT TOP ${limit} * FROM c WHERE c.userId = @userId AND c.docType = @docType ORDER BY c.totalOccurrences DESC`,
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "USER_SYMBOL_MEANING" }
      ]
    };

    return await this.cosmos.run_query<user_symbol_meaning_type>(this.containerName, querySpec);
  }

  async getUserSymbolMeaning(userId: string, symbolName: string): Promise<user_symbol_meaning_type | null> {
    const normalizedName = symbolName.toLowerCase();
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType AND LOWER(c.symbolName) = @symbolName",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "USER_SYMBOL_MEANING" },
        { name: "@symbolName", value: normalizedName }
      ]
    };

    const results = await this.cosmos.run_query<user_symbol_meaning_type>(this.containerName, querySpec);
    return results.length > 0 ? results[0] : null;
  }

  async updateUserSymbolMeaning(
    userId: string,
    symbolName: string,
    personalMeaning: string,
    authenticatedUserId: string
  ): Promise<{ success: boolean; message?: string; userSymbolMeaning?: user_symbol_meaning_type }> {
    if (userId !== authenticatedUserId) {
      return {
        success: false,
        message: "You can only update your own symbol meanings"
      };
    }

    const existing = await this.getUserSymbolMeaning(userId, symbolName);

    if (existing) {
      await this.cosmos.update_record(
        this.containerName,
        existing.id,
        userId,
        {
          personalMeaning,
          updatedAt: DateTime.now().toISO()!
        },
        authenticatedUserId
      );

      const updated = await this.getUserSymbolMeaning(userId, symbolName);
      return {
        success: true,
        message: "Symbol meaning updated",
        userSymbolMeaning: updated!
      };
    } else {
      // Create new symbol meaning
      const now = DateTime.now().toISO()!;
      const newMeaning: Omit<user_symbol_meaning_type, '_id'> = {
        id: uuid(),
        docType: 'USER_SYMBOL_MEANING',
        userId,
        symbolId: '',
        symbolName,
        personalMeaning,
        totalOccurrences: 0,
        dreamOccurrences: 0,
        readingOccurrences: 0,
        firstSeen: now,
        lastSeen: now,
        commonContexts: [],
        createdAt: now,
        updatedAt: now
      };

      const created = await this.cosmos.add_record<user_symbol_meaning_type>(
        this.containerName,
        newMeaning,
        userId,
        authenticatedUserId
      );

      return {
        success: true,
        message: "Symbol meaning created",
        userSymbolMeaning: created
      };
    }
  }

  // ============================================
  // Card Pattern Statistics
  // ============================================

  /**
   * Get date range for a given period
   */
  private getPeriodDateRange(period: PatternPeriod): { start: DateTime; end: DateTime; prevStart: DateTime; prevEnd: DateTime } {
    const now = DateTime.now();
    const end = now;
    let start: DateTime;
    let prevStart: DateTime;
    let prevEnd: DateTime;

    switch (period) {
      case 'WEEK':
        start = now.minus({ weeks: 1 });
        prevEnd = start;
        prevStart = start.minus({ weeks: 1 });
        break;
      case 'MONTH':
        start = now.minus({ months: 1 });
        prevEnd = start;
        prevStart = start.minus({ months: 1 });
        break;
      case 'THREE_MONTHS':
        start = now.minus({ months: 3 });
        prevEnd = start;
        prevStart = start.minus({ months: 3 });
        break;
      case 'SIX_MONTHS':
        start = now.minus({ months: 6 });
        prevEnd = start;
        prevStart = start.minus({ months: 6 });
        break;
      case 'YEAR':
        start = now.minus({ years: 1 });
        prevEnd = start;
        prevStart = start.minus({ years: 1 });
        break;
      case 'ALL_TIME':
      default:
        // For ALL_TIME, we use a very old date and don't compare
        start = DateTime.fromISO('1900-01-01');
        prevStart = DateTime.fromISO('1900-01-01');
        prevEnd = DateTime.fromISO('1900-01-01');
        break;
    }

    return { start, end, prevStart, prevEnd };
  }

  /**
   * Process a set of readings to get card counts
   */
  private processReadingsForCardCounts(readings: reading_entry_type[]): Map<string, { count: number; reversedCount: number; lastPulled: string }> {
    const cardCounts = new Map<string, { count: number; reversedCount: number; lastPulled: string }>();

    for (const reading of readings) {
      for (const card of reading.cards) {
        const normalizedName = normalizeCardName(card.name);
        const existing = cardCounts.get(normalizedName) || { count: 0, reversedCount: 0, lastPulled: reading.date };
        existing.count++;
        if (card.reversed) {
          existing.reversedCount++;
        }
        if (reading.date > existing.lastPulled) {
          existing.lastPulled = reading.date;
        }
        cardCounts.set(normalizedName, existing);
      }
    }

    return cardCounts;
  }

  async getCardPatternStats(userId: string, period?: string): Promise<card_pattern_stats> {
    // Get all reading entries for the user
    const allReadings = await this.getReadingEntries(userId);

    // Determine period (default to MONTH for "what's showing up right now")
    const selectedPeriod: PatternPeriod = (period as PatternPeriod) || 'MONTH';
    const { start, end, prevStart, prevEnd } = this.getPeriodDateRange(selectedPeriod);

    // Filter readings by current period
    const readings = selectedPeriod === 'ALL_TIME'
      ? allReadings
      : allReadings.filter(r => {
          const readingDate = DateTime.fromISO(r.date);
          return readingDate >= start && readingDate <= end;
        });

    // Filter readings for previous period (for comparison)
    const previousPeriodReadings = selectedPeriod === 'ALL_TIME'
      ? []
      : allReadings.filter(r => {
          const readingDate = DateTime.fromISO(r.date);
          return readingDate >= prevStart && readingDate < prevEnd;
        });

    // Initialize tracking structures
    const cardCounts = new Map<string, { count: number; reversedCount: number; lastPulled: string }>();
    const suitCounts: Record<string, number> = { Cups: 0, Swords: 0, Wands: 0, Pentacles: 0 };
    let majorArcanaCount = 0;
    let minorArcanaCount = 0;
    let totalReversed = 0;
    let totalCards = 0;

    // Source breakdown
    let selfReadings = 0;
    let externalReadings = 0;
    let spiriverseReadings = 0;

    // Time tracking (always relative to now, regardless of period filter)
    const now = DateTime.now();
    const weekAgo = now.minus({ weeks: 1 });
    const monthAgo = now.minus({ months: 1 });
    let readingsThisWeek = 0;
    let readingsThisMonth = 0;

    // Process filtered readings
    for (const reading of readings) {
      // Time-based counts (from all-time data for context)
      const readingDate = DateTime.fromISO(reading.date);
      if (readingDate >= weekAgo) readingsThisWeek++;
      if (readingDate >= monthAgo) readingsThisMonth++;

      // Source breakdown
      switch (reading.sourceType) {
        case 'SELF': selfReadings++; break;
        case 'EXTERNAL': externalReadings++; break;
        case 'SPIRIVERSE': spiriverseReadings++; break;
      }

      // Process cards in this reading
      for (const card of reading.cards) {
        totalCards++;
        const normalizedName = normalizeCardName(card.name);

        // Track card frequency
        const existing = cardCounts.get(normalizedName) || { count: 0, reversedCount: 0, lastPulled: reading.date };
        existing.count++;
        if (card.reversed) {
          existing.reversedCount++;
          totalReversed++;
        }
        // Update lastPulled if this reading is more recent
        if (reading.date > existing.lastPulled) {
          existing.lastPulled = reading.date;
        }
        cardCounts.set(normalizedName, existing);

        // Track Major vs Minor Arcana
        if (isMajorArcana(card.name)) {
          majorArcanaCount++;
        } else {
          minorArcanaCount++;
          // Track suit distribution
          const suit = getCardSuit(card.name);
          if (suit && suitCounts[suit] !== undefined) {
            suitCounts[suit]++;
          }
        }
      }
    }

    // Calculate top cards (by frequency)
    const sortedCards = Array.from(cardCounts.entries())
      .sort((a, b) => b[1].count - a[1].count);

    const topCards: card_frequency[] = sortedCards.slice(0, 10).map(([name, data]) => ({
      name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), // Capitalize
      count: data.count,
      reversedCount: data.reversedCount,
      lastPulled: data.lastPulled
    }));

    // Calculate recent cards (by last pulled date)
    const recentCards: card_frequency[] = Array.from(cardCounts.entries())
      .sort((a, b) => b[1].lastPulled.localeCompare(a[1].lastPulled))
      .slice(0, 10)
      .map(([name, data]) => ({
        name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        count: data.count,
        reversedCount: data.reversedCount,
        lastPulled: data.lastPulled
      }));

    // Calculate suit distribution
    const totalMinorArcana = minorArcanaCount || 1; // Prevent division by zero
    const suitDistribution: suit_distribution[] = Object.entries(suitCounts).map(([suit, count]) => ({
      suit,
      count,
      percentage: Math.round((count / totalMinorArcana) * 100 * 10) / 10
    }));

    // Calculate percentages
    const totalCardsForPercent = totalCards || 1;
    const majorArcanaPercentage = Math.round((majorArcanaCount / totalCardsForPercent) * 100 * 10) / 10;
    const reversedPercentage = Math.round((totalReversed / totalCardsForPercent) * 100 * 10) / 10;

    // Calculate comparison stats
    const prevReadingsCount = previousPeriodReadings.length;
    const readingsChange = readings.length - prevReadingsCount;
    const readingsChangePercent = prevReadingsCount > 0
      ? Math.round(((readings.length - prevReadingsCount) / prevReadingsCount) * 100 * 10) / 10
      : readings.length > 0 ? 100 : 0;

    // Calculate emerging cards (cards that appear more in current period vs previous)
    // Only show emerging/fading when we have meaningful data to compare:
    // - Must have readings in the previous period to compare against
    // - Must have at least 3 readings total for patterns to be meaningful
    const prevCardCounts = this.processReadingsForCardCounts(previousPeriodReadings);
    const emergingCards: card_frequency[] = [];
    const fadingCards: card_frequency[] = [];

    const hasMeaningfulComparison = prevReadingsCount > 0 && readings.length >= 3;

    if (hasMeaningfulComparison) {
      // Find emerging cards (cards significantly more frequent than previous period)
      // Only include if: existed in previous period AND now 1.5x more frequent
      for (const [name, data] of cardCounts.entries()) {
        const prevData = prevCardCounts.get(name);
        // Only show as emerging if it existed before and is now more frequent
        if (prevData && data.count > prevData.count * 1.5) {
          emergingCards.push({
            name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            count: data.count,
            reversedCount: data.reversedCount,
            lastPulled: data.lastPulled
          });
        }
      }

      // Find fading cards (were in previous period but not in current OR significantly less frequent)
      for (const [name, prevData] of prevCardCounts.entries()) {
        const currentData = cardCounts.get(name);
        if (!currentData || currentData.count < prevData.count * 0.5) {
          fadingCards.push({
            name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            count: prevData.count,
            reversedCount: prevData.reversedCount,
            lastPulled: prevData.lastPulled
          });
        }
      }
    }

    // Sort emerging/fading by count
    emergingCards.sort((a, b) => b.count - a.count);
    fadingCards.sort((a, b) => b.count - a.count);

    return {
      totalReadings: readings.length,
      totalCards,
      uniqueCards: cardCounts.size,
      readingsThisWeek,
      readingsThisMonth,
      topCards,
      recentCards,
      suitDistribution,
      majorArcanaCount,
      minorArcanaCount,
      majorArcanaPercentage,
      totalReversed,
      reversedPercentage,
      selfReadings,
      externalReadings,
      spiriverseReadings,
      // Period info
      periodStart: selectedPeriod !== 'ALL_TIME' ? start.toISODate() ?? undefined : undefined,
      periodEnd: selectedPeriod !== 'ALL_TIME' ? end.toISODate() ?? undefined : undefined,
      // Comparison stats
      previousPeriodReadings: selectedPeriod !== 'ALL_TIME' ? prevReadingsCount : undefined,
      readingsChange: selectedPeriod !== 'ALL_TIME' ? readingsChange : undefined,
      readingsChangePercent: selectedPeriod !== 'ALL_TIME' ? readingsChangePercent : undefined,
      // Emerging/fading patterns
      emergingCards: emergingCards.slice(0, 5),
      fadingCards: fadingCards.slice(0, 5)
    };
  }

  // ============================================
  // Symbol Pattern Statistics
  // ============================================

  async getSymbolPatternStats(userId: string): Promise<symbol_pattern_stats> {
    // Get user's symbol meanings which track occurrences
    const userSymbols = await this.getUserSymbols(userId, 100);

    if (userSymbols.length === 0) {
      return {
        totalSymbols: 0,
        totalOccurrences: 0,
        topSymbols: [],
        crossEntrySymbols: [],
        categoryBreakdown: [],
        recentSymbols: []
      };
    }

    // Calculate totals
    let totalOccurrences = 0;
    const categoryCounts: Record<string, number> = {};

    // Transform to symbol occurrences
    const symbolOccurrences: symbol_occurrence[] = userSymbols.map(sym => {
      totalOccurrences += sym.totalOccurrences;

      // Track category counts
      const category = getSymbolCategory(sym.symbolName) || 'OTHER';
      categoryCounts[category] = (categoryCounts[category] || 0) + sym.totalOccurrences;

      return {
        symbolName: sym.symbolName,
        category: getSymbolCategory(sym.symbolName),
        totalCount: sym.totalOccurrences,
        dreamCount: sym.dreamOccurrences,
        readingCount: sym.readingOccurrences,
        lastSeen: sym.lastSeen,
        personalMeaning: sym.personalMeaning || undefined
      };
    });

    // Sort by total count for top symbols
    const topSymbols = [...symbolOccurrences]
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 10);

    // Get cross-entry symbols (appear in both dreams AND readings)
    const crossEntrySymbols = symbolOccurrences
      .filter(s => s.dreamCount > 0 && s.readingCount > 0)
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 10);

    // Sort by last seen for recent symbols
    const recentSymbols = [...symbolOccurrences]
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
      .slice(0, 10);

    // Calculate category breakdown
    const totalForPercent = totalOccurrences || 1;
    const categoryBreakdown = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalForPercent) * 100 * 10) / 10
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalSymbols: userSymbols.length,
      totalOccurrences,
      topSymbols,
      crossEntrySymbols,
      categoryBreakdown,
      recentSymbols
    };
  }

  // ============================================
  // Legacy Card Pull Methods (Backwards Compatibility)
  // ============================================

  async getCardPulls(userId: string, filters?: card_pull_filters): Promise<daily_card_pull_type[]> {
    return this.getReadingEntries(userId, filters);
  }

  async getCardPull(id: string, userId: string): Promise<daily_card_pull_type | null> {
    return this.getReadingEntry(id, userId);
  }

  async getCardPullByDate(userId: string, date: string): Promise<daily_card_pull_type | null> {
    return this.getReadingEntryByDate(userId, date);
  }

  async getRecentCardPulls(userId: string, limit: number = 5): Promise<daily_card_pull_type[]> {
    return this.getRecentReadingEntries(userId, limit);
  }

  async createCardPull(input: create_card_pull_input, authenticatedUserId: string): Promise<card_pull_response> {
    // Convert legacy input to new format
    const newInput: create_reading_entry_input = {
      userId: input.userId,
      date: input.date,
      sourceType: 'SELF',
      sourceDetails: {
        deck: input.deck
      },
      cards: input.cards,
      question: input.question,
      firstImpression: input.firstImpression,
      reflection: input.reflection,
      photoUrl: input.photoUrl
    };

    const result = await this.createReadingEntry(newInput, authenticatedUserId);

    // Map response to legacy format
    return {
      success: result.success,
      message: result.message,
      cardPull: result.readingEntry
    };
  }

  async updateCardPull(input: update_card_pull_input, authenticatedUserId: string): Promise<card_pull_response> {
    // Convert legacy input to new format
    const newInput: update_reading_entry_input = {
      id: input.id,
      userId: input.userId,
      sourceDetails: input.deck ? { deck: input.deck } : undefined,
      cards: input.cards,
      question: input.question,
      firstImpression: input.firstImpression,
      reflection: input.reflection,
      photoUrl: input.photoUrl
    };

    const result = await this.updateReadingEntry(newInput, authenticatedUserId);

    return {
      success: result.success,
      message: result.message,
      cardPull: result.readingEntry
    };
  }

  async deleteCardPull(id: string, userId: string, authenticatedUserId: string): Promise<delete_card_pull_response> {
    return this.deleteReadingEntry(id, userId, authenticatedUserId);
  }

  // ============================================
  // Dream Journal Queries
  // ============================================

  async getDreams(userId: string, filters?: dream_filters): Promise<dream_journal_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "DREAM_JOURNAL" }
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      parameters.push({ name: "@startDate", value: filters.startDate });
    }

    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      parameters.push({ name: "@endDate", value: filters.endDate });
    }

    if (filters?.dreamType) {
      query += " AND c.dreamType = @dreamType";
      parameters.push({ name: "@dreamType", value: filters.dreamType });
    }

    if (filters?.mood) {
      query += " AND c.mood = @mood";
      parameters.push({ name: "@mood", value: filters.mood });
    }

    if (filters?.isLucid !== undefined) {
      query += " AND c.isLucid = @isLucid";
      parameters.push({ name: "@isLucid", value: filters.isLucid });
    }

    if (filters?.theme) {
      query += " AND ARRAY_CONTAINS(c.themes, @theme)";
      parameters.push({ name: "@theme", value: filters.theme });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    return await this.cosmos.run_query<dream_journal_type>(this.containerName, querySpec);
  }

  async getDream(id: string, userId: string): Promise<dream_journal_type | null> {
    return await this.cosmos.get_record_by_doctype<dream_journal_type>(
      this.containerName,
      id,
      userId,
      "DREAM_JOURNAL"
    );
  }

  async getDreamByDate(userId: string, date: string): Promise<dream_journal_type | null> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType AND c.date = @date",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "DREAM_JOURNAL" },
        { name: "@date", value: date }
      ]
    };

    const results = await this.cosmos.run_query<dream_journal_type>(this.containerName, querySpec);
    return results.length > 0 ? results[0] : null;
  }

  async getRecentDreams(userId: string, limit: number = 5): Promise<dream_journal_type[]> {
    const querySpec = {
      query: `SELECT TOP ${limit} * FROM c WHERE c.userId = @userId AND c.docType = @docType ORDER BY c.date DESC`,
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "DREAM_JOURNAL" }
      ]
    };

    return await this.cosmos.run_query<dream_journal_type>(this.containerName, querySpec);
  }

  async searchDreams(userId: string, searchQuery: string, limit: number = 20): Promise<dream_journal_type[]> {
    // Search in title, content, themes, and symbols
    const querySpec = {
      query: `SELECT TOP ${limit} * FROM c WHERE c.userId = @userId AND c.docType = @docType AND (CONTAINS(LOWER(c.title), LOWER(@query)) OR CONTAINS(LOWER(c.content), LOWER(@query)) OR ARRAY_CONTAINS(c.themes, @query) OR ARRAY_CONTAINS(c.symbols, @query)) ORDER BY c.date DESC`,
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "DREAM_JOURNAL" },
        { name: "@query", value: searchQuery }
      ]
    };

    return await this.cosmos.run_query<dream_journal_type>(this.containerName, querySpec);
  }

  // ============================================
  // Dream Journal Mutations
  // ============================================

  async createDream(input: create_dream_input, authenticatedUserId: string): Promise<dream_response> {
    // Verify the user is creating for themselves
    if (input.userId !== authenticatedUserId) {
      return {
        success: false,
        message: "You can only create dream entries for yourself"
      };
    }

    const id = uuid();
    const now = DateTime.now().toISO();
    const date = input.date || DateTime.now().toISODate();

    // Process symbols - mark all as manually entered (not auto-extracted)
    const symbols: symbol_tag[] = (input.symbols || []).map(s => ({
      ...s,
      autoExtracted: s.autoExtracted ?? false
    }));

    const dream: Omit<dream_journal_type, '_id'> = {
      id,
      userId: input.userId,
      docType: 'DREAM_JOURNAL',
      date: date!,
      title: input.title,
      content: input.content,
      dreamType: input.dreamType,
      mood: input.mood,
      clarity: input.clarity,
      isLucid: input.isLucid,
      themes: input.themes,
      symbols,
      interpretation: input.interpretation,
      emotions: input.emotions,
      sleepQuality: input.sleepQuality,
      wakeTime: input.wakeTime,
      photoUrl: input.photoUrl,
      createdAt: now!,
      updatedAt: now!
    };

    const created = await this.cosmos.add_record<dream_journal_type>(
      this.containerName,
      dream,
      input.userId,
      authenticatedUserId
    );

    // Update user symbol occurrences (shared tracking with readings)
    if (symbols.length > 0) {
      await this.updateUserSymbolOccurrences(input.userId, symbols, 'dream', authenticatedUserId);
    }

    return {
      success: true,
      message: "Dream entry created successfully",
      dream: created
    };
  }

  async updateDream(input: update_dream_input, authenticatedUserId: string): Promise<dream_response> {
    // Verify the user is updating their own dream entry
    const existingDream = await this.getDream(input.id, input.userId);
    if (!existingDream) {
      return {
        success: false,
        message: "Dream entry not found"
      };
    }

    if (existingDream.userId !== authenticatedUserId) {
      return {
        success: false,
        message: "You can only update your own dream entries"
      };
    }

    const updates: Partial<dream_journal_type> = {
      updatedAt: DateTime.now().toISO()!
    };

    if (input.title !== undefined) updates.title = input.title;
    if (input.content !== undefined) updates.content = input.content;
    if (input.dreamType !== undefined) updates.dreamType = input.dreamType;
    if (input.mood !== undefined) updates.mood = input.mood;
    if (input.clarity !== undefined) updates.clarity = input.clarity;
    if (input.isLucid !== undefined) updates.isLucid = input.isLucid;
    if (input.themes !== undefined) updates.themes = input.themes;
    if (input.symbols !== undefined) {
      // Process enhanced symbols
      updates.symbols = input.symbols.map(s => ({
        ...s,
        autoExtracted: s.autoExtracted ?? false
      }));
    }
    if (input.interpretation !== undefined) updates.interpretation = input.interpretation;
    if (input.emotions !== undefined) updates.emotions = input.emotions;
    if (input.sleepQuality !== undefined) updates.sleepQuality = input.sleepQuality;
    if (input.wakeTime !== undefined) updates.wakeTime = input.wakeTime;
    if (input.photoUrl !== undefined) updates.photoUrl = input.photoUrl;

    await this.cosmos.update_record(
      this.containerName,
      input.id,
      input.userId,
      updates,
      authenticatedUserId
    );

    const updatedDream = await this.getDream(input.id, input.userId);

    return {
      success: true,
      message: "Dream entry updated successfully",
      dream: updatedDream!
    };
  }

  async deleteDream(id: string, userId: string, authenticatedUserId: string): Promise<delete_dream_response> {
    // Verify the user is deleting their own dream entry
    const existingDream = await this.getDream(id, userId);
    if (!existingDream) {
      return {
        success: false,
        message: "Dream entry not found"
      };
    }

    if (existingDream.userId !== authenticatedUserId) {
      return {
        success: false,
        message: "You can only delete your own dream entries"
      };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);

    return {
      success: true,
      message: "Dream entry deleted successfully"
    };
  }

  // ============================================
  // Meditation Journal Queries
  // ============================================

  async getMeditations(userId: string, filters?: meditation_filters): Promise<meditation_journal_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "MEDITATION_JOURNAL" }
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      parameters.push({ name: "@startDate", value: filters.startDate });
    }

    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      parameters.push({ name: "@endDate", value: filters.endDate });
    }

    if (filters?.technique) {
      query += " AND c.technique = @technique";
      parameters.push({ name: "@technique", value: filters.technique });
    }

    if (filters?.minDuration !== undefined) {
      query += " AND c.duration >= @minDuration";
      parameters.push({ name: "@minDuration", value: filters.minDuration });
    }

    if (filters?.maxDuration !== undefined) {
      query += " AND c.duration <= @maxDuration";
      parameters.push({ name: "@maxDuration", value: filters.maxDuration });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    return await this.cosmos.run_query<meditation_journal_type>(this.containerName, querySpec);
  }

  async getMeditation(id: string, userId: string): Promise<meditation_journal_type | null> {
    return await this.cosmos.get_record_by_doctype<meditation_journal_type>(
      this.containerName,
      id,
      userId,
      "MEDITATION_JOURNAL"
    );
  }

  async getRecentMeditations(userId: string, limit: number = 5): Promise<meditation_journal_type[]> {
    const querySpec = {
      query: `SELECT TOP ${limit} * FROM c WHERE c.userId = @userId AND c.docType = @docType ORDER BY c.date DESC`,
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "MEDITATION_JOURNAL" }
      ]
    };

    return await this.cosmos.run_query<meditation_journal_type>(this.containerName, querySpec);
  }

  async getMeditationStats(userId: string): Promise<{
    totalSessions: number;
    totalMinutes: number;
    averageDuration: number;
    currentStreak: number;
    longestStreak: number;
    favoriteTime: string | null;
    favoriteTechnique: string | null;
  }> {
    // Get all meditations for stats calculation
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType ORDER BY c.date DESC",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "MEDITATION_JOURNAL" }
      ]
    };

    const meditations = await this.cosmos.run_query<meditation_journal_type>(this.containerName, querySpec);

    if (meditations.length === 0) {
      return {
        totalSessions: 0,
        totalMinutes: 0,
        averageDuration: 0,
        currentStreak: 0,
        longestStreak: 0,
        favoriteTime: null,
        favoriteTechnique: null
      };
    }

    // Calculate basic stats
    const totalSessions = meditations.length;
    const totalMinutes = meditations.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = Math.round(totalMinutes / totalSessions);

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    const today = DateTime.now().toISODate();

    // Sort by date descending for streak calculation
    const sortedDates = [...new Set(meditations.map(m => m.date))].sort().reverse();

    // Check if user meditated today or yesterday for current streak
    if (sortedDates.length > 0) {
      const lastDate = DateTime.fromISO(sortedDates[0]);
      const daysSinceLastMeditation = Math.floor(DateTime.now().diff(lastDate, 'days').days);

      if (daysSinceLastMeditation <= 1) {
        currentStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const curr = DateTime.fromISO(sortedDates[i]);
          const prev = DateTime.fromISO(sortedDates[i - 1]);
          const dayDiff = Math.floor(prev.diff(curr, 'days').days);

          if (dayDiff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Calculate longest streak
    for (let i = 1; i < sortedDates.length; i++) {
      const curr = DateTime.fromISO(sortedDates[i]);
      const prev = DateTime.fromISO(sortedDates[i - 1]);
      const dayDiff = Math.floor(prev.diff(curr, 'days').days);

      if (dayDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    // Calculate favorite technique
    const techniqueCounts: Record<string, number> = {};
    meditations.forEach(m => {
      if (m.technique) {
        techniqueCounts[m.technique] = (techniqueCounts[m.technique] || 0) + 1;
      }
    });
    const favoriteTechnique = Object.entries(techniqueCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    return {
      totalSessions,
      totalMinutes,
      averageDuration,
      currentStreak,
      longestStreak,
      favoriteTime: null, // Could be calculated if we stored time of day
      favoriteTechnique
    };
  }

  // ============================================
  // Meditation Journal Mutations
  // ============================================

  async createMeditation(input: create_meditation_input, authenticatedUserId: string): Promise<meditation_response> {
    // Verify the user is creating for themselves
    if (input.userId !== authenticatedUserId) {
      return {
        success: false,
        message: "You can only create meditation entries for yourself"
      };
    }

    const id = uuid();
    const now = DateTime.now().toISO();
    const date = input.date || DateTime.now().toISODate();

    const meditation: Omit<meditation_journal_type, '_id'> = {
      id,
      userId: input.userId,
      docType: 'MEDITATION_JOURNAL',
      date: date!,
      duration: input.duration,
      technique: input.technique,
      guidedBy: input.guidedBy,
      focus: input.focus,
      preSessionMood: input.preSessionMood,
      postSessionMood: input.postSessionMood,
      depth: input.depth,
      distractionLevel: input.distractionLevel,
      insights: input.insights,
      experiences: input.experiences,
      intentions: input.intentions,
      gratitude: input.gratitude,
      location: input.location,
      posture: input.posture,
      photoUrl: input.photoUrl,
      createdAt: now!,
      updatedAt: now!
    };

    const created = await this.cosmos.add_record<meditation_journal_type>(
      this.containerName,
      meditation,
      input.userId,
      authenticatedUserId
    );

    return {
      success: true,
      message: "Meditation entry created successfully",
      meditation: created
    };
  }

  async updateMeditation(input: update_meditation_input, authenticatedUserId: string): Promise<meditation_response> {
    // Verify the user is updating their own meditation entry
    const existingMeditation = await this.getMeditation(input.id, input.userId);
    if (!existingMeditation) {
      return {
        success: false,
        message: "Meditation entry not found"
      };
    }

    if (existingMeditation.userId !== authenticatedUserId) {
      return {
        success: false,
        message: "You can only update your own meditation entries"
      };
    }

    const updates: Partial<meditation_journal_type> = {
      updatedAt: DateTime.now().toISO()!
    };

    if (input.duration !== undefined) updates.duration = input.duration;
    if (input.technique !== undefined) updates.technique = input.technique;
    if (input.guidedBy !== undefined) updates.guidedBy = input.guidedBy;
    if (input.focus !== undefined) updates.focus = input.focus;
    if (input.preSessionMood !== undefined) updates.preSessionMood = input.preSessionMood;
    if (input.postSessionMood !== undefined) updates.postSessionMood = input.postSessionMood;
    if (input.depth !== undefined) updates.depth = input.depth;
    if (input.distractionLevel !== undefined) updates.distractionLevel = input.distractionLevel;
    if (input.insights !== undefined) updates.insights = input.insights;
    if (input.experiences !== undefined) updates.experiences = input.experiences;
    if (input.intentions !== undefined) updates.intentions = input.intentions;
    if (input.gratitude !== undefined) updates.gratitude = input.gratitude;
    if (input.location !== undefined) updates.location = input.location;
    if (input.posture !== undefined) updates.posture = input.posture;
    if (input.photoUrl !== undefined) updates.photoUrl = input.photoUrl;

    await this.cosmos.update_record(
      this.containerName,
      input.id,
      input.userId,
      updates,
      authenticatedUserId
    );

    const updatedMeditation = await this.getMeditation(input.id, input.userId);

    return {
      success: true,
      message: "Meditation entry updated successfully",
      meditation: updatedMeditation!
    };
  }

  async deleteMeditation(id: string, userId: string, authenticatedUserId: string): Promise<delete_meditation_response> {
    // Verify the user is deleting their own meditation entry
    const existingMeditation = await this.getMeditation(id, userId);
    if (!existingMeditation) {
      return {
        success: false,
        message: "Meditation entry not found"
      };
    }

    if (existingMeditation.userId !== authenticatedUserId) {
      return {
        success: false,
        message: "You can only delete your own meditation entries"
      };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);

    return {
      success: true,
      message: "Meditation entry deleted successfully"
    };
  }

  // ============================================
  // Crystal Collection Queries
  // ============================================

  async getCrystalCollection(userId: string, filters?: crystal_collection_filters): Promise<crystal_collection_item_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "CRYSTAL_COLLECTION" }
    ];

    if (filters?.color) {
      query += " AND c.color = @color";
      parameters.push({ name: "@color", value: filters.color });
    }

    if (filters?.form) {
      query += " AND c.form = @form";
      parameters.push({ name: "@form", value: filters.form });
    }

    if (filters?.chakra) {
      query += " AND ARRAY_CONTAINS(c.chakras, @chakra)";
      parameters.push({ name: "@chakra", value: filters.chakra });
    }

    if (filters?.isActive !== undefined) {
      query += " AND c.isActive = @isActive";
      parameters.push({ name: "@isActive", value: filters.isActive });
    }

    if (filters?.specialBond !== undefined) {
      query += " AND c.specialBond = @specialBond";
      parameters.push({ name: "@specialBond", value: filters.specialBond });
    }

    if (filters?.search) {
      query += " AND (CONTAINS(LOWER(c.name), LOWER(@search)) OR CONTAINS(LOWER(c.nickname), LOWER(@search)))";
      parameters.push({ name: "@search", value: filters.search });
    }

    query += " ORDER BY c.addedDate DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    return await this.cosmos.run_query<crystal_collection_item_type>(this.containerName, querySpec);
  }

  async getCrystal(id: string, userId: string): Promise<crystal_collection_item_type | null> {
    return await this.cosmos.get_record_by_doctype<crystal_collection_item_type>(
      this.containerName,
      id,
      userId,
      "CRYSTAL_COLLECTION"
    );
  }

  // ============================================
  // Crystal Collection Mutations
  // ============================================

  async createCrystal(input: create_crystal_collection_input, authenticatedUserId: string): Promise<crystal_collection_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "You can only add crystals to your own collection" };
    }

    const id = uuid();
    const now = DateTime.now().toISO()!;
    const addedDate = input.addedDate || DateTime.now().toISODate()!;

    const crystal: Omit<crystal_collection_item_type, '_id'> = {
      id,
      userId: input.userId,
      docType: 'CRYSTAL_COLLECTION',
      name: input.name,
      addedDate,
      color: input.color,
      form: input.form,
      size: input.size,
      weight: input.weight,
      origin: input.origin,
      primaryPurpose: input.primaryPurpose,
      chakras: input.chakras,
      elements: input.elements,
      zodiacSigns: input.zodiacSigns,
      nickname: input.nickname,
      personalMeaning: input.personalMeaning,
      specialBond: input.specialBond || false,
      energyNotes: input.energyNotes,
      acquisitionSource: input.acquisitionSource,
      acquiredFrom: input.acquiredFrom,
      acquiredDate: input.acquiredDate,
      purchasePrice: input.purchasePrice,
      currency: input.currency,
      isActive: true,
      location: input.location,
      photoUrl: input.photoUrl,
      createdAt: now,
      updatedAt: now
    };

    const created = await this.cosmos.add_record<crystal_collection_item_type>(
      this.containerName,
      crystal,
      input.userId,
      authenticatedUserId
    );

    return { success: true, message: "Crystal added to collection", crystal: created };
  }

  async updateCrystal(input: update_crystal_collection_input, authenticatedUserId: string): Promise<crystal_collection_response> {
    const existing = await this.getCrystal(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Crystal not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own crystals" };
    }

    const updates: Partial<crystal_collection_item_type> = {
      updatedAt: DateTime.now().toISO()!
    };

    // Apply all optional updates
    if (input.name !== undefined) updates.name = input.name;
    if (input.color !== undefined) updates.color = input.color;
    if (input.form !== undefined) updates.form = input.form;
    if (input.size !== undefined) updates.size = input.size;
    if (input.weight !== undefined) updates.weight = input.weight;
    if (input.origin !== undefined) updates.origin = input.origin;
    if (input.primaryPurpose !== undefined) updates.primaryPurpose = input.primaryPurpose;
    if (input.chakras !== undefined) updates.chakras = input.chakras;
    if (input.elements !== undefined) updates.elements = input.elements;
    if (input.zodiacSigns !== undefined) updates.zodiacSigns = input.zodiacSigns;
    if (input.nickname !== undefined) updates.nickname = input.nickname;
    if (input.personalMeaning !== undefined) updates.personalMeaning = input.personalMeaning;
    if (input.specialBond !== undefined) updates.specialBond = input.specialBond;
    if (input.energyNotes !== undefined) updates.energyNotes = input.energyNotes;
    if (input.acquisitionSource !== undefined) updates.acquisitionSource = input.acquisitionSource;
    if (input.acquiredFrom !== undefined) updates.acquiredFrom = input.acquiredFrom;
    if (input.acquiredDate !== undefined) updates.acquiredDate = input.acquiredDate;
    if (input.purchasePrice !== undefined) updates.purchasePrice = input.purchasePrice;
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.isActive !== undefined) updates.isActive = input.isActive;
    if (input.location !== undefined) updates.location = input.location;
    if (input.photoUrl !== undefined) updates.photoUrl = input.photoUrl;

    await this.cosmos.update_record(this.containerName, input.id, input.userId, updates, authenticatedUserId);

    const updated = await this.getCrystal(input.id, input.userId);
    return { success: true, message: "Crystal updated", crystal: updated! };
  }

  async deleteCrystal(id: string, userId: string, authenticatedUserId: string): Promise<delete_crystal_response> {
    const existing = await this.getCrystal(id, userId);
    if (!existing) {
      return { success: false, message: "Crystal not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only delete your own crystals" };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);
    return { success: true, message: "Crystal removed from collection" };
  }

  // ============================================
  // Crystal Wishlist Queries & Mutations
  // ============================================

  async getCrystalWishlist(userId: string, filters?: crystal_wishlist_filters): Promise<crystal_wishlist_item_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "CRYSTAL_WISHLIST" }
    ];

    if (filters?.priority !== undefined) {
      query += " AND c.priority = @priority";
      parameters.push({ name: "@priority", value: filters.priority });
    }

    if (filters?.isAcquired !== undefined) {
      query += " AND c.isAcquired = @isAcquired";
      parameters.push({ name: "@isAcquired", value: filters.isAcquired });
    }

    if (filters?.alertEnabled !== undefined) {
      query += " AND c.alertEnabled = @alertEnabled";
      parameters.push({ name: "@alertEnabled", value: filters.alertEnabled });
    }

    query += " ORDER BY c.addedDate DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    return await this.cosmos.run_query<crystal_wishlist_item_type>(this.containerName, querySpec);
  }

  async getWishlistItem(id: string, userId: string): Promise<crystal_wishlist_item_type | null> {
    return await this.cosmos.get_record_by_doctype<crystal_wishlist_item_type>(
      this.containerName,
      id,
      userId,
      "CRYSTAL_WISHLIST"
    );
  }

  async createWishlistItem(input: create_crystal_wishlist_input, authenticatedUserId: string): Promise<crystal_wishlist_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "You can only add to your own wishlist" };
    }

    const id = uuid();
    const now = DateTime.now().toISO()!;

    const wishlistItem: Omit<crystal_wishlist_item_type, '_id'> = {
      id,
      userId: input.userId,
      docType: 'CRYSTAL_WISHLIST',
      name: input.name,
      crystalRefId: input.crystalRefId,
      addedDate: DateTime.now().toISODate()!,
      preferredForm: input.preferredForm,
      preferredSize: input.preferredSize,
      preferredOrigin: input.preferredOrigin,
      maxBudget: input.maxBudget,
      currency: input.currency,
      purpose: input.purpose,
      reason: input.reason,
      alertEnabled: input.alertEnabled ?? true,
      priority: input.priority ?? 3,
      isAcquired: false,
      createdAt: now,
      updatedAt: now
    };

    const created = await this.cosmos.add_record<crystal_wishlist_item_type>(
      this.containerName,
      wishlistItem,
      input.userId,
      authenticatedUserId
    );

    return { success: true, message: "Added to wishlist", wishlistItem: created };
  }

  async updateWishlistItem(input: update_crystal_wishlist_input, authenticatedUserId: string): Promise<crystal_wishlist_response> {
    const existing = await this.getWishlistItem(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Wishlist item not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own wishlist" };
    }

    const updates: Partial<crystal_wishlist_item_type> = {
      updatedAt: DateTime.now().toISO()!
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.crystalRefId !== undefined) updates.crystalRefId = input.crystalRefId;
    if (input.preferredForm !== undefined) updates.preferredForm = input.preferredForm;
    if (input.preferredSize !== undefined) updates.preferredSize = input.preferredSize;
    if (input.preferredOrigin !== undefined) updates.preferredOrigin = input.preferredOrigin;
    if (input.maxBudget !== undefined) updates.maxBudget = input.maxBudget;
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.purpose !== undefined) updates.purpose = input.purpose;
    if (input.reason !== undefined) updates.reason = input.reason;
    if (input.alertEnabled !== undefined) updates.alertEnabled = input.alertEnabled;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.isAcquired !== undefined) {
      updates.isAcquired = input.isAcquired;
      if (input.isAcquired) {
        updates.acquiredDate = input.acquiredDate || DateTime.now().toISODate()!;
        updates.collectionItemId = input.collectionItemId;
      }
    }

    await this.cosmos.update_record(this.containerName, input.id, input.userId, updates, authenticatedUserId);

    const updated = await this.getWishlistItem(input.id, input.userId);
    return { success: true, message: "Wishlist updated", wishlistItem: updated! };
  }

  async deleteWishlistItem(id: string, userId: string, authenticatedUserId: string): Promise<delete_crystal_response> {
    const existing = await this.getWishlistItem(id, userId);
    if (!existing) {
      return { success: false, message: "Wishlist item not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only delete from your own wishlist" };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);
    return { success: true, message: "Removed from wishlist" };
  }

  /**
   * Check if a crystal is on the user's wishlist by crystalRefId
   * Returns the wishlist item if found, null otherwise
   */
  async getWishlistItemByCrystalRef(userId: string, crystalRefId: string): Promise<crystal_wishlist_item_type | null> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType AND c.crystalRefId = @crystalRefId AND c.isAcquired = false",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "CRYSTAL_WISHLIST" },
        { name: "@crystalRefId", value: crystalRefId }
      ]
    };

    const results = await this.cosmos.run_query<crystal_wishlist_item_type>(this.containerName, querySpec);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Mark a wishlist item as acquired and optionally add to collection
   * This creates the collection item and updates the wishlist in one operation
   */
  async acquireFromWishlist(
    wishlistItemId: string,
    userId: string,
    authenticatedUserId: string,
    purchaseDetails?: {
      vendorName?: string;
      purchasePrice?: number;
      currency?: string;
      form?: string;
      origin?: string;
      photoUrl?: string;
    }
  ): Promise<{
    success: boolean;
    message?: string;
    collectionItem?: crystal_collection_item_type;
    wishlistItem?: crystal_wishlist_item_type;
  }> {
    if (userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own items" };
    }

    // Get the wishlist item
    const wishlistItem = await this.getWishlistItem(wishlistItemId, userId);
    if (!wishlistItem) {
      return { success: false, message: "Wishlist item not found" };
    }

    if (wishlistItem.isAcquired) {
      return { success: false, message: "This item has already been acquired" };
    }

    // Create the collection item
    const collectionInput: create_crystal_collection_input = {
      userId,
      name: wishlistItem.name,
      crystalRefId: wishlistItem.crystalRefId,
      form: (purchaseDetails?.form as any) || wishlistItem.preferredForm,
      origin: purchaseDetails?.origin || wishlistItem.preferredOrigin,
      size: wishlistItem.preferredSize,
      acquisitionSource: 'SPIRIVERSE',
      acquiredFrom: purchaseDetails?.vendorName,
      acquiredDate: DateTime.now().toISODate()!,
      purchasePrice: purchaseDetails?.purchasePrice || wishlistItem.maxBudget,
      currency: purchaseDetails?.currency || wishlistItem.currency,
      primaryPurpose: wishlistItem.purpose,
      photoUrl: purchaseDetails?.photoUrl
    };

    const collectionResult = await this.createCrystal(collectionInput, authenticatedUserId);
    if (!collectionResult.success || !collectionResult.crystal) {
      return { success: false, message: "Failed to add to collection: " + collectionResult.message };
    }

    // Update the wishlist item as acquired
    const wishlistResult = await this.updateWishlistItem({
      id: wishlistItemId,
      userId,
      isAcquired: true,
      acquiredDate: DateTime.now().toISODate()!,
      collectionItemId: collectionResult.crystal.id
    }, authenticatedUserId);

    if (!wishlistResult.success) {
      return { success: false, message: "Added to collection but failed to update wishlist" };
    }

    return {
      success: true,
      message: "Crystal acquired and added to collection!",
      collectionItem: collectionResult.crystal,
      wishlistItem: wishlistResult.wishlistItem
    };
  }

  // ============================================
  // Crystal Companion Log Queries & Mutations
  // ============================================

  async getCrystalCompanionLogs(userId: string, filters?: crystal_companion_filters): Promise<crystal_companion_log_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "CRYSTAL_COMPANION" }
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      parameters.push({ name: "@startDate", value: filters.startDate });
    }

    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      parameters.push({ name: "@endDate", value: filters.endDate });
    }

    if (filters?.crystalId) {
      query += " AND c.crystalId = @crystalId";
      parameters.push({ name: "@crystalId", value: filters.crystalId });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    return await this.cosmos.run_query<crystal_companion_log_type>(this.containerName, querySpec);
  }

  async getTodaysCompanion(userId: string): Promise<crystal_companion_log_type | null> {
    const today = DateTime.now().toISODate()!;
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType AND c.date = @date ORDER BY c.createdAt DESC",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "CRYSTAL_COMPANION" },
        { name: "@date", value: today }
      ]
    };

    const results = await this.cosmos.run_query<crystal_companion_log_type>(this.containerName, querySpec);
    return results.length > 0 ? results[0] : null;
  }

  async createCompanionLog(input: create_crystal_companion_input, authenticatedUserId: string): Promise<crystal_companion_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "You can only log companions for yourself" };
    }

    const id = uuid();
    const now = DateTime.now().toISO()!;
    const date = input.date || DateTime.now().toISODate()!;

    const log: Omit<crystal_companion_log_type, '_id'> = {
      id,
      userId: input.userId,
      docType: 'CRYSTAL_COMPANION',
      date,
      crystalId: input.crystalId,
      crystalName: input.crystalName,
      reason: input.reason,
      intention: input.intention,
      location: input.location,
      createdAt: now,
      updatedAt: now
    };

    const created = await this.cosmos.add_record<crystal_companion_log_type>(
      this.containerName,
      log,
      input.userId,
      authenticatedUserId
    );

    return { success: true, message: "Companion logged", companionLog: created };
  }

  async updateCompanionLog(input: update_crystal_companion_input, authenticatedUserId: string): Promise<crystal_companion_response> {
    const existing = await this.cosmos.get_record_by_doctype<crystal_companion_log_type>(
      this.containerName, input.id, input.userId, "CRYSTAL_COMPANION"
    );

    if (!existing) {
      return { success: false, message: "Companion log not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own logs" };
    }

    const updates: Partial<crystal_companion_log_type> = {
      updatedAt: DateTime.now().toISO()!
    };

    if (input.crystalId !== undefined) updates.crystalId = input.crystalId;
    if (input.crystalName !== undefined) updates.crystalName = input.crystalName;
    if (input.reason !== undefined) updates.reason = input.reason;
    if (input.intention !== undefined) updates.intention = input.intention;
    if (input.location !== undefined) updates.location = input.location;
    if (input.howItFelt !== undefined) updates.howItFelt = input.howItFelt;
    if (input.effectivenessScore !== undefined) updates.effectivenessScore = input.effectivenessScore;
    if (input.willContinue !== undefined) updates.willContinue = input.willContinue;

    await this.cosmos.update_record(this.containerName, input.id, input.userId, updates, authenticatedUserId);

    const updated = await this.cosmos.get_record_by_doctype<crystal_companion_log_type>(
      this.containerName, input.id, input.userId, "CRYSTAL_COMPANION"
    );
    return { success: true, message: "Companion log updated", companionLog: updated! };
  }

  // ============================================
  // Crystal Cleansing Log Queries & Mutations
  // ============================================

  async getCrystalCleansingLogs(userId: string, filters?: crystal_cleansing_filters): Promise<crystal_cleansing_log_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "CRYSTAL_CLEANSING" }
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      parameters.push({ name: "@startDate", value: filters.startDate });
    }

    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      parameters.push({ name: "@endDate", value: filters.endDate });
    }

    if (filters?.method) {
      query += " AND c.method = @method";
      parameters.push({ name: "@method", value: filters.method });
    }

    if (filters?.crystalId) {
      query += " AND ARRAY_CONTAINS(c.crystalIds, @crystalId)";
      parameters.push({ name: "@crystalId", value: filters.crystalId });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    return await this.cosmos.run_query<crystal_cleansing_log_type>(this.containerName, querySpec);
  }

  async createCleansingLog(input: create_crystal_cleansing_input, authenticatedUserId: string): Promise<crystal_cleansing_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "You can only log cleansings for yourself" };
    }

    const id = uuid();
    const now = DateTime.now().toISO()!;
    const date = input.date || DateTime.now().toISODate()!;

    const log: Omit<crystal_cleansing_log_type, '_id'> = {
      id,
      userId: input.userId,
      docType: 'CRYSTAL_CLEANSING',
      date,
      crystalIds: input.crystalIds,
      crystalNames: input.crystalNames,
      method: input.method,
      methodDetails: input.methodDetails,
      duration: input.duration,
      moonPhase: input.moonPhase,
      didCharge: input.didCharge,
      chargingMethod: input.chargingMethod,
      chargingDetails: input.chargingDetails,
      intention: input.intention,
      notes: input.notes,
      photoUrl: input.photoUrl,
      createdAt: now,
      updatedAt: now
    };

    const created = await this.cosmos.add_record<crystal_cleansing_log_type>(
      this.containerName,
      log,
      input.userId,
      authenticatedUserId
    );

    return { success: true, message: "Cleansing session logged", cleansingLog: created };
  }

  async updateCleansingLog(input: update_crystal_cleansing_input, authenticatedUserId: string): Promise<crystal_cleansing_response> {
    const existing = await this.cosmos.get_record_by_doctype<crystal_cleansing_log_type>(
      this.containerName, input.id, input.userId, "CRYSTAL_CLEANSING"
    );

    if (!existing) {
      return { success: false, message: "Cleansing log not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own logs" };
    }

    const updates: Partial<crystal_cleansing_log_type> = {
      updatedAt: DateTime.now().toISO()!
    };

    if (input.crystalIds !== undefined) updates.crystalIds = input.crystalIds;
    if (input.crystalNames !== undefined) updates.crystalNames = input.crystalNames;
    if (input.method !== undefined) updates.method = input.method;
    if (input.methodDetails !== undefined) updates.methodDetails = input.methodDetails;
    if (input.duration !== undefined) updates.duration = input.duration;
    if (input.moonPhase !== undefined) updates.moonPhase = input.moonPhase;
    if (input.didCharge !== undefined) updates.didCharge = input.didCharge;
    if (input.chargingMethod !== undefined) updates.chargingMethod = input.chargingMethod;
    if (input.chargingDetails !== undefined) updates.chargingDetails = input.chargingDetails;
    if (input.intention !== undefined) updates.intention = input.intention;
    if (input.notes !== undefined) updates.notes = input.notes;
    if (input.photoUrl !== undefined) updates.photoUrl = input.photoUrl;

    await this.cosmos.update_record(this.containerName, input.id, input.userId, updates, authenticatedUserId);

    const updated = await this.cosmos.get_record_by_doctype<crystal_cleansing_log_type>(
      this.containerName, input.id, input.userId, "CRYSTAL_CLEANSING"
    );
    return { success: true, message: "Cleansing log updated", cleansingLog: updated! };
  }

  async deleteCleansingLog(id: string, userId: string, authenticatedUserId: string): Promise<delete_crystal_response> {
    const existing = await this.cosmos.get_record_by_doctype<crystal_cleansing_log_type>(
      this.containerName, id, userId, "CRYSTAL_CLEANSING"
    );

    if (!existing) {
      return { success: false, message: "Cleansing log not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only delete your own logs" };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);
    return { success: true, message: "Cleansing log deleted" };
  }

  // ============================================
  // Crystal Grid Queries & Mutations
  // ============================================

  async getCrystalGrids(userId: string, filters?: crystal_grid_filters): Promise<crystal_grid_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "CRYSTAL_GRID" }
    ];

    if (filters?.isActive !== undefined) {
      query += " AND c.isActive = @isActive";
      parameters.push({ name: "@isActive", value: filters.isActive });
    }

    query += " ORDER BY c.createdDate DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    return await this.cosmos.run_query<crystal_grid_type>(this.containerName, querySpec);
  }

  async getCrystalGrid(id: string, userId: string): Promise<crystal_grid_type | null> {
    return await this.cosmos.get_record_by_doctype<crystal_grid_type>(
      this.containerName, id, userId, "CRYSTAL_GRID"
    );
  }

  async createCrystalGrid(input: create_crystal_grid_input, authenticatedUserId: string): Promise<crystal_grid_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "You can only create grids for yourself" };
    }

    const id = uuid();
    const now = DateTime.now().toISO()!;
    const createdDate = input.createdDate || DateTime.now().toISODate()!;

    const grid: Omit<crystal_grid_type, '_id'> = {
      id,
      userId: input.userId,
      docType: 'CRYSTAL_GRID',
      name: input.name,
      createdDate,
      purpose: input.purpose,
      gridShape: input.gridShape,
      crystals: input.crystals,
      isActive: true,
      notes: input.notes,
      photoUrl: input.photoUrl,
      createdAt: now,
      updatedAt: now
    };

    const created = await this.cosmos.add_record<crystal_grid_type>(
      this.containerName,
      grid,
      input.userId,
      authenticatedUserId
    );

    return { success: true, message: "Crystal grid created", grid: created };
  }

  async updateCrystalGrid(input: update_crystal_grid_input, authenticatedUserId: string): Promise<crystal_grid_response> {
    const existing = await this.getCrystalGrid(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Grid not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own grids" };
    }

    const updates: Partial<crystal_grid_type> = {
      updatedAt: DateTime.now().toISO()!
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.purpose !== undefined) updates.purpose = input.purpose;
    if (input.gridShape !== undefined) updates.gridShape = input.gridShape;
    if (input.crystals !== undefined) updates.crystals = input.crystals;
    if (input.activatedDate !== undefined) updates.activatedDate = input.activatedDate;
    if (input.deactivatedDate !== undefined) {
      updates.deactivatedDate = input.deactivatedDate;
      updates.isActive = false;
    }
    if (input.isActive !== undefined) updates.isActive = input.isActive;
    if (input.duration !== undefined) updates.duration = input.duration;
    if (input.outcome !== undefined) updates.outcome = input.outcome;
    if (input.effectivenessScore !== undefined) updates.effectivenessScore = input.effectivenessScore;
    if (input.notes !== undefined) updates.notes = input.notes;
    if (input.photoUrl !== undefined) updates.photoUrl = input.photoUrl;

    await this.cosmos.update_record(this.containerName, input.id, input.userId, updates, authenticatedUserId);

    const updated = await this.getCrystalGrid(input.id, input.userId);
    return { success: true, message: "Grid updated", grid: updated! };
  }

  async deleteCrystalGrid(id: string, userId: string, authenticatedUserId: string): Promise<delete_crystal_response> {
    const existing = await this.getCrystalGrid(id, userId);
    if (!existing) {
      return { success: false, message: "Grid not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only delete your own grids" };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);
    return { success: true, message: "Grid deleted" };
  }

  // ============================================
  // Crystal Statistics
  // ============================================

  async getCrystalStats(userId: string): Promise<crystal_stats> {
    // Get all crystals
    const crystals = await this.getCrystalCollection(userId);
    const wishlist = await this.getCrystalWishlist(userId);
    const companions = await this.getCrystalCompanionLogs(userId, { limit: 100 });
    const cleansings = await this.getCrystalCleansingLogs(userId, { limit: 100 });
    const grids = await this.getCrystalGrids(userId);

    // Calculate collection stats
    const activeCrystals = crystals.filter(c => c.isActive).length;
    const inactiveCrystals = crystals.filter(c => !c.isActive).length;
    const specialBondCount = crystals.filter(c => c.specialBond).length;

    // Color distribution
    const colorCounts: Record<string, number> = {};
    crystals.forEach(c => {
      if (c.color) {
        colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
      }
    });
    const totalForColor = crystals.length || 1;
    const colorDistribution = Object.entries(colorCounts)
      .map(([color, count]) => ({
        color,
        count,
        percentage: Math.round((count / totalForColor) * 100 * 10) / 10
      }))
      .sort((a, b) => b.count - a.count);

    // Form distribution
    const formCounts: Record<string, number> = {};
    crystals.forEach(c => {
      if (c.form) {
        formCounts[c.form] = (formCounts[c.form] || 0) + 1;
      }
    });
    const formDistribution = Object.entries(formCounts)
      .map(([form, count]) => ({
        form,
        count,
        percentage: Math.round((count / totalForColor) * 100 * 10) / 10
      }))
      .sort((a, b) => b.count - a.count);

    // Chakra distribution
    const chakraCounts: Record<string, number> = {};
    crystals.forEach(c => {
      (c.chakras || []).forEach(chakra => {
        chakraCounts[chakra] = (chakraCounts[chakra] || 0) + 1;
      });
    });
    const chakraDistribution = Object.entries(chakraCounts)
      .map(([chakra, count]) => ({ chakra, count }))
      .sort((a, b) => b.count - a.count);

    // Recently added
    const recentlyAdded = crystals
      .sort((a, b) => b.addedDate.localeCompare(a.addedDate))
      .slice(0, 5);

    // Companion streak calculation
    let companionStreak = 0;
    if (companions.length > 0) {
      const sortedDates = [...new Set(companions.map(c => c.date))].sort().reverse();
      const today = DateTime.now().toISODate()!;
      const yesterday = DateTime.now().minus({ days: 1 }).toISODate()!;

      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        companionStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const curr = DateTime.fromISO(sortedDates[i]);
          const prev = DateTime.fromISO(sortedDates[i - 1]);
          if (Math.floor(prev.diff(curr, 'days').days) === 1) {
            companionStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Wishlist stats
    const acquiredFromWishlist = wishlist.filter(w => w.isAcquired).length;

    return {
      totalCrystals: crystals.length,
      activeCrystals,
      inactiveCrystals,
      colorDistribution,
      formDistribution,
      chakraDistribution,
      specialBondCount,
      recentlyAdded,
      companionStreak,
      totalCleansingsSessions: cleansings.length,
      activeGrids: grids.filter(g => g.isActive).length,
      wishlistCount: wishlist.filter(w => !w.isAcquired).length,
      acquiredFromWishlist
    };
  }

  // ============================================
  // Energy Healing - Delegated to EnergyHealingManager
  // ============================================
  // All energy healing methods delegate to this.energy manager.
  // Access directly via manager.energy.methodName() or use these
  // convenience methods for backwards compatibility.

  async getEnergyJournalEntries(userId: string, filters?: energy_journal_filters): Promise<energy_journal_type[]> {
    return this.energy.getEnergyJournalEntries(userId, filters);
  }

  async getEnergyJournalEntry(id: string, userId: string): Promise<energy_journal_type | null> {
    return this.energy.getEnergyJournalEntry(id, userId);
  }

  async createEnergyJournalEntry(input: create_energy_journal_input, authenticatedUserId: string): Promise<energy_journal_response> {
    return this.energy.createEnergyJournalEntry(input, authenticatedUserId);
  }

  async updateEnergyJournalEntry(input: update_energy_journal_input, authenticatedUserId: string): Promise<energy_journal_response> {
    return this.energy.updateEnergyJournalEntry(input, authenticatedUserId);
  }

  async deleteEnergyJournalEntry(id: string, userId: string, authenticatedUserId: string): Promise<delete_energy_response> {
    return this.energy.deleteEnergyJournalEntry(id, userId, authenticatedUserId);
  }

  async getChakraCheckins(userId: string, filters?: chakra_checkin_filters): Promise<chakra_checkin_type[]> {
    return this.energy.getChakraCheckins(userId, filters);
  }

  async getChakraCheckin(id: string, userId: string): Promise<chakra_checkin_type | null> {
    return this.energy.getChakraCheckin(id, userId);
  }

  async getTodaysChakraCheckin(userId: string): Promise<chakra_checkin_type | null> {
    return this.energy.getTodaysChakraCheckin(userId);
  }

  async createChakraCheckin(input: create_chakra_checkin_input, authenticatedUserId: string): Promise<chakra_checkin_response> {
    return this.energy.createChakraCheckin(input, authenticatedUserId);
  }

  async updateChakraCheckin(input: update_chakra_checkin_input, authenticatedUserId: string): Promise<chakra_checkin_response> {
    return this.energy.updateChakraCheckin(input, authenticatedUserId);
  }

  async deleteChakraCheckin(id: string, userId: string, authenticatedUserId: string): Promise<delete_energy_response> {
    return this.energy.deleteChakraCheckin(id, userId, authenticatedUserId);
  }

  async getSessionReflections(userId: string, filters?: session_reflection_filters): Promise<session_reflection_type[]> {
    return this.energy.getSessionReflections(userId, filters);
  }

  async getSessionReflection(id: string, userId: string): Promise<session_reflection_type | null> {
    return this.energy.getSessionReflection(id, userId);
  }

  async createSessionReflection(input: create_session_reflection_input, authenticatedUserId: string): Promise<session_reflection_response> {
    return this.energy.createSessionReflection(input, authenticatedUserId);
  }

  async updateSessionReflection(input: update_session_reflection_input, authenticatedUserId: string): Promise<session_reflection_response> {
    return this.energy.updateSessionReflection(input, authenticatedUserId);
  }

  async deleteSessionReflection(id: string, userId: string, authenticatedUserId: string): Promise<delete_energy_response> {
    return this.energy.deleteSessionReflection(id, userId, authenticatedUserId);
  }

  async getEnergyStats(userId: string): Promise<energy_stats> {
    return this.energy.getEnergyStats(userId);
  }
}
