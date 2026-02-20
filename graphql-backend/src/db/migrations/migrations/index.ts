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
import { migration as migration029 } from "./029_update_tier_feature_gates";
import { migration as migration030 } from "./030_per_spread_reading_fees";
import { migration as migration031 } from "./031_add_reading_base_prices";
import { migration as migration032 } from "./032_fix_subscription_email_templates";
import { migration as migration033 } from "./033_add_astrology_reading_fees";
import { migration as migration034 } from "./034_add_spiritual_interests_to_categories";
import { migration as migration035 } from "./035_rebrand_legal_docs_to_partner";
import { migration as migration036 } from "./036_standardize_refund_language";
import { migration as migration037 } from "./037_genericize_base_documents";
import { migration as migration038 } from "./038_seed_country_supplements";
import { migration as migration039 } from "./039_seed_subscription_terms";
import { migration as migration040 } from "./040_add_illuminate_tier";
import { migration as migration041 } from "./041_create_payment_links_container";
import { migration as migration042 } from "./042_seed_payment_link_email_templates";
import { migration as migration043 } from "./043_add_live_assist_feature_gate";
import { migration as migration044 } from "./044_create_live_session_containers";
import { migration as migration045 } from "./045_seed_live_assist_email_templates";

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
    migration029,
    migration030,
    migration031,
    migration032,
    migration033,
    migration034,
    migration035,
    migration036,
    migration037,
    migration038,
    migration039,
    migration040,
    migration041,
    migration042,
    migration043,
    migration044,
    migration045,
];
