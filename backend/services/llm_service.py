import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=API_KEY)

model = genai.GenerativeModel("gemini-2.5-flash")


def generate_answer(prompt: str) -> str:
    """
    Send prompt to Gemini and return text response.
    """

    response = model.generate_content(prompt)

    return response.text