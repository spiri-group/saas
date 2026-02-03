import { serverContext } from "../../services/azFunction";
import { RecordStatus } from "../0_shared/types";
import {
  crystal_reference_type,
  CRYSTAL_REFERENCE_CONFIG_ID,
  CRYSTAL_REFERENCE_CONTAINER,
  create_crystal_reference_input,
  update_crystal_reference_input,
  crystal_reference_filters,
} from "./types";

// Helper to generate URL-safe slug from name
const generateCrystalId = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const resolvers = {
  Query: {
    // Get all crystals with optional filtering
    crystalReferences: async (
      _: any,
      args: { filters?: crystal_reference_filters },
      context: serverContext
    ) => {
      let query = `SELECT * FROM c WHERE c.configId = @configId AND c.docType = 'crystal'`;
      const parameters: { name: string; value: any }[] = [
        { name: "@configId", value: CRYSTAL_REFERENCE_CONFIG_ID },
      ];

      if (args.filters) {
        // Full-text search on name, alternateNames, description
        if (args.filters.search) {
          query += ` AND (
            CONTAINS(LOWER(c.name), LOWER(@search)) OR
            CONTAINS(LOWER(c.description), LOWER(@search)) OR
            EXISTS(SELECT VALUE n FROM n IN c.alternateNames WHERE CONTAINS(LOWER(n), LOWER(@search)))
          )`;
          parameters.push({ name: "@search", value: args.filters.search });
        }

        // Filter by colors (any match)
        if (args.filters.colors && args.filters.colors.length > 0) {
          query += ` AND EXISTS(SELECT VALUE col FROM col IN c.colors WHERE ARRAY_CONTAINS(@colors, col))`;
          parameters.push({ name: "@colors", value: args.filters.colors });
        }

        // Filter by chakras (any match)
        if (args.filters.chakras && args.filters.chakras.length > 0) {
          query += ` AND EXISTS(SELECT VALUE ch FROM ch IN c.chakras WHERE ARRAY_CONTAINS(@chakras, ch))`;
          parameters.push({ name: "@chakras", value: args.filters.chakras });
        }

        // Filter by elements (any match)
        if (args.filters.elements && args.filters.elements.length > 0) {
          query += ` AND EXISTS(SELECT VALUE el FROM el IN c.elements WHERE ARRAY_CONTAINS(@elements, el))`;
          parameters.push({ name: "@elements", value: args.filters.elements });
        }

        // Filter by zodiac signs (any match)
        if (args.filters.zodiacSigns && args.filters.zodiacSigns.length > 0) {
          query += ` AND EXISTS(SELECT VALUE z FROM z IN c.zodiacSigns WHERE ARRAY_CONTAINS(@zodiacSigns, z))`;
          parameters.push({ name: "@zodiacSigns", value: args.filters.zodiacSigns });
        }

        // Filter by properties (any match in primaryProperties)
        if (args.filters.properties && args.filters.properties.length > 0) {
          query += ` AND EXISTS(SELECT VALUE p FROM p IN c.primaryProperties WHERE ARRAY_CONTAINS(@properties, LOWER(p)))`;
          parameters.push({
            name: "@properties",
            value: args.filters.properties.map((p) => p.toLowerCase()),
          });
        }
      }

      query += ` ORDER BY c.name`;

      const crystals = await context.dataSources.cosmos.run_query<crystal_reference_type>(
        CRYSTAL_REFERENCE_CONTAINER,
        { query, parameters }
      );

      return {
        crystals,
        totalCount: crystals.length,
      };
    },

    // Get a single crystal by ID
    crystalReference: async (
      _: any,
      args: { id: string },
      context: serverContext
    ) => {
      try {
        return await context.dataSources.cosmos.get_record<crystal_reference_type>(
          CRYSTAL_REFERENCE_CONTAINER,
          args.id,
          CRYSTAL_REFERENCE_CONFIG_ID
        );
      } catch {
        return null;
      }
    },

    // Search crystals by name (for autocomplete)
    searchCrystals: async (
      _: any,
      args: { query: string; limit?: number },
      context: serverContext
    ) => {
      const limit = args.limit || 10;
      const crystals = await context.dataSources.cosmos.run_query<crystal_reference_type>(
        CRYSTAL_REFERENCE_CONTAINER,
        {
          query: `SELECT TOP @limit * FROM c
                  WHERE c.configId = @configId
                  AND c.docType = 'crystal'
                  AND (
                    CONTAINS(LOWER(c.name), LOWER(@search)) OR
                    EXISTS(SELECT VALUE n FROM n IN c.alternateNames WHERE CONTAINS(LOWER(n), LOWER(@search)))
                  )
                  ORDER BY c.name`,
          parameters: [
            { name: "@configId", value: CRYSTAL_REFERENCE_CONFIG_ID },
            { name: "@search", value: args.query },
            { name: "@limit", value: limit },
          ],
        }
      );
      return crystals;
    },

    // Get crystals by property
    crystalsByProperty: async (
      _: any,
      args: { property: string },
      context: serverContext
    ) => {
      const crystals = await context.dataSources.cosmos.run_query<crystal_reference_type>(
        CRYSTAL_REFERENCE_CONTAINER,
        {
          query: `SELECT * FROM c
                  WHERE c.configId = @configId
                  AND c.docType = 'crystal'
                  AND EXISTS(SELECT VALUE p FROM p IN c.primaryProperties WHERE CONTAINS(LOWER(p), LOWER(@property)))
                  ORDER BY c.name`,
          parameters: [
            { name: "@configId", value: CRYSTAL_REFERENCE_CONFIG_ID },
            { name: "@property", value: args.property },
          ],
        }
      );
      return crystals;
    },

    // Get crystals by chakra
    crystalsByChakra: async (
      _: any,
      args: { chakra: string },
      context: serverContext
    ) => {
      const crystals = await context.dataSources.cosmos.run_query<crystal_reference_type>(
        CRYSTAL_REFERENCE_CONTAINER,
        {
          query: `SELECT * FROM c
                  WHERE c.configId = @configId
                  AND c.docType = 'crystal'
                  AND ARRAY_CONTAINS(c.chakras, @chakra)
                  ORDER BY c.name`,
          parameters: [
            { name: "@configId", value: CRYSTAL_REFERENCE_CONFIG_ID },
            { name: "@chakra", value: args.chakra },
          ],
        }
      );
      return crystals;
    },
  },

  Mutation: {
    // Create a new crystal reference
    createCrystalReference: async (
      _: any,
      args: { input: create_crystal_reference_input },
      context: serverContext
    ) => {
      const now = new Date().toISOString();
      const id = args.input.id || generateCrystalId(args.input.name);

      // Check if crystal already exists
      try {
        const existing = await context.dataSources.cosmos.get_record(
          CRYSTAL_REFERENCE_CONTAINER,
          id,
          CRYSTAL_REFERENCE_CONFIG_ID
        );
        if (existing) {
          return {
            success: false,
            message: `Crystal with ID '${id}' already exists`,
            crystal: null,
          };
        }
      } catch {
        // Crystal doesn't exist, we can create it
      }

      const crystal: crystal_reference_type = {
        id,
        configId: CRYSTAL_REFERENCE_CONFIG_ID,
        docType: "crystal",
        name: args.input.name,
        alternateNames: args.input.alternateNames || [],
        description: args.input.description,
        colors: args.input.colors,
        crystalSystem: args.input.crystalSystem,
        mohsHardness: args.input.mohsHardness,
        commonForms: args.input.commonForms,
        chakras: args.input.chakras,
        elements: args.input.elements,
        zodiacSigns: args.input.zodiacSigns,
        planetaryAssociation: args.input.planetaryAssociation,
        numerology: args.input.numerology,
        primaryProperties: args.input.primaryProperties,
        emotionalUses: args.input.emotionalUses || [],
        spiritualUses: args.input.spiritualUses || [],
        physicalAssociations: args.input.physicalAssociations || [],
        cleansingMethods: args.input.cleansingMethods,
        chargingMethods: args.input.chargingMethods,
        avoidMethods: args.input.avoidMethods || [],
        careNotes: args.input.careNotes,
        localities: args.input.localities,
        thumbnail: args.input.thumbnail,
        status: RecordStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      await context.dataSources.cosmos.add_record(
        CRYSTAL_REFERENCE_CONTAINER,
        crystal,
        CRYSTAL_REFERENCE_CONFIG_ID,
        context.userId || "SYSTEM"
      );

      return {
        success: true,
        message: "Crystal created successfully",
        crystal,
      };
    },

    // Update an existing crystal reference
    updateCrystalReference: async (
      _: any,
      args: { input: update_crystal_reference_input },
      context: serverContext
    ) => {
      const now = new Date().toISOString();

      try {
        const existing = await context.dataSources.cosmos.get_record<crystal_reference_type>(
          CRYSTAL_REFERENCE_CONTAINER,
          args.input.id,
          CRYSTAL_REFERENCE_CONFIG_ID
        );

        const updated: crystal_reference_type = {
          ...existing,
          ...args.input,
          updatedAt: now,
        };

        await context.dataSources.cosmos.update_record(
          CRYSTAL_REFERENCE_CONTAINER,
          args.input.id,
          CRYSTAL_REFERENCE_CONFIG_ID,
          updated,
          context.userId || "SYSTEM"
        );

        return {
          success: true,
          message: "Crystal updated successfully",
          crystal: updated,
        };
      } catch (error) {
        return {
          success: false,
          message: `Crystal with ID '${args.input.id}' not found`,
          crystal: null,
        };
      }
    },

    // Delete a crystal reference
    deleteCrystalReference: async (
      _: any,
      args: { id: string },
      context: serverContext
    ) => {
      try {
        await context.dataSources.cosmos.delete_record(
          CRYSTAL_REFERENCE_CONTAINER,
          args.id,
          CRYSTAL_REFERENCE_CONFIG_ID,
          context.userId || "SYSTEM"
        );

        return {
          success: true,
          message: "Crystal deleted successfully",
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to delete crystal: ${error}`,
        };
      }
    },

    // Bulk import crystals
    bulkImportCrystals: async (
      _: any,
      args: { crystals: create_crystal_reference_input[] },
      context: serverContext
    ) => {
      const now = new Date().toISOString();
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const input of args.crystals) {
        try {
          const id = input.id || generateCrystalId(input.name);

          const crystal: crystal_reference_type = {
            id,
            configId: CRYSTAL_REFERENCE_CONFIG_ID,
            docType: "crystal",
            name: input.name,
            alternateNames: input.alternateNames || [],
            description: input.description,
            colors: input.colors,
            crystalSystem: input.crystalSystem,
            mohsHardness: input.mohsHardness,
            commonForms: input.commonForms,
            chakras: input.chakras,
            elements: input.elements,
            zodiacSigns: input.zodiacSigns,
            planetaryAssociation: input.planetaryAssociation,
            numerology: input.numerology,
            primaryProperties: input.primaryProperties,
            emotionalUses: input.emotionalUses || [],
            spiritualUses: input.spiritualUses || [],
            physicalAssociations: input.physicalAssociations || [],
            cleansingMethods: input.cleansingMethods,
            chargingMethods: input.chargingMethods,
            avoidMethods: input.avoidMethods || [],
            careNotes: input.careNotes,
            localities: input.localities,
            thumbnail: input.thumbnail,
            status: RecordStatus.ACTIVE,
            createdAt: now,
            updatedAt: now,
          };

          await context.dataSources.cosmos.upsert_record(
            CRYSTAL_REFERENCE_CONTAINER,
            id,
            crystal
          );
          imported++;
        } catch (error) {
          failed++;
          errors.push(`Failed to import ${input.name}: ${error}`);
        }
      }

      return {
        success: failed === 0,
        imported,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
  },

  // Type resolver for CrystalReference
  CrystalReference: {
    ref: (crystal: crystal_reference_type) => ({
      id: crystal.id,
      partition: [CRYSTAL_REFERENCE_CONFIG_ID],
      container: CRYSTAL_REFERENCE_CONTAINER,
    }),
  },
};

export { resolvers };
