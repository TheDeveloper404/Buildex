import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-blue-300 text-sm font-medium">Platforma activă - România 2026</span>
          </div>
          <h1 className="text-6xl font-extrabold text-white mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Buildex</span>
          </h1>
          <p className="text-xl text-slate-300 mb-2 max-w-2xl mx-auto">
            Achiziții și Inteligență de Prețuri pentru Construcții
          </p>
          <p className="text-slate-400">
            Gestionează materiale, furnizori, cereri de ofertă și analizează prețurile pieței
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto pb-12">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-blue-500/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 h-full cursor-pointer">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
              <span className="text-blue-400 text-lg">📦</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Materiale</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Catalog de materiale cu aliasuri și specificații tehnice</p>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-emerald-500/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 h-full cursor-pointer">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
              <span className="text-emerald-400 text-lg">🏢</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Furnizori</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Gestionează rețeaua de furnizori și contactele</p>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-amber-500/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 h-full cursor-pointer">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4">
              <span className="text-amber-400 text-lg">📋</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Cereri de Ofertă</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Creează și trimite cereri de ofertă către furnizori</p>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-purple-500/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 h-full cursor-pointer">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
              <span className="text-purple-400 text-lg">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Inteligență Prețuri</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Medii, volatilitate și tendințe pe 30/60/90 zile</p>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-red-500/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 h-full cursor-pointer">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center mb-4">
              <span className="text-red-400 text-lg">🔔</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Alerte</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Configurează alerte de preț și volatilitate</p>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-cyan-500/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 h-full cursor-pointer">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4">
              <span className="text-cyan-400 text-lg">🏠</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Panou Principal</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Vizualizare de ansamblu și acces rapid la module</p>
          </div>
        </div>

        {/* CTA */}
        <div className="pb-20 text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Link 
              href="/login"
              className="inline-flex items-center px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-lg shadow-lg shadow-blue-600/25 transition-all hover:shadow-blue-500/40 hover:-translate-y-0.5"
            >
              Autentificare
            </Link>
            <Link 
              href="/signup"
              className="inline-flex items-center px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-xl font-semibold text-lg transition-all hover:-translate-y-0.5"
            >
              Creează Cont
            </Link>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <Link 
              href="/dev-login"
              className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
            >
              🔧 Mod Demo (fără cont) - pentru testare
            </Link>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Demo: admin@democonstruction.ro / demo1234
          </p>
        </div>
      </div>
    </main>
  )
}
