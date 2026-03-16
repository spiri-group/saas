import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

type MediaFile = {
    name: string;
    url: string;
    urlRelative: string;
    size: string;
    type: string;
    code: string;
    sizeBytes?: number;
    durationSeconds?: number;
};

export type PractitionerService = {
    id: string;
    name: string;
    category: string;
    deliveryMode: string;
    consultationType?: string;
    description: string;
    thumbnail?: {
        image?: {
            media?: MediaFile;
            zoom?: number;
            objectFit?: string;
        };
        dynamicMode?: {
            type: string;
            video?: {
                media?: MediaFile;
                autoplay?: boolean;
                muted?: boolean;
            };
            collage?: {
                images: MediaFile[];
                transitionDuration?: number;
                crossFade?: boolean;
            };
        };
        stamp?: {
            text: string;
            enabled: boolean;
            bgColor: string;
            textColor: string;
        };
        bgColor?: string;
        panelTone?: string;
        title?: {
            content?: string;
        };
        moreInfo?: {
            content?: string;
        };
    };
    pricing?: {
        type: string;
        fixedPrice?: {
            amount: number;
            currency: string;
        };
    };
    duration?: {
        amount: number;
        unit: { id: string; defaultLabel: string };
    };
    scheduleConfig?: {
        useAllSlots: boolean;
        selectedSlotIds?: string[];
        bufferMinutes: number;
    };
    turnaroundDays?: number;
    bookingType?: string;
    deliveryFormats?: { format: string }[];
    targetTimezones?: string[];
    questionnaire?: {
        id: string;
        question: string;
        type: string;
        required: boolean;
        options?: string[];
        description?: string;
        scaleMax?: number;
    }[];
    readingOptions?: {
        readingType?: string;
        includePullCardSummary?: boolean;
        includeVoiceNote?: boolean;
        deckUsed?: string;
        availableTopics?: string;
        astrologyReadingTypes?: string[];
        houseSystem?: string;
        requiresBirthTime?: boolean;
        focusAreas?: string;
        customReadingDetails?: string;
    };
    healingOptions?: {
        modalities?: string[];
    };
    coachingOptions?: {
        specialties?: string[];
    };
};

const usePractitionerServices = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-services', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                services: PractitionerService[];
            }>(`
                query GetPractitionerServices($merchantId: ID!) {
                    services(merchantId: $merchantId) {
                        id
                        name
                        category
                        deliveryMode
                        consultationType
                        description
                        thumbnail {
                            image {
                                media {
                                    name
                                    url
                                    urlRelative
                                    size
                                    type
                                    code
                                    sizeBytes
                                    durationSeconds
                                }
                                zoom
                                objectFit
                            }
                            dynamicMode {
                                type
                                video {
                                    media {
                                        name
                                        url
                                        urlRelative
                                        size
                                        type
                                        code
                                        sizeBytes
                                        durationSeconds
                                    }
                                    autoplay
                                    muted
                                }
                                collage {
                                    images {
                                        name
                                        url
                                        urlRelative
                                        size
                                        type
                                        code
                                        sizeBytes
                                        durationSeconds
                                    }
                                    transitionDuration
                                    crossFade
                                }
                            }
                            stamp {
                                text
                                enabled
                                bgColor
                                textColor
                            }
                            bgColor
                            panelTone
                            title {
                                content
                            }
                            moreInfo {
                                content
                            }
                        }
                        pricing {
                            type
                            fixedPrice {
                                amount
                                currency
                            }
                        }
                        duration {
                            amount
                            unit {
                                id
                                defaultLabel
                            }
                        }
                        scheduleConfig {
                            useAllSlots
                            selectedSlotIds
                            bufferMinutes
                        }
                        turnaroundDays
                        bookingType
                        deliveryFormats {
                            format
                        }
                        targetTimezones
                        questionnaire {
                            id
                            question
                            type
                            required
                            options
                            description
                            scaleMax
                        }
                        readingOptions {
                            readingType
                            includePullCardSummary
                            includeVoiceNote
                            deckUsed
                            availableTopics
                            astrologyReadingTypes
                            houseSystem
                            requiresBirthTime
                            focusAreas
                            customReadingDetails
                        }
                        healingOptions {
                            modalities
                        }
                        coachingOptions {
                            specialties
                        }
                    }
                }
            `, { merchantId: practitionerId });

            // Filter out null entries and legacy "Working days" records
            return (response?.services || []).filter(
                (s) => s != null && s.name !== 'Working days'
            );
        },
        enabled: !!practitionerId,
    });
};

export default usePractitionerServices;
