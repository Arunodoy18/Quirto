from app.core.graph import RoadNetwork

def build_demo_network() -> RoadNetwork:
    network = RoadNetwork()
    NX = 10
    NZ = 8
    BLOCK = 100
    BLOCK_KM = 0.45
    
    # 1. Add nodes (0 to 79)
    for j in range(NZ):
        for i in range(NX):
            node_idx = j * NX + i
            network.add_node(str(node_idx), x=i * BLOCK, y=j * BLOCK)
            
    REMOVED = {"v-2-4", "v-5-1", "v-8-5", "h-6-6", "h-1-1"}
    
    # 2. Add Horizontal Edges
    for j in range(NZ):
        for i in range(NX - 1):
            edge_id = f"h-{i}-{j}"
            if edge_id in REMOVED: continue
            
            a = str(j * NX + i)
            b = str(j * NX + i + 1)
            # Default speed limit ~50km/h (13.8 m/s), arterial ~70km/h (19.4 m/s)
            arterial = (j == 3)
            speed = 19.4 if arterial else 13.8
            cap = 1500 if arterial else 800
            
            network.add_edge(a, b, edge_id=edge_id, length=BLOCK_KM * 1000, speed_limit=speed, capacity=cap)
            network.add_edge(b, a, edge_id=edge_id+"_rev", length=BLOCK_KM * 1000, speed_limit=speed, capacity=cap) # Bi-directional
            
    # 3. Add Vertical Edges
    for i in range(NX):
        for j in range(NZ - 1):
            edge_id = f"v-{i}-{j}"
            if edge_id in REMOVED: continue
            
            a = str(j * NX + i)
            b = str((j + 1) * NX + i)
            arterial = (i == 4 or i == 7)
            speed = 19.4 if arterial else 13.8
            cap = 1500 if arterial else 800
            
            network.add_edge(a, b, edge_id=edge_id, length=BLOCK_KM * 1000, speed_limit=speed, capacity=cap)
            network.add_edge(b, a, edge_id=edge_id+"_rev", length=BLOCK_KM * 1000, speed_limit=speed, capacity=cap)
            
    return network

# Landmark mapping matching frontend LANDMARKS
LANDMARKS = {
    "station": [1, 6],
    "techpark": [8, 1],
    "hospital": [7, 5],
    "market": [2, 2],
    "university": [4, 0],
    "harbor": [0, 4],
    "stadium": [5, 7],
    "airport": [9, 6]
}

def get_node_id_for_landmark(landmark_id: str) -> str:
    loc = LANDMARKS.get(landmark_id, LANDMARKS["station"])
    # j * NX + i
    return str(loc[1] * 10 + loc[0])
