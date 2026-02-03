/**
 * Migration Registry
 *
 * All migrations must be imported and exported here.
 * Migrations are executed in alphabetical order by ID.
 */

import { Migration } from "../types";

// Import all migrations
import { migration as migration001 } from "./001_initial_containers";
import { migration as migration002 } from "./002_seed_system_data";
import { migration as migration003 } from "./003_consolidate_comments_reported";
import { migration as migration004 } from "./004_consolidate_listing_containers";
import { migration as migration005 } from "./005_seed_email_templates";
import { migration as migration006 } from "./006_reseed_email_templates";
import { migration as migration007 } from "./007_fix_email_template_format";
import { migration as migration008 } from "./008_fix_email_template_blocks";
import { migration as migration009 } from "./009_reseed_composable_templates";
import { migration as migration010 } from "./010_reassign_default_headers_footers";
import { migration as migration011 } from "./011_reseed_warmer_copy";
import { migration as migration012 } from "./012_reseed_enhanced_templates";

// Export all migrations in an array
export const migrations: Migration[] = [
    migration001,
    migration002,
    migration003,
    migration004,
    migration005,
    migration006,
    migration007,
    migration008,
    migration009,
    migration010,
    migration011,
    migration012,
];
