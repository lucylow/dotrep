#!/usr/bin/env python3
"""
Enhanced PageRank Implementation
Implements advanced graph ranking algorithms with temporal weighting, fairness,
and robustness features based on recent research (2018-2025).

Features:
- Temporal PageRank (UWUSRank-like): Recency-weighted ranking
- Weighted edges: Endorsement strength, stake, payments
- Sensitivity auditing: Detect which edges most influence rankings
- Fairness adjustments: Mitigate bias and inequality
- Hybrid scoring: Combine graph structure + economic signals + verification
"""

import networkx as nx
from typing import Dict, List, Tuple, Optional, Any, Set
from datetime import datetime, timedelta
import numpy as np
from collections import defaultdict
import json


class TemporalPageRank:
    """
    Temporal PageRank implementation inspired by UWUSRank
    Incorporates recency, activity, and interaction strength
    """
    
    def __init__(
        self,
        alpha: float = 0.85,
        recency_decay: float = 0.95,  # Decay factor per day
        activity_weight: float = 0.3,  # Weight for user activity
        max_iter: int = 100,
        tol: float = 1e-6
    ):
        self.alpha = alpha
        self.recency_decay = recency_decay
        self.activity_weight = activity_weight
        self.max_iter = max_iter
        self.tol = tol
    
    def compute(
        self,
        graph: nx.DiGraph,
        edge_timestamps: Optional[Dict[Tuple[str, str], datetime]] = None,
        node_activity: Optional[Dict[str, float]] = None
    ) -> Dict[str, float]:
        """
        Compute temporal PageRank with recency weighting
        
        Args:
            graph: NetworkX directed graph
            edge_timestamps: Optional dict mapping (source, target) -> timestamp
            node_activity: Optional dict mapping node -> activity score (0-1)
        
        Returns:
            Dict mapping node -> PageRank score
        """
        if graph.number_of_nodes() == 0:
            return {}
        
        # Calculate recency weights for edges
        now = datetime.now()
        edge_weights = {}
        
        for u, v in graph.edges():
            base_weight = graph[u][v].get('weight', 1.0)
            
            # Apply recency decay if timestamps available
            if edge_timestamps and (u, v) in edge_timestamps:
                days_old = (now - edge_timestamps[(u, v)]).days
                recency_factor = self.recency_decay ** days_old
                base_weight *= recency_factor
            
            # Apply activity weighting if available
            if node_activity and u in node_activity:
                activity_boost = 1.0 + (node_activity[u] * self.activity_weight)
                base_weight *= activity_boost
            
            edge_weights[(u, v)] = base_weight
        
        # Create weighted graph
        G_weighted = nx.DiGraph()
        G_weighted.add_nodes_from(graph.nodes())
        for (u, v), weight in edge_weights.items():
            G_weighted.add_edge(u, v, weight=weight)
        
        # Compute PageRank with weights
        try:
            pagerank = nx.pagerank(
                G_weighted,
                alpha=self.alpha,
                max_iter=self.max_iter,
                tol=self.tol,
                weight='weight'
            )
        except Exception as e:
            print(f"PageRank computation error: {e}")
            # Fallback to uniform scores
            n = graph.number_of_nodes()
            return {node: 1.0 / n for node in graph.nodes()}
        
        return pagerank


class WeightedHybridPageRank:
    """
    Hybrid PageRank that combines:
    - Graph structure (PageRank)
    - Economic signals (stake, payments)
    - Content verification (Guardian scores)
    - Temporal signals (recency)
    """
    
    def __init__(
        self,
        graph_weight: float = 0.4,
        economic_weight: float = 0.3,
        verification_weight: float = 0.2,
        temporal_weight: float = 0.1,
        alpha: float = 0.85
    ):
        self.graph_weight = graph_weight
        self.economic_weight = economic_weight
        self.verification_weight = verification_weight
        self.temporal_weight = temporal_weight
        self.alpha = alpha
        
        # Ensure weights sum to 1.0
        total = graph_weight + economic_weight + verification_weight + temporal_weight
        if abs(total - 1.0) > 0.01:
            # Normalize
            self.graph_weight /= total
            self.economic_weight /= total
            self.verification_weight /= total
            self.temporal_weight /= total
    
    def compute(
        self,
        graph: nx.DiGraph,
        pagerank_scores: Dict[str, float],
        economic_signals: Optional[Dict[str, Dict[str, float]]] = None,
        verification_scores: Optional[Dict[str, float]] = None,
        temporal_scores: Optional[Dict[str, float]] = None
    ) -> Dict[str, float]:
        """
        Compute hybrid reputation score
        
        Args:
            graph: NetworkX directed graph
            pagerank_scores: Base PageRank scores
            economic_signals: Dict mapping node -> {stake, payments, transactions}
            verification_scores: Dict mapping node -> verification score (0-1)
            temporal_scores: Dict mapping node -> temporal activity score (0-1)
        
        Returns:
            Dict mapping node -> hybrid reputation score
        """
        hybrid_scores = {}
        
        # Normalize PageRank scores to [0, 1]
        max_pr = max(pagerank_scores.values()) if pagerank_scores else 1.0
        normalized_pr = {
            node: score / max_pr if max_pr > 0 else 0.0
            for node, score in pagerank_scores.items()
        }
        
        for node in graph.nodes():
            # Graph component
            graph_score = normalized_pr.get(node, 0.0)
            
            # Economic component
            economic_score = 0.0
            if economic_signals and node in economic_signals:
                signals = economic_signals[node]
                stake = signals.get('stake', 0.0)
                payments = signals.get('payments', 0.0)
                transactions = signals.get('transactions', 0.0)
                
                # Normalize and combine economic signals
                economic_score = min(1.0, (
                    min(1.0, stake / 1000.0) * 0.5 +  # Stake normalized to 1000
                    min(1.0, payments / 100.0) * 0.3 +  # Payments normalized to 100
                    min(1.0, transactions / 50.0) * 0.2  # Transactions normalized to 50
                ))
            
            # Verification component
            verification_score = verification_scores.get(node, 0.5) if verification_scores else 0.5
            
            # Temporal component
            temporal_score = temporal_scores.get(node, 0.5) if temporal_scores else 0.5
            
            # Combine all components
            hybrid_score = (
                graph_score * self.graph_weight +
                economic_score * self.economic_weight +
                verification_score * self.verification_weight +
                temporal_score * self.temporal_weight
            )
            
            hybrid_scores[node] = min(1.0, max(0.0, hybrid_score))
        
        return hybrid_scores


class PageRankAuditor:
    """
    Auditing tool inspired by AURORA: Auditing PageRank on Large Graphs
    Identifies which edges most influence rankings and detects sensitivity
    """
    
    def __init__(self, graph: nx.DiGraph, pagerank_scores: Dict[str, float]):
        self.graph = graph.copy()
        self.original_scores = pagerank_scores.copy()
        self.edge_influence: Dict[Tuple[str, str], float] = {}
    
    def compute_edge_influence(
        self,
        top_k: int = 50,
        sample_size: Optional[int] = None
    ) -> Dict[Tuple[str, str], float]:
        """
        Compute influence score for each edge
        Influence = change in target node's rank when edge is removed
        
        Args:
            top_k: Number of top edges to analyze
            sample_size: Optional limit on edges to sample (for performance)
        
        Returns:
            Dict mapping (source, target) -> influence score
        """
        edges_to_test = list(self.graph.edges())
        
        # Sample edges if needed
        if sample_size and len(edges_to_test) > sample_size:
            import random
            edges_to_test = random.sample(edges_to_test, sample_size)
        
        influence_scores = {}
        
        for u, v in edges_to_test:
            # Temporarily remove edge
            weight = self.graph[u][v].get('weight', 1.0)
            self.graph.remove_edge(u, v)
            
            # Recompute PageRank
            try:
                new_scores = nx.pagerank(self.graph, alpha=0.85, max_iter=50)
                
                # Calculate influence as change in target node's score
                original_score = self.original_scores.get(v, 0.0)
                new_score = new_scores.get(v, 0.0)
                influence = abs(original_score - new_score)
                
                influence_scores[(u, v)] = influence
            except Exception as e:
                print(f"Error computing influence for edge ({u}, {v}): {e}")
                influence_scores[(u, v)] = 0.0
            finally:
                # Restore edge
                self.graph.add_edge(u, v, weight=weight)
        
        # Sort by influence and return top_k
        sorted_edges = sorted(influence_scores.items(), key=lambda x: x[1], reverse=True)
        self.edge_influence = dict(sorted_edges[:top_k])
        
        return self.edge_influence
    
    def detect_sensitive_nodes(
        self,
        threshold: float = 0.01
    ) -> List[Tuple[str, float]]:
        """
        Detect nodes whose rankings are highly sensitive to edge changes
        
        Args:
            threshold: Minimum influence score to consider sensitive
        
        Returns:
            List of (node, sensitivity_score) tuples
        """
        if not self.edge_influence:
            self.compute_edge_influence()
        
        node_sensitivity = defaultdict(float)
        
        for (u, v), influence in self.edge_influence.items():
            if influence >= threshold:
                # Both source and target nodes are affected
                node_sensitivity[v] += influence
                node_sensitivity[u] += influence * 0.5  # Source less affected
        
        # Sort by sensitivity
        sensitive_nodes = sorted(
            node_sensitivity.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return sensitive_nodes
    
    def generate_explanation(
        self,
        node: str,
        top_k_edges: int = 5
    ) -> Dict[str, Any]:
        """
        Generate explainability report for a node's ranking
        
        Args:
            node: Node to explain
            top_k_edges: Number of most influential edges to include
        
        Returns:
            Explanation dict with key factors
        """
        if not self.edge_influence:
            self.compute_edge_influence()
        
        # Find edges affecting this node
        affecting_edges = [
            ((u, v), influence)
            for (u, v), influence in self.edge_influence.items()
            if v == node or u == node
        ]
        
        affecting_edges.sort(key=lambda x: x[1], reverse=True)
        top_edges = affecting_edges[:top_k_edges]
        
        # Calculate incoming/outgoing influence
        incoming_influence = sum(
            influence for ((u, v), influence) in top_edges if v == node
        )
        outgoing_influence = sum(
            influence for ((u, v), influence) in top_edges if u == node
        )
        
        return {
            'node': node,
            'original_score': self.original_scores.get(node, 0.0),
            'top_influencing_edges': [
                {
                    'source': u,
                    'target': v,
                    'influence': influence
                }
                for ((u, v), influence) in top_edges
            ],
            'incoming_influence': incoming_influence,
            'outgoing_influence': outgoing_influence,
            'sensitivity_score': incoming_influence + outgoing_influence
        }


class FairnessAdjuster:
    """
    Fairness adjustments to mitigate bias and inequality in rankings
    Based on research on inequality in network-based ranking
    """
    
    def __init__(
        self,
        minority_boost: float = 0.1,  # Boost for underrepresented nodes
        damping_factor: float = 0.9,  # Damping to reduce rich-get-richer
        min_score_floor: float = 0.01  # Minimum score floor
    ):
        self.minority_boost = minority_boost
        self.damping_factor = damping_factor
        self.min_score_floor = min_score_floor
    
    def adjust_for_fairness(
        self,
        scores: Dict[str, float],
        node_labels: Optional[Dict[str, str]] = None,  # e.g., {'node1': 'minority', 'node2': 'majority'}
        degree_threshold: int = 5  # Nodes with degree < threshold considered "minority"
    ) -> Dict[str, float]:
        """
        Apply fairness adjustments to scores
        
        Args:
            scores: Original scores
            node_labels: Optional labels for nodes (minority/majority)
            degree_threshold: Degree threshold for identifying low-connectivity nodes
        
        Returns:
            Adjusted scores
        """
        adjusted = scores.copy()
        
        # Identify minority/low-connectivity nodes
        if node_labels:
            minority_nodes = {
                node for node, label in node_labels.items()
                if label == 'minority' or label == 'low_connectivity'
            }
        else:
            # Use degree as proxy
            minority_nodes = set()  # Would need graph to compute
        
        # Apply damping to reduce rich-get-richer effect
        max_score = max(adjusted.values()) if adjusted else 1.0
        for node in adjusted:
            # Dampen very high scores
            if adjusted[node] > max_score * 0.5:
                adjusted[node] *= self.damping_factor
        
        # Boost minority nodes
        for node in minority_nodes:
            if node in adjusted:
                adjusted[node] = min(1.0, adjusted[node] * (1.0 + self.minority_boost))
        
        # Apply minimum floor
        for node in adjusted:
            adjusted[node] = max(self.min_score_floor, adjusted[node])
        
        # Renormalize to preserve relative ordering while ensuring fairness
        total = sum(adjusted.values())
        if total > 0:
            adjusted = {node: score / total for node, score in adjusted.items()}
        
        return adjusted
    
    def detect_bias(
        self,
        scores: Dict[str, float],
        node_groups: Dict[str, str]  # node -> group label
    ) -> Dict[str, Any]:
        """
        Detect bias in rankings across groups
        
        Args:
            scores: Node scores
            node_groups: Mapping of node -> group label
        
        Returns:
            Bias analysis report
        """
        group_scores = defaultdict(list)
        
        for node, score in scores.items():
            if node in node_groups:
                group_scores[node_groups[node]].append(score)
        
        group_stats = {}
        for group, group_score_list in group_scores.items():
            if group_score_list:
                group_stats[group] = {
                    'mean': np.mean(group_score_list),
                    'median': np.median(group_score_list),
                    'std': np.std(group_score_list),
                    'count': len(group_score_list),
                    'max': max(group_score_list),
                    'min': min(group_score_list)
                }
        
        # Calculate inequality metrics
        overall_mean = np.mean(list(scores.values()))
        inequality_metrics = {}
        
        for group, stats in group_stats.items():
            inequality_metrics[group] = {
                'relative_mean': stats['mean'] / overall_mean if overall_mean > 0 else 0.0,
                'representation_ratio': stats['count'] / len(scores) if scores else 0.0
            }
        
        return {
            'group_statistics': group_stats,
            'inequality_metrics': inequality_metrics,
            'overall_mean': overall_mean
        }


def compute_enhanced_reputation(
    graph: nx.DiGraph,
    edge_timestamps: Optional[Dict[Tuple[str, str], datetime]] = None,
    node_activity: Optional[Dict[str, float]] = None,
    economic_signals: Optional[Dict[str, Dict[str, float]]] = None,
    verification_scores: Optional[Dict[str, float]] = None,
    enable_fairness: bool = True,
    enable_auditing: bool = False,
    node_labels: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Comprehensive reputation computation with all enhancements
    
    Args:
        graph: NetworkX directed graph
        edge_timestamps: Optional timestamps for edges
        node_activity: Optional activity scores for nodes
        economic_signals: Optional economic data (stake, payments, etc.)
        verification_scores: Optional content verification scores
        enable_fairness: Whether to apply fairness adjustments
        enable_auditing: Whether to compute edge influence
        node_labels: Optional labels for fairness analysis
    
    Returns:
        Comprehensive reputation results
    """
    results = {
        'timestamp': datetime.now().isoformat(),
        'node_count': graph.number_of_nodes(),
        'edge_count': graph.number_of_edges()
    }
    
    # 1. Compute temporal PageRank
    temporal_pr = TemporalPageRank()
    pagerank_scores = temporal_pr.compute(graph, edge_timestamps, node_activity)
    results['pagerank_scores'] = pagerank_scores
    
    # 2. Compute hybrid scores if economic/verification data available
    if economic_signals or verification_scores:
        hybrid_pr = WeightedHybridPageRank()
        temporal_scores = node_activity if node_activity else None
        hybrid_scores = hybrid_pr.compute(
            graph,
            pagerank_scores,
            economic_signals,
            verification_scores,
            temporal_scores
        )
        results['hybrid_scores'] = hybrid_scores
        results['final_scores'] = hybrid_scores
    else:
        results['final_scores'] = pagerank_scores
    
    # 3. Apply fairness adjustments
    if enable_fairness:
        fairness_adjuster = FairnessAdjuster()
        adjusted_scores = fairness_adjuster.adjust_for_fairness(
            results['final_scores'],
            node_labels
        )
        results['fairness_adjusted_scores'] = adjusted_scores
        results['final_scores'] = adjusted_scores
        
        # Detect bias if groups provided
        if node_labels:
            bias_report = fairness_adjuster.detect_bias(
                results['final_scores'],
                node_labels
            )
            results['bias_analysis'] = bias_report
    
    # 4. Auditing (if enabled)
    if enable_auditing:
        auditor = PageRankAuditor(graph, pagerank_scores)
        edge_influence = auditor.compute_edge_influence(top_k=50)
        sensitive_nodes = auditor.detect_sensitive_nodes()
        
        results['auditing'] = {
            'edge_influence': {
                f"{u}->{v}": influence
                for (u, v), influence in edge_influence.items()
            },
            'sensitive_nodes': [
                {'node': node, 'sensitivity': score}
                for node, score in sensitive_nodes[:20]
            ]
        }
    
    # 5. Top ranked nodes
    sorted_nodes = sorted(
        results['final_scores'].items(),
        key=lambda x: x[1],
        reverse=True
    )
    results['top_ranked'] = [
        {'node': node, 'score': score}
        for node, score in sorted_nodes[:20]
    ]
    
    return results

