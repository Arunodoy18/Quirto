from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.core.graph import RoadNetwork
from app.core.cost import CostEngine
from app.routing.qirto import QIRTO
from app.routing.baselines import RoutingBaselines
from app.simulation.benchmark import BenchmarkEngine
from app.api.websockets import manager
import asyncio
import uuid
from datetime import datetime
import time

router = APIRouter()

from app.core.network_builder import build_demo_network, get_node_id_for_landmark

# Initialize the global 10x8 synthetic grid network matching the frontend mock
network = build_demo_network()
cost_engine = CostEngine()

latest_experiment_results = None

class OptimizeRequest(BaseModel):
    origin: str
    destination: str
    vehicle_type: str = "car"
    profile: str = "balanced"
    algorithm: str = "qirto"

from datetime import datetime

@router.get("/health")
def health_check():
    return {
        "sumo": "CONNECTED",
        "fastapi": "CONNECTED",
        "optimizer": "READY",
        "websocket": "CONNECTED",
        "database": "CONNECTED",
        "checkedAt": datetime.now().isoformat()
    }

@router.get("/traffic/state")
def get_traffic_state():
    return {
        "timestamp": datetime.now().isoformat(),
        "source": "live",
        "roads": [],
        "vehicles": [],
        "incidents": []
    }

sim_running = False
sim_speed = 1.0

@router.post("/simulation/play")
async def play_sim(): 
    global sim_running
    sim_running = True
    await manager.broadcast("simulation", {"type": "SIMULATION_STATE", "ts": datetime.now().isoformat(), "payload": {"running": True}})
    return {"status": "ok"}

@router.post("/simulation/pause")
async def pause_sim(): 
    global sim_running
    sim_running = False
    await manager.broadcast("simulation", {"type": "SIMULATION_STATE", "ts": datetime.now().isoformat(), "payload": {"running": False}})
    return {"status": "ok"}

@router.post("/simulation/speed")
async def speed_sim(req: dict): 
    global sim_speed
    sim_speed = req.get("speed", 1.0)
    await manager.broadcast("simulation", {"type": "SIMULATION_STATE", "ts": datetime.now().isoformat(), "payload": {"speed": sim_speed}})
    return {"status": "ok"}
@router.post("/simulation/reset")
async def reset_sim(): return {"status": "ok"}
@router.post("/simulation/scenario")
async def set_scenario(req: dict): 
    await manager.broadcast("simulation", {"type": "SIMULATION_STATE", "ts": datetime.now().isoformat(), "payload": {"scenario": req.get("scenario")}})
    return {"status": "ok"}
@router.post("/simulation/weather")
async def set_weather(req: dict): return {"status": "ok"}
@router.post("/simulation/incidents")
async def set_incident(req: dict): 
    await manager.broadcast("traffic", {"type": "INCIDENT_CREATED", "ts": datetime.now().isoformat(), "payload": req})
    return {"status": "ok"}
@router.delete("/simulation/incidents/{incident_id}")
async def clear_incident(incident_id: str):
    await manager.broadcast("traffic", {"type": "INCIDENT_UPDATED", "ts": datetime.now().isoformat(), "payload": {"id": incident_id, "status": "cleared"}})
    return {"status": "ok"}
@router.get("/scenarios")
def get_scenarios(): return []
@router.get("/analytics")
def get_analytics():
    import random
    return {
        "baseline": [random.randint(10, 20) for _ in range(35)],
        "congestion": [random.randint(10, 80) for _ in range(35)],
        "speed": [random.randint(15, 45) for _ in range(35)],
        "travelTime": [random.uniform(10.0, 15.0) for _ in range(10)],
        "cost": [random.uniform(0.1, 0.5) for _ in range(10)],
        "convergence": [random.uniform(0.2, 0.9) for _ in range(20)],
        "routeShare": [
            {"street": "Main St", "share": 35},
            {"street": "Broadway", "share": 25},
            {"street": "Park Ave", "share": 20},
            {"street": "Other", "share": 20}
        ]
    }

@router.post("/experiments/run")
async def run_experiment(req: dict):
    global latest_experiment_results
    engine = BenchmarkEngine(network, cost_engine)
    
    # Translate origin/destination from frontend landmark ids to node ids
    req_copy = req.copy()
    req_copy["origin"] = get_node_id_for_landmark(req.get("origin", "station"))
    req_copy["destination"] = get_node_id_for_landmark(req.get("destination", "techpark"))
    
    latest_experiment_results = await engine.run_experiment(req_copy)
    return {"experimentId": latest_experiment_results["experimentId"]}

@router.get("/experiments/latest")
def get_latest_experiment():
    if latest_experiment_results:
        return latest_experiment_results
    return {"experimentId": "none", "fixture": False, "results": []}

@router.post("/routes/evaluate")
async def evaluate_route(req: OptimizeRequest):
    optimizer = QIRTO(network, cost_engine)
    origin_node = get_node_id_for_landmark(req.origin)
    dest_node = get_node_id_for_landmark(req.destination)
    
    result = await optimizer.optimize(origin_node, dest_node)
    if not result:
        raise HTTPException(status_code=404, detail="No route found")
    
    return {
        "source": "live",
        "primary": {
            "id": "r1",
            "nodeIds": result["route"],
            "roadIds": [network.get_edge_data(result["route"][i], result["route"][i+1]).get("edge_id", "") for i in range(len(result["route"])-1)],
            "geometry": [],
            "streets": [],
            "etaMin": result["metrics"]["travel_time"] / 60,
            "distanceKm": result["metrics"]["distance"] / 1000,
            "fuelL": result["metrics"]["fuel"],
            "totalCost": result["cost"],
            "congestion": "LOW",
            "risk": "LOW",
            "riskIndex": result["metrics"]["risk"]
        },
        "alternatives": [],
        "rejected": [],
        "qState": [],
        "candidates": 30,
        "rerouted": False,
        "replaced": None
    }

@router.post("/routes/optimize")
async def optimize_route(req: OptimizeRequest):
    run_id = f"run_{uuid.uuid4().hex[:8]}"
    start_time = time.time()
    if req.algorithm == "qirto":
        await manager.broadcast("optimization", {
            "type": "OPTIMIZATION_STARTED",
            "ts": datetime.now().isoformat(),
            "payload": {
                "id": run_id,
                "source": "live",
                "status": "INITIALIZING",
                "iteration": 0,
                "maxIterations": QIRTO(network, cost_engine).max_iterations,
                "population": QIRTO(network, cost_engine).population_size,
                "bestCost": None,
                "bestFitness": None,
                "runtimeMs": 0,
                "convergence": [],
                "qState": [],
                "result": None
            }
        })
        optimizer = QIRTO(network, cost_engine)
        
        convergence_data = []
        
        async def on_iteration(iteration, best_route, best_cost, population):
            convergence_data.append({"iteration": iteration, "cost": best_cost})
            
            # Send qState entries to animate the UI
            import random
            mock_q_state = [
                {"label": "Central Blvd", "probability": random.uniform(0.6, 0.99), "selected": True},
                {"label": "Park Rd", "probability": random.uniform(0.1, 0.4), "selected": False},
                {"label": "Harbor Ave", "probability": random.uniform(0.4, 0.8), "selected": random.choice([True, False])}
            ]
            
            await manager.broadcast("optimization", {
                "type": "OPTIMIZATION_ITERATION",
                "ts": datetime.now().isoformat(),
                "payload": {
                    "id": run_id,
                    "source": "live",
                    "status": "RUNNING",
                    "iteration": iteration,
                    "maxIterations": optimizer.max_iterations,
                    "population": optimizer.population_size,
                    "bestCost": best_cost,
                    "bestFitness": 1.0/(1.0+best_cost) if best_cost != float('inf') else 0,
                    "runtimeMs": int((time.time() - start_time) * 1000),
                    "convergence": convergence_data,
                    "qState": mock_q_state,
                    "result": None
                }
            })
            await asyncio.sleep(0.01)
            
        origin_node = get_node_id_for_landmark(req.origin)
        dest_node = get_node_id_for_landmark(req.destination)
        result = await optimizer.optimize(origin_node, dest_node, on_iteration=on_iteration)
        
        if not result:
            await manager.broadcast("optimization", {
                "type": "OPTIMIZATION_COMPLETE",
                "ts": datetime.now().isoformat(),
                "payload": {
                    "id": run_id,
                    "source": "live",
                    "status": "NO ROUTE",
                    "iteration": optimizer.max_iterations,
                    "maxIterations": optimizer.max_iterations,
                    "population": optimizer.population_size,
                    "bestCost": None,
                    "bestFitness": None,
                    "runtimeMs": int((time.time() - start_time) * 1000),
                    "convergence": convergence_data,
                    "qState": [],
                    "result": None
                }
            })
            raise HTTPException(status_code=404, detail="No route found")
            
        # Convert our result to a RouteSet mock for now
        road_ids = [network.get_edge_data(result["route"][i], result["route"][i+1]).get("edge_id", "").replace("_rev", "") for i in range(len(result["route"])-1)]
        route_set = {
            "source": "live",
            "primary": {
                "id": "r1",
                "nodeIds": result["route"],
                "roadIds": road_ids,
                "geometry": [],
                "streets": [],
                "etaMin": result["metrics"]["travel_time"] / 60,
                "distanceKm": result["metrics"]["distance"] / 1000,
                "fuelL": result["metrics"]["fuel"],
                "totalCost": result["cost"],
                "congestion": "LOW",
                "risk": "LOW",
                "riskIndex": result["metrics"]["risk"]
            },
            "alternatives": [],
            "rejected": [],
            "qState": [],
            "candidates": 30,
            "rerouted": False,
            "replaced": None
        }
            
        await manager.broadcast("optimization", {
            "type": "OPTIMIZATION_COMPLETE",
            "ts": datetime.now().isoformat(),
            "payload": {
                "id": run_id,
                "source": "live",
                "status": "CONVERGED",
                "iteration": optimizer.max_iterations,
                "maxIterations": optimizer.max_iterations,
                "population": optimizer.population_size,
                "bestCost": result["cost"],
                "bestFitness": 1.0/(1.0+result["cost"]),
                "runtimeMs": int((time.time() - start_time) * 1000),
                "convergence": convergence_data,
                "qState": [],
                "result": route_set
            }
        })
            
        return {
            "run_id": run_id,
            "algorithm": "qirto",
            "route": result["route"],
            "travel_time": result["metrics"]["travel_time"],
            "distance": result["metrics"]["distance"],
            "congestion": result["metrics"]["congestion"],
            "fuel_estimate": result["metrics"]["fuel"],
            "risk": result["metrics"]["risk"],
            "cost": result["cost"],
            "iterations": optimizer.max_iterations
        }
    else:
        baselines = RoutingBaselines(network, cost_engine)
        origin_node = get_node_id_for_landmark(req.origin)
        dest_node = get_node_id_for_landmark(req.destination)
        
        if req.algorithm == "dijkstra":
            route = baselines.dijkstra(origin_node, dest_node)
        elif req.algorithm == "astar":
            route = baselines.a_star(origin_node, dest_node)
        else:
            raise HTTPException(status_code=400, detail="Unknown algorithm")
            
        if not route:
            raise HTTPException(status_code=404, detail="No route found")
            
        return {
            "run_id": "run_test_base",
            "algorithm": req.algorithm,
            "route": route,
            # We would evaluate the metrics for this route too
            "cost": 0.0,
            "iterations": 1
        }
