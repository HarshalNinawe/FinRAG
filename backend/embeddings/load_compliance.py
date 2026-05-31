import os
import sys
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
    Main function to parse compliance text files, chunk them, embed them,
    and save them into the 'compliance_docs' ChromaDB collection.
    """
    print(f"Compliance loader: scanning directory '{DATA_DIR}' for text files...")
    
    if not os.path.exists(DATA_DIR):
        print(f"Error: Compliance data directory '{DATA_DIR}' does not exist.")
        return
    
    # 1. Get or create the separate collection named "compliance_docs"
    compliance_collection = chroma_client.client.get_or_create_collection(
        name="compliance_docs",
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
        # Paragraphs are naturally separated by double newlines (\n\n)
        chunks = [chunk.strip() for chunk in content.split("\n\n") if chunk.strip()]
        print(f"Split '{file_name}' into {len(chunks)} chunks.")
        
        # Keep track of active IDs generated for this file
        active_ids = []
        
        # 3. Embed and upsert each chunk
        for idx, chunk_text in enumerate(chunks):
            # Deterministic unique ID to prevent duplicates
            safe_file_name = file_name.replace(".", "_")
            chunk_id = f"{safe_file_name}_chunk_{idx}"
            active_ids.append(chunk_id)
            
            # Generate embedding vector using sentence-transformers all-MiniLM-L6-v2
            embedding = embedder.get_embedding(chunk_text)
            
            # Metadata as requested: source file name and chunk id
            metadata = {
                "source": file_name,
                "chunk_id": chunk_id
            }
            
            # 4. Upsert into ChromaDB
            compliance_collection.upsert(
                ids=[chunk_id],
                embeddings=[embedding],
                documents=[chunk_text],
                metadatas=[metadata]
            )
            print(f"  Upserted chunk {idx} (ID: {chunk_id})")
            
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
            
    print("\nCompliance load and indexing completed successfully!")

if __name__ == "__main__":
    load_compliance_documents()
