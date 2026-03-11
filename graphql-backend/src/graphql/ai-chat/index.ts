import { serverContext } from "../../services/azFunction";
import { AiChatManager } from "./manager";
import { getTierFeatures } from "../subscription/featureGates";
import { subscription_tier } from "../vendor/types";

/**
 * Call Anthropic Messages API (Claude Haiku 4.5)
 */
async function callAi(
    apiKey: string,
    systemPrompt: string,
    messages: { role: string; content: string }[]
): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4096,
            system: systemPrompt,
            messages,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI request failed (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
}

// --- Cached business context (1-hour TTL) ---
let cachedContext: { data: string; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getBusinessContext(context: serverContext): Promise<string> {
    if (cachedContext && Date.now() - cachedContext.fetchedAt < CACHE_TTL_MS) {
        return cachedContext.data;
    }

    // Fetch fee config and tier definitions from Cosmos
    const [feeResults, tierResults] = await Promise.all([
        context.dataSources.cosmos.run_query<any>("System-Settings", {
            query: `SELECT * FROM c WHERE c.id = @id AND c.docType = @docType`,
            parameters: [
                { name: "@id", value: "spiriverse" },
                { name: "@docType", value: "fees-config" },
            ],
        }),
        context.dataSources.cosmos.run_query<any>("System-Settings", {
            query: `SELECT * FROM c WHERE c.id = @id AND c.docType = @docType`,
            parameters: [
                { name: "@id", value: "subscription-tier-definitions" },
                { name: "@docType", value: "subscription-config" },
            ],
        }),
    ]);

    const feeConfig = feeResults.length > 0 ? feeResults[0] : null;
    const tierDefs = tierResults.length > 0 ? tierResults[0] : null;

    // Build pricing summary
    let pricingSection = '';
    if (tierDefs?.tiers) {
        const tiers = ['directory', 'awaken', 'illuminate', 'manifest', 'transcend'] as const;
        const tierLines: string[] = [];
        for (const tier of tiers) {
            const def = tierDefs.tiers[tier];
            if (!def) continue;
            const monthlyKey = `subscription-${tier}-monthly`;
            const annualKey = `subscription-${tier}-annual`;
            const monthly = feeConfig?.[monthlyKey]?.fixed ?? 0;
            const annual = feeConfig?.[annualKey]?.fixed ?? 0;
            const features = getTierFeatures(tier as subscription_tier);
            const enabledFeatures = Object.entries(features)
                .filter(([k, v]) => v === true || (k === 'maxProducts' && v !== 0))
                .map(([k, v]) => k === 'maxProducts' ? `maxProducts: ${v === null ? 'unlimited' : v}` : k);
            tierLines.push(`- **${def.name}** ($${(monthly / 100).toFixed(0)}/mo or $${(annual / 100).toFixed(0)}/yr): ${def.description || ''}\n  Features: ${enabledFeatures.join(', ')}`);
        }
        pricingSection = `## Subscription Tiers (AUD, current pricing)\n${tierLines.join('\n')}`;
    }

    // Build fees summary
    let feesSection = '';
    if (feeConfig) {
        const feeLines: string[] = [];
        const skipPrefixes = ['subscription-', 'id', 'docType', 'status', '_', 'modifiedBy', 'modifiedDate', 'createdDate'];
        for (const [key, val] of Object.entries(feeConfig)) {
            if (skipPrefixes.some(p => key.startsWith(p))) continue;
            if (typeof val !== 'object' || val === null) continue;
            const v = val as any;
            const parts: string[] = [];
            if (v.percent) parts.push(`${v.percent}%`);
            if (v.fixed) parts.push(`$${(v.fixed / 100).toFixed(2)} flat`);
            if (v.basePrice) parts.push(`base price $${(v.basePrice / 100).toFixed(2)}`);
            if (parts.length > 0) feeLines.push(`- ${key}: ${parts.join(' + ')}`);
        }
        feesSection = `## Platform Fees (AUD)\n${feeLines.join('\n')}`;
    }

    const contextData = `${pricingSection}\n\n${feesSection}`.trim();
    cachedContext = { data: contextData, fetchedAt: Date.now() };
    return contextData;
}

const BASE_SYSTEM_PROMPT = `You are SpiriVerse Assistant, an AI helper for the SpiriVerse admin console. You help the team with questions about the platform, brainstorm ideas, draft content, and assist with operational tasks. Be concise and helpful. Use markdown formatting when appropriate.

## About SpiriVerse
SpiriVerse is an Australian spiritual wellness marketplace platform. Vendors (practitioners and merchants) list services, products, guided journeys (audio meditation collections), and spiritual readings (tarot, oracle, astrology). The platform operates in AU (AUD), UK (GBP), and US (USD) markets.

## Key Concepts
- **Vendor**: An account on the platform (can be a practitioner, merchant, or both)
- **Practitioner**: Offers services, readings, events, tours
- **Merchant**: Sells physical products (crystals, tarot decks, spiritual items)
- **Journeys**: Audio meditation/guidance collections (single-track, collection, or series)
- **SpiriReadings**: Platform-native tarot/oracle/astrology readings at platform-set pricing
- **SpiriAssist**: AI content generation tool for vendors
- **Expo Mode**: Event/market-style vendor showcase
- **Live Assist**: Live streaming capability
- **Go-live**: Vendor must have payment card + payment method + Stripe onboarding before their profile is published

## Billing Model
- Subscriptions are fixed-price (100% platform revenue)
- Transaction fees are taken as a percentage of each sale (vendor receives the remainder)
- New vendors get a 14-day free trial
- At end of trial: if card is on file, first subscription payment is charged automatically; if no card, account is suspended
- After trial, subscriptions renew monthly or annually depending on the vendor's chosen interval
- Upgrades are prorated (credit remaining days, charge difference). Downgrades take effect at end of current billing period`;

export const resolvers = {
    Query: {
        aiConversations: async (_: any, _args: any, context: serverContext) => {
            return AiChatManager.listConversations(context.dataSources.tableStorage);
        },

        aiConversation: async (_: any, args: { id: string }, context: serverContext) => {
            return AiChatManager.getConversation(context.dataSources.tableStorage, args.id);
        },

        aiMessages: async (_: any, args: { conversationId: string }, context: serverContext) => {
            return AiChatManager.getMessages(context.dataSources.tableStorage, args.conversationId);
        },
    },

    Mutation: {
        aiSendMessage: async (_: any, args: { conversationId?: string; message: string }, context: serverContext) => {
            const { tableStorage, vault } = context.dataSources;

            // Get or create conversation
            let conversation;
            let existingMessages: { role: string; content: string }[] = [];

            if (args.conversationId) {
                conversation = await AiChatManager.getConversation(tableStorage, args.conversationId);
                if (!conversation) throw new Error('Conversation not found');

                // Load message history for context
                const msgs = await AiChatManager.getMessages(tableStorage, args.conversationId);
                existingMessages = msgs.map(m => ({ role: m.role, content: m.content }));
            } else {
                // Auto-title from first message (first 50 chars)
                const title = args.message.length > 50
                    ? args.message.substring(0, 50) + '...'
                    : args.message;
                conversation = await AiChatManager.createConversation(tableStorage, title);
            }

            // Save user message
            const messageNumber = (conversation.messageCount || 0) + 1;
            const userMessage = await AiChatManager.addMessage(
                tableStorage,
                conversation.id,
                'user',
                args.message,
                messageNumber
            );

            // Build message history for AI (Anthropic format — no system in messages array)
            const aiMessages = [
                ...existingMessages,
                { role: 'user', content: args.message },
            ];

            // Build system prompt with live business data
            const businessContext = await getBusinessContext(context);
            const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${businessContext}`;

            // Call AI
            const apiKey = await vault.get('anthropic-api-key');

            if (!apiKey) {
                throw new Error('AI service not configured. Set anthropic-api-key in Key Vault.');
            }

            const aiReply = await callAi(apiKey, systemPrompt, aiMessages);

            // Save assistant reply
            const replyMessage = await AiChatManager.addMessage(
                tableStorage,
                conversation.id,
                'assistant',
                aiReply,
                messageNumber + 1
            );

            // Refresh conversation for updated counts
            const updatedConversation = await AiChatManager.getConversation(tableStorage, conversation.id);

            return {
                message: userMessage,
                reply: replyMessage,
                conversation: updatedConversation,
            };
        },

        aiRenameConversation: async (_: any, args: { id: string; title: string }, context: serverContext) => {
            return AiChatManager.renameConversation(context.dataSources.tableStorage, args.id, args.title);
        },

        aiDeleteConversation: async (_: any, args: { id: string }, context: serverContext) => {
            return AiChatManager.deleteConversation(context.dataSources.tableStorage, args.id);
        },
    },
};
