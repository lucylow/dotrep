#!/usr/bin/env python3
"""
Reputation Engine
Computes weighted PageRank with Sybil heuristics and publishes ReputationAsset JSON-LD
"""

import json
import argparse
import sys
import os
from pathlib import Path
from typing import Dict, List, Tuple, Any
import numpy as np

# Try to import networkx
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False
    print("Warning: networkx not installed, using simplified graph computation")

# Import publisher from ingest service
# Try multiple paths for flexibility
ingest_paths = [
    Path(__file__).parent.parent / "ingest",
    Path(__file__).parent.parent.parent / "services" / "ingest",
    Path("/app") / "ingest"  # Docker volume mount
]

publisher_available = False
for path in ingest_paths:
    if path.exists():
        sys.path.insert(0, str(path))
        try:
            from publish_sample_asset import create_reputation_asset, publish_to_edge_node
            publisher_available = True
            break
        except ImportError:
            continue

if not publisher_available:
    print("Warning: Could not import publisher, will only compute scores")
    # Define stub functions
    def create_reputation_asset(*args, **kwargs):
        raise NotImplementedError("Publisher not available")
    def publish_to_edge_node(*args, **kwargs):
        raise NotImplementedError("Publisher not available")


def load_graph(input_path: str) -> Dict[str, Any]:
    """Load graph from JSON file"""
    with open(input_path, 'r') as f:
        return json.load(f)


def compute_weighted_pagerank(
    nodes: List[str],
    edges: List[Tuple[str, str, float]],
    alpha: float = 0.25,
    max_iter: int = 100,
    tol: float = 1e-6
) -> Dict[str, float]:
    """Compute weighted PageRank scores"""
    if not NETWORKX_AVAILABLE:
        # Simplified computation without networkx
        scores = {node: 1.0 / len(nodes) for node in nodes}
        for _ in range(max_iter):
            new_scores = {node: (1 - alpha) / len(nodes) for node in nodes}
            for source, target, weight in edges:
                if source in scores:
                    new_scores[target] += alpha * scores[source] * weight
            if max(abs(new_scores[node] - scores[node]) for node in nodes) < tol:
                break
            scores = new_scores
        return scores
    
    # Use networkx for proper PageRank
    G = nx.DiGraph()
    G.add_nodes_from(nodes)
    for source, target, weight in edges:
        G.add_edge(source, target, weight=weight)
    
    pagerank = nx.pagerank(G, alpha=alpha, max_iter=max_iter, tol=tol, weight='weight')
    return pagerank


def detect_sybil_clusters(
    nodes: List[str],
    edges: List[Tuple[str, str, float]],
    pagerank_scores: Dict[str, float]
) -> Dict[str, float]:
    """Detect potential Sybil clusters and compute penalty scores"""
    # Simple heuristic: nodes with very low PageRank and high in-degree from low-reputation nodes
    if not NETWORKX_AVAILABLE:
        # Simplified: penalize nodes with very low scores
        penalties = {}
        min_score = min(pagerank_scores.values()) if pagerank_scores else 0
        for node in nodes:
            score = pagerank_scores.get(node, 0)
            if score < min_score * 2:  # Very low score
                penalties[node] = min(0.2, (min_score * 2 - score) * 0.1)
            else:
                penalties[node] = 0.0
        return penalties
    
    G = nx.DiGraph()
    G.add_nodes_from(nodes)
    for source, target, weight in edges:
        G.add_edge(source, target, weight=weight)
    
    penalties = {}
    for node in nodes:
        in_degree = G.in_degree(node)
        score = pagerank_scores.get(node, 0)
        
        # Heuristic: if node has many incoming edges but low PageRank, likely Sybil
        if in_degree > 5 and score < 0.01:
            penalties[node] = min(0.2, in_degree * 0.02)
        else:
            penalties[node] = 0.0
    
    return penalties


def apply_stake_weighting(
    pagerank_scores: Dict[str, float],
    stake_weights: Dict[str, float]
) -> Dict[str, float]:
    """Apply stake-based weighting to reputation scores"""
    weighted_scores = {}
    for node in pagerank_scores:
        base_score = pagerank_scores[node]
        stake_multiplier = stake_weights.get(node, 1.0)
        weighted_scores[node] = base_score * (1.0 + stake_multiplier * 0.1)
    return weighted_scores


def compute_final_reputation(
    pagerank_scores: Dict[str, float],
    stake_weights: Dict[str, float],
    sybil_penalties: Dict[str, float]
) -> Dict[str, Dict[str, float]]:
    """Compute final reputation scores with all components"""
    results = {}
    
    for node in pagerank_scores:
        graph_score = pagerank_scores[node]
        stake_weight = stake_weights.get(node, 0.0)
        sybil_penalty = sybil_penalties.get(node, 0.0)
        
        # Final score: graph score * (1 + stake boost) - sybil penalty
        final_score = graph_score * (1.0 + stake_weight * 0.1) - sybil_penalty
        final_score = max(0.0, min(1.0, final_score))  # Clamp to [0, 1]
        
        results[node] = {
            "reputationScore": final_score,
            "graphScore": graph_score,
            "stakeWeight": stake_weight,
            "sybilPenalty": sybil_penalty
        }
    
    return results


def run_sybil_test() -> Dict[str, float]:
    """Run synthetic Sybil injection test"""
    print("Running synthetic Sybil test...")
    
    # Create a small legitimate graph
    legitimate_nodes = [f"legit_{i}" for i in range(10)]
    legitimate_edges = [
        (f"legit_{i}", f"legit_{(i+1) % 10}", 1.0)
        for i in range(10)
    ]
    
    # Inject Sybil cluster
    sybil_nodes = [f"sybil_{i}" for i in range(20)]
    sybil_edges = [
        (f"sybil_{i}", f"sybil_{(i+1) % 20}", 1.0)
        for i in range(20)
    ]
    # Connect one Sybil to legitimate graph
    sybil_edges.append(("sybil_0", "legit_0", 0.1))
    
    all_nodes = legitimate_nodes + sybil_nodes
    all_edges = legitimate_edges + sybil_edges
    
    pagerank = compute_weighted_pagerank(all_nodes, all_edges)
    sybil_penalties = detect_sybil_clusters(all_nodes, all_edges, pagerank)
    
    # Count detected Sybils
    detected = sum(1 for node in sybil_nodes if sybil_penalties.get(node, 0) > 0.05)
    precision = detected / len(sybil_nodes) if sybil_nodes else 0.0
    
    print(f"Sybil detection precision: {precision:.2%} ({detected}/{len(sybil_nodes)})")
    
    return {"precision": precision, "detected": detected, "total": len(sybil_nodes)}


def main():
    parser = argparse.ArgumentParser(description="Compute reputation scores and publish ReputationAssets")
    parser.add_argument("--input", type=str, required=True, help="Input graph JSON file")
    parser.add_argument("--alpha", type=float, default=0.25, help="PageRank damping factor")
    parser.add_argument("--publish", action="store_true", help="Publish ReputationAssets to DKG")
    parser.add_argument("--edge-url", type=str, default=os.getenv("EDGE_PUBLISH_URL", "http://mock-dkg:8080"), help="Edge Node URL")
    parser.add_argument("--api-key", type=str, default=os.getenv("EDGE_API_KEY"), help="Edge Node API key")
    parser.add_argument("--simulate", action="store_true", help="Simulate publishing")
    parser.add_argument("--test", action="store_true", help="Run synthetic Sybil test")
    parser.add_argument("--output", type=str, help="Output file for results (JSON)")
    
    args = parser.parse_args()
    
    if args.test:
        results = run_sybil_test()
        print(json.dumps(results, indent=2))
        return 0
    
    # Load graph
    graph_data = load_graph(args.input)
    nodes = graph_data.get("nodes", [])
    edges = [(e["source"], e["target"], e.get("weight", 1.0)) for e in graph_data.get("edges", [])]
    stake_weights = {n["id"]: n.get("stake", 0.0) for n in nodes if isinstance(n, dict)}
    
    # Compute reputation
    print(f"Computing reputation for {len(nodes)} nodes...")
    pagerank_scores = compute_weighted_pagerank(nodes, edges, alpha=args.alpha)
    sybil_penalties = detect_sybil_clusters(nodes, edges, pagerank_scores)
    final_reputation = compute_final_reputation(pagerank_scores, stake_weights, sybil_penalties)
    
    # Output results
    results = {
        "computed_at": str(Path(args.input).stat().st_mtime),
        "alpha": args.alpha,
        "reputations": final_reputation
    }
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results written to {args.output}")
    else:
        print(json.dumps(results, indent=2))
    
    # Publish if requested
    if args.publish:
        print("\nPublishing ReputationAssets...")
        published = []
        for node_id, rep_data in final_reputation.items():
            try:
                asset = create_reputation_asset(
                    creator_id=node_id,
                    reputation_score=rep_data["reputationScore"],
                    graph_score=rep_data["graphScore"],
                    stake_weight=rep_data["stakeWeight"],
                    sybil_penalty=rep_data["sybilPenalty"],
                    alpha=args.alpha
                )
                
                result = publish_to_edge_node(
                    asset,
                    edge_url=args.edge_url,
                    api_key=args.api_key,
                    simulate=args.simulate
                )
                
                published.append({
                    "node": node_id,
                    "ual": result.get("ual"),
                    "simulated": result.get("simulated", False)
                })
                
                print(f"Published: {node_id} -> {result.get('ual')}")
            except Exception as e:
                print(f"Error publishing {node_id}: {e}", file=sys.stderr)
        
        print(f"\nPublished {len(published)} ReputationAssets")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())

