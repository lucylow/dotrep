/**
 * Analytics engine (pure functions).
 * Computes reputation metrics from contribution data.
 */

export type ProofRecordLite = {
  proofHash: string;
  cid: string | null;
  batchId: string | null;
  anchoredAt: Date | null;
  createdAt: Date;
  metadata?: {
    event_type?: string;
    actor?: string; // canonical actor identifier, e.g., "github:alice" or wallet
    merged?: boolean | string;
    repo?: string;
    lines_added?: number;
    lines_removed?: number;
    review_count?: number;
    [k: string]: any;
  };
};

export type WeekCount = { weekStart: string; count: number };

function parseDate(d?: Date | string | null): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  const dd = new Date(d);
  if (Number.isNaN(dd.getTime())) return null;
  return dd;
}

function weekStartIso(date: Date): string {
  // compute monday-based week start (00:00:00 UTC)
  const msPerDay = 24 * 60 * 60 * 1000;
  const day = date.getUTCDay(); // 0 (Sun) - 6 (Sat)
  // convert to Monday start: if Sunday (0), subtract 6 days; else subtract (day - 1)
  const offsetDays = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const start = new Date(monday.getTime() - offsetDays * msPerDay);
  return start.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * contributionsPerWeek
 * Returns last N weeks counts for a given actor (if actor not provided, returns global counts).
 */
export function contributionsPerWeek(
  proofs: ProofRecordLite[],
  actor?: string | null,
  weeks = 12
): WeekCount[] {
  // map weekStart -> count
  const counts = new Map<string, number>();
  const now = new Date();
  // get earliest week to include
  const earliest = new Date(now.getTime() - weeks * 7 * 24 * 3600 * 1000);

  for (const p of proofs) {
    const date = parseDate(p.anchoredAt) || parseDate(p.createdAt) || new Date();
    if (!date) continue;
    if (date.getTime() < earliest.getTime()) continue;
    // actor filter if provided
    const actorId = p.metadata?.actor ?? p.metadata?.author ?? null;
    if (actor && actorId !== actor) continue;
    const wk = weekStartIso(date);
    counts.set(wk, (counts.get(wk) || 0) + 1);
  }

  // assemble ordered week list (most recent last)
  const result: WeekCount[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 3600 * 1000);
    const wk = weekStartIso(d);
    result.push({ weekStart: wk, count: counts.get(wk) || 0 });
  }
  return result;
}

/**
 * mergedPrRatio
 * Returns {pr_total, pr_merged, merged_pct} for actor or global.
 */
export function mergedPrRatio(proofs: ProofRecordLite[], actor?: string | null) {
  let pr_total = 0;
  let pr_merged = 0;
  for (const p of proofs) {
    const actorId = p.metadata?.actor ?? null;
    if (actor && actorId !== actor) continue;
    const t = (p.metadata?.event_type || "").toString().toLowerCase();
    if (t === "pull_request" || t === "pr" || t === "pullrequest" || t === "pull_request") {
      pr_total += 1;
      const merged = p.metadata?.merged;
      if (merged === true || merged === "true" || merged === "merged") pr_merged += 1;
    }
  }
  const merged_pct = pr_total === 0 ? 0 : Math.round((100 * pr_merged) / pr_total);
  return { pr_total, pr_merged, merged_pct };
}

/**
 * anomalyDetection (bursty weeks)
 * Strategy:
 *  - compute weekly counts per actor
 *  - compute mean and std across weeks
 *  - flag weeks where count > mean + k * std (k = 3 default)
 *
 * Returns list of { actor, weekStart, count, zscore, reason } flagged ones.
 */
export function anomalyDetection(proofs: ProofRecordLite[], k = 3) {
  // Build actor -> weekStart -> count
  const actorWeek: Map<string, Map<string, number>> = new Map();

  for (const p of proofs) {
    const actorId = p.metadata?.actor ?? "unknown";
    const date = parseDate(p.anchoredAt) || parseDate(p.createdAt) || new Date();
    const wk = weekStartIso(date);
    if (!actorWeek.has(actorId)) actorWeek.set(actorId, new Map());
    const wkMap = actorWeek.get(actorId)!;
    wkMap.set(wk, (wkMap.get(wk) || 0) + 1);
  }

  const flagged: Array<{ actor: string; weekStart: string; count: number; mean: number; std: number; z: number }> = [];

  for (const [actor, wkMap] of actorWeek.entries()) {
    const counts = Array.from(wkMap.values());
    if (counts.length < 2) continue;
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / (counts.length - 1);
    const std = Math.sqrt(variance || 0.0);
    for (const [wk, cnt] of wkMap.entries()) {
      const z = std === 0 ? 0 : (cnt - mean) / std;
      if (z > k) {
        flagged.push({ actor, weekStart: wk, count: cnt, mean, std, z });
      }
    }
  }
  return flagged;
}

/**
 * computeReputationScore
 * Heuristic explainable score:
 * Vector: {quality, impact, consistency, community} each 0-100
 * For POC we compute:
 *  - quality = merged_pct * 100
 *  - impact = min(100, log(1 + unique_repos * 10) * 10) as rough proxy
 *  - consistency = normalized median weekly count (map to 0-100)
 *  - community = placeholder from peer reviews count (metadata.review_count) or 50 default
 *
 * Returns vector + finalScore computed via weights.
 */
export type ReputationVector = { quality: number; impact: number; consistency: number; community: number };
export type ReputationScore = { finalScore: number; vector: ReputationVector; explanation: string[] };

export function computeReputationScore(
  proofs: ProofRecordLite[],
  actor: string | null,
  weights?: Partial<{
    quality: number;
    impact: number;
    consistency: number;
    community: number;
  }>
): ReputationScore {
  const w = {
    quality: weights?.quality ?? 0.4,
    impact: weights?.impact ?? 0.3,
    consistency: weights?.consistency ?? 0.2,
    community: weights?.community ?? 0.1,
  };

  // Quality (merged %)
  const merged = mergedPrRatio(proofs, actor);
  const quality = merged.merged_pct; // 0-100

  // Impact: count unique repos touched and scale
  const repoSet = new Set<string>();
  let reviewSignal = 0;
  for (const p of proofs) {
    const a = p.metadata?.actor ?? null;
    if (actor && a !== actor) continue;
    if (p.metadata?.repo) repoSet.add(p.metadata.repo);
    const rcount = Number(p.metadata?.review_count || 0);
    reviewSignal += isNaN(rcount) ? 0 : rcount;
  }
  const uniqueRepos = repoSet.size;
  const impact = Math.min(100, Math.round(Math.log(1 + uniqueRepos) * 30 + Math.min(20, reviewSignal)));

  // Consistency: use median weekly contributions normalized to 100
  const weeks = contributionsPerWeek(proofs, actor, 12);
  const counts = weeks.map((w0) => w0.count).sort((a, b) => a - b);
  const median = counts.length === 0 ? 0 : counts[Math.floor(counts.length / 2)];
  // map median to 0-100 with a soft cap (e.g., median 0 ->0, median 10 ->100)
  const consistency = Math.min(100, Math.round((median / 10) * 100));

  // Community: proxy from reviewSignal + follower-ish size (not available) -> normalize
  const community = Math.min(100, Math.round(Math.min(100, reviewSignal * 5)));

  const vector: ReputationVector = { quality, impact, consistency, community };

  // final score
  const finalScore = Math.round(
    vector.quality * w.quality + vector.impact * w.impact + vector.consistency * w.consistency + vector.community * w.community
  );

  const explanation = [
    `Quality: merged PR rate = ${merged.pr_merged}/${merged.pr_total} => ${vector.quality}%`,
    `Impact: unique repos = ${uniqueRepos} => ${vector.impact}%`,
    `Consistency: median weekly contributions = ${median} => ${vector.consistency}%`,
    `Community: review signal = ${reviewSignal} => ${vector.community}%`,
  ];

  return { finalScore, vector, explanation };
}


