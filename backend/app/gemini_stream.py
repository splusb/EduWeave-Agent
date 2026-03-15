import google.generativeai as genai
import os
import re
from typing import AsyncGenerator
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

SYSTEM_PROMPT = """You are EduWeave, an expert educational AI that teaches any topic 
through rich, interleaved lessons. 

When explaining a concept that benefits from a visual diagram, embed an image marker 
INLINE in your text at the exact point where the diagram should appear, like this:

[IMAGE: a clear diagram showing X with labeled components Y and Z]

Rules for image markers:
- Use them 2-4 times per lesson, at natural teaching moments
- Write the description as a detailed prompt for an image generator
- Keep surrounding text flowing naturally before and after the marker
- After each marker, continue the explanation referencing what the diagram shows

Structure every lesson as:
1. Hook (1-2 sentences, spark curiosity)
2. Core concept explained simply
[IMAGE: first diagram here]
3. How it works, step by step  
[IMAGE: second diagram here]
4. Real-world analogy or example
5. Key takeaways (3 bullet points)

Tone: enthusiastic, clear, like a great professor."""


async def stream_lesson(topic: str) -> AsyncGenerator[dict, None]:
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=SYSTEM_PROMPT
    )

    prompt = f"Teach me about: {topic}"
    buffer = ""
    IMAGE_PATTERN = re.compile(r'\[IMAGE:\s*(.*?)\]', re.DOTALL)

    response = model.generate_content(
        prompt,
        stream=True,
        generation_config=genai.GenerationConfig(
            temperature=0.8,
            max_output_tokens=2048,
        )
    )

    for chunk in response:
        if not chunk.text:
            continue

        buffer += chunk.text

        while True:
            match = IMAGE_PATTERN.search(buffer)
            if not match:
                # No complete marker — hold back anything from the first [ onward
                # in case a marker is still being streamed in
                safe_end = _safe_flush_index(buffer)
                if safe_end > 0:
                    yield {"type": "text", "content": buffer[:safe_end]}
                    buffer = buffer[safe_end:]
                break
            else:
                before = buffer[:match.start()]
                if before:
                    yield {"type": "text", "content": before}

                yield {"type": "image_trigger", "description": match.group(1).strip()}
                buffer = buffer[match.end():]

    # Flush remaining buffer (won't contain markers at this point)
    if buffer.strip():
        yield {"type": "text", "content": buffer}

    yield {"type": "done"}


def _safe_flush_index(text: str) -> int:
    """
    Returns index up to which it's safe to emit text.
    Holds back from the first '[' that could be a partial [IMAGE: marker.
    """
    # Find the leftmost '[' in the buffer
    bracket_pos = text.find('[')

    if bracket_pos == -1:
        # No '[' at all — safe to flush everything
        return len(text)

    # There's a '[' — check if it could be start of [IMAGE:
    tail = text[bracket_pos:]

    # If '[IMAGE:' starts with whatever tail we have, it's a potential marker
    if '[IMAGE:'.startswith(tail.upper()[:7]) or tail.upper().startswith('[IMAGE:'):
        # Hold back from this '[' onward
        return bracket_pos

    # '[' exists but is NOT an image marker (e.g. "[1]" citation or "[a]")
    # Safe to emit up to and including this '[' — but search further for real markers
    next_bracket = text.find('[', bracket_pos + 1)
    if next_bracket == -1:
        return len(text)
    return next_bracket