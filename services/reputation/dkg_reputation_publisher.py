#!/usr/bin/env python3
"""
DKG Reputation Publisher
Publish comprehensive reputation snapshots to OriginTrail DKG
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib


class DKGReputationPublisher:
    """Publish reputation snapshots to DKG"""
    
    def __init__(self, dkg_node_config: Optional[Dict[str, Any]] = None):
        """
        Initialize DKG publisher
        
        Args:
            dkg_node_config: DKG node configuration (optional, for real integration)
        """
        self.dkg_config = dkg_node_config
        self.mock_mode = dkg_node_config is None
    
    def publish_reputation_snapshot(
        self,
        reputation_data: Dict[str, Dict[str, Any]],
        analysis_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Publish comprehensive reputation snapshot to DKG
        
        Args:
            reputation_data: Dictionary of user_did -> reputation results
            analysis_metadata: Metadata about the analysis (period, parameters, etc.)
            
        Returns:
            Publishing result with UAL, transaction hash, etc.
        """
        snapshot_asset = self.create_reputation_snapshot_asset(reputation_data, analysis_metadata)
        
        if self.mock_mode:
            return self.mock_publish(snapshot_asset)
        else:
            return self.real_publish(snapshot_asset)
    
    def create_reputation_snapshot_asset(
        self,
        reputation_data: Dict[str, Dict[str, Any]],
        analysis_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create JSON-LD reputation snapshot asset"""
        
        timestamp = datetime.now()
        snapshot_id = f"reputation:snapshot:{timestamp.strftime('%Y%m%d_%H%M%S')}"
        
        # Calculate graph hash for provenance
        graph_hash = self.calculate_graph_hash(reputation_data)
        
        snapshot_asset = {
            "@context": [
                "https://schema.org/",
                "https://origintrail.io/schemas/reputation/v1",
                "https://umanitek.ai/schemas/verification/v1"
            ],
            "@type": "ReputationSnapshot",
            "@id": f"ual:dkg:{snapshot_id}",
            "creator": "did:dkg:social-reputation-engine:001",
            "timestamp": timestamp.isoformat(),
            "analysisPeriod": analysis_metadata.get("period", "unknown"),
            "computationMethod": {
                "algorithm": "TrustWeightedMultiDimensional",
                "version": "2.0",
                "parameters": analysis_metadata.get("parameters", {})
            },
            "reputationScores": self.format_reputation_scores(reputation_data),
            "sybilAnalysis": {
                "totalUsersAnalyzed": analysis_metadata.get("user_count", len(reputation_data)),
                "suspectedSybilClusters": analysis_metadata.get("sybil_clusters", 0),
                "averageSybilRisk": analysis_metadata.get("avg_risk", 0.0),
                "detectionConfidence": analysis_metadata.get("detection_confidence", 0.0)
            },
            "guardianIntegration": {
                "contentVerified": analysis_metadata.get("content_verified", 0),
                "averageConfidence": analysis_metadata.get("avg_confidence", 0.0),
                "verificationMethod": "Umanitek Guardian AI Agent"
            },
            "provenance": {
                "inputGraphHash": graph_hash,
                "computationProof": analysis_metadata.get("computation_proof", ""),
                "guardianEvidence": analysis_metadata.get("guardian_evidence", [])
            }
        }
        
        return snapshot_asset
    
    def format_reputation_scores(self, reputation_data: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format reputation scores for DKG asset"""
        formatted = []
        
        for user_did, rep_result in reputation_data.items():
            formatted.append({
                "@type": "ReputationScore",
                "user": user_did,
                "finalReputation": rep_result.get("final_reputation", 0.0),
                "componentScores": rep_result.get("component_scores", {}),
                "riskFactors": rep_result.get("risk_factors", {}),
                "sybilPenalty": rep_result.get("sybil_penalty", 0.0),
                "confidence": rep_result.get("confidence", 0.0),
                "timestamp": rep_result.get("timestamp", datetime.now().isoformat())
            })
        
        return formatted
    
    def calculate_graph_hash(self, reputation_data: Dict[str, Dict[str, Any]]) -> str:
        """Calculate hash of input graph data for provenance"""
        # Create deterministic hash from reputation data
        data_str = json.dumps(reputation_data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()
    
    def real_publish(self, asset: Dict[str, Any]) -> Dict[str, Any]:
        """Publish to real DKG node"""
        # In real implementation, would use DKG SDK
        # For now, return mock result
        return self.mock_publish(asset)
    
    def mock_publish(self, asset: Dict[str, Any]) -> Dict[str, Any]:
        """Mock publishing (for demo/testing)"""
        snapshot_id = asset.get("@id", "ual:dkg:reputation:snapshot:unknown")
        
        return {
            "ual": snapshot_id,
            "transaction_hash": f"0x{hashlib.sha256(snapshot_id.encode()).hexdigest()[:64]}",
            "timestamp": datetime.now().isoformat(),
            "simulated": True,
            "asset": asset
        }
    
    def get_analysis_metadata(
        self,
        graph_size: int,
        reputation_results: Dict[str, Dict[str, Any]],
        sybil_clusters: int = 0
    ) -> Dict[str, Any]:
        """Generate analysis metadata"""
        # Calculate average risk
        risks = [r.get("risk_factors", {}).get("overall_risk", 0.0) for r in reputation_results.values()]
        avg_risk = sum(risks) / len(risks) if risks else 0.0
        
        # Count content verifications
        content_verified = sum(
            1 for r in reputation_results.values()
            if r.get("component_scores", {}).get("content_quality", {}).get("verified_content_ratio", 0) > 0
        )
        
        # Calculate average confidence
        confidences = [
            r.get("component_scores", {}).get("content_quality", {}).get("average_confidence", 0.0)
            for r in reputation_results.values()
            if r.get("component_scores", {}).get("content_quality", {}).get("average_confidence", 0) > 0
        ]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        return {
            "period": f"{datetime.now().strftime('%Y-%m-%d')}",
            "user_count": graph_size,
            "sybil_clusters": sybil_clusters,
            "avg_risk": avg_risk,
            "detection_confidence": 0.85,  # Placeholder
            "content_verified": content_verified,
            "avg_confidence": avg_confidence,
            "parameters": {
                "alpha": 0.25,
                "sybil_threshold": 0.6,
                "guardian_enabled": True
            },
            "computation_proof": f"proof_{hashlib.sha256(str(reputation_results).encode()).hexdigest()[:16]}",
            "guardian_evidence": []
        }

