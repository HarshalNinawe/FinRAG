import os
import time
import google.generativeai as genai
from fastapi import HTTPException
from google.api_core.exceptions import ResourceExhausted
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

def generate_answer(prompt: str) -> str:
    """
    Generate an answer using the Gemini LLM.
    Raises HTTPException 429 when the API quota is exceeded.
    Returns LLM answer string on success.
    """
    try:
        response = get_model().generate_content(prompt)
        return response.text

    except ResourceExhausted:
        raise HTTPException(
            status_code=429,
            detail=(
                "Gemini API rate limit reached. "
                "The retrieval pipeline completed successfully — "
                "please wait a moment and try again."
            )
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM generation failed: {str(e)}"
        )