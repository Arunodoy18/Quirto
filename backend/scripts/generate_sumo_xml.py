import os
import sys

# Add parent to path to import network builder
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.network_builder import build_demo_network

def generate_sumo_files(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    network = build_demo_network()
    
    # 1. Generate Nodes XML (.nod.xml)
    nodes_xml = '<?xml version="1.0" encoding="UTF-8"?>\n<nodes>\n'
    for node_id, data in network.graph.nodes(data=True):
        nodes_xml += f'    <node id="{node_id}" x="{data["x"]}" y="{data["y"]}" type="priority"/>\n'
    nodes_xml += '</nodes>\n'
    
    with open(os.path.join(output_dir, "qirto.nod.xml"), "w") as f:
        f.write(nodes_xml)
        
    # 2. Generate Edges XML (.edg.xml)
    edges_xml = '<?xml version="1.0" encoding="UTF-8"?>\n<edges>\n'
    for u in network.graph:
        for v in network.graph[u]:
            edge = network.get_edge_data(u, v)
            speed_limit = edge.get("speed_limit", 13.8)
            edges_xml += f'    <edge id="{u}_{v}" from="{u}" to="{v}" priority="1" numLanes="1" speed="{speed_limit}"/>\n'
    edges_xml += '</edges>\n'
    
    with open(os.path.join(output_dir, "qirto.edg.xml"), "w") as f:
        f.write(edges_xml)
        
    # 3. Generate Route/Trips XML (.rou.xml) - Just a basic trip for testing
    routes_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<routes>
    <vType id="car" accel="2.6" decel="4.5" sigma="0.5" length="5" maxSpeed="70"/>
    <trip id="t0" type="car" depart="0.00" from="16" to="18"/>
</routes>
'''
    with open(os.path.join(output_dir, "qirto.rou.xml"), "w") as f:
        f.write(routes_xml)
        
    # 4. Generate SUMO Configuration (.sumocfg)
    sumocfg_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <input>
        <net-file value="qirto.net.xml"/>
        <route-files value="qirto.rou.xml"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="10000"/>
    </time>
    <gui_only>
        <gui-settings-file value="gui.settings.xml"/>
    </gui_only>
</configuration>
'''
    with open(os.path.join(output_dir, "qirto.sumocfg"), "w") as f:
        f.write(sumocfg_xml)
        
    print(f"SUMO definition files generated in {output_dir}/")
    print("To build the network, run:")
    print("netconvert --node-files qirto.nod.xml --edge-files qirto.edg.xml -o qirto.net.xml")
    print("To run the simulation, run:")
    print("sumo-gui -c qirto.sumocfg")

if __name__ == "__main__":
    generate_sumo_files(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "sumo"))
