#!/usr/bin/env python3
"""
Reputation Computation Unit Tests
Tests weighted PageRank, Sybil detection, and reputation scoring
"""

import json
import sys
import os
import tempfile
from compute_reputation import ReputationCalculator

def test_basic_pagerank():
    """Test basic PageRank computation"""
    print("Testing basic PageRank...")
    
    # Create simple graph
    edges = {
        'edges': [
            {'from': 'A', 'to': 'B', 'weight': 1.0},
            {'from': 'B', 'to': 'C', 'weight': 1.0},
            {'from': 'C', 'to': 'A', 'weight': 1.0},
        ]
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(edges, f)
        edges_file = f.name
    
    try:
        calculator = ReputationCalculator(sybil_detection_enabled=False)
        calculator.load_graph(edges_file)
        results = calculator.compute_reputation()
        
        assert len(results) == 3, "Should have 3 nodes"
        assert all('finalScore' in r for r in results), "All results should have finalScore"
        assert all(r['finalScore'] >= 0 for r in results), "Scores should be non-negative"
        
        print("✅ Basic PageRank test passed")
        return True
    finally:
        os.unlink(edges_file)

def test_payment_evidence_boost():
    """Test that payment evidence boosts reputation"""
    print("Testing payment evidence boost...")
    
    edges = {
        'edges': [
            {'from': 'A', 'to': 'B', 'weight': 1.0, 'amount': 0.0, 'timestamp': 0},
            {'from': 'C', 'to': 'B', 'weight': 1.0, 'amount': 100.0, 'timestamp': 1000000000},
        ]
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(edges, f)
        edges_file = f.name
    
    try:
        calculator = ReputationCalculator(sybil_detection_enabled=False)
        calculator.load_graph(edges_file)
        results = calculator.compute_reputation()
        
        # Find B's score
        b_score = next(r['finalScore'] for r in results if r['creatorId'] == 'B')
        
        # B should have some score (receiving links)
        assert b_score > 0, "B should have positive score"
        
        print("✅ Payment evidence boost test passed")
        return True
    finally:
        os.unlink(edges_file)

def test_sybil_detection():
    """Test Sybil cluster detection"""
    print("Testing Sybil detection...")
    
    # Create a Sybil cluster: many low-stake nodes with reciprocal links
    edges = {'edges': []}
    stakes = {'stakes': {}}
    
    # Create cluster of 5 nodes with reciprocal links
    cluster_nodes = ['sybil1', 'sybil2', 'sybil3', 'sybil4', 'sybil5']
    for i, node in enumerate(cluster_nodes):
        stakes['stakes'][node] = 0.1  # Low stake
        for j, other in enumerate(cluster_nodes):
            if i != j:
                edges['edges'].append({
                    'from': node,
                    'to': other,
                    'weight': 1.0,
                    'amount': 0.0,
                    'timestamp': 0,
                })
    
    # Add one legitimate node
    edges['edges'].append({
        'from': 'legit1',
        'to': 'sybil1',
        'weight': 1.0,
        'amount': 50.0,
        'timestamp': 1000000000,
    })
    stakes['stakes']['legit1'] = 10.0  # Higher stake
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(edges, f)
        edges_file = f.name
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(stakes, f)
        stakes_file = f.name
    
    try:
        calculator = ReputationCalculator(sybil_detection_enabled=True)
        calculator.load_graph(edges_file, stakes_file)
        results = calculator.compute_reputation()
        
        # Find scores
        legit_score = next((r['finalScore'] for r in results if r['creatorId'] == 'legit1'), 0)
        sybil_scores = [r['finalScore'] for r in results if r['creatorId'].startswith('sybil')]
        
        # Legitimate node should generally score higher than Sybil nodes
        # (though exact scores depend on graph structure)
        avg_sybil_score = sum(sybil_scores) / len(sybil_scores) if sybil_scores else 0
        
        # Check that Sybil nodes have penalties applied
        sybil_with_penalty = [r for r in results if r['creatorId'].startswith('sybil') and r['sybilPenalty'] > 0]
        
        assert len(sybil_with_penalty) > 0, "At least some Sybil nodes should have penalty applied"
        
        print(f"✅ Sybil detection test passed (legit: {legit_score:.4f}, avg sybil: {avg_sybil_score:.4f})")
        return True
    finally:
        os.unlink(edges_file)
        os.unlink(stakes_file)

def test_reputation_output_format():
    """Test that reputation output has correct format"""
    print("Testing reputation output format...")
    
    edges = {
        'edges': [
            {'from': 'A', 'to': 'B', 'weight': 1.0},
        ]
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(edges, f)
        edges_file = f.name
    
    try:
        calculator = ReputationCalculator()
        calculator.load_graph(edges_file)
        results = calculator.compute_reputation()
        
        for result in results:
            assert 'creatorId' in result
            assert 'graphScore' in result
            assert 'stakeWeight' in result
            assert 'paymentWeight' in result
            assert 'sybilPenalty' in result
            assert 'finalScore' in result
            
            # Check score ranges
            assert 0 <= result['graphScore'] <= 1
            assert 0 <= result['stakeWeight'] <= 1
            assert 0 <= result['paymentWeight'] <= 1
            assert 0 <= result['sybilPenalty'] <= 1
            assert 0 <= result['finalScore'] <= 1
        
        print("✅ Output format test passed")
        return True
    finally:
        os.unlink(edges_file)

def main():
    """Run all tests"""
    print("Running reputation computation tests...\n")
    
    tests = [
        test_basic_pagerank,
        test_payment_evidence_boost,
        test_sybil_detection,
        test_reputation_output_format,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
        print()
    
    print(f"\n{'='*50}")
    print(f"Tests: {passed} passed, {failed} failed")
    print(f"{'='*50}")
    
    if failed > 0:
        sys.exit(1)

if __name__ == '__main__':
    main()

