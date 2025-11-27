#!/usr/bin/env python3
"""
Reputation Computation Service
Weighted PageRank with stake weighting, payment evidence, and Sybil heuristics
"""

import json
import sys
import argparse
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
import math

# Try to import networkx for PageRank, fallback to simple implementation
try:
    import networkx as nx
    HAS_NETWORKX = True
except ImportError:
    HAS_NETWORKX = False
    print("Warning: networkx not installed, using simple PageRank implementation")


class ReputationCalculator:
    """Calculate reputation scores using weighted PageRank and Sybil detection"""
    
    def __init__(self, sybil_detection_enabled: bool = True):
        self.sybil_detection_enabled = sybil_detection_enabled
        self.graph = defaultdict(lambda: {'edges': [], 'stake': 0.0, 'incoming': []})
        
    def load_graph(self, edges_file: str, stakes_file: Optional[str] = None):
        """Load graph from JSON or CSV file"""
        with open(edges_file, 'r') as f:
            if edges_file.endswith('.json'):
                data = json.load(f)
                edges = data.get('edges', [])
            else:
                # Assume CSV format: from,to,weight,amount,timestamp
                edges = []
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        parts = line.strip().split(',')
                        if len(parts) >= 2:
                            edge = {
                                'from': parts[0],
                                'to': parts[1],
                                'weight': float(parts[2]) if len(parts) > 2 else 1.0,
                                'amount': float(parts[3]) if len(parts) > 3 else 0.0,
                                'timestamp': int(parts[4]) if len(parts) > 4 else 0,
                            }
                            edges.append(edge)
        
        # Load stakes if provided
        stakes = {}
        if stakes_file:
            with open(stakes_file, 'r') as f:
                stakes_data = json.load(f)
                stakes = stakes_data.get('stakes', {})
        
        # Build graph
        for edge in edges:
            from_node = edge['from']
            to_node = edge['to']
            weight = edge.get('weight', 1.0)
            amount = edge.get('amount', 0.0)
            timestamp = edge.get('timestamp', 0)
            
            self.graph[from_node]['edges'].append({
                'to': to_node,
                'weight': weight,
                'amount': amount,
                'timestamp': timestamp,
            })
            self.graph[to_node]['incoming'].append({
                'from': from_node,
                'weight': weight,
                'amount': amount,
            })
            
            # Set stake if provided
            if from_node in stakes:
                self.graph[from_node]['stake'] = stakes[from_node]
            if to_node in stakes:
                self.graph[to_node]['stake'] = stakes[to_node]
    
    def compute_payment_evidence_score(self, amount: float, timestamp: int, current_time: int) -> float:
        """Compute payment evidence score with time decay"""
        if amount <= 0:
            return 0.0
        
        # Time decay: payments more recent are worth more
        age_days = (current_time - timestamp) / (24 * 3600) if timestamp > 0 else 0
        decay_factor = math.exp(-age_days / 365)  # Half-life of 1 year
        
        # Normalize amount (assuming max payment of 1000 units)
        amount_normalized = min(amount / 1000.0, 1.0)
        
        return amount_normalized * decay_factor
    
    def compute_weighted_pagerank(self, k: float = 0.1, max_iterations: int = 100, damping: float = 0.85) -> Dict[str, float]:
        """Compute weighted PageRank with payment evidence and stake weighting"""
        nodes = list(self.graph.keys())
        n = len(nodes)
        
        if n == 0:
            return {}
        
        # Initialize PageRank scores
        pr = {node: 1.0 / n for node in nodes}
        current_time = int(__import__('time').time())
        
        for iteration in range(max_iterations):
            new_pr = {}
            
            for node in nodes:
                # Base score from incoming links
                incoming_score = 0.0
                
                for incoming in self.graph[node]['incoming']:
                    from_node = incoming['from']
                    base_weight = incoming['weight']
                    
                    # Payment evidence boost
                    payment_score = self.compute_payment_evidence_score(
                        incoming['amount'],
                        incoming.get('timestamp', current_time),
                        current_time
                    )
                    
                    # Stake weighting
                    stake_normalized = min(self.graph[from_node]['stake'] / 100.0, 1.0) if self.graph[from_node]['stake'] > 0 else 0.1
                    
                    # Combined edge weight
                    edge_weight = base_weight * (1 + k * payment_score) * (1 + 0.5 * stake_normalized)
                    
                    # Normalize by outgoing edges of source
                    out_degree = len(self.graph[from_node]['edges'])
                    if out_degree > 0:
                        incoming_score += pr[from_node] * edge_weight / out_degree
                
                new_pr[node] = (1 - damping) / n + damping * incoming_score
            
            # Check convergence
            diff = sum(abs(new_pr[node] - pr[node]) for node in nodes)
            if diff < 1e-6:
                break
            
            pr = new_pr
        
        return pr
    
    def detect_sybil_clusters(self, pr_scores: Dict[str, float]) -> Dict[str, float]:
        """Detect dense clusters of low-stake nodes with high reciprocal links"""
        if not self.sybil_detection_enabled:
            return {}
        
        penalties = {}
        
        for node in self.graph:
            # Check for suspicious patterns
            incoming = self.graph[node]['incoming']
            outgoing = self.graph[node]['edges']
            stake = self.graph[node]['stake']
            
            # Low stake + many reciprocal links = suspicious
            reciprocal_count = 0
            for edge in outgoing:
                to_node = edge['to']
                # Check if there's a reciprocal link
                for inc in self.graph[to_node]['incoming']:
                    if inc['from'] == node:
                        reciprocal_count += 1
                        break
            
            # Sybil heuristic: low stake, high reciprocal links, dense cluster
            if stake < 1.0 and reciprocal_count > 3 and len(incoming) > 5:
                # Calculate cluster density
                cluster_nodes = set([node])
                for edge in outgoing:
                    cluster_nodes.add(edge['to'])
                
                if len(cluster_nodes) > 3:
                    # Apply penalty
                    penalty_factor = min(0.5, 1.0 - (stake / 10.0) * (reciprocal_count / 10.0))
                    penalties[node] = penalty_factor
        
        return penalties
    
    def compute_reputation(self) -> List[Dict]:
        """Compute final reputation scores for all nodes"""
        # Compute weighted PageRank
        pr_scores = self.compute_weighted_pagerank()
        
        # Normalize PageRank scores to [0, 1]
        max_pr = max(pr_scores.values()) if pr_scores else 1.0
        graph_scores = {node: score / max_pr if max_pr > 0 else 0.0 for node, score in pr_scores.items()}
        
        # Compute stake weights
        max_stake = max([self.graph[node]['stake'] for node in self.graph]) if self.graph else 1.0
        stake_weights = {
            node: min(self.graph[node]['stake'] / max_stake if max_stake > 0 else 0.0, 1.0)
            for node in self.graph
        }
        
        # Compute payment weights (aggregate payment evidence)
        current_time = int(__import__('time').time())
        payment_weights = {}
        for node in self.graph:
            total_payment_score = sum(
                self.compute_payment_evidence_score(edge['amount'], edge.get('timestamp', current_time), current_time)
                for edge in self.graph[node]['edges']
            )
            payment_weights[node] = min(total_payment_score / 10.0, 1.0)  # Normalize
        
        # Detect Sybil clusters
        sybil_penalties = self.detect_sybil_clusters(pr_scores)
        
        # Compute final scores
        results = []
        for node in self.graph:
            graph_score = graph_scores.get(node, 0.0)
            stake_weight = stake_weights.get(node, 0.0)
            payment_weight = payment_weights.get(node, 0.0)
            sybil_penalty = sybil_penalties.get(node, 0.0)
            
            # Final score: weighted combination with Sybil penalty
            final_score = (
                graph_score * 0.5 +
                stake_weight * 0.2 +
                payment_weight * 0.3
            ) * (1 - sybil_penalty)
            
            results.append({
                'creatorId': node,
                'graphScore': round(graph_score, 4),
                'stakeWeight': round(stake_weight, 4),
                'paymentWeight': round(payment_weight, 4),
                'sybilPenalty': round(sybil_penalty, 4),
                'finalScore': round(final_score, 4),
            })
        
        # Sort by final score
        results.sort(key=lambda x: x['finalScore'], reverse=True)
        
        return results


def main():
    parser = argparse.ArgumentParser(description='Compute reputation scores from graph data')
    parser.add_argument('edges_file', help='Path to edges file (JSON or CSV)')
    parser.add_argument('--stakes', help='Path to stakes file (JSON)', default=None)
    parser.add_argument('--output', help='Output file (JSON)', default='reputation_scores.json')
    parser.add_argument('--no-sybil', action='store_true', help='Disable Sybil detection')
    
    args = parser.parse_args()
    
    calculator = ReputationCalculator(sybil_detection_enabled=not args.no_sybil)
    calculator.load_graph(args.edges_file, args.stakes)
    
    results = calculator.compute_reputation()
    
    # Output results
    with open(args.output, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"✅ Computed reputation for {len(results)} creators")
    print(f"📊 Top 5 creators:")
    for i, result in enumerate(results[:5], 1):
        print(f"  {i}. {result['creatorId']}: {result['finalScore']:.4f} "
              f"(graph: {result['graphScore']:.4f}, "
              f"stake: {result['stakeWeight']:.4f}, "
              f"payment: {result['paymentWeight']:.4f}, "
              f"sybil: {result['sybilPenalty']:.4f})")
    
    if args.no_sybil:
        print("\n⚠️  Sybil detection was disabled")


if __name__ == '__main__':
    main()

