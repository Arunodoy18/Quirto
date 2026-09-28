import math

class CostEngine:
    def __init__(self):
        self.alpha = 0.15
        self.beta = 4.0
        self.weights = {
            "travel_time": 0.40,
            "congestion": 0.25,
            "distance": 0.15,
            "fuel": 0.10,
            "risk": 0.10
        }
        self.risk_weights = {
            "accident": 1.0,
            "weather": 0.5,
            "road_condition": 0.3,
            "historical": 0.2
        }

    def travel_time(self, length: float, free_flow_speed: float, volume: float, capacity: float) -> float:
        """Calculate dynamic travel time using BPR function"""
        if free_flow_speed <= 0:
            return float('inf')
        t0 = length / free_flow_speed
        if capacity <= 0:
            return float('inf')
        congestion_ratio = volume / capacity
        return t0 * (1 + self.alpha * (congestion_ratio ** self.beta))

    def congestion(self, volume: float, capacity: float) -> float:
        if capacity <= 0:
            return float('inf')
        return volume / capacity
        
    def risk(self, accident_factor: float, weather_factor: float, condition_factor: float, history_factor: float) -> float:
        return (self.risk_weights["accident"] * accident_factor +
                self.risk_weights["weather"] * weather_factor +
                self.risk_weights["road_condition"] * condition_factor +
                self.risk_weights["historical"] * history_factor)
                
    def fuel(self, length: float, speed: float, congestion: float) -> float:
        # Approximate fuel consumption
        base_consumption = 0.08 # L/km roughly
        efficiency_factor = 1.0
        if speed > 0:
            efficiency_factor = 1.0 + (max(0, 80 - speed) / 100.0) # Penalty for slow speed
        congestion_penalty = 1.0 + congestion
        return (length / 1000.0) * base_consumption * efficiency_factor * congestion_penalty

    def multi_objective_cost(self, metrics: dict, min_metrics: dict, max_metrics: dict) -> float:
        def normalize(val, min_val, max_val):
            if max_val == min_val:
                return 0.0
            return (val - min_val) / (max_val - min_val)

        cost = 0.0
        cost += self.weights["travel_time"] * normalize(metrics.get("travel_time", 0), min_metrics.get("travel_time", 0), max_metrics.get("travel_time", 1))
        cost += self.weights["congestion"] * normalize(metrics.get("congestion", 0), min_metrics.get("congestion", 0), max_metrics.get("congestion", 1))
        cost += self.weights["distance"] * normalize(metrics.get("distance", 0), min_metrics.get("distance", 0), max_metrics.get("distance", 1))
        cost += self.weights["fuel"] * normalize(metrics.get("fuel", 0), min_metrics.get("fuel", 0), max_metrics.get("fuel", 1))
        cost += self.weights["risk"] * normalize(metrics.get("risk", 0), min_metrics.get("risk", 0), max_metrics.get("risk", 1))
        return cost
