/**
 * Social Network Mock Data Demo
 * 
 * This file demonstrates how to use the social network mock data
 * in JSON-LD and RDF triple formats for DKG integration.
 * 
 * Usage examples:
 * - Publishing social network data to OriginTrail DKG
 * - Querying social network relationships using SPARQL
 * - Converting between JSON-LD and RDF triple formats
 * - Building knowledge graphs from social network data
 */

import {
  // Data exports
  TWITTER_USERS,
  TWITTER_POSTS,
  TWITTER_RELATIONSHIPS,
  REDDIT_USERS,
  REDDIT_POSTS,
  REDDIT_RELATIONSHIPS,
  TIKTOK_USERS,
  TIKTOK_POSTS,
  TIKTOK_RELATIONSHIPS,
  
  // JSON-LD converters
  twitterUserToJSONLD,
  twitterPostToJSONLD,
  redditUserToJSONLD,
  redditPostToJSONLD,
  tiktokUserToJSONLD,
  tiktokPostToJSONLD,
  relationshipToJSONLD,
  
  // RDF triple converters
  twitterUserToRDFTriples,
  twitterPostToRDFTriples,
  relationshipToRDFTriples,
  
  // Helper functions
  getAllTwitterJSONLD,
  getAllRedditJSONLD,
  getAllTikTokJSONLD,
  getAllTwitterRDFTriples,
  getAllRedditRDFTriples,
  getAllTikTokRDFTriples,
  getAllSocialNetworkJSONLD,
  getAllSocialNetworkRDFTriples,
  getUserById,
  getUsersByPlatform,
  getPostsByPlatform,
  getRelationshipsByPlatform,
  
  // Types
  type SocialNetworkUser,
  type SocialNetworkPost,
  type SocialNetworkRelationship,
  type RDFTriple,
} from './social-network-mock-data';

/**
 * Example 1: Convert a single Twitter user to JSON-LD
 */
export function example1_SingleUserJSONLD() {
  const user = TWITTER_USERS[0]; // @elonmusk
  const jsonld = twitterUserToJSONLD(user);
  
  console.log('Example 1: Twitter User JSON-LD');
  console.log(JSON.stringify(jsonld, null, 2));
  
  return jsonld;
}

/**
 * Example 2: Convert a Twitter post to JSON-LD
 */
export function example2_SinglePostJSONLD() {
  const post = TWITTER_POSTS[0];
  const author = getUserById(post.authorId);
  
  if (!author) {
    throw new Error('Author not found');
  }
  
  const jsonld = twitterPostToJSONLD(post, author);
  
  console.log('Example 2: Twitter Post JSON-LD');
  console.log(JSON.stringify(jsonld, null, 2));
  
  return jsonld;
}

/**
 * Example 3: Convert Twitter user to RDF triples
 */
export function example3_UserRDFTriples() {
  const user = TWITTER_USERS[0];
  const triples = twitterUserToRDFTriples(user);
  
  console.log('Example 3: Twitter User RDF Triples');
  triples.forEach(triple => {
    console.log(`${triple.subject} --${triple.predicate}--> ${typeof triple.object === 'string' ? triple.object : JSON.stringify(triple.object)}`);
  });
  
  return triples;
}

/**
 * Example 4: Convert Twitter post to RDF triples
 */
export function example4_PostRDFTriples() {
  const post = TWITTER_POSTS[0];
  const author = getUserById(post.authorId);
  
  if (!author) {
    throw new Error('Author not found');
  }
  
  const triples = twitterPostToRDFTriples(post, author);
  
  console.log('Example 4: Twitter Post RDF Triples');
  triples.forEach(triple => {
    console.log(`${triple.subject} --${triple.predicate}--> ${typeof triple.object === 'string' ? triple.object : JSON.stringify(triple.object)}`);
  });
  
  return triples;
}

/**
 * Example 5: Get all Twitter data as JSON-LD
 */
export function example5_AllTwitterJSONLD() {
  const allData = getAllTwitterJSONLD();
  
  console.log('Example 5: All Twitter Data as JSON-LD');
  console.log(`Total items: ${allData.length}`);
  console.log(JSON.stringify(allData.slice(0, 2), null, 2)); // Show first 2 items
  
  return allData;
}

/**
 * Example 6: Get all Twitter data as RDF triples
 */
export function example6_AllTwitterRDFTriples() {
  const triples = getAllTwitterRDFTriples();
  
  console.log('Example 6: All Twitter Data as RDF Triples');
  console.log(`Total triples: ${triples.length}`);
  triples.slice(0, 5).forEach(triple => {
    console.log(`${triple.subject} --${triple.predicate}--> ${typeof triple.object === 'string' ? triple.object : JSON.stringify(triple.object)}`);
  });
  
  return triples;
}

/**
 * Example 7: Get all social network data (all platforms) as JSON-LD
 */
export function example7_AllPlatformsJSONLD() {
  const allData = getAllSocialNetworkJSONLD();
  
  console.log('Example 7: All Social Network Data (All Platforms) as JSON-LD');
  console.log(`Total items: ${allData.length}`);
  
  // Count by type
  const userCount = allData.filter(item => item['@type'] === 'Person').length;
  const postCount = allData.filter(item => item['@type'] === 'SocialMediaPosting' || item['@type'] === 'VideoObject').length;
  const relationshipCount = allData.filter(item => item['@type'] === 'FollowAction').length;
  
  console.log(`Users: ${userCount}, Posts: ${postCount}, Relationships: ${relationshipCount}`);
  
  return allData;
}

/**
 * Example 8: Get all social network data as RDF triples
 */
export function example8_AllPlatformsRDFTriples() {
  const triples = getAllSocialNetworkRDFTriples();
  
  console.log('Example 8: All Social Network Data (All Platforms) as RDF Triples');
  console.log(`Total triples: ${triples.length}`);
  
  // Count by predicate type
  const typeTriples = triples.filter(t => t.predicate.includes('#type'));
  const nameTriples = triples.filter(t => t.predicate.includes('name'));
  const dateTriples = triples.filter(t => t.predicate.includes('date') || t.predicate.includes('Time'));
  
  console.log(`Type triples: ${typeTriples.length}, Name triples: ${nameTriples.length}, Date triples: ${dateTriples.length}`);
  
  return triples;
}

/**
 * Example 9: Reddit user and post JSON-LD
 */
export function example9_RedditJSONLD() {
  const user = REDDIT_USERS[0];
  const post = REDDIT_POSTS[0];
  const author = getUserById(post.authorId);
  
  if (!author) {
    throw new Error('Author not found');
  }
  
  const userJsonld = redditUserToJSONLD(user);
  const postJsonld = redditPostToJSONLD(post, author);
  
  console.log('Example 9: Reddit User and Post JSON-LD');
  console.log('User:', JSON.stringify(userJsonld, null, 2));
  console.log('Post:', JSON.stringify(postJsonld, null, 2));
  
  return { user: userJsonld, post: postJsonld };
}

/**
 * Example 10: TikTok user and post JSON-LD
 */
export function example10_TikTokJSONLD() {
  const user = TIKTOK_USERS[0];
  const post = TIKTOK_POSTS[0];
  const author = getUserById(post.authorId);
  
  if (!author) {
    throw new Error('Author not found');
  }
  
  const userJsonld = tiktokUserToJSONLD(user);
  const postJsonld = tiktokPostToJSONLD(post, author);
  
  console.log('Example 10: TikTok User and Post JSON-LD');
  console.log('User:', JSON.stringify(userJsonld, null, 2));
  console.log('Post:', JSON.stringify(postJsonld, null, 2));
  
  return { user: userJsonld, post: postJsonld };
}

/**
 * Example 11: Relationship JSON-LD
 */
export function example11_RelationshipJSONLD() {
  const relationship = TWITTER_RELATIONSHIPS[0];
  const jsonld = relationshipToJSONLD(relationship);
  
  console.log('Example 11: Relationship JSON-LD');
  console.log(JSON.stringify(jsonld, null, 2));
  
  return jsonld;
}

/**
 * Example 12: Relationship RDF triples
 */
export function example12_RelationshipRDFTriples() {
  const relationship = TWITTER_RELATIONSHIPS[0];
  const triples = relationshipToRDFTriples(relationship);
  
  console.log('Example 12: Relationship RDF Triples');
  triples.forEach(triple => {
    console.log(`${triple.subject} --${triple.predicate}--> ${typeof triple.object === 'string' ? triple.object : JSON.stringify(triple.object)}`);
  });
  
  return triples;
}

/**
 * Example 13: Query users by platform
 */
export function example13_QueryByPlatform() {
  const twitterUsers = getUsersByPlatform('twitter');
  const redditUsers = getUsersByPlatform('reddit');
  const tiktokUsers = getUsersByPlatform('tiktok');
  
  console.log('Example 13: Query Users by Platform');
  console.log(`Twitter users: ${twitterUsers.length}`);
  console.log(`Reddit users: ${redditUsers.length}`);
  console.log(`TikTok users: ${tiktokUsers.length}`);
  
  return { twitterUsers, redditUsers, tiktokUsers };
}

/**
 * Example 14: SPARQL query example for finding users
 * 
 * This shows how the RDF triples can be queried using SPARQL
 */
export function example14_SPARQLQueryExample() {
  const sparqlQuery = `
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
  `;
  
  console.log('Example 14: SPARQL Query Example');
  console.log(sparqlQuery);
  
  return sparqlQuery;
}

/**
 * Example 15: SPARQL query for finding relationships
 */
export function example15_SPARQLRelationshipQuery() {
  const sparqlQuery = `
    PREFIX schema: <http://schema.org/>
    
    SELECT ?follower ?followed
    WHERE {
      ?action a schema:FollowAction .
      ?action schema:agent ?follower .
      ?action schema:object ?followed .
    }
  `;
  
  console.log('Example 15: SPARQL Relationship Query');
  console.log(sparqlQuery);
  
  return sparqlQuery;
}

/**
 * Run all examples
 */
export function runAllExamples() {
  console.log('='.repeat(80));
  console.log('Social Network Mock Data Demo - Running All Examples');
  console.log('='.repeat(80));
  console.log('');
  
  try {
    example1_SingleUserJSONLD();
    console.log('');
    
    example2_SinglePostJSONLD();
    console.log('');
    
    example3_UserRDFTriples();
    console.log('');
    
    example4_PostRDFTriples();
    console.log('');
    
    example5_AllTwitterJSONLD();
    console.log('');
    
    example6_AllTwitterRDFTriples();
    console.log('');
    
    example7_AllPlatformsJSONLD();
    console.log('');
    
    example8_AllPlatformsRDFTriples();
    console.log('');
    
    example9_RedditJSONLD();
    console.log('');
    
    example10_TikTokJSONLD();
    console.log('');
    
    example11_RelationshipJSONLD();
    console.log('');
    
    example12_RelationshipRDFTriples();
    console.log('');
    
    example13_QueryByPlatform();
    console.log('');
    
    example14_SPARQLQueryExample();
    console.log('');
    
    example15_SPARQLRelationshipQuery();
    console.log('');
    
    console.log('='.repeat(80));
    console.log('All examples completed successfully!');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('Error running examples:', error);
    throw error;
  }
}

// Export for use in other files
export default {
  example1_SingleUserJSONLD,
  example2_SinglePostJSONLD,
  example3_UserRDFTriples,
  example4_PostRDFTriples,
  example5_AllTwitterJSONLD,
  example6_AllTwitterRDFTriples,
  example7_AllPlatformsJSONLD,
  example8_AllPlatformsRDFTriples,
  example9_RedditJSONLD,
  example10_TikTokJSONLD,
  example11_RelationshipJSONLD,
  example12_RelationshipRDFTriples,
  example13_QueryByPlatform,
  example14_SPARQLQueryExample,
  example15_SPARQLRelationshipQuery,
  runAllExamples,
};

