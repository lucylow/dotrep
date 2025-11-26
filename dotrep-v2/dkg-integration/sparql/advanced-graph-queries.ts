/**
 * Advanced SPARQL Queries for Knowledge Graph Traversal
 * 
 * Enhanced queries for discovering relationships, multi-hop paths,
 * community detection, and cross-chain reputation aggregation
 */

export interface QueryParams {
  developerId?: string;
  ual?: string;
  chain?: string;
  minReputation?: number;
  minConnectionStrength?: number;
  limit?: number;
  offset?: number;
}

export class AdvancedGraphQueries {
  /**
   * Multi-hop relationship discovery
   * Finds paths between two developers through the knowledge graph
   */
  static findRelationshipPath(
    fromDeveloperId: string,
    toDeveloperId: string,
    maxHops: number = 3
  ): string {
    // Build a union query for paths of different lengths
    const pathQueries: string[] = [];
    
    for (let hop = 1; hop <= maxHops; hop++) {
      const conditions: string[] = [];
      const intermediateVars: string[] = [];
      
      // Build path: from -> inter1 -> inter2 -> ... -> to
      let prevVar = '?from';
      conditions.push(`?from dotrep:identifier "${fromDeveloperId}" .`);
      
      for (let i = 1; i < hop; i++) {
        const interVar = `?inter${i}`;
        intermediateVars.push(interVar);
        conditions.push(`${prevVar} ?conn${i} ${interVar} .`);
        conditions.push(`?conn${i} dotrep:connectionType ?connType${i} .`);
        prevVar = interVar;
      }
      
      conditions.push(`${prevVar} ?conn${hop} ?to .`);
      conditions.push(`?conn${hop} dotrep:connectionType ?connType${hop} .`);
      conditions.push(`?to dotrep:identifier "${toDeveloperId}" .`);
      
      pathQueries.push(`
        SELECT DISTINCT ?from ?to ${intermediateVars.map(v => v).join(' ')} ?pathStrength
        WHERE {
          ${conditions.join('\n          ')}
          BIND(1.0 / ${hop} AS ?pathStrength)
        }
      `);
    }
    
    return `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      PREFIX polkadot: <https://polkadot.network/ontology/>
      
      ${pathQueries.join('\n      UNION\n')}
      ORDER BY ?pathStrength DESC
      LIMIT 10
    `;
  }

  /**
   * Find influential developers in a network
   * Uses weighted PageRank-like query with social connections
   */
  static findInfluentialDevelopers(
    networkId?: string,
    minReputation: number = 700,
    limit: number = 20
  ): string {
    return `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      PREFIX polkadot: <https://polkadot.network/ontology/>
      
      SELECT ?developer ?address ?reputationScore ?influenceScore ?connectionCount
      WHERE {
        ?developer a schema:Person ;
                   dotrep:identifier ?address ;
                   dotrep:reputationScore ?reputationScore .
        
        ${networkId ? `
        ?network dotrep:networkId "${networkId}" .
        ?network dotrep:participants ?developer .
        ` : ''}
        
        OPTIONAL {
          ?connection dotrep:from ?developer ;
                      dotrep:connectionStrength ?strength .
          BIND(?strength AS ?connStrength)
        }
        
        OPTIONAL {
          ?connection2 dotrep:to ?developer ;
                       dotrep:connectionStrength ?strength2 .
          BIND(?strength2 AS ?connStrength2)
        }
        
        BIND((COALESCE(?connStrength, 0) + COALESCE(?connStrength2, 0)) / 2.0 AS ?influenceScore)
        
        {
          SELECT ?developer (COUNT(?conn) AS ?connectionCount)
          WHERE {
            {
              ?conn dotrep:from ?developer .
            } UNION {
              ?conn dotrep:to ?developer .
            }
          }
          GROUP BY ?developer
        }
        
        FILTER(?reputationScore >= ${minReputation})
        FILTER(?influenceScore > 0.5)
      }
      GROUP BY ?developer ?address ?reputationScore ?influenceScore ?connectionCount
      ORDER BY DESC(?influenceScore * ?reputationScore / 1000.0)
      LIMIT ${limit}
    `;
  }

  /**
   * Cross-chain reputation aggregation query
   * Aggregates reputation scores across multiple chains
   */
  static aggregateCrossChainReputation(
    developerId: string,
    chains: string[] = ['polkadot', 'kusama', 'neuroweb']
  ): string {
    const chainFilters = chains
      .map(chain => `?attestation dotrep:sourceChain "${chain}" .`)
      .join(' UNION ');
    
    return `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      PREFIX polkadot: <https://polkadot.network/ontology/>
      
      SELECT ?developer ?chain ?reputationScore ?confidence ?lastUpdated
             (AVG(?reputationScore) AS ?aggregatedScore)
             (AVG(?confidence) AS ?aggregatedConfidence)
      WHERE {
        ?developer dotrep:identifier "${developerId}" .
        
        OPTIONAL {
          ?developer dotrep:crossChainReputation ?crossChain .
          ?crossChain dotrep:chains ?chainRep .
          ?chainRep dotrep:chainId ?chain .
          ?chainRep dotrep:reputationScore ?reputationScore .
          ?chainRep dotrep:confidence ?confidence .
          ?chainRep dotrep:lastUpdated ?lastUpdated .
          
          FILTER(
            ${chainFilters}
          )
        }
        
        OPTIONAL {
          ?attestation dotrep:attestationType "reputation_sync" ;
                       dotrep:attestationData ?data .
          ?data dotrep:developerId "${developerId}" .
          ?data dotrep:reputationScore ?reputationScore .
          ?attestation dotrep:sourceChain ?chain .
          BIND(0.8 AS ?confidence)
          BIND(now() AS ?lastUpdated)
        }
      }
      GROUP BY ?developer ?chain ?reputationScore ?confidence ?lastUpdated
      ORDER BY DESC(?lastUpdated)
    `;
  }

  /**
   * Community detection query
   * Finds tightly connected groups of developers
   */
  static detectCommunities(
    minCommunitySize: number = 5,
    minConnectionStrength: number = 0.7
  ): string {
    return `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?community ?member ?memberReputation ?communityMetrics
      WHERE {
        {
          SELECT ?member1 ?member2 (AVG(?strength) AS ?avgStrength) (COUNT(*) AS ?sharedConnections)
          WHERE {
            ?conn1 dotrep:from ?member1 ;
                    dotrep:to ?shared ;
                    dotrep:connectionStrength ?strength1 .
            ?conn2 dotrep:from ?member2 ;
                    dotrep:to ?shared ;
                    dotrep:connectionStrength ?strength2 .
            FILTER(?member1 != ?member2)
            BIND((?strength1 + ?strength2) / 2.0 AS ?strength)
          }
          GROUP BY ?member1 ?member2
          HAVING(?avgStrength >= ${minConnectionStrength} && ?sharedConnections >= 2)
        }
        
        ?member schema:identifier ?memberId ;
                dotrep:reputationScore ?memberReputation .
        
        BIND(CONCAT("community-", MD5(CONCAT(?member1, "-", ?member2))) AS ?community)
        
        FILTER(?member = ?member1 || ?member = ?member2)
      }
      GROUP BY ?community ?member ?memberReputation
      HAVING(COUNT(DISTINCT ?member) >= ${minCommunitySize})
      ORDER BY DESC(?communityMetrics)
    `;
  }

  /**
   * Find trusted collaborators
   * Developers who have strong collaborative relationships
   */
  static findTrustedCollaborators(
    developerId: string,
    minReputation: number = 600,
    minCollaborationStrength: number = 0.7
  ): string {
    return `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?collaborator ?address ?reputationScore ?collaborationStrength ?sharedContributions
      WHERE {
        ?developer dotrep:identifier "${developerId}" .
        
        {
          # Direct collaboration connections
          ?connection dotrep:from ?developer ;
                      dotrep:to ?collaborator ;
                      dotrep:connectionType "collaborates_with" ;
                      dotrep:connectionStrength ?collaborationStrength .
          
          FILTER(?collaborationStrength >= ${minCollaborationStrength})
        } UNION {
          # Indirect: shared contributions
          ?developer dotrep:contributions ?contrib1 .
          ?collaborator dotrep:contributions ?contrib2 .
          ?contrib1 dotrep:relatedContributions ?sharedContrib .
          ?contrib2 dotrep:relatedContributions ?sharedContrib .
          BIND(0.8 AS ?collaborationStrength)
          FILTER(?developer != ?collaborator)
        }
        
        ?collaborator dotrep:identifier ?address ;
                      dotrep:reputationScore ?reputationScore .
        
        OPTIONAL {
          ?developer dotrep:contributions ?devContrib .
          ?collaborator dotrep:contributions ?collabContrib .
          ?devContrib dotrep:relatedContributions ?sharedContributions .
          ?collabContrib dotrep:relatedContributions ?sharedContributions .
        }
        
        FILTER(?reputationScore >= ${minReputation})
        FILTER(?collaborator != ?developer)
      }
      GROUP BY ?collaborator ?address ?reputationScore ?collaborationStrength
      ORDER BY DESC(?collaborationStrength * ?reputationScore / 1000.0)
      LIMIT 20
    `;
  }

  /**
   * Verify knowledge graph integrity
   * Checks for inconsistencies and missing relationships
   */
  static verifyGraphIntegrity(): string {
    return `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      PREFIX polkadot: <https://polkadot.network/ontology/>
      
      SELECT ?issue ?entity ?details ?severity
      WHERE {
        {
          # Missing cross-chain reputation for high-reputation developers
          SELECT ("missing_cross_chain_reputation" AS ?issue) ?developer AS ?entity 
                 "High reputation developer lacks cross-chain attestations" AS ?details
                 "medium" AS ?severity
          WHERE {
            ?developer dotrep:reputationScore ?score .
            FILTER(?score >= 800)
            FILTER NOT EXISTS {
              ?developer dotrep:crossChainReputation ?crossChain .
            }
            FILTER NOT EXISTS {
              ?attestation dotrep:attestationType "reputation_sync" ;
                           dotrep:attestationData ?data .
              ?data dotrep:developerId ?developer .
            }
          }
        } UNION {
          # Orphaned contributions (contributions without authors)
          SELECT ("orphaned_contribution" AS ?issue) ?contribution AS ?entity
                 "Contribution lacks author reference" AS ?details
                 "high" AS ?severity
          WHERE {
            ?contribution a schema:CreativeWork .
            FILTER NOT EXISTS {
              ?contribution schema:author ?author .
            }
          }
        } UNION {
          # Missing human verification for high-stake developers
          SELECT ("missing_human_verification" AS ?issue) ?developer AS ?entity
                 "High-stake developer lacks proof of personhood" AS ?details
                 "medium" AS ?severity
          WHERE {
            ?developer polkadot:onChainStake ?stake .
            ?stake dotrep:amount ?amount .
            FILTER(xsd:double(?amount) > 10000)
            FILTER NOT EXISTS {
              ?developer polkadot:humanVerification ?verification .
              ?verification dotrep:status "verified" .
            }
          }
        } UNION {
          # Broken cross-chain attestations
          SELECT ("broken_cross_chain_link" AS ?issue) ?attestation AS ?entity
                 "Cross-chain attestation missing source/target chain reference" AS ?details
                 "high" AS ?severity
          WHERE {
            ?attestation a dotrep:CrossChainAttestation .
            FILTER(
              NOT EXISTS { ?attestation dotrep:sourceChain ?source . } ||
              NOT EXISTS { ?attestation dotrep:targetChain ?target . }
            )
          }
        }
      }
      ORDER BY ?severity DESC
    `;
  }

  /**
   * Find reputation propagation paths
   * How reputation flows through the network
   */
  static findReputationPropagationPaths(
    sourceDeveloperId: string,
    maxHops: number = 3
  ): string {
    return `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?path ?hop ?developer ?reputationScore ?connectionStrength ?pathReputation
      WHERE {
        ?source dotrep:identifier "${sourceDeveloperId}" .
        ?source dotrep:reputationScore ?sourceReputation .
        
        {
          # Direct connections
          SELECT (1 AS ?hop) ?source AS ?from ?target AS ?developer ?strength AS ?connectionStrength
                 (?sourceReputation * ?strength AS ?pathReputation)
          WHERE {
            ?source dotrep:identifier "${sourceDeveloperId}" .
            ?connection dotrep:from ?source ;
                        dotrep:to ?target ;
                        dotrep:connectionStrength ?strength .
          }
        }
        
        ${Array.from({ length: maxHops - 1 }, (_, i) => {
          const hop = i + 2;
          return `
          UNION {
            # Hop ${hop}
            SELECT (${hop} AS ?hop) ?prev AS ?from ?next AS ?developer ?strength AS ?connectionStrength
                   (?prevReputation * ?strength AS ?pathReputation)
            WHERE {
              ?prevHop dotrep:identifier ?prevId .
              ?connection dotrep:from ?prev ;
                          dotrep:to ?next ;
                          dotrep:connectionStrength ?strength .
              ?prev dotrep:reputationScore ?prevReputation .
              
              # Get from previous hop
              ${i === 0 ? `
              ?connection1 dotrep:from ?source ;
                           dotrep:to ?prev ;
                           dotrep:connectionStrength ?strength1 .
              ` : `
              ?prevHop2 (dotrep:from|dotrep:to) ?prev .
              `}
            }
          }
          `;
        }).join('\n        ')}
        
        ?developer dotrep:reputationScore ?reputationScore .
        BIND(CONCAT("path-", STR(?source), "-", STR(?developer), "-", STR(?hop)) AS ?path)
      }
      ORDER BY ?path ASC ?hop ASC
      LIMIT 50
    `;
  }

  /**
   * Semantic search across knowledge graph
   * Full-text search with relationship context
   */
  static semanticSearch(
    searchTerm: string,
    entityTypes: string[] = ['Person', 'CreativeWork', 'ReputationNetwork'],
    limit: number = 20
  ): string {
    const typeFilters = entityTypes.map(type => `?entity a schema:${type} .`).join(' UNION ');
    
    return `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      
      SELECT DISTINCT ?entity ?entityType ?name ?description ?relevanceScore
                      (GROUP_CONCAT(DISTINCT ?relatedEntity; separator=", ") AS ?relatedEntities)
      WHERE {
        {
          ?entity a ?entityType .
          FILTER(
            ${typeFilters}
          )
          
          {
            ?entity schema:name ?name .
            FILTER(CONTAINS(LCASE(?name), LCASE("${searchTerm}")))
            BIND(1.0 AS ?relevanceScore)
          } UNION {
            ?entity schema:description ?description .
            FILTER(CONTAINS(LCASE(?description), LCASE("${searchTerm}")))
            BIND(0.7 AS ?relevanceScore)
          } UNION {
            ?entity dotrep:technologies ?tech .
            FILTER(CONTAINS(LCASE(?tech), LCASE("${searchTerm}")))
            BIND(0.5 AS ?relevanceScore)
          }
        }
        
        OPTIONAL {
          {
            ?entity ?relation ?relatedEntity .
            FILTER(?relation != rdf:type)
          } UNION {
            ?relatedEntity ?relation ?entity .
            FILTER(?relation != rdf:type)
          }
        }
      }
      GROUP BY ?entity ?entityType ?name ?description ?relevanceScore
      ORDER BY DESC(?relevanceScore)
      LIMIT ${limit}
    `;
  }

  /**
   * Get comprehensive developer profile with all relationships
   */
  static getDeveloperProfile(developerId: string): string {
    return `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      PREFIX polkadot: <https://polkadot.network/ontology/>
      
      SELECT ?developer ?address ?reputationScore ?sybilResistanceScore
             ?humanVerified ?stakeAmount ?crossChainReputation
             (COUNT(DISTINCT ?contribution) AS ?contributionCount)
             (COUNT(DISTINCT ?connection) AS ?connectionCount)
             (AVG(?connectionStrength) AS ?avgConnectionStrength)
             (GROUP_CONCAT(DISTINCT ?networkId; separator=", ") AS ?networks)
      WHERE {
        ?developer dotrep:identifier "${developerId}" ;
                   dotrep:identifier ?address ;
                   dotrep:reputationScore ?reputationScore .
        
        OPTIONAL {
          ?developer dotrep:sybilResistanceScore ?sybilResistanceScore .
        }
        
        OPTIONAL {
          ?developer polkadot:humanVerification ?verification .
          ?verification dotrep:status ?status .
          BIND(?status = "verified" AS ?humanVerified)
        }
        
        OPTIONAL {
          ?developer polkadot:onChainStake ?stake .
          ?stake dotrep:amount ?stakeAmount .
        }
        
        OPTIONAL {
          ?developer dotrep:crossChainReputation ?crossChainReputation .
        }
        
        OPTIONAL {
          ?contribution schema:author ?developer .
        }
        
        OPTIONAL {
          {
            ?connection dotrep:from ?developer ;
                        dotrep:connectionStrength ?connectionStrength .
          } UNION {
            ?connection dotrep:to ?developer ;
                        dotrep:connectionStrength ?connectionStrength .
          }
        }
        
        OPTIONAL {
          ?network dotrep:participants ?developer .
          ?network dotrep:networkId ?networkId .
        }
      }
      GROUP BY ?developer ?address ?reputationScore ?sybilResistanceScore
               ?humanVerified ?stakeAmount ?crossChainReputation
    `;
  }
}

/**
 * Query builder helper for dynamic queries
 */
export class GraphQueryBuilder {
  static buildQuery(
    queryType: keyof typeof AdvancedGraphQueries,
    params: QueryParams & Record<string, any>
  ): string {
    switch (queryType) {
      case 'findInfluentialDevelopers':
        return AdvancedGraphQueries.findInfluentialDevelopers(
          params.networkId,
          params.minReputation || 700,
          params.limit || 20
        );
      
      case 'aggregateCrossChainReputation':
        return AdvancedGraphQueries.aggregateCrossChainReputation(
          params.developerId!,
          params.chains || ['polkadot', 'kusama', 'neuroweb']
        );
      
      case 'findTrustedCollaborators':
        return AdvancedGraphQueries.findTrustedCollaborators(
          params.developerId!,
          params.minReputation || 600,
          params.minCollaborationStrength || 0.7
        );
      
      case 'semanticSearch':
        return AdvancedGraphQueries.semanticSearch(
          params.searchTerm!,
          params.entityTypes || ['Person', 'CreativeWork'],
          params.limit || 20
        );
      
      case 'getDeveloperProfile':
        return AdvancedGraphQueries.getDeveloperProfile(params.developerId!);
      
      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
  }
}

export default AdvancedGraphQueries;

