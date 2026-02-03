import { recordref_type, RecordStatus } from "../0_shared/types";

// Practitioner Insights Types
// Stored in Main-PersonalSpace with userId as partition key
// Allows verified practitioners to add insights/tips about crystals

export const PERSONAL_SPACE_CONTAINER = "Main-PersonalSpace";
export const PRACTITIONER_INSIGHT_DOC_TYPE = "PRACTITIONER_INSIGHT";

// Enum for insight types
export type insight_type =
  | "usage_tip"        // How to use the crystal effectively
  | "pairing"          // What crystals work well together
  | "personal_experience" // Personal story or experience
  | "warning"          // Cautions or things to be aware of
  | "alternative_use"; // Non-traditional or creative uses

// Enum for insight moderation status (named to avoid conflict with RecordStatus)
export type insight_status =
  | "pending"   // Awaiting moderation
  | "approved"  // Approved by moderator
  | "flagged"   // Flagged for review
  | "removed";  // Removed by moderator

// Main Practitioner Insight Type
export type practitioner_insight_type = {
  // Identity
  id: string;
  userId: string; // Partition key - the practitioner who created the insight
  docType: "PRACTITIONER_INSIGHT";

  // Crystal Reference
  crystalId: string; // Links to crystal reference database

  // Insight Details
  practitionerId: string; // Same as userId, for clarity in queries
  insightType: insight_type;
  content: string; // The actual insight text

  // Community Engagement
  agreeCount: number; // Number of practitioners who agree
  agreedBy: string[]; // Array of practitioner IDs who agreed

  // Moderation
  insightStatus: insight_status;
  reportCount: number;
  reportedBy?: string[]; // Optional: track who reported (for moderation)
  moderationNotes?: string; // Optional: notes from moderator
  moderatedBy?: string; // ID of moderator who took action
  moderatedAt?: string; // When moderation action was taken

  // Metadata
  ref?: recordref_type;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
};

// Input type for creating an insight
export type create_practitioner_insight_input = {
  userId: string;
  crystalId: string;
  insightType: insight_type;
  content: string;
};

// Input type for updating an insight
export type update_practitioner_insight_input = {
  id: string;
  userId: string;
  insightType?: insight_type;
  content?: string;
};

// Filter types for queries
export type practitioner_insight_filters = {
  crystalId?: string;
  insightType?: insight_type;
  insightStatus?: insight_status;
  limit?: number;
  offset?: number;
};

// Input for agreeing with an insight
export type agree_with_insight_input = {
  insightId: string;
  insightOwnerId: string; // The userId partition of the insight
};

// Input for reporting an insight
export type report_insight_input = {
  insightId: string;
  insightOwnerId: string; // The userId partition of the insight
  reason?: string;
};

// Input for moderating an insight
export type moderate_insight_input = {
  insightId: string;
  insightOwnerId: string; // The userId partition of the insight
  newStatus: insight_status;
  moderationNotes?: string;
};

// Response types
export type practitioner_insight_response = {
  success: boolean;
  message?: string;
  insight?: practitioner_insight_type;
};

export type practitioner_insight_list_response = {
  insights: practitioner_insight_type[];
  totalCount: number;
};

export type agree_insight_response = {
  success: boolean;
  message?: string;
  insight?: practitioner_insight_type;
  alreadyAgreed?: boolean;
};

export type report_insight_response = {
  success: boolean;
  message?: string;
  alreadyReported?: boolean;
};

export type moderate_insight_response = {
  success: boolean;
  message?: string;
  insight?: practitioner_insight_type;
};
