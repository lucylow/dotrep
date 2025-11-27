#!/usr/bin/env python3
"""
Unit tests for Sybil detection
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from compute_reputation import (
    compute_weighted_pagerank,
    detect_sybil_clusters,
    compute_final_reputation
)


def test_sybil_detection():
    """Test Sybil detection with synthetic data"""
    # Create legitimate nodes
    legit_nodes = [f"legit_{i}" for i in range(10)]
    legit_edges = [
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
    
    all_nodes = legit_nodes + sybil_nodes
    all_edges = legit_edges + sybil_edges
    
    # Compute reputation
    pagerank = compute_weighted_pagerank(all_nodes, all_edges)
    sybil_penalties = detect_sybil_clusters(all_nodes, all_edges, pagerank)
    
    # Check detection
    detected_sybils = [node for node in sybil_nodes if sybil_penalties.get(node, 0) > 0.05]
    precision = len(detected_sybils) / len(sybil_nodes) if sybil_nodes else 0.0
    
    assert precision >= 0.5, f"Sybil detection precision {precision:.2%} below threshold 0.5"
    print(f"✓ Sybil detection test passed: {precision:.2%} precision")
    
    return precision


if __name__ == "__main__":
    precision = test_sybil_detection()
    print(f"Test passed with {precision:.2%} precision")

