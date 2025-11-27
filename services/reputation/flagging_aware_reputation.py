#!/usr/bin/env python3
"""
Flagging-Aware Reputation System
Integrates user-flagging relationships into reputation calculations
"""

from typing import Dict, Any, Optional
from .flagging_analysis_engine import FlaggingAnalysisEngine


class FlaggingAwareReputation:
    """Reputation system that accounts for flagging patterns"""
    
    def __init__(self, base_reputation_engine, flagging_engine: FlaggingAnalysisEngine):
        """
        Initialize flagging-aware reputation system
        
        Args:
            base_reputation_engine: Base reputation calculation engine
            flagging_engine: Flagging analysis engine
        """
        self.base_engine = base_reputation_engine
        self.flagging_engine = flagging_engine
    
    def compute_flagged_reputation(
        self, 
        user_did: str
    ) -> Dict[str, Any]:
        """
        Compute reputation adjusted for flagging patterns
        
        Args:
            user_did: DID of the user
            
        Returns:
            Comprehensive reputation with flagging adjustments
        """
        # Get base reputation
        base_reputation = self.base_engine.compute_user_reputation(user_did)
        base_score = base_reputation.get("final_score", 0.0) if isinstance(base_reputation, dict) else base_reputation
        
        # Analyze flagging patterns targeting this user
        flagging_analysis = self.flagging_engine.analyze_flagging_patterns(user_did)
        
        # Calculate flagging impact
        flagging_impact = self.calculate_flagging_impact(flagging_analysis)
        
        # Adjust reputation based on flagging patterns
        adjusted_reputation = self.apply_flagging_adjustment(
            base_score, 
            flagging_impact
        )
        
        return {
            "user_did": user_did,
            "base_reputation": base_score,
            "flagging_analysis": flagging_analysis,
            "flagging_impact": flagging_impact,
            "adjusted_reputation": adjusted_reputation,
            "flagging_penalty": base_score - adjusted_reputation
        }
    
    def calculate_flagging_impact(
        self, 
        flagging_analysis: Dict[str, Any]
    ) -> float:
        """Calculate the impact of flagging patterns on reputation"""
        risk_assessment = flagging_analysis.get("risk_assessment", {})
        coordination_signals = flagging_analysis.get("coordination_signals", {})
        
        # High coordination score reduces impact (likely attack)
        coordination_mitigation = 1.0 - coordination_signals.get(
            "overall_coordination_score", 0.0
        )
        
        # Base impact from legitimate flags
        legitimate_flag_impact = risk_assessment.get("legitimate_flag_risk", 0.0)
        
        # Reporter credibility weighting
        credible_reporter_impact = risk_assessment.get("credible_reporter_impact", 0.0)
        
        # Combined impact
        impact_score = (
            legitimate_flag_impact * 0.6 +
            credible_reporter_impact * 0.4
        ) * coordination_mitigation
        
        return min(1.0, impact_score)
    
    def apply_flagging_adjustment(
        self, 
        base_reputation: float, 
        flagging_impact: float
    ) -> float:
        """
        Apply flagging impact to base reputation
        
        Args:
            base_reputation: Base reputation score (0-1)
            flagging_impact: Impact score from flagging (0-1)
            
        Returns:
            Adjusted reputation score
        """
        # Apply penalty: reduce reputation by impact amount
        # But cap the reduction to prevent complete reputation destruction
        max_penalty = 0.5  # Maximum 50% reduction
        penalty = min(flagging_impact, max_penalty)
        
        adjusted = base_reputation * (1 - penalty)
        
        return max(0.0, adjusted)
    
    def batch_compute_flagged_reputation(
        self, 
        user_dids: list
    ) -> Dict[str, Dict[str, Any]]:
        """
        Compute flagged reputation for multiple users
        
        Args:
            user_dids: List of user DIDs
            
        Returns:
            Dictionary mapping user_did to reputation results
        """
        results = {}
        
        for user_did in user_dids:
            try:
                results[user_did] = self.compute_flagged_reputation(user_did)
            except Exception as e:
                print(f"Error computing flagged reputation for {user_did}: {e}")
                results[user_did] = {
                    "user_did": user_did,
                    "error": str(e)
                }
        
        return results

