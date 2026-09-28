from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
from app.api.websockets import router as ws_router

app = FastAPI(title="QIRTO Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for prototyping
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(ws_router)

import asyncio
from datetime import datetime
from app.api.websockets import manager
import app.api.endpoints as endpoints

async def simulation_loop():
    clock = 0
    while True:
        await asyncio.sleep(0.5)
        if getattr(endpoints, "sim_running", False):
            clock += 1
            # Broadcast SIMULATION_STATE
            await manager.broadcast("simulation", {
                "type": "SIMULATION_STATE",
                "ts": datetime.now().isoformat(),
                "payload": {
                    "running": True,
                    "speed": getattr(endpoints, "sim_speed", 1.0),
                    "clock": clock
                }
            })
            
            # Broadcast TRAFFIC_UPDATE (Mock random traffic load on e1, e2, e3)
            import random
            await manager.broadcast("traffic", {
                "type": "TRAFFIC_UPDATE",
                "ts": datetime.now().isoformat(),
                "payload": {
                    "roads": [
                        {"id": "e1", "load": random.uniform(0.1, 0.8)},
                        {"id": "e2", "load": random.uniform(0.1, 0.8)},
                        {"id": "e3", "load": random.uniform(0.1, 0.5)}
                    ]
                }
            })

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulation_loop())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
