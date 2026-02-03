import { recordref_type } from "../../0_shared/types";
import { chakra_type } from "../../crystal-reference/types";

// ============================================
// Energy Healing Types
// ============================================

// Chakra status for check-ins
export type chakra_status =
  | 'open'
  | 'balanced'
  | 'overactive'
  | 'blocked'
  | 'weak'
  | 'unclear';

// Energy work modality types
export type energy_modality =
  | 'reiki'
  | 'pranic_healing'
  | 'quantum_touch'
  | 'theta_healing'
  | 'healing_touch'
  | 'chakra_balancing'
  | 'aura_cleansing'
  | 'crystal_healing'
  | 'sound_healing'
  | 'breathwork'
  | 'grounding'
  | 'shielding'
  | 'cord_cutting'
  | 'entity_clearing'
  | 'space_clearing'
  | 'distance_healing'
  | 'self_healing'
  | 'other';

// Energy journal entry types
export type energy_entry_type =
  | 'meditation'
  | 'clearing'
  | 'grounding'
  | 'session_given'
  | 'session_received'
  | 'self_practice'
  | 'attunement'
  | 'protection_ritual'
  | 'observation';

// Session role - practitioner or recipient
export type session_role = 'practitioner' | 'recipient';

// ============================================
// Energy Journal Entry (Core - day one)
// ============================================

export interface energy_journal_type {
  id: string;
  userId: string;
  docType: 'ENERGY_JOURNAL';

  // Required fields
  date: string;              // ISO date (YYYY-MM-DD)
  entryType: energy_entry_type;
  title?: string;            // Optional title for the entry

  // Session details (if applicable)
  modality?: energy_modality;
  duration?: number;         // Duration in minutes
  role?: session_role;       // For session entries

  // For sessions received - link to booking
  bookingId?: string;        // SpiriVerse booking reference
  practitionerName?: string;
  practitionerId?: string;

  // For sessions given
  clientInitials?: string;   // Privacy - just initials
  sessionNotes?: string;     // Private practitioner notes

  // Experience
  preSessionFeeling?: string;
  postSessionFeeling?: string;
  energyLevel?: number;      // 1-10 scale
  sensations?: string[];     // Physical/energetic sensations felt
  insights?: string;         // Insights or messages received

  // Techniques used
  techniquesUsed?: string[];
  toolsUsed?: string[];      // Crystals, singing bowl, etc.

  // General notes
  notes?: string;
  intention?: string;
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Chakra Check-In (Core - day one)
// ============================================

export interface chakra_state {
  chakra: chakra_type;
  status: chakra_status;
  notes?: string;            // Specific observations
}

export interface chakra_checkin_type {
  id: string;
  userId: string;
  docType: 'CHAKRA_CHECKIN';

  // Required fields
  date: string;              // ISO date (YYYY-MM-DD)
  checkInTime?: string;      // HH:mm - morning, evening check-in

  // Chakra states - quick tap assessment
  chakras: chakra_state[];

  // Overall assessment
  overallBalance?: number;   // 1-10 scale
  dominantChakra?: chakra_type;
  weakestChakra?: chakra_type;

  // Context
  physicalState?: string;    // How body feels
  emotionalState?: string;   // Emotional state
  mentalState?: string;      // Mental clarity

  // Notes
  observations?: string;
  actionTaken?: string;      // What did you do to balance?

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Session Reflection (Core - day one)
// ============================================

// Reflection on a healing session received
export interface session_reflection_type {
  id: string;
  userId: string;
  docType: 'SESSION_REFLECTION';

  // Required fields
  date: string;              // Session date
  practitionerName: string;

  // Session info
  modality?: energy_modality;
  sessionType?: string;      // "In-person", "Distance", "Group"
  duration?: number;         // Minutes

  // SpiriVerse integration
  bookingId?: string;        // Link to SpiriVerse booking
  practitionerId?: string;   // Link to practitioner

  // Experience
  preSessionState?: string;  // How you felt before
  duringSession?: string;    // What you experienced
  postSessionState?: string; // How you felt after
  sensations?: string[];     // Physical/energetic sensations

  // Healing areas
  areasWorkedOn?: string[];  // Chakras, body areas, issues
  messagesReceived?: string; // Any messages/insights from practitioner

  // Follow-up
  aftercare?: string;        // Practitioner recommendations
  personalNotes?: string;    // Private notes
  wouldRecommend?: boolean;
  overallRating?: number;    // 1-5

  // Tracking
  shiftsNoticed?: string;    // Changes noticed after session
  followUpDate?: string;     // Next session date

  // Media
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Attunement Tracker (Progressive)
// ============================================

// Reiki levels and other attunement systems
export type attunement_level =
  | 'reiki_1'
  | 'reiki_2'
  | 'reiki_3'
  | 'reiki_master'
  | 'karuna_1'
  | 'karuna_2'
  | 'karuna_master'
  | 'seichem'
  | 'kundalini_reiki'
  | 'other';

export interface attunement_record_type {
  id: string;
  userId: string;
  docType: 'ATTUNEMENT_RECORD';

  // Required fields
  date: string;              // Attunement date
  level: attunement_level;
  system: string;            // "Usui Reiki", "Karuna Reiki", etc.

  // Teacher info
  teacherName: string;
  teacherId?: string;        // SpiriVerse practitioner if applicable
  lineage?: string;          // Reiki lineage if known

  // Details
  location?: string;         // Where it took place
  format?: string;           // "In-person", "Distance"
  duration?: string;         // Course duration

  // Experience
  experience?: string;       // What you experienced
  symbols?: string[];        // Symbols received (if applicable)
  insights?: string;

  // Certificate
  certificateUrl?: string;
  certificateNumber?: string;

  // Practice since
  practiceNotes?: string;    // How practice has evolved since
  hoursLogged?: number;      // Practice hours since attunement

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Protection Ritual Log (Progressive)
// ============================================

export type protection_type =
  | 'shielding'
  | 'grounding'
  | 'cord_cutting'
  | 'space_clearing'
  | 'aura_sealing'
  | 'psychic_protection'
  | 'entity_clearing'
  | 'boundary_setting'
  | 'other';

export interface protection_ritual_type {
  id: string;
  userId: string;
  docType: 'PROTECTION_RITUAL';

  // Required fields
  date: string;
  protectionType: protection_type;

  // Details
  technique?: string;        // Specific technique used
  duration?: number;         // Minutes
  reason?: string;           // Why this protection was needed
  location?: string;         // Where performed

  // Tools used
  toolsUsed?: string[];      // Crystals, salt, sage, etc.
  invocations?: string[];    // Guides/angels/deities called

  // Experience
  sensations?: string;       // What you felt
  effectiveness?: number;    // 1-5 how effective
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Aura Observation (Progressive)
// ============================================

export type aura_color =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'white'
  | 'gold'
  | 'silver'
  | 'pink'
  | 'brown'
  | 'gray'
  | 'black'
  | 'rainbow'
  | 'other';

export type aura_layer =
  | 'physical'      // Etheric
  | 'emotional'     // Astral
  | 'mental'        // Lower mental
  | 'astral'        // Higher astral
  | 'etheric_template'
  | 'celestial'
  | 'causal';       // Ketheric template

export interface aura_layer_observation {
  layer?: aura_layer;
  colors: aura_color[];
  intensity?: number;        // 1-5
  notes?: string;
}

export interface aura_observation_type {
  id: string;
  userId: string;
  docType: 'AURA_OBSERVATION';

  // Required fields
  date: string;
  observationType: 'self' | 'other';

  // For other observations
  subjectInitials?: string;  // Privacy

  // Observation
  primaryColors: aura_color[];
  secondaryColors?: aura_color[];
  layers?: aura_layer_observation[];

  // Assessment
  overallHealth?: number;    // 1-10
  clarity?: number;          // 1-5 how clear the aura appeared
  size?: string;             // "compact", "normal", "expanded"

  // Observations
  patterns?: string;         // Any patterns noticed
  anomalies?: string;        // Dark spots, tears, etc.
  messages?: string;         // Intuitive messages received

  // Method
  observationMethod?: string; // "meditation", "peripheral vision", "photo"
  photoUrl?: string;

  // Notes
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Energy Healing Input Types
// ============================================

// Energy Journal inputs
export interface create_energy_journal_input {
  userId: string;
  date?: string;
  entryType: energy_entry_type;
  title?: string;
  modality?: energy_modality;
  duration?: number;
  role?: session_role;
  bookingId?: string;
  practitionerName?: string;
  practitionerId?: string;
  clientInitials?: string;
  sessionNotes?: string;
  preSessionFeeling?: string;
  postSessionFeeling?: string;
  energyLevel?: number;
  sensations?: string[];
  insights?: string;
  techniquesUsed?: string[];
  toolsUsed?: string[];
  notes?: string;
  intention?: string;
  photoUrl?: string;
}

export interface update_energy_journal_input {
  id: string;
  userId: string;
  entryType?: energy_entry_type;
  title?: string;
  modality?: energy_modality;
  duration?: number;
  role?: session_role;
  bookingId?: string;
  practitionerName?: string;
  practitionerId?: string;
  clientInitials?: string;
  sessionNotes?: string;
  preSessionFeeling?: string;
  postSessionFeeling?: string;
  energyLevel?: number;
  sensations?: string[];
  insights?: string;
  techniquesUsed?: string[];
  toolsUsed?: string[];
  notes?: string;
  intention?: string;
  photoUrl?: string;
}

// Chakra Check-In inputs
export interface chakra_state_input {
  chakra: chakra_type;
  status: chakra_status;
  notes?: string;
}

export interface create_chakra_checkin_input {
  userId: string;
  date?: string;
  checkInTime?: string;
  chakras: chakra_state_input[];
  overallBalance?: number;
  dominantChakra?: chakra_type;
  weakestChakra?: chakra_type;
  physicalState?: string;
  emotionalState?: string;
  mentalState?: string;
  observations?: string;
  actionTaken?: string;
}

export interface update_chakra_checkin_input {
  id: string;
  userId: string;
  checkInTime?: string;
  chakras?: chakra_state_input[];
  overallBalance?: number;
  dominantChakra?: chakra_type;
  weakestChakra?: chakra_type;
  physicalState?: string;
  emotionalState?: string;
  mentalState?: string;
  observations?: string;
  actionTaken?: string;
}

// Session Reflection inputs
export interface create_session_reflection_input {
  userId: string;
  date?: string;
  practitionerName: string;
  modality?: energy_modality;
  sessionType?: string;
  duration?: number;
  bookingId?: string;
  practitionerId?: string;
  preSessionState?: string;
  duringSession?: string;
  postSessionState?: string;
  sensations?: string[];
  areasWorkedOn?: string[];
  messagesReceived?: string;
  aftercare?: string;
  personalNotes?: string;
  wouldRecommend?: boolean;
  overallRating?: number;
  shiftsNoticed?: string;
  followUpDate?: string;
  photoUrl?: string;
}

export interface update_session_reflection_input {
  id: string;
  userId: string;
  practitionerName?: string;
  modality?: energy_modality;
  sessionType?: string;
  duration?: number;
  bookingId?: string;
  practitionerId?: string;
  preSessionState?: string;
  duringSession?: string;
  postSessionState?: string;
  sensations?: string[];
  areasWorkedOn?: string[];
  messagesReceived?: string;
  aftercare?: string;
  personalNotes?: string;
  wouldRecommend?: boolean;
  overallRating?: number;
  shiftsNoticed?: string;
  followUpDate?: string;
  photoUrl?: string;
}

// Attunement inputs
export interface create_attunement_input {
  userId: string;
  date?: string;
  level: attunement_level;
  system: string;
  teacherName: string;
  teacherId?: string;
  lineage?: string;
  location?: string;
  format?: string;
  duration?: string;
  experience?: string;
  symbols?: string[];
  insights?: string;
  certificateUrl?: string;
  certificateNumber?: string;
  practiceNotes?: string;
  hoursLogged?: number;
}

export interface update_attunement_input {
  id: string;
  userId: string;
  level?: attunement_level;
  system?: string;
  teacherName?: string;
  teacherId?: string;
  lineage?: string;
  location?: string;
  format?: string;
  duration?: string;
  experience?: string;
  symbols?: string[];
  insights?: string;
  certificateUrl?: string;
  certificateNumber?: string;
  practiceNotes?: string;
  hoursLogged?: number;
}

// Protection Ritual inputs
export interface create_protection_ritual_input {
  userId: string;
  date?: string;
  protectionType: protection_type;
  technique?: string;
  duration?: number;
  reason?: string;
  location?: string;
  toolsUsed?: string[];
  invocations?: string[];
  sensations?: string;
  effectiveness?: number;
  notes?: string;
}

export interface update_protection_ritual_input {
  id: string;
  userId: string;
  protectionType?: protection_type;
  technique?: string;
  duration?: number;
  reason?: string;
  location?: string;
  toolsUsed?: string[];
  invocations?: string[];
  sensations?: string;
  effectiveness?: number;
  notes?: string;
}

// Aura Observation inputs
export interface aura_layer_observation_input {
  layer?: aura_layer;
  colors: aura_color[];
  intensity?: number;
  notes?: string;
}

export interface create_aura_observation_input {
  userId: string;
  date?: string;
  observationType: 'self' | 'other';
  subjectInitials?: string;
  primaryColors: aura_color[];
  secondaryColors?: aura_color[];
  layers?: aura_layer_observation_input[];
  overallHealth?: number;
  clarity?: number;
  size?: string;
  patterns?: string;
  anomalies?: string;
  messages?: string;
  observationMethod?: string;
  photoUrl?: string;
  notes?: string;
}

export interface update_aura_observation_input {
  id: string;
  userId: string;
  observationType?: 'self' | 'other';
  subjectInitials?: string;
  primaryColors?: aura_color[];
  secondaryColors?: aura_color[];
  layers?: aura_layer_observation_input[];
  overallHealth?: number;
  clarity?: number;
  size?: string;
  patterns?: string;
  anomalies?: string;
  messages?: string;
  observationMethod?: string;
  photoUrl?: string;
  notes?: string;
}

// ============================================
// Energy Healing Response Types
// ============================================

export interface energy_journal_response {
  success: boolean;
  message?: string;
  entry?: energy_journal_type;
}

export interface chakra_checkin_response {
  success: boolean;
  message?: string;
  checkin?: chakra_checkin_type;
}

export interface session_reflection_response {
  success: boolean;
  message?: string;
  reflection?: session_reflection_type;
}

export interface attunement_response {
  success: boolean;
  message?: string;
  attunement?: attunement_record_type;
}

export interface protection_ritual_response {
  success: boolean;
  message?: string;
  ritual?: protection_ritual_type;
}

export interface aura_observation_response {
  success: boolean;
  message?: string;
  observation?: aura_observation_type;
}

export interface delete_energy_response {
  success: boolean;
  message?: string;
}

// ============================================
// Energy Healing Filter Types
// ============================================

export interface energy_journal_filters {
  startDate?: string;
  endDate?: string;
  entryType?: energy_entry_type;
  modality?: energy_modality;
  role?: session_role;
  limit?: number;
  offset?: number;
}

export interface chakra_checkin_filters {
  startDate?: string;
  endDate?: string;
  chakra?: chakra_type;       // Filter by specific chakra
  status?: chakra_status;     // Filter by status
  limit?: number;
  offset?: number;
}

export interface session_reflection_filters {
  startDate?: string;
  endDate?: string;
  modality?: energy_modality;
  practitionerId?: string;
  minRating?: number;
  limit?: number;
  offset?: number;
}

export interface attunement_filters {
  system?: string;
  level?: attunement_level;
  limit?: number;
  offset?: number;
}

export interface protection_ritual_filters {
  startDate?: string;
  endDate?: string;
  protectionType?: protection_type;
  limit?: number;
  offset?: number;
}

export interface aura_observation_filters {
  startDate?: string;
  endDate?: string;
  observationType?: 'self' | 'other';
  primaryColor?: aura_color;
  limit?: number;
  offset?: number;
}

// ============================================
// Energy Healing Statistics
// ============================================

export interface chakra_trend {
  chakra: chakra_type;
  recentStatus: chakra_status;
  blockedCount: number;       // Times blocked in period
  openCount: number;          // Times open in period
  trend: 'improving' | 'declining' | 'stable';
}

export interface energy_stats {
  // Journal overview
  totalJournalEntries: number;
  entriesThisWeek: number;
  entriesThisMonth: number;

  // Entry type breakdown
  entryTypeBreakdown: { type: energy_entry_type; count: number }[];

  // Sessions
  sessionsGiven: number;
  sessionsReceived: number;

  // Chakra health
  chakraCheckinsCount: number;
  chakraTrends: chakra_trend[];
  mostBlockedChakra?: chakra_type;
  mostOpenChakra?: chakra_type;

  // Practice
  totalPracticeMinutes: number;
  averageSessionLength: number;
  practiceStreak: number;     // Consecutive days

  // Attunements
  attunementCount: number;
  highestLevel?: attunement_level;

  // Protection
  protectionRitualCount: number;

  // Aura
  auraObservationCount: number;
}
