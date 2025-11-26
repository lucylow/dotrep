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
        
    def compute_comprehensive_reputation(self, user_did: str) -> Dict[str, Any]:
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
        
        # 1. Structural Analysis
        analysis_results["scores"]["structural"] = self.structural_analysis(user_did)
        
        # 2. Behavioral Analysis
        analysis_results["scores"]["behavioral"] = self.behavioral_analysis(user_did)
        
        # 3. Content Quality Analysis (Umanitek Integration)
        analysis_results["scores"]["content_quality"] = self.content_quality_analysis(user_did)
        
        # 4. Economic Analysis
        analysis_results["scores"]["economic"] = self.economic_analysis(user_did)
        
        # 5. Sybil Risk Assessment (if detector available)
        if self.sybil_detector:
            analysis_results["risks"] = self.sybil_detector.comprehensive_risk_analysis(user_did)
        else:
            analysis_results["risks"] = {"overall_risk": 0.0}
        
        # 6. Combined Reputation Score
        analysis_results["overall_reputation"] = self.combine_scores(analysis_results["scores"])
        
        # 7. Generate recommendations
        analysis_results["recommendations"] = self.generate_recommendations(analysis_results)
        
        return analysis_results
    
    def structural_analysis(self, user_did: str) -> Dict[str, float]:
        """Analyze user's position in social graph"""
        if user_did not in self.graph:
            return self._empty_structural_scores()
        
        metrics = {}
        
        # PageRank - Influence measurement
        try:
            pagerank = nx.pagerank(self.graph, max_iter=100)
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
        
        return self.normalize_structural_scores(metrics)
    
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
    
    def normalize_structural_scores(self, metrics: Dict[str, float]) -> Dict[str, float]:
        """Normalize structural scores to [0, 1] range"""
        normalized = {}
        
        # PageRank is already normalized
        normalized["pagerank"] = min(1.0, max(0.0, metrics.get("pagerank", 0.0) * 100))
        
        # Centrality measures are already normalized by networkx
        normalized["betweenness"] = min(1.0, max(0.0, metrics.get("betweenness", 0.0)))
        normalized["closeness"] = min(1.0, max(0.0, metrics.get("closeness", 0.0)))
        normalized["degree"] = min(1.0, max(0.0, metrics.get("degree", 0.0)))
        normalized["community_embeddedness"] = min(1.0, max(0.0, metrics.get("community_embeddedness", 0.0)))
        
        # Combined structural score (weighted average)
        normalized["combined"] = (
            normalized["pagerank"] * 0.3 +
            normalized["betweenness"] * 0.2 +
            normalized["closeness"] * 0.2 +
            normalized["degree"] * 0.2 +
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
        
        # Temporal Analysis
        behavior_metrics["activity_longevity"] = self.analyze_account_age_activity(user_did)
        behavior_metrics["posting_regularity"] = self.analyze_posting_regularity(user_did)
        
        return self.normalize_behavioral_scores(behavior_metrics)
    
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
        
        # Combined behavioral score
        normalized["combined"] = (
            normalized["engagement_consistency"] * 0.25 +
            normalized["reciprocity_rate"] * 0.25 +
            normalized["content_diversity"] * 0.2 +
            normalized["activity_longevity"] * 0.15 +
            normalized["posting_regularity"] * 0.15
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
    
    def economic_analysis(self, user_did: str) -> Dict[str, float]:
        """Analyze economic signals (staking, transactions, etc.)"""
        # Simplified economic analysis
        # In real implementation, would query blockchain/staking data
        
        node_data = self.graph.nodes.get(user_did, {})
        stake_amount = node_data.get("stake", 0.0)
        
        # Normalize stake (assuming max stake of 1.0)
        stake_score = min(1.0, stake_amount)
        
        # Transaction activity (simplified - use degree as proxy)
        transaction_activity = min(1.0, self.graph.degree(user_did) / 100.0)
        
        return {
            "stake_score": stake_score,
            "transaction_activity": transaction_activity,
            "combined": (stake_score * 0.6 + transaction_activity * 0.4)
        }
    
    def combine_scores(self, scores: Dict[str, Dict[str, float]]) -> float:
        """Combine all score dimensions into overall reputation"""
        structural = scores.get("structural", {}).get("combined", 0.0)
        behavioral = scores.get("behavioral", {}).get("combined", 0.0)
        content_quality = scores.get("content_quality", {}).get("combined", 0.5)
        economic = scores.get("economic", {}).get("combined", 0.0)
        
        # Weighted combination
        overall = (
            structural * 0.4 +
            behavioral * 0.25 +
            content_quality * 0.2 +
            economic * 0.15
        )
        
        return min(1.0, max(0.0, overall))
    
    def generate_recommendations(self, analysis: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on analysis"""
        recommendations = []
        
        overall_rep = analysis.get("overall_reputation", 0.0)
        risks = analysis.get("risks", {})
        overall_risk = risks.get("overall_risk", 0.0)
        
        if overall_rep < 0.3:
            recommendations.append("Low reputation score. Consider increasing engagement and building trust.")
        
        if overall_risk > 0.7:
            recommendations.append("High Sybil risk detected. Account may be flagged for review.")
        
        structural = analysis.get("scores", {}).get("structural", {})
        if structural.get("community_embeddedness", 0.0) < 0.3:
            recommendations.append("Low community embeddedness. Consider engaging with diverse communities.")
        
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
    
    def _empty_structural_scores(self) -> Dict[str, float]:
        """Return empty structural scores"""
        return {
            "pagerank": 0.0,
            "betweenness": 0.0,
            "closeness": 0.0,
            "degree": 0.0,
            "community_embeddedness": 0.0,
            "combined": 0.0
        }

