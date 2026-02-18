'use client';

import UseUserProfile from '@/hooks/user/UseUserProfile';

type VocabKey = 'speaks_to_your' | 'spirit_messages' | 'record_spirit_message' | 'space_description' | 'journey_starts_here' | 'journey_nudge';

const STANDARD: Record<VocabKey, string> = {
    speaks_to_your: 'What speaks to your spirit?',
    spirit_messages: 'Spirit Messages',
    record_spirit_message: 'Record Spirit Message',
    space_description: 'Your sacred digital space for spiritual growth and exploration.',
    journey_starts_here: 'Your journey starts here',
    journey_nudge: 'Try one of the quick actions above and we\u2019ll light up your recent activity as you go.',
};

const FAITH: Record<VocabKey, string> = {
    speaks_to_your: 'What speaks to your heart?',
    spirit_messages: 'Divine Messages',
    record_spirit_message: 'Record Divine Message',
    space_description: 'Your sacred space for faith, prayer, and devotion.',
    journey_starts_here: 'Your faith journey starts here',
    journey_nudge: 'Try one of the quick actions above to begin building your daily practice.',
};

export function useVocab(userId: string) {
    const { data: user } = UseUserProfile(userId);

    const isFaithAligned = !!(user?.religion?.id && user?.openToOtherExperiences === false);
    const dict = isFaithAligned ? FAITH : STANDARD;

    return {
        vocab: (key: VocabKey) => dict[key],
        isFaithAligned,
    };
}
