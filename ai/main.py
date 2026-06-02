import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

from ai_core_service.retrieving.connection import init_db, init_gemini
from ai_core_service.routing.endpoints import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_gemini()
    yield


app = FastAPI(
    title="GrindOS AI Core",
    description="Stateless Prompt Pipeline Engine — Thinking at 4:00 AM, Learning at 11:59 PM.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(router)

if os.getenv("APP_ENV") == "development":
    from ai_core_service.routing.dev_endpoints import dev_router
    app.include_router(dev_router, prefix="/dev")
