import { Pill, BarChart3, Map as MapIcon, Settings } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="border-b border-purple-100 bg-white/50 backdrop-blur-xl sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                        <Pill size={18} />
                    </div>
                    <span className="font-bold text-lg tracking-tight">FarmatodoTracker<span className="text-primary">Pro</span></span>
                </div>

                <div className="flex items-center gap-6">
                    <Link href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
                        <BarChart3 size={16} /> Rankings
                    </Link>
                    <Link href="/map" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                        <MapIcon size={16} /> Mapa
                    </Link>
                    <button className="p-2 hover:bg-slate-100 rounded-full text-muted-foreground transition-colors">
                        <Settings size={20} />
                    </button>
                </div>
            </div>
        </nav>
    );
}
