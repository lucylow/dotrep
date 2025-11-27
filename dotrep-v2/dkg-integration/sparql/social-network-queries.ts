/**
 * Enhanced SPARQL Queries for Social Network Analysis
 * 
 * Comprehensive SPARQL query builder for social network datasets modeled as RDF triples.
 * Supports querying user profiles, relationships (friendships, follows), common interests,
 * mutual connections, and advanced social network analysis patterns.
 * 
 * Based on W3C SPARQL 1.1 specification and best practices for querying social network graphs.
 * 
 * @module sparql/social-network-queries
 */

import { escapeSPARQLString } from '../sparql-validator';

/**
 * Standard SPARQL prefixes for social network queries
 */
export const SPARQL_PREFIXES = `
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX schema: <https://schema.org/>
PREFIX dotrep: <https://dotrep.io/ontology/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`;

/**
 * Options for social network queries
 */
export interface SocialNetworkQueryOptions {
  limit?: number;
  offset?: number;
  minReputation?: number;
  minConnectionStrength?: number;
  orderBy?: 'reputation' | 'date' | 'name' | 'activity';
  orderDirection?: 'ASC' | 'DESC';
  includeMetadata?: boolean;
}

/**
 * Enhanced SPARQL Query Builder for Social Networks
 * 
 * Provides fluent API for building complex SPARQL queries for social network analysis
 */
export class SocialNetworkQueryBuilder {
  private prefixes: string = SPARQL_PREFIXES;
  private selectVars: string[] = [];
  private whereClauses: string[] = [];
  private filters: string[] = [];
  private optionalClauses: string[] = [];
  private orderBy: string = '';
  private limit: number = 100;
  private offset: number = 0;
  private groupBy: string = '';
  private having: string = '';

  /**
   * Add variables to SELECT clause
   */
  select(...variables: string[]): this {
    this.selectVars.push(...variables);
    return this;
  }

  /**
   * Add WHERE clause triple pattern
   */
  where(pattern: string): this {
    this.whereClauses.push(pattern);
    return this;
  }

  /**
   * Add FILTER clause
   */
  filter(condition: string): this {
    this.filters.push(condition);
    return this;
  }

  /**
   * Add OPTIONAL clause
   */
  optional(pattern: string): this {
    this.optionalClauses.push(`OPTIONAL { ${pattern} }`);
    return this;
  }

  /**
   * Set ORDER BY clause
   */
  orderByClause(variable: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderBy = `ORDER BY ${direction}(?${variable})`;
    return this;
  }

  /**
   * Set LIMIT
   */
  setLimit(limit: number): this {
    this.limit = Math.max(1, Math.min(limit, 1000)); // Clamp between 1 and 1000
    return this;
  }

  /**
   * Set OFFSET
   */
  setOffset(offset: number): this {
    this.offset = Math.max(0, offset);
    return this;
  }

  /**
   * Set GROUP BY clause
   */
  groupByClause(...variables: string[]): this {
    this.groupBy = `GROUP BY ${variables.map(v => `?${v}`).join(' ')}`;
    return this;
  }

  /**
   * Set HAVING clause
   */
  havingClause(condition: string): this {
    this.having = `HAVING(${condition})`;
    return this;
  }

  /**
   * Build the final SPARQL query
   */
  build(): string {
    const select = this.selectVars.length > 0
      ? `SELECT ${this.selectVars.map(v => `?${v}`).join(' ')}`
      : 'SELECT *';

    const where = this.whereClauses.length > 0
      ? `WHERE {\n    ${this.whereClauses.join('\n    ')}`
      : 'WHERE {}';

    const optionals = this.optionalClauses.length > 0
      ? `\n    ${this.optionalClauses.join('\n    ')}`
      : '';

    const filters = this.filters.length > 0
      ? `\n    ${this.filters.map(f => `FILTER(${f})`).join('\n    ')}`
      : '';

    const closingBrace = '}';

    const orderBy = this.orderBy ? `\n${this.orderBy}` : '';
    const groupBy = this.groupBy ? `\n${this.groupBy}` : '';
    const having = this.having ? `\n${this.having}` : '';
    const limit = `\nLIMIT ${this.limit}`;
    const offset = this.offset > 0 ? `\nOFFSET ${this.offset}` : '';

    return `${this.prefixes}\n\n${select}\n${where}${optionals}${filters}${closingBrace}${groupBy}${having}${orderBy}${limit}${offset}`;
  }

  /**
   * Reset builder to initial state
   */
  reset(): this {
    this.selectVars = [];
    this.whereClauses = [];
    this.filters = [];
    this.optionalClauses = [];
    this.orderBy = '';
    this.limit = 100;
    this.offset = 0;
    this.groupBy = '';
    this.having = '';
    return this;
  }
}

/**
 * Social Network SPARQL Query Templates
 * 
 * Ready-to-use SPARQL queries for common social network analysis patterns
 */
export class SocialNetworkQueries {
  /**
   * Query user profiles with names and birthdates
   * 
   * Example from SPARQL documentation for social networks
   * 
   * @example
   * ```sparql
   * PREFIX foaf: <http://xmlns.com/foaf/0.1/>
   * SELECT ?name ?birthdate
   * WHERE {
   *   ?user foaf:name ?name ;
   *         foaf:birthday ?birthdate .
   * }
   * ```
   */
  static getUserProfiles(options: SocialNetworkQueryOptions = {}): string {
    const { limit = 100, orderBy = 'name', orderDirection = 'ASC' } = options;
    const escapedLimit = Math.min(limit, 1000);

    return `${SPARQL_PREFIXES}

SELECT ?user ?name ?birthdate ?reputationScore ?location
WHERE {
  ?user a schema:Person ;
        foaf:name ?name .
  
  OPTIONAL { ?user foaf:birthday ?birthdate . }
  OPTIONAL { ?user dotrep:reputationScore ?reputationScore . }
  OPTIONAL { ?user schema:address ?address . 
             ?address schema:addressLocality ?location . }
}
ORDER BY ${orderDirection}(?${orderBy === 'name' ? 'name' : orderBy === 'reputation' ? 'reputationScore' : 'name'})
LIMIT ${escapedLimit}`;
  }

  /**
   * Query relationships (friendships or follows)
   * 
   * Matches triples where the subject is a user and the predicate is a connection type
   */
  static getRelationships(
    connectionType: 'follows' | 'friend' | 'collaborates' | 'all' = 'all',
    options: SocialNetworkQueryOptions = {}
  ): string {
    const { limit = 100, minConnectionStrength, orderBy = 'date', orderDirection = 'DESC' } = options;
    const escapedLimit = Math.min(limit, 1000);

    let connectionPredicate = '';
    switch (connectionType) {
      case 'follows':
        connectionPredicate = 'schema:follows';
        break;
      case 'friend':
        connectionPredicate = 'foaf:knows';
        break;
      case 'collaborates':
        connectionPredicate = 'dotrep:collaboratesWith';
        break;
      default:
        connectionPredicate = 'schema:follows | foaf:knows | dotrep:collaboratesWith';
    }

    const strengthFilter = minConnectionStrength
      ? `FILTER(?connectionStrength >= ${minConnectionStrength})`
      : '';

    return `${SPARQL_PREFIXES}

SELECT ?user ?connection ?connectionType ?connectionStrength ?timestamp
WHERE {
  ?user ${connectionPredicate} ?connection .
  
  OPTIONAL { 
    ?connectionEdge schema:actor ?user ;
                    schema:object ?connection ;
                    dotrep:connectionType ?connectionType ;
                    dotrep:connectionStrength ?connectionStrength ;
                    schema:timestamp ?timestamp .
  }
  ${strengthFilter}
}
ORDER BY ${orderDirection}(?${orderBy === 'date' ? 'timestamp' : 'connectionStrength'})
LIMIT ${escapedLimit}`;
  }

  /**
   * Find common interests or mutual connections
   * 
   * Matches patterns involving multiple users connected through shared properties
   */
  static findCommonInterests(
    userId1: string,
    userId2: string,
    options: SocialNetworkQueryOptions = {}
  ): string {
    const escapedUser1 = escapeSPARQLString(userId1);
    const escapedUser2 = escapeSPARQLString(userId2);
    const { limit = 50 } = options;

    return `${SPARQL_PREFIXES}

SELECT ?interest ?interestType ?sharedBy
WHERE {
  ?user1 schema:identifier "${escapedUser1}" .
  ?user2 schema:identifier "${escapedUser2}" .
  
  ?user1 schema:knowsAbout | dotrep:interests ?interest .
  ?user2 schema:knowsAbout | dotrep:interests ?interest .
  
  OPTIONAL { 
    ?interest rdf:type ?interestType .
  }
  
  BIND(CONCAT("${escapedUser1}", " and ", "${escapedUser2}") AS ?sharedBy)
}
LIMIT ${limit}`;
  }

  /**
   * Find mutual connections between two users
   * 
   * Returns users who are connected to both specified users
   */
  static findMutualConnections(
    userId1: string,
    userId2: string,
    options: SocialNetworkQueryOptions = {}
  ): string {
    const escapedUser1 = escapeSPARQLString(userId1);
    const escapedUser2 = escapeSPARQLString(userId2);
    const { limit = 50, minReputation } = options;

    const reputationFilter = minReputation
      ? `FILTER(?mutualReputation >= ${minReputation})`
      : '';

    return `${SPARQL_PREFIXES}

SELECT ?mutual ?mutualName ?mutualReputation ?connectionStrength1 ?connectionStrength2
WHERE {
  ?user1 schema:identifier "${escapedUser1}" .
  ?user2 schema:identifier "${escapedUser2}" .
  
  # User1 -> Mutual
  ?user1 schema:follows | foaf:knows | dotrep:collaboratesWith ?mutual .
  
  # User2 -> Mutual
  ?user2 schema:follows | foaf:knows | dotrep:collaboratesWith ?mutual .
  
  # Get mutual's details
  ?mutual foaf:name ?mutualName .
  
  OPTIONAL {
    ?mutual dotrep:reputationScore ?mutualReputation .
  }
  
  OPTIONAL {
    ?conn1 schema:actor ?user1 ;
           schema:object ?mutual ;
           dotrep:connectionStrength ?connectionStrength1 .
  }
  
  OPTIONAL {
    ?conn2 schema:actor ?user2 ;
           schema:object ?mutual ;
           dotrep:connectionStrength ?connectionStrength2 .
  }
  
  FILTER(?user1 != ?mutual && ?user2 != ?mutual)
  ${reputationFilter}
}
ORDER BY DESC((COALESCE(?connectionStrength1, 0) + COALESCE(?connectionStrength2, 0)) / 2.0)
LIMIT ${limit}`;
  }

  /**
   * Sort or filter users by attributes (age, activity level, reputation)
   * 
   * Uses SPARQL's FILTER and ORDER BY clauses
   */
  static filterUsersByAttributes(
    filters: {
      minAge?: number;
      maxAge?: number;
      minReputation?: number;
      maxReputation?: number;
      minActivity?: number;
      location?: string;
      interests?: string[];
    },
    options: SocialNetworkQueryOptions = {}
  ): string {
    const { limit = 100, orderBy = 'reputation', orderDirection = 'DESC' } = options;
    const escapedLimit = Math.min(limit, 1000);

    const filterConditions: string[] = [];

    if (filters.minAge || filters.maxAge) {
      const currentYear = new Date().getFullYear();
      if (filters.minAge) {
        const maxBirthYear = currentYear - filters.minAge;
        filterConditions.push(`YEAR(?birthdate) <= ${maxBirthYear}`);
      }
      if (filters.maxAge) {
        const minBirthYear = currentYear - filters.maxAge;
        filterConditions.push(`YEAR(?birthdate) >= ${minBirthYear}`);
      }
    }

    if (filters.minReputation) {
      filterConditions.push(`?reputationScore >= ${filters.minReputation}`);
    }
    if (filters.maxReputation) {
      filterConditions.push(`?reputationScore <= ${filters.maxReputation}`);
    }

    if (filters.minActivity) {
      filterConditions.push(`?activityLevel >= ${filters.minActivity}`);
    }

    if (filters.location) {
      const escapedLocation = escapeSPARQLString(filters.location);
      filterConditions.push(`CONTAINS(LCASE(?location), LCASE("${escapedLocation}"))`);
    }

    if (filters.interests && filters.interests.length > 0) {
      const interestFilters = filters.interests
        .map(interest => {
          const escaped = escapeSPARQLString(interest);
          return `CONTAINS(LCASE(STR(?interest)), LCASE("${escaped}"))`;
        })
        .join(' || ');
      filterConditions.push(`(${interestFilters})`);
    }

    const filterClause = filterConditions.length > 0
      ? `\n    ${filterConditions.map(f => `FILTER(${f})`).join('\n    ')}`
      : '';

    const orderByVar = orderBy === 'reputation' ? 'reputationScore'
      : orderBy === 'activity' ? 'activityLevel'
      : orderBy === 'date' ? 'dateModified'
      : 'name';

    return `${SPARQL_PREFIXES}

SELECT ?user ?name ?birthdate ?reputationScore ?activityLevel ?location ?interests
WHERE {
  ?user a schema:Person ;
        foaf:name ?name .
  
  OPTIONAL { ?user foaf:birthday ?birthdate . }
  OPTIONAL { ?user dotrep:reputationScore ?reputationScore . }
  OPTIONAL { ?user dotrep:activityLevel ?activityLevel . }
  OPTIONAL { 
    ?user schema:address ?address . 
    ?address schema:addressLocality ?location . 
  }
  OPTIONAL { 
    ?user schema:knowsAbout | dotrep:interests ?interest .
    BIND(GROUP_CONCAT(DISTINCT ?interest; separator=", ") AS ?interests)
  }
  ${filterClause}
}
GROUP BY ?user ?name ?birthdate ?reputationScore ?activityLevel ?location
ORDER BY ${orderDirection}(?${orderByVar})
LIMIT ${escapedLimit}`;
  }

  /**
   * Find users with highest activity levels
   * 
   * Aggregates activity data to analyze social dynamics
   */
  static findMostActiveUsers(
    timeWindow?: { days: number },
    options: SocialNetworkQueryOptions = {}
  ): string {
    const { limit = 20, minReputation } = options;
    const escapedLimit = Math.min(limit, 100);

    const timeFilter = timeWindow
      ? `FILTER(?timestamp >= "${new Date(Date.now() - timeWindow.days * 24 * 60 * 60 * 1000).toISOString()}"^^xsd:dateTime)`
      : '';

    const reputationFilter = minReputation
      ? `FILTER(?reputationScore >= ${minReputation})`
      : '';

    return `${SPARQL_PREFIXES}

SELECT ?user ?name ?reputationScore 
       (COUNT(DISTINCT ?activity) AS ?activityCount)
       (MAX(?timestamp) AS ?lastActivity)
WHERE {
  ?user a schema:Person ;
        foaf:name ?name .
  
  ?activity schema:actor ?user ;
            schema:timestamp ?timestamp .
  
  OPTIONAL {
    ?user dotrep:reputationScore ?reputationScore .
  }
  
  ${timeFilter}
  ${reputationFilter}
}
GROUP BY ?user ?name ?reputationScore
ORDER BY DESC(?activityCount)
LIMIT ${escapedLimit}`;
  }

  /**
   * Detect communities in the social network
   * 
   * Finds tightly connected groups of users
   */
  static detectCommunities(
    minCommunitySize: number = 5,
    minConnectionStrength: number = 0.7,
    options: SocialNetworkQueryOptions = {}
  ): string {
    const { limit = 50 } = options;

    return `${SPARQL_PREFIXES}

SELECT ?community ?member ?memberName ?memberReputation 
       (COUNT(DISTINCT ?sharedConnection) AS ?sharedConnections)
       (AVG(?connectionStrength) AS ?avgConnectionStrength)
WHERE {
  {
    SELECT ?member1 ?member2 (AVG(?strength) AS ?avgStrength) (COUNT(*) AS ?sharedConnections)
    WHERE {
      ?conn1 schema:actor ?member1 ;
             schema:object ?sharedConnection ;
             dotrep:connectionStrength ?strength1 .
      ?conn2 schema:actor ?member2 ;
             schema:object ?sharedConnection ;
             dotrep:connectionStrength ?strength2 .
      
      FILTER(?member1 != ?member2)
      BIND((?strength1 + ?strength2) / 2.0 AS ?strength)
    }
    GROUP BY ?member1 ?member2
    HAVING(?avgStrength >= ${minConnectionStrength} && ?sharedConnections >= 2)
  }
  
  ?member foaf:name ?memberName .
  OPTIONAL { ?member dotrep:reputationScore ?memberReputation . }
  
  BIND(CONCAT("community-", MD5(CONCAT(STR(?member1), "-", STR(?member2)))) AS ?community)
  
  FILTER(?member = ?member1 || ?member = ?member2)
}
GROUP BY ?community ?member ?memberName ?memberReputation
HAVING(COUNT(DISTINCT ?member) >= ${minCommunitySize})
ORDER BY DESC(?avgConnectionStrength)
LIMIT ${limit}`;
  }

  /**
   * Find recommended connections
   * 
   * Suggests users to connect with based on mutual connections and interests
   */
  static findRecommendedConnections(
    userId: string,
    options: SocialNetworkQueryOptions = {}
  ): string {
    const escapedUserId = escapeSPARQLString(userId);
    const { limit = 20, minReputation, minConnectionStrength = 0.5 } = options;

    const reputationFilter = minReputation
      ? `FILTER(?recommendedReputation >= ${minReputation})`
      : '';

    return `${SPARQL_PREFIXES}

SELECT ?recommended ?recommendedName ?recommendedReputation
       (COUNT(DISTINCT ?mutual) AS ?mutualConnections)
       (AVG(?mutualStrength) AS ?avgMutualStrength)
       (COUNT(DISTINCT ?sharedInterest) AS ?sharedInterests)
WHERE {
  ?user schema:identifier "${escapedUserId}" .
  
  # Find users connected to user's connections (mutual connections)
  ?user schema:follows | foaf:knows ?connection .
  ?connection schema:follows | foaf:knows ?recommended .
  
  # Get recommended user details
  ?recommended foaf:name ?recommendedName .
  OPTIONAL { ?recommended dotrep:reputationScore ?recommendedReputation . }
  
  # Count mutual connections
  OPTIONAL {
    ?user schema:follows | foaf:knows ?mutual .
    ?recommended schema:follows | foaf:knows ?mutual .
    ?mutualConn schema:actor ?user ;
                schema:object ?mutual ;
                dotrep:connectionStrength ?mutualStrength .
  }
  
  # Find shared interests
  OPTIONAL {
    ?user schema:knowsAbout | dotrep:interests ?sharedInterest .
    ?recommended schema:knowsAbout | dotrep:interests ?sharedInterest .
  }
  
  FILTER(?user != ?recommended)
  FILTER(?connection != ?recommended)
  FILTER(?avgMutualStrength >= ${minConnectionStrength})
  ${reputationFilter}
}
GROUP BY ?recommended ?recommendedName ?recommendedReputation
ORDER BY DESC((?mutualConnections * 0.6 + ?sharedInterests * 0.4))
LIMIT ${limit}`;
  }

  /**
   * Aggregate social network statistics
   * 
   * Provides overview statistics for social network analysis
   */
  static getNetworkStatistics(): string {
    return `${SPARQL_PREFIXES}

SELECT 
  (COUNT(DISTINCT ?user) AS ?totalUsers)
  (COUNT(DISTINCT ?connection) AS ?totalConnections)
  (AVG(?reputationScore) AS ?avgReputation)
  (MAX(?reputationScore) AS ?maxReputation)
  (MIN(?reputationScore) AS ?minReputation)
  (COUNT(DISTINCT ?interest) AS ?totalInterests)
WHERE {
  OPTIONAL {
    ?user a schema:Person .
  }
  
  OPTIONAL {
    ?connectionEdge schema:actor ?user ;
                    schema:object ?connection .
  }
  
  OPTIONAL {
    ?user dotrep:reputationScore ?reputationScore .
  }
  
  OPTIONAL {
    ?user schema:knowsAbout | dotrep:interests ?interest .
  }
}`;
  }
}

/**
 * Query result transformer utilities
 */
export class SPARQLResultTransformer {
  /**
   * Transform SPARQL SELECT results to flat objects
   */
  static transformSelectResults(results: any[]): Record<string, any>[] {
    if (!Array.isArray(results)) {
      return [];
    }

    return results.map((row: any) => {
      const transformed: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(row)) {
        if (value && typeof value === 'object' && 'value' in value) {
          // SPARQL result format: { value: "...", type: "uri" | "literal" }
          transformed[key] = value.value;
        } else {
          transformed[key] = value;
        }
      }
      
      return transformed;
    });
  }

  /**
   * Group results by a key
   */
  static groupBy(results: Record<string, any>[], key: string): Map<string, Record<string, any>[]> {
    const grouped = new Map<string, Record<string, any>[]>();
    
    for (const result of results) {
      const groupKey = result[key] || 'unknown';
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(result);
    }
    
    return grouped;
  }

  /**
   * Sort results by a key
   */
  static sortBy(
    results: Record<string, any>[],
    key: string,
    direction: 'ASC' | 'DESC' = 'ASC'
  ): Record<string, any>[] {
    return [...results].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return direction === 'ASC' ? comparison : -comparison;
    });
  }
}

export default SocialNetworkQueries;

