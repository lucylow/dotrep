#!/usr/bin/env python3
"""
Social Graph Hackathon Demo
Complete demonstration of advanced social graph reputation system
"""

import json
import networkx as nx
from typing import Dict, Any, List
from datetime import datetime
from advanced_graph_analyzer import AdvancedGraphAnalyzer
from enhanced_sybil_detector import EnhancedSybilDetector
from guardian_integrator import GuardianIntegrator
from reputation_engine import ReputationEngine
from dkg_reputation_publisher import DKGReputationPublisher


class SocialGraphHackathonDemo:
    """Complete demo of social graph reputation system"""
    
    def __init__(self):
        """Initialize demo components"""
        self.graph = None
        self.analyzer = None
        self.sybil_detector = None
        self.guardian = None
        self.reputation_engine = None
        self.dkg_publisher = None
    
    def run_complete_demo(self, graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the complete social graph reputation demo
        
        Args:
            graph_data: Graph data dictionary with nodes and edges
            
        Returns:
            Complete demo results
        """
        print("🚀 Starting Advanced Social Graph Reputation Demo")
        print("=" * 60)
        
        # 1. Data Ingestion
        print("\n1. 📥 Ingesting and analyzing social graph...")
        self.graph = self.load_graph_from_data(graph_data)
        print(f"   ✓ Loaded graph with {len(self.graph.nodes())} nodes and {len(self.graph.edges())} edges")
        
        # 2. Initialize components
        print("\n2. 🛡️ Initializing components...")
        self.guardian = GuardianIntegrator(mock_mode=True)
        self.analyzer = AdvancedGraphAnalyzer(self.graph, self.guardian)
        self.sybil_detector = EnhancedSybilDetector(self.graph)
        self.analyzer.sybil_detector = self.sybil_detector
        self.reputation_engine = ReputationEngine(self.analyzer, self.guardian)
        self.dkg_publisher = DKGReputationPublisher()
        print("   ✓ All components initialized")
        
        # 3. Reputation Computation
        print("\n3. 🧮 Computing multi-dimensional reputation scores...")
        test_users = self.select_test_users(graph_data.get("nodes", []))
        reputation_results = {}
        
        for user in test_users:
            print(f"   Computing reputation for {user}...")
            reputation_results[user] = self.reputation_engine.compute_user_reputation(user)
        
        print(f"   ✓ Computed reputation for {len(reputation_results)} users")
        
        # 4. Sybil Detection Showcase
        print("\n4. 🕵️ Demonstrating advanced Sybil detection...")
        sybil_analysis = self.demo_sybil_detection()
        
        # 5. DKG Publishing
        print("\n5. 🔗 Publishing reputation snapshot to DKG...")
        analysis_metadata = self.dkg_publisher.get_analysis_metadata(
            len(self.graph.nodes()),
            reputation_results,
            sybil_analysis.get("detected_clusters", 0)
        )
        snapshot_result = self.dkg_publisher.publish_reputation_snapshot(
            reputation_results,
            analysis_metadata
        )
        print(f"   ✓ Published snapshot: {snapshot_result.get('ual', 'N/A')}")
        
        # Compile Results
        demo_results = {
            "reputation_scores": reputation_results,
            "sybil_analysis": sybil_analysis,
            "dkg_snapshot": snapshot_result,
            "graph_stats": {
                "nodes": len(self.graph.nodes()),
                "edges": len(self.graph.edges()),
                "density": nx.density(self.graph)
            }
        }
        
        print("\n✅ Demo completed successfully!")
        print("=" * 60)
        
        return demo_results
    
    def load_graph_from_data(self, graph_data: Dict[str, Any]) -> nx.DiGraph:
        """Load graph from data dictionary"""
        G = nx.DiGraph()
        
        # Add nodes with attributes
        for node in graph_data.get("nodes", []):
            if isinstance(node, dict):
                node_id = node.get("id")
                G.add_node(node_id, **{k: v for k, v in node.items() if k != "id"})
            else:
                G.add_node(node)
        
        # Add edges with weights
        for edge in graph_data.get("edges", []):
            if isinstance(edge, dict):
                source = edge.get("source")
                target = edge.get("target")
                weight = edge.get("weight", 1.0)
                G.add_edge(source, target, weight=weight)
            else:
                G.add_edge(edge[0], edge[1])
        
        return G
    
    def select_test_users(self, nodes: List[Any]) -> List[str]:
        """Select diverse test users for demo"""
        user_ids = []
        
        for node in nodes:
            if isinstance(node, dict):
                user_ids.append(node.get("id"))
            else:
                user_ids.append(str(node))
        
        # Select diverse users (first, middle, last, and any sybil nodes)
        test_users = []
        if user_ids:
            test_users.append(user_ids[0])
            if len(user_ids) > 1:
                test_users.append(user_ids[len(user_ids) // 2])
            if len(user_ids) > 2:
                test_users.append(user_ids[-1])
            
            # Add any sybil nodes
            sybil_nodes = [uid for uid in user_ids if "sybil" in uid.lower()]
            test_users.extend(sybil_nodes[:2])  # Max 2 sybil nodes
        
        return list(set(test_users))[:5]  # Max 5 users
    
    def demo_sybil_detection(self) -> Dict[str, Any]:
        """Showcase Sybil detection capabilities"""
        if not self.sybil_detector:
            return {"error": "Sybil detector not initialized"}
        
        # Analyze all nodes
        detection_results = {}
        high_risk_nodes = []
        
        for node in list(self.graph.nodes())[:20]:  # Limit for demo
            risk_analysis = self.sybil_detector.comprehensive_risk_analysis(node)
            detection_results[node] = risk_analysis
            
            if risk_analysis.get("overall_risk", 0) > 0.6:
                high_risk_nodes.append(node)
        
        # Calculate detection metrics
        avg_risk = sum(r.get("overall_risk", 0) for r in detection_results.values()) / len(detection_results) if detection_results else 0.0
        
        return {
            "total_analyzed": len(detection_results),
            "high_risk_nodes": high_risk_nodes,
            "average_risk_score": avg_risk,
            "detected_clusters": len(set(high_risk_nodes)) // 3,  # Estimate clusters
            "sample_results": {k: {
                "overall_risk": v.get("overall_risk", 0),
                "risk_level": v.get("risk_level", "unknown")
            } for k, v in list(detection_results.items())[:5]}
        }
    
    def print_summary(self, results: Dict[str, Any]):
        """Print demo summary"""
        print("\n" + "=" * 60)
        print("📊 DEMO SUMMARY")
        print("=" * 60)
        
        reputation_scores = results.get("reputation_scores", {})
        print(f"\nReputation Scores Computed: {len(reputation_scores)}")
        
        for user, rep_data in list(reputation_scores.items())[:5]:
            final_rep = rep_data.get("final_reputation", 0.0)
            risk = rep_data.get("risk_factors", {}).get("overall_risk", 0.0)
            print(f"  {user}: Reputation={final_rep:.3f}, Risk={risk:.3f}")
        
        sybil_analysis = results.get("sybil_analysis", {})
        print(f"\nSybil Detection:")
        print(f"  High Risk Nodes: {len(sybil_analysis.get('high_risk_nodes', []))}")
        print(f"  Average Risk: {sybil_analysis.get('average_risk_score', 0):.3f}")
        
        dkg_snapshot = results.get("dkg_snapshot", {})
        print(f"\nDKG Publishing:")
        print(f"  UAL: {dkg_snapshot.get('ual', 'N/A')}")
        print(f"  Transaction: {dkg_snapshot.get('transaction_hash', 'N/A')[:20]}...")
        
        print("=" * 60)


def main():
    """Run demo"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Run social graph reputation demo")
    parser.add_argument("--input", type=str, default="data/sample_graph.json", help="Input graph JSON file")
    parser.add_argument("--output", type=str, help="Output file for results (JSON)")
    
    args = parser.parse_args()
    
    # Load graph data
    with open(args.input, 'r') as f:
        graph_data = json.load(f)
    
    # Run demo
    demo = SocialGraphHackathonDemo()
    results = demo.run_complete_demo(graph_data)
    
    # Print summary
    demo.print_summary(results)
    
    # Save results if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\nResults saved to {args.output}")


if __name__ == "__main__":
    main()

