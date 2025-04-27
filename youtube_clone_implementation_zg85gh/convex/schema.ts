import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  videos: defineTable({
    title: v.string(),
    description: v.string(),
    userId: v.id("users"),
    storageId: v.id("_storage"),
    thumbnailId: v.optional(v.id("_storage")),
    views: v.number(),
    createdAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_views", ["views"]),
  
  comments: defineTable({
    videoId: v.id("videos"),
    userId: v.id("users"),
    text: v.string(),
  }).index("by_video", ["videoId"])
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
