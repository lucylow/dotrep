#!/usr/bin/env python3
"""
Optimized Graph Processor
Scalable graph processing with caching and batch operations
"""

from typing import Dict, List, Any, Set, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import networkx as nx
from advanced_graph_analyzer import AdvancedGraphAnalyzer
from reputation_engine import ReputationEngine


class OptimizedGraphProcessor:
    """Scalable graph processing with performance optimizations"""
    
    def __init__(self, graph: nx.DiGraph, analyzer: AdvancedGraphAnalyzer, reputation_engine: ReputationEngine):
        """
        Initialize optimized processor
        
        Args:
            graph: NetworkX graph
            analyzer: AdvancedGraphAnalyzer instance
            reputation_engine: ReputationEngine instance
        """
        self.graph = graph
        self.analyzer = analyzer
        self.reputation_engine = reputation_engine
        self.cache = {}
        self.batch_size = 1000
        self.max_workers = 4
    
    def batch_compute_reputation(
        self,
        user_dids: List[str],
        chunk_size: int = 100,
        stake_data_map: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Dict[str, Dict[str, Any]]:
        """
        Compute reputation for multiple users efficiently
        
        Args:
            user_dids: List of user identifiers
            chunk_size: Number of users to process in parallel
            stake_data_map: Optional mapping of user_did to stake data
            
        Returns:
            Dictionary mapping user_did to reputation results
        """
        results = {}
        
        # Process in chunks
        for i in range(0, len(user_dids), chunk_size):
            chunk = user_dids[i:i + chunk_size]
            
            # Parallel processing for chunk
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                future_to_user = {
                    executor.submit(
                        self.compute_single_reputation,
                        user,
                        stake_data_map.get(user) if stake_data_map else None
                    ): user
                    for user in chunk
                }
                
                for future in as_completed(future_to_user):
                    user = future_to_user[future]
                    try:
                        results[user] = future.result()
                    except Exception as e:
                        results[user] = {
                            "error": str(e),
                            "user_did": user,
                            "final_reputation": 0.0
                        }
        
        return results
    
    def compute_single_reputation(
        self,
        user_did: str,
        stake_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Compute reputation for a single user (with caching)"""
        # Check cache
        cache_key = f"{user_did}_{hash(str(stake_data))}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Compute reputation
        result = self.reputation_engine.compute_user_reputation(user_did, stake_data)
        
        # Cache result
        self.cache[cache_key] = result
        
        return result
    
    def incremental_updates(
        self,
        new_interactions: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Process incremental graph updates efficiently
        
        Args:
            new_interactions: List of new interactions with 'from_user', 'to_user', 'weight', etc.
            
        Returns:
            Updated reputation results for affected users
        """
        updated_users = set()
        
        for interaction in new_interactions:
            # Update local graph
            from_user = interaction.get("from_user")
            to_user = interaction.get("to_user")
            weight = interaction.get("weight", 1.0)
            
            if from_user and to_user:
                if self.graph.has_edge(from_user, to_user):
                    # Update weight
                    self.graph[from_user][to_user]["weight"] = (
                        self.graph[from_user][to_user].get("weight", 1.0) + weight
                    ) / 2.0
                else:
                    # Add new edge
                    self.graph.add_edge(from_user, to_user, weight=weight)
                
                # Mark users for reputation recomputation
                updated_users.add(from_user)
                updated_users.add(to_user)
        
        # Invalidate cache for updated users
        cache_keys_to_remove = [
            key for key in self.cache.keys()
            if any(user in key for user in updated_users)
        ]
        for key in cache_keys_to_remove:
            del self.cache[key]
        
        # Batch recompute affected users
        return self.batch_compute_reputation(list(updated_users))
    
    def clear_cache(self):
        """Clear computation cache"""
        self.cache.clear()
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "cache_size": len(self.cache),
            "cache_keys": list(self.cache.keys())[:10]  # Sample keys
        }

