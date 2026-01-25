import { Pill, BarChart3, Map as MapIcon, Settings, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="border-b border-blue-100 bg-white/50 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
            <div className="max-w-[98%] mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center">
                        <img src="/logo.png" alt="Pharmanalytics Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="font-bold text-xl tracking-tight text-[#0066cc]">
                            pharm<span className="text-[#32cd32]">analytics</span> <span className="text-[#00bfff]">PRO</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold tracking-wide uppercase mt-0.5">
                            Pharmaceutical Insights & AI
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <Link href="/" className="text-base font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2">
                        <BarChart3 size={18} /> Rankings
                    </Link>
                    <Link href="/market-share" className="text-base font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                        <TrendingUp size={18} /> Market Share
                    </Link>

                    <button className="p-2 hover:bg-slate-100 rounded-full text-muted-foreground transition-colors">
                        <Settings size={22} />
                    </button>
                </div>
            </div>
        </nav>
    );
}
