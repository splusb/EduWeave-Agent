import os
import base64
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


def generate_diagram(description: str) -> str:
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")

        prompt = f"""Create a beautiful SVG educational diagram for: "{description}"

STRICT RULES:
- Output ONLY the SVG code. No markdown. No explanation. No backticks.
- Start with <svg and end with </svg>
- svg width="800" height="500" xmlns="http://www.w3.org/2000/svg"
- White background rectangle covering full area
- Use rectangles, circles, arrows, and text to illustrate the concept
- Color scheme: boxes=#dbeafe fill with #1e40af stroke, text=#1e3a5f, arrows=#64748b
- Every box must have a short text label inside
- Draw arrows as lines with marker-end arrowheads
- Include a bold title at top center (font-size 22px)
- Include 4-6 labeled components relevant to the topic
- Add a <defs> section with an arrow marker like this:
  <defs><marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/></marker></defs>
- Use lines with marker-end="url(#arrow)" for arrows
- Make it look like a real textbook diagram, not just boxes

Topic to diagram: {description}"""

        response = model.generate_content(prompt)
        svg_text = response.text.strip()

        # Strip any markdown fences
        if "```" in svg_text:
            lines = svg_text.split("\n")
            svg_text = "\n".join(
                l for l in lines if not l.strip().startswith("```")
            ).strip()

        if "<svg" not in svg_text:
            raise ValueError("Not valid SVG")

        # Make sure it ends properly
        if not svg_text.endswith("</svg>"):
            svg_text = svg_text[:svg_text.rfind("</svg>") + 6]

        b64 = base64.b64encode(svg_text.encode("utf-8")).decode("utf-8")
        return f"data:image/svg+xml;base64,{b64}"

    except Exception as e:
        print(f"[SVG generation error] {e}")
        return _static_fallback(description)


def _static_fallback(description: str) -> str:
    short = description[:100].replace('"', "").replace("<", "").replace(">", "").replace("&", "and")
    svg = f"""<svg width="800" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="300" fill="#f8fafc"/>
  <defs><marker id="a" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
    <polygon points="0 0,10 3.5,0 7" fill="#64748b"/></marker></defs>
  <rect x="30" y="30" width="220" height="60" rx="10" fill="#dbeafe" stroke="#1e40af" stroke-width="1.5"/>
  <text x="140" y="65" font-family="Arial" font-size="14" font-weight="bold" fill="#1e3a5f" text-anchor="middle">Input</text>
  <line x1="250" y1="60" x2="340" y2="60" stroke="#64748b" stroke-width="2" marker-end="url(#a)"/>
  <rect x="340" y="30" width="220" height="60" rx="10" fill="#dbeafe" stroke="#1e40af" stroke-width="1.5"/>
  <text x="450" y="65" font-family="Arial" font-size="14" font-weight="bold" fill="#1e3a5f" text-anchor="middle">Process</text>
  <line x1="560" y1="60" x2="650" y2="60" stroke="#64748b" stroke-width="2" marker-end="url(#a)"/>
  <rect x="650" y="30" width="120" height="60" rx="10" fill="#dbeafe" stroke="#1e40af" stroke-width="1.5"/>
  <text x="710" y="65" font-family="Arial" font-size="14" font-weight="bold" fill="#1e3a5f" text-anchor="middle">Output</text>
  <text x="400" y="160" font-family="Arial" font-size="13" fill="#374151" text-anchor="middle">{short[:60]}</text>
  <text x="400" y="185" font-family="Arial" font-size="13" fill="#374151" text-anchor="middle">{short[60:120]}</text>
</svg>"""
    b64 = base64.b64encode(svg.encode("utf-8")).decode("utf-8")
    return f"data:image/svg+xml;base64,{b64}"