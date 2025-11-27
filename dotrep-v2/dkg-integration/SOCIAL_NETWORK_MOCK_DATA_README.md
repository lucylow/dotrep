# Social Network Mock Data for DKG Integration

This directory contains comprehensive mock data for **Twitter**, **Reddit**, and **TikTok** in both **JSON-LD** and **RDF triple** formats, designed for testing and development with OriginTrail DKG (Decentralized Knowledge Graph).

## 📁 Files

- **`social-network-mock-data.ts`** - Main mock data file with all social network data and converters
- **`social-network-mock-data-demo.ts`** - Demo file showing usage examples
- **`SOCIAL_NETWORK_MOCK_DATA_README.md`** - This documentation file

## 🎯 Purpose

This mock data demonstrates how real-world social network applications can be represented in DKG-compatible formats:

1. **JSON-LD (JavaScript Object Notation for Linked Data)** - Web-friendly format for API integration
2. **RDF Triples (Resource Description Framework)** - Semantic web standard for knowledge graphs

## 📊 Data Structure

### Twitter Data
- **4 users** including verified accounts (e.g., @elonmusk, @vitalikbuterin, @polkadot)
- **5 posts/tweets** with engagement metrics (likes, shares, comments, views)
- **4 relationships** (follow relationships)

### Reddit Data
- **4 users** with karma and verification status
- **5 posts/comments** including threads and replies
- **3 relationships** (follow/subscribe relationships)

### TikTok Data
- **4 users** including verified creators
- **5 videos** with engagement metrics (likes, shares, comments, views)
- **3 relationships** (follow relationships)

## 🚀 Quick Start

### Basic Usage

```typescript
import {
  TWITTER_USERS,
  TWITTER_POSTS,
  twitterUserToJSONLD,
  twitterPostToJSONLD,
  getAllTwitterJSONLD,
  getAllTwitterRDFTriples,
} from './social-network-mock-data';

// Get a user
const user = TWITTER_USERS[0]; // @elonmusk

// Convert to JSON-LD
const userJsonld = twitterUserToJSONLD(user);

// Get all Twitter data as JSON-LD
const allTwitterData = getAllTwitterJSONLD();

// Get all Twitter data as RDF triples
const allTwitterTriples = getAllTwitterRDFTriples();
```

### Convert Single User to JSON-LD

```typescript
import { TWITTER_USERS, twitterUserToJSONLD } from './social-network-mock-data';

const user = TWITTER_USERS[0];
const jsonld = twitterUserToJSONLD(user);

console.log(JSON.stringify(jsonld, null, 2));
```

Output:
```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "twitter": "https://twitter.com/ontology/",
    "soc": "https://schema.org/"
  },
  "@type": "Person",
  "@id": "https://twitter.com/elonmusk",
  "soc:name": "Elon Musk",
  "soc:alternateName": "@elonmusk",
  "twitter:verified": true,
  "twitter:followerCount": 150000000,
  ...
}
```

### Convert Single Post to JSON-LD

```typescript
import { TWITTER_POSTS, getUserById, twitterPostToJSONLD } from './social-network-mock-data';

const post = TWITTER_POSTS[0];
const author = getUserById(post.authorId);
const jsonld = twitterPostToJSONLD(post, author!);
```

### Convert User to RDF Triples

```typescript
import { TWITTER_USERS, twitterUserToRDFTriples } from './social-network-mock-data';

const user = TWITTER_USERS[0];
const triples = twitterUserToRDFTriples(user);

triples.forEach(triple => {
  console.log(`${triple.subject} --${triple.predicate}--> ${triple.object}`);
});
```

Output:
```
https://twitter.com/elonmusk --http://www.w3.org/1999/02/22-rdf-syntax-ns#type--> http://schema.org/Person
https://twitter.com/elonmusk --http://schema.org/name--> {"value":"Elon Musk","type":"http://www.w3.org/2001/XMLSchema#string"}
...
```

### Get All Platform Data

```typescript
import {
  getAllTwitterJSONLD,
  getAllRedditJSONLD,
  getAllTikTokJSONLD,
  getAllSocialNetworkJSONLD,
} from './social-network-mock-data';

// Get all Twitter data
const twitterData = getAllTwitterJSONLD();

// Get all Reddit data
const redditData = getAllRedditJSONLD();

// Get all TikTok data
const tiktokData = getAllTikTokJSONLD();

// Get all platforms combined
const allData = getAllSocialNetworkJSONLD();
```

### Get All RDF Triples

```typescript
import {
  getAllTwitterRDFTriples,
  getAllRedditRDFTriples,
  getAllTikTokRDFTriples,
  getAllSocialNetworkRDFTriples,
} from './social-network-mock-data';

// Get all Twitter triples
const twitterTriples = getAllTwitterRDFTriples();

// Get all platforms combined
const allTriples = getAllSocialNetworkRDFTriples();
```

## 📝 JSON-LD Format

JSON-LD uses Schema.org vocabulary and platform-specific ontologies:

- **Users**: `schema:Person` with platform-specific properties
- **Posts**: `schema:SocialMediaPosting` or `schema:VideoObject` (for TikTok)
- **Relationships**: `schema:FollowAction`

### Example JSON-LD Structure

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "twitter": "https://twitter.com/ontology/"
  },
  "@type": "Person",
  "@id": "https://twitter.com/username",
  "name": "Display Name",
  "alternateName": "@username",
  "description": "Bio text",
  "twitter:verified": true,
  "twitter:followerCount": 1000000
}
```

## 🔗 RDF Triple Format

RDF triples follow the standard Subject-Predicate-Object pattern:

- **Subject**: Resource identifier (e.g., user URL, post URL)
- **Predicate**: Property or relationship (e.g., `schema:name`, `schema:author`)
- **Object**: Value or another resource

### Example RDF Triple Structure

```typescript
{
  subject: "https://twitter.com/username",
  predicate: "http://schema.org/name",
  object: { value: "Display Name", type: "http://www.w3.org/2001/XMLSchema#string" }
}
```

## 🔍 SPARQL Query Examples

The RDF triples can be queried using SPARQL:

### Find High-Follower Users

```sparql
PREFIX schema: <http://schema.org/>
PREFIX twitter: <https://twitter.com/ontology/>

SELECT ?user ?name ?followerCount
WHERE {
  ?user a schema:Person .
  ?user schema:name ?name .
  ?user twitter:followerCount ?followerCount .
  FILTER (?followerCount > 1000000)
}
ORDER BY DESC(?followerCount)
LIMIT 10
```

### Find Follow Relationships

```sparql
PREFIX schema: <http://schema.org/>

SELECT ?follower ?followed
WHERE {
  ?action a schema:FollowAction .
  ?action schema:agent ?follower .
  ?action schema:object ?followed .
}
```

### Find Posts by Author

```sparql
PREFIX schema: <http://schema.org/>

SELECT ?post ?text ?date
WHERE {
  ?post a schema:SocialMediaPosting .
  ?post schema:author <https://twitter.com/username> .
  ?post schema:text ?text .
  ?post schema:datePublished ?date .
}
ORDER BY DESC(?date)
```

## 🎨 Platform-Specific Features

### Twitter
- Verified badges
- Follower/following counts
- Likes, retweets, replies, views
- Thread support

### Reddit
- Karma scores
- Upvotes/downvotes
- Comment threads
- Subreddit associations

### TikTok
- Video content
- View counts
- Like/share/comment metrics
- Creator verification

## 📚 References

- [JSON-LD Specification](https://www.w3.org/TR/json-ld11/)
- [Schema.org Social Media](https://schema.org/SocialMediaPosting)
- [RDF Primer](https://www.w3.org/TR/rdf11-primer/)
- [SPARQL Query Language](https://www.w3.org/TR/sparql11-query/)
- [JSON-LD Social Network Profiles](https://jsonld.com/social-network-profiles/)

## 🧪 Running the Demo

```typescript
import { runAllExamples } from './social-network-mock-data-demo';

// Run all examples
runAllExamples();
```

Or run individual examples:

```typescript
import {
  example1_SingleUserJSONLD,
  example2_SinglePostJSONLD,
  example3_UserRDFTriples,
} from './social-network-mock-data-demo';

example1_SingleUserJSONLD();
example2_SinglePostJSONLD();
example3_UserRDFTriples();
```

## 🔄 Integration with DKG

This mock data can be used with OriginTrail DKG:

1. **Publish to DKG**: Convert to JSON-LD and publish as Knowledge Assets
2. **Query with SPARQL**: Use RDF triples for semantic queries
3. **Build Knowledge Graphs**: Create interconnected social network graphs
4. **Reputation Scoring**: Use social network data for reputation calculations

### Example: Publishing to DKG

```typescript
import { DKGClientV8 } from './dkg-client-v8';
import { getAllTwitterJSONLD } from './social-network-mock-data';

const dkgClient = new DKGClientV8({ /* config */ });
const twitterData = getAllTwitterJSONLD();

// Publish each item as a Knowledge Asset
for (const item of twitterData) {
  const result = await dkgClient.publish({
    data: item,
    epochs: 2,
  });
  console.log(`Published: ${result.UAL}`);
}
```

## 📊 Data Statistics

- **Total Users**: 12 (4 per platform)
- **Total Posts**: 15 (5 per platform)
- **Total Relationships**: 10 (4 Twitter, 3 Reddit, 3 TikTok)
- **Total JSON-LD Items**: ~37 (users + posts + relationships)
- **Total RDF Triples**: ~150+ (varies by data complexity)

## 🎯 Use Cases

1. **Testing DKG Integration**: Test publishing and querying social network data
2. **Demo Applications**: Showcase DKG capabilities with realistic data
3. **Development**: Develop features without real API access
4. **Education**: Learn JSON-LD and RDF formats with real-world examples
5. **Reputation Systems**: Build reputation scoring from social signals

## 🔐 Data Privacy

⚠️ **Note**: All data in this file is **mock/fake data** for demonstration purposes only. No real user data is included.

## 📝 License

This mock data is provided as part of the DotRep project for development and testing purposes.

---

**Last Updated**: January 2025  
**Version**: 1.0.0

