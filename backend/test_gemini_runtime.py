import os
import sys
import time
import subprocess

# Ensure backend directory is in path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# Load environment variables
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"))

def get_windows_rss() -> float:
    """Gets current process Working Set (RSS) in MB using wmic."""
    try:
        pid = os.getpid()
        cmd = f"wmic process where processid={pid} get WorkingSetSize"
        output = subprocess.check_output(cmd, shell=True).decode()
        lines = [line.strip() for line in output.split("\n") if line.strip()]
        if len(lines) > 1:
            bytes_val = int(lines[1])
            return bytes_val / (1024 * 1024)
    except Exception as e:
        print(f"Memory check warning: {e}")
    return 0.0

def test_runtime(provider_name):
    # Setup environment
    os.environ["EMBEDDING_PROVIDER"] = provider_name
    
    # Reset singletons in embedder and chroma_client
    from embeddings import embedder, chroma_client
    embedder._provider = None
    chroma_client._collection = None
    
    # Reset singletons in retriever (CRITICAL: prevents caching issues when running both modes back-to-back)
    import rag.retriever as retriever
    retriever._transactions_collection = None
    retriever._compliance_collection = None
    
    print(f"\n==========================================")
    print(f"RUNNING RUNTIME TEST FOR: {provider_name.upper()} MODE")
    print(f"==========================================")
    
    # 1. Idle RAM (right after importing and initializing provider)
    mem_idle = get_windows_rss()
    print(f"Idle RAM Usage: {mem_idle:.2f} MB")
    
    # Trigger first embedding (lazy loads model/client)
    t0_init = time.time()
    embedder.get_embedding("warmup query")
    t1_init = time.time()
    init_duration = t1_init - t0_init
    print(f"Initialization + First Embedding Time: {init_duration:.2f} s")
    
    mem_loaded = get_windows_rss()
    print(f"RAM Usage after Model Loading: {mem_loaded:.2f} MB (Delta: +{mem_loaded - mem_idle:.2f} MB)")
    
    # Run retrieval tests
    from rag.retriever import retrieve_context
    from services.rag_service import ask_rag
    
    # Test query
    query = "Dispute or fraud risk"
    
    # Measure RAG pipeline breakdown
    print(f"\nRunning RAG Context Retrieval for query: '{query}'...")
    
    t0_embed = time.time()
    query_vector = embedder.get_embedding(query)
    t1_embed = time.time()
    
    t0_retrieve = time.time()
    retrieval_results = retrieve_context(query)
    t1_retrieve = time.time()
    
    t0_ask = time.time()
    rag_response = ask_rag(query)
    t1_ask = time.time()
    
    mem_peak = get_windows_rss()
    
    embed_ms = (t1_embed - t0_embed) * 1000
    retrieve_ms = (t1_retrieve - t0_retrieve) * 1000
    total_rag_ms = (t1_ask - t0_ask) * 1000
    generation_ms = total_rag_ms - retrieve_ms
    
    print(f"\n--- Metrics Breakdown ({provider_name.upper()}) ---")
    print(f"Vector dimension: {len(query_vector)}")
    print(f"Chroma redirection check: retrieved {len(retrieval_results.get('transactions', []))} transactions & {len(retrieval_results.get('compliance_rules', []))} compliance rules.")
    print(f"Embedding Latency: {embed_ms:.2f} ms")
    print(f"Retrieval Loop Latency: {retrieve_ms:.2f} ms")
    print(f"LLM Generation Latency: {generation_ms:.2f} ms")
    print(f"Total Chat Request Latency: {total_rag_ms:.2f} ms")
    print(f"Peak RAM Usage during RAG: {mem_peak:.2f} MB")
    
    print(f"\nSample Answer:\n{rag_response['answer']}")

if __name__ == "__main__":
    # Test Sentence mode first (default)
    test_runtime("sentence")
    
    # Test Gemini mode (staging validation)
    test_runtime("gemini")
