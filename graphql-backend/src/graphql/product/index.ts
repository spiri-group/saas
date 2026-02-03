import { HTTPMethod } from "@azure/cosmos";
import { GraphQLError } from "graphql";
import { serverContext } from "../../services/azFunction";
import { ListingTypes } from "../listing/types";
import { product_type, variant_type, inventory_transaction_type, inventory_alert_type, variant_inventory_type, inventory_rule_type, crystal_type_data } from "./types";
import { currency_amount_type } from "../0_shared/types";
import { isNullOrUndefined, slugify } from "../../utils/functions";
import { merchantLocation_type, vendor_type } from "../vendor/types";
import { choice_config_type, choice_node_type, ChoiceKind } from "../choices/types";
import { buildNodeTree } from "../choices";
import { CRYSTAL_REFERENCE_CONFIG_ID, CRYSTAL_REFERENCE_CONTAINER, crystal_reference_type, chakra_type } from "../crystal-reference/types";
import { crystal_wishlist_item_type, crystal_collection_item_type } from "../personal-space/types/crystal-types";

// Personal space container
const PERSONAL_SPACE_CONTAINER = "Main-PersonalSpace";

// All chakras for analysis
const ALL_CHAKRAS: chakra_type[] = [
  "root", "sacral", "solar_plexus", "heart", "throat", "third_eye", "crown"
];

// Chakra-crystal mapping for recommendations
const CHAKRA_CRYSTAL_ASSOCIATIONS: Record<chakra_type, string[]> = {
  root: ["red-jasper", "black-tourmaline", "hematite", "smoky-quartz", "obsidian", "garnet"],
  sacral: ["carnelian", "orange-calcite", "sunstone", "tigers-eye", "amber"],
  solar_plexus: ["citrine", "yellow-jasper", "pyrite", "golden-topaz", "yellow-calcite"],
  heart: ["rose-quartz", "green-aventurine", "jade", "malachite", "rhodonite", "emerald"],
  throat: ["blue-lace-agate", "aquamarine", "lapis-lazuli", "sodalite", "turquoise"],
  third_eye: ["amethyst", "labradorite", "fluorite", "iolite", "azurite"],
  crown: ["clear-quartz", "selenite", "amethyst", "moonstone", "howlite", "lepidolite"],
  earth_star: ["black-tourmaline", "hematite", "obsidian", "smoky-quartz"],
  soul_star: ["selenite", "clear-quartz", "apophyllite", "danburite"]
};

const resolvers = {
    Query: {
        product: async (_: any, args: any, { dataSources }: serverContext, ___: any) => {
            // First try to get product by ID (direct lookup)
            try {
                const product = await dataSources.cosmos.get_record("Main-Listing", args.id, args.vendorId);
                return product;
            } catch (error) {
                // If not found by ID, try to find by slug
                const products = await dataSources.cosmos.run_query("Main-Listing", {
                    query: "SELECT * FROM c WHERE c.vendorId = @vendorId AND c.slug = @slug",
                    parameters: [
                        { name: "@vendorId", value: args.vendorId },
                        { name: "@slug", value: args.id } // Using args.id as potential slug
                    ]
                });

                if (products.length === 0) {
                    throw new GraphQLError(`Product with ID or slug '${args.id}' not found`, {
                        extensions: { code: 'NOT_FOUND' }
                    });
                }

                return products[0];
            }
        },
        products: async (_: any, args: any, { dataSources }: serverContext, ___: any) => {
            if (args.vendor != null) {
                var queryString = `metadata['vendor']:'${args.vendor}' AND active:'true'`
                if (args.searchText != null) queryString += ` AND name~'${args.searchText}'`
                if (args.family != null) queryString += ` AND metadata['bundle_id']:'${args.family}'`
                
                // talk to stripe
                var getProductsResp = await dataSources.stripe.callApi(HTTPMethod.get, "products/search", {
                    query: queryString
                })
                if (getProductsResp.status != 200) {
                    throw new GraphQLError(`Error searching for products in Stripe.`, {
                        extensions: { code: 'BAD_REQUEST'},
                    });
                }

                // sort if the sort attribute exists
                var products = getProductsResp.data.data;
                if (products[0].metadata.sort != undefined) products = products.sort((a: any, b: any) => a.metadata.sort > b.metadata.sort ? 1 : -1)
                
                return products.map(async (product: any) => {
                    let params : any = {
                        product: product.id,
                        active: true
                    }
                    if (args.currency != null) params["currency"] = args.currency
                    var getPricesResp = await dataSources.stripe.callApi(HTTPMethod.get, "prices", params)
                    
                    let prices = getPricesResp.data.data
                    
                    let defaultPrice = undefined as any;
                    let otherPrices = [];
                    if (prices.length == 1) {
                        defaultPrice = prices[0]
                    } else {
                        prices = prices.sort((a: any, b: any) => {
                            const aDefault = a.metadata.default_in_currency ?? false;
                            const bDefault = b.metadata.default_in_currency ?? false;
                            return aDefault === bDefault ? 0 : aDefault ? -1 : 1;
                        });

                        defaultPrice = prices[0]
                        otherPrices = prices.filter((price: any) => price.id != defaultPrice.id)
                    }
                    
                    const variant = {
                        id: product.id,
                        defaultPrice: 
                        {
                            id: defaultPrice.id,
                            amount: defaultPrice.unit_amount,
                            currency: defaultPrice.currency,
                            recurring: 
                                isNullOrUndefined(defaultPrice.recurring) ?
                                    undefined : 
                                    {
                                        interval: defaultPrice.recurring.interval,
                                        interval_count: defaultPrice.recurring.interval_count
                                    }
                        } as currency_amount_type,
                        otherPrices: otherPrices.map((price) => ({
                            id: price.id,
                            amount: price.unit_amount,
                            currency: price.currency,
                            recurring: isNullOrUndefined(price) ? 
                                undefined : {
                                    interval: price.recurring.interval,
                                    interval_count: price.recurring.interval_count
                                }
                        })) as currency_amount_type[]
                    } as variant_type

                    return {
                        id: product.id,
                        name: product.name?.split("|").length > 1 ? product.name.split("|").slice(1).join("|").trim() : product.name,
                        description: product.description,
                        defaultVariantId: variant.id,
                        variants: [variant],
                        ref: {
                            id: product.id,
                            partition: [product.id],
                            container: "UNKNOWN"
                        },
                        offers: []
                    } as product_type
                })
            } else {

            }
        },
        // video: async (_: any, args: any, { dataSources }: serverContext, ___: any) => {
        // },
        // videos: async (_: any, args: any, { dataSources }: serverContext, ___: any) => {
        // },
        // podcast: async (_: any, args: any, { dataSources }: serverContext, ___: any) => {
        // },
        // podcasts: async (_: any, args: any, { dataSources }: serverContext, ___: any) => {
        // }
        inventoryAlerts: async (_: any, args: any, { dataSources }: serverContext, ___: any) => {
            const containerName = "Main-Listing";
            let query = `SELECT * FROM c WHERE c.vendorId = @vendorId AND c.docType = 'alert'`;
            const parameters = [{ name: "@vendorId", value: args.vendorId }];
            
            if (args.status) {
                query += ` AND c.status = @status`;
                parameters.push({ name: "@status", value: args.status });
            }
            
            query += ` ORDER BY c.created_at DESC`;
            
            return await dataSources.cosmos.run_query<inventory_alert_type>(containerName, { query, parameters });
        },
        inventoryTransactions: async (_: any, args: any, { dataSources }: serverContext, ___: any) => {
            const containerName = "Main-Listing";
            let query = `SELECT TOP @limit * FROM c WHERE c.vendorId = @vendorId AND c.docType = 'transaction'`;
            const parameters = [
                { name: "@vendorId", value: args.vendorId },
                { name: "@limit", value: args.limit || 50 }
            ];
            
            if (args.variantId) {
                query += ` AND c.variant_id = @variantId`;
                parameters.push({ name: "@variantId", value: args.variantId });
            }
            
            query += ` ORDER BY c.created_at DESC`;
            
            return await dataSources.cosmos.run_query<inventory_transaction_type>(containerName, { query, parameters });
        },
        stockReport: async (_: any, args: any, { dataSources }: serverContext) => {
            const containerName = "Main-Listing";
            
            // Get merchant currency
            const { currency: merchantCurrency } = await dataSources.cosmos.get_scalar<{ currency: string }>("Main-Vendor", "id", "currency", args.vendorId, args.vendorId) || { currency: "AUD" };

            // First, get inventory data
            const inventoryQuery = `
                SELECT c.product_id, c.variant_id, c.qty_on_hand, c.qty_committed, 
                       c.low_stock_threshold, c.is_ooak_effective
                FROM c
                WHERE c.vendorId = @vendorId
                    AND c.docType = 'variant'
                    AND c.location_id = @locationId
            `;
            const inventoryParams = [
                { name: "@vendorId", value: args.vendorId },
                { name: "@locationId", value: args.locationId || "default" },
            ];

            const inventoryData = await dataSources.cosmos.run_query<{
                product_id: string;
                variant_id: string;
                qty_on_hand: number;
                qty_committed: number;
                low_stock_threshold: number;
                is_ooak_effective: boolean;
            }>(containerName, { query: inventoryQuery, parameters: inventoryParams });

            if (inventoryData.length === 0) {
                return {
                    total_products: 0,
                    total_variants: 0,
                    low_stock_items: 0,
                    out_of_stock_items: 0,
                    ooak_items: 0,
                    total_value: { amount: 0, currency: merchantCurrency },
                    location_id: args.locationId || "default",
                    generated_at: new Date().toISOString(),
                    items: []
                };
            }

            // Get unique product IDs
            const productIds = [...new Set(inventoryData.map(item => item.product_id))];
            
            // Fetch product details from Main-Listing
            const productQuery = `
                SELECT c.id, c.name, c.variants, c.is_ooak
                FROM c
                WHERE c.vendorId = @vendorId
                    AND c.id IN (${productIds.map((_, i) => `@productId${i}`).join(', ')})
            `;
            const productParams = [
                { name: "@vendorId", value: args.vendorId },
                ...productIds.map((id, i) => ({ name: `@productId${i}`, value: id }))
            ];

            const products = await dataSources.cosmos.run_query<{
                id: string;
                name: string;
                variants: any[];
                is_ooak: boolean;
            }>("Main-Listing", { query: productQuery, parameters: productParams });

            // Create lookup maps
            const variantMap = new Map();
            
            products.forEach(product => {
                if (product.variants) {
                    product.variants.forEach(variant => {
                        variantMap.set(variant.id, {
                            ...variant,
                            product_name: product.name,
                            product_is_ooak: product.is_ooak
                        });
                    });
                }
            });

            // Combine inventory data with product/variant info
            const items = inventoryData.map(inv => {
                const variant = variantMap.get(inv.variant_id);
                const qtyAvailable = (inv.qty_on_hand || 0) - (inv.qty_committed || 0);
                const threshold = inv.low_stock_threshold || 5;
                
                return {
                    product_id: inv.product_id,
                    product_name: variant?.product_name || "Unknown Product",
                    variant_id: inv.variant_id,
                    variant_name: variant?.name || "Unknown Variant",
                    qty_on_hand: inv.qty_on_hand || 0,
                    qty_available: qtyAvailable,
                    qty_committed: inv.qty_committed || 0,
                    is_ooak: inv.is_ooak_effective || variant?.product_is_ooak || false,
                    low_stock_threshold: threshold,
                    value: {
                        amount: (variant?.defaultPrice?.amount || 0) * qtyAvailable,
                        currency: variant?.defaultPrice?.currency || merchantCurrency
                    },
                    status: qtyAvailable <= 0 ? 'OUT_OF_STOCK' : 
                           qtyAvailable <= threshold ? 'LOW_STOCK' : 'IN_STOCK'
                };
            });

            // Calculate summary stats
            const totalProducts = new Set(items.map(item => item.product_id)).size;
            const lowStockItems = items.filter(item => item.status === 'LOW_STOCK').length;
            const outOfStockItems = items.filter(item => item.status === 'OUT_OF_STOCK').length;
            const ooakItems = items.filter(item => item.is_ooak).length;
            const totalValue = items.reduce((sum, item) => sum + item.value.amount, 0);

            return {
                total_products: totalProducts,
                total_variants: items.length,
                low_stock_items: lowStockItems,
                out_of_stock_items: outOfStockItems,
                ooak_items: ooakItems,
                total_value: { amount: totalValue, currency: merchantCurrency },
                location_id: args.locationId || "default",
                generated_at: new Date().toISOString(),
                items
            };
        },
        productCategories: async (_: any, args: any, context: serverContext) => {
            const config = await context.dataSources.cosmos.get_record<choice_config_type>('System-Settings', 'product-categories', 'choice-config');

            // Get root nodes (level 1) from System-SettingTrees using configId as partition
            const rootNodes = await context.dataSources.cosmos.run_query<choice_node_type>("System-SettingTrees", {
                query: "SELECT * FROM c WHERE c.type = 'category' AND c.configId = @configId AND c.level = 1 AND c.status = 'ACTIVE' ORDER BY c.sortOrder",
                parameters: [
                    { name: "@configId", value: config.id }
                ]
            });

            // Build tree for all root nodes
            return await Promise.all(rootNodes.map(node => buildNodeTree(node, context, config)));
        },
        stockReportItems: async (_: any, args: any, { dataSources }: serverContext) => {
            const containerName = "Main-Listing";
            const offset = args.offset || 0;
            const limit = Math.min(args.limit || 50, 100); // Cap at 100 items per page
            
            // Get merchant currency
            const { currency: merchantCurrency } = await dataSources.cosmos.get_scalar<{ currency: string }>("Main-Vendor", "id", "currency", args.vendorId, args.vendorId) || { currency: "AUD" };

            // Build search filter for inventory query
            const baseQuery = `
                FROM c
                    WHERE c.vendorId = @vendorId
                        AND c.docType = 'variant'
                        AND c.location_id = @locationId
                `;

            let inventoryQuery = `
                SELECT c.product_id, c.variant_id, c.qty_on_hand, c.qty_committed, 
                       c.low_stock_threshold, c.is_ooak_effective
                ${baseQuery}
            `;
            const inventoryParams: any[] = [
                { name: "@vendorId", value: args.vendorId },
                { name: "@locationId", value: args.locationId || "default" },
            ];

            // Get total count first (for hasMore calculation)
            const countQuery = `
                SELECT VALUE COUNT(1)
                ${baseQuery}
            `;
            const totalCount = await dataSources.cosmos.run_query<number>(containerName, { query: countQuery, parameters: inventoryParams });

            // Add pagination
            inventoryQuery += ` ORDER BY c.product_id, c.variant_id OFFSET ${offset} LIMIT ${limit}`;

            const inventoryData = await dataSources.cosmos.run_query<{
                product_id: string;
                variant_id: string;
                qty_on_hand: number;
                qty_committed: number;
                low_stock_threshold: number;
                is_ooak_effective: boolean;
            }>(containerName, { query: inventoryQuery, parameters: inventoryParams });

            if (inventoryData.length === 0) {
                return {
                    items: [],
                    hasMore: false,
                    totalCount: totalCount[0] || 0
                };
            }

            // Get unique product IDs
            const productIds = [...new Set(inventoryData.map(item => item.product_id))];
            
            // Build product search filter
            let productQuery = `
                SELECT c.id, c.name, c.variants, c.is_ooak
                FROM c
                WHERE c.vendorId = @vendorId
                    AND c.id IN (${productIds.map((_, i) => `@productId${i}`).join(', ')})
            `;
            const productParams = [
                { name: "@vendorId", value: args.vendorId },
                ...productIds.map((id, i) => ({ name: `@productId${i}`, value: id }))
            ];

            // Add search filter if provided
            if (args.search && args.search.trim()) {
                productQuery += ` AND (CONTAINS(LOWER(c.name), @search))`;
                productParams.push({ name: "@search", value: args.search.toLowerCase() });
            }

            const products = await dataSources.cosmos.run_query<{
                id: string;
                name: string;
                variants: any[];
                is_ooak: boolean;
            }>("Main-Listing", { query: productQuery, parameters: productParams });

            // Create lookup maps
            const variantMap = new Map();
            
            products.forEach(product => {
                if (product.variants) {
                    product.variants.forEach(variant => {
                        // Apply search filter to variant names too
                        const matchesSearch = !args.search || 
                            variant.name?.toLowerCase().includes(args.search.toLowerCase()) ||
                            product.name?.toLowerCase().includes(args.search.toLowerCase());
                            
                        if (matchesSearch) {
                            variantMap.set(variant.id, {
                                ...variant,
                                product_name: product.name,
                                product_is_ooak: product.is_ooak
                            });
                        }
                    });
                }
            });

            // Combine inventory data with product/variant info and apply search filter
            const items = inventoryData
                .map(inv => {
                    const variant = variantMap.get(inv.variant_id);
                    if (!variant) return null; // Skip if doesn't match search
                    
                    const qtyAvailable = (inv.qty_on_hand || 0) - (inv.qty_committed || 0);
                    const threshold = inv.low_stock_threshold || 5;
                    
                    return {
                        product_id: inv.product_id,
                        product_name: variant.product_name || "Unknown Product",
                        variant_id: inv.variant_id,
                        variant_name: variant.name || "Unknown Variant",
                        qty_on_hand: inv.qty_on_hand || 0,
                        qty_available: qtyAvailable,
                        qty_committed: inv.qty_committed || 0,
                        is_ooak: inv.is_ooak_effective || variant.product_is_ooak || false,
                        low_stock_threshold: threshold,
                        value: {
                            amount: (variant.defaultPrice?.amount || 0) * qtyAvailable,
                            currency: variant.defaultPrice?.currency || merchantCurrency
                        },
                        status: qtyAvailable <= 0 ? 'OUT_OF_STOCK' : 
                               qtyAvailable <= threshold ? 'LOW_STOCK' : 'IN_STOCK'
                    };
                })
                .filter(item => item !== null); // Remove nulls from search filtering

            const hasMore = (offset + items.length) < (totalCount[0] || 0);

            return {
                items,
                hasMore,
                totalCount: totalCount[0] || 0
            };
        },

        // Search crystal products across all vendors
        searchCrystalProducts: async (
            _: any,
            args: {
                filters?: {
                    crystalRefId?: string;
                    crystalForm?: string;
                    crystalGrade?: string;
                    minPrice?: number;
                    maxPrice?: number;
                    search?: string;
                };
                offset?: number;
                limit?: number;
            },
            context: serverContext
        ) => {
            const offset = args.offset || 0;
            const limit = args.limit || 20;

            let query = `SELECT * FROM c WHERE c.productType = 'CRYSTAL' AND c.isLive = true`;
            const parameters: { name: string; value: any }[] = [];

            if (args.filters) {
                if (args.filters.crystalRefId) {
                    query += ` AND c.typeData.crystal.crystalRefId = @crystalRefId`;
                    parameters.push({ name: "@crystalRefId", value: args.filters.crystalRefId });
                }
                if (args.filters.crystalForm) {
                    query += ` AND c.typeData.crystal.crystalForm = @crystalForm`;
                    parameters.push({ name: "@crystalForm", value: args.filters.crystalForm });
                }
                if (args.filters.crystalGrade) {
                    query += ` AND c.typeData.crystal.crystalGrade = @crystalGrade`;
                    parameters.push({ name: "@crystalGrade", value: args.filters.crystalGrade });
                }
                if (args.filters.minPrice !== undefined) {
                    query += ` AND c.variants[0].defaultPrice.amount >= @minPrice`;
                    parameters.push({ name: "@minPrice", value: args.filters.minPrice });
                }
                if (args.filters.maxPrice !== undefined) {
                    query += ` AND c.variants[0].defaultPrice.amount <= @maxPrice`;
                    parameters.push({ name: "@maxPrice", value: args.filters.maxPrice });
                }
                if (args.filters.search) {
                    query += ` AND (CONTAINS(LOWER(c.name), LOWER(@search)) OR CONTAINS(LOWER(c.description), LOWER(@search)))`;
                    parameters.push({ name: "@search", value: args.filters.search });
                }
            }

            query += ` ORDER BY c._ts DESC`;

            const products = await context.dataSources.cosmos.run_query<product_type>(
                "Main-Listing",
                { query, parameters }
            );

            const paginatedProducts = products.slice(offset, offset + limit);

            return {
                products: paginatedProducts,
                totalCount: products.length,
                hasMore: offset + limit < products.length,
            };
        },

        // Match user's wishlist items to available crystal products
        matchWishlistToProducts: async (
            _: any,
            args: { userId: string },
            context: serverContext
        ) => {
            // Step 1: Get user's wishlist items that have crystalRefId and are not acquired
            const wishlistItems = await context.dataSources.cosmos.run_query<crystal_wishlist_item_type>(
                PERSONAL_SPACE_CONTAINER,
                {
                    query: `SELECT * FROM c
                            WHERE c.userId = @userId
                            AND c.docType = 'CRYSTAL_WISHLIST'
                            AND c.isAcquired = false`,
                    parameters: [{ name: "@userId", value: args.userId }],
                }
            );

            // Step 2: For each wishlist item with a crystalRefId, find matching active crystal products
            const matches: any[] = [];
            let totalMatches = 0;

            for (const wishlistItem of wishlistItems) {
                if (!wishlistItem.crystalRefId) {
                    // No crystalRefId, can't match to products
                    matches.push({
                        wishlistItem,
                        matchingProducts: [],
                        matchCount: 0,
                    });
                    continue;
                }

                // Build the query with optional filters from wishlist preferences
                let query = `SELECT * FROM c
                             WHERE c.productType = 'CRYSTAL'
                             AND c.typeData.crystal.crystalRefId = @crystalRefId
                             AND c.isLive = true`;

                const parameters: { name: string; value: any }[] = [
                    { name: "@crystalRefId", value: wishlistItem.crystalRefId },
                ];

                // Apply preferred form filter if specified
                if (wishlistItem.preferredForm) {
                    query += ` AND c.typeData.crystal.crystalForm = @preferredForm`;
                    parameters.push({ name: "@preferredForm", value: wishlistItem.preferredForm });
                }

                // Apply max budget filter if specified (using first variant's price)
                if (wishlistItem.maxBudget !== undefined && wishlistItem.maxBudget > 0) {
                    query += ` AND c.variants[0].defaultPrice.amount <= @maxBudget`;
                    parameters.push({ name: "@maxBudget", value: wishlistItem.maxBudget });
                }

                query += ` ORDER BY c.variants[0].defaultPrice.amount ASC`;

                const matchingProducts = await context.dataSources.cosmos.run_query<product_type>(
                    "Main-Listing",
                    { query, parameters }
                );

                matches.push({
                    wishlistItem,
                    matchingProducts,
                    matchCount: matchingProducts.length,
                });

                totalMatches += matchingProducts.length;
            }

            return {
                matches,
                totalWishlistItems: wishlistItems.length,
                totalMatches,
            };
        },

        // Get crystal recommendations based on user's collection
        crystalProductRecommendations: async (
            _: any,
            args: { userId: string; limit?: number },
            context: serverContext
        ) => {
            const limit = args.limit || 5;

            // Step 1: Get user's crystal collection
            const collection = await context.dataSources.cosmos.run_query<crystal_collection_item_type>(
                PERSONAL_SPACE_CONTAINER,
                {
                    query: `SELECT * FROM c
                            WHERE c.userId = @userId
                            AND c.docType = 'CRYSTAL_COLLECTION'
                            AND c.isActive = true`,
                    parameters: [{ name: "@userId", value: args.userId }],
                }
            );

            // Step 2: Analyze chakra coverage from collection
            const chakraCounts: Record<chakra_type, number> = {} as Record<chakra_type, number>;
            ALL_CHAKRAS.forEach(chakra => chakraCounts[chakra] = 0);

            const collectionCrystalRefIds = new Set<string>();

            for (const item of collection) {
                if (item.crystalRefId) {
                    collectionCrystalRefIds.add(item.crystalRefId);
                }
                if (item.chakras) {
                    for (const chakra of item.chakras) {
                        if (chakraCounts[chakra] !== undefined) {
                            chakraCounts[chakra]++;
                        }
                    }
                }
            }

            // Find covered and missing chakras
            const coveredChakras: chakra_type[] = [];
            const missingChakras: chakra_type[] = [];
            let strongestChakra: chakra_type | undefined;
            let maxCount = 0;

            for (const chakra of ALL_CHAKRAS) {
                if (chakraCounts[chakra] > 0) {
                    coveredChakras.push(chakra);
                    if (chakraCounts[chakra] > maxCount) {
                        maxCount = chakraCounts[chakra];
                        strongestChakra = chakra;
                    }
                } else {
                    missingChakras.push(chakra);
                }
            }

            const coveragePercentage = (coveredChakras.length / ALL_CHAKRAS.length) * 100;

            const chakraAnalysis = {
                coveredChakras,
                missingChakras,
                strongestChakra,
                coveragePercentage,
            };

            // Step 3: Get crystal references for recommendations
            const allCrystalRefs = await context.dataSources.cosmos.run_query<crystal_reference_type>(
                CRYSTAL_REFERENCE_CONTAINER,
                {
                    query: `SELECT * FROM c WHERE c.configId = @configId AND c.docType = 'crystal'`,
                    parameters: [{ name: "@configId", value: CRYSTAL_REFERENCE_CONFIG_ID }],
                }
            );

            // Step 4: Build recommendations based on missing chakras
            const recommendations: any[] = [];
            const recommendedIds = new Set<string>();

            // Priority 1: Recommend crystals for missing chakras
            for (const missingChakra of missingChakras) {
                if (recommendations.length >= limit) break;

                const chakraCrystalIds = CHAKRA_CRYSTAL_ASSOCIATIONS[missingChakra] || [];

                for (const crystalId of chakraCrystalIds) {
                    if (recommendations.length >= limit) break;
                    if (collectionCrystalRefIds.has(crystalId)) continue; // Already in collection
                    if (recommendedIds.has(crystalId)) continue; // Already recommended

                    // Find the crystal reference
                    const crystalRef = allCrystalRefs.find(c => c.id === crystalId);
                    if (!crystalRef) continue;

                    // Find active crystal products for this crystal
                    const products = await context.dataSources.cosmos.run_query<product_type>(
                        "Main-Listing",
                        {
                            query: `SELECT * FROM c
                                    WHERE c.productType = 'CRYSTAL'
                                    AND c.typeData.crystal.crystalRefId = @crystalRefId
                                    AND c.isLive = true
                                    ORDER BY c.variants[0].defaultPrice.amount ASC`,
                            parameters: [{ name: "@crystalRefId", value: crystalId }],
                        }
                    );

                    // Only recommend if there are available products
                    if (products.length > 0) {
                        recommendedIds.add(crystalId);
                        recommendations.push({
                            crystal: crystalRef,
                            reason: `Excellent for balancing your ${missingChakra.replace(/_/g, ' ')} chakra`,
                            reasonType: "CHAKRA_BALANCE",
                            matchingProducts: products.slice(0, 3), // Top 3 products
                            productCount: products.length,
                            lowestPrice: products[0]?.variants?.[0]?.defaultPrice,
                        });
                    }
                }
            }

            // Priority 2: If we still need more recommendations, suggest complementary crystals
            if (recommendations.length < limit && coveredChakras.length > 0) {
                const complementaryCrystalIds = strongestChakra
                    ? CHAKRA_CRYSTAL_ASSOCIATIONS[strongestChakra] || []
                    : [];

                for (const crystalId of complementaryCrystalIds) {
                    if (recommendations.length >= limit) break;
                    if (collectionCrystalRefIds.has(crystalId)) continue;
                    if (recommendedIds.has(crystalId)) continue;

                    const crystalRef = allCrystalRefs.find(c => c.id === crystalId);
                    if (!crystalRef) continue;

                    const products = await context.dataSources.cosmos.run_query<product_type>(
                        "Main-Listing",
                        {
                            query: `SELECT * FROM c
                                    WHERE c.productType = 'CRYSTAL'
                                    AND c.typeData.crystal.crystalRefId = @crystalRefId
                                    AND c.isLive = true
                                    ORDER BY c.variants[0].defaultPrice.amount ASC`,
                            parameters: [{ name: "@crystalRefId", value: crystalId }],
                        }
                    );

                    if (products.length > 0) {
                        recommendedIds.add(crystalId);
                        recommendations.push({
                            crystal: crystalRef,
                            reason: `Complements your ${strongestChakra?.replace(/_/g, ' ')} chakra work`,
                            reasonType: "COMPLEMENTARY",
                            matchingProducts: products.slice(0, 3),
                            productCount: products.length,
                            lowestPrice: products[0]?.variants?.[0]?.defaultPrice,
                        });
                    }
                }
            }

            // Priority 3: If we still need more, suggest popular crystals
            if (recommendations.length < limit) {
                const popularCrystals = ["clear-quartz", "amethyst", "rose-quartz", "citrine", "black-tourmaline"];

                for (const crystalId of popularCrystals) {
                    if (recommendations.length >= limit) break;
                    if (collectionCrystalRefIds.has(crystalId)) continue;
                    if (recommendedIds.has(crystalId)) continue;

                    const crystalRef = allCrystalRefs.find(c => c.id === crystalId);
                    if (!crystalRef) continue;

                    const products = await context.dataSources.cosmos.run_query<product_type>(
                        "Main-Listing",
                        {
                            query: `SELECT * FROM c
                                    WHERE c.productType = 'CRYSTAL'
                                    AND c.typeData.crystal.crystalRefId = @crystalRefId
                                    AND c.isLive = true
                                    ORDER BY c.variants[0].defaultPrice.amount ASC`,
                            parameters: [{ name: "@crystalRefId", value: crystalId }],
                        }
                    );

                    if (products.length > 0) {
                        recommendedIds.add(crystalId);
                        recommendations.push({
                            crystal: crystalRef,
                            reason: "A popular crystal with versatile healing properties",
                            reasonType: "POPULAR",
                            matchingProducts: products.slice(0, 3),
                            productCount: products.length,
                            lowestPrice: products[0]?.variants?.[0]?.defaultPrice,
                        });
                    }
                }
            }

            return {
                recommendations,
                chakraAnalysis,
                collectionSize: collection.length,
            };
        }
    },
    Mutation: {
        create_product: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const inputRef = {
                id: args.product.id,
                partition: [args.merchantId],
                container: "Main-Listing"
            }

            // finally establish the product
            var item = args.product;
            item["type"] = ListingTypes.PRODUCT;
            item["vendorId"] = args.merchantId;
            item["isLive"] = false;  // Products start as draft until merchant goes live

            // Default productType to STANDARD if not provided
            item["productType"] = item.productType || "STANDARD";

            // Validate crystal reference if productType is CRYSTAL
            if (item.productType === "CRYSTAL") {
                if (!item.typeData?.crystal?.crystalRefId) {
                    throw new GraphQLError("Crystal products require a crystal reference", {
                        extensions: { code: 'BAD_REQUEST' }
                    });
                }

                // Verify crystal reference exists
                try {
                    await context.dataSources.cosmos.get_record(
                        CRYSTAL_REFERENCE_CONTAINER,
                        item.typeData.crystal.crystalRefId,
                        CRYSTAL_REFERENCE_CONFIG_ID
                    );
                } catch {
                    throw new GraphQLError(`Crystal reference '${item.typeData.crystal.crystalRefId}' not found`, {
                        extensions: { code: 'NOT_FOUND' }
                    });
                }
            }

            item.name = item.name

            // Generate unique slug for the product
            let baseSlug = slugify(item.name);
            let finalSlug = baseSlug;
            let counter = 1;

            // Check for slug uniqueness within the merchant
            while (true) {
                const existingSlugs = await context.dataSources.cosmos.run_query("Main-Listing", {
                    query: "SELECT VALUE c.slug FROM c WHERE c.vendorId = @vendorId AND c.slug = @slug",
                    parameters: [
                        { name: "@vendorId", value: args.merchantId },
                        { name: "@slug", value: finalSlug }
                    ]
                }, true);

                if (existingSlugs.length === 0) {
                    break; // Slug is unique
                }

                // Append counter to make it unique
                finalSlug = `${baseSlug}-${counter}`;
                counter++;
            }

            item.slug = finalSlug;

            // assign the tax code
            // txcd_99999999 General - Tangible Goods A physical good that can be moved or touched. Also known as tangible personal property.	Physical goods
            // https://docs.stripe.com/tax/tax-codes
            item.stripe = {
                tax_code: "txcd_99999999" //
            }


            // Initialize inventory for variants first (while qty_soh still exists)
            const inventoryRecordsToCreate = [];
            if (item.variants) {
                const containerName = "Main-Listing";
                const now = new Date().toISOString();

                for (const variant of item.variants) {
                    // Create inventory record if qty_soh is provided (indicating inventory tracking)
                    if (variant.qty_soh !== undefined && variant.qty_soh !== null) {
                        const inventoryRecord = {
                            id: `invv:${variant.id}`,
                            docType: "variant",
                            variant_id: variant.id,
                            product_id: item.id,
                            vendorId: args.merchantId,
                            track_inventory: true,
                            qty_on_hand: variant.qty_soh,
                            qty_committed: 0,
                            low_stock_threshold: variant.inventory?.low_stock_threshold || 5,
                            is_ooak_effective: item.is_ooak || false,
                            location_id: variant.inventory?.location_id || "default",
                            updated_at: now
                        };

                        inventoryRecordsToCreate.push({ containerName, record: inventoryRecord, partition: args.merchantId });
                    }

                    // Remove qty_soh from variant before saving to database
                    delete variant.qty_soh;
                }
            }

            // now save product to database (without qty_soh)
            await context.dataSources.cosmos.add_record("Main-Listing", item, item["vendorId"], context.userId)

            // Create inventory records
            for (const { containerName, record, partition } of inventoryRecordsToCreate) {
                await context.dataSources.cosmos.add_record(containerName, record, partition, context.userId);
            }

            return {
                code: 200,
                message: `The product ${item['name']} has been setup successfully`,
                product: await context.dataSources.cosmos.get_record("Main-Listing", item.id, item["vendorId"])
            }
        },
        upsert_product: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const containerName = "Main-Listing";
            const inventoryContainerName = "Main-Listing";
            const now = new Date().toISOString();

            // Check if product already exists
            let existingProduct: any;
            try {
                existingProduct = await context.dataSources.cosmos.get_record(containerName, args.product.id, args.merchantId);
            } catch (error) {
                // Product doesn't exist, treat as create
                existingProduct = null;
            }

            const isUpdate = existingProduct !== null;

            // Prepare the product item
            var item = { ...args.product };
            item["type"] = ListingTypes.PRODUCT;
            item["vendorId"] = args.merchantId;

            // Default productType to STANDARD if not provided (for new products)
            // or preserve existing for updates
            if (!isUpdate) {
                item["productType"] = item.productType || "STANDARD";
            } else {
                item["productType"] = item.productType || existingProduct.productType || "STANDARD";
            }

            // Validate crystal reference if productType is CRYSTAL
            if (item.productType === "CRYSTAL") {
                if (!item.typeData?.crystal?.crystalRefId) {
                    throw new GraphQLError("Crystal products require a crystal reference", {
                        extensions: { code: 'BAD_REQUEST' }
                    });
                }

                // Verify crystal reference exists
                try {
                    await context.dataSources.cosmos.get_record(
                        CRYSTAL_REFERENCE_CONTAINER,
                        item.typeData.crystal.crystalRefId,
                        CRYSTAL_REFERENCE_CONFIG_ID
                    );
                } catch {
                    throw new GraphQLError(`Crystal reference '${item.typeData.crystal.crystalRefId}' not found`, {
                        extensions: { code: 'NOT_FOUND' }
                    });
                }
            }

            // For new products, default to draft (isLive = false)
            // For updates, preserve existing isLive status
            if (!isUpdate) {
                item["isLive"] = false;
            } else {
                item["isLive"] = existingProduct.isLive ?? false;
            }

            // Handle slug generation/preservation
            if (!isUpdate || !existingProduct.slug) {
                // Generate unique slug for new products or products without slugs
                let baseSlug = slugify(item.name);
                let finalSlug = baseSlug;
                let counter = 1;

                while (true) {
                    const existingSlugs = await context.dataSources.cosmos.run_query(containerName, {
                        query: "SELECT VALUE c.slug FROM c WHERE c.vendorId = @vendorId AND c.slug = @slug AND c.id != @productId",
                        parameters: [
                            { name: "@vendorId", value: args.merchantId },
                            { name: "@slug", value: finalSlug },
                            { name: "@productId", value: item.id }
                        ]
                    }, true);

                    if (existingSlugs.length === 0) {
                        break;
                    }

                    finalSlug = `${baseSlug}-${counter}`;
                    counter++;
                }

                item.slug = finalSlug;
            } else {
                // Preserve existing slug for updates
                item.slug = existingProduct.slug;
            }

            // Assign tax code if not present
            if (!item.stripe) {
                item.stripe = {
                    tax_code: "txcd_99999999"
                }
            }

            // Handle inventory for variants
            const inventoryUpdates = [];
            if (item.variants) {
                for (const variant of item.variants) {
                    // Check if inventory tracking is requested
                    if (variant.qty_soh !== undefined && variant.qty_soh !== null) {
                        const inventoryId = `invv:${variant.id}`;

                        // Check if inventory record exists
                        let existingInventory: any;
                        try {
                            existingInventory = await context.dataSources.cosmos.get_record(inventoryContainerName, inventoryId, args.merchantId);
                        } catch (error) {
                            existingInventory = null;
                        }

                        if (existingInventory) {
                            // Update existing inventory (preserve qty_on_hand and qty_committed)
                            const updatedInventory = {
                                ...existingInventory,
                                low_stock_threshold: variant.inventory?.low_stock_threshold || existingInventory.low_stock_threshold || 5,
                                location_id: variant.inventory?.location_id || existingInventory.location_id,
                                updated_at: now
                            };
                            inventoryUpdates.push({ action: 'update', record: updatedInventory, partition: args.merchantId });
                        } else {
                            // Create new inventory record
                            const inventoryRecord = {
                                id: inventoryId,
                                docType: "variant",
                                variant_id: variant.id,
                                product_id: item.id,
                                vendorId: args.merchantId,
                                track_inventory: true,
                                qty_on_hand: variant.qty_soh,
                                qty_committed: 0,
                                low_stock_threshold: variant.inventory?.low_stock_threshold || 5,
                                is_ooak_effective: item.is_ooak || false,
                                location_id: variant.inventory?.location_id || "default",
                                updated_at: now
                            };
                            inventoryUpdates.push({ action: 'create', record: inventoryRecord, partition: args.merchantId });
                        }
                    }

                    // Remove qty_soh from variant before saving
                    delete variant.qty_soh;
                }
            }

            // Save product to database
            if (isUpdate) {
                await context.dataSources.cosmos.update_record(containerName, item.id, item, args.merchantId, context.userId);
            } else {
                await context.dataSources.cosmos.add_record(containerName, item, args.merchantId, context.userId);
            }

            // Apply inventory updates
            for (const { action, record, partition } of inventoryUpdates) {
                if (action === 'create') {
                    await context.dataSources.cosmos.add_record(inventoryContainerName, record, partition, context.userId);
                } else if (action === 'update') {
                    await context.dataSources.cosmos.update_record(inventoryContainerName, record.id, record, partition, context.userId);
                }
            }

            return {
                code: 200,
                success: true,
                message: `The product ${item['name']} has been ${isUpdate ? 'updated' : 'created'} successfully`,
                product: await context.dataSources.cosmos.get_record(containerName, item.id, args.merchantId)
            }
        },
        update_product_live_status: async (_: any, args: { merchantId: string, productId: string, isLive: boolean }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { merchantId, productId, isLive } = args;

            // Get the product
            const product = await context.dataSources.cosmos.get_record("Main-Listing", productId, merchantId);
            if (!product) {
                return {
                    code: "404",
                    success: false,
                    message: "Product not found",
                    product: null,
                    requiresOnboarding: false
                };
            }

            // If trying to go live, check if merchant has completed Stripe onboarding
            if (isLive) {
                const merchant = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", merchantId, merchantId);
                if (!merchant?.stripe?.accountId) {
                    return {
                        code: "400",
                        success: false,
                        message: "Please complete your bank account onboarding first",
                        product: product,
                        requiresOnboarding: true
                    };
                }

                // Check if Stripe account has charges enabled
                const stripeAccount = await context.dataSources.stripe.callApi("GET", `accounts/${merchant.stripe.accountId}`);
                if (stripeAccount.status !== 200 || !stripeAccount.data.charges_enabled) {
                    return {
                        code: "400",
                        success: false,
                        message: "Please complete your bank account onboarding first",
                        product: product,
                        requiresOnboarding: true
                    };
                }
            }

            // Update the product's isLive status
            await context.dataSources.cosmos.patch_record("Main-Listing", productId, merchantId, [
                { op: "set", path: "/isLive", value: isLive }
            ], context.userId);

            const updatedProduct = await context.dataSources.cosmos.get_record("Main-Listing", productId, merchantId);

            return {
                code: "200",
                success: true,
                message: isLive ? "Product is now live" : "Product is now in draft",
                product: updatedProduct,
                requiresOnboarding: false
            };
        },
        adjustInventory: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { vendorId, adjustment } = args;
            const { variant_id, delta, reason, recipient, notes } = adjustment;
            const containerName = "Main-Listing";
            const now = new Date().toISOString();
            
            // Get variant inventory
            const variantInventoryId = `invv:${variant_id}`;
            let currentInventory: any;
            
            try {
                currentInventory = await context.dataSources.cosmos.get_record<variant_inventory_type>(containerName, variantInventoryId, vendorId);
            } catch (error) {
                throw new GraphQLError("Variant inventory not found", {
                    extensions: { code: 'NOT_FOUND' }
                });
            }
            
            const qtyBefore = currentInventory.qty_on_hand;
            const qtyAfter = qtyBefore + delta;
            
            if (qtyAfter < 0) {
                throw new GraphQLError(`Insufficient inventory. Current: ${qtyBefore}, Requested: ${Math.abs(delta)}`, {
                    extensions: { code: 'INSUFFICIENT_INVENTORY' }
                });
            }
            
            // Update inventory
            const updatedInventory = {
                ...currentInventory,
                qty_on_hand: qtyAfter,
                updated_at: now
            };
            
            // Create transaction record
            const transactionId = `invt:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const transaction = {
                id: transactionId,
                docType: "transaction",
                vendorId: vendorId,
                product_id: currentInventory.product_id,
                variant_id: variant_id,
                delta,
                qty_before: qtyBefore,
                qty_after: qtyAfter,
                reason,
                source: "MANUAL",
                recipient,
                notes,
                created_at: now,
                created_by: context.userId
            };
            
            // Check for alerts
            let alert: any = undefined;
            const qtyAvailable = qtyAfter - currentInventory.qty_committed;
            const threshold = currentInventory.low_stock_threshold || 5;
            
            if (qtyAvailable <= 0) {
                const alertId = `inva:${variant_id}:OUT_OF_STOCK:${now.split('T')[0]}`;
                alert = {
                    id: alertId,
                    docType: "alert",
                    variant_id: variant_id,
                    product_id: currentInventory.product_id,
                    vendorId: vendorId,
                    alert_type: 'OUT_OF_STOCK',
                    current_qty: qtyAvailable,
                    status: 'OPEN',
                    created_at: now,
                    acknowledged: false
                };
            } else if (qtyAvailable <= threshold && qtyBefore > threshold) {
                const alertId = `inva:${variant_id}:LOW_STOCK:${now.split('T')[0]}`;
                alert = {
                    id: alertId,
                    docType: "alert",
                    variant_id: variant_id,
                    product_id: currentInventory.product_id,
                    vendorId: vendorId,
                    alert_type: 'LOW_STOCK',
                    threshold,
                    current_qty: qtyAvailable,
                    status: 'OPEN',
                    created_at: now,
                    acknowledged: false
                };
            }
            
            // Update inventory record using patch
            await context.dataSources.cosmos.patch_record(containerName, variantInventoryId, vendorId, [
                { op: "set", path: '/qty_on_hand', value: qtyAfter },
                { op: "set", path: '/updated_at', value: now }
            ], context.userId);
            
            // Add transaction record
            await context.dataSources.cosmos.add_record(containerName, transaction, vendorId, context.userId);
            
            // Add alert if needed
            if (alert) {
                await context.dataSources.cosmos.add_record(containerName, alert, vendorId, context.userId);
            }

            // Auto-allocate to backordered items if inventory increased
            let allocationMessage = '';
            if (delta > 0 && qtyAfter > 0) {
                const { auto_allocate_backorders } = await import('../order/inventory_utils');
                const allocation = await auto_allocate_backorders(
                    variant_id,
                    vendorId,
                    qtyAvailable,
                    context.dataSources.cosmos
                );

                if (allocation.allocated_count > 0) {
                    allocationMessage = ` Auto-allocated to ${allocation.allocated_count} backordered order(s).`;
                }
            }

            return {
                code: 200,
                success: true,
                message: `Inventory adjusted successfully. ${reason}: ${delta > 0 ? '+' : ''}${delta}.${allocationMessage}`,
                transaction,
                alert
            };
        },
        acknowledgeInventoryAlert: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { vendorId, alertId } = args;
            const containerName = "Main-Listing";
            const now = new Date().toISOString();
            
            const alert = await context.dataSources.cosmos.get_record<inventory_alert_type>(containerName, alertId, vendorId);
            
            if (!alert) {
                throw new GraphQLError("Alert not found", {
                    extensions: { code: 'NOT_FOUND' }
                });
            }
            
            const updatedAlert = {
                ...alert,
                acknowledged: true,
                acknowledged_at: now,
                acknowledged_by: context.userId,
                status: 'ACKED'
            };
            
            await context.dataSources.cosmos.patch_record(containerName, alertId, vendorId, [
                { op: "set", path: '/acknowledged', value: true },
                { op: "set", path: '/acknowledged_at', value: now },
                { op: "set", path: '/acknowledged_by', value: context.userId },
                { op: "set", path: '/status', value: 'ACKED' }
            ], context.userId);
                
            return {
                code: 200,
                success: true,
                message: "Alert acknowledged successfully",
                alert: updatedAlert
            };
        }
    },
    Product: {
        ref: async(parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, partition: [parent.vendorId], container: "Main-Listing"
            }
        },
        vendor: async (parent: any, _: any, { dataSources }: serverContext) => {
            return dataSources.cosmos.get_record("Main-Vendor", parent.vendorId, parent.vendorId)
        },
        soldFrom: async (parent: any, _: any, { dataSources: { cosmos } }: serverContext) => {
            const resp = await cosmos.get_scalar<{
                locations: merchantLocation_type[]
            }>("Main-Vendor", "id", "locations", parent.vendorId, parent.vendorId)
            return resp.locations.find(x => x.id == parent.soldFromLocationId)
        },
        defaultVariant: async (parent: any, _: any, _context: serverContext) => {
            return parent.variants.find(x => x.id == parent.defaultVariantId)
        },
        // Default productType to STANDARD if not present
        productType: (parent: any) => parent.productType || "STANDARD"
    },
    // Resolve crystal reference for CrystalTypeData
    CrystalTypeData: {
        crystalRef: async (parent: crystal_type_data, _: any, context: serverContext) => {
            if (!parent.crystalRefId) return null;
            try {
                return await context.dataSources.cosmos.get_record(
                    CRYSTAL_REFERENCE_CONTAINER,
                    parent.crystalRefId,
                    CRYSTAL_REFERENCE_CONFIG_ID
                );
            } catch {
                return null;
            }
        }
    },
    // Resolve crystal reference for wishlist items
    CrystalWishlistItem: {
        crystalRef: async (parent: any, _: any, context: serverContext) => {
            if (!parent.crystalRefId) return null;
            try {
                return await context.dataSources.cosmos.get_record(
                    CRYSTAL_REFERENCE_CONTAINER,
                    parent.crystalRefId,
                    CRYSTAL_REFERENCE_CONFIG_ID
                );
            } catch {
                return null;
            }
        }
    },
    Variant: {
        inventory: async (parent: any, _: any, { dataSources }: serverContext) => {
            if (!parent.vendorId) return null;
            
            const containerName = "Main-Listing";
            const inventoryId = `invv:${parent.id}`;
            
            try {
                const inventory = await dataSources.cosmos.get_record<variant_inventory_type>(containerName, inventoryId, parent.vendorId);
                return inventory;
            } catch (error) {
                return null;
            }
        },
        qty_available: async (parent: any, _: any, { dataSources }: serverContext) => {
            if (!parent.vendorId) return null;
            
            const containerName = "Main-Listing";
            const inventoryId = `invv:${parent.id}`;
            
            try {
                const inventory = await dataSources.cosmos.get_record<variant_inventory_type>(containerName, inventoryId, parent.vendorId);
                return inventory.qty_on_hand - inventory.qty_committed;
            } catch (error) {
                return null;
            }
        }
    },
    InventoryAlert: {
        variant: async (parent: inventory_alert_type, _: any, { dataSources }: serverContext) => {
            const product = await dataSources.cosmos.get_record<product_type>("Main-Listing", parent.product_id, parent.vendorId);
            return product?.variants?.find((v: any) => v.id === parent.variant_id);
        },
        product: async (parent: inventory_alert_type, _: any, { dataSources }: serverContext) => {
            return await dataSources.cosmos.get_record<product_type>("Main-Listing", parent.product_id, parent.vendorId);
        }
    },
    InventoryTransaction: {
        variant: async (parent: inventory_transaction_type, _: any, { dataSources }: serverContext) => {
            const product = await dataSources.cosmos.get_record<product_type>("Main-Listing", parent.product_id, parent.vendorId);
            return product?.variants?.find((v: any) => v.id === parent.variant_id);
        },
        product: async (parent: inventory_transaction_type, _: any, { dataSources }: serverContext) => {
            return await dataSources.cosmos.get_record<product_type>("Main-Listing", parent.product_id, parent.vendorId);
        }
    }
}

export {resolvers}