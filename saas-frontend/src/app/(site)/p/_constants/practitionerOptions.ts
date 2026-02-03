// Modality options for practitioners
export const MODALITIES = [
    { value: 'TAROT', label: 'Tarot' },
    { value: 'ORACLE', label: 'Oracle Cards' },
    { value: 'ASTROLOGY', label: 'Astrology' },
    { value: 'NUMEROLOGY', label: 'Numerology' },
    { value: 'MEDIUMSHIP', label: 'Mediumship' },
    { value: 'CHANNELING', label: 'Channeling' },
    { value: 'REIKI', label: 'Reiki' },
    { value: 'ENERGY_HEALING', label: 'Energy Healing' },
    { value: 'CRYSTAL_HEALING', label: 'Crystal Healing' },
    { value: 'AKASHIC_RECORDS', label: 'Akashic Records' },
    { value: 'PAST_LIFE', label: 'Past Life Reading' },
    { value: 'BREATHWORK', label: 'Breathwork' },
    { value: 'SOUND_HEALING', label: 'Sound Healing' },
    { value: 'COACHING', label: 'Spiritual Coaching' },
    { value: 'COUNSELING', label: 'Counseling' },
    { value: 'OTHER', label: 'Other' },
] as const;

// Specialization options for practitioners
export const SPECIALIZATIONS = [
    { value: 'GRIEF_LOSS', label: 'Grief & Loss' },
    { value: 'RELATIONSHIPS', label: 'Relationships' },
    { value: 'CAREER', label: 'Career' },
    { value: 'LIFE_PURPOSE', label: 'Life Purpose' },
    { value: 'SPIRITUAL_AWAKENING', label: 'Spiritual Awakening' },
    { value: 'ANCESTRAL_HEALING', label: 'Ancestral Healing' },
    { value: 'SHADOW_WORK', label: 'Shadow Work' },
    { value: 'SELF_DISCOVERY', label: 'Self Discovery' },
    { value: 'DECISION_MAKING', label: 'Decision Making' },
    { value: 'HEALTH_WELLNESS', label: 'Health & Wellness' },
    { value: 'PAST_LIVES', label: 'Past Lives' },
    { value: 'SPIRIT_COMMUNICATION', label: 'Spirit Communication' },
    { value: 'OTHER', label: 'Other' },
] as const;

// Type helpers
export type ModalityValue = typeof MODALITIES[number]['value'];
export type SpecializationValue = typeof SPECIALIZATIONS[number]['value'];

// Label lookup functions
export const getModalityLabel = (value: string): string => {
    const modality = MODALITIES.find(m => m.value === value);
    return modality?.label || value;
};

export const getSpecializationLabel = (value: string): string => {
    const spec = SPECIALIZATIONS.find(s => s.value === value);
    return spec?.label || value;
};
