# FinRAG

Real-Time Financial Context-Aware RAG System

# Problem Statement: 
Traditional RAG systems operate on static knowledge bases.
FinRAG explores how Retrieval-Augmented Generation can be combined with dynamic financial event streams such as payment failures, disputes, refunds, and fraud alerts.
The system combines live financial events, vector search, and LLM reasoning to provide context-aware financial insights.

# Architecture: 

Razorpay Sandbox
        ↓
FastAPI Backend
        ↓
PostgreSQL
        ↓
Embedding Pipeline
        ↓
ChromaDB
        ↓
Retriever
        ↓
Gemini AI
        ↓
Dashboard

## Features

- Real-time financial event ingestion
- Razorpay Sandbox integration
- PostgreSQL transaction storage
- ChromaDB vector database
- Semantic retrieval
- Gemini AI assistant
- Fraud alert generation
- Transaction search
- Live dashboard

## Tech Stack

Frontend:
- Next.js
- Tailwind CSS

Backend:
- FastAPI

Database:
- PostgreSQL

Vector Database:
- ChromaDB

LLM:
- Gemini

Deployment:
- Vercel
- Render

<img width="1911" height="860" alt="Screenshot 2026-06-06 235906" src="https://github.com/user-attachments/assets/3fc0d5e7-e29f-4ac6-965f-c7667f77cc7b" />
<img width="1896" height="857" alt="Screenshot 2026-06-06 234159" src="https://github.com/user-attachments/assets/e124f7e3-c7ee-4df8-bbc0-a18543ae2956" />
<img width="1896" height="857" alt="Screenshot 2026-06-06 234159" src="https://github.com/user-attachments/assets/98393d3b-8ec4-4e77-a64e-eecbbd3b9021" />
<img width="1896" height="857" alt="Screenshot 2026-06-06 234159" src="https://github.com/user-attachments/assets/5c0ce69f-14df-4428-b9b8-38a80dfa1893" />
<img width="1896" height="857" alt="Screenshot 2026-06-06 234159" src="https://github.com/user-attachments/assets/ab14d068-a9c4-4eca-bb12-9b7b7ed1c5bf" />
