# DKG Integration Scripts

Python scripts for querying the OriginTrail DKG, computing reputation scores, and publishing Knowledge Assets.

## Overview

This directory contains:

- **`dkg_counts.py`** - Scan the DKG to get dataset statistics
- **`compute_and_publish_reps.py`** - Query creators/edges, compute PageRank, generate and publish reputation assets
- **`queries/`** - SPARQL query files for various data extraction tasks

## Prerequisites

```bash
pip install -r requirements.txt
```

## Environment Variables

Set these environment variables (or edit the scripts directly):

```bash
export DKG_SPARQL_ENDPOINT="https://euphoria.origin-trail.network/dkg-sparql-query"
export DKG_PUBLISH_URL=""  # Optional: your Edge Node publish endpoint
export DKG_PUBLISH_API_KEY=""  # Optional: API key for publish endpoint
```

## Usage

### 1. Scan DKG Data

First, check what data is available in the DKG:

```bash
python scripts/dkg/dkg_counts.py
```

This will show:
- Total creator count
- Total post count
- Total observation count
- Creators by platform

### 2. Compute and Publish Reputation

Run the reputation computation pipeline:

```bash
python scripts/dkg/compute_and_publish_reps.py
```

This script will:
1. Query creators from the DKG
2. Query social graph edges (endorsements, follows)
3. Build a NetworkX directed graph
4. Compute weighted PageRank scores
5. Generate JSON-LD Reputation Assets
6. Publish to DKG (if `DKG_PUBLISH_URL` is set) or save locally

### Output

If `DKG_PUBLISH_URL` is not set, reputation assets are saved locally as:
```
./reputation_{creator_id}_{timestamp}.jsonld
```

## SPARQL Queries

Individual SPARQL queries are stored in `queries/`:

- `01_creators.sparql` - Fetch creator profiles
- `02_edges.sparql` - Fetch social graph edges
- `03_posts.sparql` - Fetch post engagement metrics
- `04_observations.sparql` - Fetch temporal observations
- `05_count_creators.sparql` - Count creators
- `06_count_posts.sparql` - Count posts
- `07_count_observations.sparql` - Count observations
- `08_creators_by_platform.sparql` - Platform distribution

You can test these queries directly using curl:

```bash
curl -X POST "https://euphoria.origin-trail.network/dkg-sparql-query" \
  -H "Content-Type: application/json" \
  -d '{"query":"PREFIX schema: <https://schema.org/> SELECT (COUNT(DISTINCT ?creator) AS ?creatorCount) WHERE { ?creator a schema:Person . }"}'
```

## Reputation Asset Format

The generated JSON-LD follows the DKG Knowledge Asset schema:

```json
{
  "@context": {
    "schema": "https://schema.org/",
    "prov": "http://www.w3.org/ns/prov#"
  },
  "@graph": [
    {
      "@type": "schema:Dataset",
      "@id": "urn:rep:{uuid}",
      "schema:name": "Reputation snapshot for {creator_uri}",
      "schema:datePublished": "2025-11-26T00:00:00Z",
      "schema:about": {"@id": "{creator_uri}"},
      "schema:additionalProperty": [
        {
          "@type": "schema:PropertyValue",
          "schema:name": "pageRankScore",
          "schema:value": 0.0234
        },
        {
          "@type": "schema:PropertyValue",
          "schema:name": "lastUpdated",
          "schema:value": "2025-11-26T00:00:00Z"
        }
      ],
      "prov:wasDerivedFrom": [{"@id": "urn:calc:{uuid}"}]
    }
  ]
}
```

## Troubleshooting

### SPARQL Endpoint Errors

If you get timeout errors:
- Reduce `LIMIT` values in queries
- Query by platform or date range
- Check endpoint availability

### Empty Results

If queries return no data:
- Verify the DKG endpoint URL
- Check that data exists in the DKG (run `dkg_counts.py` first)
- Adjust SPARQL query patterns to match your data schema

### Publish Failures

If publishing fails:
- Verify `DKG_PUBLISH_URL` is correct
- Check API key if required
- Ensure JSON-LD format matches DKG schema requirements

## Next Steps

1. **Add Sybil Detection**: Extend `compute_and_publish_reps.py` to compute `sybilRiskScore` heuristics
2. **Temporal Analysis**: Use observation data to detect suspicious patterns
3. **Stake Weighting**: Integrate on-chain stake data for weighted reputation
4. **MCP Integration**: Connect reputation assets to MCP server for AI agent queries

## References

- [OriginTrail DKG Docs](https://docs.origintrail.io/)
- [DKG Social Graph Query Guide](https://docs.origintrail.io/contribute-to-the-dkg/hackathon-scaling-trust-in-the-age-of-ai/dkg-social-graph-query-guide)
- [JSON-LD Specification](https://json-ld.org/)

