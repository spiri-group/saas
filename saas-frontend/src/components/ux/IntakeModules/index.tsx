/**
 * Intake Modules - Pre-built questionnaire components for spiritual services
 *
 * These modules provide specialized data collection for common spiritual service needs.
 * Practitioners can add these modules to their service questionnaires alongside custom questions.
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

// Module metadata for UI
export const INTAKE_MODULES: Array<{
    type: IntakeModuleType;
    label: string;
    description: string;
    icon: string;
    category: "READING" | "HEALING" | "COACHING" | "ALL";
    implemented: boolean;
}> = [
    {
        type: "BIRTH_CHART",
        label: "Birth Chart",
        description: "Collect birth date, time, and location for natal chart readings",
        icon: "Star",
        category: "READING",
        implemented: true,
    },
    {
        type: "CURRENT_LOCATION",
        label: "Current Location",
        description: "Collect client's current city/country for distance energy work",
        icon: "MapPin",
        category: "HEALING",
        implemented: false,
    },
    {
        type: "PHOTO_UPLOAD",
        label: "Photo Upload",
        description: "Allow clients to upload a photo for aura or photo readings",
        icon: "Camera",
        category: "READING",
        implemented: false,
    },
    {
        type: "RELATIONSHIP_INFO",
        label: "Relationship Info",
        description: "Collect partner's birth data for synastry/compatibility readings",
        icon: "Heart",
        category: "READING",
        implemented: false,
    },
    {
        type: "HEALTH_INTAKE",
        label: "Health Intake",
        description: "Collect health concerns and relevant medical info for healing sessions",
        icon: "Activity",
        category: "HEALING",
        implemented: false,
    },
    {
        type: "SPIRITUAL_BACKGROUND",
        label: "Spiritual Background",
        description: "Collect experience level and spiritual practices for coaching",
        icon: "Sparkles",
        category: "COACHING",
        implemented: false,
    },
    {
        type: "DECK_PREFERENCE",
        label: "Deck Preference",
        description: "Let clients choose their preferred tarot or oracle deck",
        icon: "Layers",
        category: "READING",
        implemented: false,
    },
];

/**
 * Get modules available for a service category
 */
export function getModulesForCategory(category?: "READING" | "HEALING" | "COACHING"): typeof INTAKE_MODULES {
    if (!category) return INTAKE_MODULES;
    return INTAKE_MODULES.filter(m => m.category === category || m.category === "ALL");
}

/**
 * Get implemented modules only
 */
export function getImplementedModules(): typeof INTAKE_MODULES {
    return INTAKE_MODULES.filter(m => m.implemented);
}
