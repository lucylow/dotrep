#!/usr/bin/env python3
"""
Advanced Graph Analyzer
Multi-dimensional reputation scoring with structural, behavioral, content quality, and economic analysis
"""

import networkx as nx
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
from collections import defaultdict, Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

try:
    import community.community_louvain as community_louvain
    LOUVAIN_AVAILABLE = True
except ImportError:
    LOUVAIN_AVAILABLE = False
    print("Warning: python-louvain not installed, using simplified community detection")


class AdvancedGraphAnalyzer:
    """Advanced graph analysis with multi-dimensional reputation scoring"""
    
    def __init__(self, graph: nx.DiGraph, guardian_integrator=None):
        """
        Initialize analyzer with graph and optional Guardian integrator
        
        Args:
            graph: NetworkX directed graph
            guardian_integrator: Optional GuardianIntegrator instance
        """
        self.graph = graph
        self.guardian_integrator = guardian_integrator
        self.sybil_detector = None  # Will be set externally
        self._cache = {}
        self._global_metrics_cache = None
        self._cache_timestamp = None
        self._cache_ttl = 3600  # Cache TTL in seconds (1 hour)
        self._batch_size = 500  # Default batch size for processing
        self._global_metrics_cache = None
        self._cache_timestamp = None
        self._cache_ttl = 3600  # Cache TTL in seconds (1 hour)
        self._batch_size = 500  # Default batch size for processing
        
    def compute_comprehensive_reputation(
        self, 
        user_did: str,
        stake_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Compute reputation using multiple graph algorithms
        
        Args:
            user_did: User identifier (DID or node ID)
            
        Returns:
            Comprehensive analysis results with scores, risks, and recommendations
        """
        if user_did not in self.graph:
            return self._empty_analysis(user_did)
        
        analysis_results = {
            "user": user_did,
            "timestamp": datetime.now().isoformat(),
            "scores": {},
            "risks": {},
            "recommendations": []
        }
        
        # 1. Structural Analysis (with trust weights if stake data provided)
        stake_weights = None
        reputation_weights = None
        if stake_data:
            stake_weights = {user_did: stake_data.get("stake_amount", 0.0)}
            # Get reputation weights from previous analysis if available
            if user_did in self._cache:
                cached_rep = self._cache[user_did].get("overall_reputation", 0.0)
                reputation_weights = {user_did: cached_rep}
        
        analysis_results["scores"]["structural"] = self.structural_analysis(
            user_did, 
            stake_weights=stake_weights,
            reputation_weights=reputation_weights
        )
        
        # 2. Behavioral Analysis
        analysis_results["scores"]["behavioral"] = self.behavioral_analysis(user_did)
        
        # 3. Content Quality Analysis (Umanitek Integration)
        analysis_results["scores"]["content_quality"] = self.content_quality_analysis(user_did)
        
        # 4. Economic Analysis (with stake data if provided)
        analysis_results["scores"]["economic"] = self.economic_analysis(
            user_did, 
            stake_data=stake_data
        )
        
        # 5. Temporal Analysis (long-term patterns)
        analysis_results["scores"]["temporal"] = self.temporal_analysis(user_did)
        
        # 6. Sybil Risk Assessment (if detector available)
        if self.sybil_detector:
            analysis_results["risks"] = self.sybil_detector.comprehensive_risk_analysis(user_did)
        else:
            analysis_results["risks"] = {"overall_risk": 0.0}
        
        # 7. Combined Reputation Score
        analysis_results["overall_reputation"] = self.combine_scores(analysis_results["scores"])
        
        # Apply Sybil risk penalty to overall reputation
        sybil_risk = analysis_results["risks"].get("overall_risk", 0.0)
        analysis_results["overall_reputation"] *= (1 - sybil_risk * 0.5)  # Up to 50% penalty
        analysis_results["overall_reputation"] = max(0.0, min(1.0, analysis_results["overall_reputation"]))
        
        # 8. Calculate confidence
        analysis_results["confidence"] = self.calculate_confidence(analysis_results["scores"])
        
        # 9. Generate recommendations
        analysis_results["recommendations"] = self.generate_recommendations(analysis_results)
        
        # Cache results for future use
        self._cache[user_did] = analysis_results
        
        return analysis_results
    
    def structural_analysis(self, user_did: str, stake_weights: Optional[Dict[str, float]] = None, 
                            reputation_weights: Optional[Dict[str, float]] = None) -> Dict[str, float]:
        """Analyze user's position in social graph with trust-weighted PageRank"""
        if user_did not in self.graph:
            return self._empty_structural_scores()
        
        metrics = {}
        
        # Trust-Weighted PageRank - Enhanced influence measurement
        try:
            # Use trust-weighted PageRank if weights provided
            if stake_weights or reputation_weights:
                pagerank = self.compute_trust_weighted_pagerank(
                    stake_weights=stake_weights,
                    reputation_weights=reputation_weights
                )
            else:
                pagerank = nx.pagerank(self.graph, max_iter=100, damping_factor=0.85)
            metrics["pagerank"] = pagerank.get(user_did, 0.0)
        except Exception as e:
            print(f"PageRank computation error: {e}")
            metrics["pagerank"] = 0.0
        
        # Betweenness Centrality - Brokerage power
        try:
            betweenness = nx.betweenness_centrality(self.graph)
            metrics["betweenness"] = betweenness.get(user_did, 0.0)
        except Exception as e:
            print(f"Betweenness computation error: {e}")
            metrics["betweenness"] = 0.0
        
        # Closeness Centrality - Information flow efficiency
        try:
            closeness = nx.closeness_centrality(self.graph)
            metrics["closeness"] = closeness.get(user_did, 0.0)
        except Exception as e:
            print(f"Closeness computation error: {e}")
            metrics["closeness"] = 0.0
        
        # Degree Centrality - Direct influence
        try:
            degree = nx.degree_centrality(self.graph)
            metrics["degree"] = degree.get(user_did, 0.0)
        except Exception as e:
            print(f"Degree computation error: {e}")
            metrics["degree"] = 0.0
        
        # Community Structure
        metrics["community_embeddedness"] = self.analyze_community_embeddedness(user_did)
        
        return self.normalize_structural_scores(metrics, user_did)
    
    def analyze_community_embeddedness(self, user_did: str) -> float:
        """Analyze how well embedded user is in their community"""
        if not LOUVAIN_AVAILABLE:
            # Simplified community analysis
            neighbors = list(self.graph.neighbors(user_did))
            if len(neighbors) < 2:
                return 0.0
            
            # Count connections between neighbors (triadic closure)
            neighbor_connections = 0
            for n1 in neighbors:
                for n2 in neighbors:
                    if n1 != n2 and self.graph.has_edge(n1, n2):
                        neighbor_connections += 1
            
            max_possible = len(neighbors) * (len(neighbors) - 1)
            return neighbor_connections / max_possible if max_possible > 0 else 0.0
        
        try:
            # Use Louvain community detection
            undirected = self.graph.to_undirected()
            communities = community_louvain.best_partition(undirected)
            user_community = communities.get(user_did)
            
            if user_community is None:
                return 0.0
            
            # Get all nodes in same community
            community_nodes = [n for n, c in communities.items() if c == user_community]
            
            # Calculate internal connection ratio
            total_connections = len(list(self.graph.neighbors(user_did)))
            if total_connections == 0:
                return 0.0
            
            internal_connections = len([
                n for n in self.graph.neighbors(user_did) 
                if n in community_nodes
            ])
            
            return internal_connections / total_connections if total_connections > 0 else 0.0
            
        except Exception as e:
            print(f"Community detection error: {e}")
            return 0.0
    
    def normalize_structural_scores(self, metrics: Dict[str, float], user_did: Optional[str] = None) -> Dict[str, float]:
        """Normalize structural scores to [0, 1] range"""
        normalized = {}
        
        # PageRank is already normalized
        normalized["pagerank"] = min(1.0, max(0.0, metrics.get("pagerank", 0.0) * 100))
        
        # Centrality measures are already normalized by networkx
        normalized["betweenness"] = min(1.0, max(0.0, metrics.get("betweenness", 0.0)))
        normalized["closeness"] = min(1.0, max(0.0, metrics.get("closeness", 0.0)))
        normalized["degree"] = min(1.0, max(0.0, metrics.get("degree", 0.0)))
        normalized["community_embeddedness"] = min(1.0, max(0.0, metrics.get("community_embeddedness", 0.0)))
        
        # Eigenvector Centrality (if not already computed)
        if "eigenvector" not in metrics:
            try:
                if user_did and self.graph.number_of_nodes() < 10000:
                    eigenvector = nx.eigenvector_centrality_numpy(self.graph)
                    normalized["eigenvector"] = min(1.0, max(0.0, eigenvector.get(user_did, 0.0)))
                else:
                    normalized["eigenvector"] = 0.0
            except:
                normalized["eigenvector"] = 0.0
        else:
            normalized["eigenvector"] = min(1.0, max(0.0, metrics.get("eigenvector", 0.0)))
        
        # Combined structural score (weighted average)
        normalized["combined"] = (
            normalized["pagerank"] * 0.25 +
            normalized["betweenness"] * 0.2 +
            normalized["closeness"] * 0.15 +
            normalized["degree"] * 0.15 +
            normalized["eigenvector"] * 0.15 +
            normalized["community_embeddedness"] * 0.1
        )
        
        return normalized
    
    def behavioral_analysis(self, user_did: str) -> Dict[str, float]:
        """Analyze user behavior patterns"""
        behavior_metrics = {}
        
        # Interaction Patterns
        behavior_metrics["engagement_consistency"] = self.analyze_engagement_patterns(user_did)
        behavior_metrics["reciprocity_rate"] = self.calculate_reciprocity(user_did)
        behavior_metrics["content_diversity"] = self.analyze_content_diversity(user_did)
        behavior_metrics["connection_quality"] = self.analyze_connection_quality(user_did)
        behavior_metrics["response_patterns"] = self.analyze_response_patterns(user_did)
        
        # Temporal Analysis
        behavior_metrics["activity_longevity"] = self.analyze_account_age_activity(user_did)
        behavior_metrics["posting_regularity"] = self.analyze_posting_regularity(user_did)
        
        return self.normalize_behavioral_scores(behavior_metrics)
    
    def analyze_connection_quality(self, user_did: str) -> float:
        """Analyze quality of user's connections"""
        neighbors = list(self.graph.neighbors(user_did))
        if len(neighbors) == 0:
            return 0.0
        
        # Check average reputation/quality of neighbors
        neighbor_qualities = []
        for neighbor in neighbors[:20]:  # Sample for performance
            # Use degree as proxy for quality (higher degree = more established)
            neighbor_degree = self.graph.degree(neighbor)
            neighbor_qualities.append(min(1.0, neighbor_degree / 50.0))
        
        if neighbor_qualities:
            avg_quality = sum(neighbor_qualities) / len(neighbor_qualities)
            return avg_quality
        
        return 0.5  # Default neutral
    
    def analyze_response_patterns(self, user_did: str) -> float:
        """Analyze response patterns and interaction timing"""
        # Check for bidirectional connections (indicates active engagement)
        out_neighbors = set(self.graph.successors(user_did))
        in_neighbors = set(self.graph.predecessors(user_did))
        
        mutual = len(out_neighbors & in_neighbors)
        total_unique = len(out_neighbors | in_neighbors)
        
        if total_unique == 0:
            return 0.0
        
        # Higher mutual ratio = better response patterns
        return mutual / total_unique
    
    def analyze_engagement_patterns(self, user_did: str) -> float:
        """Analyze consistency of engagement patterns"""
        # Simplified: check if user has balanced in/out degree
        in_degree = self.graph.in_degree(user_did)
        out_degree = self.graph.out_degree(user_did)
        
        total = in_degree + out_degree
        if total == 0:
            return 0.0
        
        # Balanced engagement is better
        balance = 1.0 - abs(in_degree - out_degree) / total
        return balance
    
    def calculate_reciprocity(self, user_did: str) -> float:
        """Calculate reciprocity rate (mutual connections)"""
        out_neighbors = set(self.graph.successors(user_did))
        in_neighbors = set(self.graph.predecessors(user_did))
        
        # Mutual connections
        mutual = len(out_neighbors & in_neighbors)
        total_unique = len(out_neighbors | in_neighbors)
        
        return mutual / total_unique if total_unique > 0 else 0.0
    
    def analyze_content_diversity(self, user_did: str) -> float:
        """Analyze diversity of connections (simplified)"""
        neighbors = list(self.graph.neighbors(user_did))
        if len(neighbors) < 2:
            return 0.0
        
        # Check if neighbors are well-connected to diverse parts of graph
        neighbor_communities = set()
        for neighbor in neighbors[:10]:  # Sample for performance
            neighbor_neighbors = list(self.graph.neighbors(neighbor))
            neighbor_communities.add(len(neighbor_neighbors))
        
        # Higher diversity = better
        diversity = len(neighbor_communities) / max(len(neighbors), 1)
        return min(1.0, diversity)
    
    def analyze_account_age_activity(self, user_did: str) -> float:
        """Analyze account age and activity (simplified - assumes all nodes are active)"""
        # In real implementation, would check node metadata for creation date
        # For now, use degree as proxy for activity
        degree = self.graph.degree(user_did)
        # Normalize: assume max degree of 100 is full activity
        return min(1.0, degree / 100.0)
    
    def analyze_posting_regularity(self, user_did: str) -> float:
        """Analyze posting regularity (simplified)"""
        # In real implementation, would analyze temporal patterns
        # For now, use out-degree as proxy
        out_degree = self.graph.out_degree(user_did)
        return min(1.0, out_degree / 50.0)
    
    def normalize_behavioral_scores(self, metrics: Dict[str, float]) -> Dict[str, float]:
        """Normalize behavioral scores"""
        normalized = {k: min(1.0, max(0.0, v)) for k, v in metrics.items()}
        
        # Combined behavioral score (updated weights)
        normalized["combined"] = (
            normalized.get("engagement_consistency", 0.0) * 0.20 +
            normalized.get("reciprocity_rate", 0.0) * 0.20 +
            normalized.get("content_diversity", 0.0) * 0.15 +
            normalized.get("connection_quality", 0.0) * 0.15 +
            normalized.get("response_patterns", 0.0) * 0.15 +
            normalized.get("activity_longevity", 0.0) * 0.10 +
            normalized.get("posting_regularity", 0.0) * 0.05
        )
        
        return normalized
    
    def content_quality_analysis(self, user_did: str) -> Dict[str, float]:
        """Integrate Umanitek Guardian for content verification"""
        if not self.guardian_integrator:
            return {"combined": 0.5, "verified_content_ratio": 0.5}
        
        try:
            # Get user's recent content from graph metadata or DKG
            user_content = self.query_user_content(user_did, limit=50)
            
            if not user_content:
                return {"combined": 0.5, "verified_content_ratio": 0.5}
            
            guardian_scores = []
            verified_count = 0
            
            for content_item in user_content:
                # Submit to Umanitek Guardian for verification
                verification_result = self.guardian_integrator.verify_content(
                    content_item.get("fingerprint", ""),
                    content_item.get("content_type", "text")
                )
                
                if verification_result.get("status") == "verified":
                    # Convert Guardian confidence to quality score
                    quality_score = self.map_guardian_confidence_to_quality(
                        verification_result.get("confidence", 0.5),
                        verification_result.get("match_type", "none")
                    )
                    guardian_scores.append(quality_score)
                    verified_count += 1
            
            if guardian_scores:
                avg_score = sum(guardian_scores) / len(guardian_scores)
                verified_ratio = verified_count / len(user_content)
                return {
                    "combined": avg_score,
                    "verified_content_ratio": verified_ratio,
                    "average_confidence": avg_score
                }
            else:
                return {"combined": 0.5, "verified_content_ratio": 0.0}
                
        except Exception as e:
            print(f"Guardian integration error: {e}")
            return {"combined": 0.5, "verified_content_ratio": 0.5}
    
    def query_user_content(self, user_did: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Query user content from graph metadata or DKG"""
        # Simplified: return empty list
        # In real implementation, would query DKG for user's content
        return []
    
    def map_guardian_confidence_to_quality(self, confidence: float, match_type: str) -> float:
        """Map Guardian verification confidence to quality score"""
        if match_type == "exact" or match_type == "manipulated":
            # High confidence match = low quality (harmful content)
            return 1.0 - confidence
        elif match_type == "near":
            # Near match = medium quality concern
            return 1.0 - (confidence * 0.5)
        else:
            # No match = high quality (clean content)
            return confidence
    
    def economic_analysis(
        self, 
        user_did: str, 
        stake_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        """
        Analyze economic signals (staking, transactions, etc.)
        
        Args:
            user_did: User identifier
            stake_data: Optional dict with stake_amount, transaction_diversity, etc.
        """
        node_data = self.graph.nodes.get(user_did, {})
        
        # Get stake amount from stake_data or node metadata
        if stake_data:
            stake_amount = stake_data.get("stake_amount", 0.0)
            transaction_diversity = stake_data.get("transaction_diversity", 0.0)
        else:
            stake_amount = node_data.get("stake", 0.0)
            transaction_diversity = 0.0
        
        # Normalize stake (log scale for diminishing returns)
        if stake_amount > 0:
            stake_score = min(1.0, np.log(1 + stake_amount / 1000) / np.log(11))  # Maps 0-10000 to 0-1
        else:
            stake_score = 0.0
        
        # Transaction activity (use degree as proxy if no explicit data)
        if transaction_diversity > 0:
            transaction_activity = min(1.0, transaction_diversity)
        else:
            transaction_activity = min(1.0, self.graph.degree(user_did) / 100.0)
        
        # Account age factor (if available in node data)
        account_age_days = node_data.get("account_age_days", 0)
        age_score = min(1.0, account_age_days / 365.0)  # Normalize to 1 year
        
        return {
            "stake_score": stake_score,
            "transaction_activity": transaction_activity,
            "account_age_score": age_score,
            "transaction_diversity": transaction_diversity,
            "combined": (
                stake_score * 0.4 + 
                transaction_activity * 0.3 + 
                age_score * 0.2 +
                transaction_diversity * 0.1
            )
        }
    
    def combine_scores(self, scores: Dict[str, Dict[str, float]]) -> float:
        """
        Combine all score dimensions into overall reputation
        
        Uses multi-dimensional weighting as specified in the guide:
        - Structural: 25% (graph position)
        - Behavioral: 20% (interaction patterns)
        - Content Quality: 25% (Umanitek Guardian)
        - Economic: 20% (staking & transactions)
        - Temporal: 10% (long-term patterns)
        """
        structural = scores.get("structural", {}).get("combined", 0.0)
        behavioral = scores.get("behavioral", {}).get("combined", 0.0)
        content_quality = scores.get("content_quality", {}).get("combined", 0.5)
        economic = scores.get("economic", {}).get("combined", 0.0)
        temporal = scores.get("temporal", {}).get("combined", 0.5)  # Default neutral
        
        # Weighted combination (matching guide specifications)
        overall = (
            structural * 0.25 +
            behavioral * 0.20 +
            content_quality * 0.25 +
            economic * 0.20 +
            temporal * 0.10
        )
        
        return min(1.0, max(0.0, overall))
    
    def temporal_analysis(self, user_did: str) -> Dict[str, float]:
        """Analyze long-term temporal patterns"""
        node_data = self.graph.nodes.get(user_did, {})
        
        # Account age (if available)
        account_age_days = node_data.get("account_age_days", 0)
        age_score = min(1.0, account_age_days / 730.0)  # Normalize to 2 years
        
        # Activity consistency over time (simplified - use degree as proxy)
        degree = self.graph.degree(user_did)
        consistency_score = min(1.0, degree / 50.0)
        
        # Long-term engagement (check for sustained activity)
        # In real implementation, would analyze activity over time windows
        engagement_score = min(1.0, (self.graph.in_degree(user_did) + self.graph.out_degree(user_did)) / 100.0)
        
        return {
            "account_age_score": age_score,
            "activity_consistency": consistency_score,
            "long_term_engagement": engagement_score,
            "combined": (age_score * 0.4 + consistency_score * 0.3 + engagement_score * 0.3)
        }
    
    def calculate_confidence(self, scores: Dict[str, Dict[str, float]]) -> float:
        """
        Calculate confidence in the reputation score based on data availability
        
        Args:
            scores: Dictionary of score components
            
        Returns:
            Confidence score (0-1)
        """
        # Check data availability for each dimension
        has_structural = bool(scores.get("structural", {}).get("combined", 0) > 0)
        has_behavioral = bool(scores.get("behavioral", {}).get("combined", 0) > 0)
        has_content = bool(scores.get("content_quality", {}).get("verified_content_ratio", 0) > 0)
        has_economic = bool(scores.get("economic", {}).get("combined", 0) > 0)
        has_temporal = bool(scores.get("temporal", {}).get("combined", 0) > 0)
        
        # Count available data sources
        available_sources = sum([has_structural, has_behavioral, has_content, has_economic, has_temporal])
        
        # Base confidence on data availability (5 dimensions)
        base_confidence = available_sources / 5.0
        
        # Boost confidence if multiple strong signals present
        strong_signals = sum([
            scores.get("structural", {}).get("combined", 0) > 0.7,
            scores.get("behavioral", {}).get("combined", 0) > 0.7,
            scores.get("content_quality", {}).get("combined", 0) > 0.7,
            scores.get("economic", {}).get("combined", 0) > 0.7
        ])
        
        if strong_signals >= 3:
            base_confidence = min(1.0, base_confidence * 1.2)  # 20% boost
        
        return max(0.0, min(1.0, base_confidence))
    
    def generate_recommendations(self, analysis: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on analysis"""
        recommendations = []
        
        overall_rep = analysis.get("overall_reputation", 0.0)
        risks = analysis.get("risks", {})
        overall_risk = risks.get("overall_risk", 0.0)
        scores = analysis.get("scores", {})
        
        if overall_rep < 0.3:
            recommendations.append("Low reputation score. Consider increasing engagement and building trust.")
        
        if overall_risk > 0.7:
            recommendations.append("High Sybil risk detected. Account may be flagged for review.")
        
        structural = scores.get("structural", {})
        if structural.get("community_embeddedness", 0.0) < 0.3:
            recommendations.append("Low community embeddedness. Consider engaging with diverse communities.")
        
        behavioral = scores.get("behavioral", {})
        if behavioral.get("reciprocity_rate", 0.0) < 0.3:
            recommendations.append("Low reciprocity rate. Consider engaging more with your connections.")
        
        economic = scores.get("economic", {})
        if economic.get("stake_score", 0.0) < 0.2:
            recommendations.append("Consider staking tokens to increase economic trust signals.")
        
        content_quality = scores.get("content_quality", {})
        if content_quality.get("verified_content_ratio", 0.0) < 0.5:
            recommendations.append("Low content verification ratio. Ensure content meets quality standards.")
        
        return recommendations
    
    def _empty_analysis(self, user_did: str) -> Dict[str, Any]:
        """Return empty analysis for non-existent users"""
        return {
            "user": user_did,
            "timestamp": datetime.now().isoformat(),
            "scores": {
                "structural": self._empty_structural_scores(),
                "behavioral": {},
                "content_quality": {"combined": 0.0},
                "economic": {"combined": 0.0}
            },
            "risks": {"overall_risk": 1.0},
            "overall_reputation": 0.0,
            "recommendations": ["User not found in graph"]
        }
    
    def compute_trust_weighted_pagerank(
        self,
        max_iterations: int = 100,
        damping_factor: float = 0.85,
        stake_weights: Optional[Dict[str, float]] = None,
        reputation_weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, float]:
        """
        Enhanced PageRank with trust and economic signals
        
        Implements trust-weighted PageRank that considers:
        - Economic stake weighting
        - Reputation-based weighting
        - Connection strength adjustment
        
        Args:
            max_iterations: Maximum iterations for convergence
            damping_factor: PageRank damping factor (default: 0.85)
            stake_weights: Optional dict mapping node -> stake amount
            reputation_weights: Optional dict mapping node -> reputation score
            
        Returns:
            Dict mapping node -> trust-weighted PageRank score
        """
        nodes = list(self.graph.nodes())
        N = len(nodes)
        if N == 0:
            return {}
        
        initial_score = 1.0 / N
        scores = {node: initial_score for node in nodes}
        
        for iteration in range(max_iterations):
            new_scores = {}
            total_change = 0
            
            for node in nodes:
                # Sum of weighted votes from incoming links
                rank_sum = 0.0
                in_edges = self.graph.in_edges(node, data=True)
                
                for source, target, edge_data in in_edges:
                    source_degree = self.graph.out_degree(source)
                    if source_degree > 0:
                        base_weight = edge_data.get('weight', 1.0) / source_degree
                        
                        # Apply trust weights
                        trust_weight = self._calculate_trust_weight(
                            source, target, stake_weights, reputation_weights
                        )
                        weighted_contribution = scores[source] * base_weight * trust_weight
                        rank_sum += weighted_contribution
                
                # PageRank formula with damping
                new_score = (1 - damping_factor) / N + damping_factor * rank_sum
                new_scores[node] = new_score
                total_change += abs(new_score - scores[node])
            
            scores = new_scores
            
            # Convergence check
            if total_change < 1e-6:
                break
        
        return self._normalize_pagerank_scores(scores)
    
    def _calculate_trust_weight(
        self,
        source: str,
        target: str,
        stake_weights: Optional[Dict[str, float]],
        reputation_weights: Optional[Dict[str, float]]
    ) -> float:
        """Calculate trust weight for edge weighting"""
        weight = 1.0  # Base weight
        
        # Economic stake weighting
        if stake_weights and source in stake_weights:
            stake_weight = min(1.0, stake_weights[source] / 10000)  # Normalize
            weight *= (1.0 + stake_weight * 0.5)  # 50% boost for high stake
        
        # Reputation-based weighting  
        if reputation_weights and source in reputation_weights:
            rep_weight = reputation_weights[source]
            weight *= (1.0 + rep_weight * 0.3)  # 30% boost for high reputation
        
        # Connection strength adjustment
        connection_strength = self._calculate_connection_strength(source, target)
        weight *= connection_strength
        
        return min(weight, 2.0)  # Cap maximum weight
    
    def _calculate_connection_strength(self, source: str, target: str) -> float:
        """Calculate connection strength between two nodes"""
        # Check for mutual connections (stronger if bidirectional)
        if self.graph.has_edge(target, source):
            return 1.5  # 50% boost for mutual connection
        
        # Check edge weight if available
        edge_data = self.graph.get_edge_data(source, target, {})
        edge_weight = edge_data.get('weight', 1.0)
        
        return min(1.0, edge_weight)
    
    def _normalize_pagerank_scores(self, scores: Dict[str, float]) -> Dict[str, float]:
        """Normalize PageRank scores to [0, 1] range"""
        if not scores:
            return {}
        
        max_score = max(scores.values())
        min_score = min(scores.values())
        score_range = max_score - min_score if max_score > min_score else 1.0
        
        return {
            node: (score - min_score) / score_range if score_range > 0 else 0.0
            for node, score in scores.items()
        }
    
    def _empty_structural_scores(self) -> Dict[str, float]:
        """Return empty structural scores"""
        return {
            "pagerank": 0.0,
            "betweenness": 0.0,
            "closeness": 0.0,
            "degree": 0.0,
            "eigenvector": 0.0,
            "community_embeddedness": 0.0,
            "combined": 0.0
        }
    
    def precompute_global_metrics(self) -> Dict[str, Any]:
        """
        Pre-compute global graph metrics for batch processing
        
        Returns:
            Dictionary of precomputed metrics (PageRank, centralities, etc.)
        """
        # Check cache validity
        now = time.time()
        if (self._global_metrics_cache is not None and 
            self._cache_timestamp is not None and
            (now - self._cache_timestamp) < self._cache_ttl):
            return self._global_metrics_cache
        
        print("Pre-computing global graph metrics...")
        metrics = {}
        
        try:
            # Pre-compute PageRank for all nodes
            metrics["pagerank"] = nx.pagerank(self.graph, max_iter=100, damping_factor=0.85)
        except Exception as e:
            print(f"PageRank pre-computation error: {e}")
            metrics["pagerank"] = {}
        
        try:
            # Pre-compute betweenness centrality
            metrics["betweenness"] = nx.betweenness_centrality(self.graph)
        except Exception as e:
            print(f"Betweenness pre-computation error: {e}")
            metrics["betweenness"] = {}
        
        try:
            # Pre-compute closeness centrality
            metrics["closeness"] = nx.closeness_centrality(self.graph)
        except Exception as e:
            print(f"Closeness pre-computation error: {e}")
            metrics["closeness"] = {}
        
        try:
            # Pre-compute degree centrality
            metrics["degree"] = nx.degree_centrality(self.graph)
        except Exception as e:
            print(f"Degree pre-computation error: {e}")
            metrics["degree"] = {}
        
        try:
            # Pre-compute eigenvector centrality (if graph is not too large)
            if self.graph.number_of_nodes() < 10000:
                metrics["eigenvector"] = nx.eigenvector_centrality_numpy(self.graph)
            else:
                metrics["eigenvector"] = {}
        except Exception as e:
            print(f"Eigenvector pre-computation error: {e}")
            metrics["eigenvector"] = {}
        
        # Cache results
        self._global_metrics_cache = metrics
        self._cache_timestamp = now
        
        print(f"Pre-computed metrics for {len(metrics.get('pagerank', {}))} nodes")
        return metrics
    
    def batch_compute_reputation(
        self,
        user_list: List[str],
        stake_data_map: Optional[Dict[str, Dict[str, Any]]] = None,
        max_workers: int = 4,
        use_cache: bool = True
    ) -> Dict[str, Dict[str, Any]]:
        """
        Compute reputation for multiple users efficiently using batch processing
        
        Args:
            user_list: List of user identifiers
            stake_data_map: Optional mapping of user_did to stake data
            max_workers: Maximum number of parallel workers
            use_cache: Whether to use cached global metrics
            
        Returns:
            Dictionary mapping user_did to reputation results
        """
        results = {}
        
        # Pre-compute global graph metrics
        if use_cache:
            global_metrics = self.precompute_global_metrics()
        else:
            global_metrics = None
        
        # Process in batches
        for i in range(0, len(user_list), self._batch_size):
            batch = user_list[i:i + self._batch_size]
            print(f"Processing batch {i // self._batch_size + 1}/{(len(user_list) + self._batch_size - 1) // self._batch_size} ({len(batch)} users)")
            
            # Parallel processing
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {
                    executor.submit(
                        self._compute_single_reputation_with_cache,
                        user,
                        global_metrics,
                        stake_data_map.get(user) if stake_data_map else None
                    ): user
                    for user in batch
                }
                
                for future in as_completed(futures):
                    user = futures[future]
                    try:
                        results[user] = future.result()
                    except Exception as e:
                        print(f"Error computing reputation for {user}: {e}")
                        results[user] = self._empty_analysis(user)
        
        return results
    
    def _compute_single_reputation_with_cache(
        self,
        user_did: str,
        global_metrics: Optional[Dict[str, Any]],
        stake_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Compute reputation for a single user using cached global metrics"""
        if user_did not in self.graph:
            return self._empty_analysis(user_did)
        
        # Use cached metrics if available
        if global_metrics:
            # Build structural scores from cache
            structural_scores = {
                "pagerank": global_metrics.get("pagerank", {}).get(user_did, 0.0),
                "betweenness": global_metrics.get("betweenness", {}).get(user_did, 0.0),
                "closeness": global_metrics.get("closeness", {}).get(user_did, 0.0),
                "degree": global_metrics.get("degree", {}).get(user_did, 0.0),
                "eigenvector": global_metrics.get("eigenvector", {}).get(user_did, 0.0),
                "community_embeddedness": self.analyze_community_embeddedness(user_did)
            }
            structural_scores = self.normalize_structural_scores(structural_scores, user_did)
        else:
            # Fallback to full computation
            structural_scores = self.structural_analysis(user_did)
        
        # Compute other dimensions (these are user-specific, can't be cached)
        behavioral_scores = self.behavioral_analysis(user_did)
        content_quality_scores = self.content_quality_analysis(user_did)
        economic_scores = self.economic_analysis(user_did, stake_data=stake_data)
        temporal_scores = self.temporal_analysis(user_did)
        
        # Sybil risk
        if self.sybil_detector:
            risks = self.sybil_detector.comprehensive_risk_analysis(user_did)
        else:
            risks = {"overall_risk": 0.0}
        
        # Combine scores
        scores = {
            "structural": structural_scores,
            "behavioral": behavioral_scores,
            "content_quality": content_quality_scores,
            "economic": economic_scores,
            "temporal": temporal_scores
        }
        
        overall_reputation = self.combine_scores(scores)
        
        # Apply Sybil penalty
        sybil_risk = risks.get("overall_risk", 0.0)
        overall_reputation *= (1 - sybil_risk * 0.5)
        overall_reputation = max(0.0, min(1.0, overall_reputation))
        
        # Generate recommendations
        analysis = {
            "overall_reputation": overall_reputation,
            "scores": scores,
            "risks": risks
        }
        recommendations = self.generate_recommendations(analysis)
        
        return {
            "user": user_did,
            "timestamp": datetime.now().isoformat(),
            "scores": scores,
            "risks": risks,
            "overall_reputation": overall_reputation,
            "confidence": self.calculate_confidence(scores),
            "recommendations": recommendations
        }
    
    def incremental_update(
        self,
        new_interactions: List[Dict[str, Any]],
        affected_users: Optional[List[str]] = None
    ) -> Dict[str, Dict[str, Any]]:
        """
        Update reputation scores incrementally for affected users
        
        Args:
            new_interactions: List of new interactions with 'from_user', 'to_user', 'weight', etc.
            affected_users: Optional list of user IDs to recompute (if None, auto-detect)
            
        Returns:
            Dictionary mapping user_did to updated reputation results
        """
        # Update graph with new interactions
        for interaction in new_interactions:
            from_user = interaction.get("from_user")
            to_user = interaction.get("to_user")
            weight = interaction.get("weight", 1.0)
            
            if from_user and to_user:
                if self.graph.has_edge(from_user, to_user):
                    # Update existing edge weight
                    current_weight = self.graph[from_user][to_user].get("weight", 1.0)
                    self.graph[from_user][to_user]["weight"] = current_weight + weight
                else:
                    # Add new edge
                    self.graph.add_edge(from_user, to_user, weight=weight)
        
        # Detect affected users if not provided
        if affected_users is None:
            affected_users = set()
            for interaction in new_interactions:
                affected_users.add(interaction.get("from_user"))
                affected_users.add(interaction.get("to_user"))
            affected_users = list(affected_users)
        
        # Invalidate cache for affected users
        for user in affected_users:
            if user in self._cache:
                del self._cache[user]
        
        # Invalidate global metrics cache (graph structure changed)
        self._global_metrics_cache = None
        self._cache_timestamp = None
        
        # Recompute only affected users
        print(f"Incremental update: recomputing {len(affected_users)} affected users")
        return self.batch_compute_reputation(affected_users)

