#!/usr/bin/env python3
"""
compute_and_publish_reps.py
- Queries the OriginTrail DKG SPARQL endpoint for creators and edges
- Builds a NetworkX DiGraph, computes PageRank (optionally weighted)
- Emits a JSON-LD Reputation Asset per creator
- Optionally POSTs the JSON-LD to a user-specified PUBLISH_URL (Edge Node publish API)
"""

import requests
import json
import time
from collections import defaultdict
import networkx as nx
from uuid import uuid4
from datetime import datetime, timezone
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# -------- CONFIG ------------
SPARQL_ENDPOINT = os.getenv("DKG_SPARQL_ENDPOINT", "https://euphoria.origin-trail.network/dkg-sparql-query")
# If you have a DKG Edge Node publish endpoint, set it here. If empty, script will skip publish.
PUBLISH_URL = os.getenv("DKG_PUBLISH_URL", "")  # e.g. "https://your-edge-node.example/api/publish-knowledge-asset"
PUBLISH_API_KEY = os.getenv("DKG_PUBLISH_API_KEY", "")  # if your edge-node requires API key, put here
# -----------------------------

HEADERS = {"Content-Type": "application/json"}

# small helper to run SPARQL
def run_sparql(query):
    """Execute a SPARQL query against the DKG endpoint."""
    resp = requests.post(SPARQL_ENDPOINT, headers=HEADERS, json={"query": query}, timeout=60)
    resp.raise_for_status()
    j = resp.json()
    if not j.get("success", True):
        raise RuntimeError("SPARQL error: %s" % j)
    # Handle different response formats
    if "data" in j:
        if isinstance(j["data"], dict) and "data" in j["data"]:
            return j["data"]["data"]
        elif isinstance(j["data"], list):
            return j["data"]
    return j.get("data", [])

# Query creators (reduced fields)
QUERY_CREATORS = """
PREFIX schema: <https://schema.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX prov: <http://www.w3.org/ns/prov#>

SELECT ?creator ?creatorId ?userId ?name WHERE {
  ?creator a schema:Person, foaf:Person, prov:Agent .
  OPTIONAL {
    ?creator schema:identifier ?creatorIdent .
    ?creatorIdent schema:propertyID "creatorId";
                  schema:value ?creatorId .
  }
  OPTIONAL {
    ?creator schema:identifier ?userIdent .
    ?userIdent schema:propertyID "userId";
              schema:value ?userId .
  }
  OPTIONAL { ?creator foaf:name ?name }
}
LIMIT 1000
"""

# Query edges
QUERY_EDGES = """
PREFIX schema: <https://schema.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX prov: <http://www.w3.org/ns/prov#>

SELECT ?from ?to ?edgeType ?connectionStrength WHERE {
  {
    ?obs a prov:Entity, schema:Observation ;
         schema:about ?about .
    ?obs foaf:knows ?person .
    ?person a foaf:Person ;
            schema:additionalProperty ?addProp .
    ?addProp schema:name "connectionStrength" ;
             schema:value ?connectionStrength .
    BIND(?about AS ?from)
    BIND(?person AS ?to)
    BIND("knows" AS ?edgeType)
  }
  UNION
  {
    ?edge a schema:Interaction ;
          schema:agent ?from ;
          schema:target ?to ;
          schema:interactionType ?it .
    FILTER(CONTAINS(LCASE(STR(?it)), "endorse") || CONTAINS(LCASE(STR(?it)), "recommend"))
    OPTIONAL {
      ?edge schema:additionalProperty ?ap .
      ?ap schema:name "strength" ;
          schema:value ?connectionStrength .
    }
    BIND("endorse" AS ?edgeType)
  }
}
LIMIT 20000
"""

def build_graph(creators_rows, edges_rows):
    """Build a NetworkX directed graph from SPARQL results."""
    G = nx.DiGraph()
    # add nodes
    for r in creators_rows:
        node = r.get("creator")
        if not node: continue
        G.add_node(node, creatorId=r.get("creatorId"), userId=r.get("userId"), name=r.get("name"))
    # add edges
    for e in edges_rows:
        src = e.get("from")
        dst = e.get("to")
        if not src or not dst: continue
        # default weight
        w = 1.0
        cs = e.get("connectionStrength")
        if cs:
            try:
                w = float(cs)
            except:
                w = 1.0
        # if nodes not present, still add them
        if not G.has_node(src): G.add_node(src)
        if not G.has_node(dst): G.add_node(dst)
        # increase existing weight if present
        if G.has_edge(src, dst):
            G[src][dst]['weight'] = G[src][dst].get('weight', 0.0) + w
        else:
            G.add_edge(src, dst, weight=w, edgeType=e.get("edgeType"))
    return G

def compute_pagerank(G, alpha=0.85, use_enhanced=True):
    """
    Compute PageRank on the graph, using weights if present.
    Optionally uses enhanced temporal PageRank if available.
    """
    # Try to use enhanced temporal PageRank if available
    if use_enhanced:
        try:
            import sys
            import os
            # Add services/reputation to path
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'reputation'))
            from enhanced_pagerank import TemporalPageRank
            
            temporal_pr = TemporalPageRank(alpha=alpha)
            return temporal_pr.compute(G)
        except ImportError:
            # Fall back to standard PageRank
            pass
    
    # Use weights if present
    if any('weight' in G[u][v] for u,v in G.edges()):
        pr = nx.pagerank(G, alpha=alpha, weight='weight')
    else:
        pr = nx.pagerank(G, alpha=alpha)
    return pr

def make_reputation_asset(creator_uri, pagerank_score, stake_weight=None, timestamp=None):
    """Generate a JSON-LD Reputation Asset for a creator."""
    if timestamp is None:
        timestamp = datetime.now(timezone.utc).isoformat()
    asset = {
      "@context": {
        "schema": "https://schema.org/",
        "prov": "http://www.w3.org/ns/prov#"
      },
      "@graph": [
        {
          "@type": "schema:Dataset",
          "@id": f"urn:rep:{uuid4()}",
          "schema:name": f"Reputation snapshot for {creator_uri}",
          "schema:datePublished": timestamp,
          "schema:about": {"@id": creator_uri},
          "schema:additionalProperty": [
            { "@type": "schema:PropertyValue", "schema:name":"pageRankScore", "schema:value": pagerank_score },
            { "@type": "schema:PropertyValue", "schema:name":"lastUpdated",   "schema:value": timestamp }
          ],
          "prov:wasDerivedFrom": [ { "@id": f"urn:calc:{uuid4()}" } ]
        }
      ]
    }
    if stake_weight is not None:
        asset["@graph"][0]["schema:additionalProperty"].append(
            {"@type":"schema:PropertyValue","schema:name":"stakeWeight","schema:value":stake_weight}
        )
    return asset

def publish_asset(json_ld):
    """Publish a JSON-LD asset to the DKG Edge Node."""
    if not PUBLISH_URL:
        print("[publish] PUBLISH_URL not set — skipping publish. Save JSON-LD locally instead.")
        return None
    headers = {"Content-Type":"application/ld+json"}
    if PUBLISH_API_KEY:
        headers["Authorization"] = f"Bearer {PUBLISH_API_KEY}"
    r = requests.post(PUBLISH_URL, headers=headers, json=json_ld, timeout=60)
    r.raise_for_status()
    return r.json()

def main():
    print("[*] fetching creators...")
    creators = run_sparql(QUERY_CREATORS)
    print(f" -> creators returned: {len(creators)}")

    print("[*] fetching edges...")
    edges = run_sparql(QUERY_EDGES)
    print(f" -> edges returned: {len(edges)}")

    G = build_graph(creators, edges)
    print(f"Graph nodes: {G.number_of_nodes()}, edges: {G.number_of_edges()}")

    print("[*] computing PageRank...")
    pr = compute_pagerank(G)

    # map to creators and generate assets
    outputs = []
    for node_uri, score in pr.items():
        node_meta = G.nodes.get(node_uri, {})
        creatorId = node_meta.get("creatorId")
        # try to read stake from node metadata if you stored it earlier (placeholder)
        stake_weight = node_meta.get("stakeWeight")
        asset = make_reputation_asset(node_uri, float(score), stake_weight)
        outputs.append((node_uri, score, asset))

    # show top 10
    top = sorted(outputs, key=lambda x: x[1], reverse=True)[:10]
    print("\nTop 10 creators by PageRank:")
    for uri,score,asset in top:
        print(f" - {uri} : {score:.6f}")

    # publish or store
    print("\n[*] Publishing reputation assets...")
    for uri, score, asset in outputs:
        # pretty print small summary
        print(f"Publishing reputation for {uri} score={score:.6f}")
        try:
            res = publish_asset(asset)
            if res is None:
                # write locally
                safe_uri = uri.split('/')[-1].replace(':', '_').replace('#', '_')
                fname = f"./reputation_{safe_uri}_{int(time.time())}.jsonld"
                with open(fname, "w") as fh:
                    json.dump(asset, fh, indent=2)
                print("  saved ->", fname)
            else:
                print("  publish response:", res)
        except Exception as exc:
            print("  publish failed:", exc)

if __name__ == "__main__":
    main()

