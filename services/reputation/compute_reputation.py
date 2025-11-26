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
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime
import numpy as np

# Try to import networkx
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False
    print("Warning: networkx not installed, using simplified graph computation")

# Import advanced components
try:
    from advanced_graph_analyzer import AdvancedGraphAnalyzer
    from enhanced_sybil_detector import EnhancedSybilDetector
    from guardian_integrator import GuardianIntegrator
    from reputation_engine import ReputationEngine
    from dkg_reputation_publisher import DKGReputationPublisher
    ADVANCED_AVAILABLE = True
except ImportError as e:
    ADVANCED_AVAILABLE = False
    print(f"Warning: Advanced components not available: {e}")
    print("Falling back to basic reputation computation")

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
    tol: float = 1e-6,
    edge_timestamps: Optional[Dict[Tuple[str, str], datetime]] = None,
    node_activity: Optional[Dict[str, float]] = None,
    use_enhanced: bool = True
) -> Dict[str, float]:
    """
    Compute weighted PageRank scores with optional temporal enhancements
    
    Args:
        nodes: List of node identifiers
        edges: List of (source, target, weight) tuples
        alpha: PageRank damping factor
        max_iter: Maximum iterations
        tol: Convergence tolerance
        edge_timestamps: Optional timestamps for edges (for temporal weighting)
        node_activity: Optional activity scores for nodes
        use_enhanced: Whether to use enhanced temporal PageRank
    """
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
    
    # Use enhanced temporal PageRank if available and requested
    if use_enhanced and edge_timestamps is not None:
        try:
            from enhanced_pagerank import TemporalPageRank
            temporal_pr = TemporalPageRank(alpha=alpha, max_iter=max_iter, tol=tol)
            return temporal_pr.compute(G, edge_timestamps, node_activity)
        except ImportError:
            print("Warning: enhanced_pagerank not available, using standard PageRank")
    
    pagerank = nx.pagerank(G, alpha=alpha, max_iter=max_iter, tol=tol, weight='weight')
    return pagerank


def compute_temporal_weighted_pagerank(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    alpha: float = 0.85,
    max_iter: int = 100,
    tol: float = 1e-6,
    temporal_decay: float = 0.1,
    recency_weight: float = 0.3
) -> Dict[str, float]:
    """
    Compute Temporal Weighted PageRank (UWUSRank-inspired)
    
    Accounts for:
    - Edge recency (recent interactions weighted higher)
    - Edge weights (endorsement strength, stake, payments)
    - Temporal decay for older edges
    
    Args:
        nodes: List of node dicts with 'id' and optional metadata
        edges: List of edge dicts with 'source', 'target', 'weight', 'timestamp', and optional metadata
        alpha: Damping factor (default: 0.85)
        max_iter: Maximum iterations (default: 100)
        tol: Convergence tolerance (default: 1e-6)
        temporal_decay: Decay factor for old edges (default: 0.1)
        recency_weight: Weight for recent activity (default: 0.3)
    
    Returns:
        Dict mapping node ID to PageRank score
    """
    import time
    
    if not NETWORKX_AVAILABLE:
        # Fallback to basic weighted PageRank
        node_ids = [n['id'] if isinstance(n, dict) else n for n in nodes]
        edge_tuples = [(e['source'], e['target'], e.get('weight', 1.0)) for e in edges]
        return compute_weighted_pagerank(node_ids, edge_tuples, alpha, max_iter, tol)
    
    G = nx.DiGraph()
    
    # Add nodes
    node_ids = []
    for node in nodes:
        node_id = node['id'] if isinstance(node, dict) else node
        node_ids.append(node_id)
        G.add_node(node_id, **({} if isinstance(node, dict) else {}))
    
    # Add edges with temporal and enhanced weights
    now = time.time() * 1000  # milliseconds
    max_age = 365 * 24 * 60 * 60 * 1000  # 1 year in ms
    
    for edge in edges:
        source = edge['source']
        target = edge['target']
        base_weight = edge.get('weight', 1.0)
        timestamp = edge.get('timestamp', now)
        
        # Calculate temporal decay
        age = now - timestamp
        age_in_years = age / max_age
        temporal_factor = np.exp(-temporal_decay * age_in_years)
        
        # Enhance weight based on metadata
        enhanced_weight = base_weight
        
        # Boost for stake-backed edges
        if edge.get('metadata', {}).get('stakeBacked'):
            enhanced_weight *= 1.2
        
        # Boost for payment-backed edges
        if edge.get('metadata', {}).get('paymentAmount'):
            payment_amount = edge['metadata']['paymentAmount']
            payment_boost = min(1, np.log(1 + payment_amount / 1000) / 10)
            enhanced_weight *= (1 + 0.15 * payment_boost)
        
        # Boost for verified endorsements
        if edge.get('metadata', {}).get('verified'):
            enhanced_weight *= 1.2
        
        # Apply temporal decay
        final_weight = enhanced_weight * (recency_weight + (1 - recency_weight) * temporal_factor)
        
        G.add_edge(source, target, weight=final_weight)
    
    # Compute PageRank
    pagerank = nx.pagerank(G, alpha=alpha, max_iter=max_iter, tol=tol, weight='weight')
    return pagerank


def detect_sybil_clusters(
    nodes: List[str],
    edges: List[Tuple[str, str, float]],
    pagerank_scores: Dict[str, float]
) -> Dict[str, float]:
    """
    Detect potential Sybil clusters and compute penalty scores
    
    Improved heuristic based on graph structure analysis:
    - High in-degree but low PageRank (z-score < -1)
    - Very high out-degree (potential spam)
    - Low reciprocity (many incoming but few outgoing)
    """
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
    
    # Compute statistics for z-score calculation
    scores_array = list(pagerank_scores.values())
    mean_score = np.mean(scores_array) if scores_array else 0
    std_score = np.std(scores_array) if len(scores_array) > 1 and scores_array else 1
    
    penalties = {}
    for node in nodes:
        in_degree = G.in_degree(node)
        out_degree = G.out_degree(node)
        score = pagerank_scores.get(node, 0)
        z_score = (score - mean_score) / std_score if std_score > 0 else 0
        
        sybil_probability = 0.0
        
        # Pattern 1: High in-degree but low PageRank (z-score < -1)
        if z_score < -1 and in_degree > 5:
            sybil_probability += 0.4
        
        # Pattern 2: Very high out-degree (potential spam)
        if out_degree > 20 and in_degree < 2:
            sybil_probability += 0.3
        
        # Pattern 3: Low reciprocity (many incoming but few outgoing)
        if in_degree > 10 and out_degree < 2:
            sybil_probability += 0.3
        
        penalties[node] = min(1.0, sybil_probability)
    
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
    sybil_penalties: Dict[str, float],
    quality_scores: Dict[str, float] = None,
    payment_scores: Dict[str, float] = None,
    weights: Dict[str, float] = None
) -> Dict[str, Dict[str, float]]:
    """
    Compute hybrid final reputation scores with all components
    
    Combines:
    - Graph structure (PageRank)
    - Stake weighting
    - Quality signals
    - Payment history
    - Sybil penalties
    
    Args:
        pagerank_scores: PageRank scores from graph algorithm
        stake_weights: Stake-based weights
        sybil_penalties: Sybil detection penalties
        quality_scores: Content/contribution quality scores (optional)
        payment_scores: Payment history scores (optional)
        weights: Custom weights for components (default: graph=0.5, quality=0.25, stake=0.15, payment=0.1)
    
    Returns:
        Dict mapping node ID to reputation breakdown
    """
    if quality_scores is None:
        quality_scores = {}
    if payment_scores is None:
        payment_scores = {}
    if weights is None:
        weights = {
            'graph': 0.5,
            'quality': 0.25,
            'stake': 0.15,
            'payment': 0.1
        }
    
    # Normalize PageRank scores to 0-1000 range
    pr_values = list(pagerank_scores.values())
    pr_min = min(pr_values) if pr_values else 0
    pr_max = max(pr_values) if pr_values else 1
    pr_range = pr_max - pr_min if pr_max > pr_min else 1
    
    results = {}
    all_final_scores = []
    
    for node in pagerank_scores:
        # Normalize graph score
        graph_score = pagerank_scores[node]
        normalized_graph_score = ((graph_score - pr_min) / pr_range) * 1000
        
        # Extract component scores
        stake_weight = stake_weights.get(node, 0.0)
        stake_score = min(1000, np.log(1 + stake_weight / 100) * 200) if stake_weight > 0 else 0
        
        quality_score = quality_scores.get(node, 0) * 10  # scale 0-100 to 0-1000
        payment_score = min(1000, np.log(1 + payment_scores.get(node, 0) / 1000) * 200) if payment_scores.get(node, 0) > 0 else 0
        
        sybil_penalty = sybil_penalties.get(node, 0.0)
        
        # Compute weighted hybrid score
        final_score = (
            normalized_graph_score * weights['graph'] +
            quality_score * weights['quality'] +
            stake_score * weights['stake'] +
            payment_score * weights['payment']
        )
        
        # Apply Sybil penalty
        final_score = final_score * (1.0 - sybil_penalty * 0.5)
        final_score = max(0.0, min(1000.0, final_score))  # Clamp to [0, 1000]
        
        all_final_scores.append(final_score)
        
        results[node] = {
            "reputationScore": final_score,
            "graphScore": normalized_graph_score,
            "qualityScore": quality_score,
            "stakeScore": stake_score,
            "paymentScore": payment_score,
            "stakeWeight": stake_weight,
            "sybilPenalty": sybil_penalty
        }
    
    # Compute percentiles
    all_final_scores.sort(reverse=True)
    for node, data in results.items():
        rank = next((i for i, score in enumerate(all_final_scores) if score <= data["reputationScore"]), len(all_final_scores))
        data["percentile"] = ((len(all_final_scores) - rank) / len(all_final_scores)) * 100
    
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
    parser.add_argument("--advanced", action="store_true", help="Use advanced multi-dimensional analysis")
    parser.add_argument("--demo", action="store_true", help="Run complete demo")
    
    args = parser.parse_args()
    
    if args.test:
        results = run_sybil_test()
        print(json.dumps(results, indent=2))
        return 0
    
    # Use advanced analysis if available and requested
    if args.advanced and ADVANCED_AVAILABLE:
        return run_advanced_analysis(args)
    
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


def run_advanced_analysis(args):
    """Run advanced multi-dimensional reputation analysis"""
    import networkx as nx
    
    print("🚀 Running Advanced Multi-Dimensional Reputation Analysis")
    print("=" * 60)
    
    # Load graph
    graph_data = load_graph(args.input)
    
    # Build NetworkX graph
    G = nx.DiGraph()
    for node in graph_data.get("nodes", []):
        if isinstance(node, dict):
            node_id = node.get("id")
            G.add_node(node_id, **{k: v for k, v in node.items() if k != "id"})
        else:
            G.add_node(node)
    
    for edge in graph_data.get("edges", []):
        if isinstance(edge, dict):
            source = edge.get("source")
            target = edge.get("target")
            weight = edge.get("weight", 1.0)
            G.add_edge(source, target, weight=weight)
    
    print(f"✓ Loaded graph: {len(G.nodes())} nodes, {len(G.edges())} edges")
    
    # Initialize components
    guardian = GuardianIntegrator(mock_mode=True)
    analyzer = AdvancedGraphAnalyzer(G, guardian)
    sybil_detector = EnhancedSybilDetector(G)
    analyzer.sybil_detector = sybil_detector
    reputation_engine = ReputationEngine(analyzer, guardian)
    
    # Get stake data
    stake_data_map = {}
    for node in graph_data.get("nodes", []):
        if isinstance(node, dict):
            node_id = node.get("id")
            stake = node.get("stake", 0.0)
            if stake > 0:
                stake_data_map[node_id] = {"stake_amount": stake}
    
    # Compute reputation for all nodes
    print(f"\nComputing reputation for {len(G.nodes())} nodes...")
    all_nodes = list(G.nodes())
    reputation_results = reputation_engine.batch_compute_reputation(all_nodes, stake_data_map=stake_data_map)
    
    print(f"✓ Computed reputation for {len(reputation_results)} users")
    
    # Prepare results
    formatted_results = {}
    for user_did, rep_data in reputation_results.items():
        formatted_results[user_did] = {
            "reputationScore": rep_data.get("final_reputation", 0.0),
            "graphScore": rep_data.get("component_scores", {}).get("structural", {}).get("combined", 0.0),
            "stakeWeight": rep_data.get("component_scores", {}).get("economic", {}).get("stake_score", 0.0),
            "sybilPenalty": rep_data.get("sybil_penalty", 0.0),
            "confidence": rep_data.get("confidence", 0.0),
            "riskLevel": rep_data.get("risk_factors", {}).get("risk_level", "unknown")
        }
    
    results = {
        "computed_at": str(Path(args.input).stat().st_mtime),
        "method": "advanced_multi_dimensional",
        "reputations": formatted_results,
        "summary": {
            "total_users": len(reputation_results),
            "avg_reputation": sum(r.get("final_reputation", 0) for r in reputation_results.values()) / len(reputation_results) if reputation_results else 0,
            "high_risk_users": sum(1 for r in reputation_results.values() if r.get("risk_factors", {}).get("overall_risk", 0) > 0.6)
        }
    }
    
    # Publish to DKG if requested
    if args.publish:
        print("\n📤 Publishing reputation snapshot to DKG...")
        dkg_publisher = DKGReputationPublisher()
        analysis_metadata = dkg_publisher.get_analysis_metadata(
            len(G.nodes()),
            reputation_results,
            sybil_detector._get_communities() if hasattr(sybil_detector, '_get_communities') else {}
        )
        snapshot_result = dkg_publisher.publish_reputation_snapshot(reputation_results, analysis_metadata)
        results["dkg_snapshot"] = snapshot_result
        print(f"✓ Published: {snapshot_result.get('ual', 'N/A')}")
    
    # Output results
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n✓ Results written to {args.output}")
    else:
        print("\n" + "=" * 60)
        print("RESULTS SUMMARY")
        print("=" * 60)
        print(json.dumps(results["summary"], indent=2))
        print(f"\nTop 5 Users by Reputation:")
        sorted_users = sorted(
            formatted_results.items(),
            key=lambda x: x[1]["reputationScore"],
            reverse=True
        )[:5]
        for user, data in sorted_users:
            print(f"  {user}: {data['reputationScore']:.3f} (risk: {data.get('riskLevel', 'unknown')})")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())

