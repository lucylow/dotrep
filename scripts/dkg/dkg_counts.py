#!/usr/bin/env python3
"""
dkg_counts.py
- Runs SPARQL COUNT queries against the OriginTrail DKG
- Provides summary statistics about available data
- Helps determine dataset size for reputation computation
"""

import requests
import json
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ENDPOINT = os.getenv("DKG_SPARQL_ENDPOINT", "https://euphoria.origin-trail.network/dkg-sparql-query")
HEADERS = {"Content-Type": "application/json"}

QUERIES = {
  "creatorCount": """PREFIX schema: <https://schema.org/> PREFIX foaf: <http://xmlns.com/foaf/0.1/> PREFIX prov: <http://www.w3.org/ns/prov#> SELECT (COUNT(DISTINCT ?creator) AS ?creatorCount) WHERE { ?creator a schema:Person, foaf:Person, prov:Agent . }""",
  "postCount": """PREFIX schema: <https://schema.org/> SELECT (COUNT(DISTINCT ?post) AS ?postCount) WHERE { ?post a schema:SocialMediaPosting . }""",
  "observationCount": """PREFIX schema: <https://schema.org/> PREFIX prov: <http://www.w3.org/ns/prov#> SELECT (COUNT(?obs) AS ?observationCount) WHERE { ?obs a prov:Entity, schema:Observation . }""",
  "creatorsByPlatform": """PREFIX schema: <https://schema.org/> SELECT ?platform (COUNT(DISTINCT ?creator) AS ?count) WHERE { ?creator a schema:Person . ?creator schema:identifier ?idObj . ?idObj schema:propertyID "platform" ; schema:value ?platform . } GROUP BY ?platform ORDER BY DESC(?count)"""
}

def run_query(q):
    """Execute a SPARQL query and return results."""
    r = requests.post(ENDPOINT, headers=HEADERS, json={"query": q}, timeout=60)
    r.raise_for_status()
    j = r.json()
    if not j.get("success", True):
        raise RuntimeError("SPARQL endpoint error: %s" % j)
    # Handle different response formats
    if "data" in j:
        if isinstance(j["data"], dict) and "data" in j["data"]:
            return j["data"]["data"]
        elif isinstance(j["data"], list):
            return j["data"]
    return j.get("data", [])

def main():
    print("=" * 60)
    print("OriginTrail DKG Data Scan")
    print("=" * 60)
    print(f"Endpoint: {ENDPOINT}\n")
    
    results = {}
    for key, q in QUERIES.items():
        print(f"Running: {key}...", end=" ")
        try:
            data = run_query(q)
            results[key] = data
            print("✓")
        except Exception as e:
            print(f"✗ Error: {e}")
            results[key] = None
    
    # Pretty print counts
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if results.get("creatorCount") and len(results["creatorCount"]) > 0:
        c = results["creatorCount"][0].get("creatorCount")
        print(f"Creators (distinct): {c}")
        if c and int(c) < 100:
            print("  ⚠ Warning: Low creator count. You may need to import additional data.")
        elif c and int(c) > 10000:
            print("  ✓ Large dataset available. Consider sampling for faster iteration.")
    
    if results.get("postCount") and len(results["postCount"]) > 0:
        p = results["postCount"][0].get("postCount")
        print(f"Posts (distinct): {p}")
        if p and int(p) > 1000:
            print("  ✓ Rich content dataset available.")
    
    if results.get("observationCount") and len(results["observationCount"]) > 0:
        o = results["observationCount"][0].get("observationCount")
        print(f"Observations: {o}")
        if o and int(o) > 5000:
            print("  ✓ Good temporal granularity for Sybil detection.")
    
    if results.get("creatorsByPlatform") and len(results["creatorsByPlatform"]) > 0:
        print("\nCreators by platform:")
        for row in results["creatorsByPlatform"]:
            platform = row.get("platform", "unknown")
            count = row.get("count", 0)
            print(f"  - {platform}: {count}")
    
    print("\n" + "=" * 60)
    print("Next Steps:")
    print("=" * 60)
    print("1. If creator count is low, consider importing social graph data")
    print("2. Run compute_and_publish_reps.py to compute PageRank reputation")
    print("3. Adjust LIMIT values in SPARQL queries based on dataset size")
    print("=" * 60)

if __name__ == "__main__":
    main()

