import { pgTable, text, serial, integer, timestamp, boolean, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: text("address").unique().notNull(),
  username: text("username"),
  isAdmin: boolean("is_admin").default(false),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  lastSeen: timestamp("last_seen").defaultNow(),
});

// Rename likes table to loves
export const loves = pgTable("loves", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id),
  address: text("address").references(() => users.address),
  createdAt: timestamp("created_at").defaultNow(),
});

export const followers = pgTable("followers", {
  id: serial("id").primaryKey(),
  followerId: text("follower_id").references(() => users.address),
  followingId: text("following_id").references(() => users.address),
  createdAt: timestamp("created_at").defaultNow(),
});

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist"),
  ipfsHash: text("ipfs_hash").notNull(),
  uploadedBy: text("uploaded_by").references(() => users.address),
  createdAt: timestamp("created_at").defaultNow(),
  votes: integer("votes").default(0),
});

export const recentlyPlayed = pgTable("recently_played", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id),
  playedBy: text("played_by").references(() => users.address),
  playedAt: timestamp("played_at").defaultNow(),
});

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: text("created_by").references(() => users.address),
  createdAt: timestamp("created_at").defaultNow(),
  isPublic: boolean("is_public").default(true),
});

export const playlistSongs = pgTable("playlist_songs", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id").references(() => playlists.id),
  songId: integer("song_id").references(() => songs.id),
  position: integer("position").notNull(),
});

export const userRewards = pgTable("user_rewards", {
  id: serial("id").primaryKey(),
  address: text("address").references(() => users.address),
  uploadRewardClaimed: boolean("upload_reward_claimed").default(false),
  playlistRewardClaimed: boolean("playlist_reward_claimed").default(false),
  nftRewardClaimed: boolean("nft_reward_claimed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const listeners = pgTable("listeners", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id),
  countryCode: text("country_code").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const lumiraMetrics = pgTable("lumira_metrics", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  dataType: text("data_type").notNull(),
  data: jsonb("data").notNull(),
  metadata: jsonb("metadata").notNull(),
});

// Update relations for loves
export const lovesRelations = relations(loves, ({ one }) => ({
  song: one(songs, {
    fields: [loves.songId],
    references: [songs.id],
  }),
  user: one(users, {
    fields: [loves.address],
    references: [users.address],
  }),
}));

// Update songs relations to include loves
export const songsRelations = relations(songs, ({ many, one }) => ({
  recentPlays: many(recentlyPlayed),
  playlistSongs: many(playlistSongs),
  loves: many(loves),
  uploader: one(users, {
    fields: [songs.uploadedBy],
    references: [users.address],
  }),
}));

export const playlistsRelations = relations(playlists, ({ many, one }) => ({
  playlistSongs: many(playlistSongs),
  creator: one(users, {
    fields: [playlists.createdBy],
    references: [users.address],
  }),
}));

export const playlistSongsRelations = relations(playlistSongs, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistSongs.playlistId],
    references: [playlists.id],
  }),
  song: one(songs, {
    fields: [playlistSongs.songId],
    references: [songs.id],
  }),
}));

// Update users relations to include loves
export const usersRelations = relations(users, ({ many }) => ({
  followers: many(followers, { relationName: "followers" }),
  following: many(followers, { relationName: "following" }),
  songs: many(songs, { relationName: "uploaded_songs" }),
  playlists: many(playlists, { relationName: "created_playlists" }),
  rewards: many(userRewards),
  loves: many(loves),
}));

export const recentlyPlayedRelations = relations(recentlyPlayed, ({ one }) => ({
  song: one(songs, {
    fields: [recentlyPlayed.songId],
    references: [songs.id],
  }),
}));

export const listenersRelations = relations(listeners, ({ one }) => ({
  song: one(songs, {
    fields: [listeners.songId],
    references: [songs.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type UserRewards = typeof userRewards.$inferSelect;
export type LumiraMetric = typeof lumiraMetrics.$inferSelect;
export type Love = typeof loves.$inferSelect;