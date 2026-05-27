import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-[#0f1119] via-[#0f1119] to-transparent"
        >
          <ChevronLeft className="h-5 w-5 text-[#8d87ff]" />
        </button>
      )}

      {/* Categories container */}
      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto scroll-smooth pb-2 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <button
          onClick={() => onCategoryChange('')}
          className={`px-4 py-2 rounded-full whitespace-nowrap font-black text-sm transition ${
            selectedCategory === ''
              ? 'bg-gradient-to-r from-[#635bff] to-[#8d87ff] text-white shadow-[0_4px_12px_rgba(99,91,255,0.3)]'
              : 'border border-white/20 text-[#bdb8ff] hover:border-[#635bff] hover:text-[#d8d4ff]'
          }`}
        >
          All Electronics
        </button>

        {['Computers', 'Audio', 'Cameras', 'Wearables'].map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`px-4 py-2 rounded-full whitespace-nowrap font-black text-sm transition ${
              selectedCategory === category
                ? 'bg-gradient-to-r from-[#635bff] to-[#8d87ff] text-white shadow-[0_4px_12px_rgba(99,91,255,0.3)]'
                : 'border border-white/20 text-[#bdb8ff] hover:border-[#635bff] hover:text-[#d8d4ff]'
            }`}
          >
            {category}
          </button>
        ))}

        {/* Smart Deals badge */}
        <button className="px-4 py-2 rounded-full whitespace-nowrap font-black text-sm border border-[#ff8c42]/50 text-[#ff8c42] hover:bg-[#ff8c42]/10 transition flex items-center gap-1">
          <span className="text-lg">⚡</span>
          Smart Deals
        </button>
      </div>

      {/* Right scroll button */}
      {showRightScroll && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-l from-[#0f1119] via-[#0f1119] to-transparent"
        >
          <ChevronRight className="h-5 w-5 text-[#8d87ff]" />
        </button>
      )}
    </div>
  );
}
