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
import { migration as migration013 } from "./013_seed_platform_fees";
import { migration as migration014 } from "./014_fix_platform_fee_rates";
import { migration as migration015 } from "./015_seed_subscription_plans";
import { migration as migration016 } from "./016_vendor_publication_fields";
import { migration as migration017 } from "./017_seed_multi_market_fees";
import { migration as migration018 } from "./018_remove_case_fees_from_markets";
import { migration as migration019 } from "./019_seed_legal_documents";
import { migration as migration020 } from "./020_legal_document_indexes";
import { migration as migration021 } from "./021_seed_legal_placeholders";
import { migration as migration022 } from "./022_subscription_tiers";
import { migration as migration023 } from "./023_update_tier_descriptions";
import { migration as migration024 } from "./024_update_manifest_price";
import { migration as migration025 } from "./025_update_transcend_description";
import { migration as migration026 } from "./026_rename_merchant_terms";
import { migration as migration027 } from "./027_seed_legal_documents_from_export";
import { migration as migration028 } from "./028_rebrand_merchant_terms_to_partner";

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
    migration013,
    migration014,
    migration015,
    migration016,
    migration017,
    migration018,
    migration019,
    migration020,
    migration021,
    migration022,
    migration023,
    migration024,
    migration025,
    migration026,
    migration027,
    migration028,
];
