import { serverContext } from "../../services/azFunction";
import { Locale, recordref_type, RecordStatus } from "../0_shared/types";
import { choice_type, choice_option_type, choice_config_type, choice_node_type, choice_flat_option_type, ChoiceKind } from "./types";
import { generate_human_friendly_id } from "../../utils/functions";

export const resolve_optionid = async ({ field, optionId, defaultLocale }:  { field: string, optionId: string, defaultLocale: string }, {dataSources}: serverContext) => {
    const choice = await dataSources.cosmos.get_record<choice_type>("System-Settings", field, field)
    const option = choice.options.find(opt => opt.id == optionId)
    if (option == null) throw `Could not find a choice for option Id ${optionId}`
    if (option.localizations.filter(x => x.locale == defaultLocale).length != 1) throw `Whilst a choice exists, there is no value for the default Locale of ${defaultLocale}`;
    return {
        id: option.id, 
        defaultLabel: option.localizations.filter(x => x.locale == defaultLocale)[0].value,
        localizations: option.localizations.filter(x => x.locale != defaultLocale),
        status: option.status
    } as choice_option_type
}

// Helper function to recursively delete a category and all its children
const deleteCategoryRecursive = async (nodeId: string, configId: string, context: serverContext): Promise<void> => {
    // Get the node to check for children
    const node = await context.dataSources.cosmos.get_record<choice_node_type>("System-SettingTrees", nodeId, configId);

    // If the node has children, delete them first
    if (node.childIds && node.childIds.length > 0) {
        // Delete all children recursively
        await Promise.all(
            node.childIds.map(childId => deleteCategoryRecursive(childId, configId, context))
        );
    }

    // Remove this node from its parent's childIds if it has a parent
    if (node.parentRef) {
        try {
            const parent = await context.dataSources.cosmos.get_record<choice_node_type>("System-SettingTrees", node.parentRef.id, configId);
            const childIndex = parent.childIds.indexOf(nodeId);
            if (childIndex >= 0) {
                // Use patch_record to remove this child from parent's childIds array
                await context.dataSources.cosmos.patch_record(
                    "System-SettingTrees",
                    node.parentRef.id,
                    configId,
                    [
                        { op: "remove", path: `/childIds/${childIndex}` }
                    ],
                    context.userId
                );
            }
        } catch (error) {
            // Parent might already be deleted in recursive deletion, ignore
            console.warn(`Could not update parent ${node.parentRef.id} when deleting ${nodeId}:`, error);
        }
    }

    // Finally, delete this node
    await context.dataSources.cosmos.purge_record("System-SettingTrees", nodeId, configId);
};

const resolvers = {
    Query: {
        // flat choice queries
        flatChoices: async (_: any, args: { fields: string[], defaultLocale: Locale }, context: serverContext) => {
            let items: choice_type[] = []
            if (args.fields != null) {
                items = await context.dataSources.cosmos.run_query<choice_type>("System-Settings", {
                    query: "SELECT * FROM c WHERE ARRAY_CONTAINS(@fields, c.id)",
                    parameters: [{ name: "@fields", value: args.fields }]
                });
            } else {
                items = await context.dataSources.cosmos.get_all<choice_type>("System-Settings");
            }

            var defaultLocale = args.defaultLocale == null ? Locale.EN : args.defaultLocale

            return items.map((record) => ({
                id: record.id,
                options: record.options.map((option) => {
                    if (option.localizations.filter(x => x.locale == defaultLocale).length != 1) return null;
                    return {
                     id: option.id, 
                     defaultLabel: option.localizations.filter(x => x.locale == defaultLocale)[0].value,
                     localizations: option.localizations.filter(x => x.locale != defaultLocale),
                     status: option.status
                    } as choice_option_type
                 }).filter(x => x != null)
            }))
        },
        flatChoice: async (_: any, args: { field: string, defaultLocale: Locale}, context: serverContext) => {
            
            var record = await context.dataSources.cosmos.get_record<choice_type>("System-Settings", args.field, "choice-config");
            var defaultLocale = args.defaultLocale == null ? Locale.EN : args.defaultLocale

            return {
                id: record.id,
                options: record.options.map((option) => {
                    if (option.localizations.filter(x => x.locale == defaultLocale).length != 1) return null;
                    return {
                     id: option.id, 
                     defaultLabel: option.localizations.filter(x => x.locale == defaultLocale)[0].value,
                     localizations: option.localizations.filter(x => x.locale != defaultLocale),
                     status: option.status
                    } as choice_option_type
                 }).filter(x => x != null)
            }
        },

        // choice configuration queries
        choiceConfigs: async (_: any, args: {}, context: serverContext) => {
            const configs = await context.dataSources.cosmos.run_query<choice_config_type>("System-Settings", {
                query: "SELECT * FROM c WHERE c.docType = 'choice-config'",
                parameters: []
            });
            return configs;
        },

        choiceConfig: async (_: any, args: { id: string }, context: serverContext) => {
            return await context.dataSources.cosmos.get_record<choice_config_type>("System-Settings", args.id, "choice-config");
        },

        choiceRootNodes: async (_: any, args: { ref: recordref_type, defaultLocale: Locale }, context: serverContext) => {
            const config = await context.dataSources.cosmos.get_record<choice_config_type>(args.ref.container, args.ref.id, args.ref.partition);
            if (config.kind !== ChoiceKind.HIERARCHICAL) {
                throw new Error(`Field ${args.ref.id} is not configured as hierarchical`);
            }

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
        
        choiceTreeFlat: async (_: any, args: { field: string, locale: Locale }, context: serverContext) => {
            const config = await context.dataSources.cosmos.get_record<choice_config_type>("System-Settings", args.field, "choice-config");
            if (config.kind !== ChoiceKind.HIERARCHICAL) {
                throw new Error(`Field ${args.field} is not configured as hierarchical`);
            }

            const nodes = await context.dataSources.cosmos.run_query<choice_node_type>("System-SettingTrees", {
                query: "SELECT c.id, c.label, c.path, c.level FROM c WHERE c.type = 'category' AND c.configId = @configId AND c.status = 'ACTIVE' ORDER BY c.level, c.sortOrder",
                parameters: [
                    { name: "@configId", value: config.id }
                ]
            });

            return nodes.map(node => ({
                id: node.id,
                label: node.label,
                path: node.path,
                slug: node.path?.replace('/', '') || '', // Extract slug from path
                level: node.level
            } as choice_flat_option_type));
        },

        // Convenience query for religions (follows productCategories pattern)
        religions: async (_: any, args: { defaultLocale: Locale }, context: serverContext) => {
            const config = await context.dataSources.cosmos.get_record<choice_config_type>('System-Settings', 'religions', 'choice-config');
            if (config.kind !== ChoiceKind.HIERARCHICAL) {
                throw new Error('Religions is not configured as hierarchical');
            }

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

        // Convenience query for merchant types (follows productCategories pattern)
        merchantTypes: async (_: any, args: { defaultLocale: Locale }, context: serverContext) => {
            const config = await context.dataSources.cosmos.get_record<choice_config_type>('System-Settings', 'merchant-types', 'choice-config');
            if (config.kind !== ChoiceKind.HIERARCHICAL) {
                throw new Error('Merchant types is not configured as hierarchical');
            }

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

    },

    Mutation: {
        // choice config mutations
        upsertChoiceConfig: async (_: any, args: { input: any }, context: serverContext) => {
            const now = new Date().toISOString();
            const config: Omit<choice_config_type, 'ref'> = {
                docType: 'choice-config',
                id: args.input.id || args.input.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                kind: args.input.kind,
                label: args.input.label,
                metadataSchema: args.input.metadataSchema,
                createdAt: args.input.id ? undefined : now,
                updatedAt: now
            };

            await context.dataSources.cosmos.upsert_record("System-Settings", config.id, config);
            return config;
        },

        updateMetadataSchema: async (_: any, args: { configId: string, metadataSchema: any }, context: serverContext) => {
            const config = await context.dataSources.cosmos.get_record<choice_config_type>("System-Settings", args.configId, "choice-config");
            config.metadataSchema = args.metadataSchema;
            config.updatedAt = new Date().toISOString();

            await context.dataSources.cosmos.upsert_record("System-Settings", config.id, config);
            return config;
        },

        deleteChoiceConfig: async (_: any, args: { id: string }, context: serverContext) => {
            await context.dataSources.cosmos.purge_record("System-Settings", args.id, "choice-config");
            return true;
        },

        // flat choice mutations
        upsertFlatChoiceOption: async (_: any, args: { input: any }, context: serverContext) => {
            const { choiceId, option } = args.input;

            // Get existing choice or create new one
            let choice: choice_type;
            try {
                choice = await context.dataSources.cosmos.get_record<choice_type>("System-Settings", choiceId, 'choice-config');
            } catch {
                throw new Error(`Choice with id ${choiceId} does not exist`);
            }

            // Add or update the option
            const existingOptionIndex = (choice.options ?? []).findIndex(opt => opt.id === option.id);
            const newOption = {
                id: option.id,
                defaultLabel: option.localizations.find((loc: any) => loc.locale === Locale.EN)?.value || "Unnamed",
                localizations: option.localizations,
                status: option.status
            };

            if (existingOptionIndex >= 0) {
                choice.options[existingOptionIndex] = newOption;
            } else {
                if (!choice.options) choice.options = [];
                choice.options.push(newOption);
            }

            await context.dataSources.cosmos.upsert_record("System-Settings", choice.id, choice);
            return newOption;
        },

        deleteFlatChoiceOption: async (_: any, args: { choiceId: string, optionId: string }, context: serverContext) => {
            // First get the choice to find the option index
            const choice = await context.dataSources.cosmos.get_record<choice_type>("System-Settings", args.choiceId, 'choice-config');

            // Find the index of the option to remove
            const optionIndex = choice.options.findIndex(opt => opt.id === args.optionId);
            if (optionIndex === -1) {
                throw new Error(`Option with id ${args.optionId} not found in choice ${args.choiceId}`);
            }

            // Use patch_record to remove just this option by index
            await context.dataSources.cosmos.patch_record(
                "System-Settings",
                args.choiceId,
                'choice-config',
                [
                    { op: "remove", path: `/options/${optionIndex}` }
                ],
                context.userId
            );

            return true;
        },

        // simplified hierarchical category mutations
        createCategory: async (_: any, args: { input: any }, context: serverContext) => {
            const now = new Date().toISOString();
            
            // Get the choice configuration from System-Settings
            const config = await context.dataSources.cosmos.get_record<choice_config_type>(
                args.input.configRef.container, 
                args.input.configRef.id, 
                args.input.configRef.partition
            );
            if (config.kind !== ChoiceKind.HIERARCHICAL) {
                throw new Error(`Configuration ${args.input.configRef.id} is not hierarchical`);
            }
            
            // Get sibling nodes for placement calculation
            const siblingQuery = args.input.parentRef ? {
                query: "SELECT * FROM c WHERE c.type = 'category' AND c.configId = @configId AND c.parentRef.id = @parentId AND c.status = 'ACTIVE' ORDER BY c.sortOrder",
                parameters: [
                    { name: "@configId", value: config.id },
                    { name: "@parentId", value: args.input.parentRef.id }
                ]
            } : {
                query: "SELECT * FROM c WHERE c.type = 'category' AND c.configId = @configId AND c.level = 1 AND c.status = 'ACTIVE' ORDER BY c.sortOrder",
                parameters: [
                    { name: "@configId", value: config.id }
                ]
            };
            
            const siblingNodes = await context.dataSources.cosmos.run_query<choice_node_type>("System-SettingTrees", siblingQuery);
            
            // Calculate sort order based on placement
            let sortOrder = 0;
            if (args.input.placement) {
                switch (args.input.placement.type) {
                    case 'AT_START':
                        sortOrder = siblingNodes.length > 0 ? Math.max(0, siblingNodes[0].sortOrder - 10) : 0;
                        break;
                    case 'AT_END':
                        sortOrder = siblingNodes.length > 0 ? siblingNodes[siblingNodes.length - 1].sortOrder + 10 : 0;
                        break;
                    case 'BEFORE': {
                        const refNode = siblingNodes.find(node => node.id === args.input.placement.referenceNodeId);
                        if (refNode) {
                            sortOrder = refNode.sortOrder;
                            // Reorder all nodes from reference point onwards
                            let currentSortOrder = refNode.sortOrder + 10;
                            for (let i = siblingNodes.indexOf(refNode); i < siblingNodes.length; i++) {
                                siblingNodes[i].sortOrder = currentSortOrder;
                                siblingNodes[i].updatedAt = now;
                                await context.dataSources.cosmos.upsert_record("System-SettingTrees", siblingNodes[i].id, siblingNodes[i]);
                                currentSortOrder += 10;
                            }
                        } else {
                            sortOrder = 0;
                        }
                        break;
                    }
                    case 'AFTER': {
                        const refNode = siblingNodes.find(node => node.id === args.input.placement.referenceNodeId);
                        if (refNode) {
                            sortOrder = refNode.sortOrder + 10;
                            const refIndex = siblingNodes.indexOf(refNode);
                            // Reorder all nodes after reference point
                            let currentSortOrder = refNode.sortOrder + 20;
                            for (let i = refIndex + 1; i < siblingNodes.length; i++) {
                                siblingNodes[i].sortOrder = currentSortOrder;
                                siblingNodes[i].updatedAt = now;
                                await context.dataSources.cosmos.upsert_record("System-SettingTrees", siblingNodes[i].id, siblingNodes[i]);
                                currentSortOrder += 10;
                            }
                        } else {
                            sortOrder = 0;
                        }
                        break;
                    }
                    default:
                        sortOrder = siblingNodes.length > 0 ? siblingNodes[siblingNodes.length - 1].sortOrder + 10 : 0;
                }
            } else {
                // Fallback to provided sortOrder or default
                sortOrder = args.input.sortOrder || (siblingNodes.length > 0 ? siblingNodes[siblingNodes.length - 1].sortOrder + 10 : 0);
            }
            
            // Collision-aware node creation with retry logic
            let nodeId = "";
            let attempts = 0;
            const maxAttempts = 10;
            let level = 1;
            
            // Get parent level and build complete ancestors chain recursively
            let ancestors: string[] = [];
            if (args.input.parentRef) {
                const parent = await context.dataSources.cosmos.get_record<choice_node_type>(
                    "System-SettingTrees",
                    args.input.parentRef.id,
                    args.input.configRef.id
                );
                level = parent.level + 1;

                // Build complete ancestors chain recursively
                ancestors = await buildAncestorsChain(parent, context, args.input.configRef.id);
            }

            // Retry loop for collision handling
            while (attempts < maxAttempts) {
                try {
                    nodeId = generate_human_friendly_id("CAT");

                    const node: Omit<choice_node_type, 'children' | 'ref'> = {
                        configId: args.input.configRef.id,
                        id: nodeId,
                        type: "category",
                        label: args.input.defaultLabel,
                        localizations: [],
                        parentRef: args.input.parentRef || undefined,
                        sortOrder,
                        ancestors,
                        path: `/${generateSlug(args.input.defaultLabel)}`,
                        icon: args.input.icon,
                        level,
                        childIds: [],
                        status: RecordStatus.ACTIVE,
                        metadata: args.input.metadata,
                        createdAt: now,
                        updatedAt: now
                    };

                    await context.dataSources.cosmos.upsert_record("System-SettingTrees", node.id, node);
                    
                    // Update parent to include this child
                    if (args.input.parentRef) {
                        const parent = await context.dataSources.cosmos.get_record<choice_node_type>(
                            "System-SettingTrees",
                            args.input.parentRef.id,
                            args.input.configRef.id
                        );
                        if (!parent.childIds.includes(nodeId)) {
                            parent.childIds.push(nodeId);
                            parent.updatedAt = now;
                            await context.dataSources.cosmos.upsert_record(
                                "System-SettingTrees", 
                                args.input.parentRef.id, 
                                parent
                            );
                        }
                    }
                    
                    return node;
                } catch (error: any) {
                    // Check if it's a 409 conflict (document already exists)
                    if (error.code === 409 || error.statusCode === 409) {
                        attempts++;
                        if (attempts >= maxAttempts) {
                            throw new Error(`Failed to create category after ${maxAttempts} attempts due to ID collisions`);
                        }
                        // Continue to next iteration with new ID
                        continue;
                    } else {
                        // Re-throw non-collision errors
                        throw error;
                    }
                }
            }
            
            throw new Error(`Failed to create category after ${maxAttempts} attempts`);
        },

        updateCategory: async (_: any, args: { id: string, input: any, configId: string }, context: serverContext) => {
            const node = await context.dataSources.cosmos.get_record<choice_node_type>("System-SettingTrees", args.id, args.configId);
            
            if (args.input.defaultLabel) node.label = args.input.defaultLabel;
            if (args.input.sortOrder !== undefined) node.sortOrder = args.input.sortOrder;
            if (args.input.icon !== undefined) node.icon = args.input.icon;
            if (args.input.metadata !== undefined) node.metadata = args.input.metadata;
            node.updatedAt = new Date().toISOString();

            await context.dataSources.cosmos.upsert_record("System-SettingTrees", node.id, node);
            return node;
        },

        deleteCategory: async (_: any, args: { id: string, configId: string }, context: serverContext) => {
            // Recursively delete this category and all its children
            await deleteCategoryRecursive(args.id, args.configId, context);
            return true;
        },

        moveCategory: async (_: any, args: { id: string, newParentId?: string, configId: string }, context: serverContext) => {
            const node = await context.dataSources.cosmos.get_record<choice_node_type>("System-SettingTrees", args.id, args.configId);
            
            // Remove from old parent
            if (node.parentRef) {
                const oldParent = await context.dataSources.cosmos.get_record<choice_node_type>("System-SettingTrees", node.parentRef.id, args.configId);
                oldParent.childIds = oldParent.childIds.filter(childId => childId !== args.id);
                await context.dataSources.cosmos.upsert_record("System-SettingTrees", node.parentRef.id, oldParent);
            }

            // Add to new parent and recalculate ancestors
            if (args.newParentId) {
                const newParent = await context.dataSources.cosmos.get_record<choice_node_type>("System-SettingTrees", args.newParentId, args.configId);
                newParent.childIds.push(args.id);
                node.parentRef = {
                    id: args.newParentId,
                    container: "System-SettingTrees",
                    partition: [args.configId]
                };
                node.level = newParent.level + 1;

                // Recalculate ancestors for new parent hierarchy
                node.ancestors = await buildAncestorsChain(newParent, context, args.configId);

                await context.dataSources.cosmos.upsert_record("System-SettingTrees", args.newParentId, newParent);
            } else {
                node.parentRef = undefined;
                node.level = 1;
                node.ancestors = []; // Root node has no ancestors
            }

            node.updatedAt = new Date().toISOString();
            await context.dataSources.cosmos.upsert_record("System-SettingTrees", args.id, node);

            // Recursively update all descendants to have correct ancestors and levels
            await updateDescendantsAncestors(args.id, args.configId, context);

            return node;
        }
    },

    ChoiceNode: {
        ref: async (node: choice_node_type, _: any, __: serverContext) => {
            return {
                id: node.id,
                partition: [node.configId],
                container: "System-SettingTrees"
            }
        },
        children: async (node: choice_node_type, _: any, context: serverContext) => {
            if (!node.childIds || node.childIds.length === 0) {
                return [];
            }
            
            const children = await context.dataSources.cosmos.run_query<choice_node_type>("System-SettingTrees", {
                query: "SELECT * FROM c WHERE c.type = 'category' AND c.configId = @configId AND ARRAY_CONTAINS(@childIds, c.id, true) AND c.status = 'ACTIVE' ORDER BY c.sortOrder",
                parameters: [
                    { name: "@configId", value: node.configId },
                    { name: "@childIds", value: node.childIds }
                ]
            });
            
            return children;
        }
    },

    ChoiceConfig: {
        ref: async (config: choice_config_type, _: any, __: serverContext) => {
            return {
                id: config.id,
                partition: ["choice-config"],
                container: "System-Settings"
            }
        }
    }
}

// Helper function to build node tree with children
export const buildNodeTree = async (node: choice_node_type, context: serverContext, config: choice_config_type): Promise<choice_node_type> => {
    // Add ref field to current node
    node.ref = {
        id: node.id,
        partition: [node.configId],
        container: "System-SettingTrees"
    };

    if (node.childIds && node.childIds.length > 0) {
        const children = await context.dataSources.cosmos.run_query<choice_node_type>("System-SettingTrees", {
            query: "SELECT * FROM c WHERE c.type = 'category' AND c.configId = @configId AND ARRAY_CONTAINS(@childIds, c.id, true) AND c.status = 'ACTIVE' ORDER BY c.sortOrder",
            parameters: [
                { name: "@configId", value: config.id },
                { name: "@childIds", value: node.childIds }
            ]
        });
        
        // Recursively build children (limit depth to avoid infinite recursion)
        if (node.level < 3) {
            node.children = await Promise.all(children.map(child => buildNodeTree(child, context, config)));
        } else {
            node.children = children.map(child => ({ 
                ...child, 
                children: [],
                ref: {
                    id: child.id,
                    partition: [child.configId],
                    container: "System-SettingTrees"
                }
            }));
        }
    } else {
        node.children = [];
    }
    
    return node;
};

// Helper function to recursively build complete ancestors chain
const buildAncestorsChain = async (node: choice_node_type, context: serverContext, configId: string): Promise<string[]> => {
    const ancestors: string[] = [];

    // Recursively traverse up the parent chain
    let currentNode = node;
    while (currentNode.parentRef) {
        ancestors.unshift(currentNode.id); // Add to beginning to maintain order from root to parent

        // Get the parent node
        currentNode = await context.dataSources.cosmos.get_record<choice_node_type>(
            "System-SettingTrees",
            currentNode.parentRef.id,
            configId
        );
    }

    // Add the root node (node with no parent)
    ancestors.unshift(currentNode.id);

    return ancestors;
};

// Helper function to recursively update ancestors for all descendants when a node is moved
const updateDescendantsAncestors = async (nodeId: string, configId: string, context: serverContext): Promise<void> => {
    const node = await context.dataSources.cosmos.get_record<choice_node_type>("System-SettingTrees", nodeId, configId);

    // Update all direct children
    if (node.childIds && node.childIds.length > 0) {
        for (const childId of node.childIds) {
            const child = await context.dataSources.cosmos.get_record<choice_node_type>("System-SettingTrees", childId, configId);

            // Recalculate child's ancestors based on its current parent (the moved node)
            child.ancestors = [...node.ancestors, node.id];
            child.level = node.level + 1;
            child.updatedAt = new Date().toISOString();

            await context.dataSources.cosmos.upsert_record("System-SettingTrees", childId, child);

            // Recursively update this child's descendants
            await updateDescendantsAncestors(childId, configId, context);
        }
    }
};

// Helper function to generate URL-safe slugs
const generateSlug = (text: string): string => {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
};

export { resolvers }