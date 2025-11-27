/**
 * SPARQL Queries for Payment Evidence Knowledge Assets
 * 
 * Ready-to-use SPARQL queries from the research brief for querying
 * Payment Evidence KAs from the DKG for reputation and TraceRank analysis.
 */

/**
 * Query to find recent Payment Evidence KAs
 * 
 * From research brief section 5.A
 */
export const FIND_RECENT_PAYMENT_EVIDENCE_QUERY = `
  PREFIX schema: <https://schema.org/>
  SELECT ?ka ?price ?currency ?tx WHERE {
    ?ka a schema:PaymentChargeSpecification ;
        schema:price ?price ;
        schema:priceCurrency ?currency ;
        schema:identifier ?id .
    ?id schema:propertyID "txHash" ;
        schema:value ?tx .
  }
  ORDER BY DESC(?ka)
  LIMIT 100
`;

/**
 * Query to find purchases for a seller (by recipient address)
 * 
 * From research brief section 5.B
 */
export function createFindPurchasesForSellerQuery(recipientAddress: string): string {
  return `
    PREFIX schema: <https://schema.org/>
    SELECT ?ka ?buyer ?amount ?tx WHERE {
      ?ka a schema:PaymentChargeSpecification ;
          schema:identifier ?id ;
          schema:price ?amount ;
          schema:recipient ?recipient .
      FILTER(STR(?recipient) = "${recipientAddress}")
      ?ka schema:payee ?buyer .
      ?id schema:propertyID "txHash" ; schema:value ?tx .
    }
    ORDER BY DESC(?ka)
  `;
}

/**
 * Query to find Payment Evidence KAs with full details including provenance
 */
export function createFindPaymentEvidenceWithProvenanceQuery(filters: {
  payer?: string;
  recipient?: string;
  resourceUAL?: string;
  minAmount?: number;
  chain?: string;
  limit?: number;
}): string {
  const { payer, recipient, resourceUAL, minAmount, chain, limit = 100 } = filters;
  
  return `
    PREFIX schema: <https://schema.org/>
    PREFIX dotrep: <https://dotrep.io/ontology/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    
    SELECT ?ka ?price ?currency ?tx ?payer ?recipient ?timestamp ?resourceUAL ?chain ?paymentWeight
    WHERE {
      ?ka a schema:PaymentChargeSpecification ;
          schema:price ?price ;
          schema:priceCurrency ?currency ;
          schema:identifier ?id ;
          prov:generatedAtTime ?timestamp .
      ?id schema:propertyID "txHash" ;
          schema:value ?tx .
      ?ka schema:payee ?payerObj .
      ?payerObj @id ?payer .
      ?ka schema:recipient ?recipientObj .
      ?recipientObj @id ?recipient .
      OPTIONAL { ?ka prov:wasDerivedFrom ?resourceUAL . }
      OPTIONAL { ?ka dotrep:chain ?chain . }
      OPTIONAL { ?ka dotrep:paymentWeight ?paymentWeight . }
      ${payer ? `FILTER(STR(?payer) = "${payer}")` : ''}
      ${recipient ? `FILTER(STR(?recipient) = "${recipient}")` : ''}
      ${resourceUAL ? `FILTER(STR(?resourceUAL) = "${resourceUAL}")` : ''}
      ${minAmount ? `FILTER(?price >= "${minAmount}")` : ''}
      ${chain ? `FILTER(STR(?chain) = "${chain}")` : ''}
    }
    ORDER BY DESC(?timestamp)
    LIMIT ${limit}
  `;
}

/**
 * Query to compute payment-weighted reputation metrics for a recipient
 * 
 * Used for TraceRank-style payment-weighted reputation scoring
 */
export function createPaymentWeightedReputationQuery(recipientAddress: string): string {
  return `
    PREFIX schema: <https://schema.org/>
    PREFIX dotrep: <https://dotrep.io/ontology/>
    
    SELECT 
      ?recipient 
      (SUM(?weightedAmount) as ?totalWeightedValue)
      (COUNT(?payment) as ?totalPayments)
      (SUM(?amount) as ?totalValue)
      (AVG(?paymentWeight) as ?avgPaymentWeight)
    WHERE {
      ?payment a schema:PaymentChargeSpecification ;
               schema:price ?amount ;
               schema:recipient ?recipient ;
               dotrep:paymentWeight ?paymentWeight .
      FILTER(STR(?recipient) = "${recipientAddress}")
      
      BIND(?amount * ?paymentWeight as ?weightedAmount)
    }
    GROUP BY ?recipient
  `;
}

/**
 * Query to find high-value purchases from reputable payers
 * 
 * Used for TraceRank: high-value purchases from high-reputation buyers boost seller standing
 */
export function createHighValuePurchaseQuery(filters: {
  minAmount?: number;
  minPayerReputation?: number;
  limit?: number;
}): string {
  const { minAmount = 100, minPayerReputation, limit = 50 } = filters;
  
  return `
    PREFIX schema: <https://schema.org/>
    PREFIX dotrep: <https://dotrep.io/ontology/>
    
    SELECT ?payment ?payer ?recipient ?amount ?payerReputation ?paymentWeight
    WHERE {
      ?payment a schema:PaymentChargeSpecification ;
               schema:price ?amount ;
               schema:payee ?payerObj ;
               schema:recipient ?recipient ;
               dotrep:paymentWeight ?paymentWeight .
      ?payerObj @id ?payer .
      
      OPTIONAL {
        ?payerProfile a dotrep:TrustedUserProfile .
        ?payerProfile schema:identifier ?payer .
        ?payerProfile dotrep:reputationScore ?payerReputation .
      }
      
      FILTER(?amount >= ${minAmount})
      ${minPayerReputation ? `FILTER(?payerReputation >= ${minPayerReputation})` : ''}
    }
    ORDER BY DESC(?amount * COALESCE(?payerReputation, 0))
    LIMIT ${limit}
  `;
}

/**
 * Query to aggregate payment statistics for TraceRank computation
 */
export function createPaymentStatisticsQuery(recipientAddress: string): string {
  return `
    PREFIX schema: <https://schema.org/>
    PREFIX dotrep: <https://dotrep.io/ontology/>
    
    SELECT 
      (COUNT(DISTINCT ?payment) as ?totalPayments)
      (SUM(?amount) as ?totalVolume)
      (AVG(?amount) as ?avgPaymentAmount)
      (MIN(?amount) as ?minPayment)
      (MAX(?amount) as ?maxPayment)
      (SUM(?paymentWeight) as ?totalWeight)
      (AVG(?paymentWeight) as ?avgWeight)
      (COUNT(DISTINCT ?payer) as ?uniquePayers)
    WHERE {
      ?payment a schema:PaymentChargeSpecification ;
               schema:price ?amount ;
               schema:payee ?payerObj ;
               schema:recipient ?recipient ;
               dotrep:paymentWeight ?paymentWeight .
      ?payerObj @id ?payer .
      
      FILTER(STR(?recipient) = "${recipientAddress}")
    }
  `;
}

/**
 * Query to detect potential Sybil payments (low-value spam)
 * 
 * Used for TraceRank sybil resistance: filter out low-value spam payments
 */
export function createSybilPaymentDetectionQuery(threshold: {
  maxAmount?: number;
  minUniquePayers?: number;
  timeWindow?: string; // ISO duration string
}): string {
  const { maxAmount = 1, minUniquePayers = 10 } = threshold;
  
  return `
    PREFIX schema: <https://schema.org/>
    PREFIX dotrep: <https://dotrep.io/ontology/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    
    SELECT ?recipient 
           (COUNT(?payment) as ?lowValuePaymentCount)
           (COUNT(DISTINCT ?payer) as ?uniquePayers)
           (SUM(?amount) as ?totalValue)
    WHERE {
      ?payment a schema:PaymentChargeSpecification ;
               schema:price ?amount ;
               schema:payee ?payerObj ;
               schema:recipient ?recipient ;
               prov:generatedAtTime ?timestamp .
      ?payerObj @id ?payer .
      
      FILTER(?amount <= ${maxAmount})
    }
    GROUP BY ?recipient
    HAVING (COUNT(DISTINCT ?payer) < ${minUniquePayers})
    ORDER BY DESC(?lowValuePaymentCount)
  `;
}

export default {
  FIND_RECENT_PAYMENT_EVIDENCE_QUERY,
  createFindPurchasesForSellerQuery,
  createFindPaymentEvidenceWithProvenanceQuery,
  createPaymentWeightedReputationQuery,
  createHighValuePurchaseQuery,
  createPaymentStatisticsQuery,
  createSybilPaymentDetectionQuery
};
