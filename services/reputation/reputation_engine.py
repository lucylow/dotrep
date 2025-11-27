#!/usr/bin/env python3
"""
Reputation Engine
Trust-weighted reputation computation with multi-dimensional analysis
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from advanced_graph_analyzer import AdvancedGraphAnalyzer
from guardian_integrator import GuardianIntegrator


class ReputationEngine:
    """Trust-weighted reputation computation engine"""
    
    def __init__(self, graph_analyzer: AdvancedGraphAnalyzer, guardian_integrator: Optional[GuardianIntegrator] = None):
        """
        Initialize reputation engine
        
        Args:
            graph_analyzer: AdvancedGraphAnalyzer instance
            guardian_integrator: Optional GuardianIntegrator instance
        """
        self.analyzer = graph_analyzer
        self.guardian = guardian_integrator
    
    def compute_user_reputation(
        self,
        user_did: str,
        stake_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Compute comprehensive reputation score
        
        Args:
            user_did: User identifier (DID or node ID)
            stake_data: Optional stake information
            
        Returns:
            Comprehensive reputation result with scores, risks, and metadata
        """
        # Get multi-dimensional analysis
        analysis = self.analyzer.compute_comprehensive_reputation(user_did)
        
        # Base reputation from graph analysis
        base_reputation = analysis.get("overall_reputation", 0.0)
        
        # Apply trust weights
        trust_weights = self.calculate_trust_weights(analysis, stake_data)
        
        # Guardian content verification impact
        content_impact = self.calculate_content_impact(user_did, analysis)
        
        # Final reputation calculation
        final_reputation = (
            base_reputation * trust_weights["graph"] +
            analysis.get("scores", {}).get("economic", {}).get("combined", 0.0) * trust_weights["economic"] +
            content_impact * trust_weights["content"]
        )
        
        # Apply Sybil risk penalty
        risks = analysis.get("risks", {})
        sybil_penalty = self.calculate_sybil_penalty(risks.get("overall_risk", 0.0))
        final_reputation *= (1 - sybil_penalty)
        
        return {
            "user_did": user_did,
            "final_reputation": max(0.0, min(1.0, final_reputation)),
            "component_scores": analysis.get("scores", {}),
            "risk_factors": risks,
            "sybil_penalty": sybil_penalty,
            "confidence": self.calculate_confidence(analysis),
            "timestamp": datetime.now().isoformat(),
            "metadata": {
                "trust_weights": trust_weights,
                "content_impact": content_impact,
                "base_reputation": base_reputation
            }
        }
    
    def calculate_trust_weights(
        self,
        analysis: Dict[str, Any],
        stake_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        """
        Dynamic weight calculation based on trust signals
        
        Args:
            analysis: Analysis results
            stake_data: Optional stake information
            
        Returns:
            Dictionary of weights for different components
        """
        weights = {
            "graph": 0.4,      # Base weight for structural analysis
            "economic": 0.3,   # Economic signals
            "content": 0.3     # Content verification
        }
        
        # Adjust weights based on data quality and availability
        if stake_data and stake_data.get("stake_amount", 0) > 0:
            weights["economic"] += 0.1
            weights["graph"] -= 0.1
        
        content_quality = analysis.get("scores", {}).get("content_quality", {})
        if content_quality.get("verified_content_ratio", 0) > 0.7:
            weights["content"] += 0.1
            weights["graph"] -= 0.1
        
        # Ensure weights sum to 1.0
        total = sum(weights.values())
        if total > 0:
            weights = {k: v / total for k, v in weights.items()}
        
        return weights
    
    def calculate_content_impact(self, user_did: str, analysis: Dict[str, Any]) -> float:
        """
        Calculate impact of Umanitek Guardian verification on reputation
        
        Args:
            user_did: User identifier
            analysis: Analysis results
            
        Returns:
            Content impact score (0-1)
        """
        content_quality = analysis.get("scores", {}).get("content_quality", {})
        
        if not content_quality:
            return 0.5  # Neutral impact
        
        # Use verified content ratio and average confidence
        verified_ratio = content_quality.get("verified_content_ratio", 0.0)
        avg_confidence = content_quality.get("average_confidence", 0.5)
        
        # Weighted combination
        impact = (verified_ratio * 0.6 + avg_confidence * 0.4)
        
        return max(0.0, min(1.0, impact))
    
    def calculate_sybil_penalty(self, overall_risk: float) -> float:
        """
        Calculate Sybil penalty to apply to reputation
        
        Args:
            overall_risk: Overall Sybil risk score (0-1)
            
        Returns:
            Penalty multiplier (0-1)
        """
        # Apply penalty based on risk level
        if overall_risk >= 0.8:
            return 0.5  # 50% penalty for critical risk
        elif overall_risk >= 0.6:
            return 0.3  # 30% penalty for high risk
        elif overall_risk >= 0.4:
            return 0.15  # 15% penalty for medium risk
        elif overall_risk >= 0.2:
            return 0.05  # 5% penalty for low risk
        else:
            return 0.0  # No penalty for minimal risk
    
    def calculate_confidence(self, analysis: Dict[str, Any]) -> float:
        """
        Calculate confidence in the reputation score
        
        Args:
            analysis: Analysis results
            
        Returns:
            Confidence score (0-1)
        """
        scores = analysis.get("scores", {})
        
        # Check data availability
        has_structural = bool(scores.get("structural", {}).get("combined", 0) > 0)
        has_behavioral = bool(scores.get("behavioral", {}).get("combined", 0) > 0)
        has_content = bool(scores.get("content_quality", {}).get("verified_content_ratio", 0) > 0)
        has_economic = bool(scores.get("economic", {}).get("combined", 0) > 0)
        
        # Count available data sources
        available_sources = sum([has_structural, has_behavioral, has_content, has_economic])
        
        # Base confidence on data availability
        base_confidence = available_sources / 4.0
        
        # Adjust based on risk level (lower risk = higher confidence)
        risks = analysis.get("risks", {})
        overall_risk = risks.get("overall_risk", 0.5)
        risk_adjustment = 1.0 - (overall_risk * 0.2)  # Reduce confidence by up to 20% for high risk
        
        confidence = base_confidence * risk_adjustment
        
        return max(0.0, min(1.0, confidence))
    
    def batch_compute_reputation(
        self,
        user_dids: List[str],
        stake_data_map: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Dict[str, Dict[str, Any]]:
        """
        Compute reputation for multiple users
        
        Args:
            user_dids: List of user identifiers
            stake_data_map: Optional mapping of user_did to stake data
            
        Returns:
            Dictionary mapping user_did to reputation results
        """
        results = {}
        
        for user_did in user_dids:
            stake_data = stake_data_map.get(user_did) if stake_data_map else None
            results[user_did] = self.compute_user_reputation(user_did, stake_data)
        
        return results

