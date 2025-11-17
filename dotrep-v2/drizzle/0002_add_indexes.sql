-- Add indexes for performance optimization
-- These indexes improve query performance for common operations

-- Index on contributors.githubUsername for fast username lookups
CREATE INDEX IF NOT EXISTS `contributors_githubUsername_idx` ON `contributors` (`githubUsername`);

-- Index on contributors.githubId for fast GitHub ID lookups
CREATE INDEX IF NOT EXISTS `contributors_githubId_idx` ON `contributors` (`githubId`);

-- Index on contributors.reputationScore for leaderboard queries
CREATE INDEX IF NOT EXISTS `contributors_reputationScore_idx` ON `contributors` (`reputationScore` DESC);

-- Index on contributions.contributorId for fast contributor contribution queries
CREATE INDEX IF NOT EXISTS `contributions_contributorId_idx` ON `contributions` (`contributorId`);

-- Index on contributions.createdAt for recent contributions queries
CREATE INDEX IF NOT EXISTS `contributions_createdAt_idx` ON `contributions` (`createdAt` DESC);

-- Composite index for contributor contributions ordered by date
CREATE INDEX IF NOT EXISTS `contributions_contributorId_createdAt_idx` ON `contributions` (`contributorId`, `createdAt` DESC);

-- Index on contributions.verified for filtering verified contributions
CREATE INDEX IF NOT EXISTS `contributions_verified_idx` ON `contributions` (`verified`);

-- Index on achievements.contributorId for fast achievement lookups
CREATE INDEX IF NOT EXISTS `achievements_contributorId_idx` ON `achievements` (`contributorId`);

-- Index on achievements.earnedAt for chronological ordering
CREATE INDEX IF NOT EXISTS `achievements_earnedAt_idx` ON `achievements` (`earnedAt` DESC);

-- Index on anchors.createdAt for recent anchors queries
CREATE INDEX IF NOT EXISTS `anchors_createdAt_idx` ON `anchors` (`createdAt` DESC);

-- Index on users.openId for authentication lookups
CREATE INDEX IF NOT EXISTS `users_openId_idx` ON `users` (`openId`);


