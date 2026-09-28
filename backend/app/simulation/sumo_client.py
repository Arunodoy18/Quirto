import traci
import sumolib
import time
from app.core.graph import RoadNetwork
from app.core.cost import CostEngine

class SumoClient:
    def __init__(self, network: RoadNetwork, cost_engine: CostEngine, sumo_binary: str = "sumo", config_file: str = "mock_network.sumocfg"):
        self.network = network
        self.cost_engine = cost_engine
        self.sumo_binary = sumo_binary
        self.config_file = config_file
        self.is_running = False
        
    def start(self):
        traci.start([self.sumo_binary, "-c", self.config_file])
        self.is_running = True
        
    def close(self):
        if self.is_running:
            traci.close()
            self.is_running = False
            
    def step(self):
        if not self.is_running:
            return
        
        traci.simulationStep()
        self.update_network_state()
        
    def update_network_state(self):
        edges = traci.edge.getIDList()
        for edge_id in edges:
            if edge_id.startswith(":"): # Internal edges
                continue
                
            # These are basic SUMO metrics, we might map this to our graph edges
            # For simplicity, assuming edge_id matches source_target or is stored
            
            # Since our RoadNetwork uses source/target, and SUMO uses edge_id
            # we can look it up if we have a mapping.
            # Assuming edge_id corresponds directly to our graph edge_id.
            
            # We will just fetch state for now to demonstrate functionality.
            volume = traci.edge.getLastStepVehicleNumber(edge_id)
            speed = traci.edge.getLastStepMeanSpeed(edge_id)
            
            # This requires a proper mapping between SUMO edges and NetworkX graph edges
            # (which we would initialize from the SUMO network file).
            
            # For now, let's pretend we have a dict `edge_mapping` that maps edge_id to (source, target)
            pass
            
    def get_vehicle_states(self):
        if not self.is_running:
            return []
            
        vehicles = traci.vehicle.getIDList()
        states = []
        for veh_id in vehicles:
            pos = traci.vehicle.getPosition(veh_id)
            speed = traci.vehicle.getSpeed(veh_id)
            edge = traci.vehicle.getRoadID(veh_id)
            states.append({
                "id": veh_id,
                "position": pos,
                "speed": speed,
                "current_edge": edge
            })
        return states
