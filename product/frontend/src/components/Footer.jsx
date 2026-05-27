import React from 'react';
import { Boxes, Route, Server, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-[#11111d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-900 text-white">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-[#f1efff]">VendorHub Products</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Product Service</p>
              </div>
            </div>
            <p className="text-[#aaa6ba] text-sm font-semibold leading-relaxed">
              Buyer-facing catalog frontend connected with Product Service routes for product discovery, detail view, filters, wishlist, and recently viewed items.
            </p>
          </div>

          <div>
            <h3 className="text-[#f1efff] font-black mb-4">Catalog</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="text-[#aaa6ba] font-bold hover:text-[#f1efff] transition">All products</a></li>
              <li><a href="/#catalog" className="text-[#aaa6ba] font-bold hover:text-[#f1efff] transition">Trending</a></li>
              <li><a href="/#catalog" className="text-[#aaa6ba] font-bold hover:text-[#f1efff] transition">New arrivals</a></li>
              <li><a href="/#catalog" className="text-[#aaa6ba] font-bold hover:text-[#f1efff] transition">AI picks</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-[#f1efff] font-black mb-4">Service Features</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-[#aaa6ba] font-bold"><Sparkles className="h-4 w-4 text-[#c8c3ff]" /> Search and filters</li>
              <li className="flex items-center gap-2 text-[#aaa6ba] font-bold"><Sparkles className="h-4 w-4 text-[#c8c3ff]" /> Trending products</li>
              <li className="flex items-center gap-2 text-[#aaa6ba] font-bold"><Sparkles className="h-4 w-4 text-[#c8c3ff]" /> Wishlist ready</li>
              <li className="flex items-center gap-2 text-[#aaa6ba] font-bold"><Sparkles className="h-4 w-4 text-[#c8c3ff]" /> Recently viewed</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[#f1efff] font-black mb-4">Connected APIs</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-[#aaa6ba] font-bold">
                <Server size={16} className="text-[#c8c3ff]" />
                <span>/api/product</span>
              </li>
              <li className="flex items-center gap-2 text-[#aaa6ba] font-bold">
                <Route size={16} className="text-[#c8c3ff]" />
                <span>/api/product/trending</span>
              </li>
              <li className="flex items-center gap-2 text-[#aaa6ba] font-bold">
                <Sparkles size={16} className="text-[#c8c3ff]" />
                <span>AI insights from loaded products</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-[#aaa6ba] font-semibold">
            <p>VendorHub Product Service frontend.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-[#f1efff] transition">Privacy Policy</a>
              <a href="#" className="hover:text-[#f1efff] transition">Terms of Service</a>
              <a href="#" className="hover:text-[#f1efff] transition">API Docs</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
