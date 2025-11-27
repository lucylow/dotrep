# Social Reputation Frontend Improvements

## Overview

Enhanced the DKG Interaction page with comprehensive social reputation features, focusing on influencer profiles, social metrics, and social graph connections.

## 🎯 New Features

### 1. Social Reputation Profiles Tab

**Features:**
- Browse all social reputation profiles
- Search by username, name, specialty, or platform
- Click-to-view detailed profile information
- Real-time search with instant results

**Profile Information Displayed:**
- Basic Info: Display name, username, profile image
- Reputation Metrics:
  - Overall Score (0-100)
  - Social Rank (0-100)
  - Economic Stake (0-100)
  - Endorsement Quality (0-100)
  - Temporal Consistency (0-100)
- Social Metrics:
  - Follower count
  - Following count
  - Engagement rate
  - Total posts
  - Average likes/shares
- Sybil Resistance:
  - Sybil risk score
  - Connection diversity
  - Behavior anomaly score
- Specialties: Tags for areas of expertise
- Campaign Participation: Number of campaigns
- Total Earnings: Lifetime earnings from campaigns

### 2. Social Graph Tab

**Features:**
- Select any profile to view connections
- Visualize social network relationships
- Connection types: follows, interactsWith, endorses, collaborates
- Connection strength indicators
- Platform-specific connections

**Connection Information:**
- Connection type and strength
- Platform where connection exists
- Timestamp of connection
- Related profile information

**Campaign Participation View:**
- Campaign history for selected profile
- Campaign status (applied, accepted, active, completed, rejected)
- Performance metrics (engagement, reach, conversion rate)
- Earnings breakdown (base payment + bonus)

### 3. Enhanced Query Tab

**New Features:**
- Automatic detection of social reputation profiles
- Enhanced result display when querying social profiles
- Social metrics shown alongside standard reputation data
- Sybil risk indicators

## 📊 Mock Data Structure

### Social Reputation Profiles
```typescript
interface SocialReputationProfile {
  did: string;
  ual: string;
  username: string;
  displayName: string;
  platforms: string[];
  reputationMetrics: {
    overallScore: number;
    socialRank: number;
    economicStake: number;
    endorsementQuality: number;
    temporalConsistency: number;
  };
  socialMetrics: {
    followerCount: number;
    followingCount: number;
    engagementRate: number;
    totalPosts: number;
    averageLikes: number;
    averageShares: number;
  };
  sybilResistance: {
    behaviorAnomalyScore: number;
    connectionDiversity: number;
    sybilRisk: number;
  };
  specialties: string[];
  campaignsParticipated: number;
  totalEarnings: number;
}
```

### Social Connections
```typescript
interface SocialConnection {
  fromDid: string;
  toDid: string;
  connectionType: 'follows' | 'interactsWith' | 'endorses' | 'collaborates';
  strength: number; // 0-1
  timestamp: number;
  platform?: string;
}
```

### Campaign Participation
```typescript
interface CampaignParticipation {
  campaignId: string;
  campaignName: string;
  influencerDid: string;
  status: 'applied' | 'accepted' | 'active' | 'completed' | 'rejected';
  performance: {
    engagement: number;
    reach: number;
    conversionRate: number;
    qualityScore: number;
  };
  earnings: {
    basePayment: number;
    bonus: number;
    total: number;
  };
}
```

## 🎨 UI/UX Enhancements

### Visual Improvements
1. **Profile Cards**: 
   - Gradient avatars with initials
   - Color-coded reputation badges
   - Platform tags
   - Quick stats grid

2. **Detail View**:
   - Sticky sidebar for selected profile
   - Comprehensive metrics display
   - Visual hierarchy with sections
   - Badge indicators for status

3. **Social Graph**:
   - Connection cards with avatars
   - Strength indicators
   - Platform badges
   - Campaign history timeline

### Interactive Features
- Click-to-select profiles
- Real-time search
- Hover effects on cards
- Status badges with color coding
- Copy-to-clipboard for UALs

## 📝 Files Created/Modified

### New Files
- `dotrep-v2/client/src/data/socialReputationMockData.ts` - Social reputation mock data

### Modified Files
- `dotrep-v2/client/src/pages/DKGInteractionPage.tsx` - Enhanced with social reputation features

## 🚀 Usage Examples

### Browse Social Profiles
1. Navigate to `/dkg-interaction`
2. Click on "Social Profiles" tab
3. Browse all profiles or search for specific ones
4. Click on any profile to view detailed information

### View Social Graph
1. Go to "Social Graph" tab
2. Select a profile from the list
3. View all connections for that profile
4. See connection types, strength, and platforms
5. Scroll down to view campaign participation history

### Query Social Profile
1. Go to "Query by UAL" tab
2. Enter a UAL from a social profile
3. If it's a social reputation profile, enhanced metrics will be displayed
4. View both standard reputation and social metrics

## 🎯 Key Features

✅ Comprehensive social reputation profiles
✅ Social metrics (followers, engagement, posts)
✅ Reputation metrics (socialRank, overallScore, etc.)
✅ Sybil resistance indicators
✅ Social graph connections visualization
✅ Campaign participation history
✅ Real-time search functionality
✅ Interactive profile selection
✅ Platform-specific information
✅ Earnings tracking

## 📈 Mock Data Included

### Profiles (3)
1. **Tech Guru Alex** - High reputation (89%), 125K followers, tech specialist
2. **Crypto Insider** - Medium reputation (76%), 89K followers, crypto specialist
3. **Blockchain Developer** - Top reputation (92%), 45K followers, developer specialist

### Connections (3)
- Tech Guru ↔ Blockchain Developer (collaborates)
- Tech Guru ↔ Crypto Insider (interacts)
- Crypto Insider → Blockchain Developer (follows)

### Campaigns (3)
- Tech Gadget Launch (completed, $325 earned)
- Crypto Exchange Promotion (active, $150 earned)
- Blockchain Developer Tools (completed, $500 earned)

## 🔄 Integration Points

The social reputation features integrate with:
- DKG asset publishing (UALs)
- Reputation query system
- Campaign service
- Social graph reputation service
- Sybil detection system

## 🎨 Design Highlights

- **Color Scheme**: Purple gradient (#6C3CF0 to #A074FF) for primary actions
- **Status Colors**: Green (completed), Blue (active), Yellow (pending), Red (failed)
- **Badge System**: Outline badges for platforms, colored badges for status
- **Card Layout**: Responsive grid with hover effects
- **Typography**: Clear hierarchy with bold headings and muted descriptions

## 📱 Responsive Design

- Mobile: Single column layout
- Tablet: 2-column grid for profiles
- Desktop: 3-column grid with sidebar detail view
- All breakpoints: Touch-friendly buttons and cards

