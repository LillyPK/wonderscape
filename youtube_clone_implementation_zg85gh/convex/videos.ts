import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please log in");
    return await ctx.storage.generateUploadUrl();
  },
});

export const createVideo = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    storageId: v.id("_storage"),
    thumbnailId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please log in");

    await ctx.db.insert("videos", {
      title: args.title,
      description: args.description,
      userId,
      storageId: args.storageId,
      thumbnailId: args.thumbnailId,
      views: 0,
      createdAt: Date.now(),
    });
  },
});

export const getVideo = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) return null;
    
    const user = await ctx.db.get(video.userId);
    const url = await ctx.storage.getUrl(video.storageId);
    const thumbnailUrl = video.thumbnailId ? await ctx.storage.getUrl(video.thumbnailId) : null;
    return {
      ...video,
      username: user?.email ?? "Anonymous",
      url,
      thumbnailUrl,
    };
  },
});

export const listVideos = query({
  args: {
    sortBy: v.union(v.literal("recent"), v.literal("views")),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let videos;
    if (args.sortBy === "recent") {
      videos = await ctx.db
        .query("videos")
        .order("desc")
        .collect();
    } else {
      videos = await ctx.db
        .query("videos")
        .withIndex("by_views")
        .order("desc")
        .collect();
    }
    
    let filteredVideos = videos;
    if (args.searchQuery) {
      const searchLower = args.searchQuery.toLowerCase();
      filteredVideos = videos.filter(video => 
        video.title.toLowerCase().includes(searchLower) ||
        video.description.toLowerCase().includes(searchLower)
      );
    }
    
    return Promise.all(
      filteredVideos.map(async (video) => {
        const user = await ctx.db.get(video.userId);
        const url = await ctx.storage.getUrl(video.storageId);
        const thumbnailUrl = video.thumbnailId ? await ctx.storage.getUrl(video.thumbnailId) : null;
        return {
          ...video,
          username: user?.email ?? "Anonymous",
          url,
          thumbnailUrl,
        };
      })
    );
  },
});

export const incrementViews = mutation({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) return;
    await ctx.db.patch(args.videoId, { views: (video.views || 0) + 1 });
  },
});
