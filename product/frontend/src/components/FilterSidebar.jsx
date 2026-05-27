import React from 'react';
import { Boxes, Cpu, Filter, Home, IndianRupee, RotateCcw, Shirt, Sparkles, Watch, X } from 'lucide-react';
import { useProduct } from '../context/ProductContext';

const iconMap = {
  Electronics: Cpu,
  Accessories: Watch,
  Fashion: Shirt,
  Home,
  Sports: Boxes,
  'AI Tools': Sparkles,
};

export default function FilterSidebar({ isOpen, onClose, categories }) {
  const { filters, updateFilters, resetFilters } = useProduct();
  const categoryOptions = categories || [];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition"
          onClick={onClose}
        />
      )}

      {/* Modern Modal */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-white/10 bg-gradient-to-b from-[#1a1a2e] via-[#16171f] to-[#0f1119] shadow-2xl transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#1a1a2e]/95 backdrop-blur p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8d87d8]">BROWSE</p>
              <h2 className="text-2xl font-black text-[#f1efff]">Smart Filters</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-[#d7d2ff] hover:bg-white/5 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Categories Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-[#635bff]" />
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[#8d87d8]">Categories</p>
            </div>
            <div className="space-y-2">
              <CategoryButton
                active={filters.category === ''}
                icon={Boxes}
                label="All products"
                onClick={() => updateFilters({ category: '' })}
              />
              {categoryOptions.map((category) => (
                <CategoryButton
                  key={category}
                  active={filters.category === category}
                  icon={iconMap[category] || Boxes}
                  label={category}
                  onClick={() => updateFilters({ category })}
                />
              ))}
              {categoryOptions.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm font-semibold leading-6 text-[#aaa6ba]">
                  Categories loading...
                </p>
              )}
            </div>
          </section>

          {/* Price Range Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-[#635bff]" />
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[#8d87d8]">Price Range</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                value={filters.minPrice}
                onChange={(event) => updateFilters({ minPrice: event.target.value })}
                placeholder="Min"
                className="h-12 rounded-xl border border-white/10 bg-[#12131c] px-3 text-sm font-bold text-[#efedff] outline-none placeholder:text-[#777486] focus:border-[#716aff] focus:bg-white/5 transition"
              />
              <input
                type="number"
                min="0"
                value={filters.maxPrice}
                onChange={(event) => updateFilters({ maxPrice: event.target.value })}
                placeholder="Max"
                className="h-12 rounded-xl border border-white/10 bg-[#12131c] px-3 text-sm font-bold text-[#efedff] outline-none placeholder:text-[#777486] focus:border-[#716aff] focus:bg-white/5 transition"
              />
            </div>
          </section>

          {/* Sort Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-[#635bff]" />
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[#8d87d8]">Sort By</p>
            </div>
            <select
              value={filters.sort}
              onChange={(event) => updateFilters({ sort: event.target.value })}
              className="h-12 w-full rounded-xl border border-white/10 bg-[#12131c] px-4 text-sm font-black text-[#efedff] outline-none focus:border-[#716aff] focus:bg-white/5 transition"
            >
              <option className="bg-[#12131c]" value="newest">
                Featured
              </option>
              <option className="bg-[#12131c]" value="oldest">
                Oldest
              </option>
              <option className="bg-[#12131c]" value="price_asc">
                Price: Low to High
              </option>
              <option className="bg-[#12131c]" value="price_desc">
                Price: High to Low
              </option>
              <option className="bg-[#12131c]" value="title_asc">
                Name: A to Z
              </option>
              <option className="bg-[#12131c]" value="stock_desc">
                Stock: High to Low
              </option>
            </select>
          </section>

          {/* Reset Button */}
          <button
            type="button"
            onClick={() => {
              resetFilters();
              onClose();
            }}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#635bff] to-[#8d87ff] text-sm font-black text-white shadow-[0_14px_30px_rgba(99,91,255,0.24)] transition hover:shadow-[0_18px_40px_rgba(99,91,255,0.3)]"
          >
            <RotateCcw className="inline mr-2 h-4 w-4" />
            Reset All Filters
          </button>
        </div>
      </aside>
    </>
  );
}

const CategoryButton = ({ active, icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm font-black transition ${
      active
        ? 'bg-[#59528f] text-[#f1efff] shadow-[inset_4px_0_0_#d8d4ff]'
        : 'text-[#b5b0c6] hover:bg-white/5 hover:text-[#f1efff]'
    }`}
  >
    <Icon className="h-5 w-5" />
    {label}
  </button>
);
