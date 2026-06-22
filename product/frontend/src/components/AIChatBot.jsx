import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader, Send, Sparkles, X } from 'lucide-react';

const makeSessionId = () => `product-ui-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const stripMarkdown = (text = '') => (
  text
    .replace(/\*\*/g, '')
    .replace(/^\s*[*-]\s+/gm, '')
    .trim()
);

const productImage = (product) => {
  const image = product?.images?.[0];
  if (typeof image === 'string') return image;
  return image?.thumbnail || image?.url || product?.image || '';
};

const productPrice = (product) => {
  const amount = Number(product?.price?.amount ?? product?.priceAmount ?? 0);
  const currency = product?.price?.currency || product?.currency || 'INR';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
};

const productAmount = (product) => Number(product?.price?.amount ?? product?.priceAmount ?? 0);

const uniqueValues = (values = []) => (
  [...new Set(values.map((value) => `${value || ''}`.trim()).filter(Boolean))]
);

const buildQuickPrompts = (products = [], messages = []) => {
  const latestAssistantProducts = [...messages]
    .reverse()
    .find((item) => item.role === 'assistant' && item.products?.length)?.products || [];
  const sourceProducts = latestAssistantProducts.length ? latestAssistantProducts : products;
  const availableProducts = sourceProducts.filter((product) => (product.stock ?? 1) > 0);
  const productsToUse = availableProducts.length ? availableProducts : sourceProducts;
  const categories = uniqueValues(productsToUse.map((product) => product.category));
  const sortedByPrice = [...productsToUse].filter((product) => productAmount(product) > 0).sort((a, b) => productAmount(a) - productAmount(b));
  const lowestProduct = sortedByPrice[0];
  const premiumProduct = sortedByPrice[sortedByPrice.length - 1];
  const firstProduct = productsToUse[0];
  const secondProduct = productsToUse[1];
  const prompts = [];

  if (latestAssistantProducts.length) {
    if (firstProduct && secondProduct) prompts.push(`Compare ${firstProduct.title} and ${secondProduct.title}`);
    if (firstProduct) prompts.push(`Show similar products to ${firstProduct.title}`);
    prompts.push('Which one is the best value from these?');
  } else {
    if (categories[0]) prompts.push(`Recommend best ${categories[0]} for me`);
    if (lowestProduct) prompts.push(`Find products under ${Math.ceil(productAmount(lowestProduct) * 1.25)}`);
    if (premiumProduct) prompts.push(`Is ${premiumProduct.title} worth buying?`);
  }

  return uniqueValues(prompts).slice(0, 3);
};

export default function AIChatBot({ products = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hi, I am your Ai-VendorHub shopping assistant. Ask me for recommendations, budget help, comparisons, or product guidance.',
    },
  ]);
  const sessionId = useRef(makeSessionId());
  const quickPrompts = useMemo(() => buildQuickPrompts(products, messages), [products, messages]);

  const sendMessage = async (prompt = message) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: cleanPrompt }]);
    setMessage('');
    setLoading(true);

    try {
      const accessToken = window.localStorage.getItem('vendorhub_access_token');
      const response = await fetch('/ai/chat', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          sessionId: sessionId.current,
          message: cleanPrompt,
        }),
      });
      const rawText = await response.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {
          message: rawText || 'AI service returned an unreadable response.',
        };
      }
      const reply = stripMarkdown(data.reply || data.response || data.summary || data.message || 'AI response received, but no readable message was returned.');
      const recommendedProducts = Array.isArray(data.products) ? data.products.slice(0, 5) : [];

      const authHint = response.status === 401
        ? 'Please login first, then I can use your account context for AI recommendations.'
        : 'Please try again in a moment.';
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: response.ok ? reply : `${reply} ${authHint}`,
        products: response.ok ? recommendedProducts : [],
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: `AI service is not reachable right now. Please make sure AI service is running on port 3005. (${error.message})`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleHeroPrompt = (event) => {
      const prompt = event.detail?.message || '';
      if (!prompt.trim()) return;
      setIsOpen(true);
      sendMessage(prompt);
    };

    window.addEventListener('vendorhub:ai-chat', handleHeroPrompt);
    return () => window.removeEventListener('vendorhub:ai-chat', handleHeroPrompt);
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="ai-chat-launcher fixed right-5 top-24 z-40 flex items-center gap-3 rounded-full border border-stone-200 bg-white/92 px-4 py-3 text-stone-950 shadow-[0_18px_46px_rgba(28,25,23,0.14)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 sm:right-7"
        aria-label="Open AI chatbot"
      >
        <span className="ai-chat-orb grid h-11 w-11 place-items-center rounded-full bg-stone-950 text-white shadow-sm">
          <Bot className="h-5 w-5" />
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">AI Assistant</span>
          <span className="block text-sm font-black text-stone-950">Ask Product AI</span>
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-stone-950/25 p-4 pt-24 backdrop-blur-sm sm:p-6 sm:pt-24">
          <section className="ai-chat-panel flex h-[min(720px,82vh)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-stone-950">AI Shopping Assistant</p>
                  <p className="text-xs font-bold text-stone-500">Limited to marketplace/product help</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl text-stone-500 hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((item, index) => (
                <div key={`${item.role}-${index}`} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[92%] ${item.role === 'assistant' && item.products?.length ? 'w-full' : ''}`}>
                    <div className={`whitespace-pre-line rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${
                      item.role === 'user'
                        ? 'bg-stone-950 text-white'
                        : 'border border-stone-200 bg-stone-50 text-stone-700'
                    }`}>
                      {item.text}
                    </div>
                    {item.role === 'assistant' && item.products?.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {item.products.map((product) => (
                          <a
                            key={product._id || product.id || product.title}
                            href={`/product/${product._id || product.id}`}
                            className="group flex gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                          >
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                              {productImage(product) ? (
                                <img src={productImage(product)} alt={product.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="grid h-full w-full place-items-center text-stone-400">
                                  <Sparkles className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-stone-950 group-hover:text-emerald-800">{product.title}</p>
                              <p className="mt-1 text-xs font-bold text-stone-500">{product.category || 'General'}</p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <span className="text-sm font-black text-stone-950">{productPrice(product)}</span>
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">
                                  Stock {product.stock || 0}
                                </span>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold text-stone-600">
                    <Loader className="h-4 w-4 animate-spin" />
                    AI thinking...
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-stone-200 p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-black text-stone-600 transition hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
                className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-2"
              >
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ask about products, budget, comparison..."
                  className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-stone-950 outline-none placeholder:text-stone-400"
                />
                <button type="submit" disabled={loading || !message.trim()} className="grid h-11 w-11 place-items-center rounded-xl bg-stone-950 text-white disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
