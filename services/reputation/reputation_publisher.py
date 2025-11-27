#!/usr/bin/env python3
"""
Reputation Publisher
Publishes reputation scores as DKG Knowledge Assets with JSON-LD schema
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import json


class ReputationPublisher:
    """Publish reputation scores as DKG Knowledge Assets"""
    
    def __init__(self, dkg_client=None):
        """
        Initialize reputation publisher
        
        Args:
            dkg_client: Optional DKG client instance (if None, returns JSON-LD only)
        """
        self.dkg_client = dkg_client
    
    def publish_reputation_snapshot(
        self,
        reputation_data: List[Dict[str, Any]],
        computation_method: Optional[Dict[str, Any]] = None,
        creator_did: str = "did:dkg:reputation-engine:001"
    ) -> Dict[str, Any]:
        """
        Publish reputation scores as DKG Knowledge Asset
        
        Args:
            reputation_data: List of reputation results from compute_comprehensive_reputation
            computation_method: Optional method metadata
            creator_did: DID of the reputation engine
            
        Returns:
            Dictionary with UAL and publication details
        """
        if computation_method is None:
            computation_method = {
                "algorithm": "TrustWeightedMultiDimensional",
                "version": "2.1",
                "parameters": {
                    "damping_factor": 0.85,
                    "sybil_weight": 0.3,
                    "content_quality_weight": 0.25
                }
            }
        
        # Build JSON-LD snapshot
        snapshot_asset = self._build_reputation_snapshot_jsonld(
            reputation_data,
            computation_method,
            creator_did
        )
        
        # Publish to DKG if client available
        if self.dkg_client:
            try:
                result = self.dkg_client.publishReputationAsset({
                    "developerId": f"reputation_snapshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    "reputationScore": 0,  # Snapshot doesn't have a single score
                    "contributions": [],
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "metadata": snapshot_asset
                })
                return {
                    "ual": result.get("UAL"),
                    "transaction_hash": result.get("transactionHash"),
                    "snapshot_data": snapshot_asset
                }
            except Exception as e:
                print(f"Error publishing to DKG: {e}")
                return {
                    "ual": None,
                    "error": str(e),
                    "snapshot_data": snapshot_asset
                }
        else:
            # Return JSON-LD only
            return {
                "ual": None,
                "snapshot_data": snapshot_asset
            }
    
    def _build_reputation_snapshot_jsonld(
        self,
        reputation_data: List[Dict[str, Any]],
        computation_method: Dict[str, Any],
        creator_did: str
    ) -> Dict[str, Any]:
        """Build JSON-LD structure for reputation snapshot"""
        timestamp = datetime.now().isoformat()
        snapshot_id = f"ual:dkg:reputation:{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Calculate Sybil analysis statistics
        high_risk_users = [r for r in reputation_data if r.get("risks", {}).get("overall_risk", 0) > 0.7]
        avg_sybil_risk = sum(
            r.get("risks", {}).get("overall_risk", 0) 
            for r in reputation_data
        ) / len(reputation_data) if reputation_data else 0.0
        
        snapshot = {
            "@context": [
                "https://schema.org/",
                "https://origintrail.io/schemas/reputation/v1",
                "https://umanitek.ai/schemas/verification/v1"
            ],
            "@type": "ReputationSnapshot",
            "@id": snapshot_id,
            "creator": creator_did,
            "timestamp": timestamp,
            "computationMethod": {
                "@type": "ReputationComputationMethod",
                "algorithm": computation_method.get("algorithm", "Unknown"),
                "version": computation_method.get("version", "1.0"),
                "parameters": computation_method.get("parameters", {})
            },
            "reputationScores": [
                {
                    "@type": "ReputationScore",
                    "user": score.get("user") or score.get("user_did", "unknown"),
                    "overallScore": score.get("overall_reputation") or score.get("final_reputation", 0.0),
                    "componentScores": {
                        "structural": score.get("scores", {}).get("structural", {}).get("combined", 0.0),
                        "behavioral": score.get("scores", {}).get("behavioral", {}).get("combined", 0.0),
                        "contentQuality": score.get("scores", {}).get("content_quality", {}).get("combined", 0.5),
                        "economic": score.get("scores", {}).get("economic", {}).get("combined", 0.0),
                        "temporal": score.get("scores", {}).get("temporal", {}).get("combined", 0.5)
                    },
                    "sybilRisk": score.get("risks", {}).get("overall_risk", 0.0),
                    "confidence": score.get("confidence", 0.5),
                    "timestamp": score.get("timestamp", timestamp)
                }
                for score in reputation_data
            ],
            "sybilAnalysis": {
                "@type": "SybilAnalysis",
                "totalUsersAnalyzed": len(reputation_data),
                "highRiskUsers": len(high_risk_users),
                "averageSybilRisk": avg_sybil_risk,
                "riskDistribution": self._calculate_risk_distribution(reputation_data)
            },
            "statistics": {
                "@type": "ReputationStatistics",
                "totalUsers": len(reputation_data),
                "averageReputation": sum(
                    s.get("overall_reputation") or s.get("final_reputation", 0.0)
                    for s in reputation_data
                ) / len(reputation_data) if reputation_data else 0.0,
                "medianReputation": self._calculate_median_reputation(reputation_data),
                "percentiles": self._calculate_percentiles(reputation_data)
            }
        }
        
        return snapshot
    
    def _calculate_risk_distribution(self, reputation_data: List[Dict[str, Any]]) -> Dict[str, int]:
        """Calculate distribution of risk levels"""
        distribution = {
            "minimal": 0,  # < 0.2
            "low": 0,      # 0.2-0.4
            "medium": 0,   # 0.4-0.6
            "high": 0,     # 0.6-0.8
            "critical": 0  # >= 0.8
        }
        
        for score in reputation_data:
            risk = score.get("risks", {}).get("overall_risk", 0.0)
            if risk >= 0.8:
                distribution["critical"] += 1
            elif risk >= 0.6:
                distribution["high"] += 1
            elif risk >= 0.4:
                distribution["medium"] += 1
            elif risk >= 0.2:
                distribution["low"] += 1
            else:
                distribution["minimal"] += 1
        
        return distribution
    
    def _calculate_median_reputation(self, reputation_data: List[Dict[str, Any]]) -> float:
        """Calculate median reputation score"""
        if not reputation_data:
            return 0.0
        
        scores = sorted([
            s.get("overall_reputation") or s.get("final_reputation", 0.0)
            for s in reputation_data
        ])
        
        n = len(scores)
        if n % 2 == 0:
            return (scores[n // 2 - 1] + scores[n // 2]) / 2.0
        else:
            return scores[n // 2]
    
    def _calculate_percentiles(
        self, 
        reputation_data: List[Dict[str, Any]], 
        percentiles: List[int] = [25, 50, 75, 90, 95, 99]
    ) -> Dict[str, float]:
        """Calculate reputation percentiles"""
        if not reputation_data:
            return {}
        
        scores = sorted([
            s.get("overall_reputation") or s.get("final_reputation", 0.0)
            for s in reputation_data
        ])
        
        result = {}
        n = len(scores)
        
        for p in percentiles:
            index = int(n * p / 100)
            index = min(index, n - 1)
            result[f"p{p}"] = scores[index]
        
        return result

