import { Migration } from "../types";

// ── Constants ──────────────────────────────────────────────────────────────────

const EMPTY_MEDIA = {
    name: "",
    url: "",
    urlRelative: "",
    size: "SQUARE" as const,
    type: "IMAGE" as const,
    code: "",
};

const EMPTY_PHONE = { raw: "", displayAs: "", value: "" };

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSubscription(tier: string, monthlyPriceCents: number) {
    return {
        subscriptionTier: tier,
        billingInterval: "monthly",
        billingStatus: "active",
        cumulativePayouts: 0,
        subscriptionCostThreshold: monthlyPriceCents,
        failedPaymentAttempts: 0,
        card_status: "not_saved",
        payment_status: "not_attempted",
        waived: true,
        overrideNotes: "Demo account - subscription waived",
    };
}

function makeService(opts: {
    id: string;
    vendorId: string;
    name: string;
    slug: string;
    description: string;
    category: "READING" | "HEALING" | "COACHING";
    deliveryMode: "ASYNC" | "SYNC";
    bookingType: "ASAP" | "SCHEDULED";
    priceCents: number;
    turnaroundDays?: number;
    displayScore: number;
}) {
    return {
        id: opts.id,
        slug: opts.slug,
        type: "SERVICE",
        vendorId: opts.vendorId,
        name: opts.name,
        description: opts.description,
        terms: "",
        faq: [],
        thumbnail: { image: { media: EMPTY_MEDIA, zoom: 1, objectFit: "cover" } },
        ref: {
            id: opts.id,
            partition: [opts.vendorId],
            container: "Main-Listing",
        },
        stripe: { tax_code: "txcd_10000000" },
        displayScore: opts.displayScore,
        skus: [
            {
                id: `${opts.id}-sku`,
                price: { amount: opts.priceCents, currency: "AUD" },
                qty: "999",
            },
        ],
        category: opts.category,
        deliveryMode: opts.deliveryMode,
        bookingType: opts.bookingType,
        pricing: {
            type: "FIXED" as const,
            fixedPrice: { amount: opts.priceCents, currency: "AUD" },
        },
        ...(opts.turnaroundDays != null ? { turnaroundDays: opts.turnaroundDays } : {}),
        deliveryFormats: opts.deliveryMode === "ASYNC" ? [{ format: "PDF" }] : [],
        addOns: [],
        questionnaire: [],
        targetTimezones: [],
    };
}

// ── Tier IDs ───────────────────────────────────────────────────────────────────

const tiers = ["awaken", "illuminate", "manifest", "transcend"] as const;

function userId(tier: string) { return `demo-user-${tier}`; }
function vendorId(tier: string) { return `demo-vendor-${tier}`; }
function svcId(tier: string, n: number) { return `demo-svc-${tier}-${n}`; }

// ── Migration ──────────────────────────────────────────────────────────────────

export const migration: Migration = {
    id: "050_seed_demo_accounts",
    description: "Seeds demo accounts for all 4 subscription tiers with realistic profiles and services",

    async up(context) {
        const now = new Date().toISOString();

        // ════════════════════════════════════════════════════════════════════
        // 1. AWAKEN - Celeste Ravenwood (Practitioner)
        // ════════════════════════════════════════════════════════════════════

        const awakenUser = {
            id: userId("awaken"),
            email: "awaken@spirigroup.com",
            firstname: "Celeste",
            lastname: "Ravenwood",
            name: "Celeste Ravenwood",
            requiresSetup: false,
            requiresInput: false,
            vendors: [{ id: vendorId("awaken"), role: "ADMIN" }],
            ref: { id: userId("awaken"), partition: [userId("awaken")], container: "Main-User" },
        };

        const awakenVendor = {
            id: vendorId("awaken"),
            name: "Celeste Ravenwood",
            slug: "celeste-ravenwood",
            docType: "PRACTITIONER",
            publishedAt: now,
            followerCount: 0,
            intro: "Intuitive tarot and oracle reader helping you find clarity through the cards.",
            contact: {
                internal: { email: "awaken@spirigroup.com", phoneNumber: EMPTY_PHONE },
                public: { email: "awaken@spirigroup.com", phoneNumber: EMPTY_PHONE },
            },
            currency: "AUD",
            country: "AU",
            address: "",
            website: "",
            logo: EMPTY_MEDIA,
            banner: EMPTY_MEDIA,
            colors: {
                primary: { background: "#2D1B4E", foreground: "#F5E6D3" },
                links: "#9B72CF",
            },
            social: { style: "icons", platforms: [] },
            locations: [],
            teamMembers: [],
            customers: [],
            descriptions: [],
            reviews: [],
            socialPosts: [],
            ref: { id: vendorId("awaken"), partition: [vendorId("awaken")], container: "Main-Vendor" },
            subscription: makeSubscription("awaken", 1600),
            practitioner: {
                headline: "Intuitive Tarot & Oracle Reader",
                bio: "With over 8 years of experience reading the cards, I bring intuitive guidance to help you navigate life's crossroads. My readings blend traditional tarot wisdom with deep intuitive insight, offering clarity on relationships, decisions, and your path of self-discovery.",
                modalities: ["TAROT", "ORACLE"],
                specializations: ["RELATIONSHIPS", "DECISION_MAKING", "SELF_DISCOVERY"],
                yearsExperience: 8,
                readingStyle: "INTUITIVE",
                approach: "I connect with your energy through the cards, allowing the messages to flow naturally. Each reading is a sacred conversation between you, the cards, and spirit.",
                whatToExpect: "A detailed written reading delivered as a PDF with card images, interpretations, and actionable guidance.",
                availability: "ACCEPTING_CLIENTS",
                acceptingNewClients: true,
                responseTime: "Within 3 business days",
                training: [],
                verification: { isVerified: false },
            },
        };

        const awakenServices = [
            makeService({
                id: svcId("awaken", 1),
                vendorId: vendorId("awaken"),
                name: "Three-Card Clarity Reading",
                slug: "three-card-clarity-reading",
                description: "A focused three-card spread exploring your past influences, present situation, and future potential. Perfect for quick guidance on a specific question or area of life.",
                category: "READING",
                deliveryMode: "ASYNC",
                bookingType: "ASAP",
                priceCents: 3500,
                turnaroundDays: 3,
                displayScore: 0.85,
            }),
            makeService({
                id: svcId("awaken", 2),
                vendorId: vendorId("awaken"),
                name: "Deep Dive Celtic Cross Reading",
                slug: "deep-dive-celtic-cross-reading",
                description: "A comprehensive ten-card Celtic Cross spread providing deep insight into your situation, challenges, influences, hopes, and likely outcomes. Includes detailed written interpretation with card imagery.",
                category: "READING",
                deliveryMode: "ASYNC",
                bookingType: "ASAP",
                priceCents: 8500,
                turnaroundDays: 5,
                displayScore: 0.80,
            }),
        ];

        // ════════════════════════════════════════════════════════════════════
        // 2. ILLUMINATE - Jasper Thornfield (Practitioner)
        // ════════════════════════════════════════════════════════════════════

        const illuminateUser = {
            id: userId("illuminate"),
            email: "illuminate@spirigroup.com",
            firstname: "Jasper",
            lastname: "Thornfield",
            name: "Jasper Thornfield",
            requiresSetup: false,
            requiresInput: false,
            vendors: [{ id: vendorId("illuminate"), role: "ADMIN" }],
            ref: { id: userId("illuminate"), partition: [userId("illuminate")], container: "Main-User" },
        };

        const illuminateVendor = {
            id: vendorId("illuminate"),
            name: "Jasper Thornfield",
            slug: "jasper-thornfield",
            docType: "PRACTITIONER",
            publishedAt: now,
            followerCount: 0,
            intro: "Reiki master and energy healer specializing in distance healing, crystal therapy, and ancestral lineage work.",
            contact: {
                internal: { email: "illuminate@spirigroup.com", phoneNumber: EMPTY_PHONE },
                public: { email: "illuminate@spirigroup.com", phoneNumber: EMPTY_PHONE },
            },
            currency: "AUD",
            country: "AU",
            address: "",
            website: "",
            logo: EMPTY_MEDIA,
            banner: EMPTY_MEDIA,
            colors: {
                primary: { background: "#1A3A2A", foreground: "#E8F0E4" },
                links: "#6BAF7D",
            },
            social: { style: "icons", platforms: [] },
            locations: [],
            teamMembers: [],
            customers: [],
            descriptions: [],
            reviews: [],
            socialPosts: [],
            ref: { id: vendorId("illuminate"), partition: [vendorId("illuminate")], container: "Main-Vendor" },
            subscription: makeSubscription("illuminate", 2900),
            practitioner: {
                headline: "Reiki Master & Energy Healer",
                bio: "For over 12 years, I have dedicated my practice to the art of energy healing. As a certified Reiki Master and crystal healing practitioner, I work with subtle energies to restore balance, release blockages, and support your body's natural healing process. My approach integrates Reiki, crystal therapy, and sound healing to create deeply transformative sessions.",
                modalities: ["REIKI", "ENERGY_HEALING", "CRYSTAL_HEALING", "SOUND_HEALING"],
                specializations: ["HEALTH_WELLNESS", "SPIRITUAL_AWAKENING", "ANCESTRAL_HEALING", "GRIEF_LOSS"],
                yearsExperience: 12,
                readingStyle: "GENTLE",
                approach: "I create a safe, nurturing space for healing to unfold. Each session begins with an energy scan to identify areas of imbalance, followed by targeted healing work using the modalities best suited to your needs.",
                whatToExpect: "A detailed energy report after each session, including areas addressed, insights received, and recommendations for continued self-care.",
                availability: "ACCEPTING_CLIENTS",
                acceptingNewClients: true,
                responseTime: "Within 2 business days",
                training: [],
                verification: { isVerified: false },
            },
        };

        const illuminateServices = [
            makeService({
                id: svcId("illuminate", 1),
                vendorId: vendorId("illuminate"),
                name: "Distance Reiki Healing Session",
                slug: "distance-reiki-healing-session",
                description: "A full distance Reiki session channeling universal life force energy to support your healing. Includes a post-session energy report with insights and self-care recommendations.",
                category: "HEALING",
                deliveryMode: "ASYNC",
                bookingType: "ASAP",
                priceCents: 6500,
                turnaroundDays: 2,
                displayScore: 0.90,
            }),
            makeService({
                id: svcId("illuminate", 2),
                vendorId: vendorId("illuminate"),
                name: "Crystal-Enhanced Energy Clearing",
                slug: "crystal-enhanced-energy-clearing",
                description: "A deep energy clearing session combining Reiki with crystal healing to release stagnant energy, clear blockages, and restore your energetic field to its natural state of flow.",
                category: "HEALING",
                deliveryMode: "ASYNC",
                bookingType: "ASAP",
                priceCents: 9500,
                turnaroundDays: 3,
                displayScore: 0.85,
            }),
            makeService({
                id: svcId("illuminate", 3),
                vendorId: vendorId("illuminate"),
                name: "Ancestral Lineage Healing",
                slug: "ancestral-lineage-healing",
                description: "A powerful healing session working with ancestral energies to identify and release inherited patterns, traumas, and blockages. Includes a detailed ancestral energy report and integration guidance.",
                category: "HEALING",
                deliveryMode: "ASYNC",
                bookingType: "ASAP",
                priceCents: 14500,
                turnaroundDays: 5,
                displayScore: 0.80,
            }),
        ];

        // ════════════════════════════════════════════════════════════════════
        // 3. MANIFEST - The Sacred Ember (Merchant)
        // ════════════════════════════════════════════════════════════════════

        const manifestUser = {
            id: userId("manifest"),
            email: "manifest@spirigroup.com",
            firstname: "Arianna",
            lastname: "Whitmore",
            name: "Arianna Whitmore",
            requiresSetup: false,
            requiresInput: false,
            vendors: [{ id: vendorId("manifest"), role: "ADMIN" }],
            ref: { id: userId("manifest"), partition: [userId("manifest")], container: "Main-User" },
        };

        const manifestVendor = {
            id: vendorId("manifest"),
            name: "The Sacred Ember",
            slug: "the-sacred-ember",
            docType: "MERCHANT",
            publishedAt: now,
            followerCount: 0,
            intro: "Handcrafted spiritual tools, ethically sourced crystals, and ritual supplies for the modern practitioner.",
            contact: {
                internal: { email: "manifest@spirigroup.com", phoneNumber: EMPTY_PHONE },
                public: { email: "manifest@spirigroup.com", phoneNumber: EMPTY_PHONE },
            },
            currency: "AUD",
            country: "AU",
            address: "",
            website: "",
            logo: EMPTY_MEDIA,
            banner: EMPTY_MEDIA,
            colors: {
                primary: { background: "#3B1A0A", foreground: "#FFF4E6" },
                links: "#D4853B",
            },
            social: { style: "icons", platforms: [] },
            locations: [],
            teamMembers: [],
            customers: [],
            descriptions: [
                {
                    id: "demo-manifest-desc-1",
                    title: "Our Story",
                    body: "The Sacred Ember was born from a deep love of spiritual craft and a commitment to ethical sourcing. Every crystal, candle, and ritual tool in our collection is carefully selected or handcrafted to support your spiritual practice. We believe that the tools you use in your sacred work should carry the highest vibration possible.",
                    supporting_images: [],
                },
            ],
            reviews: [],
            socialPosts: [],
            ref: { id: vendorId("manifest"), partition: [vendorId("manifest")], container: "Main-Vendor" },
            subscription: makeSubscription("manifest", 3900),
        };

        const manifestServices = [
            makeService({
                id: svcId("manifest", 1),
                vendorId: vendorId("manifest"),
                name: "Personal Crystal Prescription",
                slug: "personal-crystal-prescription",
                description: "Receive a personalised crystal recommendation based on your current intentions, challenges, and energy. Includes a detailed guide on how to work with your prescribed crystals for maximum benefit.",
                category: "HEALING",
                deliveryMode: "ASYNC",
                bookingType: "ASAP",
                priceCents: 4500,
                turnaroundDays: 3,
                displayScore: 0.90,
            }),
            makeService({
                id: svcId("manifest", 2),
                vendorId: vendorId("manifest"),
                name: "Custom Ritual Candle Consultation",
                slug: "custom-ritual-candle-consultation",
                description: "A one-on-one consultation to design a custom ritual candle aligned with your specific intentions. Includes colour, herb, crystal, and essential oil recommendations for your candle.",
                category: "COACHING",
                deliveryMode: "ASYNC",
                bookingType: "ASAP",
                priceCents: 5500,
                turnaroundDays: 4,
                displayScore: 0.85,
            }),
            makeService({
                id: svcId("manifest", 3),
                vendorId: vendorId("manifest"),
                name: "Beginner's Altar Setup Guide",
                slug: "beginners-altar-setup-guide",
                description: "A comprehensive personalised guide to creating your first sacred altar space. Covers placement, essential items, cleansing rituals, and how to maintain your altar for ongoing spiritual practice.",
                category: "COACHING",
                deliveryMode: "ASYNC",
                bookingType: "ASAP",
                priceCents: 3000,
                turnaroundDays: 2,
                displayScore: 0.80,
            }),
            makeService({
                id: svcId("manifest", 4),
                vendorId: vendorId("manifest"),
                name: "Seasonal Ritual Planning Session",
                slug: "seasonal-ritual-planning-session",
                description: "A personalised ritual plan aligned with the current season, lunar cycle, and your spiritual goals. Receive detailed instructions for ceremonies, meditations, and altar arrangements for the coming season.",
                category: "COACHING",
                deliveryMode: "ASYNC",
                bookingType: "ASAP",
                priceCents: 7000,
                turnaroundDays: 5,
                displayScore: 0.75,
            }),
        ];

        // ════════════════════════════════════════════════════════════════════
        // 4. TRANSCEND - Spiritweave Collective (Merchant)
        // ════════════════════════════════════════════════════════════════════

        const transcendUser = {
            id: userId("transcend"),
            email: "transcend@spirigroup.com",
            firstname: "Morgan",
            lastname: "Ashcroft",
            name: "Morgan Ashcroft",
            requiresSetup: false,
            requiresInput: false,
            vendors: [{ id: vendorId("transcend"), role: "ADMIN" }],
            ref: { id: userId("transcend"), partition: [userId("transcend")], container: "Main-User" },
        };

        const transcendVendor = {
            id: vendorId("transcend"),
            name: "Spiritweave Collective",
            slug: "spiritweave-collective",
            docType: "MERCHANT",
            publishedAt: now,
            followerCount: 0,
            intro: "A curated marketplace and community hub for spiritual practitioners and seekers.",
            contact: {
                internal: { email: "transcend@spirigroup.com", phoneNumber: EMPTY_PHONE },
                public: { email: "transcend@spirigroup.com", phoneNumber: EMPTY_PHONE },
            },
            currency: "AUD",
            country: "AU",
            address: "",
            website: "",
            logo: EMPTY_MEDIA,
            banner: EMPTY_MEDIA,
            colors: {
                primary: { background: "#0F1B2D", foreground: "#F0F4FF" },
                links: "#7C9FD6",
            },
            social: { style: "icons", platforms: [] },
            locations: [],
            teamMembers: [],
            customers: [],
            descriptions: [
                {
                    id: "demo-transcend-desc-1",
                    title: "Our Collective",
                    body: "Spiritweave Collective brings together a diverse community of spiritual practitioners, healers, and seekers under one roof. We curate transformative experiences ranging from astrology readings and mediumship sessions to breathwork journeys and shadow work coaching. Our mission is to make authentic spiritual guidance accessible to everyone.",
                    supporting_images: [],
                },
            ],
            reviews: [],
            socialPosts: [],
            ref: { id: vendorId("transcend"), partition: [vendorId("transcend")], container: "Main-Vendor" },
            subscription: makeSubscription("transcend", 5900),
        };

        const transcendServices = [
            makeService({
                id: svcId("transcend", 1),
                vendorId: vendorId("transcend"),
                name: "Comprehensive Astrology Birth Chart Reading",
                slug: "comprehensive-astrology-birth-chart-reading",
                description: "A thorough analysis of your natal birth chart covering your Sun, Moon, and Rising signs, planetary aspects, house placements, and current transits. Delivered as a detailed written report with personalised insights.",
                category: "READING",
                deliveryMode: "ASYNC",
                bookingType: "ASAP",
                priceCents: 12000,
                turnaroundDays: 7,
                displayScore: 0.95,
            }),
            makeService({
                id: svcId("transcend", 2),
                vendorId: vendorId("transcend"),
                name: "Mediumship Connection Session",
                slug: "mediumship-connection-session",
                description: "A live one-on-one mediumship session connecting you with loved ones who have passed. Conducted via video call in a compassionate, sacred space.",
                category: "READING",
                deliveryMode: "SYNC",
                bookingType: "SCHEDULED",
                priceCents: 15000,
                displayScore: 0.90,
            }),
            makeService({
                id: svcId("transcend", 3),
                vendorId: vendorId("transcend"),
                name: "Guided Shadow Work Coaching Package",
                slug: "guided-shadow-work-coaching-package",
                description: "A structured coaching programme to explore and integrate your shadow self. Includes live video sessions with guided exercises, journaling prompts, and ongoing support between sessions.",
                category: "COACHING",
                deliveryMode: "SYNC",
                bookingType: "SCHEDULED",
                priceCents: 20000,
                displayScore: 0.85,
            }),
            makeService({
                id: svcId("transcend", 4),
                vendorId: vendorId("transcend"),
                name: "Past Life Regression Reading",
                slug: "past-life-regression-reading",
                description: "An intuitive past life reading exploring significant past incarnations and how they influence your current life path, relationships, and soul lessons. Delivered as a detailed written narrative.",
                category: "READING",
                deliveryMode: "ASYNC",
                bookingType: "ASAP",
                priceCents: 9500,
                turnaroundDays: 5,
                displayScore: 0.80,
            }),
            makeService({
                id: svcId("transcend", 5),
                vendorId: vendorId("transcend"),
                name: "Breathwork & Sound Healing Journey",
                slug: "breathwork-sound-healing-journey",
                description: "A live guided breathwork session combined with sound healing using singing bowls and tuning forks. Designed to release stored tension, expand awareness, and restore energetic balance.",
                category: "HEALING",
                deliveryMode: "SYNC",
                bookingType: "SCHEDULED",
                priceCents: 8000,
                displayScore: 0.75,
            }),
        ];

        // ════════════════════════════════════════════════════════════════════
        // SEED ALL RECORDS
        // ════════════════════════════════════════════════════════════════════

        // Users (4 records)
        const userResult = await context.seedData({
            container: "Main-User",
            partitionKeyField: "id",
            records: [awakenUser, illuminateUser, manifestUser, transcendUser],
            upsert: true,
        });
        context.log(`  Users: ${userResult.inserted} inserted, ${userResult.skipped} skipped`);

        // Vendors (4 records)
        const vendorResult = await context.seedData({
            container: "Main-Vendor",
            partitionKeyField: "id",
            records: [awakenVendor, illuminateVendor, manifestVendor, transcendVendor],
            upsert: true,
        });
        context.log(`  Vendors: ${vendorResult.inserted} inserted, ${vendorResult.skipped} skipped`);

        // Services (14 records)
        const serviceResult = await context.seedData({
            container: "Main-Listing",
            partitionKeyField: "vendorId",
            records: [
                ...awakenServices,
                ...illuminateServices,
                ...manifestServices,
                ...transcendServices,
            ],
            upsert: true,
        });
        context.log(`  Services: ${serviceResult.inserted} inserted, ${serviceResult.skipped} skipped`);
    },
};
