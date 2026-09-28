# QIRTO SUMO Integration

The QIRTO Intelligent Routing Platform allows for routing across simulated real-world scenarios. We provide a full traffic simulation backend connector (`backend/app/simulation/sumo_client.py`) that uses `traci` to connect to Eclipse SUMO (Simulation of Urban MObility).

## 1. Using the Demo Configuration (10x8 grid)

The `backend/scripts/generate_sumo_xml.py` script has generated the `.nod.xml`, `.edg.xml`, and `.rou.xml` files that map the frontend 3D web city directly into SUMO syntax. They are located in the `sumo/` directory.

If you have Eclipse SUMO installed on your system:

1. Open your terminal in the `sumo` directory.
2. Compile the XML into a network file by running:
   ```bash
   netconvert --node-files qirto.nod.xml --edge-files qirto.edg.xml -o qirto.net.xml
   ```
3. You can then run the simulation visually by double-clicking `qirto.sumocfg` or running:
   ```bash
   sumo-gui -c qirto.sumocfg
   ```

## 2. Using a Real City Map (OpenStreetMap)

To convert a real city into SUMO:
1. Export an area from OpenStreetMap (`.osm` file).
2. Run `netconvert`:
   ```bash
   netconvert --osm-files map.osm -o real_city.net.xml
   ```
3. Update `backend/app/core/network_builder.py` to parse this `real_city.net.xml` file using the `sumolib` python library.

**Note on Frontend UI**: The current React 3D Interface (`src/mock/network.ts`) is hardcoded to render the `10x8` demo grid and landmarks (e.g. `Central Station`, `Tech Park`). If you load a real-world OSM map into the backend, the Python routing will optimize real-world routes successfully, but the web UI will not render them without a custom GeoJSON projection layer (Phase 13).
