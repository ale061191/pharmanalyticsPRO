'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import DashboardCard from '@/components/DashboardCard';
import GrowthTicker from '@/components/GrowthTicker';
import FiltersBar from '@/components/FiltersBar';
import SearchResultsTable from '@/components/SearchResultsTable';
import { TrendingUp, Package, Activity, AlertCircle, Star, RefreshCw } from 'lucide-react';
import Link from 'next/link';



export default function Home() {
  // Search Results State
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);

  const handleSearch = async (filters: any) => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.lab) queryParams.set('lab', filters.lab);
      if (filters.atc) queryParams.set('atc', filters.atc);
      if (filters.product) queryParams.set('name', filters.product);
      if (filters.concentration) queryParams.set('concentration', filters.concentration);
      if (filters.presentation) queryParams.set('presentation', filters.presentation);
      if (filters.period) queryParams.set('period', filters.period);
      if (filters.city) queryParams.set('city', filters.city);
      if (filters.municipality) queryParams.set('municipality', filters.municipality);
      if (filters.branch) queryParams.set('branch', filters.branch);

      const res = await fetch(`/api/products/search?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-blue-100">
      <Navbar />

      <main className="max-w-[98%] mx-auto px-4 py-8">


        {/* Growth Ticker (Glassmorphism Cards) */}
        <GrowthTicker />

        {/* Filter Section */}
        <FiltersBar onSearch={handleSearch} isLoading={isSearching} />

        {/* Search Results Table */}
        <SearchResultsTable results={searchResults} isVisible={hasSearched} />


        {/* Market analytics and search results are now handled by the FiltersBar and SearchResultsTable above */}
      </main>
    </div>
  );
}
