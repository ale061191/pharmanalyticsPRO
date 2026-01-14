'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import DashboardCard from '@/components/DashboardCard';
import { TrendingUp, Package, Activity, AlertCircle, Star, RefreshCw } from 'lucide-react';
import Link from 'next/link';

// Product with ranking score interface
interface RankedProduct {
  id: string;
  name: string;
  lab_name: string | null;
  category: string;
  avg_price: number;
  image_url: string | null;
  score: number;
  rank: number;
  global_rank?: number;
  category_rank?: number;
  depletion_percent: number;
  rating?: number;
  review_count?: number;
}

// Available categories from Farmatodo
const CATEGORIES = [
  { value: 'all', label: 'Todas las Categorías' },
  { value: 'Dolor General', label: 'Dolor General' },
  { value: 'Salud Respiratoria y Gripe', label: 'Salud Respiratoria y Gripe' },
  { value: 'Salud Digestiva', label: 'Salud Digestiva' },
  { value: 'Vitaminas y Productos Naturales', label: 'Vitaminas y Productos Naturales' },
  { value: 'Medicamentos', label: 'Medicamentos' },
  { value: 'Dermatológicos', label: 'Dermatológicos' },
  { value: 'Cuidado de la Vista', label: 'Cuidado de la Vista' },
  { value: 'Botiquín y Primeros Auxilios', label: 'Botiquín' },
];

export default function Home() {
  // Products state
  const [products, setProducts] = useState<RankedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch rankings data
  const fetchRankings = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const categoryParam = selectedCategory !== 'all' ? `&category=${encodeURIComponent(selectedCategory)}` : '';
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
      const currentPage = reset ? 1 : page;

      const response = await fetch(`/api/rankings?page=${currentPage}&limit=20${categoryParam}${searchParam}`);
      const data = await response.json();

      if (data.success) {
        if (reset) {
          setProducts(data.data);
        } else {
          setProducts(prev => [...prev, ...data.data]);
        }
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Trigger fetch on filter changes
  useEffect(() => {
    fetchRankings(true);
  }, [selectedCategory, debouncedSearch]);

  useEffect(() => {
    // Initial fetch
    fetchRankings(true);

    // Auto-refresh every 5 minutes
    const refreshInterval = setInterval(() => {
      // Only refresh page 1 transparently to keep top updated
      // Or full reset? Full reset might be annoying if user scrolled down.
      // Let's just refresh current view if possible, but simplest is silent refresh of page 1 if at top.
      // For now, keep simple:
      console.log('🔄 Auto-refreshing rankings...');
      // fetchRankings(true); // Disable auto-refresh list reset for now to avoid UX jumps
    }, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);



  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  // Effect to fetch when page increments (but NOT when resetting to 1 via category change, handled above)
  useEffect(() => {
    if (page > 1) {
      fetchRankings(false);
    }
  }, [page]);


  // Calculate average score for KPI
  const avgScore = products.length > 0
    ? (products.reduce((sum, p) => sum + p.score, 0) / products.length).toFixed(1)
    : '0';

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 4.0) return 'text-green-600';
    if (score >= 3.0) return 'text-yellow-600';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-purple-100">
      <Navbar />

      <main className="max-w-[98%] mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Market Overview</h1>
          <p className="text-muted-foreground">Monitoreo en tiempo real de productos farmacéuticos.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <DashboardCard title="Productos en Ranking" value={products.length.toString()} icon={Package} trend="Top 20" />
          <DashboardCard title="Score Promedio" value={avgScore} icon={TrendingUp} trend="depleción + precio" />
          <DashboardCard title="Precisión Modelo" value="80-90%" icon={AlertCircle} trend="PRD v1" />
          <DashboardCard title="Market Engagement" value="Coming Soon" icon={Activity} />
        </div>

        {/* Top Ranking Table */}
        <div className="glass-panel rounded-3xl overflow-hidden p-1 shadow-lg">
          <div className="bg-white/50 px-6 py-4 border-b border-purple-50 flex justify-between items-center flex-wrap gap-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="w-2 h-6 bg-primary rounded-full"></span>
              Ranking de Ventas
            </h2>
            <div className="flex items-center gap-3">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm font-medium text-slate-700 bg-white border border-purple-200 px-3 py-1.5 rounded-lg hover:border-purple-400 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all cursor-pointer"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-3 pr-8 py-1.5 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none w-48 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                onClick={() => fetchRankings(true)}
                disabled={refreshing || loading}
                className="text-xs font-medium text-purple-600 bg-purple-100 px-3 py-1.5 rounded-md hover:bg-purple-200 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4 font-semibold"># Rank</th>
                  <th className="px-6 py-4 font-semibold">Producto</th>
                  <th className="px-6 py-4 font-semibold">Laboratorio</th>
                  <th className="px-6 py-4 font-semibold min-w-[180px]">Categoría</th>
                  <th className="px-6 py-4 font-semibold">Precio Prom.</th>
                  <th className="px-6 py-4 font-semibold">Depleción</th>
                  <th className="px-6 py-4 font-semibold text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white/40">
                {loading && page === 1 ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 w-4 bg-slate-200 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-12 bg-slate-200 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-12 bg-slate-200 rounded"></div></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 w-12 bg-slate-200 rounded ml-auto"></div></td>
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      <Package size={48} className="mx-auto mb-4 text-slate-300" />
                      <p className="font-medium">No hay productos en el ranking</p>
                      <p className="text-sm">Ejecuta el scraper para obtener datos</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-purple-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start justify-center">
                            <div className="font-bold text-slate-700 text-lg">
                              #{product.global_rank || product.rank} <span className="text-[10px] text-slate-400 uppercase font-normal">Global</span>
                            </div>
                            {product.category_rank && (
                              <div className="text-xs font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 mt-1">
                                #{product.category_rank} <span className="font-normal opacity-70">{product.category.split(' ')[0]}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {/* SQUARE IMAGE FORMAT with OBJECT COVER */}
                            <div className="w-16 h-16 shrink-0 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                              ) : (
                                <Package size={24} className="text-slate-300" />
                              )}
                            </div>
                            <div>
                              <Link href={`/product/${product.id}`} className="font-semibold text-foreground group-hover:text-primary transition-colors hover:underline line-clamp-2">
                                {product.name}
                              </Link>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> Stock Disponible
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {product.lab_name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-primary border border-purple-200 whitespace-nowrap">
                            {product.category || 'Salud'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-slate-600">
                          Bs.{product.avg_price?.toFixed(2) || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                                style={{ width: `${Math.min(100, product.depletion_percent)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-slate-600">{product.depletion_percent}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`font-bold text-sm ${getScoreColor(product.rating || 0)}`}>
                              {product.rating ? product.rating.toFixed(1) : 'N/A'}
                            </span>
                            <div className="flex text-yellow-500 gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={14}
                                  fill={(product.rating || 0) >= star ? "currentColor" : "none"}
                                  className={(product.rating || 0) >= star ? "text-yellow-500" : "text-slate-300"}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-slate-400 ml-1">({product.review_count || 0})</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>

            {/* Load More Button */}
            {hasMore && (
              <div className="p-4 flex justify-center border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-white border border-purple-200 text-purple-700 font-medium rounded-full shadow-sm hover:shadow-md hover:bg-purple-50 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? <RefreshCw className="animate-spin w-4 h-4" /> : null}
                  {loadingMore ? 'Cargando más...' : 'Cargar más productos'}
                </button>
              </div>
            )}

          </div>

          {/* Formula Disclaimer */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100">
            <p className="text-xs text-muted-foreground text-center">
              📊 Ranking basado en Score de Depleción + Popularidad. Ratings extraídos de Farmatodo.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
