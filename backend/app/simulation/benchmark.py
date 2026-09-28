import time
import uuid
import asyncio
from app.core.graph import RoadNetwork
from app.core.cost import CostEngine
from app.routing.qirto import QIRTO
from app.routing.baselines import RoutingBaselines

class BenchmarkEngine:
    def __init__(self, network: RoadNetwork, cost_engine: CostEngine):
        self.network = network
        self.cost_engine = cost_engine
        
    def evaluate_route(self, route):
        metrics = {
            "travel_time": 0.0,
            "distance": 0.0,
            "congestion": 0.0,
            "fuel": 0.0,
            "risk": 0.0
        }
        for i in range(len(route)-1):
            u, v = route[i], route[i+1]
            edge = self.network.get_edge_data(u, v)
            if edge:
                metrics["travel_time"] += edge.get("travel_time", 0)
                metrics["distance"] += edge.get("length", 0)
                metrics["congestion"] = max(metrics["congestion"], edge.get("congestion", 0))
                metrics["fuel"] += self.cost_engine.fuel(edge.get("length", 0), edge.get("current_speed", 0), edge.get("congestion", 0))
                metrics["risk"] = max(metrics["risk"], edge.get("risk", 0))
                
        # Simple bounds for now
        min_metrics = {k: 0 for k in metrics}
        max_metrics = {k: max(1, v*2) for k, v in metrics.items()}
        cost = self.cost_engine.multi_objective_cost(metrics, min_metrics, max_metrics)
        return metrics, cost

    async def run_experiment(self, config: dict):
        experiment_id = f"exp_{uuid.uuid4().hex[:8]}"
        origin = config.get("origin", "node_A")
        destination = config.get("destination", "node_C")
        
        results = []
        baselines = RoutingBaselines(self.network, self.cost_engine)
        
        # 1. Dijkstra
        start_time = time.time()
        d_route = baselines.dijkstra(origin, destination)
        d_runtime = int((time.time() - start_time) * 1000)
        if d_route:
            d_metrics, d_cost = self.evaluate_route(d_route)
            results.append({
                "experimentId": experiment_id,
                "algorithm": "dijkstra",
                "travelTimeMin": d_metrics["travel_time"] / 60,
                "distanceKm": d_metrics["distance"] / 1000,
                "congestion": d_metrics["congestion"],
                "fuelL": d_metrics["fuel"],
                "risk": d_metrics["risk"],
                "totalCost": d_cost,
                "runtimeMs": d_runtime,
                "iterations": 1,
                "runs": 1
            })
            
        # 2. A*
        start_time = time.time()
        a_route = baselines.a_star(origin, destination)
        a_runtime = int((time.time() - start_time) * 1000)
        if a_route:
            a_metrics, a_cost = self.evaluate_route(a_route)
            results.append({
                "experimentId": experiment_id,
                "algorithm": "astar",
                "travelTimeMin": a_metrics["travel_time"] / 60,
                "distanceKm": a_metrics["distance"] / 1000,
                "congestion": a_metrics["congestion"],
                "fuelL": a_metrics["fuel"],
                "risk": a_metrics["risk"],
                "totalCost": a_cost,
                "runtimeMs": a_runtime,
                "iterations": 1,
                "runs": 1
            })
            
        # 3. QIRTO
        q_optimizer = QIRTO(self.network, self.cost_engine)
        start_time = time.time()
        q_result = await q_optimizer.optimize(origin, destination)
        q_runtime = int((time.time() - start_time) * 1000)
        if q_result:
            q_metrics = q_result["metrics"]
            results.append({
                "experimentId": experiment_id,
                "algorithm": "qirto",
                "travelTimeMin": q_metrics["travel_time"] / 60,
                "distanceKm": q_metrics["distance"] / 1000,
                "congestion": q_metrics["congestion"],
                "fuelL": q_metrics["fuel"],
                "risk": q_metrics["risk"],
                "totalCost": q_result["cost"],
                "runtimeMs": q_runtime,
                "iterations": q_optimizer.max_iterations,
                "runs": 1
            })
            
        return {
            "experimentId": experiment_id,
            "fixture": False,
            "results": results
        }
