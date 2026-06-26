import os
import sys
import time
from typing import List

# Ensure the backend directory is in the import path so we can resolve embeddings
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from embeddings import embedder, chroma_client

# Define compliance rules data directory relative to backend base
DATA_DIR = os.getenv("COMPLIANCE_DATA_DIR", os.path.join(BASE_DIR, "data", "compliance"))

def load_compliance_documents():
    """
    Main function to parse compliance text files, chunk them, embed them in batches,
    and save them into the correct 'compliance_docs' / 'compliance_gemini' ChromaDB collection.
    """
    provider = os.getenv("EMBEDDING_PROVIDER", "sentence").lower()
    collection_name = "compliance_docs"
    if provider == "gemini":
        collection_name = "compliance_gemini"

    print(f"Compliance loader (active provider: {provider}): scanning directory '{DATA_DIR}' for text files...")
    
    if not os.path.exists(DATA_DIR):
        print(f"Error: Compliance data directory '{DATA_DIR}' does not exist.")
        return
    
    # 1. Get or create the separate collection dynamically
    compliance_collection = chroma_client.client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )
    
    # List all txt files
    txt_files = [f for f in os.listdir(DATA_DIR) if f.endswith(".txt")]
    if not txt_files:
        print("No compliance text files (.txt) found to index.")
        return
    
    print(f"Found {len(txt_files)} files: {txt_files}")
    
    for file_name in txt_files:
        file_path = os.path.join(DATA_DIR, file_name)
        print(f"\nProcessing file: {file_name}")
        
        # Read file contents
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading file {file_name}: {e}")
            continue
        
        # 2. Split content into paragraphs/chunks
        chunks = [chunk.strip() for chunk in content.split("\n\n") if chunk.strip()]
        print(f"Split '{file_name}' into {len(chunks)} chunks.")
        
        active_ids = []
        
        # 3. Batch embed and upsert chunks in sizes of 50
        batch_size = 50
        for i in range(0, len(chunks), batch_size):
            batch_chunks = chunks[i:i + batch_size]
            batch_ids = []
            batch_metadatas = []
            
            for idx, chunk_text in enumerate(batch_chunks):
                global_idx = i + idx
                safe_file_name = file_name.replace(".", "_")
                chunk_id = f"{safe_file_name}_chunk_{global_idx}"
                batch_ids.append(chunk_id)
                active_ids.append(chunk_id)
                
                batch_metadatas.append({
                    "source": file_name,
                    "chunk_id": chunk_id
                })
            
            # Generate embeddings for the batch
            print(f"  Generating embeddings for batch {i//batch_size + 1} (size: {len(batch_chunks)})...")
            try:
                embeddings = embedder.get_embedding(batch_chunks)
                
                # 4. Upsert batch into ChromaDB
                compliance_collection.upsert(
                    ids=batch_ids,
                    embeddings=embeddings,
                    documents=batch_chunks,
                    metadatas=batch_metadatas
                )
                print(f"  Upserted batch {i//batch_size + 1} successfully.")
            except Exception as e:
                print(f"  Error processing batch {i//batch_size + 1}: {e}")
                
            # Sleep 1 second between API calls if using Gemini provider to respect limits
            if provider == "gemini" and i + batch_size < len(chunks):
                print("  Sleeping 1 second to respect API limits...")
                time.sleep(1.0)
            
        # 5. Clean up old/obsolete chunks from database if file shrank
        try:
            existing_results = compliance_collection.get(where={"source": file_name})
            existing_ids = existing_results.get("ids", [])
            for old_id in existing_ids:
                if old_id not in active_ids:
                    compliance_collection.delete(ids=[old_id])
                    print(f"  Cleaned up obsolete chunk: {old_id}")
        except Exception as e:
            print(f"  Warning during cleanup of old chunks: {e}")
            
    print(f"\nCompliance load and indexing completed successfully into '{collection_name}'!")

if __name__ == "__main__":
    load_compliance_documents()
