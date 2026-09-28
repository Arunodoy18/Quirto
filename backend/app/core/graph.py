import networkx as nx
from typing import Dict, Any

class RoadNetwork:
    def __init__(self):
        self.graph = nx.DiGraph()
    
    def add_node(self, node_id: str, **attributes):
        self.graph.add_node(node_id, **attributes)
        
    def add_edge(self, source: str, target: str, edge_id: str, length: float, speed_limit: float, capacity: float, **attributes):
        self.graph.add_edge(source, target, edge_id=edge_id, length=length, speed_limit=speed_limit, capacity=capacity, 
                            current_volume=0, current_speed=speed_limit, travel_time=length/speed_limit if speed_limit>0 else float('inf'),
                            congestion=0.0, risk=0.0, availability=1.0, **attributes)
                            
    def update_edge_state(self, source: str, target: str, updates: Dict[str, Any]):
        if self.graph.has_edge(source, target):
            for key, value in updates.items():
                self.graph[source][target][key] = value

    def get_edge_data(self, source: str, target: str):
        if self.graph.has_edge(source, target):
            return self.graph[source][target]
        return None
