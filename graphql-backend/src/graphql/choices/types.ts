//#region Choice 

import { Locale, recordref_type, RecordStatus } from "../0_shared/types"

// Flat choice types
export type choice_type = {
    id: string,
    options: choice_option_type[]
}

export type choice_option_type = {
    id: string,
    defaultLabel: string,
    localizations: localization_type[],
    status: RecordStatus
}

export type localization_type = {
    locale: Locale,
    value: string
}

// Choice configuration types
export enum ChoiceKind {
    FLAT = 'FLAT',
    HIERARCHICAL = 'HIERARCHICAL'
}

// Schema types for FLAT choices
export type property_type = 'text' | 'number';

export type schema_property_type = {
    id: string,
    name: string,
    type: property_type,
    required: boolean
}

export type flat_choice_schema_type = {
    properties: schema_property_type[]
}

// Metadata schema types for hierarchical choices
export type metadata_field_type = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'PERCENTAGE' | 'CURRENCY';

export type metadata_schema_field_type = {
    id: string,
    name: string,
    type: metadata_field_type,
    required: boolean
}

export type metadata_schema_type = {
    fields: metadata_schema_field_type[]
}

export type node_metadata_type = {
    [fieldId: string]: string | number | boolean | Date
}

export type choice_config_type = {
    docType: 'choice-config',
    id: string, // This IS the backing identifier (e.g., "category", "product-types")
    kind: ChoiceKind,
    label: string,
    ref: recordref_type,
    metadataSchema?: metadata_schema_type,
    createdAt?: string,
    updatedAt: string
}

// Hierarchical choice types
export type choice_node_type = {
    configId: string,
    id: string,
    ref: recordref_type,
    type: string,
    label: string, // Default label (usually English)
    localizations: node_localization_type[],
    parentRef?: recordref_type,
    sortOrder: number,
    ancestors: string[],
    path: string,
    icon?: string,
    level: number,
    childIds: string[],
    status: RecordStatus,
    children: choice_node_type[],
    metadata?: node_metadata_type,
    createdAt?: string,
    updatedAt: string
}

export type node_localization_type = {
    locale: Locale,
    label: string,
    slug?: string
}

export type choice_flat_option_type = {
    id: string,
    label: string,
    path: string,
    slug: string,
    level: number
}

//#endregion