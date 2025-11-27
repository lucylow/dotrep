#!/usr/bin/env python3
"""
Graph-Based Reputation Demo
Complete demonstration of graph-based reputation scoring system
"""

import networkx as nx
from typing import Dict, List, Any
from datetime import datetime
from advanced_graph_analyzer import AdvancedGraphAnalyzer
from enhanced_sybil_detector import EnhancedSybilDetector
from reputation_engine import ReputationEngine
from reputation_publisher import ReputationPublisher


class GraphReputationDemo:
    """Complete demonstration of graph-based reputation scoring"""
    
    def __init__(self, dkg_client=None, guardian_integrator=None):
        """
        Initialize demo
        
        Args:
            dkg_client: Optional DKG client for publishing
            guardian_integrator: Optional Guardian integrator for content verification
        """
        self.dkg_client = dkg_client
        self.guardian_integrator = guardian_integrator
        self.graph = None
        self.graph_analyzer = None
        self.sybil_detector = None
        self.reputation_engine = None
        self.publisher = None
    
    def run_demo(self, graph_size: int = 5000, sample_users: int = 10) -> Dict[str, Any]:
        """
        Run complete demonstration
        
        Args:
            graph_size: Number of nodes in demo graph
            sample_users: Number of users to analyze in detail
            
        Returns:
            Dictionary with demo results
        """
        print("🚀 Starting Graph-Based Reputation Demo")
        print("=" * 60)
        
        # 1. Data Ingestion
        print("\n1. 📥 Loading social graph...")
        self.graph = self._generate_demo_graph(graph_size)
        print(f"   ✓ Graph loaded: {self.graph.number_of_nodes()} nodes, {self.graph.number_of_edges()} edges")
        
        # 2. Initialize Components
        print("\n2. 🔧 Initializing components...")
        self.graph_analyzer = AdvancedGraphAnalyzer(self.graph, self.guardian_integrator)
        self.sybil_detector = EnhancedSybilDetector(self.graph)
        self.graph_analyzer.sybil_detector = self.sybil_detector
        self.reputation_engine = ReputationEngine(self.graph_analyzer, self.guardian_integrator)
        self.publisher = ReputationPublisher(self.dkg_client)
        print("   ✓ All components initialized")
        
        # 3. Compute Reputation Scores
        print(f"\n3. 🧮 Computing multi-dimensional reputation scores for {sample_users} users...")
        test_users = self._select_demo_users(sample_users)
        reputation_scores = {}
        
        for i, user in enumerate(test_users, 1):
            print(f"   Processing user {i}/{len(test_users)}: {user[:20]}...")
            stake_data = self._generate_stake_data(user)
            reputation_scores[user] = self.reputation_engine.compute_user_reputation(
                user, 
                stake_data=stake_data
            )
        
        print(f"   ✓ Computed reputation for {len(reputation_scores)} users")
        
        # 4. Sybil Detection Showcase
        print("\n4. 🕵️ Demonstrating Sybil detection...")
        sybil_results = self._demo_sybil_detection(test_users)
        print(f"   ✓ Analyzed {len(sybil_results)} users for Sybil risk")
        
        # 5. Batch Processing Demo
        print("\n5. ⚡ Demonstrating batch processing...")
        batch_users = list(self.graph.nodes())[:100]  # Process 100 users
        batch_results = self.graph_analyzer.batch_compute_reputation(batch_users)
        print(f"   ✓ Batch processed {len(batch_results)} users")
        
        # 6. Publish to DKG
        print("\n6. 🔗 Publishing reputation snapshot...")
        snapshot_result = self.publisher.publish_reputation_snapshot(
            list(reputation_scores.values())
        )
        if snapshot_result.get("ual"):
            print(f"   ✓ Published to DKG: {snapshot_result['ual']}")
        else:
            print("   ℹ️  Snapshot JSON-LD generated (DKG client not available)")
        
        # 7. Display Results
        print("\n7. 📊 Displaying reputation analysis...")
        self._display_results(reputation_scores, sybil_results, snapshot_result)
        
        print("\n" + "=" * 60)
        print("✅ Demo completed successfully!")
        
        return {
            "reputation_scores": reputation_scores,
            "sybil_analysis": sybil_results,
            "batch_results": batch_results,
            "dkg_snapshot": snapshot_result,
            "graph_stats": {
                "nodes": self.graph.number_of_nodes(),
                "edges": self.graph.number_of_edges(),
                "density": nx.density(self.graph)
            }
        }
    
    def _generate_demo_graph(self, size: int) -> nx.DiGraph:
        """Generate a demo social graph"""
        # Create a scale-free network (Barabási–Albert model)
        G = nx.barabasi_albert_graph(size, 3, seed=42)
        
        # Convert to directed graph
        G_directed = nx.DiGraph()
        G_directed.add_nodes_from(G.nodes())
        
        # Add directed edges with weights
        for u, v in G.edges():
            weight = 1.0
            # Add some variation in weights
            if hash((u, v)) % 3 == 0:
                weight = 1.5  # Stronger connections
            elif hash((u, v)) % 3 == 1:
                weight = 0.8  # Weaker connections
            
            G_directed.add_edge(u, v, weight=weight)
            
            # Add some bidirectional edges (mutual connections)
            if hash((u, v)) % 5 == 0:
                G_directed.add_edge(v, u, weight=weight)
        
        # Add node metadata
        for node in G_directed.nodes():
            G_directed.nodes[node]["stake"] = hash(node) % 1000 / 1000.0  # Random stake
            G_directed.nodes[node]["account_age_days"] = hash(node) % 730  # Random age
        
        return G_directed
    
    def _select_demo_users(self, count: int) -> List[str]:
        """Select diverse users for demo"""
        nodes = list(self.graph.nodes())
        
        # Select users with varying degrees
        degrees = [(node, self.graph.degree(node)) for node in nodes]
        degrees.sort(key=lambda x: x[1], reverse=True)
        
        # Mix of high, medium, and low degree nodes
        selected = []
        selected.append(str(degrees[0][0]))  # Highest degree
        selected.append(str(degrees[len(degrees) // 2][0]))  # Median
        selected.append(str(degrees[-1][0]))  # Lowest degree
        
        # Add random selection
        import random
        remaining = [str(d[0]) for d in degrees if str(d[0]) not in selected]
        selected.extend(random.sample(remaining, min(count - 3, len(remaining))))
        
        return selected[:count]
    
    def _generate_stake_data(self, user_did: str) -> Dict[str, Any]:
        """Generate demo stake data"""
        node_data = self.graph.nodes.get(user_did, {})
        return {
            "stake_amount": node_data.get("stake", 0.0) * 10000,  # Scale up
            "transaction_diversity": hash(user_did) % 100 / 100.0
        }
    
    def _demo_sybil_detection(self, users: List[str]) -> Dict[str, Dict[str, Any]]:
        """Demonstrate Sybil detection"""
        results = {}
        for user in users:
            if user in self.graph:
                results[user] = self.sybil_detector.comprehensive_risk_analysis(user)
        return results
    
    def _display_results(
        self,
        reputation_scores: Dict[str, Dict[str, Any]],
        sybil_results: Dict[str, Dict[str, Any]],
        snapshot_result: Dict[str, Any]
    ):
        """Display demo results"""
        print("\n" + "-" * 60)
        print("REPUTATION SCORES SUMMARY")
        print("-" * 60)
        
        # Sort by reputation score
        sorted_scores = sorted(
            reputation_scores.items(),
            key=lambda x: x[1].get("final_reputation", 0.0),
            reverse=True
        )
        
        print(f"\nTop {min(5, len(sorted_scores))} Users by Reputation:")
        for i, (user, data) in enumerate(sorted_scores[:5], 1):
            rep = data.get("final_reputation", 0.0)
            risk = data.get("risk_factors", {}).get("overall_risk", 0.0)
            confidence = data.get("confidence", 0.0)
            print(f"  {i}. User {user[:20]:20s} | Rep: {rep:.3f} | Risk: {risk:.3f} | Conf: {confidence:.3f}")
        
        print(f"\nSybil Risk Distribution:")
        risk_levels = {"critical": 0, "high": 0, "medium": 0, "low": 0, "minimal": 0}
        for user, data in sybil_results.items():
            risk_level = data.get("risk_level", "minimal")
            risk_levels[risk_level] = risk_levels.get(risk_level, 0) + 1
        
        for level, count in risk_levels.items():
            if count > 0:
                print(f"  {level.capitalize():10s}: {count}")
        
        if snapshot_result.get("statistics"):
            stats = snapshot_result["statistics"]
            print(f"\nSnapshot Statistics:")
            print(f"  Total Users: {stats.get('totalUsers', 0)}")
            print(f"  Average Reputation: {stats.get('averageReputation', 0.0):.3f}")
            print(f"  Median Reputation: {stats.get('medianReputation', 0.0):.3f}")


if __name__ == "__main__":
    # Run demo
    demo = GraphReputationDemo()
    results = demo.run_demo(graph_size=1000, sample_users=5)
    print("\n✅ Demo completed!")

