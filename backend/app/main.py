import asyncio
import json
import os
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from app.gemini_stream import stream_lesson
from app.imagen import generate_diagram

load_dotenv()

app = FastAPI(title="EduWeave AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread pool for blocking Imagen calls
_executor = ThreadPoolExecutor(max_workers=4)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/lesson/stream")
async def lesson_stream(topic: str):
    """
    SSE endpoint. Streams lesson events for a given topic.

    Event types sent to frontend:
      - text       → { content: "..." }
      - image      → { url: "https://...", description: "..." }
      - error      → { message: "..." }
      - done       → {}
    """
    async def event_generator():
        try:
            async for event in stream_lesson(topic):

                if event["type"] == "text":
                    yield {
                        "event": "text",
                        "data": json.dumps({"content": event["content"]})
                    }

                elif event["type"] == "image_trigger":
                    description = event["description"]

                    # Signal frontend that a diagram is generating
                    yield {
                        "event": "image_loading",
                        "data": json.dumps({"description": description})
                    }

                    # Generate diagram (blocking → run in thread pool)
                    loop = asyncio.get_event_loop()
                    try:
                        url = await loop.run_in_executor(
                            _executor,
                            generate_diagram,
                            description
                        )
                        yield {
                            "event": "image",
                            "data": json.dumps({
                                "url": url,
                                "description": description
                            })
                        }
                    except Exception as img_err:
                        # Don't crash the lesson — just log and continue
                        print(f"[Imagen error] {img_err}")
                        yield {
                            "event": "image_error",
                            "data": json.dumps({"description": description})
                        }

                elif event["type"] == "done":
                    yield {"event": "done", "data": "{}"}

        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"message": str(e)})
            }

    return EventSourceResponse(event_generator())