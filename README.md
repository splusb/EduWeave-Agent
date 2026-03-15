#  EduWeave AI

> An AI-powered educational agent that teaches any topic through real-time narrated lessons with auto-generated diagrams — all streamed interleaved in a single live flow.

Built for the **Gemini Live Agent Hackathon** · Creative Storyteller category

---

## What it does

Type any topic → EduWeave streams a full lesson with:
-  **Live narrated text** flowing chunk by chunk
-  **Auto-generated SVG diagrams** appearing inline at teaching moments
-  **Structured lessons** with hook → concept → steps → analogy → takeaways
-  **Completion card** with word count and diagram stats

**Example topics:**
- "How do neural networks learn?"
- "How does photosynthesis work?"
- "Explain quantum entanglement"
- "How does the immune system fight viruses?"

---

## Architecture

```
User (Browser)
     │ topic input
     ▼
React Frontend (localhost:3000)
     │ SSE stream
     ▼
FastAPI Backend (Render.com)
     │
     ├── gemini_stream.py → Gemini 2.5 Flash (Google Cloud API)
     │   └── Detects [IMAGE: ...] markers in stream
     │
     └── imagen.py → Gemini 2.5 Flash (re-used)
         └── Generates SVG diagram from description
         └── Returns as base64 data URL inline
```

**Tech stack:**
| Layer | Technology |
|-------|-----------|
| Frontend | React, Server-Sent Events (SSE) |
| Backend | FastAPI, Python, sse-starlette |
| AI Model | Gemini 2.5 Flash (Google GenAI SDK) |
| Deployment | Render.com (backend) |
| Google Cloud | generativelanguage.googleapis.com |

---

##  Quick start (local)

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Gemini API key from [aistudio.google.com](https://aistudio.google.com)

### 1. Clone the repo

```bash
git clone https://github.com/splusb/eduweave-ai.git
cd eduweave-ai
```

### 2. Backend setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Add your GOOGLE_API_KEY to .env

# Start the server
python -m uvicorn app.main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm start
```

Frontend runs at: `http://localhost:3000`

### 4. Test it

Open `http://localhost:3000`, type a topic, and click **Teach me ✨**

---

## 🌐 Live demo

Backend deployed at: `https://eduweave-backend.onrender.com`

Test the API directly:
```
https://eduweave-backend.onrender.com/lesson/stream?topic=photosynthesis
```

---

##  Project structure

```
eduweave-ai/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app + SSE endpoint
│   │   ├── gemini_stream.py  # Gemini streaming + [IMAGE:] detection
│   │   └── imagen.py         # SVG diagram generation via Gemini
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── render.yaml
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.js            # Main app + topic input + example chips
│       ├── LessonStream.js   # SSE consumer + live lesson renderer
│       └── App.css           # Dark theme UI styles
└── README.md
```

---

##  Environment variables

Create `backend/.env`:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
GCP_PROJECT_ID=your_gcp_project_id
GCP_REGION=us-central1
```


## 🔌 API reference

### `GET /lesson/stream?topic={topic}`

Streams a lesson as Server-Sent Events.

**Event types:**

| Event | Payload | Description |
|-------|---------|-------------|
| `text` | `{ content: string }` | Lesson text chunk |
| `image_loading` | `{ description: string }` | Diagram generation started |
| `image` | `{ url: string, description: string }` | Diagram ready (base64 SVG) |
| `image_error` | `{}` | Diagram generation failed |
| `done` | `{}` | Lesson complete |
| `error` | `{ message: string }` | Stream error |

### `GET /health`

Returns `{ "status": "ok" }`.

---

##  Google Cloud usage

This project uses **Google's Generative Language API** (`generativelanguage.googleapis.com`) via the official Google GenAI SDK:

- **Model:** `gemini-2.5-flash`
- **Usage 1:** Lesson text generation with interleaved `[IMAGE: ...]` markers
- **Usage 2:** SVG diagram generation from image descriptions

Both calls go through Google Cloud infrastructure, satisfying the hackathon's Google Cloud requirement.

**Proof:** See [`backend/app/gemini_stream.py`](backend/app/gemini_stream.py) and [`backend/app/imagen.py`](backend/app/imagen.py).

---

##  How the interleaved output works

1. Gemini is prompted to embed `[IMAGE: description]` markers inline in lesson text
2. The backend streams text chunks, buffering to detect partial markers
3. When a complete `[IMAGE: ...]` is found, it fires an `image_trigger` event
4. A separate Gemini call generates an SVG diagram for that description
5. The frontend renders text and diagrams inline as they arrive — true interleaved output

---

##  Findings & learnings

- **Gemini 2.5 Flash** is the only model with free-tier access on this API key setup — older models like `gemini-1.5-flash` returned 404
- **Imagen 3** requires billing on Vertex AI — we substituted Gemini's own SVG generation which produces clean, labeled educational diagrams
- **SSE on Render.com** requires `expose_headers: ["*"]` in CORS middleware for proper streaming
- **Partial marker detection** is the trickiest part — buffering until a complete `[IMAGE: ...]` is found prevents leaking raw markers as text
- **Python 3.14** (pre-release) has package compatibility issues — recommend pinning to 3.11 or 3.12

---


##  Built by

Subharthi — [GitHub](https://github.com/splusb)