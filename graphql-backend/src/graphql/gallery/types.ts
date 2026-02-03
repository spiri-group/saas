import { recordref_type } from "../0_shared/types";

// Gallery type aliases
export type gallery_item_type_enum = 'photo' | 'video';
export type gallery_item_layout_enum = 'single' | 'double';

export interface gallery_category_type {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  groupCount: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  // Cosmos DB fields
  _id?: string;
  vendorId: string;
  docType: 'Category';
}

export interface gallery_album_type {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  // Cosmos DB fields
  _id?: string;
  vendorId: string;
  docType: 'Album';
}

export interface gallery_group_type {
  id: string;
  merchantId: string;
  categoryId: string;
  name: string;
  description?: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  // Cosmos DB fields
  _id?: string;
  vendorId: string;
  docType: 'Group';
}

export interface gallery_item_type {
  id: string;
  merchantId: string;
  categoryId?: string;
  albumId?: string;
  groupId?: string;
  type: gallery_item_type_enum;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  layout: gallery_item_layout_enum;
  linkedProducts?: linked_product_type[];
  tags?: string[];
  usedBytes?: number;
  createdAt: string;
  updatedAt: string;
  _id?: string;
  vendorId: string;
  docType: 'Item';
  ref: recordref_type;
}

export interface linked_product_type {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl?: string;
  price?: {
    amount: number;
    currency: string;
  };
}

export interface create_gallery_category_input {
  merchantId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface create_gallery_album_input {
  merchantId: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
}

export interface create_gallery_group_input {
  merchantId: string;
  categoryId: string;
  name: string;
  description?: string;
}

export interface create_gallery_item_input {
  merchantId: string;
  categoryId?: string;
  albumId?: string;
  groupId?: string;
  type: gallery_item_type_enum;
  title: string;
  description?: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  layout: gallery_item_layout_enum;
  linkedProducts?: linked_product_type[];
  tags?: string[];
  usedBytes?: number;
}

export interface update_gallery_category_input {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

export interface update_gallery_album_input {
  id: string;
  name?: string;
  description?: string;
  coverImageUrl?: string;
}

export interface update_gallery_group_input {
  id: string;
  name?: string;
  description?: string;
}

export interface update_gallery_item_input {
  id: string;
  title?: string;
  description?: string;
  layout?: gallery_item_layout_enum;
  categoryId?: string;
  albumId?: string;
  groupId?: string;
  linkedProducts?: linked_product_type[];
  tags?: string[];
}

export interface upsert_gallery_item_input {
  id?: string; // If provided, will update existing item; if not, will create new item
  merchantId: string;
  categoryId?: string;
  albumId?: string;
  groupId?: string;
  type: gallery_item_type_enum;
  title: string;
  description?: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  layout: gallery_item_layout_enum;
  linkedProducts?: linked_product_type[];
  tags?: string[];
  usedBytes?: number;
}

export interface gallery_filters {
  categoryId?: string;
  albumId?: string;
  groupId?: string;
  type?: gallery_item_type_enum;
  layout?: gallery_item_layout_enum;
  tags?: string[];
  unalbumedOnly?: boolean;
}