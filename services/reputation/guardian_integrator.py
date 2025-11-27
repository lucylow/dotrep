#!/usr/bin/env python3
"""
Umanitek Guardian Integration
Content verification pipeline with mock and real API support
"""

import os
import requests
from typing import Dict, Any, Optional, List
from datetime import datetime
import hashlib


class GuardianIntegrator:
    """Umanitek Guardian API integration for content verification"""
    
    def __init__(self, api_endpoint: Optional[str] = None, api_key: Optional[str] = None, mock_mode: bool = True):
        """
        Initialize Guardian integrator
        
        Args:
            api_endpoint: Guardian API endpoint URL
            api_key: API key for authentication
            mock_mode: If True, use mock responses instead of real API
        """
        self.api_endpoint = api_endpoint or os.getenv(
            "UMANITEK_GUARDIAN_API_URL",
            "https://api.umanitek.ai/v1"
        )
        self.api_key = api_key or os.getenv("UMANITEK_GUARDIAN_API_KEY")
        self.mock_mode = mock_mode or os.getenv("GUARDIAN_USE_MOCK", "true").lower() == "true"
        self.fallback_to_mock = os.getenv("GUARDIAN_FALLBACK_TO_MOCK", "true").lower() == "true"
    
    def verify_content(
        self,
        content_fingerprint: str,
        content_type: str = "text",
        check_type: str = "all"
    ) -> Dict[str, Any]:
        """
        Verify content through Umanitek Guardian
        
        Args:
            content_fingerprint: Content fingerprint hash
            content_type: Type of content ('image', 'video', 'text')
            check_type: Type of check ('deepfake', 'csam', 'misinformation', 'illicit', 'all')
            
        Returns:
            Verification result with status, confidence, matches, etc.
        """
        if self.mock_mode or (not self.api_key and self.fallback_to_mock):
            return self.mock_guardian_verification(content_fingerprint, content_type, check_type)
        else:
            try:
                return self.real_guardian_verification(content_fingerprint, content_type, check_type)
            except Exception as e:
                if self.fallback_to_mock:
                    print(f"Guardian API error, falling back to mock: {e}")
                    return self.mock_guardian_verification(content_fingerprint, content_type, check_type)
                else:
                    raise
    
    def real_guardian_verification(
        self,
        fingerprint: str,
        content_type: str,
        check_type: str
    ) -> Dict[str, Any]:
        """Real Umanitek Guardian API integration"""
        try:
            # 1. Submit fingerprint
            fp_response = requests.post(
                f"{self.api_endpoint}/fingerprints",
                json={
                    "fingerprint": fingerprint,
                    "type": content_type,
                    "source": "social_graph_reputation_system"
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                timeout=30
            )
            fp_response.raise_for_status()
            fp_data = fp_response.json()
            fp_id = fp_data.get("fingerprintId")
            
            if not fp_id:
                raise ValueError("No fingerprintId returned from Guardian API")
            
            # 2. Request match analysis
            match_response = requests.post(
                f"{self.api_endpoint}/match",
                json={
                    "fingerprintId": fp_id,
                    "maxResults": 5,
                    "checkType": check_type
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                timeout=30
            )
            match_response.raise_for_status()
            match_data = match_response.json()
            matches = match_data.get("matches", [])
            
            # 3. Process results
            if matches:
                top_match = matches[0]
                confidence = top_match.get("confidence", 0.0)
                match_type = top_match.get("matchType", "unknown")
                
                verification_result = {
                    "status": "flagged" if confidence > 0.5 else "verified",
                    "confidence": confidence,
                    "match_type": match_type,
                    "evidence": matches,
                    "recommended_action": self.determine_action(matches, confidence),
                    "fingerprint": fingerprint,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                verification_result = {
                    "status": "verified",
                    "confidence": 0.0,
                    "match_type": "none",
                    "evidence": [],
                    "recommended_action": "no_action",
                    "fingerprint": fingerprint,
                    "timestamp": datetime.now().isoformat()
                }
            
            return verification_result
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Guardian API request failed: {e}")
        except Exception as e:
            raise Exception(f"Guardian verification error: {e}")
    
    def mock_guardian_verification(
        self,
        fingerprint: str,
        content_type: str,
        check_type: str
    ) -> Dict[str, Any]:
        """
        Mock Guardian responses for demo purposes
        
        Uses deterministic but varied responses based on fingerprint hash
        """
        # Simulate different verification scenarios
        scenarios = [
            {
                "confidence": 0.92,
                "match_type": "exact",
                "action": "flag_high_risk",
                "description": "Exact match found - high confidence harmful content"
            },
            {
                "confidence": 0.45,
                "match_type": "near",
                "action": "monitor",
                "description": "Near match - moderate confidence, requires monitoring"
            },
            {
                "confidence": 0.15,
                "match_type": "none",
                "action": "no_action",
                "description": "No match found - content appears clean"
            },
            {
                "confidence": 0.78,
                "match_type": "manipulated",
                "action": "flag_medium_risk",
                "description": "Manipulated content detected - medium confidence"
            },
            {
                "confidence": 0.05,
                "match_type": "none",
                "action": "no_action",
                "description": "Clean content - very low risk"
            }
        ]
        
        # Deterministic but varied response based on fingerprint
        # Use hash to select scenario consistently
        hash_value = int(hashlib.md5(fingerprint.encode()).hexdigest(), 16)
        scenario_index = hash_value % len(scenarios)
        scenario = scenarios[scenario_index]
        
        # Add some randomness based on content type
        if content_type == "video":
            scenario["confidence"] = min(1.0, scenario["confidence"] * 1.1)
        elif content_type == "text":
            scenario["confidence"] = scenario["confidence"] * 0.9
        
        matches = []
        if scenario["confidence"] > 0.3:
            matches.append({
                "matchId": f"mock_{fingerprint[:8]}_{scenario_index}",
                "confidence": scenario["confidence"],
                "matchType": scenario["match_type"],
                "sourceUAL": f"ual:dkg:guardian:match:{hash_value}",
                "timestamp": datetime.now().isoformat()
            })
        
        return {
            "status": "flagged" if scenario["confidence"] > 0.5 else "verified",
            "confidence": scenario["confidence"],
            "match_type": scenario["match_type"],
            "evidence": matches,
            "recommended_action": scenario["action"],
            "fingerprint": fingerprint,
            "timestamp": datetime.now().isoformat(),
            "description": scenario["description"],
            "mock": True
        }
    
    def determine_action(self, matches: List[Dict[str, Any]], confidence: float) -> str:
        """
        Determine recommended action based on matches and confidence
        
        Args:
            matches: List of match results
            confidence: Overall confidence score
            
        Returns:
            Recommended action: 'flag_high_risk', 'flag_medium_risk', 'monitor', 'no_action'
        """
        if not matches:
            return "no_action"
        
        top_match = matches[0]
        match_type = top_match.get("matchType", "unknown")
        match_confidence = top_match.get("confidence", confidence)
        
        # High confidence severe violations
        if match_confidence > 0.85 and match_type in ["exact", "csam", "illicit"]:
            return "flag_high_risk"
        
        # Medium confidence or manipulated content
        if match_confidence > 0.6:
            if match_type == "manipulated":
                return "flag_medium_risk"
            else:
                return "monitor"
        
        # Low confidence
        if match_confidence > 0.3:
            return "monitor"
        
        return "no_action"
    
    def map_guardian_confidence_to_quality(self, confidence: float, match_type: str) -> float:
        """
        Map Guardian verification confidence to quality score
        
        Args:
            confidence: Guardian confidence score (0-1)
            match_type: Type of match ('exact', 'near', 'manipulated', 'none')
            
        Returns:
            Quality score (0-1), where 1.0 is highest quality (clean content)
        """
        if match_type == "exact" or match_type == "manipulated":
            # High confidence match = low quality (harmful content)
            return 1.0 - confidence
        elif match_type == "near":
            # Near match = medium quality concern
            return 1.0 - (confidence * 0.5)
        else:
            # No match = high quality (clean content)
            return confidence if confidence > 0 else 0.8  # Default to good quality if no match
    
    def health_check(self) -> Dict[str, Any]:
        """Check Guardian API health"""
        if self.mock_mode:
            return {
                "status": "healthy",
                "mode": "mock",
                "message": "Mock mode active"
            }
        
        try:
            response = requests.get(
                f"{self.api_endpoint}/health",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=5
            )
            response.raise_for_status()
            return {
                "status": "healthy",
                "mode": "real",
                "message": "Guardian API is accessible"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "mode": "real",
                "error": str(e),
                "message": "Guardian API is not accessible"
            }

