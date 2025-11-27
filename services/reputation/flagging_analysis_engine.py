#!/usr/bin/env python3
"""
Flagging Analysis Engine
Advanced coordination detection and flagging pattern analysis for user-flagging relationships
"""

import networkx as nx
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import statistics


class FlaggingAnalysisEngine:
    """Advanced flagging pattern analysis with coordination detection"""
    
    def __init__(self, graph: nx.DiGraph, reputation_engine=None):
        """
        Initialize flagging analysis engine
        
        Args:
            graph: NetworkX graph of user relationships
            reputation_engine: Optional reputation engine for credibility scoring
        """
        self.graph = graph
        self.reputation_engine = reputation_engine
        self.flags: List[Dict[str, Any]] = []
        
    def add_flag(self, flag: Dict[str, Any]):
        """Add a flag to the analysis engine"""
        self.flags.append(flag)
    
    def analyze_flagging_patterns(
        self, 
        target_user_did: str, 
        time_window_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Analyze flagging behavior around a specific user
        
        Args:
            target_user_did: DID of the target user
            time_window_hours: Time window for analysis
            
        Returns:
            Comprehensive flagging analysis
        """
        analysis = {
            "target_user": target_user_did,
            "time_window": time_window_hours,
            "flagging_metrics": {},
            "coordination_signals": {},
            "risk_assessment": {}
        }
        
        # Get recent flags targeting this user
        recent_flags = self.get_recent_flags(target_user_did, time_window_hours)
        
        # Basic flagging metrics
        analysis["flagging_metrics"] = self.calculate_flagging_metrics(recent_flags)
        
        # Coordination detection
        analysis["coordination_signals"] = self.detect_coordinated_flagging(recent_flags)
        
        # Reporter credibility analysis
        analysis["reporter_analysis"] = self.analyze_reporters_credibility(recent_flags)
        
        # Overall risk assessment
        analysis["risk_assessment"] = self.assess_flagging_risk(analysis)
        
        return analysis
    
    def get_recent_flags(
        self, 
        target_user_did: str, 
        time_window_hours: int
    ) -> List[Dict[str, Any]]:
        """Get recent flags for a target user"""
        cutoff_time = datetime.now() - timedelta(hours=time_window_hours)
        
        return [
            flag for flag in self.flags
            if flag.get("flag_target") == target_user_did
            and datetime.fromtimestamp(flag.get("timestamp", 0) / 1000) >= cutoff_time
        ]
    
    def calculate_flagging_metrics(
        self, 
        flags: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate basic flagging metrics"""
        if not flags:
            return {
                "total_flags": 0,
                "unique_reporters": 0,
                "flag_type_distribution": {},
                "average_confidence": 0.0,
                "average_reporter_reputation": 0.0
            }
        
        unique_reporters = set(flag.get("flag_actor") for flag in flags)
        
        flag_type_distribution = defaultdict(int)
        for flag in flags:
            flag_type_distribution[flag.get("flag_type", "UNKNOWN")] += 1
        
        average_confidence = statistics.mean([
            flag.get("confidence", 0.0) for flag in flags
        ])
        
        average_reporter_reputation = statistics.mean([
            flag.get("reporter_reputation", 0.0) for flag in flags
        ])
        
        return {
            "total_flags": len(flags),
            "unique_reporters": len(unique_reporters),
            "flag_type_distribution": dict(flag_type_distribution),
            "average_confidence": average_confidence,
            "average_reporter_reputation": average_reporter_reputation
        }
    
    def detect_coordinated_flagging(
        self, 
        flags: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect patterns suggesting coordinated flagging attacks"""
        coordination_signals = {}
        
        if not flags:
            return coordination_signals
        
        # Temporal clustering analysis
        coordination_signals["temporal_clustering"] = self.analyze_temporal_patterns(flags)
        
        # Reporter graph analysis
        coordination_signals["reporter_connections"] = self.analyze_reporter_relationships(flags)
        
        # Behavioral similarity
        coordination_signals["behavioral_similarity"] = self.analyze_reporter_behavior_similarity(flags)
        
        # Content pattern analysis
        coordination_signals["content_patterns"] = self.analyze_flag_content_patterns(flags)
        
        # Overall coordination score
        coordination_signals["overall_coordination_score"] = self.calculate_overall_coordination(
            coordination_signals
        )
        
        return coordination_signals
    
    def analyze_temporal_patterns(
        self, 
        flags: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect unusual temporal patterns in flagging"""
        timestamps = sorted([
            datetime.fromtimestamp(flag.get("timestamp", 0) / 1000)
            for flag in flags
        ])
        
        if len(timestamps) < 2:
            return {
                "score": 0.0,
                "pattern": "insufficient_data",
                "burst_score": 0.0,
                "regularity_score": 0.0,
                "total_flags": len(flags),
                "time_span_hours": 0.0
            }
        
        # Calculate time differences between consecutive flags
        time_diffs = []
        for i in range(1, len(timestamps)):
            diff = (timestamps[i] - timestamps[i-1]).total_seconds()
            time_diffs.append(diff)
        
        # Check for burst patterns (many flags in short time)
        burst_threshold = 300  # 5 minutes
        burst_flags = sum(1 for diff in time_diffs if diff <= burst_threshold)
        burst_score = burst_flags / len(time_diffs) if time_diffs else 0.0
        
        # Check for regular patterns (automated behavior)
        regularity_score = self.calculate_temporal_regularity(time_diffs)
        
        time_span_hours = (max(timestamps) - min(timestamps)).total_seconds() / 3600
        
        return {
            "burst_score": burst_score,
            "regularity_score": regularity_score,
            "total_flags": len(flags),
            "time_span_hours": time_span_hours
        }
    
    def calculate_temporal_regularity(
        self, 
        time_diffs: List[float]
    ) -> float:
        """Calculate how regular the temporal pattern is"""
        if not time_diffs or len(time_diffs) < 2:
            return 0.0
        
        avg_diff = statistics.mean(time_diffs)
        if avg_diff == 0:
            return 1.0  # Perfect regularity (all at once)
        
        std_dev = statistics.stdev(time_diffs) if len(time_diffs) > 1 else 0.0
        coefficient_of_variation = std_dev / avg_diff if avg_diff > 0 else 0.0
        
        # Lower CV = more regular
        regularity_score = max(0.0, 1.0 - coefficient_of_variation)
        
        return regularity_score
    
    def analyze_reporter_relationships(
        self, 
        flags: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze social connections between flagging users"""
        reporter_dids = list(set(flag.get("flag_actor") for flag in flags))
        
        if len(reporter_dids) < 2:
            return {
                "score": 0.0,
                "pattern": "insufficient_reporters",
                "reporter_network_density": 0.0,
                "max_clique_size": 1,
                "clique_coordination_score": 0.0,
                "unique_reporters": len(reporter_dids)
            }
        
        # Get subgraph of reporters
        reporter_nodes = [did for did in reporter_dids if did in self.graph]
        
        if len(reporter_nodes) < 2:
            return {
                "reporter_network_density": 0.0,
                "max_clique_size": 1,
                "clique_coordination_score": 0.0,
                "unique_reporters": len(reporter_dids)
            }
        
        # Create subgraph
        reporter_subgraph = self.graph.subgraph(reporter_nodes).to_undirected()
        
        # Calculate graph density
        density = nx.density(reporter_subgraph) if len(reporter_subgraph) > 1 else 0.0
        
        # Check for cliques or tightly connected groups
        cliques = list(nx.find_cliques(reporter_subgraph))
        max_clique_size = max(len(clique) for clique in cliques) if cliques else 1
        clique_score = max_clique_size / len(reporter_dids) if reporter_dids else 0.0
        
        return {
            "reporter_network_density": density,
            "max_clique_size": max_clique_size,
            "clique_coordination_score": clique_score,
            "unique_reporters": len(reporter_dids)
        }
    
    def analyze_reporter_behavior_similarity(
        self, 
        flags: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze behavioral similarity between reporters"""
        # Group flags by reporter
        reporter_flags = defaultdict(list)
        for flag in flags:
            reporter_flags[flag.get("flag_actor")].append(flag)
        
        if len(reporter_flags) < 2:
            return {
                "similarity_score": 0.0,
                "pattern_matches": 0
            }
        
        # Compare flag types and confidence levels
        reporters = list(reporter_flags.keys())
        pattern_matches = 0
        total_comparisons = 0
        
        for i in range(len(reporters)):
            for j in range(i + 1, len(reporters)):
                flags_i = reporter_flags[reporters[i]]
                flags_j = reporter_flags[reporters[j]]
                
                # Check if they flag similar types
                types_i = set(flag.get("flag_type") for flag in flags_i)
                types_j = set(flag.get("flag_type") for flag in flags_j)
                common_types = types_i.intersection(types_j)
                
                if common_types:
                    pattern_matches += 1
                
                total_comparisons += 1
        
        similarity_score = pattern_matches / total_comparisons if total_comparisons > 0 else 0.0
        
        return {
            "similarity_score": similarity_score,
            "pattern_matches": pattern_matches
        }
    
    def analyze_flag_content_patterns(
        self, 
        flags: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze content patterns in flag descriptions"""
        descriptions = [
            flag.get("description", "").lower()
            for flag in flags
            if flag.get("description")
        ]
        
        if not descriptions:
            return {
                "pattern_score": 0.0,
                "common_patterns": []
            }
        
        # Extract common words
        word_counts = defaultdict(int)
        for desc in descriptions:
            words = desc.split()
            for word in words:
                if len(word) > 3:  # Ignore short words
                    word_counts[word] += 1
        
        # Find common patterns (words appearing in multiple flags)
        common_patterns = [
            word for word, count in word_counts.items()
            if count >= 2
        ][:5]
        
        pattern_score = min(1.0, len(common_patterns) / 5.0) if common_patterns else 0.0
        
        return {
            "pattern_score": pattern_score,
            "common_patterns": common_patterns
        }
    
    def calculate_overall_coordination(
        self, 
        coordination_signals: Dict[str, Any]
    ) -> float:
        """Calculate overall coordination score from all signals"""
        scores = []
        weights = []
        
        # Temporal clustering
        if "temporal_clustering" in coordination_signals:
            tc = coordination_signals["temporal_clustering"]
            scores.append(tc.get("burst_score", 0.0))
            weights.append(0.3)
        
        # Reporter connections
        if "reporter_connections" in coordination_signals:
            rc = coordination_signals["reporter_connections"]
            scores.append(rc.get("clique_coordination_score", 0.0))
            weights.append(0.4)
        
        # Behavioral similarity
        if "behavioral_similarity" in coordination_signals:
            bs = coordination_signals["behavioral_similarity"]
            scores.append(bs.get("similarity_score", 0.0))
            weights.append(0.2)
        
        # Content patterns
        if "content_patterns" in coordination_signals:
            cp = coordination_signals["content_patterns"]
            scores.append(cp.get("pattern_score", 0.0))
            weights.append(0.1)
        
        if not scores:
            return 0.0
        
        # Weighted average
        total_weight = sum(weights)
        if total_weight == 0:
            return 0.0
        
        overall_score = sum(s * w for s, w in zip(scores, weights)) / total_weight
        
        return min(1.0, overall_score)
    
    def analyze_reporters_credibility(
        self, 
        flags: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze credibility of flagging users"""
        if not flags:
            return {
                "credible_reporters": 0,
                "low_reputation_reporters": 0,
                "average_reporter_reputation": 0.0,
                "reporter_diversity": 0.0
            }
        
        reporter_reputations = [
            flag.get("reporter_reputation", 0.0) for flag in flags
        ]
        
        average_reporter_reputation = statistics.mean(reporter_reputations)
        credible_reporters = sum(1 for r in reporter_reputations if r >= 0.7)
        low_reputation_reporters = sum(1 for r in reporter_reputations if r < 0.3)
        
        unique_reporters = len(set(flag.get("flag_actor") for flag in flags))
        reporter_diversity = unique_reporters / len(flags) if flags else 0.0
        
        return {
            "credible_reporters": credible_reporters,
            "low_reputation_reporters": low_reputation_reporters,
            "average_reporter_reputation": average_reporter_reputation,
            "reporter_diversity": reporter_diversity
        }
    
    def assess_flagging_risk(
        self, 
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess overall risk from flagging patterns"""
        risk_assessment = {}
        
        flagging_metrics = analysis.get("flagging_metrics", {})
        coordination_signals = analysis.get("coordination_signals", {})
        reporter_analysis = analysis.get("reporter_analysis", {})
        
        # Coordination mitigation reduces impact
        coordination_mitigation = 1.0 - coordination_signals.get(
            "overall_coordination_score", 0.0
        )
        
        # Legitimate flag risk based on credible reporters
        unique_reporters = flagging_metrics.get("unique_reporters", 1)
        credible_reporters = reporter_analysis.get("credible_reporters", 0)
        credible_reporter_ratio = credible_reporters / unique_reporters if unique_reporters > 0 else 0.0
        
        average_confidence = flagging_metrics.get("average_confidence", 0.0)
        legitimate_flag_risk = average_confidence * credible_reporter_ratio * 0.6
        
        # Credible reporter impact
        avg_reporter_rep = reporter_analysis.get("average_reporter_reputation", 0.0)
        credible_impact_weight = 0.8 if avg_reporter_rep >= 0.7 else 0.4
        credible_reporter_impact = average_confidence * credible_impact_weight * 0.4
        
        # Overall risk
        overall_risk = (
            legitimate_flag_risk + credible_reporter_impact
        ) * coordination_mitigation
        
        risk_assessment = {
            "legitimate_flag_risk": legitimate_flag_risk,
            "credible_reporter_impact": credible_reporter_impact,
            "coordination_mitigation": coordination_mitigation,
            "overall_risk": min(1.0, overall_risk)
        }
        
        return risk_assessment
    
    def generate_flagging_insights(
        self, 
        time_window_hours: int = 24
    ) -> Dict[str, Any]:
        """Generate insights about flagging patterns across the network"""
        cutoff_time = datetime.now() - timedelta(hours=time_window_hours)
        recent_flags = [
            flag for flag in self.flags
            if datetime.fromtimestamp(flag.get("timestamp", 0) / 1000) >= cutoff_time
        ]
        
        insights = {
            "time_window": time_window_hours,
            "summary_metrics": self.calculate_summary_metrics(recent_flags),
            "coordination_alerts": self.detect_coordination_alerts(recent_flags),
            "top_flagged_users": self.analyze_top_flagged(recent_flags),
            "reporter_analysis": self.analyze_reporter_behavior(recent_flags)
        }
        
        return insights
    
    def calculate_summary_metrics(
        self, 
        flags: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate summary metrics for all flags"""
        if not flags:
            return {
                "total_flags": 0,
                "unique_targets": 0,
                "unique_reporters": 0,
                "average_confidence": 0.0,
                "resolution_rate": 0.0
            }
        
        unique_targets = len(set(flag.get("flag_target") for flag in flags))
        unique_reporters = len(set(flag.get("flag_actor") for flag in flags))
        average_confidence = statistics.mean([
            flag.get("confidence", 0.0) for flag in flags
        ])
        
        resolved_flags = sum(1 for flag in flags if flag.get("status") == "resolved")
        resolution_rate = resolved_flags / len(flags) if flags else 0.0
        
        return {
            "total_flags": len(flags),
            "unique_targets": unique_targets,
            "unique_reporters": unique_reporters,
            "average_confidence": average_confidence,
            "resolution_rate": resolution_rate
        }
    
    def detect_coordination_alerts(
        self, 
        flags: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Detect and alert on coordinated flagging patterns"""
        alerts = []
        
        # Group flags by target user
        flags_by_target = defaultdict(list)
        for flag in flags:
            flags_by_target[flag.get("flag_target")].append(flag)
        
        # Analyze each target for coordination
        for target, target_flags in flags_by_target.items():
            if len(target_flags) >= 3:  # Minimum for coordination analysis
                analysis = self.analyze_flagging_patterns(target, 24)
                coordination_score = analysis["coordination_signals"].get(
                    "overall_coordination_score", 0.0
                )
                
                if coordination_score > 0.7:
                    alerts.append({
                        "target_user": target,
                        "flag_count": len(target_flags),
                        "coordination_score": coordination_score,
                        "pattern_type": self.identify_coordination_pattern(analysis),
                        "risk_level": "high" if coordination_score > 0.8 else "medium",
                        "recommended_action": "investigate_coordination"
                    })
        
        return alerts
    
    def identify_coordination_pattern(
        self, 
        analysis: Dict[str, Any]
    ) -> str:
        """Identify the type of coordination pattern"""
        signals = analysis.get("coordination_signals", {})
        
        if signals.get("temporal_clustering", {}).get("burst_score", 0) > 0.7:
            return "temporal_burst"
        
        if signals.get("reporter_connections", {}).get("clique_coordination_score", 0) > 0.7:
            return "reporter_clique"
        
        if signals.get("behavioral_similarity", {}).get("similarity_score", 0) > 0.7:
            return "behavioral_similarity"
        
        return "mixed_pattern"
    
    def analyze_top_flagged(
        self, 
        flags: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Analyze top flagged users"""
        flags_by_target = defaultdict(list)
        for flag in flags:
            flags_by_target[flag.get("flag_target")].append(flag)
        
        top_flagged = []
        for target, target_flags in flags_by_target.items():
            avg_confidence = statistics.mean([
                flag.get("confidence", 0.0) for flag in target_flags
            ])
            
            # Determine severity
            severities = [flag.get("severity", "low") for flag in target_flags]
            severity_weights = {"critical": 4, "high": 3, "medium": 2, "low": 1}
            avg_severity_weight = statistics.mean([
                severity_weights.get(s, 1) for s in severities
            ])
            
            if avg_severity_weight >= 3.5:
                risk_level = "critical"
            elif avg_severity_weight >= 2.5:
                risk_level = "high"
            elif avg_severity_weight >= 1.5:
                risk_level = "medium"
            else:
                risk_level = "low"
            
            top_flagged.append({
                "user_did": target,
                "flag_count": len(target_flags),
                "average_confidence": avg_confidence,
                "risk_level": risk_level
            })
        
        # Sort by flag count
        top_flagged.sort(key=lambda x: x["flag_count"], reverse=True)
        
        return top_flagged[:20]  # Top 20
    
    def analyze_reporter_behavior(
        self, 
        flags: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze reporter behavior patterns"""
        reporter_stats = defaultdict(lambda: {"flags": [], "reputation": 0.0})
        
        for flag in flags:
            reporter = flag.get("flag_actor")
            reporter_stats[reporter]["flags"].append(flag)
            reporter_stats[reporter]["reputation"] = flag.get("reporter_reputation", 0.0)
        
        # Top reporters
        top_reporters = []
        for reporter, stats in reporter_stats.items():
            avg_confidence = statistics.mean([
                flag.get("confidence", 0.0) for flag in stats["flags"]
            ])
            
            top_reporters.append({
                "reporter_did": reporter,
                "flag_count": len(stats["flags"]),
                "average_confidence": avg_confidence,
                "reputation": stats["reputation"]
            })
        
        top_reporters.sort(key=lambda x: x["flag_count"], reverse=True)
        
        # Suspicious reporters
        suspicious_reporters = []
        for reporter, stats in reporter_stats.items():
            if stats["reputation"] < 0.3 or len(stats["flags"]) > 10:
                # Analyze coordination for this reporter's flags
                reporter_flags = stats["flags"]
                if len(reporter_flags) >= 2:
                    # Simplified coordination check
                    coordination_score = 0.5  # Placeholder
                else:
                    coordination_score = 0.0
                
                suspicious_reporters.append({
                    "reporter_did": reporter,
                    "flag_count": len(stats["flags"]),
                    "coordination_score": coordination_score,
                    "low_reputation": stats["reputation"] < 0.3
                })
        
        suspicious_reporters.sort(key=lambda x: x["coordination_score"], reverse=True)
        
        return {
            "top_reporters": top_reporters[:10],
            "suspicious_reporters": suspicious_reporters[:10]
        }

