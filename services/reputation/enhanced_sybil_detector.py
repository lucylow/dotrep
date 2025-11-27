#!/usr/bin/env python3
"""
Enhanced Sybil Detector
Multi-factor Sybil detection with graph, behavioral, economic, temporal, and content analysis
"""

import networkx as nx
from typing import Dict, List, Any, Optional, Set
from collections import defaultdict, Counter
import numpy as np

try:
    import community.community_louvain as community_louvain
    LOUVAIN_AVAILABLE = True
except ImportError:
    LOUVAIN_AVAILABLE = False
    print("Warning: python-louvain not installed, using simplified community detection")


class EnhancedSybilDetector:
    """Multi-dimensional Sybil detection system"""
    
    def __init__(self, graph: nx.DiGraph):
        """
        Initialize Sybil detector
        
        Args:
            graph: NetworkX directed graph
        """
        self.graph = graph
        self.detection_methods = [
            "graph_cluster_analysis",
            "behavioral_anomaly_detection",
            "economic_footprint_analysis",
            "temporal_pattern_analysis",
            "content_similarity_analysis"
        ]
        self._communities = None
        self._community_cache = {}
    
    def comprehensive_risk_analysis(self, user_did: str) -> Dict[str, Any]:
        """
        Multi-dimensional Sybil risk assessment
        
        Args:
            user_did: User identifier
            
        Returns:
            Comprehensive risk analysis with multiple factors
        """
        if user_did not in self.graph:
            return {"overall_risk": 1.0, "error": "User not in graph"}
        
        risk_factors = {}
        
        # 1. Graph-Based Detection
        risk_factors["graph_analysis"] = self.graph_based_sybil_detection(user_did)
        
        # 2. Behavioral Anomaly Detection
        risk_factors["behavioral_analysis"] = self.behavioral_anomaly_detection(user_did)
        
        # 3. Economic Analysis
        risk_factors["economic_analysis"] = self.economic_footprint_analysis(user_did)
        
        # 4. Content Pattern Analysis
        risk_factors["content_analysis"] = self.content_pattern_analysis(user_did)
        
        # 5. Temporal Analysis
        risk_factors["temporal_analysis"] = self.temporal_pattern_analysis(user_did)
        
        # Combined Risk Score
        risk_factors["overall_risk"] = self.combine_risk_factors(risk_factors)
        
        # Risk level classification
        risk_factors["risk_level"] = self.classify_risk_level(risk_factors["overall_risk"])
        
        return risk_factors
    
    def graph_based_sybil_detection(self, user_did: str) -> Dict[str, Any]:
        """Advanced graph algorithms for Sybil detection"""
        risk_indicators = {}
        
        # Community Detection
        communities = self._get_communities()
        user_community = communities.get(user_did)
        
        if user_community is not None:
            # Calculate internal vs external connection ratio
            community_nodes = [n for n, c in communities.items() if c == user_community]
            total_connections = len(list(self.graph.neighbors(user_did)))
            
            if total_connections > 0:
                internal_connections = len([
                    n for n in self.graph.neighbors(user_did) 
                    if n in community_nodes
                ])
                risk_indicators["internal_connection_ratio"] = internal_connections / total_connections
            else:
                risk_indicators["internal_connection_ratio"] = 0.0
            
            # Community size and density analysis
            if len(community_nodes) > 1:
                community_subgraph = self.graph.subgraph(community_nodes)
                risk_indicators["community_density"] = nx.density(community_subgraph)
                risk_indicators["community_size"] = len(community_nodes)
            else:
                risk_indicators["community_density"] = 0.0
                risk_indicators["community_size"] = 1
        else:
            risk_indicators["internal_connection_ratio"] = 0.0
            risk_indicators["community_density"] = 0.0
            risk_indicators["community_size"] = 0
        
        # Connection Diversity
        risk_indicators["connection_diversity"] = self.calculate_connection_diversity(user_did)
        
        # Clustering Coefficient
        try:
            risk_indicators["clustering_coefficient"] = nx.clustering(self.graph.to_undirected(), user_did)
        except:
            risk_indicators["clustering_coefficient"] = 0.0
        
        # Degree Distribution Anomaly
        risk_indicators["degree_anomaly"] = self.detect_degree_anomaly(user_did)
        
        return self.calculate_graph_risk_score(risk_indicators)
    
    def _get_communities(self) -> Dict[str, int]:
        """Get or compute community structure"""
        if self._communities is not None:
            return self._communities
        
        if LOUVAIN_AVAILABLE:
            try:
                undirected = self.graph.to_undirected()
                self._communities = community_louvain.best_partition(undirected)
                return self._communities
            except Exception as e:
                print(f"Community detection error: {e}")
        
        # Fallback: each node is its own community
        self._communities = {node: i for i, node in enumerate(self.graph.nodes())}
        return self._communities
    
    def calculate_connection_diversity(self, user_did: str) -> float:
        """Calculate diversity of connections"""
        neighbors = list(self.graph.neighbors(user_did))
        if len(neighbors) < 2:
            return 0.0
        
        # Check neighbor degrees (Sybil clusters have similar degrees)
        neighbor_degrees = [self.graph.degree(n) for n in neighbors]
        degree_variance = np.var(neighbor_degrees) if len(neighbor_degrees) > 1 else 0.0
        
        # Low variance = suspicious (similar degrees)
        # Normalize: assume variance of 100 is good diversity
        diversity = min(1.0, degree_variance / 100.0)
        return diversity
    
    def detect_degree_anomaly(self, user_did: str) -> float:
        """Detect if user's degree is anomalous"""
        user_degree = self.graph.degree(user_did)
        
        # Get degree distribution
        degrees = [self.graph.degree(n) for n in self.graph.nodes()]
        if len(degrees) == 0:
            return 0.0
        
        mean_degree = np.mean(degrees)
        std_degree = np.std(degrees) if len(degrees) > 1 else 1.0
        
        if std_degree == 0:
            return 0.0
        
        # Z-score
        z_score = abs(user_degree - mean_degree) / std_degree
        
        # High z-score = anomaly (but could be legitimate influencer)
        # Focus on very low degrees with high clustering (Sybil pattern)
        clustering = nx.clustering(self.graph.to_undirected(), user_did)
        
        if user_degree < mean_degree * 0.5 and clustering > 0.8:
            # Suspicious: low degree but high clustering
            return min(1.0, z_score / 3.0)
        
        return 0.0
    
    def calculate_graph_risk_score(self, indicators: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate graph-based risk score from indicators"""
        risk_score = 0.0
        
        # High internal connection ratio = suspicious (isolated cluster)
        internal_ratio = indicators.get("internal_connection_ratio", 0.5)
        if internal_ratio > 0.9:
            risk_score += 0.3
        
        # Very dense small community = suspicious
        community_density = indicators.get("community_density", 0.0)
        community_size = indicators.get("community_size", 0)
        if community_density > 0.8 and community_size < 20:
            risk_score += 0.2
        
        # Low connection diversity = suspicious
        connection_diversity = indicators.get("connection_diversity", 0.5)
        if connection_diversity < 0.2:
            risk_score += 0.2
        
        # High clustering with low degree = suspicious
        clustering = indicators.get("clustering_coefficient", 0.0)
        if clustering > 0.9:
            risk_score += 0.15
        
        # Degree anomaly
        degree_anomaly = indicators.get("degree_anomaly", 0.0)
        risk_score += degree_anomaly * 0.15
        
        indicators["risk_score"] = min(1.0, risk_score)
        return indicators
    
    def behavioral_anomaly_detection(self, user_did: str) -> Dict[str, Any]:
        """Detect behavioral patterns indicative of Sybil activity"""
        behavior_metrics = {}
        
        # Activity Patterns
        behavior_metrics["activity_burstiness"] = self.analyze_activity_burstiness(user_did)
        behavior_metrics["interaction_reciprocity"] = self.analyze_interaction_reciprocity(user_did)
        behavior_metrics["content_uniformity"] = self.analyze_content_uniformity(user_did)
        
        # Temporal Patterns
        behavior_metrics["temporal_regularity"] = self.analyze_temporal_regularity(user_did)
        behavior_metrics["response_times"] = self.analyze_response_times(user_did)
        
        return self.calculate_behavioral_risk_score(behavior_metrics)
    
    def analyze_activity_burstiness(self, user_did: str) -> float:
        """Analyze if activity is bursty (suspicious pattern)"""
        # Simplified: check if user has many connections created at once
        # In real implementation, would analyze timestamps
        out_degree = self.graph.out_degree(user_did)
        
        # Very high out-degree relative to in-degree = suspicious
        in_degree = self.graph.in_degree(user_did)
        if in_degree == 0 and out_degree > 10:
            return 0.8  # High burstiness risk
        elif out_degree > in_degree * 5:
            return 0.6  # Medium burstiness risk
        
        return 0.2  # Low risk
    
    def analyze_interaction_reciprocity(self, user_did: str) -> float:
        """Analyze reciprocity (Sybils often have low reciprocity)"""
        out_neighbors = set(self.graph.successors(user_did))
        in_neighbors = set(self.graph.predecessors(user_did))
        
        mutual = len(out_neighbors & in_neighbors)
        total = len(out_neighbors | in_neighbors)
        
        if total == 0:
            return 0.5  # Neutral
        
        reciprocity = mutual / total
        
        # Low reciprocity = suspicious
        return 1.0 - reciprocity
    
    def analyze_content_uniformity(self, user_did: str) -> float:
        """Analyze content uniformity (Sybils often post similar content)"""
        # Simplified: check if neighbors are similar
        neighbors = list(self.graph.neighbors(user_did))
        if len(neighbors) < 2:
            return 0.0
        
        # Check if neighbors have similar connection patterns
        neighbor_degrees = [self.graph.degree(n) for n in neighbors]
        degree_variance = np.var(neighbor_degrees) if len(neighbor_degrees) > 1 else 0.0
        
        # Low variance = high uniformity = suspicious
        uniformity = 1.0 - min(1.0, degree_variance / 10.0)
        return uniformity
    
    def analyze_temporal_regularity(self, user_did: str) -> float:
        """Analyze temporal patterns (Sybils often have too-regular patterns)"""
        # Simplified: in real implementation would analyze timestamps
        # For now, return low risk
        return 0.2
    
    def analyze_response_times(self, user_did: str) -> float:
        """Analyze response times (Sybils often respond too quickly)"""
        # Simplified: in real implementation would analyze interaction timestamps
        return 0.2
    
    def calculate_behavioral_risk_score(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        """Calculate behavioral risk score"""
        risk_score = (
            metrics.get("activity_burstiness", 0.0) * 0.3 +
            metrics.get("interaction_reciprocity", 0.0) * 0.25 +
            metrics.get("content_uniformity", 0.0) * 0.25 +
            metrics.get("temporal_regularity", 0.0) * 0.1 +
            metrics.get("response_times", 0.0) * 0.1
        )
        
        metrics["risk_score"] = min(1.0, risk_score)
        return metrics
    
    def economic_footprint_analysis(self, user_did: str) -> Dict[str, Any]:
        """Analyze economic footprint (Sybils often have minimal economic activity)"""
        node_data = self.graph.nodes.get(user_did, {})
        stake_amount = node_data.get("stake", 0.0)
        
        # Low or zero stake = potential risk
        stake_risk = 0.0 if stake_amount > 0.1 else 0.5
        
        # Transaction activity (simplified)
        degree = self.graph.degree(user_did)
        activity_risk = 0.0 if degree > 5 else 0.3
        
        risk_score = (stake_risk * 0.6 + activity_risk * 0.4)
        
        return {
            "stake_risk": stake_risk,
            "activity_risk": activity_risk,
            "risk_score": risk_score
        }
    
    def content_pattern_analysis(self, user_did: str) -> Dict[str, Any]:
        """Analyze content patterns (simplified)"""
        # In real implementation, would analyze actual content
        return {
            "risk_score": 0.2  # Default low risk
        }
    
    def temporal_pattern_analysis(self, user_did: str) -> Dict[str, Any]:
        """Analyze temporal patterns (simplified)"""
        # In real implementation, would analyze timestamps
        return {
            "risk_score": 0.2  # Default low risk
        }
    
    def combine_risk_factors(self, risk_factors: Dict[str, Dict[str, Any]]) -> float:
        """Combine all risk factors into overall risk score"""
        weights = {
            "graph_analysis": 0.35,
            "behavioral_analysis": 0.25,
            "economic_analysis": 0.20,
            "content_analysis": 0.10,
            "temporal_analysis": 0.10
        }
        
        overall_risk = 0.0
        for method, weight in weights.items():
            factor_data = risk_factors.get(method, {})
            risk_score = factor_data.get("risk_score", 0.0)
            overall_risk += risk_score * weight
        
        return min(1.0, max(0.0, overall_risk))
    
    def classify_risk_level(self, risk_score: float) -> str:
        """Classify risk level"""
        if risk_score >= 0.8:
            return "critical"
        elif risk_score >= 0.6:
            return "high"
        elif risk_score >= 0.4:
            return "medium"
        elif risk_score >= 0.2:
            return "low"
        else:
            return "minimal"

