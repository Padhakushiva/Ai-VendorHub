import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bot,
  Boxes,
  CheckCircle2,
  CloudUpload,
  Edit3,
  ImagePlus,
  IndianRupee,
  LayoutDashboard,
  Loader,
  LogOut,
  PackageCheck,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  Wand2,
  XCircle,
} from 'lucide-react';
import { useAuthBridge } from '../context/AuthBridgeContext';
import { useProduct } from '../context/ProductContext';

const emptyForm = {
  title: '',
  description: '',
  amount: '',
  currency: 'INR',
  stock: '',
  category: '',
  brand: '',
  tags: '',
};

const formatPrice = (amount, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  } catch {
    return `${currency} ${amount || 0}`;
  }
};

const initialsFor = (account) => {
  const first = account?.fullName?.firstName || account?.username || 'Seller';
  const last = account?.fullName?.lastName || '';
  return `${first[0] || 'S'}${last[0] || ''}`.toUpperCase();
};

export default function SellerWorkspace({ standalone = false }) {
  const { user, isAuthenticated, loading, sellerLoginUrl, logout } = useAuthBridge();
  const {
    sellerProducts,
    fetchSellerProducts,
    createSellerProduct,
    updateSellerProduct,
    deleteSellerProduct,
  } = useProduct();
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [inventorySearch, setInventorySearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

  const isSeller = isAuthenticated && ['seller', 'admin'].includes(user?.role);
  const displayName = `${user?.fullName?.firstName || user?.username || 'Seller'} ${user?.fullName?.lastName || ''}`.trim();
  const merchantLoginUrl = useMemo(() => {
    try {
      const url = new URL(sellerLoginUrl);
      url.searchParams.set('role', 'seller');
      return url.toString();
    } catch {
      return sellerLoginUrl;
    }
  }, [sellerLoginUrl]);

  const sellerStats = useMemo(() => {
    const active = sellerProducts.filter((product) => product.status !== 'archived').length;
    const totalStock = sellerProducts.reduce((sum, product) => sum + (Number(product.stock) || 0), 0);
    const lowStock = sellerProducts.filter((product) => product.lowStock).length;
    const totalValue = sellerProducts.reduce((sum, product) => sum + ((Number(product.priceAmount) || 0) * (Number(product.stock) || 0)), 0);
    const categories = new Set(sellerProducts.map((product) => product.category).filter(Boolean));
    return { active, totalStock, lowStock, totalValue, categories: categories.size };
  }, [sellerProducts]);

  const filteredProducts = useMemo(() => {
    const query = inventorySearch.trim().toLowerCase();
    return sellerProducts.filter((product) => {
      const matchesSearch = !query || [product.title, product.brand, product.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
      const matchesStock = stockFilter === 'all'
        || (stockFilter === 'low' && product.lowStock)
        || (stockFilter === 'out' && Number(product.stock || 0) === 0)
        || (stockFilter === 'healthy' && Number(product.stock || 0) > 5);
      return matchesSearch && matchesStock;
    });
  }, [inventorySearch, sellerProducts, stockFilter]);

  const recentProducts = useMemo(() => sellerProducts.slice(0, 4), [sellerProducts]);

  useEffect(() => {
    if (isSeller) {
      fetchSellerProducts().then((result) => {
        if (!result.success) {
          setNotice(`Unable to load your products: ${result.message}`);
        }
      });
    }
  }, [fetchSellerProducts, isSeller]);

  const signOutToMerchantLogin = async (confirmationMessage) => {
    if (confirmationMessage && !window.confirm(confirmationMessage)) {
      return;
    }

    setNotice('');
    await logout();
    setForm(emptyForm);
    setImageFiles([]);
    setActiveView('overview');
    window.location.replace(merchantLoginUrl);
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-52 animate-pulse rounded-[2rem] border border-white/10 bg-[#11131f]" />
      </section>
    );
  }

  if (isAuthenticated && !isSeller) {
    return (
      <section id="seller-workspace" className={`${standalone ? 'min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(99,91,255,0.16),transparent_28%),linear-gradient(135deg,#050505,#111318_45%,#050505)]' : ''} px-0 py-3 sm:px-1 lg:px-1.5`}>
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#10131f] shadow-2xl shadow-black/40">
          <div className="relative p-8 sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,91,255,0.24),transparent_34%),radial-gradient(circle_at_85%_0%,rgba(244,63,94,0.12),transparent_30%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#d8d4ff]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Merchant access required
                </div>
                <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">
                  Sign in with a merchant account
                </h2>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[#aaa6ba]">
                  You are currently signed in as a buyer. Seller dashboard tools are available only for merchant accounts.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <a
                    href={merchantLoginUrl}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#10131f] shadow-lg shadow-white/10 transition hover:-translate-y-0.5 hover:bg-zinc-200"
                  >
                    <Store className="h-4 w-4" />
                    Sign in as merchant
                  </a>
                  <a
                    href="/"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-5 py-3 text-sm font-black text-white transition hover:bg-white/12"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Continue shopping
                  </a>
                  <button
                    type="button"
                    onClick={() => signOutToMerchantLogin('Sign out of this buyer account and switch to merchant login?')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-5 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-400/15"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-2xl font-black text-[#10131f]">
                    {initialsFor(user)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-white">{displayName}</p>
                    <p className="truncate text-sm font-bold text-[#aaa6ba]">{user?.email}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8f8aa3]">Current account type</p>
                  <p className="mt-1 text-sm font-black capitalize text-white">{user?.role || 'buyer'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section id="seller-workspace" className="px-0 py-3 sm:px-1 lg:px-1.5">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#10131f] shadow-2xl shadow-black/30">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative p-8 sm:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,91,255,0.28),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.14),transparent_30%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#635bff]/30 bg-[#635bff]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#d8d4ff]">
                  <Store className="h-3.5 w-3.5" />
                  Seller Workspace
                </div>
                <h2 className="mt-5 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">
                  Choose how you want to continue
                </h2>
                <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-[#aaa6ba]">
                  Select buyer or merchant on the next screen, then continue to the right workspace.
                </p>
                <a
                  href={sellerLoginUrl}
                  className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#635bff] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#635bff]/25 transition hover:-translate-y-0.5 hover:bg-[#746dff]"
                >
                  Continue to sign in
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="border-t border-white/10 bg-white/[0.03] p-6 lg:border-l lg:border-t-0">
              <div className="grid gap-3">
                <ProtectedFeature icon={ShieldCheck} title="Secure access" text="Your seller workspace is protected." />
                <ProtectedFeature icon={PackageCheck} title="Private catalog" text="Manage only the products linked to your account." />
                <ProtectedFeature icon={Bot} title="AI tools" text="Smart listing support will be available soon." />
                <ProtectedFeature icon={Boxes} title="Inventory control" text="Update stock, status, and product media." />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const buildPayload = () => {
    const payload = new FormData();
    payload.append('title', form.title);
    payload.append('description', form.description);
    payload.append('amount', form.amount);
    payload.append('currency', form.currency);
    payload.append('stock', form.stock || '0');
    payload.append('category', form.category);
    payload.append('brand', form.brand);
    payload.append('tags', form.tags);
    imageFiles.forEach((file) => payload.append('images', file));
    return payload;
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const amount = Number(form.amount);
    const stock = Number(form.stock || 0);
    if (title.length < 3) {
      setNotice('Product title must be at least 3 characters.');
      return;
    }
    if (!amount || amount <= 0) {
      setNotice('Product price must be greater than 0.');
      return;
    }
    if (stock < 0) {
      setNotice('Stock cannot be negative.');
      return;
    }

    setNotice('');
    setBusy(true);
    const result = await createSellerProduct(buildPayload());
    setBusy(false);
    setNotice(result.message);
    if (result.success) {
      setForm(emptyForm);
      setImageFiles([]);
      setActiveView('inventory');
    }
  };

  const refreshSellerInventory = async () => {
    setNotice('');
    const result = await fetchSellerProducts();
    setNotice(result.success ? `Inventory refreshed. ${result.products.length} seller products loaded.` : `Refresh failed: ${result.message}`);
  };

  const quickUpdate = async (product, updates) => {
    if (!product?.id) {
      setNotice('Product ID is missing. Update cannot be completed.');
      return;
    }
    setNotice('');
    const result = await updateSellerProduct(product.id, updates);
    setNotice(result.success ? result.message : `Update failed: ${result.message}`);
  };

  const handleDelete = async (product) => {
    if (!product?.id) {
      setNotice('Product ID is missing. Archive cannot be completed.');
      return;
    }
    if (!window.confirm(`Delete/archive ${product.title}?`)) return;
    setNotice('');
    const result = await deleteSellerProduct(product.id);
    setNotice(result.success ? result.message : `Delete failed: ${result.message}`);
  };

  const handleLogout = async () => {
    await signOutToMerchantLogin('Are you sure you want to sign out of this seller account?');
  };

  return (
    <section id="seller-workspace" className={`${standalone ? 'min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(99,91,255,0.16),transparent_28%),linear-gradient(135deg,#050505,#111318_45%,#050505)]' : ''} px-0 py-3 sm:px-1 lg:px-1.5`}>
      <div className="mx-auto w-full max-w-none overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0c10] shadow-2xl shadow-black/50">
        <div className="relative border-b border-white/10 p-6 sm:p-8 lg:p-10 xl:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(99,91,255,0.30),transparent_34%),radial-gradient(circle_at_72%_8%,rgba(20,184,166,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_46%)]" />
          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#8f89ff]/25 bg-[#635bff]/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#d8d4ff]">
                <LayoutDashboard className="h-3.5 w-3.5" />
                My Seller Dashboard
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl xl:text-6xl">
                Welcome back, {displayName}
              </h2>
              <p className="mt-4 max-w-4xl text-base font-semibold leading-8 text-[#b7b3c9]">
                Create listings, manage stock, and keep your catalog ready for buyers.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill icon={ShieldCheck} text="Secure session" />
                <StatusPill icon={Boxes} text="Private catalog" />
                <StatusPill icon={PackageCheck} text="Inventory ready" />
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-white text-2xl font-black text-[#090b15] shadow-lg">
                  {initialsFor(user)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-white">{displayName}</p>
                  <p className="truncate text-sm font-bold text-[#aaa6ba]">{user?.email || 'seller@vendorhub.ai'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={refreshSellerInventory}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-white transition hover:bg-white/12"
              >
                <RefreshCcw className="h-4 w-4" />
                Sync inventory
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-400/15"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>

        <div className="grid border-b border-white/10 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Boxes} label="My active listings" value={sellerStats.active} tone="violet" />
          <MetricCard icon={PackageCheck} label="My total stock" value={sellerStats.totalStock} tone="cyan" />
          <MetricCard icon={AlertTriangle} label="My low stock" value={sellerStats.lowStock} tone="amber" />
          <MetricCard icon={IndianRupee} label="My inventory value" value={formatPrice(sellerStats.totalValue)} tone="green" />
        </div>

        <div className="grid min-h-[760px] lg:grid-cols-[245px_minmax(0,1fr)]">
          <aside className="border-b border-white/10 bg-[#0b0d18] p-5 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              <DashboardNav active={activeView === 'overview'} icon={BarChart3} label="Overview" onClick={() => setActiveView('overview')} />
              <DashboardNav active={activeView === 'create'} icon={Plus} label="Create listing" onClick={() => setActiveView('create')} />
              <DashboardNav active={activeView === 'inventory'} icon={Boxes} label="Inventory" onClick={() => setActiveView('inventory')} />
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#635bff]/15 text-[#c9c4ff]">
                  <Wand2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">AI tools</p>
                  <p className="text-xs font-bold text-[#8f8aa3]">Coming soon.</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8f8aa3]">Catalog health</p>
              <div className="mt-4 space-y-3">
                <HealthRow label="Categories" value={sellerStats.categories} />
                <HealthRow label="Low stock alerts" value={sellerStats.lowStock} danger={sellerStats.lowStock > 0} />
                <HealthRow label="Products loaded" value={sellerProducts.length} />
              </div>
            </div>
          </aside>

          <main className="bg-[linear-gradient(135deg,#15171c,#0d0e12)] p-5 text-[#f4f4f5] sm:p-7 lg:p-9">
            {notice && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-[#202228] px-4 py-3 text-sm font-bold text-zinc-100 shadow-sm">
                <Sparkles className="mt-0.5 h-4 w-4 text-[#635bff]" />
                <span>{notice}</span>
              </div>
            )}

            {activeView === 'overview' && (
              <div className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_390px]">
                <div className="space-y-6">
                  <PanelHeader
                    eyebrow="Seller Overview"
                    title="Catalog overview"
                    text="Track listings, stock status, and recent catalog activity."
                    actionLabel="Create product"
                    onAction={() => setActiveView('create')}
                  />

                  <div className="grid gap-5 xl:grid-cols-3">
                    <InsightCard icon={CheckCircle2} title="Healthy stock" value={Math.max(sellerStats.active - sellerStats.lowStock, 0)} text="Listings without low-stock warning" />
                    <InsightCard icon={AlertTriangle} title="Needs attention" value={sellerStats.lowStock} text="Products close to stock-out" />
                    <InsightCard icon={Bot} title="AI tools" value="Soon" text="Smart listing suggestions are planned" />
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-[#1c1d22] p-5 shadow-xl shadow-black/20">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-white">Recent products</h3>
                        <p className="text-sm font-semibold text-zinc-400">Your latest catalog items appear here.</p>
                      </div>
                      <button type="button" onClick={() => setActiveView('inventory')} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-zinc-100 hover:bg-white/5">
                        View all
                      </button>
                    </div>
                    <div className="grid gap-3">
                      {recentProducts.map((product) => (
                        <InventoryRow key={product.id} product={product} compact onStockUp={() => quickUpdate(product, { stock: Number(product.stock || 0) + 1 })} onStockDown={() => quickUpdate(product, { stock: Math.max(Number(product.stock || 0) - 1, 0) })} onToggle={() => quickUpdate(product, { status: product.status === 'inactive' ? 'active' : 'inactive' })} onDelete={() => handleDelete(product)} />
                      ))}
                      {!recentProducts.length && <EmptyState title="No products yet" text="Create your first product and it will appear here." />}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl border border-white/10 bg-[#050506] p-5 text-white shadow-xl shadow-black/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#aaa5ff]">AI Assistant</p>
                        <h3 className="mt-2 text-2xl font-black">Listing Studio</h3>
                      </div>
                      <Bot className="h-8 w-8 text-[#aaa5ff]" />
                    </div>
                    <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
                      Smart descriptions, category suggestions, and tags will be added here.
                    </p>
                    <button type="button" disabled className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-zinc-400">
                      Coming soon
                      <Sparkles className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-[#1c1d22] p-5 shadow-xl shadow-black/20">
                    <h3 className="text-lg font-black text-white">My quick operations</h3>
                    <div className="mt-4 grid gap-3">
                      <QuickAction icon={RefreshCcw} title="Refresh my products" text="Pull latest own inventory" onClick={refreshSellerInventory} />
                      <QuickAction icon={Plus} title="Add my listing" text="Create product with image upload" onClick={() => setActiveView('create')} />
                      <QuickAction icon={Boxes} title="Manage my inventory" text="Update own status and stock" onClick={() => setActiveView('inventory')} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === 'create' && (
              <form onSubmit={handleCreate} className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#1b1c21] shadow-2xl shadow-black/40">
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#2b2c31] px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full bg-[#ff5f57]" />
                      <span className="h-3.5 w-3.5 rounded-full bg-[#febc2e]" />
                      <span className="h-3.5 w-3.5 rounded-full bg-[#28c840]" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">New listing window</p>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(emptyForm);
                        setImageFiles([]);
                        setNotice('Form cleared.');
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black text-white hover:bg-black/30"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  </div>
                  <div className="p-6 sm:p-8">
                    <PanelHeader
                      eyebrow="Create Product"
                      title="Publish my new listing"
                      text="Add product details, pricing, stock, and images."
                    />

                    <div className="mt-8 grid gap-5">
                      <SellerInput label="Product title" value={form.title} onChange={(value) => updateField('title', value)} placeholder="Samsung S24 Ultra" />
                      <SellerInput label="Description" value={form.description} onChange={(value) => updateField('description', value)} placeholder="Write a clear product description..." textarea />
                      <div className="grid gap-5 md:grid-cols-3">
                        <SellerInput label="Price" type="number" value={form.amount} onChange={(value) => updateField('amount', value)} placeholder="40000" />
                        <label className="block">
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-zinc-500">Currency</span>
                          <select value={form.currency} onChange={(event) => updateField('currency', event.target.value)} className="h-12 w-full rounded-2xl border border-white/10 bg-[#111216] px-4 text-sm font-bold text-zinc-100 outline-none focus:border-[#8b85ff]">
                            {['INR', 'USD', 'EUR', 'GBP', 'JPY'].map((currency) => <option key={currency} className="bg-[#111216]" value={currency}>{currency}</option>)}
                          </select>
                        </label>
                        <SellerInput label="Stock" type="number" value={form.stock} onChange={(value) => updateField('stock', value)} placeholder="20" />
                      </div>
                      <div className="grid gap-5 md:grid-cols-2">
                        <SellerInput label="Brand" value={form.brand} onChange={(value) => updateField('brand', value)} placeholder="Samsung" />
                        <SellerInput label="Category" value={form.category} onChange={(value) => updateField('category', value)} placeholder="Electronics" />
                      </div>
                      <SellerInput label="Tags" value={form.tags} onChange={(value) => updateField('tags', value)} placeholder="budget, camera, premium" />
                    </div>

                    <button type="submit" disabled={busy} className="mt-8 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-black shadow-lg shadow-white/10 transition hover:-translate-y-0.5 hover:bg-zinc-200 disabled:opacity-60">
                      {busy ? <Loader className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                      Publish my listing
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="block rounded-3xl border border-dashed border-white/15 bg-[#1c1d22] p-5 text-center shadow-xl shadow-black/20 transition hover:border-white/30">
                    <CloudUpload className="mx-auto h-10 w-10 text-[#635bff]" />
                    <span className="mt-3 block text-base font-black text-white">Upload product media</span>
                    <span className="mt-1 block text-sm font-semibold text-zinc-400">Images are attached to your product listing.</span>
                    <input type="file" multiple accept="image/*" onChange={(event) => setImageFiles([...event.target.files])} className="sr-only" />
                    <span className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-black text-black">
                      <ImagePlus className="mr-2 h-4 w-4" />
                      Select images
                    </span>
                  </label>
                  <div className="rounded-3xl border border-white/10 bg-[#1c1d22] p-5 shadow-xl shadow-black/20">
                    <h3 className="text-lg font-black text-white">Upload queue</h3>
                    <div className="mt-4 space-y-2">
                      {imageFiles.map((file) => (
                        <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-2xl bg-[#111216] px-3 py-2">
                          <span className="truncate text-sm font-bold text-zinc-200">{file.name}</span>
                          <span className="text-xs font-black text-zinc-500">{Math.ceil(file.size / 1024)} KB</span>
                        </div>
                      ))}
                      {!imageFiles.length && <p className="rounded-2xl bg-[#111216] px-3 py-4 text-sm font-semibold text-zinc-500">No images selected yet.</p>}
                    </div>
                  </div>
                </div>
              </form>
            )}

            {activeView === 'inventory' && (
              <div className="rounded-3xl border border-white/10 bg-[#1c1d22] p-5 shadow-xl shadow-black/20 sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#aaa5ff]">My Inventory</p>
                    <h3 className="mt-2 text-3xl font-black text-white">My seller products</h3>
                    <p className="mt-1 text-sm font-semibold text-zinc-400">Your active and inactive products are listed here.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_170px_auto]">
                    <label className="relative block">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Search my inventory..." className="h-12 w-full rounded-2xl border border-white/10 bg-[#111216] pl-11 pr-4 text-sm font-bold text-zinc-100 outline-none focus:border-[#8b85ff]" />
                    </label>
                    <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-[#111216] px-4 text-sm font-bold text-zinc-100 outline-none focus:border-[#8b85ff]">
                      <option value="all">All stock</option>
                      <option value="healthy">Healthy</option>
                      <option value="low">Low stock</option>
                      <option value="out">Out of stock</option>
                    </select>
                    <button type="button" onClick={refreshSellerInventory} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 text-sm font-black text-zinc-100 hover:bg-white/5">
                      <RefreshCcw className="h-4 w-4" />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {filteredProducts.map((product) => (
                    <InventoryRow
                      key={product.id}
                      product={product}
                      onStockUp={() => quickUpdate(product, { stock: Number(product.stock || 0) + 1 })}
                      onStockDown={() => quickUpdate(product, { stock: Math.max(Number(product.stock || 0) - 1, 0) })}
                      onToggle={() => quickUpdate(product, { status: product.status === 'inactive' ? 'active' : 'inactive' })}
                      onDelete={() => handleDelete(product)}
                    />
                  ))}
                  {!filteredProducts.length && <EmptyState title="No matching products" text="Create products or change inventory filters." />}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}

const ProtectedFeature = ({ icon: Icon, title, text }) => (
  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
    <Icon className="h-5 w-5 text-[#aaa5ff]" />
    <p className="mt-3 text-sm font-black text-white">{title}</p>
    <p className="mt-1 text-xs font-semibold leading-5 text-[#aaa6ba]">{text}</p>
  </div>
);

const StatusPill = ({ icon: Icon, text }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-black text-[#e7e4ff]">
    <Icon className="h-3.5 w-3.5" />
    {text}
  </span>
);

const MetricCard = ({ icon: Icon, label, value, tone }) => {
  const tones = {
    violet: 'bg-[#635bff]/15 text-[#c8c3ff]',
    cyan: 'bg-cyan-400/10 text-cyan-200',
    amber: 'bg-amber-400/10 text-amber-200',
    green: 'bg-emerald-400/10 text-emerald-200',
  };

  return (
    <div className="border-b border-white/10 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="flex items-center gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${tones[tone] || tones.violet}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8f8aa3]">{label}</p>
          <p className="mt-1 truncate text-2xl font-black text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};

const DashboardNav = ({ active, icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
      active ? 'bg-white text-[#10131f] shadow-lg shadow-black/20' : 'text-[#aaa6ba] hover:bg-white/[0.06] hover:text-white'
    }`}
  >
    <Icon className="h-5 w-5" />
    {label}
  </button>
);

const HealthRow = ({ label, value, danger = false }) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="font-bold text-[#aaa6ba]">{label}</span>
    <span className={`font-black ${danger ? 'text-amber-200' : 'text-white'}`}>{value}</span>
  </div>
);

const PanelHeader = ({ eyebrow, title, text, actionLabel, onAction, actionIcon: ActionIcon = Plus, actionDisabled = false }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#aaa5ff]">{eyebrow}</p>
      <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">{title}</h3>
      <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-zinc-400">{text}</p>
    </div>
    {actionLabel && (
      <button
        type="button"
        onClick={onAction}
        disabled={actionDisabled}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-black shadow-lg shadow-white/10 transition hover:bg-zinc-200 disabled:opacity-60"
      >
        <ActionIcon className={`h-4 w-4 ${actionDisabled ? 'animate-spin' : ''}`} />
        {actionLabel}
      </button>
    )}
  </div>
);

const InsightCard = ({ icon: Icon, title, value, text }) => (
  <div className="rounded-3xl border border-white/10 bg-[#1c1d22] p-5 shadow-xl shadow-black/20">
    <div className="flex items-center justify-between">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-[#c8c3ff]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
    <p className="mt-4 text-base font-black text-white">{title}</p>
    <p className="mt-1 text-sm font-semibold text-zinc-400">{text}</p>
  </div>
);

const QuickAction = ({ icon: Icon, title, text, onClick }) => (
  <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111216] p-3 text-left transition hover:-translate-y-0.5 hover:bg-[#25262c]">
    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#c8c3ff] shadow-sm">
      <Icon className="h-5 w-5" />
    </span>
    <span>
      <span className="block text-sm font-black text-white">{title}</span>
      <span className="block text-xs font-semibold text-zinc-400">{text}</span>
    </span>
  </button>
);

const InventoryRow = ({ product, compact = false, onStockUp, onStockDown, onToggle, onDelete }) => {
  const stock = Number(product.stock || 0);
  const isLow = product.lowStock || (stock > 0 && stock <= 5);
  const isOut = stock === 0;

  return (
    <article className={`grid gap-4 rounded-3xl border border-white/10 bg-[#111216] p-4 shadow-xl shadow-black/15 ${compact ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[90px_minmax(0,1fr)_250px]'}`}>
      <div className="h-20 overflow-hidden rounded-2xl bg-[#25262c]">
        {product.image ? (
          <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-zinc-500">
            <Boxes className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-black text-white">{product.title}</p>
          <StockBadge isOut={isOut} isLow={isLow} />
        </div>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-zinc-500">{product.category || 'General'} · {product.brand || 'No brand'}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-zinc-300">
          <span>{formatPrice(product.priceAmount, product.currency)}</span>
          <span>Stock: {stock}</span>
          <span>Status: {product.status || 'active'}</span>
        </div>
      </div>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <button type="button" onClick={onStockUp} className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs font-black text-emerald-200 hover:bg-emerald-400/10">
            + Stock
          </button>
          <button type="button" onClick={onStockDown} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-100 hover:bg-white/5">
            - Stock
          </button>
          <button type="button" onClick={onToggle} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-100 hover:bg-white/5">
            <Edit3 className="mr-1 inline h-3.5 w-3.5" />
            {product.status === 'inactive' ? 'Activate' : 'Deactivate'}
          </button>
          <button type="button" onClick={onDelete} className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-black text-rose-200 hover:bg-rose-400/10">
            <Trash2 className="mr-1 inline h-3.5 w-3.5" />
            Archive
          </button>
        </div>
      )}
    </article>
  );
};

const StockBadge = ({ isOut, isLow }) => {
  if (isOut) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-black text-rose-600">
        <XCircle className="h-3 w-3" />
        Out
      </span>
    );
  }
  if (isLow) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        Low
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">
      <CheckCircle2 className="h-3 w-3" />
      Active
    </span>
  );
};

const EmptyState = ({ title, text }) => (
  <div className="rounded-3xl border border-dashed border-white/15 bg-[#111216] p-10 text-center">
    <Boxes className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
    <p className="text-lg font-black text-white">{title}</p>
    <p className="mt-1 text-sm font-semibold text-zinc-500">{text}</p>
  </div>
);

const SellerInput = ({ label, value, onChange, placeholder, type = 'text', textarea = false }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-zinc-500">{label}</span>
    {textarea ? (
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={5} className="w-full resize-none rounded-2xl border border-white/10 bg-[#111216] px-4 py-3 text-sm font-bold text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#8b85ff]" />
    ) : (
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-12 w-full rounded-2xl border border-white/10 bg-[#111216] px-4 text-sm font-bold text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#8b85ff]" />
    )}
  </label>
);
