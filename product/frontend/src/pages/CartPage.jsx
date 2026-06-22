import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, CheckCircle2, Loader2, Minus, PackageCheck, Plus, RefreshCw, Send, ShoppingBag, Sparkles, Trash2, Wand2, XCircle } from 'lucide-react';
import { useAuthBridge } from '../context/AuthBridgeContext';
import { useCart } from '../context/CartContext';
import { aiApi } from '../services/aiApi';

const formatPrice = (amount, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  }
};

const SummaryRow = ({ label, value, strong = false }) => (
  <div className={`flex items-center justify-between ${strong ? 'text-xl font-black text-stone-950' : 'text-sm font-bold text-stone-600'}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const QuantityButton = ({ children, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-white text-stone-950 shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
  >
    {children}
  </button>
);

const makeCartAISessionId = () => `cart-ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

const cartPromptContext = (cart) => {
  const items = cart.items.map((item) => (
    `${item.title} qty ${item.quantity}, price ${formatPrice(item.unitPrice.amount, item.unitPrice.currency)}, line total ${formatPrice(item.lineTotal.amount, item.lineTotal.currency)}`
  )).join('; ');

  return `Current cart: ${items || 'empty cart'}. Cart total: ${formatPrice(cart.totals?.total, cart.totals?.currency)}. Reply like a cart checkout assistant in 2-3 short lines. If suggesting products, return product cards from catalog.`;
};

function CartAIAssistant({ cart }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({
    text: 'Ask AI to review value, suggest add-ons, or find better product options before checkout.',
    products: [],
  });
  const sessionId = useRef(makeCartAISessionId());

  const cartTotal = Number(cart.totals?.total || 0);
  const quickActions = [
    'Review my cart before checkout',
    'Which item is best value?',
    'Suggest useful add-ons for this cart',
    cartTotal > 0 ? `Find upgrades under ${Math.ceil(cartTotal * 1.25)}` : 'Suggest a starter cart under 50000',
  ];

  const askCartAI = async (question) => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;

    try {
      setLoading(true);
      setInput('');
      const response = await aiApi.post('/chat', {
        sessionId: sessionId.current,
        message: `${cleanQuestion}\n\n${cartPromptContext(cart)}`,
      });
      setResult({
        text: stripMarkdown(response.data?.reply || response.data?.message || 'AI model unavailable'),
        products: Array.isArray(response.data?.products) ? response.data.products.slice(0, 3) : [],
      });
    } catch (error) {
      setResult({
        text: error.response?.data?.message || 'AI model unavailable',
        products: [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-white/55 bg-[linear-gradient(135deg,rgba(20,20,20,0.96),rgba(0,107,79,0.86))] p-4 text-white shadow-[0_22px_60px_rgba(0,0,0,0.16)] backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-stone-950">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">Cart AI</p>
          <h3 className="text-xl font-black">Checkout assistant</h3>
          <p className="mt-1 text-xs font-bold leading-5 text-white/65">Gemini reviews your cart and can suggest real catalog products.</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-3 text-sm font-bold leading-6 text-white/85">
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            AI checking your cart...
          </span>
        ) : result.text}
      </div>

      {result.products.length > 0 && (
        <div className="mt-3 grid gap-2">
          {result.products.map((product) => (
            <Link
              key={product._id || product.id || product.title}
              to={`/product/${product._id || product.id}`}
              className="flex gap-3 rounded-2xl border border-white/15 bg-white/95 p-2 text-stone-950 transition hover:-translate-y-0.5"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                {productImage(product) ? (
                  <img src={productImage(product)} alt={product.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-stone-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{product.title}</p>
                <p className="text-xs font-bold text-stone-500">{product.category || 'Recommended'}</p>
                <p className="mt-1 text-sm font-black">{formatPrice(product.price?.amount, product.price?.currency)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-2">
        {quickActions.map((action) => (
          <button
            key={action}
            type="button"
            disabled={loading}
            onClick={() => askCartAI(action)}
            className="inline-flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-left text-xs font-black text-white transition hover:bg-white/18 disabled:opacity-50"
          >
            {action}
            <Wand2 className="h-4 w-4 shrink-0 text-amber-200" />
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          askCartAI(input);
        }}
        className="mt-3 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-2"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about this cart..."
          className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm font-bold text-white outline-none placeholder:text-white/45"
        />
        <button type="submit" disabled={loading || !input.trim()} className="grid h-10 w-10 place-items-center rounded-xl bg-white text-stone-950 disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function CartItem({ item }) {
  const { busyItemId, removeItem, saveForLater, updateItem } = useCart();
  const busy = busyItemId === item.productId;

  return (
    <article className="grid gap-4 rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm md:grid-cols-[132px_1fr_auto] md:items-center">
      <Link to={`/product/${item.productId}`} className="block overflow-hidden rounded-[20px] border border-stone-200 bg-[#f6f4ee]">
        {item.image ? (
          <img src={item.image} alt={item.title} className="aspect-square h-full w-full object-cover" />
        ) : (
          <div className="grid aspect-square place-items-center bg-amber-50 text-stone-950">
            <ShoppingBag className="h-10 w-10" />
          </div>
        )}
      </Link>

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-700 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-stone-950">
            Cart Item
          </span>
          {item.priceChanged && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-stone-950">
              Price updated
            </span>
          )}
        </div>
        <Link to={`/product/${item.productId}`} className="line-clamp-2 text-xl font-black leading-tight text-stone-950 hover:text-[#006b4f]">
          {item.title}
        </Link>
        {item.variant && (
          <p className="mt-1 text-sm font-bold text-black/50">
            {[item.variant.color, item.variant.size, item.variant.ram, item.variant.storage].filter(Boolean).join(' / ')}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-[#f6f4ee] px-2 py-1">
            <QuantityButton disabled={busy || item.quantity <= 1} onClick={() => updateItem(item.productId, item.quantity - 1, item.variantId)}>
              <Minus className="h-4 w-4" />
            </QuantityButton>
            <span className="grid h-9 min-w-10 place-items-center px-2 text-sm font-black text-stone-950">{item.quantity}</span>
            <QuantityButton disabled={busy} onClick={() => updateItem(item.productId, item.quantity + 1, item.variantId)}>
              <Plus className="h-4 w-4" />
            </QuantityButton>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => saveForLater(item.productId, item.variantId)}
            className="rounded-full border border-stone-200 bg-blue-50 px-4 py-2 text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            Save for later
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => removeItem(item.productId, item.variantId)}
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-rose-50 px-4 py-2 text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      </div>

      <div className="rounded-[22px] border border-stone-200 bg-[#151515] px-5 py-4 text-right text-white shadow-sm">
        <p className="text-sm font-bold text-white/55">Each</p>
        <p className="text-lg font-black">{formatPrice(item.unitPrice.amount, item.unitPrice.currency)}</p>
        <div className="my-3 h-px bg-white/15" />
        <p className="text-sm font-bold text-white/55">Line total</p>
        <p className="text-2xl font-black text-[#facc15]">{formatPrice(item.lineTotal.amount, item.lineTotal.currency)}</p>
      </div>
    </article>
  );
}

function SavedItem({ item }) {
  const { busyItemId, moveSavedToCart } = useCart();
  const busy = busyItemId === item.productId;

  return (
    <article className="flex items-center gap-4 rounded-[22px] border border-stone-200 bg-white p-3 shadow-sm">
      <div className="h-16 w-16 overflow-hidden rounded-2xl border border-stone-200 bg-[#f6f4ee]">
        {item.image ? <img src={item.image} alt={item.title} className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-stone-950">{item.title}</p>
        <p className="text-xs font-bold text-stone-500">{formatPrice(item.unitPrice.amount, item.unitPrice.currency)}</p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => moveSavedToCart(item.productId, item.variantId)}
        className="rounded-full border border-stone-200 bg-amber-50 px-4 py-2 text-xs font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60"
      >
        Move
      </button>
    </article>
  );
}

export default function CartPage() {
  const { isAuthenticated, loginUrl, user } = useAuthBridge();
  const { cart, clearCart, itemCount, lastMessage, loading, validateCart } = useCart();
  const totals = cart.totals || {};
  const isBuyer = isAuthenticated && user?.role === 'user';

  return (
    <div className="min-h-screen bg-[#f6f4ee] px-3 py-8 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[34px] border border-stone-200 bg-[#006b4f] p-5 text-white shadow-sm sm:p-8">
          <div className="pointer-events-none absolute right-[-80px] top-[-120px] h-72 w-72 rounded-full bg-amber-50/80" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border-[2px] border-white bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-stone-950">
                <Sparkles className="h-4 w-4" />
                Premium cart
              </span>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-none sm:text-5xl">
                Review your selected products.
              </h1>
              <p className="mt-3 max-w-2xl text-base font-bold text-white/75">
                Your best picks, current prices, and saved favorites are ready in one premium checkout bag.
              </p>
            </div>
            <div className="rounded-[24px] border border-stone-200 bg-amber-50 px-5 py-4 text-stone-950 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em]">Items</p>
              <p className="text-4xl font-black">{itemCount}</p>
            </div>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="mt-8 rounded-[28px] border border-stone-200 bg-white p-6 text-center shadow-sm">
            <ShoppingBag className="mx-auto h-10 w-10 text-[#006b4f]" />
            <h2 className="mt-3 text-2xl font-black text-stone-950">Login to use your cart</h2>
            <a href={loginUrl} className="mt-5 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-emerald-700 px-6 py-3 text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5">
              Login <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        {isAuthenticated && !isBuyer && (
          <div className="mt-8 rounded-[28px] border border-stone-200 bg-white p-6 text-center shadow-sm">
            <XCircle className="mx-auto h-10 w-10 text-[#c0392b]" />
            <h2 className="mt-3 text-2xl font-black text-stone-950">Buyer account required</h2>
            <p className="mt-2 font-bold text-stone-500">Seller and admin accounts can manage dashboards, but cart actions are for buyer accounts.</p>
          </div>
        )}

        {isBuyer && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-5">
              {lastMessage && (
                <div className="rounded-[20px] border border-stone-200 bg-blue-50 px-5 py-4 text-sm font-black text-stone-950 shadow-sm">
                  {lastMessage}
                </div>
              )}

              {loading && cart.items.length === 0 ? (
                <div className="rounded-[28px] border border-stone-200 bg-white p-10 text-center shadow-sm">
                  <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#006b4f]" />
                  <p className="mt-3 text-lg font-black text-stone-950">Loading cart...</p>
                </div>
              ) : cart.items.length === 0 ? (
                <div className="rounded-[28px] border border-stone-200 bg-white p-10 text-center shadow-sm">
                  <PackageCheck className="mx-auto h-12 w-12 text-[#006b4f]" />
                  <h2 className="mt-4 text-2xl font-black text-stone-950">Your cart is empty</h2>
                  <p className="mt-2 font-bold text-stone-500">Your next premium pick is waiting in the catalog.</p>
                  <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-amber-50 px-6 py-3 text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5">
                    Continue shopping <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : cart.items.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}

              {cart.savedItems.length > 0 && (
                <div className="rounded-[28px] border border-stone-200 bg-emerald-700 p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-stone-950">Saved for later</h2>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-stone-950">{cart.savedItems.length}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {cart.savedItems.map((item) => <SavedItem key={item.id} item={item} />)}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-5 lg:sticky lg:top-32">
              <CartAIAssistant cart={cart} />

              <div className="h-fit rounded-[30px] border border-stone-200 bg-white p-5 shadow-sm">
                <div className="rounded-[24px] border border-stone-200 bg-amber-50 p-5 text-stone-950">
                  <p className="text-xs font-black uppercase tracking-[0.18em]">Order summary</p>
                  <h2 className="mt-2 text-3xl font-black">Cart total</h2>
                </div>
                <div className="mt-5 space-y-4">
                  <SummaryRow label="Subtotal" value={formatPrice(totals.subtotal, totals.currency)} />
                  <SummaryRow label="Discount" value={formatPrice(totals.discount, totals.currency)} />
                  <SummaryRow label="GST / tax" value={formatPrice(totals.tax, totals.currency)} />
                  <SummaryRow label="Shipping" value={Number(totals.shipping || 0) === 0 ? 'Free' : formatPrice(totals.shipping, totals.currency)} />
                  <div className="h-px bg-black/15" />
                  <SummaryRow label="Total" value={formatPrice(totals.total, totals.currency)} strong />
                </div>

                {cart.cartIssues.length > 0 && (
                  <div className="mt-5 rounded-[20px] border border-stone-200 bg-rose-50 p-4">
                    <p className="font-black text-stone-950">Needs review</p>
                    <p className="mt-1 text-sm font-bold text-stone-600">{cart.cartIssues.length} cart issue found by validation.</p>
                  </div>
                )}

                <div className="mt-6 grid gap-3">
                  <Link
                    to="/checkout"
                    className={`inline-flex h-12 items-center justify-center gap-2 rounded-full border border-stone-200 bg-emerald-700 px-5 text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5 ${
                      loading || cart.items.length === 0 ? 'pointer-events-none opacity-50' : ''
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Checkout
                  </Link>
                  <button
                    type="button"
                    disabled={loading || cart.items.length === 0}
                    onClick={validateCart}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-stone-200 bg-blue-50 px-5 text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Validate cart
                  </button>
                  <button
                    type="button"
                    disabled={loading || cart.items.length === 0}
                    onClick={clearCart}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear cart
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
