'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import DashboardCard from '@/components/DashboardCard';
import GrowthTicker from '@/components/GrowthTicker';
import FiltersBar from '@/components/FiltersBar';
import SearchResultsTable from '@/components/SearchResultsTable';
import ProductDetailSidebar from '@/components/ProductDetailSidebar';
import ATCDistributionChart from '@/components/ATCDistributionChart'; // Import added
import { TrendingUp, Package, Activity, AlertCircle, Star, RefreshCw } from 'lucide-react';
import Link from 'next/link';



export default function Home() {
  // Search Results State
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<any>({});

  // Sidebar State
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleRowClick = (product: any) => {
    setSelectedProduct(product);
    setIsSidebarOpen(true);
  };

  const fetchProducts = async (filters: any, page: number, isLoadMore: boolean) => {
    try {
      if (isLoadMore) setIsLoadingMore(true);
      else setIsSearching(true);

      const queryParams = new URLSearchParams();
      if (filters.lab) queryParams.set('lab', filters.lab);
      if (filters.atcGroup) queryParams.set('group', filters.atcGroup); // NEW: mapped to 'group' param
      if (filters.atc) queryParams.set('atc', filters.atc);
      if (filters.product) queryParams.set('name', filters.product);
      if (filters.concentration) queryParams.set('concentration', filters.concentration);
      if (filters.presentation) queryParams.set('presentation', filters.presentation);
      if (filters.period) queryParams.set('period', filters.period);
      if (filters.city) queryParams.set('city', filters.city);
      if (filters.municipality) queryParams.set('municipality', filters.municipality);
      if (filters.branch) queryParams.set('branch', filters.branch);

      // Pagination params
      queryParams.set('page', page.toString());
      queryParams.set('limit', '20');

      const res = await fetch(`/api/products/search?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        if (isLoadMore) {
          setSearchResults(prev => [...prev, ...data.data]);
        } else {
          setSearchResults(data.data);
        }
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  const handleSearch = async (filters: any) => {
    setHasSearched(true);
    setCurrentFilters(filters);
    setCurrentPage(1);
    await fetchProducts(filters, 1, false);
  };

  const handleLoadMore = async () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await fetchProducts(currentFilters, nextPage, true);
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-blue-100">
      <Navbar />

      <main className="max-w-[98%] mx-auto px-4 py-8">


        {/* Growth Ticker (Glassmorphism Cards) */}
        <GrowthTicker />

        {/* ATC Distribution Chart */}
        <ATCDistributionChart />

        {/* Filter Section */}
        <FiltersBar onSearch={handleSearch} isLoading={isSearching} />

        {/* Search Results Table */}
        {/* Search Results Table */}
        <SearchResultsTable
          results={searchResults}
          isVisible={hasSearched}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          onRowClick={handleRowClick}
        />

        <ProductDetailSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          product={selectedProduct}
        />


        {/* Market analytics and search results are now handled by the FiltersBar and SearchResultsTable above */}
      </main>
    </div>
  );
}
