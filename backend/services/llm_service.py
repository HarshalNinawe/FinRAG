import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=API_KEY)

_model = None


def get_model():
    global _model

    if _model is None:
        _model = genai.GenerativeModel("gemini-2.5-flash")

    return _model

from google.api_core.exceptions import ResourceExhausted

def generate_answer(prompt: str) -> str:

    try:
        response = get_model().generate_content(prompt)
        return response.text

    except ResourceExhausted:
        return """
Gemini API quota exceeded.

The retrieval pipeline completed successfully,
but answer generation is temporarily unavailable.

Please try again later.
"""

    except Exception as e:
        return f"LLM Error: {str(e)}"