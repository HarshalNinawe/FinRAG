import os
from typing import List, Union
import google.generativeai as genai
from dotenv import load_dotenv
from embeddings.base import BaseEmbeddingProvider

load_dotenv()

class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self, model_name: str = "models/gemini-embedding-001"):
        self.model_name = model_name
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)

    def _ensure_api_key(self):
        if not self.api_key:
            self.api_key = os.getenv("GEMINI_API_KEY")
            if self.api_key:
                genai.configure(api_key=self.api_key)
            else:
                raise ValueError("GEMINI_API_KEY environment variable is not set.")

    def get_embedding(self, text: Union[str, List[str]]) -> Union[List[float], List[List[float]]]:
        self._ensure_api_key()
        
        # If text is empty or a list with empty strings, return zeroed vectors
        if not text:
            raise ValueError("Input text for embedding cannot be empty.")
            
        result = genai.embed_content(
            model=self.model_name,
            content=text,
            task_type="retrieval_document",
            output_dimensionality=768
        )
        return result["embedding"]

    def get_dimension(self) -> int:
        return 768

    def provider_name(self) -> str:
        return "gemini"
