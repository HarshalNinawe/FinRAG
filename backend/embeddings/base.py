from abc import ABC, abstractmethod
from typing import List, Union

class BaseEmbeddingProvider(ABC):
    @abstractmethod
    def get_embedding(self, text: Union[str, List[str]]) -> Union[List[float], List[List[float]]]:
        """
        Generate embedding(s) for a single string or a list of strings.
        """
        pass

    @abstractmethod
    def get_dimension(self) -> int:
        """
        Return the dimension of the embedding vectors.
        """
        pass

    @abstractmethod
    def provider_name(self) -> str:
        """
        Return the identifier string for the provider (e.g., 'sentence', 'gemini').
        """
        pass
