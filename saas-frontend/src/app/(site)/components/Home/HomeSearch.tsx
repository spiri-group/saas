'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomeSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative group">
        {/* Soft sacred glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-r from-[#f6b041]/30 via-[#e8b84d]/20 to-[#d4b5f7]/30 rounded-full blur-xl opacity-60 group-hover:opacity-80 transition-all duration-500"></div>
        
        {/* Main search bar */}
        <div className="relative flex items-center w-full h-16 px-7 rounded-full bg-white/90 backdrop-blur-sm shadow-xl border border-white/50">
          <svg 
            className="w-5 h-5 text-slate-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for what you seek..."
            className="flex-1 ml-4 text-lg outline-none text-slate-700 placeholder-slate-400 bg-transparent font-light"
          />
        </div>
      </div>
    </form>
  );
}
