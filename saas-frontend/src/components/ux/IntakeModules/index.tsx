/**
 * Intake Modules - Pre-built questionnaire templates for spiritual services
 *
 * These modules provide prefilled question sets that practitioners can add
 * to their service questionnaires alongside custom questions.
 */

export { default as BirthChartModule, defaultBirthChartData, validateBirthChartData } from './BirthChartModule';
export type { BirthChartData } from './BirthChartModule';

// Module type definitions
export type IntakeModuleType =
    | "BIRTH_CHART"
    | "CURRENT_LOCATION"
    | "PHOTO_UPLOAD"
    | "RELATIONSHIP_INFO"
    | "HEALTH_INTAKE"
    | "SPIRITUAL_BACKGROUND"
    | "DECK_PREFERENCE";

export type IntakeModule = {
    id: string;
    type: IntakeModuleType;
    enabled: boolean;
    data?: any;
};

// Prefill question shape (matches QuestionBuilder's Question type)
export type PrefillQuestion = {
    type: "SHORT_TEXT" | "LONG_TEXT" | "MULTIPLE_CHOICE" | "CHECKBOXES" | "DROPDOWN" | "DATE" | "NUMBER" | "EMAIL" | "RATING" | "LINEAR_SCALE" | "YES_NO" | "PHONE" | "TIME";
    question: string;
    description?: string;
    required: boolean;
    options?: Array<{ id: string; label: string }>;
    scaleMax?: number;
};

// Module metadata for UI
export const INTAKE_MODULES: Array<{
    type: IntakeModuleType;
    label: string;
    description: string;
    icon: string;
    readingTypes: string[]; // Which reading types this module applies to
    prefillQuestions: PrefillQuestion[];
    implemented: boolean;
}> = [
    {
        type: "BIRTH_CHART",
        label: "Birth Chart",
        description: "Collect birth date, time, and location for natal chart readings",
        icon: "Star",
        readingTypes: ["Astrology"],
        prefillQuestions: [
            {
                type: "DATE",
                question: "Date of Birth",
                description: "Your birth date is essential for creating an accurate natal chart reading.",
                required: true,
            },
            {
                type: "SHORT_TEXT",
                question: "Time of Birth",
                description: "If you know the exact time, your reading will include Rising Sign and house placements. Leave blank if unknown.",
                required: false,
            },
            {
                type: "SHORT_TEXT",
                question: "Place of Birth",
                description: "Enter the city and country where you were born (e.g., Los Angeles, USA).",
                required: true,
            },
        ],
        implemented: true,
    },
    {
        type: "DECK_PREFERENCE",
        label: "Deck Preference",
        description: "Let clients choose their preferred tarot or oracle deck",
        icon: "Layers",
        readingTypes: ["Tarot", "Oracle"],
        prefillQuestions: [
            {
                type: "SHORT_TEXT",
                question: "Preferred Deck",
                description: "Do you have a preferred tarot or oracle deck? If so, which one?",
                required: false,
            },
        ],
        implemented: true,
    },
    {
        type: "RELATIONSHIP_INFO",
        label: "Relationship Info",
        description: "Collect partner's birth data for synastry/compatibility readings",
        icon: "Heart",
        readingTypes: ["Astrology"],
        prefillQuestions: [
            {
                type: "SHORT_TEXT",
                question: "Partner's Name",
                description: "The name of the person you'd like a compatibility reading with.",
                required: true,
            },
            {
                type: "DATE",
                question: "Partner's Date of Birth",
                description: "Their birth date for synastry chart calculation.",
                required: true,
            },
            {
                type: "SHORT_TEXT",
                question: "Partner's Place of Birth",
                description: "City and country (e.g., London, UK).",
                required: false,
            },
        ],
        implemented: true,
    },
    {
        type: "SPIRITUAL_BACKGROUND",
        label: "Spiritual Background",
        description: "Collect experience level and spiritual practices",
        icon: "Sparkles",
        readingTypes: ["Tarot", "Oracle", "Astrology", "Psychic", "Mediumship", "Other"],
        prefillQuestions: [
            {
                type: "DROPDOWN",
                question: "Experience with Spiritual Services",
                description: "This helps the practitioner tailor their approach.",
                required: false,
                options: [
                    { id: "exp_1", label: "First time" },
                    { id: "exp_2", label: "A few sessions" },
                    { id: "exp_3", label: "Regular client" },
                    { id: "exp_4", label: "Experienced practitioner myself" },
                ],
            },
            {
                type: "LONG_TEXT",
                question: "What are you hoping to gain from this session?",
                description: "Share any intentions, areas of focus, or questions you have in mind.",
                required: false,
            },
        ],
        implemented: true,
    },
    {
        type: "CURRENT_LOCATION",
        label: "Current Location",
        description: "Collect client's current city/country for distance energy work",
        icon: "MapPin",
        readingTypes: ["Psychic", "Mediumship", "Other"],
        prefillQuestions: [
            {
                type: "SHORT_TEXT",
                question: "Current Location",
                description: "Your current city and country for distance energy work.",
                required: false,
            },
        ],
        implemented: true,
    },
    {
        type: "PHOTO_UPLOAD",
        label: "Photo Upload",
        description: "Allow clients to upload a photo for aura or photo readings",
        icon: "Camera",
        readingTypes: ["Psychic"],
        prefillQuestions: [],
        implemented: false,
    },
    {
        type: "HEALTH_INTAKE",
        label: "Health Intake",
        description: "Collect health concerns and relevant info for healing sessions",
        icon: "Activity",
        readingTypes: [],
        prefillQuestions: [],
        implemented: false,
    },
];

/**
 * Get implemented modules available for a specific reading type
 */
export function getModulesForReadingType(readingType?: string): typeof INTAKE_MODULES {
    return INTAKE_MODULES.filter(m =>
        m.implemented &&
        m.prefillQuestions.length > 0 &&
        (!readingType || m.readingTypes.includes(readingType))
    );
}

/**
 * Get modules available for a service category
 */
export function getModulesForCategory(category?: "READING" | "HEALING" | "COACHING"): typeof INTAKE_MODULES {
    if (!category) return INTAKE_MODULES;
    const categoryMap: Record<string, string[]> = {
        READING: ["Tarot", "Oracle", "Astrology", "Psychic", "Mediumship"],
        HEALING: [],
        COACHING: [],
    };
    const types = categoryMap[category] || [];
    return INTAKE_MODULES.filter(m => m.implemented && m.readingTypes.some(t => types.includes(t)));
}

/**
 * Get implemented modules only
 */
export function getImplementedModules(): typeof INTAKE_MODULES {
    return INTAKE_MODULES.filter(m => m.implemented);
}
