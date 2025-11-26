import { eq, desc, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, InsertContributor, users, contributors, contributions, achievements, anchors, Contributor, Contribution, Achievement, Anchor } from "../drizzle/schema";
import { proofs } from "../drizzle/schema";
import { ENV } from './_core/env';
import { DatabaseError } from "@shared/_core/errors";
import { retryWithBackoff, isRetryableError, logError } from "./_core/errorHandler";

let _db: ReturnType<typeof drizzle> | null = null;
let _connectionPool: mysql.Pool | null = null;

/**
 * Creates a connection pool for better performance and connection management
 */
function createConnectionPool(): mysql.Pool | null {
  if (!process.env.DATABASE_URL) {
    logError(new Error("DATABASE_URL not configured"), { operation: "createConnectionPool" });
    return null;
  }

  try {
    // Parse DATABASE_URL (format: mysql://user:password@host:port/database)
    const url = new URL(process.env.DATABASE_URL);
    const pool = mysql.createPool({
      host: url.hostname,
      port: parseInt(url.port || "3306"),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading '/'
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    
    // Test connection
    pool.getConnection()
      .then(conn => {
        conn.release();
        console.log("[Database] Connection pool created successfully");
      })
      .catch(err => {
        logError(err, { operation: "createConnectionPool", host: url.hostname });
      });
    
    return pool;
  } catch (error) {
    logError(error, { operation: "createConnectionPool" });
    throw new DatabaseError(
      `Failed to create database connection pool: ${error instanceof Error ? error.message : String(error)}`,
      "createConnectionPool",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Gets the database instance with connection pooling
 */
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Create connection pool first
      if (!_connectionPool) {
        _connectionPool = createConnectionPool();
      }

      if (_connectionPool) {
        _db = drizzle(_connectionPool);
      } else {
        // Fallback to direct connection
        _db = drizzle(process.env.DATABASE_URL);
      }
    } catch (error) {
      logError(error, { operation: "getDb" });
      throw new DatabaseError(
        `Failed to get database connection: ${error instanceof Error ? error.message : String(error)}`,
        "getDb",
        error instanceof Error ? error : undefined
      );
    }
  }
  
  if (!_db) {
    throw new DatabaseError("Database connection not available. DATABASE_URL may not be configured.", "getDb");
  }
  
  return _db;
}

/**
 * Closes the database connection pool gracefully
 */
export async function closeDb(): Promise<void> {
  if (_connectionPool) {
    await _connectionPool.end();
    _connectionPool = null;
    _db = null;
  }
}

/**
 * Upserts a user in the database
 * @param user - User data to insert or update
 * @throws {DatabaseError} If openId is missing or database operation fails
 */
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new DatabaseError("User openId is required for upsert", "upsertUser");
  }

  return retryWithBackoff(
    async () => {
      const db = await getDb();
      const values: InsertUser = {
        openId: user.openId,
      };
      const updateSet: Record<string, unknown> = {};

      const textFields = ["name", "email", "loginMethod"] as const;
      type TextField = (typeof textFields)[number];

      const assignNullable = (field: TextField) => {
        const value = user[field];
        if (value === undefined) return;
        const normalized = value ?? null;
        values[field] = normalized;
        updateSet[field] = normalized;
      };

      textFields.forEach(assignNullable);

      if (user.lastSignedIn !== undefined) {
        values.lastSignedIn = user.lastSignedIn;
        updateSet.lastSignedIn = user.lastSignedIn;
      }
      if (user.role !== undefined) {
        values.role = user.role;
        updateSet.role = user.role;
      } else if (user.openId === ENV.ownerOpenId) {
        values.role = 'admin';
        updateSet.role = 'admin';
      }

      if (!values.lastSignedIn) {
        values.lastSignedIn = new Date();
      }

      if (Object.keys(updateSet).length === 0) {
        updateSet.lastSignedIn = new Date();
      }

      await db.insert(users).values(values).onDuplicateKeyUpdate({
        set: updateSet,
      });
    },
    {
      maxRetries: 3,
      retryable: isRetryableError,
    }
  ).catch((error) => {
    logError(error, { operation: "upsertUser", openId: user.openId });
    throw new DatabaseError(
      `Failed to upsert user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      "upsertUser",
      error instanceof Error ? error : undefined
    );
  });
}

/**
 * Gets a user by their OpenID
 * @param openId - The user's OpenID
 * @returns The user if found, undefined otherwise
 */
export async function getUserByOpenId(openId: string) {
  if (!openId) {
    return undefined;
  }

  try {
    const db = await getDb();
    const result = await retryWithBackoff(
      async () => {
        return await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      },
      {
        maxRetries: 2,
        retryable: isRetryableError,
      }
    );
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    logError(error, { operation: "getUserByOpenId", openId });
    // Return undefined instead of throwing for query operations
    return undefined;
  }
}

// Contributor queries

/**
 * Gets a contributor by their GitHub username
 * @param username - GitHub username
 * @returns Contributor if found, undefined otherwise
 */
export async function getContributorByGithubUsername(username: string): Promise<Contributor | undefined> {
  if (!username || username.trim().length === 0) {
    return undefined;
  }

  const db = await getDb();
  if (!db) return undefined;
  
  try {
    const result = await db.select().from(contributors).where(eq(contributors.githubUsername, username.trim())).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get contributor by username:", error);
    return undefined;
  }
}

/**
 * Gets a contributor by their GitHub ID
 * @param githubId - GitHub user ID
 * @returns Contributor if found, undefined otherwise
 */
export async function getContributorByGithubId(githubId: string): Promise<Contributor | undefined> {
  if (!githubId || githubId.trim().length === 0) {
    return undefined;
  }

  const db = await getDb();
  if (!db) return undefined;
  
  try {
    const result = await db.select().from(contributors).where(eq(contributors.githubId, githubId.trim())).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get contributor by GitHub ID:", error);
    return undefined;
  }
}

/**
 * Creates a new contributor in the database
 * @param contributor - Contributor data to insert
 * @returns The created contributor
 * @throws {Error} If database is unavailable or creation fails
 */
export async function createContributor(contributor: InsertContributor): Promise<Contributor> {
  if (!contributor.githubId || !contributor.githubUsername) {
    throw new Error("GitHub ID and username are required");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    await db.insert(contributors).values(contributor);
    const result = await db.select().from(contributors).where(eq(contributors.githubId, contributor.githubId)).limit(1);
    
    if (!result[0]) {
      throw new Error("Failed to create contributor");
    }
    
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to create contributor:", error);
    throw new Error(`Failed to create contributor: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Updates a contributor's wallet address and marks them as verified
 * @param githubId - GitHub user ID
 * @param walletAddress - Polkadot wallet address
 * @throws {Error} If database is unavailable or update fails
 */
export async function updateContributorWallet(githubId: string, walletAddress: string): Promise<void> {
  if (!githubId || !walletAddress) {
    throw new Error("GitHub ID and wallet address are required");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    await db
      .update(contributors)
      .set({ 
        walletAddress,
        verified: true,
        updatedAt: new Date(),
      })
      .where(eq(contributors.githubId, githubId));
  } catch (error) {
    console.error("[Database] Failed to update contributor wallet:", error);
    throw new Error(`Failed to update contributor wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets all contributors ordered by reputation score
 * @param limit - Maximum number of contributors to return (default: 100, max: 1000)
 * @returns Array of contributors
 */
export async function getAllContributors(limit: number = 100): Promise<Contributor[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Clamp limit to prevent excessive queries
  const clampedLimit = Math.min(Math.max(1, limit), 1000);
  
  try {
    return await db.select().from(contributors).orderBy(desc(contributors.reputationScore)).limit(clampedLimit);
  } catch (error) {
    console.error("[Database] Failed to get all contributors:", error);
    return [];
  }
}

/**
 * Gets contributor statistics including contribution counts and reputation
 * @param contributorId - The contributor's ID
 * @returns Statistics object or null if not found
 */
export async function getContributorStats(contributorId: number) {
  if (!contributorId || contributorId <= 0) {
    return null;
  }

  const db = await getDb();
  if (!db) return null;
  
  try {
    // Use SQL aggregation for better performance
    const stats = await db
      .select({
        totalContributions: count(contributions.id),
        verified: sql<number>`SUM(CASE WHEN ${contributions.verified} = 1 THEN 1 ELSE 0 END)`,
        totalReputation: sql<number>`COALESCE(SUM(${contributions.reputationPoints}), 0)`,
      })
      .from(contributions)
      .where(eq(contributions.contributorId, contributorId));

    if (stats.length === 0) {
      return {
        totalContributions: 0,
        verified: 0,
        totalReputation: 0,
      };
    }

    return {
      totalContributions: Number(stats[0].totalContributions),
      verified: Number(stats[0].verified),
      totalReputation: Number(stats[0].totalReputation),
    };
  } catch (error) {
    console.error("[Database] Failed to get contributor stats:", error);
    return null;
  }
}

// Contribution queries

/**
 * Gets contributions by a specific contributor
 * @param contributorId - The contributor's ID
 * @param limit - Maximum number of contributions to return (default: 50, max: 500)
 * @returns Array of contributions
 */
export async function getContributionsByContributor(contributorId: number, limit: number = 50): Promise<Contribution[]> {
  if (!contributorId || contributorId <= 0) {
    return [];
  }

  const db = await getDb();
  if (!db) return [];
  
  const clampedLimit = Math.min(Math.max(1, limit), 500);
  
  try {
    return await db
      .select()
      .from(contributions)
      .where(eq(contributions.contributorId, contributorId))
      .orderBy(desc(contributions.createdAt))
      .limit(clampedLimit);
  } catch (error) {
    console.error("[Database] Failed to get contributions by contributor:", error);
    return [];
  }
}

/**
 * Gets recent contributions across all contributors
 * @param limit - Maximum number of contributions to return (default: 10, max: 100)
 * @returns Array of recent contributions
 */
export async function getRecentContributions(limit: number = 10): Promise<Contribution[]> {
  const db = await getDb();
  if (!db) return [];
  
  const clampedLimit = Math.min(Math.max(1, limit), 100);
  
  try {
    return await db
      .select()
      .from(contributions)
      .orderBy(desc(contributions.createdAt))
      .limit(clampedLimit);
  } catch (error) {
    console.error("[Database] Failed to get recent contributions:", error);
    return [];
  }
}

/**
 * Creates a new contribution in the database
 * @param contribution - Contribution data to insert
 * @returns The created contribution
 * @throws {Error} If database is unavailable or creation fails
 */
export async function createContribution(contribution: InsertContribution): Promise<Contribution> {
  if (!contribution.contributorId || !contribution.contributionType || !contribution.repoName) {
    throw new Error("Contributor ID, contribution type, and repo name are required");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    const [result] = await db.insert(contributions).values(contribution);
    const created = await db
      .select()
      .from(contributions)
      .where(eq(contributions.id, Number(result.insertId)))
      .limit(1);
    
    if (!created[0]) {
      throw new Error("Failed to create contribution");
    }
    
    return created[0];
  } catch (error) {
    console.error("[Database] Failed to create contribution:", error);
    throw new Error(`Failed to create contribution: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Updates a contribution's verification status and reputation points
 * @param contributionId - The contribution's ID
 * @param verified - Whether the contribution is verified
 * @param reputationPoints - Reputation points to assign
 * @throws {Error} If database is unavailable or update fails
 */
export async function updateContributionVerification(
  contributionId: number,
  verified: boolean,
  reputationPoints?: number
): Promise<void> {
  if (!contributionId || contributionId <= 0) {
    throw new Error("Valid contribution ID is required");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    const updateData: any = { verified };
    if (reputationPoints !== undefined) {
      updateData.reputationPoints = reputationPoints;
    }
    
    await db
      .update(contributions)
      .set(updateData)
      .where(eq(contributions.id, contributionId));
  } catch (error) {
    console.error("[Database] Failed to update contribution verification:", error);
    throw new Error(`Failed to update contribution: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Achievement queries

/**
 * Gets all achievements for a specific contributor
 * @param contributorId - The contributor's ID
 * @returns Array of achievements
 */
export async function getAchievementsByContributor(contributorId: number): Promise<Achievement[]> {
  if (!contributorId || contributorId <= 0) {
    return [];
  }

  const db = await getDb();
  if (!db) return [];
  
  try {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.contributorId, contributorId))
      .orderBy(desc(achievements.earnedAt));
  } catch (error) {
    console.error("[Database] Failed to get achievements by contributor:", error);
    return [];
  }
}

// Anchor queries

/**
 * Gets recent anchors ordered by creation date
 * @param limit - Maximum number of anchors to return (default: 10, max: 100)
 * @returns Array of recent anchors
 */
export async function getRecentAnchors(limit: number = 10): Promise<Anchor[]> {
  const db = await getDb();
  if (!db) return [];
  
  const clampedLimit = Math.min(Math.max(1, limit), 100);
  
  try {
    return await db
      .select()
      .from(anchors)
      .orderBy(desc(anchors.createdAt))
      .limit(clampedLimit);
  } catch (error) {
    console.error("[Database] Failed to get recent anchors:", error);
    return [];
  }
}

/**
 * Gets the total count of anchors
 * @returns Total number of anchors
 */
export async function getTotalAnchors(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  try {
    // Use COUNT query for better performance
    const result = await db
      .select({ count: count() })
      .from(anchors);
    
    return result.length > 0 ? Number(result[0].count) : 0;
  } catch (error) {
    console.error("[Database] Failed to get total anchors:", error);
    return 0;
  }
}

// Analytics queries

/**
 * Gets all proof records for analytics (with metadata from contributions)
 * @returns Array of proof records with metadata
 */
export async function getAllProofRecords() {
  const db = await getDb();
  if (!db) return [];
  
  try {
    // Get all proofs
    const proofList = await db
      .select()
      .from(proofs)
      .orderBy(desc(proofs.createdAt))
      .limit(10000);
    
    // Get all contributions to match with proofs
    const contribList = await db
      .select()
      .from(contributions)
      .limit(10000);
    
    // Create a map of proofCid to contribution for quick lookup
    const contribMap = new Map<string, typeof contribList[0]>();
    contribList.forEach((c) => {
      if (c.proofCid) {
        contribMap.set(c.proofCid, c);
      }
    });
    
    // Get contributors to map contributorId to GitHub username
    const contributorList = await db.select().from(contributors).limit(10000);
    const contributorMap = new Map<number, typeof contributorList[0]>();
    contributorList.forEach((c) => {
      contributorMap.set(c.id, c);
    });
    
    // Transform to ProofRecordLite format
    return proofList.map((p) => {
      const contrib = contribMap.get(p.proofHash) || contribList.find((c) => c.proofCid === p.proofHash);
      const contributor = contrib ? contributorMap.get(contrib.contributorId) : null;
      const actor = contributor ? `github:${contributor.githubUsername}` : (contrib?.repoOwner ? `github:${contrib.repoOwner}` : undefined);
      
      return {
        proofHash: p.proofHash,
        cid: p.cid || null,
        batchId: p.batchId || null,
        anchoredAt: p.anchoredAt || null,
        createdAt: p.createdAt,
        metadata: contrib ? {
          event_type: contrib.contributionType || undefined,
          actor: actor,
          repo: contrib.repoName ? `${contrib.repoOwner}/${contrib.repoName}` : undefined,
          merged: contrib.verified || false,
          reputationPoints: contrib.reputationPoints || 0,
        } : {
          event_type: undefined,
        },
      };
    });
  } catch (error) {
    console.error("[Database] Failed to get all proof records:", error);
    return [];
  }
}

/**
 * Gets proof records by actor (GitHub username or wallet)
 * @param actor - Actor identifier (e.g., "github:username" or wallet address)
 * @param limit - Maximum number of records to return
 * @returns Array of proof records
 */
export async function getProofsByActor(actor: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    // Extract GitHub username from actor if format is "github:username"
    const githubMatch = actor.match(/^github:(.+)$/);
    const githubUsername = githubMatch ? githubMatch[1] : null;
    
    if (githubUsername) {
      // Get contributor by GitHub username
      const contributor = await getContributorByGithubUsername(githubUsername);
      if (!contributor) return [];
      
      // Get contributions for this contributor
      const contribs = await getContributionsByContributor(contributor.id, limit);
      
      // Get proofs for these contributions
      const proofHashes = contribs
        .map((c) => c.proofCid)
        .filter((cid): cid is string => !!cid);
      
      if (proofHashes.length === 0) return [];
      
      const result = await db
        .select()
        .from(proofs)
        .where(sql`${proofs.proofHash} IN (${sql.join(proofHashes.map((h) => sql`${h}`), sql`, `)})`)
        .orderBy(desc(proofs.createdAt))
        .limit(limit);
      
      return result.map((r) => ({
        proofHash: r.proofHash,
        cid: r.cid || null,
        batchId: r.batchId || null,
        anchoredAt: r.anchoredAt || null,
        createdAt: r.createdAt,
        metadata: {
          event_type: contribs.find((c) => c.proofCid === r.proofHash)?.contributionType,
          actor: actor,
          repo: contribs.find((c) => c.proofCid === r.proofHash)?.repoName,
          merged: contribs.find((c) => c.proofCid === r.proofHash)?.verified || false,
        },
      }));
    }
    
    // If wallet address, try to find via contributor wallet
    const contributor = await db
      .select()
      .from(contributors)
      .where(eq(contributors.walletAddress, actor))
      .limit(1);
    
    if (contributor.length === 0) return [];
    
    const contribs = await getContributionsByContributor(contributor[0].id, limit);
    const proofHashes = contribs
      .map((c) => c.proofCid)
      .filter((cid): cid is string => !!cid);
    
    if (proofHashes.length === 0) return [];
    
    const result = await db
      .select()
      .from(proofs)
      .where(sql`${proofs.proofHash} IN (${sql.join(proofHashes.map((h) => sql`${h}`), sql`, `)})`)
      .orderBy(desc(proofs.createdAt))
      .limit(limit);
    
    return result.map((r) => ({
      proofHash: r.proofHash,
      cid: r.cid || null,
      batchId: r.batchId || null,
      anchoredAt: r.anchoredAt || null,
      createdAt: r.createdAt,
      metadata: {
        event_type: contribs.find((c) => c.proofCid === r.proofHash)?.contributionType,
        actor: actor,
        repo: contribs.find((c) => c.proofCid === r.proofHash)?.repoName,
        merged: contribs.find((c) => c.proofCid === r.proofHash)?.verified || false,
      },
    }));
  } catch (error) {
    console.error("[Database] Failed to get proofs by actor:", error);
    return [];
  }
}

/**
 * Gets top proofs by impact (heuristic: reputation points + review count)
 * @param actor - Actor identifier
 * @param limit - Maximum number of proofs to return
 * @returns Array of top proofs
 */
export async function getTopProofsByImpact(actor: string, limit = 3) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const githubMatch = actor.match(/^github:(.+)$/);
    const githubUsername = githubMatch ? githubMatch[1] : null;
    
    let contributorId: number | null = null;
    
    if (githubUsername) {
      const contributor = await getContributorByGithubUsername(githubUsername);
      if (contributor) contributorId = contributor.id;
    } else {
      const contributor = await db
        .select()
        .from(contributors)
        .where(eq(contributors.walletAddress, actor))
        .limit(1);
      if (contributor.length > 0) contributorId = contributor[0].id;
    }
    
    if (!contributorId) return [];
    
    // Get contributions ordered by reputation points
    const contribs = await db
      .select()
      .from(contributions)
      .where(eq(contributions.contributorId, contributorId))
      .orderBy(desc(contributions.reputationPoints))
      .limit(limit);
    
    const proofHashes = contribs
      .map((c) => c.proofCid)
      .filter((cid): cid is string => !!cid);
    
    if (proofHashes.length === 0) return [];
    
    const proofRecords = await db
      .select()
      .from(proofs)
      .where(sql`${proofs.proofHash} IN (${sql.join(proofHashes.map((h) => sql`${h}`), sql`, `)})`);
    
    // Combine and sort by impact
    return contribs
      .map((c) => {
        const proof = proofRecords.find((p) => p.proofHash === c.proofCid);
        if (!proof) return null;
        return {
          proofHash: proof.proofHash,
          cid: proof.cid || null,
          batchId: proof.batchId || null,
          event_type: c.contributionType,
          repo: c.repoName ? `${c.repoOwner}/${c.repoName}` : undefined,
          lines_added: 0, // Would need to extract from metadata
          review_count: 0, // Would need to extract from metadata
          reputationPoints: c.reputationPoints,
          verified: c.verified,
          anchoredAt: proof.anchoredAt || null,
          createdAt: proof.createdAt,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => (b.reputationPoints || 0) - (a.reputationPoints || 0))
      .slice(0, limit);
  } catch (error) {
    console.error("[Database] Failed to get top proofs by impact:", error);
    return [];
  }
}
