import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-8 relative">

      {/* Navigation */}
      <nav className="absolute top-0 w-full flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold">
            F
          </div>
          <span className="text-xl font-medium tracking-tight">FinRAG</span>
        </div>
        <Link href="/dashboard" className="text-sm font-medium hover:underline underline-offset-4">
          Go to Dashboard →
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center max-w-3xl mt-20">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-8">
          Financial Intelligence,<br /> Simplified.
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Analyze, query, and search your financial transactions with AI.
        </p>
        <Link 
          href="/dashboard" 
          className="px-8 py-4 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
        >
          Open Dashboard
        </Link>
      </section>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full px-8 py-6 flex items-center justify-between text-sm text-gray-500">
        <span>© 2026 FinRAG</span>
      </footer>

    </main>
  );
}
