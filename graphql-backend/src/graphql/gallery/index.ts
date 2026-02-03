import { serverContext } from "../../services/azFunction";
import { GalleryManager } from "./manager";
import { gallery_filters } from "./types";
import { createMutationResolver, createQueryResolver } from "../../utils/resolvers";

const manager = (context: serverContext) => new GalleryManager(context.dataSources.cosmos, context.dataSources.storage);

const resolvers = {
    Query: {
        galleryCategories: createQueryResolver(
            (ds, args: { merchantId: string }) => ds.getGalleryCategories(args.merchantId)
        )(manager),

        galleryAlbums: createQueryResolver(
            (ds, args: { merchantId: string }) => ds.getGalleryAlbums(args.merchantId)
        )(manager),

        galleryGroups: createQueryResolver(
            (ds, args: { merchantId: string, categoryId: string }) => ds.getgallery_groups(args.merchantId, args.categoryId)
        )(manager),

        galleryItems: createQueryResolver(
            (ds, args: { merchantId: string, categoryId?: string, albumId?: string, groupId?: string, unalbumedOnly?: boolean }) => {
                const filters: gallery_filters = {};
                if (args.categoryId) filters.categoryId = args.categoryId;
                if (args.albumId) filters.albumId = args.albumId;
                if (args.groupId) filters.groupId = args.groupId;
                if (args.unalbumedOnly) filters.unalbumedOnly = args.unalbumedOnly;
                return ds.getGalleryItems(args.merchantId, filters);
            }
        )(manager),

        galleryItem: createQueryResolver(
            (ds, args: { id: string, merchantId: string }) => ds.getgallery_item(args.id, args.merchantId)
        )(manager),

        catalogueGalleryItems: createQueryResolver(
            (ds, args: { merchantId: string, limit: number }) => ds.getCataloguegallery_items(args.merchantId, args.limit)
        )(manager),

        galleryItemsPaginated: createQueryResolver(
            (ds, args: { merchantId: string, categoryId?: string, albumId?: string, offset: number, limit: number }) => {
                const filters: gallery_filters = {};
                if (args.categoryId) filters.categoryId = args.categoryId;
                if (args.albumId) filters.albumId = args.albumId;
                return ds.getGalleryItemsPaginated(args.merchantId, filters, args.offset, args.limit);
            }
        )(manager)
    },

    Mutation: {
        createGalleryCategory: createMutationResolver(
            "createGalleryCategory",
            (ds, args: { input: any }, userId: string) => ds.createGalleryCategory(args.input, userId)
        )(manager),

        updateGalleryCategory: createMutationResolver(
            "updateGalleryCategory",
            (ds, args: { input: any }, userId: string) => ds.updateGalleryCategory(args.input, args.input.merchantId, userId)
        )(manager),

        deleteGalleryCategory: createMutationResolver(
            "deleteGalleryCategory",
            (ds, args: { id: string, merchantId: string }, userId: string) => ds.deletegallery_category(args.id, args.merchantId, userId)
        )(manager),

        createGalleryAlbum: createMutationResolver(
            "createGalleryAlbum",
            (ds, args: { input: any }, userId: string) => ds.createGalleryAlbum(args.input, userId)
        )(manager),

        createGalleryGroup: createMutationResolver(
            "createGalleryGroup",
            (ds, args: { input: any }, userId: string) => ds.createGalleryGroup(args.input, userId)
        )(manager),

        updateGalleryAlbum: createMutationResolver(
            "updateGalleryAlbum",
            (ds, args: { input: any }, userId: string) => ds.updateGalleryAlbum(args.input, args.input.merchantId, userId)
        )(manager),

        updateGalleryGroup: createMutationResolver(
            "updateGalleryGroup",
            (ds, args: { input: any }, userId: string) => ds.updateGalleryGroup(args.input, args.input.merchantId, userId)
        )(manager),

        deleteGalleryAlbum: createMutationResolver(
            "deleteGalleryAlbum",
            (ds, args: { id: string, merchantId: string }, userId: string) => ds.deleteGalleryAlbum(args.id, args.merchantId, userId)
        )(manager),

        deleteGalleryGroup: createMutationResolver(
            "deleteGalleryGroup",
            (ds, args: { id: string, merchantId: string }, userId: string) => ds.deletegallery_group(args.id, args.merchantId, userId)
        )(manager),

        createGalleryItem: createMutationResolver(
            "createGalleryItem",
            (ds, args: { input: any }, userId: string) => ds.createGalleryItem(args.input, userId)
        )(manager),

        updateGalleryItem: createMutationResolver(
            "updateGalleryItem",
            (ds, args: { input: any }, userId: string) => ds.updateGalleryItem(args.input, args.input.merchantId, userId)
        )(manager),

        upsertGalleryItem: createMutationResolver(
            "upsertGalleryItem",
            (ds, args: { input: any }, userId: string) => ds.upsertGalleryItem(args.input, userId),
            undefined,
            (result: any) => result.isNew ? "Gallery item created successfully" : "Gallery item updated successfully"
        )(manager),

        deleteGalleryItem: createMutationResolver(
            "deleteGalleryItem",
            (ds, args: { id: string, merchantId: string }, userId: string) => ds.deletegallery_item(args.id, args.merchantId, userId)
        )(manager)
    },
    GalleryItem: {
        ref: async (parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id,
                partition: [parent.vendorId],
                container: "Main-Gallery"
            };
        }
    }, 
    GalleryAlbum: {
        ref: async (parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id,
                partition: [parent.vendorId],
                container: "Main-Gallery"
            };
        }
    }
};

export { resolvers };