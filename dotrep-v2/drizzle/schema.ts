import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Contributors table - GitHub users with reputation
 */
export const contributors = mysqlTable("contributors", {
  id: int("id").autoincrement().primaryKey(),
  githubId: varchar("githubId", { length: 64 }).notNull().unique(),
  githubUsername: varchar("githubUsername", { length: 255 }).notNull(),
  githubAvatar: text("githubAvatar"),
  walletAddress: varchar("walletAddress", { length: 128 }),
  reputationScore: int("reputationScore").default(0).notNull(),
  totalContributions: int("totalContributions").default(0).notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contributor = typeof contributors.$inferSelect;
export type InsertContributor = typeof contributors.$inferInsert;

/**
 * Contributions table - Individual GitHub contributions
 */
export const contributions = mysqlTable("contributions", {
  id: int("id").autoincrement().primaryKey(),
  contributorId: int("contributorId").notNull(),
  contributionType: mysqlEnum("contributionType", ["commit", "pull_request", "issue", "review"]).notNull(),
  repoName: varchar("repoName", { length: 255 }).notNull(),
  repoOwner: varchar("repoOwner", { length: 255 }).notNull(),
  title: text("title"),
  url: text("url"),
  proofCid: text("proofCid"),
  merkleRoot: varchar("merkleRoot", { length: 128 }),
  verified: boolean("verified").default(false).notNull(),
  reputationPoints: int("reputationPoints").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Contribution = typeof contributions.$inferSelect;
export type InsertContribution = typeof contributions.$inferInsert;

/**
 * Achievements table - Earned badges and milestones
 */
export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  contributorId: int("contributorId").notNull(),
  achievementType: varchar("achievementType", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  iconUrl: text("iconUrl"),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

/**
 * Anchors table - On-chain proof anchors
 */
export const anchors = mysqlTable("anchors", {
  id: int("id").autoincrement().primaryKey(),
  merkleRoot: varchar("merkleRoot", { length: 128 }).notNull().unique(),
  blockNumber: int("blockNumber"),
  txHash: varchar("txHash", { length: 128 }),
  daCid: text("daCid"),
  contributionCount: int("contributionCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Anchor = typeof anchors.$inferSelect;
export type InsertAnchor = typeof anchors.$inferInsert;

/**
 * GitHub accounts table - Stores OAuth tokens and account links
 */
export const githubAccounts = mysqlTable("github_accounts", {
  id: int("id").autoincrement().primaryKey(),
  githubId: varchar("githubId", { length: 64 }).notNull().unique(),
  login: varchar("login", { length: 255 }).notNull(),
  linkedWallet: varchar("linkedWallet", { length: 128 }),
  oauthScopes: text("oauthScopes"), // JSON array of scopes
  encryptedToken: text("encryptedToken"), // Encrypted OAuth token (in production use KMS)
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GitHubAccount = typeof githubAccounts.$inferSelect;
export type InsertGitHubAccount = typeof githubAccounts.$inferInsert;

/**
 * Proofs table - Stores proof payloads before batching
 */
export const proofs = mysqlTable("proofs", {
  id: int("id").autoincrement().primaryKey(),
  proofHash: varchar("proofHash", { length: 128 }).notNull().unique(),
  batchId: varchar("batchId", { length: 128 }),
  cid: text("cid"), // IPFS CID
  signedByService: boolean("signedByService").default(false).notNull(),
  anchoredTx: varchar("anchoredTx", { length: 128 }),
  anchoredAt: timestamp("anchoredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Proof = typeof proofs.$inferSelect;
export type InsertProof = typeof proofs.$inferInsert;
