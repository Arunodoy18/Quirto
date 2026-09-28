import math
import random
import numpy as np
from app.core.graph import RoadNetwork
from app.core.cost import CostEngine
from app.routing.baselines import RoutingBaselines

class QIRTO:
    def __init__(self, network: RoadNetwork, cost_engine: CostEngine):
        self.network = network
        self.cost_engine = cost_engine
        self.baselines = RoutingBaselines(network, cost_engine)
        self.population_size = 20
        self.max_iterations = 50
        self.elite_count = 2
        self.rotation_min = 0.01 * math.pi
        self.rotation_max = 0.05 * math.pi
        self.stagnation_limit = 10
        self.mutation_probability = 0.05

    def generate_candidates(self, source: str, target: str, k: int = 30):
        # Generate K feasible paths using baseline
        return self.baselines.generate_k_shortest_paths(source, target, k=k)

    def initialize_population(self, num_decisions: int):
        # Alpha and Beta initialized to 1/sqrt(2)
        return [{"alpha": 1/math.sqrt(2), "beta": 1/math.sqrt(2)} for _ in range(num_decisions)]
        
    def evaluate_route(self, route: list, min_metrics: dict, max_metrics: dict) -> dict:
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
                metrics["congestion"] = max(metrics["congestion"], edge.get("congestion", 0)) # Using max or average
                metrics["fuel"] += self.cost_engine.fuel(edge.get("length", 0), edge.get("current_speed", 0), edge.get("congestion", 0))
                metrics["risk"] = max(metrics["risk"], edge.get("risk", 0))
                
        cost = self.cost_engine.multi_objective_cost(metrics, min_metrics, max_metrics)
        return {"route": route, "metrics": metrics, "cost": cost, "fitness": 1.0 / (1.0 + cost) if cost != float('inf') else 0.0}

    async def optimize(self, source: str, target: str, on_iteration=None):
        candidates = self.generate_candidates(source, target, k=30)
        if not candidates:
            return None
            
        num_candidates = len(candidates)
        population = [self.initialize_population(num_candidates) for _ in range(self.population_size)]
        
        # Calculate min/max metrics across candidates for normalization
        min_metrics = {"travel_time": float('inf'), "distance": float('inf'), "congestion": float('inf'), "fuel": float('inf'), "risk": float('inf')}
        max_metrics = {"travel_time": 0, "distance": 0, "congestion": 0, "fuel": 0, "risk": 0}
        
        metrics_list = []
        for cand in candidates:
            m = {"travel_time": 0.0, "distance": 0.0, "congestion": 0.0, "fuel": 0.0, "risk": 0.0}
            for i in range(len(cand)-1):
                u, v = cand[i], cand[i+1]
                edge = self.network.get_edge_data(u, v)
                if edge:
                    m["travel_time"] += edge.get("travel_time", 0)
                    m["distance"] += edge.get("length", 0)
                    m["congestion"] = max(m["congestion"], edge.get("congestion", 0))
                    m["fuel"] += self.cost_engine.fuel(edge.get("length", 0), edge.get("current_speed", 0), edge.get("congestion", 0))
                    m["risk"] = max(m["risk"], edge.get("risk", 0))
            metrics_list.append(m)
            for k in min_metrics.keys():
                min_metrics[k] = min(min_metrics[k], m[k])
                max_metrics[k] = max(max_metrics[k], m[k])
                
        best_route = None
        best_cost = float('inf')
        stagnation_counter = 0
        
        for iteration in range(self.max_iterations):
            measured_solutions = []
            
            for ind in population:
                # Measure
                probs = [q["beta"]**2 for q in ind]
                # Pick a candidate based on measurement
                total_prob = sum(probs)
                if total_prob > 0:
                    probs = [p/total_prob for p in probs]
                    selected_idx = np.random.choice(num_candidates, p=probs)
                else:
                    selected_idx = random.randint(0, num_candidates-1)
                    
                selected_route = candidates[selected_idx]
                eval_res = self.evaluate_route(selected_route, min_metrics, max_metrics)
                
                if eval_res["cost"] < best_cost:
                    best_cost = eval_res["cost"]
                    best_route = eval_res
                    stagnation_counter = 0
                    
                measured_solutions.append({"individual": ind, "idx": selected_idx, "eval": eval_res})
                
            stagnation_counter += 1
                
            # Elite preservation
            measured_solutions.sort(key=lambda x: x["eval"]["cost"])
            elite = measured_solutions[0]
            
            # Quantum-inspired rotation
            for ms in measured_solutions:
                ind = ms["individual"]
                for i in range(num_candidates):
                    # Compare with elite
                    q = ind[i]
                    elite_q = elite["individual"][i]
                    
                    # Direction
                    # If this candidate was good, rotate towards |1> (beta=1), else towards |0>
                    if i == ms["idx"]:
                        target_beta = 1.0 if ms["eval"]["cost"] <= elite["eval"]["cost"] else 0.0
                    else:
                        target_beta = 0.0
                        
                    delta_theta = random.uniform(self.rotation_min, self.rotation_max)
                    # Rotate
                    theta = math.atan2(q["beta"], q["alpha"])
                    
                    # Determine sign
                    if q["beta"] < target_beta:
                        direction = 1
                    else:
                        direction = -1
                        
                    new_theta = theta + direction * delta_theta
                    # clamp
                    if new_theta < 0: new_theta = 0
                    if new_theta > math.pi/2: new_theta = math.pi/2
                    
                    q["alpha"] = math.cos(new_theta)
                    q["beta"] = math.sin(new_theta)
                    
            if stagnation_counter > self.stagnation_limit:
                # Diversify
                for idx, ind in enumerate(population):
                    if idx >= self.elite_count:
                        population[idx] = self.initialize_population(num_candidates)
                stagnation_counter = 0
                
            if on_iteration:
                await on_iteration(iteration, best_route, best_cost, population)
                
        return best_route
