import React from 'react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';

export default function CategoryFilterBar({ categories, selectedCategory, onCategoryChange, topCategories = [] }) {
  const containerRef = React.useRef(null);
  const [showLeftScroll, setShowLeftScroll] = React.useState(false);
  const [showRightScroll, setShowRightScroll] = React.useState(true);

  const scroll = (direction) => {
    if (!containerRef.current) return;
    const scrollAmount = 200;
    if (direction === 'left') {
      containerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      containerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 10);
  };

  React.useEffect(() => {
    handleScroll();
    const container = containerRef.current;
    container?.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    return () => {
      container?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [categories]);

  // Show 'All Electronics' first, then topCategories, then other categories
  const displayCategories = ['All Electronics', ...topCategories.filter(c => categories.includes(c)), ...categories.filter(c => !topCategories.includes(c) && c !== 'All Electronics')];

  return (
    <div className="relative">
      {/* Left scroll button */}
      {showLeftScroll && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm"
        >
          <ChevronLeft className="h-5 w-5 text-stone-950" />
        </button>
      )}

      {/* Categories container */}
      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <button
          onClick={() => onCategoryChange('')}
          className={`whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-black shadow-sm transition ${
            selectedCategory === ''
              ? 'border-stone-950 bg-stone-950 text-white'
              : 'border-stone-200 bg-white text-stone-700 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          All Electronics
        </button>

        {['Computers', 'Audio', 'Cameras', 'Wearables'].map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-black shadow-sm transition ${
              selectedCategory === category
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-stone-200 bg-white text-stone-700 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            {category}
          </button>
        ))}

        {/* Smart Deals badge */}
        <button className="flex whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-black text-amber-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100">
          <Zap className="mr-1.5 h-4 w-4" />
          Smart Deals
        </button>
      </div>

      {/* Right scroll button */}
      {showRightScroll && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm"
        >
          <ChevronRight className="h-5 w-5 text-stone-950" />
        </button>
      )}
    </div>
  );
}
