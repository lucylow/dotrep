# Mock Data Guide

This document describes the mock data available in DotRep for development, testing, and demos.

## 📊 Database Seed Data

### Location
`dotrep-v2/seed.ts`

### Usage
```bash
cd dotrep-v2
pnpm db:push  # Run migrations first
tsx seed.ts   # Run seed script
```

### What's Included

#### Contributors (6 total)
- **alice-dev** - 1250 reputation, 42 contributions
- **bob-rustacean** - 980 reputation, 35 contributions
- **charlie-polkadot** - 2100 reputation, 78 contributions (top contributor)
- **diana-substrate** - 750 reputation, 28 contributions
- **eve-xcm** - 1650 reputation, 55 contributions
- **frank-parachain** - 450 reputation, 15 contributions (unverified)

#### Contributions (15+ total)
- Mix of commits, pull requests, issues, and reviews
- Various repositories (polkadot-sdk, substrate, polkadot, cumulus)
- Different verification states
- Realistic reputation point values

#### Achievements (12+ total)
- First Contribution badges
- Reputation milestones (1000+, 1500+, 2000+)
- Special achievements (XCM Expert, Test Master, etc.)
- Various icons and descriptions

#### Anchors (4 total)
- On-chain proof anchors
- Different block numbers
- Transaction hashes
- Contribution counts

## 🎨 Frontend Mock Data

### Location
`dotrep-v2/client/src/data/mockData.ts`

### Usage
```typescript
import { 
  mockContributors, 
  mockContributions, 
  mockAchievements,
  getMockContributor,
  getMockContributions,
  mockStats
} from '@/data/mockData';
```

### Features
- Type-safe TypeScript interfaces
- Helper functions for filtering
- Statistics calculations
- Realistic timestamps

## 🚀 Demo Scenarios

### Scenario 1: Top Contributor View
- Use `charlie-polkadot` (ID: 3)
- Shows high reputation (2100)
- Multiple achievements
- Cross-chain contributions

### Scenario 2: New Contributor
- Use `frank-parachain` (ID: 6)
- Unverified status
- Lower reputation
- Fewer contributions

### Scenario 3: Active Developer
- Use `alice-dev` (ID: 1)
- Balanced profile
- Multiple contribution types
- Various achievements

## 📝 Adding More Mock Data

### To Database Seed
Edit `dotrep-v2/seed.ts`:
```typescript
const mockContributors = [
  // Add new contributor objects
];

const mockContributions = [
  // Add new contribution objects
];
```

### To Frontend Mock Data
Edit `dotrep-v2/client/src/data/mockData.ts`:
```typescript
export const mockContributors: MockContributor[] = [
  // Add new contributor objects
];
```

## 🔄 Resetting Mock Data

To clear and reseed:
```bash
cd dotrep-v2
# The seed script clears existing data before inserting
tsx seed.ts
```

## ✅ Verification

After seeding, verify data:
```sql
SELECT COUNT(*) FROM contributors;
SELECT COUNT(*) FROM contributions;
SELECT COUNT(*) FROM achievements;
```

Expected counts:
- Contributors: 6
- Contributions: 15+
- Achievements: 12+
- Anchors: 4

## 🎯 Use Cases

1. **Development**: Test UI components without backend
2. **Demos**: Showcase features with realistic data
3. **Testing**: Unit and integration tests
4. **Hackathon**: Quick setup for judges

---

**Note**: Mock data uses realistic but fake GitHub IDs, wallet addresses, and repository information. All data is for demonstration purposes only.


