from rag.context_builder import build_context
from rag.prompt_builder import build_prompt

query = "Why did payment fail?"

context = build_context(query)

prompt = build_prompt(
    query,
    context
)

print(prompt)