CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contributorId` int NOT NULL,
	`achievementType` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`iconUrl` text,
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `anchors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`merkleRoot` varchar(128) NOT NULL,
	`blockNumber` int,
	`txHash` varchar(128),
	`daCid` text,
	`contributionCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `anchors_id` PRIMARY KEY(`id`),
	CONSTRAINT `anchors_merkleRoot_unique` UNIQUE(`merkleRoot`)
);
--> statement-breakpoint
CREATE TABLE `contributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contributorId` int NOT NULL,
	`contributionType` enum('commit','pull_request','issue','review') NOT NULL,
	`repoName` varchar(255) NOT NULL,
	`repoOwner` varchar(255) NOT NULL,
	`title` text,
	`url` text,
	`proofCid` text,
	`merkleRoot` varchar(128),
	`verified` boolean NOT NULL DEFAULT false,
	`reputationPoints` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contributors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`githubId` varchar(64) NOT NULL,
	`githubUsername` varchar(255) NOT NULL,
	`githubAvatar` text,
	`walletAddress` varchar(128),
	`reputationScore` int NOT NULL DEFAULT 0,
	`totalContributions` int NOT NULL DEFAULT 0,
	`verified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contributors_id` PRIMARY KEY(`id`),
	CONSTRAINT `contributors_githubId_unique` UNIQUE(`githubId`)
);
