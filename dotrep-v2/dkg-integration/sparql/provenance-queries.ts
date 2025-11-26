/**
 * SPARQL Queries for Provenance and Audit Trails
 * 
 * Collection of SPARQL queries for querying provenance information
 * from the OriginTrail DKG.
 */

export const SPARQLQueries = {
  /**
   * Fetch asset with full provenance information
   */
  fetchAssetProvenance: `
    PREFIX schema: <https://schema.org/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX dotrep: <https://dotrep.io/ontology/>
    
    SELECT ?asset ?id ?creator ?published ?contentHash ?signature ?reputationScore
    WHERE {
      ?asset a schema:CreativeWork .
      ?asset schema:identifier ?id .
      ?asset schema:creator ?creator .
      ?asset schema:datePublished ?published .
      ?asset dotrep:contentHash ?contentHash .
      ?asset dotrep:signature ?signature .
      OPTIONAL { ?asset dotrep:reputationScore ?reputationScore . }
    }
    LIMIT 100
  `,

  /**
   * Fetch revision chain for an asset
   */
  fetchRevisionChain: `
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX schema: <https://schema.org/>
    
    SELECT ?asset ?wasRevisionOf ?published
    WHERE {
      ?asset prov:wasRevisionOf ?wasRevisionOf .
      ?asset schema:datePublished ?published .
    }
    ORDER BY ?published
  `,

  /**
   * Get all versions of an asset
   */
  getAssetVersions: (ual: string) => `
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX schema: <https://schema.org/>
    
    SELECT ?version ?published ?contentHash
    WHERE {
      {
        ?version prov:wasRevisionOf <${ual}> .
      }
      UNION
      {
        ?version <http://www.w3.org/ns/prov#wasRevisionOf> <${ual}> .
      }
      ?version schema:datePublished ?published .
      ?version <https://dotrep.io/ontology/contentHash> ?contentHash .
    }
    ORDER BY ?published
  `,

  /**
   * Fetch assets by creator DID
   */
  fetchAssetsByCreator: (creatorDID: string) => `
    PREFIX schema: <https://schema.org/>
    
    SELECT ?asset ?id ?published ?contentHash
    WHERE {
      ?asset schema:creator "${creatorDID}" .
      ?asset schema:identifier ?id .
      ?asset schema:datePublished ?published .
      ?asset <https://dotrep.io/ontology/contentHash> ?contentHash .
    }
    ORDER BY DESC(?published)
    LIMIT 50
  `,

  /**
   * Fetch provenance metadata for an asset
   */
  fetchProvenanceMetadata: (ual: string) => `
    PREFIX dotrep: <https://dotrep.io/ontology/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    
    SELECT ?computedBy ?method ?sourceAsset
    WHERE {
      <${ual}> dotrep:provenance ?provenance .
      ?provenance dotrep:computedBy ?computedBy .
      ?provenance dotrep:method ?method .
      OPTIONAL {
        ?provenance dotrep:sourceAssets ?sourceAsset .
      }
    }
  `,

  /**
   * Fetch all CommunityNotes for a target asset
   */
  fetchCommunityNotes: (targetUAL: string) => `
    PREFIX dotrep: <https://dotrep.io/ontology/>
    PREFIX schema: <https://schema.org/>
    
    SELECT ?note ?author ?published ?summary ?contentHash
    WHERE {
      ?note a dotrep:CommunityNote .
      ?note dotrep:targetUAL "${targetUAL}" .
      ?note schema:author ?author .
      ?note schema:datePublished ?published .
      ?note schema:description ?summary .
      ?note <https://dotrep.io/ontology/contentHash> ?contentHash .
    }
    ORDER BY DESC(?published)
  `,

  /**
   * Fetch access receipts for a resource
   */
  fetchAccessReceipts: (resourceUAL: string) => `
    PREFIX dotrep: <https://dotrep.io/ontology/>
    PREFIX schema: <https://schema.org/>
    
    SELECT ?receipt ?payer ?recipient ?amount ?paymentTx ?published
    WHERE {
      ?receipt a dotrep:AccessReceipt .
      ?receipt dotrep:resourceUAL "${resourceUAL}" .
      ?receipt schema:accountId ?payer .
      ?receipt dotrep:recipient ?recipient .
      ?receipt schema:price ?amount .
      ?receipt dotrep:paymentTx ?paymentTx .
      ?receipt schema:datePublished ?published .
    }
    ORDER BY DESC(?published)
  `,

  /**
   * Audit trail: Get all assets modified in a time range
   */
  auditTrailByDateRange: (startDate: string, endDate: string) => `
    PREFIX schema: <https://schema.org/>
    
    SELECT ?asset ?id ?creator ?published ?contentHash
    WHERE {
      ?asset schema:datePublished ?published .
      FILTER (?published >= "${startDate}" && ?published <= "${endDate}")
      ?asset schema:identifier ?id .
      ?asset schema:creator ?creator .
      ?asset <https://dotrep.io/ontology/contentHash> ?contentHash .
    }
    ORDER BY ?published
  `,

  /**
   * Get assets with missing provenance
   */
  findAssetsWithoutProvenance: `
    PREFIX schema: <https://schema.org/>
    PREFIX dotrep: <https://dotrep.io/ontology/>
    
    SELECT ?asset ?id ?published
    WHERE {
      ?asset a schema:CreativeWork .
      ?asset schema:identifier ?id .
      ?asset schema:datePublished ?published .
      FILTER NOT EXISTS {
        ?asset dotrep:provenance ?provenance .
      }
    }
    LIMIT 100
  `,

  /**
   * Get assets with invalid signatures (for monitoring)
   */
  findAssetsWithInvalidSignatures: `
    PREFIX schema: <https://schema.org/>
    PREFIX dotrep: <https://dotrep.io/ontology/>
    
    SELECT ?asset ?id ?creator ?published
    WHERE {
      ?asset a schema:CreativeWork .
      ?asset schema:identifier ?id .
      ?asset schema:creator ?creator .
      ?asset schema:datePublished ?published .
      FILTER NOT EXISTS {
        ?asset dotrep:signature ?signature .
      }
    }
    LIMIT 100
  `
};

/**
 * Execute a SPARQL query on the DKG
 */
export async function executeSPARQLQuery(
  query: string,
  dkgClient: any
): Promise<any[]> {
  try {
    const results = await dkgClient.graphQuery(query, 'SELECT');
    return results;
  } catch (error: any) {
    console.error('SPARQL query failed:', error);
    throw error;
  }
}

/**
 * Get full provenance chain for an asset
 */
export async function getProvenanceChain(
  ual: string,
  dkgClient: any
): Promise<Array<{ ual: string; published: string; contentHash: string }>> {
  const query = SPARQLQueries.getAssetVersions(ual);
  const results = await executeSPARQLQuery(query, dkgClient);
  
  return results.map((r: any) => ({
    ual: r.version?.value || '',
    published: r.published?.value || '',
    contentHash: r.contentHash?.value || ''
  }));
}

/**
 * Get audit trail for a creator
 */
export async function getCreatorAuditTrail(
  creatorDID: string,
  dkgClient: any
): Promise<Array<{ asset: string; published: string; contentHash: string }>> {
  const query = SPARQLQueries.fetchAssetsByCreator(creatorDID);
  const results = await executeSPARQLQuery(query, dkgClient);
  
  return results.map((r: any) => ({
    asset: r.asset?.value || '',
    published: r.published?.value || '',
    contentHash: r.contentHash?.value || ''
  }));
}

