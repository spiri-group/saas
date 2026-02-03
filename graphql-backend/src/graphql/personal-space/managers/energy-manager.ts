import { CosmosDataSource } from "../../../utils/database";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import {
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
  energy_stats,
  chakra_trend,
  chakra_status,
} from "../types/energy-types";
import { chakra_type } from "../../crystal-reference/types";

export class EnergyHealingManager {
  private containerName = "Main-PersonalSpace";
  private cosmos: CosmosDataSource;

  constructor(cosmos: CosmosDataSource) {
    this.cosmos = cosmos;
  }

  // ============================================
  // Energy Journal Queries & Mutations
  // ============================================

  async getEnergyJournalEntries(userId: string, filters?: energy_journal_filters): Promise<energy_journal_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "ENERGY_JOURNAL" }
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      parameters.push({ name: "@startDate", value: filters.startDate });
    }

    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      parameters.push({ name: "@endDate", value: filters.endDate });
    }

    if (filters?.entryType) {
      query += " AND c.entryType = @entryType";
      parameters.push({ name: "@entryType", value: filters.entryType });
    }

    if (filters?.modality) {
      query += " AND c.modality = @modality";
      parameters.push({ name: "@modality", value: filters.modality });
    }

    if (filters?.role) {
      query += " AND c.role = @role";
      parameters.push({ name: "@role", value: filters.role });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    return await this.cosmos.run_query<energy_journal_type>(this.containerName, querySpec);
  }

  async getEnergyJournalEntry(id: string, userId: string): Promise<energy_journal_type | null> {
    return await this.cosmos.get_record_by_doctype<energy_journal_type>(
      this.containerName,
      id,
      userId,
      "ENERGY_JOURNAL"
    );
  }

  async createEnergyJournalEntry(input: create_energy_journal_input, authenticatedUserId: string): Promise<energy_journal_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "You can only create entries for yourself" };
    }

    const id = uuid();
    const now = DateTime.now().toISO()!;
    const date = input.date || DateTime.now().toISODate()!;

    const entry: Omit<energy_journal_type, '_id'> = {
      id,
      userId: input.userId,
      docType: 'ENERGY_JOURNAL',
      date,
      entryType: input.entryType,
      title: input.title,
      modality: input.modality,
      duration: input.duration,
      role: input.role,
      bookingId: input.bookingId,
      practitionerName: input.practitionerName,
      practitionerId: input.practitionerId,
      clientInitials: input.clientInitials,
      sessionNotes: input.sessionNotes,
      preSessionFeeling: input.preSessionFeeling,
      postSessionFeeling: input.postSessionFeeling,
      energyLevel: input.energyLevel,
      sensations: input.sensations,
      insights: input.insights,
      techniquesUsed: input.techniquesUsed,
      toolsUsed: input.toolsUsed,
      notes: input.notes,
      intention: input.intention,
      photoUrl: input.photoUrl,
      createdAt: now,
      updatedAt: now
    };

    const created = await this.cosmos.add_record<energy_journal_type>(
      this.containerName,
      entry,
      input.userId,
      authenticatedUserId
    );

    return { success: true, message: "Energy journal entry created", entry: created };
  }

  async updateEnergyJournalEntry(input: update_energy_journal_input, authenticatedUserId: string): Promise<energy_journal_response> {
    const existing = await this.getEnergyJournalEntry(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Entry not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own entries" };
    }

    const updates: Partial<energy_journal_type> = {
      updatedAt: DateTime.now().toISO()!
    };

    if (input.entryType !== undefined) updates.entryType = input.entryType;
    if (input.title !== undefined) updates.title = input.title;
    if (input.modality !== undefined) updates.modality = input.modality;
    if (input.duration !== undefined) updates.duration = input.duration;
    if (input.role !== undefined) updates.role = input.role;
    if (input.bookingId !== undefined) updates.bookingId = input.bookingId;
    if (input.practitionerName !== undefined) updates.practitionerName = input.practitionerName;
    if (input.practitionerId !== undefined) updates.practitionerId = input.practitionerId;
    if (input.clientInitials !== undefined) updates.clientInitials = input.clientInitials;
    if (input.sessionNotes !== undefined) updates.sessionNotes = input.sessionNotes;
    if (input.preSessionFeeling !== undefined) updates.preSessionFeeling = input.preSessionFeeling;
    if (input.postSessionFeeling !== undefined) updates.postSessionFeeling = input.postSessionFeeling;
    if (input.energyLevel !== undefined) updates.energyLevel = input.energyLevel;
    if (input.sensations !== undefined) updates.sensations = input.sensations;
    if (input.insights !== undefined) updates.insights = input.insights;
    if (input.techniquesUsed !== undefined) updates.techniquesUsed = input.techniquesUsed;
    if (input.toolsUsed !== undefined) updates.toolsUsed = input.toolsUsed;
    if (input.notes !== undefined) updates.notes = input.notes;
    if (input.intention !== undefined) updates.intention = input.intention;
    if (input.photoUrl !== undefined) updates.photoUrl = input.photoUrl;

    await this.cosmos.update_record(this.containerName, input.id, input.userId, updates, authenticatedUserId);

    const updated = await this.getEnergyJournalEntry(input.id, input.userId);
    return { success: true, message: "Entry updated", entry: updated! };
  }

  async deleteEnergyJournalEntry(id: string, userId: string, authenticatedUserId: string): Promise<delete_energy_response> {
    const existing = await this.getEnergyJournalEntry(id, userId);
    if (!existing) {
      return { success: false, message: "Entry not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only delete your own entries" };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);
    return { success: true, message: "Entry deleted" };
  }

  // ============================================
  // Chakra Check-In Queries & Mutations
  // ============================================

  async getChakraCheckins(userId: string, filters?: chakra_checkin_filters): Promise<chakra_checkin_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "CHAKRA_CHECKIN" }
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      parameters.push({ name: "@startDate", value: filters.startDate });
    }

    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      parameters.push({ name: "@endDate", value: filters.endDate });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    return await this.cosmos.run_query<chakra_checkin_type>(this.containerName, querySpec);
  }

  async getChakraCheckin(id: string, userId: string): Promise<chakra_checkin_type | null> {
    return await this.cosmos.get_record_by_doctype<chakra_checkin_type>(
      this.containerName,
      id,
      userId,
      "CHAKRA_CHECKIN"
    );
  }

  async getTodaysChakraCheckin(userId: string): Promise<chakra_checkin_type | null> {
    const today = DateTime.now().toISODate()!;
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType AND c.date = @date ORDER BY c.createdAt DESC",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "CHAKRA_CHECKIN" },
        { name: "@date", value: today }
      ]
    };

    const results = await this.cosmos.run_query<chakra_checkin_type>(this.containerName, querySpec);
    return results.length > 0 ? results[0] : null;
  }

  async createChakraCheckin(input: create_chakra_checkin_input, authenticatedUserId: string): Promise<chakra_checkin_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "You can only create check-ins for yourself" };
    }

    const id = uuid();
    const now = DateTime.now().toISO()!;
    const date = input.date || DateTime.now().toISODate()!;

    const checkin: Omit<chakra_checkin_type, '_id'> = {
      id,
      userId: input.userId,
      docType: 'CHAKRA_CHECKIN',
      date,
      checkInTime: input.checkInTime,
      chakras: input.chakras,
      overallBalance: input.overallBalance,
      dominantChakra: input.dominantChakra,
      weakestChakra: input.weakestChakra,
      physicalState: input.physicalState,
      emotionalState: input.emotionalState,
      mentalState: input.mentalState,
      observations: input.observations,
      actionTaken: input.actionTaken,
      createdAt: now,
      updatedAt: now
    };

    const created = await this.cosmos.add_record<chakra_checkin_type>(
      this.containerName,
      checkin,
      input.userId,
      authenticatedUserId
    );

    return { success: true, message: "Chakra check-in created", checkin: created };
  }

  async updateChakraCheckin(input: update_chakra_checkin_input, authenticatedUserId: string): Promise<chakra_checkin_response> {
    const existing = await this.getChakraCheckin(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Check-in not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own check-ins" };
    }

    const updates: Partial<chakra_checkin_type> = {
      updatedAt: DateTime.now().toISO()!
    };

    if (input.checkInTime !== undefined) updates.checkInTime = input.checkInTime;
    if (input.chakras !== undefined) updates.chakras = input.chakras;
    if (input.overallBalance !== undefined) updates.overallBalance = input.overallBalance;
    if (input.dominantChakra !== undefined) updates.dominantChakra = input.dominantChakra;
    if (input.weakestChakra !== undefined) updates.weakestChakra = input.weakestChakra;
    if (input.physicalState !== undefined) updates.physicalState = input.physicalState;
    if (input.emotionalState !== undefined) updates.emotionalState = input.emotionalState;
    if (input.mentalState !== undefined) updates.mentalState = input.mentalState;
    if (input.observations !== undefined) updates.observations = input.observations;
    if (input.actionTaken !== undefined) updates.actionTaken = input.actionTaken;

    await this.cosmos.update_record(this.containerName, input.id, input.userId, updates, authenticatedUserId);

    const updated = await this.getChakraCheckin(input.id, input.userId);
    return { success: true, message: "Check-in updated", checkin: updated! };
  }

  async deleteChakraCheckin(id: string, userId: string, authenticatedUserId: string): Promise<delete_energy_response> {
    const existing = await this.getChakraCheckin(id, userId);
    if (!existing) {
      return { success: false, message: "Check-in not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only delete your own check-ins" };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);
    return { success: true, message: "Check-in deleted" };
  }

  // ============================================
  // Session Reflection Queries & Mutations
  // ============================================

  async getSessionReflections(userId: string, filters?: session_reflection_filters): Promise<session_reflection_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "SESSION_REFLECTION" }
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      parameters.push({ name: "@startDate", value: filters.startDate });
    }

    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      parameters.push({ name: "@endDate", value: filters.endDate });
    }

    if (filters?.modality) {
      query += " AND c.modality = @modality";
      parameters.push({ name: "@modality", value: filters.modality });
    }

    if (filters?.practitionerId) {
      query += " AND c.practitionerId = @practitionerId";
      parameters.push({ name: "@practitionerId", value: filters.practitionerId });
    }

    if (filters?.minRating !== undefined) {
      query += " AND c.overallRating >= @minRating";
      parameters.push({ name: "@minRating", value: filters.minRating });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    return await this.cosmos.run_query<session_reflection_type>(this.containerName, querySpec);
  }

  async getSessionReflection(id: string, userId: string): Promise<session_reflection_type | null> {
    return await this.cosmos.get_record_by_doctype<session_reflection_type>(
      this.containerName,
      id,
      userId,
      "SESSION_REFLECTION"
    );
  }

  async createSessionReflection(input: create_session_reflection_input, authenticatedUserId: string): Promise<session_reflection_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "You can only create reflections for yourself" };
    }

    const id = uuid();
    const now = DateTime.now().toISO()!;
    const date = input.date || DateTime.now().toISODate()!;

    const reflection: Omit<session_reflection_type, '_id'> = {
      id,
      userId: input.userId,
      docType: 'SESSION_REFLECTION',
      date,
      practitionerName: input.practitionerName,
      modality: input.modality,
      sessionType: input.sessionType,
      duration: input.duration,
      bookingId: input.bookingId,
      practitionerId: input.practitionerId,
      preSessionState: input.preSessionState,
      duringSession: input.duringSession,
      postSessionState: input.postSessionState,
      sensations: input.sensations,
      areasWorkedOn: input.areasWorkedOn,
      messagesReceived: input.messagesReceived,
      aftercare: input.aftercare,
      personalNotes: input.personalNotes,
      wouldRecommend: input.wouldRecommend,
      overallRating: input.overallRating,
      shiftsNoticed: input.shiftsNoticed,
      followUpDate: input.followUpDate,
      photoUrl: input.photoUrl,
      createdAt: now,
      updatedAt: now
    };

    const created = await this.cosmos.add_record<session_reflection_type>(
      this.containerName,
      reflection,
      input.userId,
      authenticatedUserId
    );

    return { success: true, message: "Session reflection created", reflection: created };
  }

  async updateSessionReflection(input: update_session_reflection_input, authenticatedUserId: string): Promise<session_reflection_response> {
    const existing = await this.getSessionReflection(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Reflection not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own reflections" };
    }

    const updates: Partial<session_reflection_type> = {
      updatedAt: DateTime.now().toISO()!
    };

    if (input.practitionerName !== undefined) updates.practitionerName = input.practitionerName;
    if (input.modality !== undefined) updates.modality = input.modality;
    if (input.sessionType !== undefined) updates.sessionType = input.sessionType;
    if (input.duration !== undefined) updates.duration = input.duration;
    if (input.bookingId !== undefined) updates.bookingId = input.bookingId;
    if (input.practitionerId !== undefined) updates.practitionerId = input.practitionerId;
    if (input.preSessionState !== undefined) updates.preSessionState = input.preSessionState;
    if (input.duringSession !== undefined) updates.duringSession = input.duringSession;
    if (input.postSessionState !== undefined) updates.postSessionState = input.postSessionState;
    if (input.sensations !== undefined) updates.sensations = input.sensations;
    if (input.areasWorkedOn !== undefined) updates.areasWorkedOn = input.areasWorkedOn;
    if (input.messagesReceived !== undefined) updates.messagesReceived = input.messagesReceived;
    if (input.aftercare !== undefined) updates.aftercare = input.aftercare;
    if (input.personalNotes !== undefined) updates.personalNotes = input.personalNotes;
    if (input.wouldRecommend !== undefined) updates.wouldRecommend = input.wouldRecommend;
    if (input.overallRating !== undefined) updates.overallRating = input.overallRating;
    if (input.shiftsNoticed !== undefined) updates.shiftsNoticed = input.shiftsNoticed;
    if (input.followUpDate !== undefined) updates.followUpDate = input.followUpDate;
    if (input.photoUrl !== undefined) updates.photoUrl = input.photoUrl;

    await this.cosmos.update_record(this.containerName, input.id, input.userId, updates, authenticatedUserId);

    const updated = await this.getSessionReflection(input.id, input.userId);
    return { success: true, message: "Reflection updated", reflection: updated! };
  }

  async deleteSessionReflection(id: string, userId: string, authenticatedUserId: string): Promise<delete_energy_response> {
    const existing = await this.getSessionReflection(id, userId);
    if (!existing) {
      return { success: false, message: "Reflection not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only delete your own reflections" };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);
    return { success: true, message: "Reflection deleted" };
  }

  // ============================================
  // Energy Healing Statistics
  // ============================================

  async getEnergyStats(userId: string): Promise<energy_stats> {
    // Get all energy data
    const journalEntries = await this.getEnergyJournalEntries(userId, { limit: 500 });
    const chakraCheckins = await this.getChakraCheckins(userId, { limit: 100 });

    // Time calculations
    const now = DateTime.now();
    const weekAgo = now.minus({ weeks: 1 });
    const monthAgo = now.minus({ months: 1 });

    let entriesThisWeek = 0;
    let entriesThisMonth = 0;
    let sessionsGiven = 0;
    let sessionsReceived = 0;
    let totalPracticeMinutes = 0;
    const entryTypeCounts: Record<string, number> = {};

    // Process journal entries
    for (const entry of journalEntries) {
      const entryDate = DateTime.fromISO(entry.date);
      if (entryDate >= weekAgo) entriesThisWeek++;
      if (entryDate >= monthAgo) entriesThisMonth++;

      // Count entry types
      entryTypeCounts[entry.entryType] = (entryTypeCounts[entry.entryType] || 0) + 1;

      // Track sessions
      if (entry.role === 'practitioner') sessionsGiven++;
      if (entry.role === 'recipient') sessionsReceived++;

      // Track practice time
      if (entry.duration) totalPracticeMinutes += entry.duration;
    }

    const entryTypeBreakdown = Object.entries(entryTypeCounts)
      .map(([type, count]) => ({ type: type as any, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate chakra trends
    const chakraTrends: chakra_trend[] = [];
    const chakraList: chakra_type[] = ['root', 'sacral', 'solar_plexus', 'heart', 'throat', 'third_eye', 'crown'];

    for (const chakra of chakraList) {
      let blockedCount = 0;
      let openCount = 0;
      let recentStatus: chakra_status = 'unclear';

      for (const checkin of chakraCheckins) {
        const chakraState = checkin.chakras.find(c => c.chakra === chakra);
        if (chakraState) {
          if (chakraState.status === 'blocked' || chakraState.status === 'weak') blockedCount++;
          if (chakraState.status === 'open' || chakraState.status === 'balanced') openCount++;
        }
      }

      // Get most recent status
      if (chakraCheckins.length > 0) {
        const recent = chakraCheckins[0].chakras.find(c => c.chakra === chakra);
        if (recent) recentStatus = recent.status;
      }

      // Determine trend
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (openCount > blockedCount * 1.5) trend = 'improving';
      if (blockedCount > openCount * 1.5) trend = 'declining';

      chakraTrends.push({
        chakra,
        recentStatus,
        blockedCount,
        openCount,
        trend
      });
    }

    // Find most blocked/open chakras
    const mostBlockedChakra = chakraTrends.reduce((a, b) => a.blockedCount > b.blockedCount ? a : b, chakraTrends[0])?.chakra;
    const mostOpenChakra = chakraTrends.reduce((a, b) => a.openCount > b.openCount ? a : b, chakraTrends[0])?.chakra;

    // Calculate practice streak
    let practiceStreak = 0;
    if (journalEntries.length > 0) {
      const sortedDates = [...new Set(journalEntries.map(e => e.date))].sort().reverse();
      const today = DateTime.now().toISODate()!;
      const yesterday = DateTime.now().minus({ days: 1 }).toISODate()!;

      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        practiceStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const curr = DateTime.fromISO(sortedDates[i]);
          const prev = DateTime.fromISO(sortedDates[i - 1]);
          if (Math.floor(prev.diff(curr, 'days').days) === 1) {
            practiceStreak++;
          } else {
            break;
          }
        }
      }
    }

    const averageSessionLength = journalEntries.length > 0
      ? Math.round(totalPracticeMinutes / journalEntries.filter(e => e.duration).length)
      : 0;

    return {
      totalJournalEntries: journalEntries.length,
      entriesThisWeek,
      entriesThisMonth,
      entryTypeBreakdown,
      sessionsGiven,
      sessionsReceived,
      chakraCheckinsCount: chakraCheckins.length,
      chakraTrends,
      mostBlockedChakra: mostBlockedChakra || undefined,
      mostOpenChakra: mostOpenChakra || undefined,
      totalPracticeMinutes,
      averageSessionLength,
      practiceStreak,
      attunementCount: 0, // Progressive feature - not implemented yet
      highestLevel: undefined,
      protectionRitualCount: 0, // Progressive feature - not implemented yet
      auraObservationCount: 0 // Progressive feature - not implemented yet
    };
  }
}
