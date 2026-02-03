import { CosmosDataSource } from "../../../utils/database";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import {
  // Synchronicity types
  synchronicity_type,
  synchronicity_response,
  create_synchronicity_input,
  update_synchronicity_input,
  synchronicity_filters,
  // Spirit Message types
  spirit_message_type,
  spirit_message_response,
  create_spirit_message_input,
  update_spirit_message_input,
  spirit_message_filters,
  // Personal Symbol types
  personal_symbol_type,
  personal_symbol_response,
  create_personal_symbol_input,
  update_personal_symbol_input,
  personal_symbol_filters,
  // User Card Symbols types
  user_card_symbols_type,
  user_card_symbols_response,
  create_user_card_symbols_input,
  update_user_card_symbols_input,
  // Loved One types
  loved_one_in_spirit_type,
  loved_one_response,
  create_loved_one_input,
  update_loved_one_input,
  loved_one_filters,
  // Development Exercise types
  development_exercise_type,
  development_exercise_response,
  create_development_exercise_input,
  update_development_exercise_input,
  development_exercise_filters,
  // Reading Reflection types
  reading_reflection_type,
  reading_reflection_response,
  create_reading_reflection_input,
  update_reading_reflection_input,
  reading_reflection_filters,
  // Stats and shared types
  delete_mediumship_response,
  mediumship_stats,
} from "../types/mediumship-types";

/**
 * Mediumship Manager
 *
 * Handles all mediumship-related features:
 * - Synchronicity Log (meaningful coincidences)
 * - Spirit Messages (messages from spirit guides, loved ones, etc.)
 * - Personal Symbol Dictionary (user-defined symbol meanings)
 * - Loved Ones in Spirit (profiles of passed loved ones)
 * - Development Exercises (practice sessions for psychic/mediumship development)
 * - Reading Reflections (reflections on readings received from mediums)
 */
export class MediumshipManager {
  private cosmos: CosmosDataSource;
  private readonly containerName = "Main-PersonalSpace";

  constructor(cosmos: CosmosDataSource) {
    this.cosmos = cosmos;
  }

  // ============================================
  // SYNCHRONICITY LOG
  // ============================================

  async getSynchronicities(
    userId: string,
    filters?: synchronicity_filters
  ): Promise<synchronicity_type[]> {
    let query = `SELECT * FROM c WHERE c.userId = @userId AND c.docType = 'SYNCHRONICITY'`;
    const params: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      params.push({ name: "@startDate", value: filters.startDate });
    }
    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      params.push({ name: "@endDate", value: filters.endDate });
    }
    if (filters?.recurringTheme !== undefined) {
      query += " AND c.recurringTheme = @recurringTheme";
      params.push({ name: "@recurringTheme", value: filters.recurringTheme });
    }
    if (filters?.hasSymbol) {
      query += " AND ARRAY_CONTAINS(c.symbols, {name: @symbolName}, true)";
      params.push({ name: "@symbolName", value: filters.hasSymbol });
    }
    if (filters?.minSignificance) {
      query += " AND c.significanceScore >= @minSignificance";
      params.push({ name: "@minSignificance", value: filters.minSignificance });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const results = await this.cosmos.run_query<synchronicity_type>(
      this.containerName,
      { query, parameters: params }
    );

    return results.map((s) => ({
      ...s,
      ref: { id: s.id, partition: [userId], container: this.containerName },
    }));
  }

  async getSynchronicity(
    id: string,
    userId: string
  ): Promise<synchronicity_type | null> {
    const query = {
      query:
        "SELECT * FROM c WHERE c.id = @id AND c.userId = @userId AND c.docType = 'SYNCHRONICITY'",
      parameters: [
        { name: "@id", value: id },
        { name: "@userId", value: userId },
      ],
    };

    const results = await this.cosmos.run_query<synchronicity_type>(
      this.containerName,
      query
    );

    if (results.length === 0) return null;

    return {
      ...results[0],
      ref: { id: results[0].id, partition: [userId], container: this.containerName },
    };
  }

  async createSynchronicity(
    input: create_synchronicity_input,
    authenticatedUserId: string
  ): Promise<synchronicity_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const now = DateTime.now().toISO()!;
    const today = now.split("T")[0];
    const synchronicity: synchronicity_type = {
      id: uuid(),
      userId: input.userId,
      docType: "SYNCHRONICITY",
      date: input.date || today,
      title: input.title,
      description: input.description,
      time: input.time,
      location: input.location,
      witnesses: input.witnesses,
      possibleMeaning: input.possibleMeaning,
      relatedTo: input.relatedTo,
      recurringTheme: input.recurringTheme,
      relatedSynchronicities: input.relatedSynchronicities,
      symbols: input.symbols?.map((s) => ({
        name: s.name,
        category: s.category,
        context: s.context,
        autoExtracted: s.autoExtracted ?? false,
      })),
      significanceScore: input.significanceScore,
      photoUrl: input.photoUrl,
      createdAt: now,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, synchronicity.id, synchronicity, [input.userId]);

    // Update Personal Symbol Dictionary with synchronicity symbols
    if (input.symbols && input.symbols.length > 0) {
      await this.updateSymbolOccurrences(input.userId, input.symbols, 'synchronicity', authenticatedUserId);
    }

    return {
      success: true,
      synchronicity: {
        ...synchronicity,
        ref: { id: synchronicity.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async updateSynchronicity(
    input: update_synchronicity_input,
    authenticatedUserId: string
  ): Promise<synchronicity_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const existing = await this.getSynchronicity(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Synchronicity not found" };
    }

    const now = DateTime.now().toISO()!;
    const updated: synchronicity_type = {
      ...existing,
      title: input.title ?? existing.title,
      description: input.description ?? existing.description,
      time: input.time ?? existing.time,
      location: input.location ?? existing.location,
      witnesses: input.witnesses ?? existing.witnesses,
      possibleMeaning: input.possibleMeaning ?? existing.possibleMeaning,
      relatedTo: input.relatedTo ?? existing.relatedTo,
      confirmedMeaning: input.confirmedMeaning ?? existing.confirmedMeaning,
      recurringTheme: input.recurringTheme ?? existing.recurringTheme,
      relatedSynchronicities: input.relatedSynchronicities ?? existing.relatedSynchronicities,
      symbols: input.symbols
        ? input.symbols.map((s) => ({
            name: s.name,
            category: s.category,
            context: s.context,
            autoExtracted: s.autoExtracted ?? false,
          }))
        : existing.symbols,
      significanceScore: input.significanceScore ?? existing.significanceScore,
      photoUrl: input.photoUrl ?? existing.photoUrl,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, updated.id, updated, [input.userId]);

    return {
      success: true,
      synchronicity: {
        ...updated,
        ref: { id: updated.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async deleteSynchronicity(
    id: string,
    userId: string,
    authenticatedUserId: string
  ): Promise<delete_mediumship_response> {
    if (userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    await this.cosmos.delete_record(this.containerName, id, [userId], authenticatedUserId);
    return { success: true };
  }

  // ============================================
  // SPIRIT MESSAGES
  // ============================================

  async getSpiritMessages(
    userId: string,
    filters?: spirit_message_filters
  ): Promise<spirit_message_type[]> {
    let query = `SELECT * FROM c WHERE c.userId = @userId AND c.docType = 'SPIRIT_MESSAGE'`;
    const params: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      params.push({ name: "@startDate", value: filters.startDate });
    }
    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      params.push({ name: "@endDate", value: filters.endDate });
    }
    if (filters?.source) {
      query += " AND c.source = @source";
      params.push({ name: "@source", value: filters.source });
    }
    if (filters?.receptionMethod) {
      query += " AND c.receptionMethod = @receptionMethod";
      params.push({ name: "@receptionMethod", value: filters.receptionMethod });
    }
    if (filters?.validated !== undefined) {
      query += " AND c.validated = @validated";
      params.push({ name: "@validated", value: filters.validated });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const results = await this.cosmos.run_query<spirit_message_type>(
      this.containerName,
      { query, parameters: params }
    );

    return results.map((m) => ({
      ...m,
      ref: { id: m.id, partition: [userId], container: this.containerName },
    }));
  }

  async getSpiritMessage(
    id: string,
    userId: string
  ): Promise<spirit_message_type | null> {
    const query = {
      query:
        "SELECT * FROM c WHERE c.id = @id AND c.userId = @userId AND c.docType = 'SPIRIT_MESSAGE'",
      parameters: [
        { name: "@id", value: id },
        { name: "@userId", value: userId },
      ],
    };

    const results = await this.cosmos.run_query<spirit_message_type>(
      this.containerName,
      query
    );

    if (results.length === 0) return null;

    return {
      ...results[0],
      ref: { id: results[0].id, partition: [userId], container: this.containerName },
    };
  }

  async createSpiritMessage(
    input: create_spirit_message_input,
    authenticatedUserId: string
  ): Promise<spirit_message_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const now = DateTime.now().toISO()!;
    const message: spirit_message_type = {
      id: uuid(),
      userId: input.userId,
      docType: "SPIRIT_MESSAGE",
      date: input.date || now.split("T")[0],
      messageContent: input.messageContent,
      source: input.source,
      sourceName: input.sourceName,
      sourceDescription: input.sourceDescription,
      receptionMethod: input.receptionMethod,
      receptionContext: input.receptionContext,
      clarity: input.clarity,
      evidentialDetails: input.evidentialDetails,
      interpretation: input.interpretation,
      emotionsDuring: input.emotionsDuring,
      emotionsAfter: input.emotionsAfter,
      photoUrl: input.photoUrl,
      createdAt: now,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, message.id, message, [input.userId]);

    return {
      success: true,
      spiritMessage: {
        ...message,
        ref: { id: message.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async updateSpiritMessage(
    input: update_spirit_message_input,
    authenticatedUserId: string
  ): Promise<spirit_message_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const existing = await this.getSpiritMessage(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Spirit message not found" };
    }

    const now = DateTime.now().toISO()!;
    const updated: spirit_message_type = {
      ...existing,
      messageContent: input.messageContent ?? existing.messageContent,
      source: input.source ?? existing.source,
      sourceName: input.sourceName ?? existing.sourceName,
      sourceDescription: input.sourceDescription ?? existing.sourceDescription,
      receptionMethod: input.receptionMethod ?? existing.receptionMethod,
      receptionContext: input.receptionContext ?? existing.receptionContext,
      clarity: input.clarity ?? existing.clarity,
      evidentialDetails: input.evidentialDetails ?? existing.evidentialDetails,
      validated: input.validated ?? existing.validated,
      validationNotes: input.validationNotes ?? existing.validationNotes,
      interpretation: input.interpretation ?? existing.interpretation,
      actionTaken: input.actionTaken ?? existing.actionTaken,
      outcome: input.outcome ?? existing.outcome,
      emotionsDuring: input.emotionsDuring ?? existing.emotionsDuring,
      emotionsAfter: input.emotionsAfter ?? existing.emotionsAfter,
      photoUrl: input.photoUrl ?? existing.photoUrl,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, updated.id, updated, [input.userId]);

    return {
      success: true,
      spiritMessage: {
        ...updated,
        ref: { id: updated.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async deleteSpiritMessage(
    id: string,
    userId: string,
    authenticatedUserId: string
  ): Promise<delete_mediumship_response> {
    if (userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    await this.cosmos.delete_record(this.containerName, id, [userId], authenticatedUserId);
    return { success: true };
  }

  // ============================================
  // PERSONAL SYMBOL DICTIONARY
  // ============================================

  async getPersonalSymbols(
    userId: string,
    filters?: personal_symbol_filters
  ): Promise<personal_symbol_type[]> {
    let query = `SELECT * FROM c WHERE c.userId = @userId AND c.docType = 'PERSONAL_SYMBOL'`;
    const params: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
    ];

    if (filters?.category) {
      query += " AND c.category = @category";
      params.push({ name: "@category", value: filters.category });
    }
    if (filters?.minOccurrences) {
      query += " AND c.totalOccurrences >= @minOccurrences";
      params.push({ name: "@minOccurrences", value: filters.minOccurrences });
    }

    query += " ORDER BY c.totalOccurrences DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const results = await this.cosmos.run_query<personal_symbol_type>(
      this.containerName,
      { query, parameters: params }
    );

    return results.map((s) => ({
      ...s,
      ref: { id: s.id, partition: [userId], container: this.containerName },
    }));
  }

  async getPersonalSymbol(
    id: string,
    userId: string
  ): Promise<personal_symbol_type | null> {
    const query = {
      query:
        "SELECT * FROM c WHERE c.id = @id AND c.userId = @userId AND c.docType = 'PERSONAL_SYMBOL'",
      parameters: [
        { name: "@id", value: id },
        { name: "@userId", value: userId },
      ],
    };

    const results = await this.cosmos.run_query<personal_symbol_type>(
      this.containerName,
      query
    );

    if (results.length === 0) return null;

    return {
      ...results[0],
      ref: { id: results[0].id, partition: [userId], container: this.containerName },
    };
  }

  async getPersonalSymbolByName(
    userId: string,
    symbolName: string
  ): Promise<personal_symbol_type | null> {
    const normalizedName = symbolName.toLowerCase();
    const query = {
      query:
        "SELECT * FROM c WHERE c.userId = @userId AND c.docType = 'PERSONAL_SYMBOL' AND c.normalizedName = @normalizedName",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@normalizedName", value: normalizedName },
      ],
    };

    const results = await this.cosmos.run_query<personal_symbol_type>(
      this.containerName,
      query
    );

    if (results.length === 0) return null;

    return {
      ...results[0],
      ref: { id: results[0].id, partition: [userId], container: this.containerName },
    };
  }

  async createPersonalSymbol(
    input: create_personal_symbol_input,
    authenticatedUserId: string
  ): Promise<personal_symbol_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    // Check if symbol already exists
    const existing = await this.getPersonalSymbolByName(input.userId, input.symbolName);
    if (existing) {
      return { success: false, message: "Symbol already exists. Use update instead." };
    }

    const now = DateTime.now().toISO()!;
    const symbol: personal_symbol_type = {
      id: uuid(),
      userId: input.userId,
      docType: "PERSONAL_SYMBOL",
      symbolName: input.symbolName,
      normalizedName: input.symbolName.toLowerCase(),
      category: input.category,
      personalMeaning: input.personalMeaning,
      contextualMeanings: input.contextualMeanings,
      firstEncountered: now.split("T")[0],
      lastEncountered: now.split("T")[0],
      totalOccurrences: 1,
      dreamOccurrences: 0,
      readingOccurrences: 0,
      synchronicityOccurrences: 0,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, symbol.id, symbol, [input.userId]);

    return {
      success: true,
      symbol: {
        ...symbol,
        ref: { id: symbol.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async updatePersonalSymbol(
    input: update_personal_symbol_input,
    authenticatedUserId: string
  ): Promise<personal_symbol_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const existing = await this.getPersonalSymbol(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Symbol not found" };
    }

    const now = DateTime.now().toISO()!;

    // Track meaning evolution if meaning is changing
    let meaningEvolution = existing.meaningEvolution || [];
    if (input.personalMeaning && input.personalMeaning !== existing.personalMeaning) {
      meaningEvolution = [
        ...meaningEvolution,
        {
          date: now.split("T")[0],
          previousMeaning: existing.personalMeaning,
          newMeaning: input.personalMeaning,
        },
      ];
    }

    const updated: personal_symbol_type = {
      ...existing,
      personalMeaning: input.personalMeaning ?? existing.personalMeaning,
      contextualMeanings: input.contextualMeanings ?? existing.contextualMeanings,
      notes: input.notes ?? existing.notes,
      meaningEvolution,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, updated.id, updated, [input.userId]);

    return {
      success: true,
      symbol: {
        ...updated,
        ref: { id: updated.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async deletePersonalSymbol(
    id: string,
    userId: string,
    authenticatedUserId: string
  ): Promise<delete_mediumship_response> {
    if (userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    await this.cosmos.delete_record(this.containerName, id, [userId], authenticatedUserId);
    return { success: true };
  }

  // ============================================
  // LOVED ONES IN SPIRIT
  // ============================================

  async getLovedOnes(
    userId: string,
    filters?: loved_one_filters
  ): Promise<loved_one_in_spirit_type[]> {
    let query = `SELECT * FROM c WHERE c.userId = @userId AND c.docType = 'LOVED_ONE_SPIRIT'`;
    const params: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
    ];

    if (filters?.relationship) {
      query += " AND c.relationship = @relationship";
      params.push({ name: "@relationship", value: filters.relationship });
    }

    query += " ORDER BY c.name ASC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const results = await this.cosmos.run_query<loved_one_in_spirit_type>(
      this.containerName,
      { query, parameters: params }
    );

    return results.map((l) => ({
      ...l,
      ref: { id: l.id, partition: [userId], container: this.containerName },
    }));
  }

  async getLovedOne(
    id: string,
    userId: string
  ): Promise<loved_one_in_spirit_type | null> {
    const query = {
      query:
        "SELECT * FROM c WHERE c.id = @id AND c.userId = @userId AND c.docType = 'LOVED_ONE_SPIRIT'",
      parameters: [
        { name: "@id", value: id },
        { name: "@userId", value: userId },
      ],
    };

    const results = await this.cosmos.run_query<loved_one_in_spirit_type>(
      this.containerName,
      query
    );

    if (results.length === 0) return null;

    return {
      ...results[0],
      ref: { id: results[0].id, partition: [userId], container: this.containerName },
    };
  }

  async createLovedOne(
    input: create_loved_one_input,
    authenticatedUserId: string
  ): Promise<loved_one_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const now = DateTime.now().toISO()!;
    const lovedOne: loved_one_in_spirit_type = {
      id: uuid(),
      userId: input.userId,
      docType: "LOVED_ONE_SPIRIT",
      name: input.name,
      relationship: input.relationship,
      nickname: input.nickname,
      birthDate: input.birthDate,
      passingDate: input.passingDate,
      passingCircumstances: input.passingCircumstances,
      personalMemory: input.personalMemory,
      theirPersonality: input.theirPersonality,
      sharedInterests: input.sharedInterests,
      lessonsLearned: input.lessonsLearned,
      commonSigns: input.commonSigns,
      signExplanations: input.signExplanations,
      importantDates: input.importantDates,
      photoUrl: input.photoUrl,
      createdAt: now,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, lovedOne.id, lovedOne, [input.userId]);

    return {
      success: true,
      lovedOne: {
        ...lovedOne,
        ref: { id: lovedOne.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async updateLovedOne(
    input: update_loved_one_input,
    authenticatedUserId: string
  ): Promise<loved_one_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const existing = await this.getLovedOne(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Loved one not found" };
    }

    const now = DateTime.now().toISO()!;
    const updated: loved_one_in_spirit_type = {
      ...existing,
      name: input.name ?? existing.name,
      relationship: input.relationship ?? existing.relationship,
      nickname: input.nickname ?? existing.nickname,
      birthDate: input.birthDate ?? existing.birthDate,
      passingDate: input.passingDate ?? existing.passingDate,
      passingCircumstances: input.passingCircumstances ?? existing.passingCircumstances,
      personalMemory: input.personalMemory ?? existing.personalMemory,
      theirPersonality: input.theirPersonality ?? existing.theirPersonality,
      sharedInterests: input.sharedInterests ?? existing.sharedInterests,
      lessonsLearned: input.lessonsLearned ?? existing.lessonsLearned,
      commonSigns: input.commonSigns ?? existing.commonSigns,
      signExplanations: input.signExplanations ?? existing.signExplanations,
      importantDates: input.importantDates ?? existing.importantDates,
      photoUrl: input.photoUrl ?? existing.photoUrl,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, updated.id, updated, [input.userId]);

    return {
      success: true,
      lovedOne: {
        ...updated,
        ref: { id: updated.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async deleteLovedOne(
    id: string,
    userId: string,
    authenticatedUserId: string
  ): Promise<delete_mediumship_response> {
    if (userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    await this.cosmos.delete_record(this.containerName, id, [userId], authenticatedUserId);
    return { success: true };
  }

  // ============================================
  // DEVELOPMENT EXERCISES
  // ============================================

  async getDevelopmentExercises(
    userId: string,
    filters?: development_exercise_filters
  ): Promise<development_exercise_type[]> {
    let query = `SELECT * FROM c WHERE c.userId = @userId AND c.docType = 'DEVELOPMENT_EXERCISE'`;
    const params: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      params.push({ name: "@startDate", value: filters.startDate });
    }
    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      params.push({ name: "@endDate", value: filters.endDate });
    }
    if (filters?.exerciseType) {
      query += " AND c.exerciseType = @exerciseType";
      params.push({ name: "@exerciseType", value: filters.exerciseType });
    }
    if (filters?.difficulty) {
      query += " AND c.difficulty = @difficulty";
      params.push({ name: "@difficulty", value: filters.difficulty });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const results = await this.cosmos.run_query<development_exercise_type>(
      this.containerName,
      { query, parameters: params }
    );

    return results.map((e) => ({
      ...e,
      ref: { id: e.id, partition: [userId], container: this.containerName },
    }));
  }

  async getDevelopmentExercise(
    id: string,
    userId: string
  ): Promise<development_exercise_type | null> {
    const query = {
      query:
        "SELECT * FROM c WHERE c.id = @id AND c.userId = @userId AND c.docType = 'DEVELOPMENT_EXERCISE'",
      parameters: [
        { name: "@id", value: id },
        { name: "@userId", value: userId },
      ],
    };

    const results = await this.cosmos.run_query<development_exercise_type>(
      this.containerName,
      query
    );

    if (results.length === 0) return null;

    return {
      ...results[0],
      ref: { id: results[0].id, partition: [userId], container: this.containerName },
    };
  }

  async createDevelopmentExercise(
    input: create_development_exercise_input,
    authenticatedUserId: string
  ): Promise<development_exercise_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const now = DateTime.now().toISO()!;
    const exercise: development_exercise_type = {
      id: uuid(),
      userId: input.userId,
      docType: "DEVELOPMENT_EXERCISE",
      date: input.date || now.split("T")[0],
      exerciseType: input.exerciseType,
      exerciseName: input.exerciseName,
      source: input.source,
      difficulty: input.difficulty,
      duration: input.duration,
      environment: input.environment,
      preparation: input.preparation,
      results: input.results,
      accuracy: input.accuracy,
      hits: input.hits,
      misses: input.misses,
      insights: input.insights,
      challengesFaced: input.challengesFaced,
      improvements: input.improvements,
      confidenceLevel: input.confidenceLevel,
      willRepeat: input.willRepeat,
      nextSteps: input.nextSteps,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, exercise.id, exercise, [input.userId]);

    return {
      success: true,
      exercise: {
        ...exercise,
        ref: { id: exercise.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async updateDevelopmentExercise(
    input: update_development_exercise_input,
    authenticatedUserId: string
  ): Promise<development_exercise_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const existing = await this.getDevelopmentExercise(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Exercise not found" };
    }

    const now = DateTime.now().toISO()!;
    const updated: development_exercise_type = {
      ...existing,
      exerciseType: input.exerciseType ?? existing.exerciseType,
      exerciseName: input.exerciseName ?? existing.exerciseName,
      source: input.source ?? existing.source,
      difficulty: input.difficulty ?? existing.difficulty,
      duration: input.duration ?? existing.duration,
      environment: input.environment ?? existing.environment,
      preparation: input.preparation ?? existing.preparation,
      results: input.results ?? existing.results,
      accuracy: input.accuracy ?? existing.accuracy,
      hits: input.hits ?? existing.hits,
      misses: input.misses ?? existing.misses,
      insights: input.insights ?? existing.insights,
      challengesFaced: input.challengesFaced ?? existing.challengesFaced,
      improvements: input.improvements ?? existing.improvements,
      confidenceLevel: input.confidenceLevel ?? existing.confidenceLevel,
      willRepeat: input.willRepeat ?? existing.willRepeat,
      nextSteps: input.nextSteps ?? existing.nextSteps,
      notes: input.notes ?? existing.notes,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, updated.id, updated, [input.userId]);

    return {
      success: true,
      exercise: {
        ...updated,
        ref: { id: updated.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async deleteDevelopmentExercise(
    id: string,
    userId: string,
    authenticatedUserId: string
  ): Promise<delete_mediumship_response> {
    if (userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    await this.cosmos.delete_record(this.containerName, id, [userId], authenticatedUserId);
    return { success: true };
  }

  // ============================================
  // READING REFLECTIONS
  // ============================================

  async getReadingReflections(
    userId: string,
    filters?: reading_reflection_filters
  ): Promise<reading_reflection_type[]> {
    let query = `SELECT * FROM c WHERE c.userId = @userId AND c.docType = 'READING_REFLECTION'`;
    const params: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      params.push({ name: "@startDate", value: filters.startDate });
    }
    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      params.push({ name: "@endDate", value: filters.endDate });
    }
    if (filters?.readingType) {
      query += " AND c.readingType = @readingType";
      params.push({ name: "@readingType", value: filters.readingType });
    }
    if (filters?.minRating) {
      query += " AND c.overallRating >= @minRating";
      params.push({ name: "@minRating", value: filters.minRating });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const results = await this.cosmos.run_query<reading_reflection_type>(
      this.containerName,
      { query, parameters: params }
    );

    return results.map((r) => ({
      ...r,
      ref: { id: r.id, partition: [userId], container: this.containerName },
    }));
  }

  async getReadingReflection(
    id: string,
    userId: string
  ): Promise<reading_reflection_type | null> {
    const query = {
      query:
        "SELECT * FROM c WHERE c.id = @id AND c.userId = @userId AND c.docType = 'READING_REFLECTION'",
      parameters: [
        { name: "@id", value: id },
        { name: "@userId", value: userId },
      ],
    };

    const results = await this.cosmos.run_query<reading_reflection_type>(
      this.containerName,
      query
    );

    if (results.length === 0) return null;

    return {
      ...results[0],
      ref: { id: results[0].id, partition: [userId], container: this.containerName },
    };
  }

  async createReadingReflection(
    input: create_reading_reflection_input,
    authenticatedUserId: string
  ): Promise<reading_reflection_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const now = DateTime.now().toISO()!;
    const reflection: reading_reflection_type = {
      id: uuid(),
      userId: input.userId,
      docType: "READING_REFLECTION",
      date: input.date || now.split("T")[0],
      readerName: input.readerName,
      readingType: input.readingType,
      format: input.format,
      duration: input.duration,
      bookingId: input.bookingId,
      readerId: input.readerId,
      mainMessages: input.mainMessages,
      evidentialInfo: input.evidentialInfo,
      predictions: input.predictions,
      guidance: input.guidance,
      accuracyScore: input.accuracyScore,
      resonatedWith: input.resonatedWith,
      didntResonate: input.didntResonate,
      emotionalImpact: input.emotionalImpact,
      actionsTaken: input.actionsTaken,
      overallRating: input.overallRating,
      notes: input.notes,
      photoUrl: input.photoUrl,
      createdAt: now,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, reflection.id, reflection, [input.userId]);

    return {
      success: true,
      reflection: {
        ...reflection,
        ref: { id: reflection.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async updateReadingReflection(
    input: update_reading_reflection_input,
    authenticatedUserId: string
  ): Promise<reading_reflection_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const existing = await this.getReadingReflection(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Reading reflection not found" };
    }

    const now = DateTime.now().toISO()!;
    const updated: reading_reflection_type = {
      ...existing,
      readerName: input.readerName ?? existing.readerName,
      readingType: input.readingType ?? existing.readingType,
      format: input.format ?? existing.format,
      duration: input.duration ?? existing.duration,
      bookingId: input.bookingId ?? existing.bookingId,
      readerId: input.readerId ?? existing.readerId,
      mainMessages: input.mainMessages ?? existing.mainMessages,
      evidentialInfo: input.evidentialInfo ?? existing.evidentialInfo,
      predictions: input.predictions ?? existing.predictions,
      guidance: input.guidance ?? existing.guidance,
      accuracyScore: input.accuracyScore ?? existing.accuracyScore,
      resonatedWith: input.resonatedWith ?? existing.resonatedWith,
      didntResonate: input.didntResonate ?? existing.didntResonate,
      validatedLater: input.validatedLater ?? existing.validatedLater,
      emotionalImpact: input.emotionalImpact ?? existing.emotionalImpact,
      actionsTaken: input.actionsTaken ?? existing.actionsTaken,
      overallRating: input.overallRating ?? existing.overallRating,
      notes: input.notes ?? existing.notes,
      photoUrl: input.photoUrl ?? existing.photoUrl,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, updated.id, updated, [input.userId]);

    return {
      success: true,
      reflection: {
        ...updated,
        ref: { id: updated.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async deleteReadingReflection(
    id: string,
    userId: string,
    authenticatedUserId: string
  ): Promise<delete_mediumship_response> {
    if (userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    await this.cosmos.delete_record(this.containerName, id, [userId], authenticatedUserId);
    return { success: true };
  }

  // ============================================
  // MEDIUMSHIP STATISTICS
  // ============================================

  async getMediumshipStats(userId: string): Promise<mediumship_stats> {
    const now = DateTime.now();
    const monthStart = now.startOf("month").toISODate()!;

    // Get all entries for stats calculation
    const query = {
      query: `
        SELECT c.docType, c.date, c.source, c.receptionMethod, c.exerciseType, c.accuracy
        FROM c
        WHERE c.userId = @userId
        AND c.docType IN ('SYNCHRONICITY', 'SPIRIT_MESSAGE', 'PERSONAL_SYMBOL', 'LOVED_ONE_SPIRIT', 'DEVELOPMENT_EXERCISE', 'READING_REFLECTION')
      `,
      parameters: [{ name: "@userId", value: userId }],
    };

    const entries = await this.cosmos.run_query<{
      docType: string;
      date?: string;
      source?: string;
      receptionMethod?: string;
      exerciseType?: string;
      accuracy?: number;
    }>(this.containerName, query);

    // Count by type
    let totalSynchronicities = 0;
    let synchronicitiesThisMonth = 0;
    let totalSpiritMessages = 0;
    let messagesThisMonth = 0;
    let symbolCount = 0;
    let lovedOnesCount = 0;
    let exerciseCount = 0;
    let exercisesThisMonth = 0;
    let readingReflectionCount = 0;

    const sourceCounts: Record<string, number> = {};
    const receptionCounts: Record<string, number> = {};
    const exerciseTypeCounts: Record<string, number> = {};
    let totalAccuracy = 0;
    let accuracyCount = 0;

    // Track unique dates for streak calculation
    const uniqueDates = new Set<string>();

    for (const entry of entries) {
      const date = entry.date;
      if (date) uniqueDates.add(date);

      switch (entry.docType) {
        case "SYNCHRONICITY":
          totalSynchronicities++;
          if (date && date >= monthStart) synchronicitiesThisMonth++;
          break;
        case "SPIRIT_MESSAGE":
          totalSpiritMessages++;
          if (date && date >= monthStart) messagesThisMonth++;
          if (entry.source) {
            sourceCounts[entry.source] = (sourceCounts[entry.source] || 0) + 1;
          }
          if (entry.receptionMethod) {
            receptionCounts[entry.receptionMethod] =
              (receptionCounts[entry.receptionMethod] || 0) + 1;
          }
          break;
        case "PERSONAL_SYMBOL":
          symbolCount++;
          break;
        case "LOVED_ONE_SPIRIT":
          lovedOnesCount++;
          break;
        case "DEVELOPMENT_EXERCISE":
          exerciseCount++;
          if (date && date >= monthStart) exercisesThisMonth++;
          if (entry.exerciseType) {
            exerciseTypeCounts[entry.exerciseType] =
              (exerciseTypeCounts[entry.exerciseType] || 0) + 1;
          }
          if (entry.accuracy) {
            totalAccuracy += entry.accuracy;
            accuracyCount++;
          }
          break;
        case "READING_REFLECTION":
          readingReflectionCount++;
          break;
      }
    }

    // Calculate most active source
    let mostActiveSource: string | null = null;
    let maxSourceCount = 0;
    for (const [source, count] of Object.entries(sourceCounts)) {
      if (count > maxSourceCount) {
        mostActiveSource = source;
        maxSourceCount = count;
      }
    }

    // Calculate preferred reception method
    let preferredReceptionMethod: string | null = null;
    let maxReceptionCount = 0;
    for (const [method, count] of Object.entries(receptionCounts)) {
      if (count > maxReceptionCount) {
        preferredReceptionMethod = method;
        maxReceptionCount = count;
      }
    }

    // Calculate favorite exercise
    let favoriteExercise: string | null = null;
    let maxExerciseCount = 0;
    for (const [type, count] of Object.entries(exerciseTypeCounts)) {
      if (count > maxExerciseCount) {
        favoriteExercise = type;
        maxExerciseCount = count;
      }
    }

    // Calculate streak
    const sortedDates = Array.from(uniqueDates).sort().reverse();
    let currentStreak = 0;
    if (sortedDates.length > 0) {
      const today = now.toISODate()!;
      const yesterday = now.minus({ days: 1 }).toISODate()!;

      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        currentStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const curr = DateTime.fromISO(sortedDates[i]);
          const prev = DateTime.fromISO(sortedDates[i - 1]);
          if (Math.floor(prev.diff(curr, "days").days) === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Get upcoming dates for loved ones
    const lovedOnesQuery = {
      query: `
        SELECT c.id, c.name, c.importantDates
        FROM c
        WHERE c.userId = @userId AND c.docType = 'LOVED_ONE_SPIRIT'
      `,
      parameters: [{ name: "@userId", value: userId }],
    };
    const lovedOnes = await this.cosmos.run_query<{
      id: string;
      name: string;
      importantDates?: { date: string; occasion: string }[];
    }>(this.containerName, lovedOnesQuery);

    const upcomingDates: {
      lovedOneId: string;
      name: string;
      date: string;
      occasion: string;
    }[] = [];
    const today = now.toISODate()!;
    const nextMonth = now.plus({ months: 1 }).toISODate()!;

    for (const lovedOne of lovedOnes) {
      if (lovedOne.importantDates) {
        for (const dateInfo of lovedOne.importantDates) {
          // Check if the date (without year) falls in the next month
          const monthDay = dateInfo.date.slice(5); // Get MM-DD
          const thisYear = `${now.year}-${monthDay}`;
          if (thisYear >= today && thisYear <= nextMonth) {
            upcomingDates.push({
              lovedOneId: lovedOne.id,
              name: lovedOne.name,
              date: thisYear,
              occasion: dateInfo.occasion,
            });
          }
        }
      }
    }

    // Get top symbols (mock for now - would need aggregation)
    const topSymbols: { name: string; count: number }[] = [];

    // Get average reading rating
    const readingQuery = {
      query: `
        SELECT c.overallRating
        FROM c
        WHERE c.userId = @userId AND c.docType = 'READING_REFLECTION' AND IS_DEFINED(c.overallRating)
      `,
      parameters: [{ name: "@userId", value: userId }],
    };
    const readings = await this.cosmos.run_query<{ overallRating: number }>(
      this.containerName,
      readingQuery
    );
    const averageReadingRating =
      readings.length > 0
        ? readings.reduce((sum, r) => sum + r.overallRating, 0) / readings.length
        : 0;

    return {
      totalSynchronicities,
      synchronicitiesThisMonth,
      totalSpiritMessages,
      messagesThisMonth,
      symbolCount,
      topSymbols,
      mostActiveSource: mostActiveSource as any,
      preferredReceptionMethod: preferredReceptionMethod as any,
      exerciseCount,
      exercisesThisMonth,
      averageAccuracy: accuracyCount > 0 ? totalAccuracy / accuracyCount : 0,
      favoriteExercise: favoriteExercise as any,
      lovedOnesCount,
      upcomingDates,
      readingReflectionCount,
      averageReadingRating,
      daysActive: uniqueDates.size,
      currentStreak,
      longestStreak: currentStreak, // Would need historical tracking for accurate longest
    };
  }

  // ============================================
  // SYMBOL OCCURRENCE TRACKING
  // ============================================

  /**
   * Update Personal Symbol Dictionary when symbols are logged in entries
   * (dreams, readings, synchronicities)
   */
  async updateSymbolOccurrences(
    userId: string,
    symbols: { name: string; category?: string }[],
    entryType: 'dream' | 'reading' | 'synchronicity',
    authenticatedUserId: string
  ): Promise<void> {
    const now = DateTime.now().toISO()!;
    const today = now.split('T')[0];

    for (const symbol of symbols) {
      const existingSymbol = await this.getPersonalSymbolByName(userId, symbol.name);

      if (existingSymbol) {
        // Update existing personal symbol
        const updates: Record<string, unknown> = {
          lastEncountered: today,
          totalOccurrences: existingSymbol.totalOccurrences + 1,
          updatedAt: now
        };

        if (entryType === 'reading') {
          updates.readingOccurrences = existingSymbol.readingOccurrences + 1;
        } else if (entryType === 'dream') {
          updates.dreamOccurrences = existingSymbol.dreamOccurrences + 1;
        } else if (entryType === 'synchronicity') {
          updates.synchronicityOccurrences = existingSymbol.synchronicityOccurrences + 1;
        }

        await this.cosmos.update_record(
          this.containerName,
          existingSymbol.id,
          [userId],
          updates,
          authenticatedUserId
        );
      } else {
        // Create new personal symbol (auto-discovered from entry)
        const newPersonalSymbol: personal_symbol_type = {
          id: uuid(),
          docType: 'PERSONAL_SYMBOL',
          userId,
          symbolName: symbol.name,
          normalizedName: symbol.name.toLowerCase(),
          category: symbol.category,
          personalMeaning: '', // User can add their personal meaning later
          firstEncountered: today,
          lastEncountered: today,
          totalOccurrences: 1,
          dreamOccurrences: entryType === 'dream' ? 1 : 0,
          readingOccurrences: entryType === 'reading' ? 1 : 0,
          synchronicityOccurrences: entryType === 'synchronicity' ? 1 : 0,
          createdAt: now,
          updatedAt: now
        };

        await this.cosmos.upsert_record(this.containerName, newPersonalSymbol.id, newPersonalSymbol, [userId]);
      }
    }
  }

  // ============================================
  // USER CARD SYMBOLS (Personal tarot card meanings)
  // ============================================

  async getUserCardSymbols(userId: string): Promise<user_card_symbols_type[]> {
    const query = {
      query: "SELECT * FROM c WHERE c.userId = @userId AND c.docType = 'USER_CARD_SYMBOLS' ORDER BY c.cardName ASC",
      parameters: [{ name: "@userId", value: userId }],
    };

    const results = await this.cosmos.run_query<user_card_symbols_type>(
      this.containerName,
      query
    );

    return results.map((s) => ({
      ...s,
      ref: { id: s.id, partition: [userId], container: this.containerName },
    }));
  }

  async getUserCardSymbol(id: string, userId: string): Promise<user_card_symbols_type | null> {
    const query = {
      query: "SELECT * FROM c WHERE c.id = @id AND c.userId = @userId AND c.docType = 'USER_CARD_SYMBOLS'",
      parameters: [
        { name: "@id", value: id },
        { name: "@userId", value: userId },
      ],
    };

    const results = await this.cosmos.run_query<user_card_symbols_type>(
      this.containerName,
      query
    );

    if (results.length === 0) return null;

    return {
      ...results[0],
      ref: { id: results[0].id, partition: [userId], container: this.containerName },
    };
  }

  async getUserCardSymbolByCardName(userId: string, cardName: string): Promise<user_card_symbols_type | null> {
    const normalizedName = cardName.toLowerCase().trim();
    const query = {
      query: "SELECT * FROM c WHERE c.userId = @userId AND c.docType = 'USER_CARD_SYMBOLS' AND c.normalizedCardName = @normalizedName",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@normalizedName", value: normalizedName },
      ],
    };

    const results = await this.cosmos.run_query<user_card_symbols_type>(
      this.containerName,
      query
    );

    if (results.length === 0) return null;

    return {
      ...results[0],
      ref: { id: results[0].id, partition: [userId], container: this.containerName },
    };
  }

  async createUserCardSymbols(
    input: create_user_card_symbols_input,
    authenticatedUserId: string
  ): Promise<user_card_symbols_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    // Check if already exists for this card
    const existing = await this.getUserCardSymbolByCardName(input.userId, input.cardName);
    if (existing) {
      return { success: false, message: "Card symbols already exist. Use update instead." };
    }

    const now = DateTime.now().toISO()!;
    const cardSymbols: user_card_symbols_type = {
      id: uuid(),
      docType: 'USER_CARD_SYMBOLS',
      userId: input.userId,
      cardName: input.cardName.trim(),
      normalizedCardName: input.cardName.toLowerCase().trim(),
      personalSymbols: input.personalSymbols,
      usePersonalOnly: input.usePersonalOnly ?? false,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(
      this.containerName,
      cardSymbols.id,
      cardSymbols,
      [input.userId]
    );

    return {
      success: true,
      cardSymbols: {
        ...cardSymbols,
        ref: { id: cardSymbols.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async updateUserCardSymbols(
    input: update_user_card_symbols_input,
    authenticatedUserId: string
  ): Promise<user_card_symbols_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const existing = await this.getUserCardSymbol(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Card symbols not found" };
    }

    const now = DateTime.now().toISO()!;

    const updated: user_card_symbols_type = {
      ...existing,
      personalSymbols: input.personalSymbols ?? existing.personalSymbols,
      usePersonalOnly: input.usePersonalOnly ?? existing.usePersonalOnly,
      notes: input.notes ?? existing.notes,
      updatedAt: now,
    };

    await this.cosmos.upsert_record(this.containerName, updated.id, updated, [input.userId]);

    return {
      success: true,
      cardSymbols: {
        ...updated,
        ref: { id: updated.id, partition: [input.userId], container: this.containerName },
      },
    };
  }

  async deleteUserCardSymbols(
    id: string,
    userId: string,
    authenticatedUserId: string
  ): Promise<delete_mediumship_response> {
    if (userId !== authenticatedUserId) {
      return { success: false, message: "Unauthorized" };
    }

    await this.cosmos.delete_record(this.containerName, id, [userId], authenticatedUserId);
    return { success: true };
  }
}
