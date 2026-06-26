import os
import sys
import time
import subprocess

# Ensure backend directory is in path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# Load env
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
    except Exception:
        pass
    return 0.0

if __name__ == "__main__":
    # Force Gemini Mode
    os.environ["EMBEDDING_PROVIDER"] = "gemini"
    
    print("=== GEMINI FRESH PROCESS BENCHMARK ===")
    mem_idle = get_windows_rss()
    print(f"1. Idle RAM Usage (Fresh Process): {mem_idle:.2f} MB")
    
    # Load client (this triggers import of chromadb and google-generativeai, but NOT PyTorch/sentence-transformers)
    from embeddings import embedder, chroma_client
    from rag.retriever import retrieve_context
    from services.rag_service import ask_rag
    
    mem_imported = get_windows_rss()
    print(f"2. RAM Usage after imports: {mem_imported:.2f} MB (Delta: +{mem_imported - mem_idle:.2f} MB)")
    
    # Warmup / first API call
    embedder.get_embedding("warmup")
    mem_loaded = get_windows_rss()
    print(f"3. RAM Usage after first embedding API call: {mem_loaded:.2f} MB (Delta: +{mem_loaded - mem_imported:.2f} MB)")
    
    # Run full RAG retrieval & generation
    query = "Dispute or fraud risk"
    response = ask_rag(query)
    mem_peak = get_windows_rss()
    
    print(f"4. Peak RAM Usage during full RAG flow: {mem_peak:.2f} MB")
    print(f"RAG Response Length: {len(response['answer'])} characters")
