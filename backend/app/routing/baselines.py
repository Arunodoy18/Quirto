import networkx as nx
from app.core.graph import RoadNetwork
from app.core.cost import CostEngine

class RoutingBaselines:
    def __init__(self, network: RoadNetwork, cost_engine: CostEngine):
        self.network = network
        self.cost_engine = cost_engine

    def dijkstra(self, source: str, target: str, weight: str = 'travel_time') -> list:
        try:
            return nx.dijkstra_path(self.network.graph, source, target, weight=weight)
        except nx.NetworkXNoPath:
            return []

    def a_star(self, source: str, target: str, weight: str = 'travel_time') -> list:
        # Simple heuristic based on Euclidean distance if pos is available
        def heuristic(u, v):
            # Assuming nodes have 'x' and 'y' attributes
            node_u = self.network.graph.nodes[u]
            node_v = self.network.graph.nodes[v]
            if 'x' in node_u and 'y' in node_u and 'x' in node_v and 'y' in node_v:
                return ((node_u['x'] - node_v['x'])**2 + (node_u['y'] - node_v['y'])**2)**0.5
            return 0

        try:
            return nx.astar_path(self.network.graph, source, target, heuristic=heuristic, weight=weight)
        except nx.NetworkXNoPath:
            return []
            
    def generate_k_shortest_paths(self, source: str, target: str, k: int = 10, weight: str = 'travel_time') -> list:
        try:
            paths = list(nx.shortest_simple_paths(self.network.graph, source, target, weight=weight))
            return paths[:k]
        except nx.NetworkXNoPath:
            return []
