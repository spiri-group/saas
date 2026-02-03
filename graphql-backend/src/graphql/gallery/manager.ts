import { CosmosDataSource } from "../../utils/database";
import { StorageDataSource } from "../../services/storage";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import {
    gallery_category_type,
    gallery_album_type,
    gallery_group_type,
    gallery_item_type,
    create_gallery_category_input,
    create_gallery_album_input,
    create_gallery_group_input,
    create_gallery_item_input,
    update_gallery_category_input,
    update_gallery_album_input,
    update_gallery_group_input,
    update_gallery_item_input,
    upsert_gallery_item_input,
    gallery_filters
} from "./types";
import { vendor_type } from "../vendor/types";

export class GalleryManager {
    private containerName = "Main-Gallery";
    private cosmos: CosmosDataSource;
    private storage: StorageDataSource;

    constructor(cosmos: CosmosDataSource, storage: StorageDataSource) {
        this.cosmos = cosmos;
        this.storage = storage;
    }

    // Categories
    async getGalleryCategories(merchantId: string): Promise<gallery_category_type[]> {
        const querySpec = {
            query: "SELECT * FROM c WHERE c.vendorId = @vendorId AND c.docType = @docType ORDER BY c.sortOrder ASC, c.name ASC",
            parameters: [
                { name: "@vendorId", value: merchantId },
                { name: "@docType", value: "Category" }
            ]
        };

        const results = await this.cosmos.run_query<gallery_category_type>(this.containerName, querySpec);
        
        // Update counts for each category
        for (const category of results) {
            const groupCount = await this.getGroupCount(merchantId, category.id);
            const itemCount = await this.getItemCount(merchantId, category.id);
            category.groupCount = groupCount;
            category.itemCount = itemCount;
        }

        return results;
    }

    async createGalleryCategory(input: create_gallery_category_input, userId: string): Promise<gallery_category_type> {
        const id = uuid();
        const now = DateTime.now().toISO();
        
        // Get next sort order
        const existingCategories = await this.getGalleryCategories(input.merchantId);
        const maxSortOrder = Math.max(0, ...existingCategories.map(c => c.sortOrder || 0));

        const category: Omit<gallery_category_type, '_id'> = {
            id,
            merchantId: input.merchantId,
            vendorId: input.merchantId, // Partition key
            docType: 'Category',
            name: input.name,
            description: input.description,
            color: input.color,
            icon: input.icon,
            sortOrder: maxSortOrder + 1,
            groupCount: 0,
            itemCount: 0,
            createdAt: now,
            updatedAt: now
        };

        return await this.cosmos.add_record<gallery_category_type>(this.containerName, category, input.merchantId, userId);
    }

    async updateGalleryCategory(input: update_gallery_category_input, merchantId: string, userId: string): Promise<gallery_category_type> {
        const category = await this.cosmos.get_record_by_doctype<gallery_category_type>(this.containerName, input.id, merchantId, "Category");
        
        if (!category) {
            throw new Error("Category not found");
        }
        
        const updates: any = {
            updatedAt: DateTime.now().toISO()
        };

        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        if (input.color !== undefined) updates.color = input.color;
        if (input.icon !== undefined) updates.icon = input.icon;
        if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

        await this.cosmos.update_record(this.containerName, input.id, merchantId, updates, userId);
        return await this.cosmos.get_record<gallery_category_type>(this.containerName, input.id, merchantId);
    }

    async deletegallery_category(categoryId: string, merchantId: string, userId: string): Promise<boolean> {
        // First check if there are groups in this category
        const groups = await this.getgallery_groups(merchantId, categoryId);
        if (groups.length > 0) {
            throw new Error("Cannot delete category with groups. Please delete all groups first.");
        }

        // Check if there are items directly in this category
        const items = await this.getGalleryItems(merchantId, { categoryId });
        if (items.length > 0) {
            throw new Error("Cannot delete category with items. Please move or delete all items first.");
        }

        await this.cosmos.delete_record(this.containerName, categoryId, merchantId, userId);
        return true;
    }

    // Albums
    async getGalleryAlbums(merchantId: string): Promise<gallery_album_type[]> {
        const querySpec = {
            query: "SELECT * FROM c WHERE c.vendorId = @vendorId AND c.docType = @docType ORDER BY c.name ASC",
            parameters: [
                { name: "@vendorId", value: merchantId },
                { name: "@docType", value: "Album" }
            ]
        };

        const results = await this.cosmos.run_query<gallery_album_type>(this.containerName, querySpec);
        
        // Update counts and add refs for each album
        for (const album of results) {
            const itemCount = await this.getItemCount(merchantId, undefined, undefined, album.id);
            album.itemCount = itemCount;
        }

        return results;
    }

    async createGalleryAlbum(input: create_gallery_album_input, userId: string): Promise<gallery_album_type> {
        const id = uuid();
        const now = DateTime.now().toISO();

        const album: Omit<gallery_album_type, '_id'> = {
            id,
            merchantId: input.merchantId,
            vendorId: input.merchantId,
            docType: 'Album',
            name: input.name,
            description: input.description,
            coverImageUrl: input.coverImageUrl,
            itemCount: 0,
            createdAt: now,
            updatedAt: now
        };

        return await this.cosmos.add_record<gallery_album_type>(this.containerName, album, input.merchantId, userId);
    }

    async updateGalleryAlbum(input: update_gallery_album_input, merchantId: string, userId: string): Promise<gallery_album_type> {
        const album = await this.cosmos.get_record_by_doctype<gallery_album_type>(this.containerName, input.id, merchantId, "Album");
        
        if (!album) {
            throw new Error("Album not found");
        }
        
        const updates: any = {
            updatedAt: DateTime.now().toISO()
        };

        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        if (input.coverImageUrl !== undefined) updates.coverImageUrl = input.coverImageUrl;

        await this.cosmos.update_record(this.containerName, input.id, merchantId, updates, userId);
        return await this.cosmos.get_record<gallery_album_type>(this.containerName, input.id, merchantId);
    }

    async deleteGalleryAlbum(albumId: string, merchantId: string, userId: string): Promise<boolean> {
        // Move items in this album to no album
        const items = await this.getGalleryItems(merchantId, { albumId });
        for (const item of items) {
            await this.cosmos.update_record(this.containerName, item.id, merchantId, { 
                albumId: undefined,
                updatedAt: DateTime.now().toISO()
            }, userId);
        }

        await this.cosmos.delete_record(this.containerName, albumId, merchantId, userId);
        return true;
    }

    // Groups
    async getgallery_groups(merchantId: string, categoryId?: string): Promise<gallery_group_type[]> {
        const querySpec = {
            query: categoryId
                ? "SELECT * FROM c WHERE c.vendorId = @vendorId AND c.docType = @docType AND c.categoryId = @categoryId ORDER BY c.name ASC"
                : "SELECT * FROM c WHERE c.vendorId = @vendorId AND c.docType = @docType ORDER BY c.name ASC",
            parameters: [
                { name: "@vendorId", value: merchantId },
                { name: "@docType", value: "Group" },
                ...(categoryId ? [{ name: "@categoryId", value: categoryId }] : [])
            ]
        };

        const results = await this.cosmos.run_query<gallery_group_type>(this.containerName, querySpec);
        
        // Update counts for each group
        for (const group of results) {
            const itemCount = await this.getItemCount(merchantId, undefined, group.id);
            group.itemCount = itemCount;
        }

        return results;
    }

    async createGalleryGroup(input: create_gallery_group_input, userId: string): Promise<gallery_group_type> {
        const id = uuid();
        const now = DateTime.now().toISO();

        const group: Omit<gallery_group_type, '_id'> = {
            id,
            merchantId: input.merchantId,
            vendorId: input.merchantId,
            docType: 'Group',
            categoryId: input.categoryId,
            name: input.name,
            description: input.description,
            itemCount: 0,
            createdAt: now,
            updatedAt: now
        };

        const result = await this.cosmos.add_record<gallery_group_type>(this.containerName, group, input.merchantId, userId);
        
        // Update category group count
        await this.updateCategoryCounts(input.merchantId, input.categoryId);
        
        return result;
    }

    async updateGalleryGroup(input: update_gallery_group_input, merchantId: string, userId: string): Promise<gallery_group_type> {
        const group = await this.cosmos.get_record_by_doctype<gallery_group_type>(this.containerName, input.id, merchantId, "Group");
        
        if (!group) {
            throw new Error("Group not found");
        }
        
        const updates: any = {
            updatedAt: DateTime.now().toISO()
        };

        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;

        await this.cosmos.update_record(this.containerName, input.id, merchantId, updates, userId);
        return await this.cosmos.get_record<gallery_group_type>(this.containerName, input.id, merchantId);
    }

    async deletegallery_group(groupId: string, merchantId: string, userId: string): Promise<boolean> {
        const group = await this.cosmos.get_record<gallery_group_type>(this.containerName, groupId, merchantId);
        
        // Move items in this group to ungrouped
        const items = await this.getGalleryItems(merchantId, { groupId });
        for (const item of items) {
            await this.cosmos.update_record(this.containerName, item.id, merchantId, { 
                groupId: undefined,
                updatedAt: DateTime.now().toISO()
            }, userId);
        }

        await this.cosmos.delete_record(this.containerName, groupId, merchantId, userId);
        
        // Update category counts
        await this.updateCategoryCounts(merchantId, group.categoryId);
        
        return true;
    }

    // Items
    async getGalleryItems(merchantId: string, filters?: gallery_filters): Promise<gallery_item_type[]> {
        let query = "SELECT * FROM c WHERE c.vendorId = @vendorId AND c.docType = @docType";
        const parameters: any[] = [
            { name: "@vendorId", value: merchantId },
            { name: "@docType", value: "Item" }
        ];

        if (filters?.categoryId) {
            query += " AND c.categoryId = @categoryId";
            parameters.push({ name: "@categoryId", value: filters.categoryId });
        }

        if (filters?.albumId) {
            query += " AND c.albumId = @albumId";
            parameters.push({ name: "@albumId", value: filters.albumId });
        }

        if (filters?.unalbumedOnly) {
            query += " AND (NOT IS_DEFINED(c.albumId) OR c.albumId = null OR c.albumId = '')";
        }

        if (filters?.type) {
            query += " AND c.type = @type";
            parameters.push({ name: "@type", value: filters.type });
        }

        if (filters?.layout) {
            query += " AND c.layout = @layout";
            parameters.push({ name: "@layout", value: filters.layout });
        }

        if (filters?.tags && filters.tags.length > 0) {
            query += " AND ARRAY_CONTAINS(c.tags, @tag)";
            parameters.push({ name: "@tag", value: filters.tags[0] }); // For now, support single tag
        }

        query += " ORDER BY c.createdAt DESC";

        const querySpec = { query, parameters };
        return await this.cosmos.run_query<gallery_item_type>(this.containerName, querySpec);
    }

    async getCataloguegallery_items(merchantId: string, limit: number = 10): Promise<gallery_item_type[]> {
        const querySpec = {
            query: `SELECT TOP ${limit} * FROM c WHERE c.vendorId = @vendorId AND c.docType = @docType ORDER BY c.createdAt DESC`,
            parameters: [
                { name: "@vendorId", value: merchantId },
                { name: "@docType", value: "Item" }
            ]
        };

        return await this.cosmos.run_query<gallery_item_type>(this.containerName, querySpec);
    }

    async getGalleryItemsPaginated(merchantId: string, filters?: gallery_filters, offset: number = 0, limit: number = 12): Promise<{ items: gallery_item_type[], hasMore: boolean, totalCount: number }> {
        // Build base query
        let query = "SELECT * FROM c WHERE c.vendorId = @vendorId AND c.docType = @docType";
        const parameters: any[] = [
            { name: "@vendorId", value: merchantId },
            { name: "@docType", value: "Item" }
        ];

        // Apply filters
        if (filters?.categoryId) {
            query += " AND c.categoryId = @categoryId";
            parameters.push({ name: "@categoryId", value: filters.categoryId });
        }

        if (filters?.albumId) {
            query += " AND c.albumId = @albumId";
            parameters.push({ name: "@albumId", value: filters.albumId });
        }

        if (filters?.groupId) {
            query += " AND c.groupId = @groupId";
            parameters.push({ name: "@groupId", value: filters.groupId });
        }

        if (filters?.unalbumedOnly) {
            query += " AND (NOT IS_DEFINED(c.albumId) OR c.albumId = null OR c.albumId = '')";
        }

        if (filters?.type) {
            query += " AND c.type = @type";
            parameters.push({ name: "@type", value: filters.type });
        }

        if (filters?.layout) {
            query += " AND c.layout = @layout";
            parameters.push({ name: "@layout", value: filters.layout });
        }

        if (filters?.tags && filters.tags.length > 0) {
            query += " AND ARRAY_CONTAINS(c.tags, @tag)";
            parameters.push({ name: "@tag", value: filters.tags[0] }); // For now, support single tag
        }

        // Add ordering and pagination
        query += " ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit";
        parameters.push(
            { name: "@offset", value: offset },
            { name: "@limit", value: limit + 1 } // Fetch one extra to check if there are more
        );

        const querySpec = { query, parameters };
        const results = await this.cosmos.run_query<gallery_item_type>(this.containerName, querySpec);

        // Check if there are more items
        const hasMore = results.length > limit;
        const items = hasMore ? results.slice(0, limit) : results;

        // Get total count for this query (without pagination)
        let countQuery = query.replace("SELECT *", "SELECT VALUE COUNT(1)").replace(/ORDER BY.*$/, "");
        const countParameters = parameters.slice(0, -2); // Remove offset and limit params
        
        const countQuerySpec = { query: countQuery, parameters: countParameters };
        const [totalCount] = await this.cosmos.run_query<number>(this.containerName, countQuerySpec);

        return {
            items,
            hasMore,
            totalCount: totalCount || 0
        };
    }

    async getgallery_item(itemId: string, merchantId: string): Promise<gallery_item_type | null> {
        try {
            return await this.cosmos.get_record<gallery_item_type>(this.containerName, itemId, merchantId);
        } catch (error) {
            return null;
        }
    }

    async createGalleryItem(input: create_gallery_item_input, userId: string): Promise<gallery_item_type> {
        const id = uuid();
        const now = DateTime.now().toISO();

        const item: Omit<gallery_item_type, '_id' | 'ref'> = {
            id,
            merchantId: input.merchantId,
            vendorId: input.merchantId,
            docType: 'Item',
            categoryId: input.categoryId,
            albumId: input.albumId,
            groupId: input.groupId,
            type: input.type,
            title: input.title,
            description: input.description,
            url: input.mediaUrl,
            thumbnailUrl: input.thumbnailUrl,
            layout: input.layout,
            linkedProducts: input.linkedProducts,
            tags: input.tags,
            createdAt: now,
            updatedAt: now
        };

        const result = await this.cosmos.add_record<gallery_item_type>(this.containerName, item, input.merchantId, userId);
        
        // Update counts
        if (input.categoryId) {
            await this.updateCategoryCounts(input.merchantId, input.categoryId);
        }
        if (input.groupId) {
            await this.updateGroupCounts(input.merchantId, input.groupId);
        }
        if (input.albumId) {
            await this.updateAlbumCounts(input.merchantId, input.albumId);
        }
        
        // Update vendor storage usage
        if (input.usedBytes && input.usedBytes > 0) {
            await this.incrementVendorStorage(input.merchantId, input.usedBytes, userId);
        }
        
        return result;
    }

    async updateGalleryItem(input: update_gallery_item_input, merchantId: string, userId: string): Promise<gallery_item_type> {
        const item = await this.cosmos.get_record_by_doctype<gallery_item_type>(this.containerName, input.id, merchantId, "Item");
        
        if (!item) {
            throw new Error("Item not found");
        }
        
        const oldCategoryId = item.categoryId;
        const oldGroupId = item.groupId;
        
        const updates: any = {
            updatedAt: DateTime.now().toISO()
        };

        if (input.title !== undefined) updates.title = input.title;
        if (input.description !== undefined) updates.description = input.description;
        if (input.layout !== undefined) updates.layout = input.layout;
        if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
        if (input.groupId !== undefined) updates.groupId = input.groupId;
        if (input.linkedProducts !== undefined) updates.linkedProducts = input.linkedProducts;
        if (input.tags !== undefined) updates.tags = input.tags;

        await this.cosmos.update_record(this.containerName, input.id, merchantId, updates, userId);
        
        // Update counts if categories/groups changed
        if (oldCategoryId !== input.categoryId) {
            if (oldCategoryId) await this.updateCategoryCounts(merchantId, oldCategoryId);
            if (input.categoryId) await this.updateCategoryCounts(merchantId, input.categoryId);
        }
        if (oldGroupId !== input.groupId) {
            if (oldGroupId) await this.updateGroupCounts(merchantId, oldGroupId);
            if (input.groupId) await this.updateGroupCounts(merchantId, input.groupId);
        }
        
        return await this.cosmos.get_record<gallery_item_type>(this.containerName, input.id, merchantId);
    }

    async upsertGalleryItem(input: upsert_gallery_item_input, userId: string): Promise<{ galleryItem: gallery_item_type, isNew: boolean }> {
        if (input.id) {
            // Update existing item
            const existingItem = await this.cosmos.get_record_by_doctype<gallery_item_type>(this.containerName, input.id, input.merchantId, "Item");
            
            if (!existingItem) {
                throw new Error("Item not found for update");
            }
            
            const oldCategoryId = existingItem.categoryId;
            const oldGroupId = existingItem.groupId;
            const oldAlbumId = existingItem.albumId;
            
            const updates: any = {
                title: input.title,
                description: input.description,
                layout: input.layout,
                categoryId: input.categoryId,
                albumId: input.albumId,
                groupId: input.groupId,
                linkedProducts: input.linkedProducts,
                tags: input.tags,
                updatedAt: DateTime.now().toISO()
            };

            // Only update media URLs if provided (allows for metadata-only updates)
            if (input.mediaUrl) updates.url = input.mediaUrl;
            if (input.thumbnailUrl !== undefined) updates.thumbnailUrl = input.thumbnailUrl;
            
            // Handle usedBytes updates for storage tracking
            if (input.usedBytes !== undefined) {
                updates.usedBytes = input.usedBytes;
                
                // Update vendor storage if usedBytes changed
                const oldUsedBytes = existingItem.usedBytes || 0;
                const newUsedBytes = input.usedBytes || 0;
                const bytesDifference = newUsedBytes - oldUsedBytes;
                
                if (bytesDifference !== 0) {
                    if (bytesDifference > 0) {
                        await this.incrementVendorStorage(input.merchantId, bytesDifference, userId);
                    } else {
                        await this.decrementVendorStorage(input.merchantId, Math.abs(bytesDifference), userId);
                    }
                }
            }

            await this.cosmos.update_record(this.containerName, input.id, input.merchantId, updates, userId);
            
            // Update counts if categories/groups/albums changed
            if (oldCategoryId !== input.categoryId) {
                if (oldCategoryId) await this.updateCategoryCounts(input.merchantId, oldCategoryId);
                if (input.categoryId) await this.updateCategoryCounts(input.merchantId, input.categoryId);
            }
            if (oldGroupId !== input.groupId) {
                if (oldGroupId) await this.updateGroupCounts(input.merchantId, oldGroupId);
                if (input.groupId) await this.updateGroupCounts(input.merchantId, input.groupId);
            }
            if (oldAlbumId !== input.albumId) {
                if (oldAlbumId) await this.updateAlbumCounts(input.merchantId, oldAlbumId);
                if (input.albumId) await this.updateAlbumCounts(input.merchantId, input.albumId);
            }
            
            const updatedItem = await this.cosmos.get_record<gallery_item_type>(this.containerName, input.id, input.merchantId);
            return { galleryItem: updatedItem, isNew: false };
        } else {
            // Create new item
            const id = uuid();
            const now = DateTime.now().toISO();

            const item: Omit<gallery_item_type, '_id' | 'ref'> = {
                id,
                merchantId: input.merchantId,
                vendorId: input.merchantId,
                docType: 'Item',
                categoryId: input.categoryId,
                albumId: input.albumId,
                groupId: input.groupId,
                type: input.type,
                title: input.title,
                description: input.description,
                url: input.mediaUrl,
                thumbnailUrl: input.thumbnailUrl,
                layout: input.layout,
                linkedProducts: input.linkedProducts,
                tags: input.tags,
                usedBytes: input.usedBytes,
                createdAt: now,
                updatedAt: now
            };

            const result = await this.cosmos.add_record<gallery_item_type>(this.containerName, item, input.merchantId, userId);
            
            // Update counts
            if (input.categoryId) {
                await this.updateCategoryCounts(input.merchantId, input.categoryId);
            }
            if (input.groupId) {
                await this.updateGroupCounts(input.merchantId, input.groupId);
            }
            if (input.albumId) {
                await this.updateAlbumCounts(input.merchantId, input.albumId);
            }
            
            // Update vendor storage usage
            if (input.usedBytes && input.usedBytes > 0) {
                await this.incrementVendorStorage(input.merchantId, input.usedBytes, userId);
            }
            
            return { galleryItem: result, isNew: true };
        }
    }

    async deletegallery_item(itemId: string, merchantId: string, userId: string): Promise<boolean> {
        const item = await this.cosmos.get_record<gallery_item_type>(this.containerName, itemId, merchantId);
        
        // Update vendor storage usage before deleting
        if (item?.usedBytes && item.usedBytes > 0) {
            await this.decrementVendorStorage(merchantId, item.usedBytes, userId);
        }
        
        // Delete from Cosmos DB first
        await this.cosmos.purge_record(this.containerName, itemId, merchantId);
        
        // Extract blob path from URLs and delete from Azure Storage
        try {
            if (item.url) {
                const mainBlobPath = this.extractBlobPath(item.url);
                if (mainBlobPath) {
                    await this.storage.delete(mainBlobPath);
                }
            }
            
            // Delete thumbnail if it's different from main URL
            if (item.thumbnailUrl && item.thumbnailUrl !== item.url) {
                const thumbnailBlobPath = this.extractBlobPath(item.thumbnailUrl);
                if (thumbnailBlobPath) {
                    await this.storage.delete(thumbnailBlobPath);
                }
            }
        } catch (error) {
            console.error(`Failed to delete storage files for item ${itemId}:`, error);
            // Don't throw - we already deleted from DB successfully
        }
        
        // Update counts
        if (item.categoryId) {
            await this.updateCategoryCounts(merchantId, item.categoryId);
        }
        if (item.groupId) {
            await this.updateGroupCounts(merchantId, item.groupId);
        }
        
        return true;
    }

    private extractBlobPath(url: string): string | null {
        try {
            // Expected URL format: https://stspvapp{env}{index}.blob.core.windows.net/container/path
            const urlObj = new URL(url);
            const pathname = urlObj.pathname; // /container/path
            return pathname.substring(1); // Remove leading slash to get "container/path"
        } catch {
            return null;
        }
    }

    // Helper methods for counting
    private async getGroupCount(merchantId: string, categoryId: string): Promise<number> {
        const querySpec = {
            query: "SELECT VALUE COUNT(1) FROM c WHERE c.vendorId = @vendorId AND c.docType = @docType AND c.categoryId = @categoryId",
            parameters: [
                { name: "@vendorId", value: merchantId },
                { name: "@docType", value: "Group" },
                { name: "@categoryId", value: categoryId }
            ]
        };

        const result = await this.cosmos.run_query<number>(this.containerName, querySpec);
        return result[0] || 0;
    }

    private async getItemCount(merchantId: string, categoryId?: string, groupId?: string, albumId?: string): Promise<number> {
        let query = "SELECT VALUE COUNT(1) FROM c WHERE c.vendorId = @vendorId AND c.docType = @docType";
        const parameters: any[] = [
            { name: "@vendorId", value: merchantId },
            { name: "@docType", value: "Item" }
        ];

        if (categoryId) {
            query += " AND c.categoryId = @categoryId";
            parameters.push({ name: "@categoryId", value: categoryId });
        }

        if (groupId) {
            query += " AND c.groupId = @groupId";
            parameters.push({ name: "@groupId", value: groupId });
        }

        if (albumId) {
            query += " AND c.albumId = @albumId";
            parameters.push({ name: "@albumId", value: albumId });
        }

        const querySpec = { query, parameters };
        const result = await this.cosmos.run_query<number>(this.containerName, querySpec);
        return result[0] || 0;
    }

    private async updateCategoryCounts(merchantId: string, categoryId: string): Promise<void> {
        const groupCount = await this.getGroupCount(merchantId, categoryId);
        const itemCount = await this.getItemCount(merchantId, categoryId);
        
        await this.cosmos.update_record(this.containerName, categoryId, merchantId, {
            groupCount,
            itemCount,
            updatedAt: DateTime.now().toISO()
        }, 'system');
    }

    private async updateGroupCounts(merchantId: string, groupId: string): Promise<void> {
        const itemCount = await this.getItemCount(merchantId, undefined, groupId);
        
        await this.cosmos.update_record(this.containerName, groupId, merchantId, {
            itemCount,
            updatedAt: DateTime.now().toISO()
        }, 'system');
    }

    private async updateAlbumCounts(merchantId: string, albumId: string): Promise<void> {
        const itemCount = await this.getItemCount(merchantId, undefined, undefined, albumId);
        
        await this.cosmos.update_record(this.containerName, albumId, merchantId, {
            itemCount,
            updatedAt: DateTime.now().toISO()
        }, 'system');
    }

    private async incrementVendorStorage(merchantId: string, usedBytes: number, userId: string): Promise<void> {
        try {
            // Get current vendor record
            const vendor = await this.cosmos.get_record<vendor_type>("Main-Vendor", merchantId, merchantId);
            
            if (vendor) {
                const currentUsedBytes = vendor.storage?.usedBytes || 0;
                const newUsedBytes = currentUsedBytes + usedBytes;

                await this.cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
                    {
                        op: "replace",
                        path: "/storage/usedBytes",
                        value: newUsedBytes
                    }
                ], userId);
                
                console.log(`Incremented vendor ${merchantId} storage by ${usedBytes} bytes (total: ${newUsedBytes})`);
            }
        } catch (error) {
            console.error(`Failed to increment vendor storage for ${merchantId}:`, error);
            // Don't throw - gallery item creation should not fail due to storage tracking
        }
    }

    private async decrementVendorStorage(merchantId: string, usedBytes: number, userId: string): Promise<void> {
        try {
            // Get current vendor record
            const vendor = await this.cosmos.get_record<vendor_type>("Main-Vendor", merchantId, merchantId);

            if (vendor) {
                const currentUsedBytes = vendor.storage?.usedBytes || 0;
                const newUsedBytes = Math.max(0, currentUsedBytes - usedBytes); // Prevent negative values

                await this.cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
                    {
                        op: "replace",
                        path: "/storage/usedBytes",
                        value: newUsedBytes
                    }
                ], userId);

                console.log(`Decremented vendor ${merchantId} storage by ${usedBytes} bytes (total: ${newUsedBytes})`);
            }
        } catch (error) {
            console.error(`Failed to decrement vendor storage for ${merchantId}:`, error);
            // Don't throw - gallery item deletion should not fail due to storage tracking
        }
    }
}