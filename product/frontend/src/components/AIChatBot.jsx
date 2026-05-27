import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader, Send, Sparkles, X } from 'lucide-react';

const quickPrompts = [
  'Suggest best products under 50000',
  'Which product is best value?',
  'Recommend electronics for me',
];

const makeSessionId = () => `product-ui-${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

  const productContext = useMemo(() => {
    if (!products.length) return 'No products are currently loaded from Product Service.';
    return products
      .slice(0, 5)
      .map((product) => `${product.title} (${product.category || 'General'}, ${product.currency || 'INR'} ${product.priceAmount || 0}, stock ${product.stock || 0})`)
      .join('; ');
  }, [products]);

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
          message: `${cleanPrompt}\n\nCurrent loaded Product Service catalog: ${productContext}`,
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
      const reply = data.response || data.message || data.summary || 'AI response received, but no readable message was returned.';

      const authHint = response.status === 401
        ? 'Please login first, then I can use your account context for AI recommendations.'
        : 'Please try again in a moment.';
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: response.ok ? reply : `${reply} ${authHint}`,
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
        className="ai-chat-launcher fixed right-5 top-24 z-40 flex items-center gap-3 rounded-full border border-white/15 bg-[#151724]/78 px-4 py-3 text-white shadow-[0_18px_58px_rgba(5,7,22,0.48)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-[#a8a2ff]/45 hover:bg-[#1c1d2d]/86 sm:right-7"
        aria-label="Open AI chatbot"
      >
        <span className="ai-chat-orb grid h-11 w-11 place-items-center rounded-full bg-[#635bff] shadow-[0_14px_34px_rgba(99,91,255,0.38)]">
          <Bot className="h-5 w-5" />
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-[#c8c3ff]">AI Assistant</span>
          <span className="block text-sm font-black text-[#f1efff]">Ask Product AI</span>
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 p-4 pt-24 backdrop-blur-sm sm:p-6 sm:pt-24">
          <section className="ai-chat-panel flex h-[min(720px,82vh)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11131f]/96 shadow-2xl">
            <header className="flex items-center justify-between border-b border-white/10 bg-[#171827] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#635bff]/20 text-[#d8d4ff]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#f1efff]">AI Shopping Assistant</p>
                  <p className="text-xs font-bold text-[#aaa6ba]">Limited to marketplace/product help</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl text-[#d7d2ff] hover:bg-white/5">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((item, index) => (
                <div key={`${item.role}-${index}`} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${
                    item.role === 'user'
                      ? 'bg-[#635bff] text-white'
                      : 'border border-white/10 bg-white/[0.05] text-[#d8d4ea]'
                  }`}>
                    {item.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-[#d8d4ea]">
                    <Loader className="h-4 w-4 animate-spin" />
                    AI thinking...
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-black text-[#c8c3ff] transition hover:bg-white/5"
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
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0b0d18] p-2"
              >
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ask about products, budget, comparison..."
                  className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-[#f1efff] outline-none placeholder:text-[#777486]"
                />
                <button type="submit" disabled={loading || !message.trim()} className="grid h-11 w-11 place-items-center rounded-xl bg-[#635bff] text-white disabled:opacity-50">
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
