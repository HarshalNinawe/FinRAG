import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden relative">

      {/* Ambient background glow effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-violet-500/20">
            F
          </div>
          <span className="text-lg font-semibold tracking-tight">FinRAG</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <a href="#" className="hover:text-white transition-colors">Documents</a>
          <a href="#" className="hover:text-white transition-colors">Chat</a>
          <a href="#" className="hover:text-white transition-colors">Analytics</a>
        </div>
        <Link href="/dashboard" className="text-sm px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
          Get Started
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          AI-Powered Financial Intelligence
        </div>

        {/* Main Title */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6 max-w-4xl">
          <span className="text-white">Understand Your</span>
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Financial Documents
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white/50 max-w-2xl leading-relaxed mb-10">
          FinRAG combines Retrieval-Augmented Generation with your financial data —
          upload reports, query insights, and get intelligent answers instantly.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button className="px-8 py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 active:scale-95">
            Upload Documents →
          </button>
          <button className="px-8 py-3.5 rounded-full bg-white/5 border border-white/10 text-white/80 font-semibold text-sm hover:bg-white/10 hover:text-white transition-all">
            View API Docs
          </button>
        </div>
      </section>

      {/* Stats Row */}
      <section className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-px mx-6 mb-20">
        {[
          { value: "10x", label: "Faster Insights" },
          { value: "99%", label: "Accuracy Rate" },
          { value: "∞", label: "Documents Supported" },
          { value: "<1s", label: "Query Response" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex-1 bg-white/3 border border-white/5 first:rounded-l-2xl last:rounded-r-2xl px-8 py-6 text-center hover:bg-white/5 transition-colors"
          >
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm text-white/40">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Feature Cards */}
      <section className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 px-6 max-w-6xl mx-auto mb-24">
        {[
          {
            icon: "📄",
            title: "Document Ingestion",
            description: "Upload PDFs, CSVs, and financial reports. Our pipeline extracts and indexes content automatically.",
            color: "from-violet-500/20 to-violet-500/5",
            border: "border-violet-500/20",
          },
          {
            icon: "🤖",
            title: "RAG-Powered Chat",
            description: "Ask questions in plain English. Get answers grounded in your actual documents — not hallucinations.",
            color: "from-indigo-500/20 to-indigo-500/5",
            border: "border-indigo-500/20",
          },
          {
            icon: "📊",
            title: "Transaction Analytics",
            description: "Track, filter, and analyze financial transactions with intelligent categorization and insights.",
            color: "from-cyan-500/20 to-cyan-500/5",
            border: "border-cyan-500/20",
          },
        ].map((card) => (
          <div
            key={card.title}
            className={`rounded-2xl bg-gradient-to-b ${card.color} border ${card.border} p-6 hover:scale-[1.02] transition-all cursor-pointer group`}
          >
            <div className="text-3xl mb-4">{card.icon}</div>
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-violet-300 transition-colors">
              {card.title}
            </h3>
            <p className="text-sm text-white/50 leading-relaxed">{card.description}</p>
          </div>
        ))}
      </section>

      {/* API Status Banner */}
      <section className="relative z-10 mx-6 max-w-6xl mx-auto mb-16">
        <div className="rounded-2xl bg-white/3 border border-white/5 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-white/70">Backend API is <span className="text-emerald-400 font-medium">live</span> at</span>
            <code className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-violet-300 font-mono">
              http://127.0.0.1:8000
            </code>
          </div>
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/40 hover:text-white transition-colors underline underline-offset-2"
          >
            Open Swagger UI →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-6 flex items-center justify-between text-xs text-white/20">
        <span>© 2026 FinRAG. Built with Next.js + FastAPI.</span>
        <span>Step 8 Complete ✓</span>
      </footer>

    </main>
  );
}
