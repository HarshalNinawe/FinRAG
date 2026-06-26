from typing import List, Union
from sentence_transformers import SentenceTransformer
from embeddings.base import BaseEmbeddingProvider

class SentenceTransformerProvider(BaseEmbeddingProvider):
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model = None

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            print(f"Loading SentenceTransformer model '{self.model_name}'...")
            self._model = SentenceTransformer(self.model_name)
            print("SentenceTransformer model loaded successfully.")
        return self._model

    def get_embedding(self, text: Union[str, List[str]]) -> Union[List[float], List[List[float]]]:
        model = self._get_model()
        if isinstance(text, str):
            return model.encode(text).tolist()
        else:
            # list of strings
            return model.encode(text).tolist()

    def get_dimension(self) -> int:
        return 384

    def provider_name(self) -> str:
        return "sentence"
