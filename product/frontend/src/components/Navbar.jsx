import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, Clock3, Flame, Heart, LayoutDashboard, LogOut, Menu, ShoppingCart, Sparkles, User, X } from 'lucide-react';
import { useProduct } from '../context/ProductContext';
import { useAuthBridge } from '../context/AuthBridgeContext';
import { useCart } from '../context/CartContext';

// Unique AI-Vendor Hub Logo
const AIVendorLogo = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1c1917" />
        <stop offset="100%" stopColor="#166534" />
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
  const { filters, updateFilters, resetFilters, wishlist } = useProduct();
  const { user, isAuthenticated, loading, loginUrl, profileUrl, logout } = useAuthBridge();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  // AI control is now available via floating control center on the page

  const isSeller = isAuthenticated && ['seller', 'admin'].includes(user?.role);
  const isAdmin = isAuthenticated && user?.role === 'admin';
  const jumpToCatalog = () => {
    window.setTimeout(() => {
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };
  const navActions = [
    {
      label: 'Shop',
      icon: Sparkles,
      active: !filters.searchTerm && !filters.category && filters.sort === 'newest' && filters.maxPrice === '',
      onClick: () => {
        resetFilters();
        jumpToCatalog();
      },
    },
    {
      label: 'Trending',
      icon: Flame,
      active: filters.sort === 'stock_desc',
      onClick: () => {
        updateFilters({ searchTerm: '', sort: 'stock_desc' });
        jumpToCatalog();
      },
    },
    {
      label: 'Deals',
      icon: BadgePercent,
      active: filters.maxPrice === '10000',
      onClick: () => {
        updateFilters({ searchTerm: '', maxPrice: '10000', sort: 'price_asc' });
        jumpToCatalog();
      },
    },
    {
      label: 'Newest',
      icon: Clock3,
      active: filters.sort === 'newest' && Boolean(filters.searchTerm || filters.category || filters.maxPrice || filters.minPrice),
      onClick: () => {
        updateFilters({ sort: 'newest' });
        jumpToCatalog();
      },
    },
  ];

  // removed: handleAIClick — AI trigger moved to floating control center

  return (
    <header className="sticky top-0 z-40 px-3 py-3 sm:px-6 lg:px-10">
      <div className="relative flex h-[76px] w-full items-center overflow-hidden rounded-[28px] border border-white/80 bg-[rgba(255,255,255,0.30)] px-4 shadow-[0_20px_70px_rgba(28,25,23,0.18)] backdrop-blur-[24px] backdrop-saturate-150 sm:px-6 lg:px-8 2xl:px-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-white/24 to-stone-300/20" />
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/55" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white" />
        <div className="relative flex w-full items-center">
        <Link to="/" className="group flex min-w-0 items-center gap-3.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/45 shadow-sm backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-0.5">
            <span className="absolute inset-1 rounded-xl bg-white/10 opacity-0 transition group-hover:opacity-100" />
            <AIVendorLogo />
          </div>
          <div className="hidden min-w-0 sm:block">
            <span className="block truncate text-2xl font-black tracking-tight text-stone-950 transition-colors group-hover:text-emerald-800">
              Ai-VendorHub
            </span>
            <span className="mt-1 hidden items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 lg:flex">
              <Sparkles className="h-3 w-3" />
              AI Marketplace
            </span>
          </div>
        </Link>

        <nav className="ml-10 hidden items-center rounded-full border border-white/65 bg-white/35 p-1.5 shadow-sm backdrop-blur-xl md:flex">
          {navActions.map(({ label, icon: Icon, active, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`rounded-full px-5 py-2.5 text-sm font-black transition ${
                active
                  ? 'bg-stone-950 text-white shadow-sm'
                  : 'text-stone-700 hover:bg-white/65 hover:text-emerald-800'
              }`}
            >
              <Icon className="mr-1.5 inline h-4 w-4" />
              {label}
            </button>
          ))}
          {isSeller && (
            <Link to="/seller-dashboard" className="rounded-full px-5 py-2.5 text-sm font-black text-emerald-700 transition hover:bg-white hover:text-stone-950">
              Seller Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin-dashboard" className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-emerald-800">
              <LayoutDashboard className="mr-1.5 inline h-4 w-4" />
              Admin Portal
            </Link>
          )}
          {/* AI button removed from navbar: use floating AI control center on page */}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                window.location.href = loginUrl;
                return;
              }
              updateFilters({ searchTerm: '', sort: 'newest' });
              jumpToCatalog();
            }}
            className="hidden h-11 items-center gap-2 rounded-full border border-white/70 bg-white/45 px-4 text-sm font-black text-stone-800 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/70 hover:text-emerald-800 xl:inline-flex"
            aria-label="Wishlist"
          >
            <Heart className="h-4 w-4" />
            Wishlist
            {wishlist.length > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-100 px-1.5 text-[11px] text-amber-900">
                {wishlist.length}
              </span>
            )}
          </button>
          <Link to="/cart" className="relative grid h-11 w-11 place-items-center rounded-full bg-stone-950 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800" aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full border border-white bg-amber-400 px-1 text-[11px] font-black text-stone-950">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/45 p-1.5 shadow-sm backdrop-blur-xl">
              <a href={profileUrl} className="flex items-center gap-2 text-stone-950 transition hover:text-emerald-800" aria-label="Profile">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f5ead2] text-sm font-black text-stone-950">
                  {(user?.username || user?.email || 'U').slice(0, 2).toUpperCase()}
                </span>
                <span className="max-w-32 truncate text-sm font-black">{user?.username || 'Account'}</span>
              </a>
              <button
                type="button"
                onClick={logout}
                className="grid h-9 w-9 place-items-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-stone-950"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <a href={loginUrl} className="inline-flex h-11 items-center gap-2 rounded-full bg-stone-950 px-6 text-[15px] font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800" aria-label="Login">
              <User className="h-4 w-4" />
              {loading ? 'Checking...' : 'Login'}
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="ml-auto grid h-11 w-11 place-items-center rounded-xl border border-white/70 bg-white/45 text-stone-950 shadow-sm backdrop-blur-xl md:hidden"
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mt-3 rounded-3xl border border-stone-200 bg-white px-4 py-4 shadow-[0_18px_44px_rgba(28,25,23,0.12)] md:hidden">
          <div className="grid gap-2">
            {navActions.map(({ label, icon: Icon, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onClick();
                  setMenuOpen(false);
                }}
                className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-left text-sm font-black text-stone-950"
              >
                <Icon className="mr-2 inline h-4 w-4" />
                {label}
              </button>
            ))}
            {isSeller && (
              <Link to="/seller-dashboard" onClick={() => setMenuOpen(false)} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-black text-stone-950">
                Seller Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin-dashboard" onClick={() => setMenuOpen(false)} className="rounded-xl bg-stone-950 px-4 py-3 text-sm font-black text-white">
                Admin Portal
              </Link>
            )}
            <a href={isAuthenticated ? profileUrl : loginUrl} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">
              {isAuthenticated ? `Account: ${user?.username || user?.email || 'Profile'}` : 'Login to continue'}
            </a>
            <Link to="/cart" onClick={() => setMenuOpen(false)} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900">
              Cart {itemCount > 0 ? `(${itemCount})` : ''}
            </Link>
            {/* Mobile AI button removed; floating control center available on page */}
          </div>
        </div>
      )}

      {/* AIAssistant removed from Navbar; control center is provided by page-level component */}
    </header>
  );
}
