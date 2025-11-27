/**
 * Social Network Mock Data for DKG Integration
 * 
 * This file provides comprehensive mock data for Twitter, Reddit, and TikTok
 * in JSON-LD and RDF triple formats for testing and development with DKG.
 * 
 * Formats:
 * - JSON-LD: JavaScript Object Notation for Linked Data (web-friendly)
 * - RDF Triples: Subject-Predicate-Object format (semantic web standard)
 * 
 * References:
 * - https://www.w3.org/TR/json-ld11/
 * - https://jsonld.com/social-network-profiles/
 * - https://schema.org/SocialMediaPosting
 */

export interface SocialNetworkUser {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  profileImage?: string;
  verified?: boolean;
  followerCount?: number;
  followingCount?: number;
  createdAt: string;
  platform: 'twitter' | 'reddit' | 'tiktok';
}

export interface SocialNetworkPost {
  id: string;
  authorId: string;
  content: string;
  timestamp: string;
  likes?: number;
  shares?: number;
  comments?: number;
  views?: number;
  url?: string;
  platform: 'twitter' | 'reddit' | 'tiktok';
  type?: 'tweet' | 'post' | 'comment' | 'video' | 'thread';
  parentId?: string; // For replies/threads
}

export interface SocialNetworkRelationship {
  fromUserId: string;
  toUserId: string;
  relationshipType: 'follows' | 'friends' | 'subscribed' | 'blocked';
  timestamp: string;
  platform: 'twitter' | 'reddit' | 'tiktok';
}

// ============================================================================
// TWITTER MOCK DATA
// ============================================================================

export const TWITTER_USERS: SocialNetworkUser[] = [
  {
    id: 'twitter_user_001',
    username: '@elonmusk',
    displayName: 'Elon Musk',
    bio: 'Tesla, SpaceX, Neuralink, Boring Company',
    profileImage: 'https://pbs.twimg.com/profile_images/elon.jpg',
    verified: true,
    followerCount: 150000000,
    followingCount: 150,
    createdAt: '2009-06-01T00:00:00Z',
    platform: 'twitter',
  },
  {
    id: 'twitter_user_002',
    username: '@vitalikbuterin',
    displayName: 'Vitalik Buterin',
    bio: 'Co-founder of Ethereum',
    profileImage: 'https://pbs.twimg.com/profile_images/vitalik.jpg',
    verified: true,
    followerCount: 5000000,
    followingCount: 500,
    createdAt: '2011-01-01T00:00:00Z',
    platform: 'twitter',
  },
  {
    id: 'twitter_user_003',
    username: '@polkadot',
    displayName: 'Polkadot',
    bio: 'The blockspace ecosystem for boundless innovation',
    profileImage: 'https://pbs.twimg.com/profile_images/polkadot.jpg',
    verified: true,
    followerCount: 2000000,
    followingCount: 1000,
    createdAt: '2016-10-15T00:00:00Z',
    platform: 'twitter',
  },
  {
    id: 'twitter_user_004',
    username: '@web3dev',
    displayName: 'Web3 Developer',
    bio: 'Building decentralized applications',
    profileImage: 'https://pbs.twimg.com/profile_images/web3dev.jpg',
    verified: false,
    followerCount: 50000,
    followingCount: 2000,
    createdAt: '2020-03-15T00:00:00Z',
    platform: 'twitter',
  },
];

export const TWITTER_POSTS: SocialNetworkPost[] = [
  {
    id: 'tweet_001',
    authorId: 'twitter_user_001',
    content: 'Just launched a new feature on Mars! 🚀 #SpaceX',
    timestamp: '2025-01-15T10:30:00Z',
    likes: 150000,
    shares: 25000,
    comments: 5000,
    views: 5000000,
    url: 'https://twitter.com/elonmusk/status/tweet_001',
    platform: 'twitter',
    type: 'tweet',
  },
  {
    id: 'tweet_002',
    authorId: 'twitter_user_002',
    content: 'Excited about the latest Ethereum upgrade! EIP-4844 brings significant improvements to scalability.',
    timestamp: '2025-01-14T14:20:00Z',
    likes: 45000,
    shares: 8000,
    comments: 2000,
    views: 1000000,
    url: 'https://twitter.com/vitalikbuterin/status/tweet_002',
    platform: 'twitter',
    type: 'tweet',
  },
  {
    id: 'tweet_003',
    authorId: 'twitter_user_003',
    content: 'Polkadot 2.0 is here! Introducing asynchronous backing for improved performance. 🎉',
    timestamp: '2025-01-13T09:15:00Z',
    likes: 12000,
    shares: 3000,
    comments: 800,
    views: 500000,
    url: 'https://twitter.com/polkadot/status/tweet_003',
    platform: 'twitter',
    type: 'tweet',
  },
  {
    id: 'tweet_004',
    authorId: 'twitter_user_004',
    content: 'Just published a tutorial on building DKG integrations with OriginTrail. Check it out!',
    timestamp: '2025-01-12T16:45:00Z',
    likes: 500,
    shares: 150,
    comments: 50,
    views: 10000,
    url: 'https://twitter.com/web3dev/status/tweet_004',
    platform: 'twitter',
    type: 'tweet',
  },
  {
    id: 'tweet_005',
    authorId: 'twitter_user_002',
    content: 'Thread: Understanding zero-knowledge proofs in blockchain applications...',
    timestamp: '2025-01-11T11:00:00Z',
    likes: 30000,
    shares: 5000,
    comments: 1000,
    views: 800000,
    url: 'https://twitter.com/vitalikbuterin/status/tweet_005',
    platform: 'twitter',
    type: 'thread',
  },
];

export const TWITTER_RELATIONSHIPS: SocialNetworkRelationship[] = [
  {
    fromUserId: 'twitter_user_004',
    toUserId: 'twitter_user_001',
    relationshipType: 'follows',
    timestamp: '2024-01-01T00:00:00Z',
    platform: 'twitter',
  },
  {
    fromUserId: 'twitter_user_004',
    toUserId: 'twitter_user_002',
    relationshipType: 'follows',
    timestamp: '2024-01-02T00:00:00Z',
    platform: 'twitter',
  },
  {
    fromUserId: 'twitter_user_004',
    toUserId: 'twitter_user_003',
    relationshipType: 'follows',
    timestamp: '2024-01-03T00:00:00Z',
    platform: 'twitter',
  },
  {
    fromUserId: 'twitter_user_002',
    toUserId: 'twitter_user_003',
    relationshipType: 'follows',
    timestamp: '2023-12-15T00:00:00Z',
    platform: 'twitter',
  },
];

// ============================================================================
// REDDIT MOCK DATA
// ============================================================================

export const REDDIT_USERS: SocialNetworkUser[] = [
  {
    id: 'reddit_user_001',
    username: 'u/cryptocurrency_enthusiast',
    displayName: 'Crypto Enthusiast',
    bio: 'Blockchain developer and researcher',
    verified: false,
    followerCount: 5000,
    followingCount: 200,
    createdAt: '2018-05-10T00:00:00Z',
    platform: 'reddit',
  },
  {
    id: 'reddit_user_002',
    username: 'u/polkadot_mod',
    displayName: 'Polkadot Moderator',
    bio: 'Official Polkadot community moderator',
    verified: true,
    followerCount: 15000,
    followingCount: 50,
    createdAt: '2019-01-20T00:00:00Z',
    platform: 'reddit',
  },
  {
    id: 'reddit_user_003',
    username: 'u/web3_builder',
    displayName: 'Web3 Builder',
    bio: 'Building the decentralized web',
    verified: false,
    followerCount: 8000,
    followingCount: 300,
    createdAt: '2020-08-15T00:00:00Z',
    platform: 'reddit',
  },
  {
    id: 'reddit_user_004',
    username: 'u/dkg_researcher',
    displayName: 'DKG Researcher',
    bio: 'Researching decentralized knowledge graphs',
    verified: false,
    followerCount: 3000,
    followingCount: 100,
    createdAt: '2021-03-01T00:00:00Z',
    platform: 'reddit',
  },
];

export const REDDIT_POSTS: SocialNetworkPost[] = [
  {
    id: 'reddit_post_001',
    authorId: 'reddit_user_001',
    content: 'What are your thoughts on the latest Polkadot upgrade? I\'ve been testing it and the performance improvements are significant.',
    timestamp: '2025-01-15T08:00:00Z',
    likes: 1250,
    shares: 0,
    comments: 85,
    views: 50000,
    url: 'https://reddit.com/r/polkadot/comments/reddit_post_001',
    platform: 'reddit',
    type: 'post',
  },
  {
    id: 'reddit_post_002',
    authorId: 'reddit_user_002',
    content: 'Announcing the Polkadot 2.0 community call! Join us this Friday to discuss the new features.',
    timestamp: '2025-01-14T12:00:00Z',
    likes: 2500,
    shares: 0,
    comments: 200,
    views: 100000,
    url: 'https://reddit.com/r/polkadot/comments/reddit_post_002',
    platform: 'reddit',
    type: 'post',
  },
  {
    id: 'reddit_comment_001',
    authorId: 'reddit_user_003',
    content: 'Great post! I\'ve been working on DKG integrations and this upgrade makes it much easier.',
    timestamp: '2025-01-15T09:30:00Z',
    likes: 150,
    shares: 0,
    comments: 10,
    views: 5000,
    url: 'https://reddit.com/r/polkadot/comments/reddit_post_001/reddit_comment_001',
    platform: 'reddit',
    type: 'comment',
    parentId: 'reddit_post_001',
  },
  {
    id: 'reddit_post_003',
    authorId: 'reddit_user_004',
    content: 'I just published a comprehensive guide on using OriginTrail DKG with Polkadot. Check it out!',
    timestamp: '2025-01-13T15:20:00Z',
    likes: 800,
    shares: 0,
    comments: 45,
    views: 25000,
    url: 'https://reddit.com/r/web3/comments/reddit_post_003',
    platform: 'reddit',
    type: 'post',
  },
  {
    id: 'reddit_comment_002',
    authorId: 'reddit_user_001',
    content: 'This is exactly what I needed! Thanks for sharing.',
    timestamp: '2025-01-13T16:00:00Z',
    likes: 50,
    shares: 0,
    comments: 5,
    views: 2000,
    url: 'https://reddit.com/r/web3/comments/reddit_post_003/reddit_comment_002',
    platform: 'reddit',
    type: 'comment',
    parentId: 'reddit_post_003',
  },
];

export const REDDIT_RELATIONSHIPS: SocialNetworkRelationship[] = [
  {
    fromUserId: 'reddit_user_003',
    toUserId: 'reddit_user_001',
    relationshipType: 'follows',
    timestamp: '2024-06-01T00:00:00Z',
    platform: 'reddit',
  },
  {
    fromUserId: 'reddit_user_004',
    toUserId: 'reddit_user_002',
    relationshipType: 'follows',
    timestamp: '2024-07-15T00:00:00Z',
    platform: 'reddit',
  },
  {
    fromUserId: 'reddit_user_001',
    toUserId: 'reddit_user_004',
    relationshipType: 'follows',
    timestamp: '2024-08-20T00:00:00Z',
    platform: 'reddit',
  },
];

// ============================================================================
// TIKTOK MOCK DATA
// ============================================================================

export const TIKTOK_USERS: SocialNetworkUser[] = [
  {
    id: 'tiktok_user_001',
    username: '@cryptoexplained',
    displayName: 'Crypto Explained',
    bio: 'Making blockchain simple 🚀',
    profileImage: 'https://p16-sign.tiktokcdn.com/cryptoexplained.jpg',
    verified: true,
    followerCount: 2000000,
    followingCount: 500,
    createdAt: '2020-01-15T00:00:00Z',
    platform: 'tiktok',
  },
  {
    id: 'tiktok_user_002',
    username: '@web3creator',
    displayName: 'Web3 Creator',
    bio: 'Building in public 📱',
    profileImage: 'https://p16-sign.tiktokcdn.com/web3creator.jpg',
    verified: false,
    followerCount: 500000,
    followingCount: 1000,
    createdAt: '2021-03-20T00:00:00Z',
    platform: 'tiktok',
  },
  {
    id: 'tiktok_user_003',
    username: '@polkadot_tok',
    displayName: 'Polkadot Tok',
    bio: 'Official Polkadot TikTok',
    profileImage: 'https://p16-sign.tiktokcdn.com/polkadot_tok.jpg',
    verified: true,
    followerCount: 800000,
    followingCount: 200,
    createdAt: '2022-05-10T00:00:00Z',
    platform: 'tiktok',
  },
  {
    id: 'tiktok_user_004',
    username: '@dkg_tutorials',
    displayName: 'DKG Tutorials',
    bio: 'Learn about Decentralized Knowledge Graphs',
    profileImage: 'https://p16-sign.tiktokcdn.com/dkg_tutorials.jpg',
    verified: false,
    followerCount: 100000,
    followingCount: 300,
    createdAt: '2023-01-01T00:00:00Z',
    platform: 'tiktok',
  },
];

export const TIKTOK_POSTS: SocialNetworkPost[] = [
  {
    id: 'tiktok_video_001',
    authorId: 'tiktok_user_001',
    content: 'How Polkadot 2.0 changes everything! #polkadot #blockchain #crypto',
    timestamp: '2025-01-15T18:00:00Z',
    likes: 500000,
    shares: 50000,
    comments: 10000,
    views: 10000000,
    url: 'https://tiktok.com/@cryptoexplained/video/tiktok_video_001',
    platform: 'tiktok',
    type: 'video',
  },
  {
    id: 'tiktok_video_002',
    authorId: 'tiktok_user_002',
    content: 'Building my first DKG integration - day 1 progress! #web3 #coding #dkg',
    timestamp: '2025-01-14T20:30:00Z',
    likes: 25000,
    shares: 2000,
    comments: 500,
    views: 500000,
    url: 'https://tiktok.com/@web3creator/video/tiktok_video_002',
    platform: 'tiktok',
    type: 'video',
  },
  {
    id: 'tiktok_video_003',
    authorId: 'tiktok_user_003',
    content: 'Polkadot ecosystem update - what\'s new this week! #polkadot #ecosystem',
    timestamp: '2025-01-13T16:00:00Z',
    likes: 150000,
    shares: 15000,
    comments: 3000,
    views: 2000000,
    url: 'https://tiktok.com/@polkadot_tok/video/tiktok_video_003',
    platform: 'tiktok',
    type: 'video',
  },
  {
    id: 'tiktok_video_004',
    authorId: 'tiktok_user_004',
    content: 'Tutorial: How to query DKG using SPARQL #dkg #tutorial #web3',
    timestamp: '2025-01-12T14:00:00Z',
    likes: 8000,
    shares: 800,
    comments: 200,
    views: 150000,
    url: 'https://tiktok.com/@dkg_tutorials/video/tiktok_video_004',
    platform: 'tiktok',
    type: 'video',
  },
  {
    id: 'tiktok_video_005',
    authorId: 'tiktok_user_001',
    content: '5 things you need to know about OriginTrail DKG #origintrail #dkg #blockchain',
    timestamp: '2025-01-11T12:00:00Z',
    likes: 300000,
    shares: 30000,
    comments: 6000,
    views: 5000000,
    url: 'https://tiktok.com/@cryptoexplained/video/tiktok_video_005',
    platform: 'tiktok',
    type: 'video',
  },
];

export const TIKTOK_RELATIONSHIPS: SocialNetworkRelationship[] = [
  {
    fromUserId: 'tiktok_user_002',
    toUserId: 'tiktok_user_001',
    relationshipType: 'follows',
    timestamp: '2023-06-01T00:00:00Z',
    platform: 'tiktok',
  },
  {
    fromUserId: 'tiktok_user_004',
    toUserId: 'tiktok_user_003',
    relationshipType: 'follows',
    timestamp: '2023-07-15T00:00:00Z',
    platform: 'tiktok',
  },
  {
    fromUserId: 'tiktok_user_004',
    toUserId: 'tiktok_user_001',
    relationshipType: 'follows',
    timestamp: '2023-08-20T00:00:00Z',
    platform: 'tiktok',
  },
];

// ============================================================================
// JSON-LD FORMAT CONVERTERS
// ============================================================================

/**
 * Convert Twitter user to JSON-LD format
 */
export function twitterUserToJSONLD(user: SocialNetworkUser): any {
  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      'twitter': 'https://twitter.com/ontology/',
      'soc': 'https://schema.org/',
    },
    '@type': 'Person',
    '@id': `https://twitter.com/${user.username.replace('@', '')}`,
    'soc:name': user.displayName,
    'soc:alternateName': user.username,
    'soc:description': user.bio,
    'soc:image': user.profileImage,
    'twitter:verified': user.verified,
    'twitter:followerCount': user.followerCount,
    'twitter:followingCount': user.followingCount,
    'soc:dateCreated': user.createdAt,
    'soc:sameAs': `https://twitter.com/${user.username.replace('@', '')}`,
  };
}

/**
 * Convert Twitter post to JSON-LD format
 */
export function twitterPostToJSONLD(post: SocialNetworkPost, author: SocialNetworkUser): any {
  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      'twitter': 'https://twitter.com/ontology/',
      'soc': 'https://schema.org/',
    },
    '@type': 'SocialMediaPosting',
    '@id': post.url,
    'soc:headline': post.content.substring(0, 100),
    'soc:text': post.content,
    'soc:datePublished': post.timestamp,
    'soc:author': {
      '@id': `https://twitter.com/${author.username.replace('@', '')}`,
      '@type': 'Person',
      'soc:name': author.displayName,
    },
    'twitter:likeCount': post.likes,
    'twitter:retweetCount': post.shares,
    'twitter:replyCount': post.comments,
    'twitter:viewCount': post.views,
    'twitter:postType': post.type,
    'soc:url': post.url,
    ...(post.parentId && {
      'soc:replyTo': {
        '@id': `https://twitter.com/status/${post.parentId}`,
      },
    }),
  };
}

/**
 * Convert Reddit user to JSON-LD format
 */
export function redditUserToJSONLD(user: SocialNetworkUser): any {
  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      'reddit': 'https://reddit.com/ontology/',
      'soc': 'https://schema.org/',
    },
    '@type': 'Person',
    '@id': `https://reddit.com/user/${user.username.replace('u/', '')}`,
    'soc:name': user.displayName,
    'soc:alternateName': user.username,
    'soc:description': user.bio,
    'reddit:verified': user.verified,
    'reddit:karma': user.followerCount, // Using followerCount as karma proxy
    'soc:dateCreated': user.createdAt,
    'soc:sameAs': `https://reddit.com/user/${user.username.replace('u/', '')}`,
  };
}

/**
 * Convert Reddit post to JSON-LD format
 */
export function redditPostToJSONLD(post: SocialNetworkPost, author: SocialNetworkUser): any {
  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      'reddit': 'https://reddit.com/ontology/',
      'soc': 'https://schema.org/',
    },
    '@type': 'SocialMediaPosting',
    '@id': post.url,
    'soc:headline': post.content.substring(0, 100),
    'soc:text': post.content,
    'soc:datePublished': post.timestamp,
    'soc:author': {
      '@id': `https://reddit.com/user/${author.username.replace('u/', '')}`,
      '@type': 'Person',
      'soc:name': author.displayName,
    },
    'reddit:upvoteCount': post.likes,
    'reddit:commentCount': post.comments,
    'reddit:viewCount': post.views,
    'reddit:postType': post.type,
    'soc:url': post.url,
    ...(post.parentId && {
      'soc:replyTo': {
        '@id': `https://reddit.com/comments/${post.parentId}`,
      },
    }),
  };
}

/**
 * Convert TikTok user to JSON-LD format
 */
export function tiktokUserToJSONLD(user: SocialNetworkUser): any {
  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      'tiktok': 'https://tiktok.com/ontology/',
      'soc': 'https://schema.org/',
    },
    '@type': 'Person',
    '@id': `https://tiktok.com/@${user.username.replace('@', '')}`,
    'soc:name': user.displayName,
    'soc:alternateName': user.username,
    'soc:description': user.bio,
    'soc:image': user.profileImage,
    'tiktok:verified': user.verified,
    'tiktok:followerCount': user.followerCount,
    'tiktok:followingCount': user.followingCount,
    'soc:dateCreated': user.createdAt,
    'soc:sameAs': `https://tiktok.com/@${user.username.replace('@', '')}`,
  };
}

/**
 * Convert TikTok post to JSON-LD format
 */
export function tiktokPostToJSONLD(post: SocialNetworkPost, author: SocialNetworkUser): any {
  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      'tiktok': 'https://tiktok.com/ontology/',
      'soc': 'https://schema.org/',
    },
    '@type': 'VideoObject',
    '@id': post.url,
    'soc:name': post.content.substring(0, 100),
    'soc:description': post.content,
    'soc:uploadDate': post.timestamp,
    'soc:author': {
      '@id': `https://tiktok.com/@${author.username.replace('@', '')}`,
      '@type': 'Person',
      'soc:name': author.displayName,
    },
    'tiktok:likeCount': post.likes,
    'tiktok:shareCount': post.shares,
    'tiktok:commentCount': post.comments,
    'tiktok:viewCount': post.views,
    'tiktok:videoType': post.type,
    'soc:url': post.url,
  };
}

/**
 * Convert relationship to JSON-LD format
 */
export function relationshipToJSONLD(relationship: SocialNetworkRelationship): any {
  const platformPrefix = relationship.platform === 'twitter' 
    ? 'https://twitter.com/'
    : relationship.platform === 'reddit'
    ? 'https://reddit.com/user/'
    : 'https://tiktok.com/@';
  
  const fromUser = getUserById(relationship.fromUserId);
  const toUser = getUserById(relationship.toUserId);
  
  if (!fromUser || !toUser) return null;
  
  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      'soc': 'https://schema.org/',
    },
    '@type': 'FollowAction',
    '@id': `${platformPrefix}${fromUser.username.replace(/[@u\/]/g, '')}/follows/${toUser.username.replace(/[@u\/]/g, '')}`,
    'soc:agent': {
      '@id': `${platformPrefix}${fromUser.username.replace(/[@u\/]/g, '')}`,
      '@type': 'Person',
      'soc:name': fromUser.displayName,
    },
    'soc:object': {
      '@id': `${platformPrefix}${toUser.username.replace(/[@u\/]/g, '')}`,
      '@type': 'Person',
      'soc:name': toUser.displayName,
    },
    'soc:startTime': relationship.timestamp,
    'soc:actionStatus': 'https://schema.org/CompletedActionStatus',
  };
}

// ============================================================================
// RDF TRIPLE FORMAT CONVERTERS
// ============================================================================

export interface RDFTriple {
  subject: string;
  predicate: string;
  object: string | { value: string; type?: string };
}

/**
 * Convert Twitter user to RDF triples
 */
export function twitterUserToRDFTriples(user: SocialNetworkUser): RDFTriple[] {
  const userId = `https://twitter.com/${user.username.replace('@', '')}`;
  const triples: RDFTriple[] = [
    {
      subject: userId,
      predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      object: 'http://schema.org/Person',
    },
    {
      subject: userId,
      predicate: 'http://schema.org/name',
      object: { value: user.displayName, type: 'http://www.w3.org/2001/XMLSchema#string' },
    },
    {
      subject: userId,
      predicate: 'http://schema.org/alternateName',
      object: { value: user.username, type: 'http://www.w3.org/2001/XMLSchema#string' },
    },
    {
      subject: userId,
      predicate: 'http://schema.org/dateCreated',
      object: { value: user.createdAt, type: 'http://www.w3.org/2001/XMLSchema#dateTime' },
    },
  ];
  
  if (user.bio) {
    triples.push({
      subject: userId,
      predicate: 'http://schema.org/description',
      object: { value: user.bio, type: 'http://www.w3.org/2001/XMLSchema#string' },
    });
  }
  
  if (user.verified) {
    triples.push({
      subject: userId,
      predicate: 'https://twitter.com/ontology/verified',
      object: { value: 'true', type: 'http://www.w3.org/2001/XMLSchema#boolean' },
    });
  }
  
  if (user.followerCount) {
    triples.push({
      subject: userId,
      predicate: 'https://twitter.com/ontology/followerCount',
      object: { value: user.followerCount.toString(), type: 'http://www.w3.org/2001/XMLSchema#integer' },
    });
  }
  
  return triples;
}

/**
 * Convert Twitter post to RDF triples
 */
export function twitterPostToRDFTriples(post: SocialNetworkPost, author: SocialNetworkUser): RDFTriple[] {
  const postId = post.url || `https://twitter.com/status/${post.id}`;
  const authorId = `https://twitter.com/${author.username.replace('@', '')}`;
  const triples: RDFTriple[] = [
    {
      subject: postId,
      predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      object: 'http://schema.org/SocialMediaPosting',
    },
    {
      subject: postId,
      predicate: 'http://schema.org/text',
      object: { value: post.content, type: 'http://www.w3.org/2001/XMLSchema#string' },
    },
    {
      subject: postId,
      predicate: 'http://schema.org/datePublished',
      object: { value: post.timestamp, type: 'http://www.w3.org/2001/XMLSchema#dateTime' },
    },
    {
      subject: postId,
      predicate: 'http://schema.org/author',
      object: authorId,
    },
  ];
  
  if (post.likes) {
    triples.push({
      subject: postId,
      predicate: 'https://twitter.com/ontology/likeCount',
      object: { value: post.likes.toString(), type: 'http://www.w3.org/2001/XMLSchema#integer' },
    });
  }
  
  if (post.shares) {
    triples.push({
      subject: postId,
      predicate: 'https://twitter.com/ontology/retweetCount',
      object: { value: post.shares.toString(), type: 'http://www.w3.org/2001/XMLSchema#integer' },
    });
  }
  
  if (post.parentId) {
    triples.push({
      subject: postId,
      predicate: 'http://schema.org/replyTo',
      object: `https://twitter.com/status/${post.parentId}`,
    });
  }
  
  return triples;
}

/**
 * Convert relationship to RDF triples
 */
export function relationshipToRDFTriples(relationship: SocialNetworkRelationship): RDFTriple[] {
  const fromUser = getUserById(relationship.fromUserId);
  const toUser = getUserById(relationship.toUserId);
  
  if (!fromUser || !toUser) return [];
  
  const platformPrefix = relationship.platform === 'twitter' 
    ? 'https://twitter.com/'
    : relationship.platform === 'reddit'
    ? 'https://reddit.com/user/'
    : 'https://tiktok.com/@';
  
  const fromUserId = `${platformPrefix}${fromUser.username.replace(/[@u\/]/g, '')}`;
  const toUserId = `${platformPrefix}${toUser.username.replace(/[@u\/]/g, '')}`;
  const relationshipId = `${fromUserId}/follows/${toUserId}`;
  
  return [
    {
      subject: relationshipId,
      predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      object: 'http://schema.org/FollowAction',
    },
    {
      subject: relationshipId,
      predicate: 'http://schema.org/agent',
      object: fromUserId,
    },
    {
      subject: relationshipId,
      predicate: 'http://schema.org/object',
      object: toUserId,
    },
    {
      subject: relationshipId,
      predicate: 'http://schema.org/startTime',
      object: { value: relationship.timestamp, type: 'http://www.w3.org/2001/XMLSchema#dateTime' },
    },
  ];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user by ID from all platforms
 */
export function getUserById(userId: string): SocialNetworkUser | undefined {
  return [...TWITTER_USERS, ...REDDIT_USERS, ...TIKTOK_USERS].find(u => u.id === userId);
}

/**
 * Get all users for a platform
 */
export function getUsersByPlatform(platform: 'twitter' | 'reddit' | 'tiktok'): SocialNetworkUser[] {
  switch (platform) {
    case 'twitter':
      return TWITTER_USERS;
    case 'reddit':
      return REDDIT_USERS;
    case 'tiktok':
      return TIKTOK_USERS;
  }
}

/**
 * Get all posts for a platform
 */
export function getPostsByPlatform(platform: 'twitter' | 'reddit' | 'tiktok'): SocialNetworkPost[] {
  switch (platform) {
    case 'twitter':
      return TWITTER_POSTS;
    case 'reddit':
      return REDDIT_POSTS;
    case 'tiktok':
      return TIKTOK_POSTS;
  }
}

/**
 * Get all relationships for a platform
 */
export function getRelationshipsByPlatform(platform: 'twitter' | 'reddit' | 'tiktok'): SocialNetworkRelationship[] {
  switch (platform) {
    case 'twitter':
      return TWITTER_RELATIONSHIPS;
    case 'reddit':
      return REDDIT_RELATIONSHIPS;
    case 'tiktok':
      return TIKTOK_RELATIONSHIPS;
  }
}

/**
 * Convert all Twitter data to JSON-LD
 */
export function getAllTwitterJSONLD(): any[] {
  const result: any[] = [];
  
  // Add users
  TWITTER_USERS.forEach(user => {
    result.push(twitterUserToJSONLD(user));
  });
  
  // Add posts
  TWITTER_POSTS.forEach(post => {
    const author = getUserById(post.authorId);
    if (author) {
      result.push(twitterPostToJSONLD(post, author));
    }
  });
  
  // Add relationships
  TWITTER_RELATIONSHIPS.forEach(rel => {
    const jsonld = relationshipToJSONLD(rel);
    if (jsonld) {
      result.push(jsonld);
    }
  });
  
  return result;
}

/**
 * Convert all Reddit data to JSON-LD
 */
export function getAllRedditJSONLD(): any[] {
  const result: any[] = [];
  
  // Add users
  REDDIT_USERS.forEach(user => {
    result.push(redditUserToJSONLD(user));
  });
  
  // Add posts
  REDDIT_POSTS.forEach(post => {
    const author = getUserById(post.authorId);
    if (author) {
      result.push(redditPostToJSONLD(post, author));
    }
  });
  
  // Add relationships
  REDDIT_RELATIONSHIPS.forEach(rel => {
    const jsonld = relationshipToJSONLD(rel);
    if (jsonld) {
      result.push(jsonld);
    }
  });
  
  return result;
}

/**
 * Convert all TikTok data to JSON-LD
 */
export function getAllTikTokJSONLD(): any[] {
  const result: any[] = [];
  
  // Add users
  TIKTOK_USERS.forEach(user => {
    result.push(tiktokUserToJSONLD(user));
  });
  
  // Add posts
  TIKTOK_POSTS.forEach(post => {
    const author = getUserById(post.authorId);
    if (author) {
      result.push(tiktokPostToJSONLD(post, author));
    }
  });
  
  // Add relationships
  TIKTOK_RELATIONSHIPS.forEach(rel => {
    const jsonld = relationshipToJSONLD(rel);
    if (jsonld) {
      result.push(jsonld);
    }
  });
  
  return result;
}

/**
 * Convert all Twitter data to RDF triples
 */
export function getAllTwitterRDFTriples(): RDFTriple[] {
  const triples: RDFTriple[] = [];
  
  // Add user triples
  TWITTER_USERS.forEach(user => {
    triples.push(...twitterUserToRDFTriples(user));
  });
  
  // Add post triples
  TWITTER_POSTS.forEach(post => {
    const author = getUserById(post.authorId);
    if (author) {
      triples.push(...twitterPostToRDFTriples(post, author));
    }
  });
  
  // Add relationship triples
  TWITTER_RELATIONSHIPS.forEach(rel => {
    triples.push(...relationshipToRDFTriples(rel));
  });
  
  return triples;
}

/**
 * Convert all Reddit data to RDF triples
 */
export function getAllRedditRDFTriples(): RDFTriple[] {
  const triples: RDFTriple[] = [];
  
  // Add user triples (using similar structure to Twitter)
  REDDIT_USERS.forEach(user => {
    const userId = `https://reddit.com/user/${user.username.replace('u/', '')}`;
    triples.push(
      {
        subject: userId,
        predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        object: 'http://schema.org/Person',
      },
      {
        subject: userId,
        predicate: 'http://schema.org/name',
        object: { value: user.displayName, type: 'http://www.w3.org/2001/XMLSchema#string' },
      },
      {
        subject: userId,
        predicate: 'http://schema.org/alternateName',
        object: { value: user.username, type: 'http://www.w3.org/2001/XMLSchema#string' },
      },
      {
        subject: userId,
        predicate: 'http://schema.org/dateCreated',
        object: { value: user.createdAt, type: 'http://www.w3.org/2001/XMLSchema#dateTime' },
      }
    );
  });
  
  // Add post triples
  REDDIT_POSTS.forEach(post => {
    const postId = post.url || `https://reddit.com/comments/${post.id}`;
    const author = getUserById(post.authorId);
    if (author) {
      const authorId = `https://reddit.com/user/${author.username.replace('u/', '')}`;
      triples.push(
        {
          subject: postId,
          predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          object: 'http://schema.org/SocialMediaPosting',
        },
        {
          subject: postId,
          predicate: 'http://schema.org/text',
          object: { value: post.content, type: 'http://www.w3.org/2001/XMLSchema#string' },
        },
        {
          subject: postId,
          predicate: 'http://schema.org/datePublished',
          object: { value: post.timestamp, type: 'http://www.w3.org/2001/XMLSchema#dateTime' },
        },
        {
          subject: postId,
          predicate: 'http://schema.org/author',
          object: authorId,
        }
      );
      
      if (post.likes) {
        triples.push({
          subject: postId,
          predicate: 'https://reddit.com/ontology/upvoteCount',
          object: { value: post.likes.toString(), type: 'http://www.w3.org/2001/XMLSchema#integer' },
        });
      }
    }
  });
  
  // Add relationship triples
  REDDIT_RELATIONSHIPS.forEach(rel => {
    triples.push(...relationshipToRDFTriples(rel));
  });
  
  return triples;
}

/**
 * Convert all TikTok data to RDF triples
 */
export function getAllTikTokRDFTriples(): RDFTriple[] {
  const triples: RDFTriple[] = [];
  
  // Add user triples
  TIKTOK_USERS.forEach(user => {
    const userId = `https://tiktok.com/@${user.username.replace('@', '')}`;
    triples.push(
      {
        subject: userId,
        predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        object: 'http://schema.org/Person',
      },
      {
        subject: userId,
        predicate: 'http://schema.org/name',
        object: { value: user.displayName, type: 'http://www.w3.org/2001/XMLSchema#string' },
      },
      {
        subject: userId,
        predicate: 'http://schema.org/alternateName',
        object: { value: user.username, type: 'http://www.w3.org/2001/XMLSchema#string' },
      },
      {
        subject: userId,
        predicate: 'http://schema.org/dateCreated',
        object: { value: user.createdAt, type: 'http://www.w3.org/2001/XMLSchema#dateTime' },
      }
    );
  });
  
  // Add post triples
  TIKTOK_POSTS.forEach(post => {
    const postId = post.url || `https://tiktok.com/video/${post.id}`;
    const author = getUserById(post.authorId);
    if (author) {
      const authorId = `https://tiktok.com/@${author.username.replace('@', '')}`;
      triples.push(
        {
          subject: postId,
          predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          object: 'http://schema.org/VideoObject',
        },
        {
          subject: postId,
          predicate: 'http://schema.org/name',
          object: { value: post.content.substring(0, 100), type: 'http://www.w3.org/2001/XMLSchema#string' },
        },
        {
          subject: postId,
          predicate: 'http://schema.org/uploadDate',
          object: { value: post.timestamp, type: 'http://www.w3.org/2001/XMLSchema#dateTime' },
        },
        {
          subject: postId,
          predicate: 'http://schema.org/author',
          object: authorId,
        }
      );
      
      if (post.views) {
        triples.push({
          subject: postId,
          predicate: 'https://tiktok.com/ontology/viewCount',
          object: { value: post.views.toString(), type: 'http://www.w3.org/2001/XMLSchema#integer' },
        });
      }
    }
  });
  
  // Add relationship triples
  TIKTOK_RELATIONSHIPS.forEach(rel => {
    triples.push(...relationshipToRDFTriples(rel));
  });
  
  return triples;
}

/**
 * Get all social network data as JSON-LD (all platforms combined)
 */
export function getAllSocialNetworkJSONLD(): any[] {
  return [
    ...getAllTwitterJSONLD(),
    ...getAllRedditJSONLD(),
    ...getAllTikTokJSONLD(),
  ];
}

/**
 * Get all social network data as RDF triples (all platforms combined)
 */
export function getAllSocialNetworkRDFTriples(): RDFTriple[] {
  return [
    ...getAllTwitterRDFTriples(),
    ...getAllRedditRDFTriples(),
    ...getAllTikTokRDFTriples(),
  ];
}

