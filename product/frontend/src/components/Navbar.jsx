import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import { useProduct } from '../context/ProductContext';
import { useAuthBridge } from '../context/AuthBridgeContext';

// Unique AI-Vendor Hub Logo
const AIVendorLogo = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e0e0ff" />
      </linearGradient>
    </defs>
    
    {/* Main AI Circuit Design */}
    {/* Left vertical line */}
    <line x1="10" y1="10" x2="10" y2="34" stroke="url(#logoGrad2)" strokeWidth="2" strokeLinecap="round"/>
    
    {/* Right vertical line */}
    <line x1="34" y1="10" x2="34" y2="34" stroke="url(#logoGrad2)" strokeWidth="2" strokeLinecap="round"/>
    
    {/* Top horizontal line */}
    <line x1="10" y1="10" x2="34" y2="10" stroke="url(#logoGrad2)" strokeWidth="2" strokeLinecap="round"/>
    
    {/* Middle horizontal line */}
    <line x1="10" y1="22" x2="34" y2="22" stroke="url(#logoGrad2)" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
    
    {/* Bottom horizontal line */}
    <line x1="10" y1="34" x2="34" y2="34" stroke="url(#logoGrad2)" strokeWidth="2" strokeLinecap="round"/>
    
    {/* Connection dots - circuit nodes */}
    <circle cx="10" cy="10" r="2.5" fill="url(#logoGrad2)"/>
    <circle cx="34" cy="10" r="2.5" fill="url(#logoGrad2)"/>
    <circle cx="22" cy="22" r="3" fill="url(#logoGrad2)"/>
    <circle cx="10" cy="34" r="2.5" fill="url(#logoGrad2)"/>
    <circle cx="34" cy="34" r="2.5" fill="url(#logoGrad2)"/>
    
    {/* Shopping bag in center (stylized) */}
    <path d="M 18 16 L 18 20 L 16 24 L 16 30 Q 16 32 18 32 L 28 32 Q 30 32 30 30 L 30 24 L 28 20 L 28 16 Q 28 14 26 14 L 20 14 Q 18 14 18 16" 
          fill="none" stroke="url(#logoGrad2)" strokeWidth="1.5" opacity="0.9"/>
    
    {/* Bag handle */}
    <path d="M 20 14 Q 22 10 22 10 Q 22 10 24 14" 
          fill="none" stroke="url(#logoGrad2)" strokeWidth="1.5" opacity="0.7"/>
  </svg>
);

export default function Navbar() {
  const { filters, updateFilters } = useProduct();
  const { user, isAuthenticated, loading, loginUrl, profileUrl, logout } = useAuthBridge();
  const [menuOpen, setMenuOpen] = useState(false);
  // AI control is now available via floating control center on the page

  const isSeller = isAuthenticated && ['seller', 'admin'].includes(user?.role);
  const navLinks = ['Shop', 'New Arrivals', 'Deals'];

  // removed: handleAIClick — AI trigger moved to floating control center

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#11111d]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[80px] max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#635bff] to-[#8d87ff] transition-all duration-300 group-hover:shadow-lg group-hover:shadow-[#635bff]/50">
            <AIVendorLogo />
          </div>
          <span className="hidden text-2xl font-black tracking-tight text-[#c8c3ff] sm:text-3xl sm:inline-block transition-colors group-hover:text-[#8d87ff]">
            Ai-VendorHub
          </span>
        </Link>

        <nav className="ml-12 hidden items-center gap-6 md:flex">
          {navLinks.map((item, index) => (
            <a
              key={item}
              href={index === 0 ? '/' : '#catalog'}
              className={`text-sm font-black text-[#bab5c9] transition hover:text-[#f2efff] ${index === 0 ? 'border-b-2 border-[#c8c3ff] pb-0.5 text-[#f2efff]' : ''}`}
            >
              {item}
            </a>
          ))}
          {isSeller && (
            <Link to="/seller-dashboard" className="text-sm font-black text-[#c8c3ff] transition hover:text-[#f2efff]">
              Seller Dashboard
            </Link>
          )}
          {/* AI button removed from navbar: use floating AI control center on page */}
        </nav>

        <div className="ml-auto hidden h-12 w-[320px] items-center gap-2 rounded-lg border border-white/10 bg-[#1a1b26] px-3 lg:flex">
          <Search className="h-5 w-5 text-[#817d94]" />
          <input
            value={filters.searchTerm}
            onChange={(event) => updateFilters({ searchTerm: event.target.value })}
            placeholder="Search products..."
            className="h-full flex-1 bg-transparent text-sm font-bold text-[#f1efff] outline-none placeholder:text-[#817d94]"
          />
        </div>

        <div className="ml-5 hidden items-center gap-5 md:flex">
          <button type="button" className="text-[#c8c3d4] transition hover:text-white" aria-label="Cart">
            <ShoppingCart className="h-7 w-7" />
          </button>
          {isAuthenticated ? (
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-2 py-2">
              <a href={profileUrl} className="flex items-center gap-2 text-[#f1efff] transition hover:text-white" aria-label="Profile">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#635bff] text-sm font-black">
                  {(user?.username || user?.email || 'U').slice(0, 2).toUpperCase()}
                </span>
                <span className="max-w-32 truncate text-sm font-black">{user?.username || 'Account'}</span>
              </a>
              <button
                type="button"
                onClick={logout}
                className="grid h-9 w-9 place-items-center rounded-full text-[#c8c3d4] transition hover:bg-white/10 hover:text-white"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <a href={loginUrl} className="inline-flex items-center gap-2 rounded-full bg-[#635bff] px-4 py-2 text-sm font-black text-white transition hover:bg-[#746dff]" aria-label="Login">
              <User className="h-4 w-4" />
              {loading ? 'Checking...' : 'Login'}
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="ml-auto grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-[#f1efff] md:hidden"
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/5 bg-[#11111d] px-4 py-4 md:hidden">
          <div className="mb-4 flex h-11 items-center gap-3 rounded-xl border border-white/10 bg-[#1a1b26] px-4">
            <Search className="h-5 w-5 text-[#817d94]" />
            <input
              value={filters.searchTerm}
              onChange={(event) => updateFilters({ searchTerm: event.target.value })}
              placeholder="Search products..."
              className="h-full flex-1 bg-transparent text-sm font-bold text-[#f1efff] outline-none"
            />
          </div>
          <div className="grid gap-2">
            {navLinks.map((item) => (
              <a key={item} href="#catalog" onClick={() => setMenuOpen(false)} className="rounded-xl bg-white/5 px-4 py-3 text-sm font-black text-[#d9d5ee]">
                {item}
              </a>
            ))}
            {isSeller && (
              <Link to="/seller-dashboard" onClick={() => setMenuOpen(false)} className="rounded-xl bg-white/5 px-4 py-3 text-sm font-black text-[#d9d5ee]">
                Seller Dashboard
              </Link>
            )}
            <a href={isAuthenticated ? profileUrl : loginUrl} className="rounded-xl bg-[#635bff] px-4 py-3 text-sm font-black text-white">
              {isAuthenticated ? `Account: ${user?.username || user?.email || 'Profile'}` : 'Login to continue'}
            </a>
            {/* Mobile AI button removed; floating control center available on page */}
          </div>
        </div>
      )}

      {/* AIAssistant removed from Navbar; control center is provided by page-level component */}
    </header>
  );
}
