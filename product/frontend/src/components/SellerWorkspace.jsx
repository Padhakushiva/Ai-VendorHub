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
import { fetchAIStatus, generateListingDescription, suggestListingCategoryTags } from '../services/aiApi';

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

const emptyHomepageForm = {
  id: '',
  type: 'banner',
  placement: 'after_categories',
  title: '',
  subtitle: '',
  tag: '',
  headline: '',
  strip: '',
  badgeTop: 'AI',
  badgeMid: 'Deals',
  badgeBottom: 'Sale',
  query: '',
  link: '',
  products: [],
  position: '1',
  isActive: true,
  startAt: '',
  endAt: '',
  theme: {
    bg: '#d73a20',
    shapeA: '#f97316',
    shapeB: '#f59e0b',
    stripBg: '#facc15',
    text: '#ffe500',
    badgeTopBg: '#c92c13',
    badgeMidBg: '#facc15',
    frame: 'bg-[#047857]',
    stripe: 'bg-[#29aa78]',
  },
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
    products,
    sellerProducts,
    adminHomepageSections,
    fetchSellerProducts,
    fetchAdminHomepageSections,
    createSellerProduct,
    updateSellerProduct,
    deleteSellerProduct,
    createHomepageSection,
    updateHomepageSection,
    deleteHomepageSection,
  } = useProduct();
  const [form, setForm] = useState(emptyForm);
  const [homepageForm, setHomepageForm] = useState(emptyHomepageForm);
  const [imageFiles, setImageFiles] = useState([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState('');
  const [aiStatus, setAiStatus] = useState({ checked: false, available: false, message: 'Checking AI service...' });
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [inventorySearch, setInventorySearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [showSuccess, setShowSuccess] = useState(false);

  const isSeller = isAuthenticated && ['seller', 'admin'].includes(user?.role);
  const isAdmin = isAuthenticated && user?.role === 'admin';
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

  useEffect(() => {
    if (isAdmin) {
      fetchAdminHomepageSections().then((result) => {
        if (!result.success) {
          setNotice(`Unable to load homepage CMS: ${result.message}`);
        }
      });
    }
  }, [fetchAdminHomepageSections, isAdmin]);

  useEffect(() => {
    if (!isSeller) return;
    fetchAIStatus().then((result) => {
      setAiStatus({
        checked: true,
        available: result.success,
        message: result.success ? 'AI listing tools are connected.' : result.message,
      });
    });
  }, [isSeller]);

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
        <div className="vendorhub-glass-card h-52 animate-pulse rounded-[2rem]" />
      </section>
    );
  }

  if (isAuthenticated && !isSeller) {
    return (
      <section id="seller-workspace" className={`${standalone ? 'min-h-screen bg-[radial-gradient(circle_at_8%_10%,rgba(245,158,11,0.10),transparent_28%),radial-gradient(circle_at_92%_8%,rgba(16,185,129,0.10),transparent_30%),linear-gradient(135deg,#fbfaf7_0%,#f3efe5_48%,#eef5ed_100%)]' : ''} px-0 py-3 sm:px-1 lg:px-1.5`}>
        <div className="vendorhub-glass-card mx-auto max-w-5xl overflow-hidden rounded-[2rem]">
          <div className="relative p-8 sm:p-10">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,251,235,0.42)_52%,rgba(236,253,245,0.42))]" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Merchant access required
                </div>
                <h2 className="mt-5 text-3xl font-black tracking-tight text-stone-950 sm:text-5xl">
                  Sign in with a merchant account
                </h2>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-stone-600">
                  You are currently signed in as a buyer. Seller dashboard tools are available only for merchant accounts.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <a
                    href={merchantLoginUrl}
                    className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800"
                  >
                    <Store className="h-4 w-4" />
                    Sign in as merchant
                  </a>
                  <a
                    href="/"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/75 bg-white/48 px-5 py-3 text-sm font-black text-stone-800 shadow-sm backdrop-blur-xl transition hover:bg-white/70"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Continue shopping
                  </a>
                  <button
                    type="button"
                    onClick={() => signOutToMerchantLogin('Sign out of this buyer account and switch to merchant login?')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
              <div className="vendorhub-glass-card rounded-3xl p-5">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-stone-950 text-2xl font-black text-white">
                    {initialsFor(user)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-stone-950">{displayName}</p>
                    <p className="truncate text-sm font-bold text-stone-500">{user?.email}</p>
                  </div>
                </div>
                <div className="vendorhub-glass-card mt-4 rounded-2xl px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">Current account type</p>
                  <p className="mt-1 text-sm font-black capitalize text-stone-950">{user?.role || 'buyer'}</p>
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
        <div className="vendorhub-glass-card overflow-hidden rounded-[2rem]">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative p-8 sm:p-10">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,251,235,0.42)_52%,rgba(236,253,245,0.42))]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-800">
                  <Store className="h-3.5 w-3.5" />
                  Seller Workspace
                </div>
                <h2 className="mt-5 max-w-2xl text-3xl font-black tracking-tight text-stone-950 sm:text-5xl">
                  Choose how you want to continue
                </h2>
                <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-stone-600">
                  Select buyer or merchant on the next screen, then continue to the right workspace.
                </p>
                <a
                  href={sellerLoginUrl}
                  className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800"
                >
                  Continue to sign in
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="border-t border-white/55 bg-white/10 p-6 backdrop-blur-xl lg:border-l lg:border-t-0">
              <div className="grid gap-3">
                <ProtectedFeature icon={ShieldCheck} title="Secure access" text="Your seller workspace is protected." />
                <ProtectedFeature icon={PackageCheck} title="Private catalog" text="Manage only the products linked to your account." />
                <ProtectedFeature icon={Bot} title="AI listing tools" text="Generate descriptions, categories, and tags after seller login." />
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

  const getListingContext = () => ({
    title: form.title.trim(),
    category: form.category.trim() || 'General',
    basicDescription: form.description.trim(),
    price: form.amount ? `${form.currency} ${form.amount}` : '',
  });

  const applyGeneratedDescription = (generatedContent = {}) => {
    const bulletPoints = Array.isArray(generatedContent.bulletPoints) ? generatedContent.bulletPoints : [];
    const descriptionParts = [
      generatedContent.fullDescription,
      bulletPoints.length ? `\nKey highlights:\n${bulletPoints.map((point) => `- ${point}`).join('\n')}` : '',
    ].filter(Boolean);

    setForm((current) => ({
      ...current,
      description: descriptionParts.join('\n').trim() || current.description,
      tags: current.tags || (Array.isArray(generatedContent.tags) ? generatedContent.tags.join(', ') : current.tags),
    }));
  };

  const applyCategoryTags = (suggestions = {}) => {
    setForm((current) => ({
      ...current,
      category: suggestions.category || current.category,
      tags: Array.isArray(suggestions.tags) && suggestions.tags.length ? suggestions.tags.join(', ') : current.tags,
    }));
  };

  const handleAIDescription = async () => {
    const context = getListingContext();
    if (context.title.length < 3) {
      setNotice('Add a clear product title first, then AI can write the listing.');
      return;
    }

    setNotice('');
    setAiBusy('description');
    const result = await generateListingDescription(context);
    setAiBusy('');

    if (!result.success) {
      setAiSuggestion({
        type: 'unavailable',
        title: 'AI model unavailable',
        text: 'Gemini did not return a usable response. Try again later.',
      });
      setNotice('AI model unavailable.');
      return;
    }

    applyGeneratedDescription(result.generatedContent);
    setAiSuggestion({
      type: 'description',
      title: 'AI description applied',
      text: 'Generated with Gemini.',
    });
    setNotice('AI description applied to the listing.');
  };

  const handleAICategoryTags = async () => {
    const title = form.title.trim();
    if (title.length < 3) {
      setNotice('Add a product title first, then AI can suggest category and tags.');
      return;
    }

    setNotice('');
    setAiBusy('metadata');
    const result = await suggestListingCategoryTags({ title, description: form.description });
    setAiBusy('');

    if (!result.success) {
      setAiSuggestion({
        type: 'unavailable',
        title: 'AI model unavailable',
        text: 'Gemini did not return category and tag suggestions. Try again later.',
      });
      setNotice('AI model unavailable.');
      return;
    }

    applyCategoryTags(result.suggestions);
    setAiSuggestion({
      type: 'metadata',
      title: 'AI metadata applied',
      text: result.suggestions?.reasoning || `Confidence ${result.suggestions?.confidence || 0}%`,
    });
    setNotice('AI category and tags applied to the listing.');
  };

  const handleAIOptimizeDraft = async () => {
    const context = getListingContext();
    if (context.title.length < 3) {
      setNotice('Add a product title first, then AI can optimize the draft.');
      return;
    }

    setNotice('');
    setAiBusy('optimize');
    const [descriptionResult, metadataResult] = await Promise.all([
      generateListingDescription(context),
      suggestListingCategoryTags({ title: context.title, description: form.description }),
    ]);
    setAiBusy('');

    if (descriptionResult.success) {
      applyGeneratedDescription(descriptionResult.generatedContent);
    }
    if (metadataResult.success) {
      applyCategoryTags(metadataResult.suggestions);
    }

    if (!descriptionResult.success && !metadataResult.success) {
      setAiSuggestion({
        type: 'unavailable',
        title: 'AI model unavailable',
        text: 'Gemini did not return a usable response. No fields were changed.',
      });
      setNotice('AI model unavailable.');
      return;
    }

    setAiSuggestion({
      type: 'optimize',
      title: 'AI draft optimized',
      text: 'Description, category, and tags were refreshed from Gemini.',
    });
    setNotice('AI optimized this listing draft.');
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
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setActiveView('inventory');
      }, 3000);
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

  const updateHomepageField = (field, value) => {
    setHomepageForm((current) => ({ ...current, [field]: value }));
  };

  const updateHomepageTheme = (field, value) => {
    setHomepageForm((current) => ({ ...current, theme: { ...current.theme, [field]: value } }));
  };

  const toggleHomepageProduct = (productId) => {
    setHomepageForm((current) => {
      const exists = current.products.includes(productId);
      return {
        ...current,
        products: exists ? current.products.filter((id) => id !== productId) : [...current.products, productId],
      };
    });
  };

  const resetHomepageForm = () => {
    setHomepageForm(emptyHomepageForm);
  };

  const editHomepageSection = (section) => {
    setHomepageForm({
      ...emptyHomepageForm,
      id: section.id,
      type: section.type || 'banner',
      placement: section.placement || 'after_categories',
      title: section.title || '',
      subtitle: section.subtitle || '',
      tag: section.tag || '',
      headline: section.headline || '',
      strip: section.strip || '',
      badgeTop: section.badgeTop || 'AI',
      badgeMid: section.badgeMid || 'Deals',
      badgeBottom: section.badgeBottom || 'Sale',
      query: section.query || '',
      link: section.link || '',
      products: Array.isArray(section.products) ? section.products.map((product) => product.id).filter(Boolean) : [],
      position: String(section.position ?? 1),
      isActive: section.isActive !== false,
      startAt: section.startAt ? section.startAt.slice(0, 16) : '',
      endAt: section.endAt ? section.endAt.slice(0, 16) : '',
      theme: { ...emptyHomepageForm.theme, ...(section.theme || {}) },
    });
    setActiveView('homepage');
  };

  const buildHomepagePayload = () => ({
    ...homepageForm,
    position: Number(homepageForm.position || 0),
    startAt: homepageForm.startAt || null,
    endAt: homepageForm.endAt || null,
  });

  const handleHomepageSave = async (event) => {
    event.preventDefault();
    if (!isAdmin) {
      setNotice('Only admins can manage homepage campaigns.');
      return;
    }
    if (homepageForm.title.trim().length < 3) {
      setNotice('Homepage section title must be at least 3 characters.');
      return;
    }

    setBusy(true);
    const result = homepageForm.id
      ? await updateHomepageSection(homepageForm.id, buildHomepagePayload())
      : await createHomepageSection(buildHomepagePayload());
    setBusy(false);
    setNotice(result.message);
    if (result.success) {
      resetHomepageForm();
    }
  };

  const handleHomepageDelete = async (section) => {
    if (!section.id || !window.confirm(`Delete homepage section "${section.title}"?`)) return;
    setBusy(true);
    const result = await deleteHomepageSection(section.id);
    setBusy(false);
    setNotice(result.message);
    if (result.success && homepageForm.id === section.id) {
      resetHomepageForm();
    }
  };

  const handleLogout = async () => {
    await signOutToMerchantLogin('Are you sure you want to sign out of this seller account?');
  };

  return (
    <section id="seller-workspace" className={`${standalone ? 'min-h-screen bg-[radial-gradient(circle_at_8%_10%,rgba(245,158,11,0.10),transparent_28%),radial-gradient(circle_at_92%_8%,rgba(16,185,129,0.10),transparent_30%),linear-gradient(135deg,#fbfaf7_0%,#f3efe5_48%,#eef5ed_100%)]' : ''} px-0 py-3 sm:px-1 lg:px-1.5`}>
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
          <CheckCircle2 className="h-24 w-24 text-[#00ff00] mb-6 animate-bounce" />
          <h1 className="text-4xl md:text-6xl font-black text-[#00ff00] text-center tracking-tight">Product Added Successfully</h1>
          <p className="mt-4 text-[#00ff00] text-lg opacity-80 font-bold">Your new product is now live.</p>
        </div>
      )}
      <div className="vendorhub-glass-card mx-auto w-full max-w-none overflow-hidden rounded-[2rem]">
        <div className="relative overflow-hidden border-b border-white/55 bg-stone-950 p-6 text-white sm:p-8 lg:p-10 xl:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(245,158,11,0.20),transparent_26%),radial-gradient(circle_at_86%_20%,rgba(16,185,129,0.24),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_42%,rgba(0,0,0,0.46))]" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100 shadow-sm backdrop-blur-xl">
                <LayoutDashboard className="h-3.5 w-3.5" />
                My Seller Dashboard
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl xl:text-6xl">
                Welcome back, {displayName}
              </h2>
              <p className="mt-4 max-w-4xl text-base font-semibold leading-8 text-stone-300">
                Create listings, manage stock, and keep your catalog ready for buyers.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill icon={ShieldCheck} text="Secure session" dark />
                <StatusPill icon={Boxes} text="Private catalog" dark />
                <StatusPill icon={PackageCheck} text="Inventory ready" dark />
              </div>
            </div>
            <div className="vendorhub-glass-card-dark rounded-3xl p-5">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-black text-2xl font-black text-white shadow-sm ring-1 ring-white/20">
                  {initialsFor(user)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-white">{displayName}</p>
                  <p className="truncate text-sm font-bold text-stone-300">{user?.email || 'seller@vendorhub.ai'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={refreshSellerInventory}
                className="vendorhub-glass-field mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
              >
                <RefreshCcw className="h-4 w-4" />
                Sync inventory
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-white/60 bg-black/10 p-3 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Boxes} label="My active listings" value={sellerStats.active} tone="violet" />
          <MetricCard icon={PackageCheck} label="My total stock" value={sellerStats.totalStock} tone="cyan" />
          <MetricCard icon={AlertTriangle} label="My low stock" value={sellerStats.lowStock} tone="amber" />
          <MetricCard icon={IndianRupee} label="My inventory value" value={formatPrice(sellerStats.totalValue)} tone="green" />
        </div>

        <div className="grid min-h-[760px] lg:grid-cols-[245px_minmax(0,1fr)]">
          <aside className="border-b border-white/60 bg-white/12 p-5 backdrop-blur-2xl lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              <DashboardNav active={activeView === 'overview'} icon={BarChart3} label="Overview" onClick={() => setActiveView('overview')} />
              <DashboardNav active={activeView === 'create'} icon={Plus} label="Create listing" onClick={() => setActiveView('create')} />
              <DashboardNav active={activeView === 'inventory'} icon={Boxes} label="Inventory" onClick={() => setActiveView('inventory')} />
              {isAdmin && <DashboardNav active={activeView === 'homepage'} icon={LayoutDashboard} label="Homepage CMS" onClick={() => setActiveView('homepage')} />}
            </div>

            <div className="vendorhub-glass-card mt-6 rounded-3xl p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-800">
                  <Wand2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-stone-950">Listing AI</p>
                  <p className={`text-xs font-bold ${aiStatus.available ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {aiStatus.checked ? (aiStatus.available ? 'Connected' : 'Fallback ready') : 'Checking...'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('create')}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-3 py-2.5 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-emerald-800"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Open AI tools
              </button>
            </div>

            <div className="vendorhub-glass-card mt-4 rounded-3xl p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">Catalog health</p>
              <div className="mt-4 space-y-3">
                <HealthRow label="Categories" value={sellerStats.categories} />
                <HealthRow label="Low stock alerts" value={sellerStats.lowStock} danger={sellerStats.lowStock > 0} />
                <HealthRow label="Products loaded" value={sellerProducts.length} />
                {isAdmin && <HealthRow label="Homepage sections" value={adminHomepageSections.length} />}
              </div>
            </div>
          </aside>

          <main className="bg-[radial-gradient(circle_at_10%_0%,rgba(245,158,11,0.08),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(16,185,129,0.08),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.62),rgba(255,251,235,0.34)_48%,rgba(236,253,245,0.36))] p-5 text-stone-950 sm:p-7 lg:p-9">
            {notice && (
              <div className="vendorhub-glass-card mb-5 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-amber-900">
                <Sparkles className="mt-0.5 h-4 w-4 text-amber-700" />
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
                    <InsightCard icon={Bot} title="AI tools" value={aiStatus.available ? 'Live' : 'Ready'} text="Generate descriptions, categories, and tags" />
                  </div>

                  <div className="vendorhub-glass-card rounded-3xl p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-stone-950">Recent products</h3>
                        <p className="text-sm font-semibold text-stone-500">Your latest catalog items appear here.</p>
                      </div>
                      <button type="button" onClick={() => setActiveView('inventory')} className="vendorhub-glass-card rounded-xl px-4 py-2 text-sm font-black text-stone-800 hover:-translate-y-0.5">
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
                  <div className="vendorhub-glass-card-dark rounded-3xl p-5 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">AI Assistant</p>
                        <h3 className="mt-2 text-2xl font-black text-white">Listing Studio</h3>
                      </div>
                      <Bot className="h-8 w-8 text-emerald-700" />
                    </div>
                    <p className="mt-4 text-sm font-semibold leading-6 text-stone-300">
                      Generate seller-ready descriptions, category suggestions, and searchable tags from your product draft.
                    </p>
                    <button type="button" onClick={() => setActiveView('create')} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-stone-950 transition hover:-translate-y-0.5 hover:bg-emerald-100">
                      Create with AI
                      <Sparkles className="h-4 w-4" />
                    </button>
                    <p className={`mt-3 text-xs font-bold ${aiStatus.available ? 'text-emerald-200' : 'text-amber-200'}`}>
                      {aiStatus.message}
                    </p>
                  </div>

                  <div className="vendorhub-glass-card rounded-3xl p-5">
                    <h3 className="text-lg font-black text-stone-950">My quick operations</h3>
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
                <div className="vendorhub-black-glass overflow-hidden rounded-[28px] text-white">
                  <div className="relative flex items-center justify-between gap-4 border-b border-white/12 bg-white/6 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full bg-[#ff5f57]" />
                      <span className="h-3.5 w-3.5 rounded-full bg-[#febc2e]" />
                      <span className="h-3.5 w-3.5 rounded-full bg-[#28c840]" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">New listing window</p>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(emptyForm);
                        setImageFiles([]);
                        setNotice('Form cleared.');
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-black text-white hover:bg-white/12"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  </div>
                  <div className="relative p-6 sm:p-8">
                    <PanelHeader
                      eyebrow="Create Product"
                      title="Publish my new listing"
                      text="Add product details, pricing, stock, and images."
                      dark
                    />

                    <div className="mt-8 grid gap-5">
                      <SellerInput label="Product title" value={form.title} onChange={(value) => updateField('title', value)} placeholder="Samsung S24 Ultra" />
                      <SellerInput label="Description" value={form.description} onChange={(value) => updateField('description', value)} placeholder="Write a clear product description..." textarea />
                      <div className="grid gap-5 md:grid-cols-3">
                        <SellerInput label="Price" type="number" value={form.amount} onChange={(value) => updateField('amount', value)} placeholder="40000" />
                        <label className="block">
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-stone-400">Currency</span>
                          <select value={form.currency} onChange={(event) => updateField('currency', event.target.value)} className="vendorhub-glass-field h-12 w-full rounded-2xl px-4 text-sm font-bold text-white outline-none">
                            {['INR', 'USD', 'EUR', 'GBP', 'JPY'].map((currency) => <option key={currency} className="bg-stone-950" value={currency}>{currency}</option>)}
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

                    <button type="submit" disabled={busy} className="mt-8 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-stone-950 shadow-lg shadow-white/10 transition hover:-translate-y-0.5 hover:bg-emerald-100 disabled:opacity-60">
                      {busy ? <Loader className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                      Publish my listing
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="vendorhub-black-glass overflow-hidden rounded-3xl p-5 text-white">
                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">Seller AI</p>
                          <h3 className="mt-2 text-xl font-black text-white">Listing assistant</h3>
                        </div>
                        <Bot className="h-7 w-7 text-emerald-300" />
                      </div>
                      <p className="mt-3 text-sm font-semibold leading-6 text-stone-400">
                        Add a title, then let AI write copy, pick category, and prepare searchable tags.
                      </p>

                      <div className="mt-5 grid gap-3">
                        <AIActionButton
                          icon={Sparkles}
                          title="Generate description"
                          text="Writes description, highlights, and SEO keywords."
                          loading={aiBusy === 'description'}
                          disabled={Boolean(aiBusy)}
                          onClick={handleAIDescription}
                        />
                        <AIActionButton
                          icon={Wand2}
                          title="Suggest category & tags"
                          text="Fills category and tags using product context."
                          loading={aiBusy === 'metadata'}
                          disabled={Boolean(aiBusy)}
                          onClick={handleAICategoryTags}
                        />
                        <AIActionButton
                          icon={Bot}
                          title="Optimize full draft"
                          text="Runs both AI tools and applies the best draft."
                          loading={aiBusy === 'optimize'}
                          disabled={Boolean(aiBusy)}
                          onClick={handleAIOptimizeDraft}
                        />
                      </div>

                      {aiSuggestion && (
                        <div className="vendorhub-glass-field mt-5 rounded-2xl p-4">
                          <p className="text-sm font-black text-white">{aiSuggestion.title}</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-stone-400">{aiSuggestion.text}</p>
                        </div>
                      )}

                      <p className={`mt-4 text-xs font-bold ${aiStatus.available ? 'text-emerald-300' : 'text-amber-200'}`}>
                        {aiStatus.message}
                      </p>
                    </div>
                  </div>

                  <label className="vendorhub-black-glass block overflow-hidden rounded-3xl p-5 text-center text-white transition hover:border-white/50">
                    <span className="relative block">
                    <CloudUpload className="mx-auto h-10 w-10 text-emerald-700" />
                    <span className="mt-3 block text-base font-black text-white">Upload product media</span>
                    <span className="mt-1 block text-sm font-semibold text-stone-400">Images are attached to your product listing.</span>
                    <input type="file" multiple accept="image/*" onChange={(event) => setImageFiles([...event.target.files])} className="sr-only" />
                    <span className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-black text-stone-950">
                      <ImagePlus className="mr-2 h-4 w-4" />
                      Select images
                    </span>
                    </span>
                  </label>
                  <div className="vendorhub-black-glass overflow-hidden rounded-3xl p-5 text-white">
                    <div className="relative">
                    <h3 className="text-lg font-black text-white">Upload queue</h3>
                    <div className="mt-4 space-y-2">
                      {imageFiles.map((file) => (
                        <div key={`${file.name}-${file.size}`} className="vendorhub-glass-field flex items-center justify-between rounded-2xl px-3 py-2">
                          <span className="truncate text-sm font-bold text-white">{file.name}</span>
                          <span className="text-xs font-black text-stone-400">{Math.ceil(file.size / 1024)} KB</span>
                        </div>
                      ))}
                      {!imageFiles.length && <p className="vendorhub-glass-field rounded-2xl px-3 py-4 text-sm font-semibold text-stone-400">No images selected yet.</p>}
                    </div>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {activeView === 'inventory' && (
              <div className="vendorhub-glass-card rounded-3xl p-5 sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">My Inventory</p>
                    <h3 className="mt-2 text-3xl font-black text-stone-950">My seller products</h3>
                    <p className="mt-1 text-sm font-semibold text-stone-500">Your active and inactive products are listed here.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_170px_auto]">
                    <label className="relative block">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                      <input value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Search my inventory..." className="vendorhub-glass-card h-12 w-full rounded-2xl pl-11 pr-4 text-sm font-bold text-stone-800 outline-none focus:border-emerald-400" />
                    </label>
                    <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="vendorhub-glass-card h-12 rounded-2xl px-4 text-sm font-bold text-stone-800 outline-none focus:border-emerald-400">
                      <option value="all">All stock</option>
                      <option value="healthy">Healthy</option>
                      <option value="low">Low stock</option>
                      <option value="out">Out of stock</option>
                    </select>
                    <button type="button" onClick={refreshSellerInventory} className="vendorhub-glass-card inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black text-stone-800 hover:-translate-y-0.5">
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

            {activeView === 'homepage' && isAdmin && (
              <div className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_430px]">
                <form onSubmit={handleHomepageSave} className="vendorhub-black-glass overflow-hidden rounded-3xl p-5 text-white sm:p-6">
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_34%,rgba(16,185,129,0.08))]" />
                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
                  <div className="relative">
                  <PanelHeader
                    eyebrow="Admin Homepage CMS"
                    title={homepageForm.id ? 'Edit storefront section' : 'Create storefront section'}
                    text="Control sale banners, poster placement, product rows, schedule, colors, and visibility without changing React code."
                    actionLabel={homepageForm.id ? 'New section' : ''}
                    onAction={resetHomepageForm}
                    dark
                  />

                  <div className="mt-7 grid gap-5">
                    <div className="grid gap-5 md:grid-cols-3">
                      <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-stone-400">Section type</span>
                        <select value={homepageForm.type} onChange={(event) => updateHomepageField('type', event.target.value)} className="h-12 w-full rounded-2xl border border-white/15 bg-white/8 px-4 text-sm font-bold text-white outline-none focus:border-emerald-400">
                          <option value="banner">Sale banner</option>
                          <option value="product_row">Product row</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-stone-400">Placement</span>
                        <select value={homepageForm.placement} onChange={(event) => updateHomepageField('placement', event.target.value)} className="h-12 w-full rounded-2xl border border-white/15 bg-white/8 px-4 text-sm font-bold text-white outline-none focus:border-emerald-400">
                          <option value="after_categories">After categories</option>
                          <option value="after_stats">After stats</option>
                          <option value="before_catalog">Before catalog</option>
                        </select>
                      </label>
                      <SellerInput label="Position" type="number" value={homepageForm.position} onChange={(value) => updateHomepageField('position', value)} placeholder="1" />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <SellerInput label="Title" value={homepageForm.title} onChange={(value) => updateHomepageField('title', value)} placeholder="Mega electronics sale" />
                      <SellerInput label="Small tag" value={homepageForm.tag} onChange={(value) => updateHomepageField('tag', value)} placeholder="VendorHub Sale" />
                    </div>
                    <SellerInput label="Headline" value={homepageForm.headline} onChange={(value) => updateHomepageField('headline', value)} placeholder="Extra discounts for smart shoppers" />
                    <SellerInput label="Subtitle / strip text" value={homepageForm.strip} onChange={(value) => updateHomepageField('strip', value)} placeholder="Early access for premium members" />
                    <div className="grid gap-5 md:grid-cols-2">
                      <SellerInput label="Search query on click" value={homepageForm.query} onChange={(value) => updateHomepageField('query', value)} placeholder="laptop audio tablet" />
                      <SellerInput label="Direct link optional" value={homepageForm.link} onChange={(value) => updateHomepageField('link', value)} placeholder="/deals" />
                    </div>

                    {homepageForm.type === 'banner' && (
                      <>
                        <div className="grid gap-5 md:grid-cols-3">
                          <SellerInput label="Badge top" value={homepageForm.badgeTop} onChange={(value) => updateHomepageField('badgeTop', value)} placeholder="AI" />
                          <SellerInput label="Badge middle" value={homepageForm.badgeMid} onChange={(value) => updateHomepageField('badgeMid', value)} placeholder="Deals" />
                          <SellerInput label="Badge bottom" value={homepageForm.badgeBottom} onChange={(value) => updateHomepageField('badgeBottom', value)} placeholder="Sale" />
                        </div>
                        <ColorGrid form={homepageForm} onThemeChange={updateHomepageTheme} banner />
                      </>
                    )}

                    {homepageForm.type === 'product_row' && (
                      <>
                        <ColorGrid form={homepageForm} onThemeChange={updateHomepageTheme} />
                        <div>
                          <span className="mb-3 block text-xs font-black uppercase tracking-[0.12em] text-stone-400">Products in this row</span>
                          <div className="grid max-h-72 gap-2 overflow-y-auto rounded-2xl border border-white/15 bg-white/8 p-3">
                            {products.map((product) => (
                              <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/12">
                                <input
                                  type="checkbox"
                                  checked={homepageForm.products.includes(product.id)}
                                  onChange={() => toggleHomepageProduct(product.id)}
                                  className="h-4 w-4 accent-emerald-700"
                                />
                                <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{product.title}</span>
                                <span className="text-xs font-black text-stone-400">{product.category || 'General'}</span>
                              </label>
                            ))}
                            {!products.length && <p className="px-3 py-5 text-center text-sm font-semibold text-stone-400">No products loaded yet.</p>}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="grid gap-5 md:grid-cols-2">
                      <SellerInput label="Start date optional" type="datetime-local" value={homepageForm.startAt} onChange={(value) => updateHomepageField('startAt', value)} />
                      <SellerInput label="End date optional" type="datetime-local" value={homepageForm.endAt} onChange={(value) => updateHomepageField('endAt', value)} />
                    </div>

                    <label className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/8 px-4 py-3">
                      <span>
                        <span className="block text-sm font-black text-white">Active section</span>
                        <span className="block text-xs font-semibold text-stone-400">Inactive sections stay saved but disappear from storefront.</span>
                      </span>
                      <input type="checkbox" checked={homepageForm.isActive} onChange={(event) => updateHomepageField('isActive', event.target.checked)} className="h-5 w-5 accent-emerald-700" />
                    </label>
                  </div>

                  <button type="submit" disabled={busy} className="mt-8 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-stone-950 shadow-lg shadow-white/10 transition hover:-translate-y-0.5 hover:bg-emerald-100 disabled:opacity-60">
                    {busy ? <Loader className="h-4 w-4 animate-spin" /> : <LayoutDashboard className="h-4 w-4" />}
                    {homepageForm.id ? 'Update homepage section' : 'Publish homepage section'}
                  </button>
                  </div>
                </form>

                <div className="vendorhub-glass-card rounded-3xl p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Live controls</p>
                      <h3 className="mt-2 text-2xl font-black text-stone-950">Homepage sections</h3>
                    </div>
                    <button type="button" onClick={fetchAdminHomepageSections} className="vendorhub-glass-card rounded-xl px-3 py-2 text-xs font-black text-stone-800 hover:-translate-y-0.5">
                      Refresh
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {adminHomepageSections.map((section) => (
                      <HomepageSectionRow
                        key={section.id}
                        section={section}
                        onEdit={() => editHomepageSection(section)}
                        onDelete={() => handleHomepageDelete(section)}
                      />
                    ))}
                    {!adminHomepageSections.length && <EmptyState title="No homepage sections" text="Create a sale banner or product row to make the storefront dynamic." />}
                  </div>
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
  <div className="vendorhub-glass-card rounded-2xl p-4">
    <Icon className="h-5 w-5 text-emerald-700" />
    <p className="mt-3 text-sm font-black text-stone-950">{title}</p>
    <p className="mt-1 text-xs font-semibold leading-5 text-stone-500">{text}</p>
  </div>
);

const ColorGrid = ({ form, onThemeChange, banner = false }) => {
  const fields = banner
    ? [
      ['bg', 'Background'],
      ['shapeA', 'Shape A'],
      ['shapeB', 'Shape B'],
      ['stripBg', 'Strip'],
      ['text', 'Headline'],
      ['badgeTopBg', 'Badge top'],
      ['badgeMidBg', 'Badge mid'],
    ]
    : [
      ['frame', 'Row frame'],
      ['stripe', 'Row stripe'],
    ];

  const rowColorOptions = ['bg-[#047857]', 'bg-[#c2410c]', 'bg-[#1d4ed8]', 'bg-[#7c3aed]', 'bg-[#be123c]', 'bg-[#0f766e]'];

  return (
    <div>
      <span className="mb-3 block text-xs font-black uppercase tracking-[0.12em] text-stone-400">Theme controls</span>
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map(([field, label]) => (
          <label key={field} className="vendorhub-glass-field block rounded-2xl p-3">
            <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.12em] text-stone-400">{label}</span>
            {field === 'frame' || field === 'stripe' ? (
              <select value={form.theme[field]} onChange={(event) => onThemeChange(field, event.target.value)} className="vendorhub-glass-field h-10 w-full rounded-xl px-3 text-sm font-bold text-white outline-none">
                {rowColorOptions.map((option) => <option key={`${field}-${option}`} value={option}>{option}</option>)}
              </select>
            ) : (
              <div className="flex items-center gap-3">
                <input type="color" value={form.theme[field] || '#ffffff'} onChange={(event) => onThemeChange(field, event.target.value)} className="h-10 w-12 rounded-lg border border-white/15 bg-transparent" />
                <input value={form.theme[field] || ''} onChange={(event) => onThemeChange(field, event.target.value)} className="vendorhub-glass-field h-10 min-w-0 flex-1 rounded-xl px-3 text-sm font-bold text-white outline-none" />
              </div>
            )}
          </label>
        ))}
      </div>
    </div>
  );
};

const HomepageSectionRow = ({ section, onEdit, onDelete }) => (
  <article className="vendorhub-glass-card rounded-3xl p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${section.isActive ? 'bg-emerald-400/10 text-emerald-200' : 'bg-zinc-500/10 text-stone-500'}`}>
            {section.isActive ? 'Active' : 'Inactive'}
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black uppercase text-stone-600">
            {section.type === 'banner' ? 'Banner' : 'Product row'}
          </span>
        </div>
        <h4 className="mt-3 truncate text-base font-black text-stone-950">{section.title}</h4>
        <p className="mt-1 text-xs font-bold text-stone-500">{section.placement} · position {section.position}</p>
        {section.type === 'product_row' && (
          <p className="mt-2 text-xs font-semibold text-stone-500">{section.products?.length || 0} products linked</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onEdit} className="vendorhub-glass-card grid h-10 w-10 place-items-center rounded-xl text-stone-800 hover:-translate-y-0.5" aria-label="Edit homepage section">
          <Edit3 className="h-4 w-4" />
        </button>
        <button type="button" onClick={onDelete} className="grid h-10 w-10 place-items-center rounded-xl border border-rose-400/30 text-rose-200 hover:bg-rose-400/10" aria-label="Delete homepage section">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  </article>
);

const StatusPill = ({ icon: Icon, text, dark = false }) => (
  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${
    dark ? 'vendorhub-glass-field text-white' : 'vendorhub-glass-card text-stone-700'
  }`}>
    <Icon className="h-3.5 w-3.5" />
    {text}
  </span>
);

const MetricCard = ({ icon: Icon, label, value, tone }) => {
  const tones = {
    violet: 'bg-emerald-50 text-emerald-800',
    cyan: 'bg-cyan-50 text-cyan-800',
    amber: 'bg-amber-50 text-amber-800',
    green: 'bg-emerald-50 text-emerald-800',
  };

  return (
    <div className="vendorhub-glass-card rounded-3xl p-5">
      <div className="flex items-center gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${tones[tone] || tones.violet}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-black text-stone-950">{value}</p>
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
      active ? 'vendorhub-glass-card-dark text-white shadow-sm' : 'vendorhub-glass-card text-stone-600 hover:-translate-y-0.5 hover:text-stone-950'
    }`}
  >
    <Icon className="h-5 w-5" />
    {label}
  </button>
);

const HealthRow = ({ label, value, danger = false }) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="font-bold text-stone-500">{label}</span>
    <span className={`font-black ${danger ? 'text-amber-700' : 'text-stone-950'}`}>{value}</span>
  </div>
);

const PanelHeader = ({ eyebrow, title, text, actionLabel, onAction, actionIcon: ActionIcon = Plus, actionDisabled = false, dark = false }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <p className={`text-xs font-black uppercase tracking-[0.18em] ${dark ? 'text-amber-200' : 'text-emerald-700'}`}>{eyebrow}</p>
      <h3 className={`mt-2 text-2xl font-black sm:text-3xl ${dark ? 'text-white' : 'text-stone-950'}`}>{title}</h3>
      <p className={`mt-1 max-w-2xl text-sm font-semibold leading-6 ${dark ? 'text-stone-400' : 'text-stone-500'}`}>{text}</p>
    </div>
    {actionLabel && (
      <button
        type="button"
        onClick={onAction}
        disabled={actionDisabled}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-950 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"
      >
        <ActionIcon className={`h-4 w-4 ${actionDisabled ? 'animate-spin' : ''}`} />
        {actionLabel}
      </button>
    )}
  </div>
);

const InsightCard = ({ icon: Icon, title, value, text }) => (
  <div className="vendorhub-glass-card rounded-3xl p-5">
    <div className="flex items-center justify-between">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-stone-950">{value}</p>
    </div>
    <p className="mt-4 text-base font-black text-stone-950">{title}</p>
    <p className="mt-1 text-sm font-semibold text-stone-500">{text}</p>
  </div>
);

const QuickAction = ({ icon: Icon, title, text, onClick }) => (
  <button type="button" onClick={onClick} className="vendorhub-glass-card flex items-center gap-3 rounded-2xl p-3 text-left transition hover:-translate-y-0.5">
    <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800 shadow-sm">
      <Icon className="h-5 w-5" />
    </span>
    <span>
      <span className="block text-sm font-black text-stone-950">{title}</span>
      <span className="block text-xs font-semibold text-stone-500">{text}</span>
    </span>
  </button>
);

const AIActionButton = ({ icon: Icon, title, text, loading, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="vendorhub-glass-field flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:-translate-y-0.5 hover:border-emerald-300/60 disabled:cursor-wait disabled:opacity-65"
  >
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-stone-950 shadow-sm">
      {loading ? <Loader className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-black text-white">{title}</span>
      <span className="mt-0.5 block text-xs font-semibold leading-5 text-stone-400">{text}</span>
    </span>
  </button>
);

const InventoryRow = ({ product, compact = false, onStockUp, onStockDown, onToggle, onDelete }) => {
  const stock = Number(product.stock || 0);
  const isLow = product.lowStock || (stock > 0 && stock <= 5);
  const isOut = stock === 0;

  return (
    <article className={`vendorhub-glass-card grid gap-4 rounded-3xl p-4 ${compact ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[90px_minmax(0,1fr)_250px]'}`}>
      <div className="h-20 overflow-hidden rounded-2xl bg-[#25262c]">
        {product.image ? (
          <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-stone-500">
            <Boxes className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-black text-stone-950">{product.title}</p>
          <StockBadge isOut={isOut} isLow={isLow} />
        </div>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-stone-500">{product.category || 'General'} · {product.brand || 'No brand'}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-stone-600">
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
          <button type="button" onClick={onStockDown} className="vendorhub-glass-card rounded-xl px-3 py-2 text-xs font-black text-stone-800 hover:-translate-y-0.5">
            - Stock
          </button>
          <button type="button" onClick={onToggle} className="vendorhub-glass-card rounded-xl px-3 py-2 text-xs font-black text-stone-800 hover:-translate-y-0.5">
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
  <div className="vendorhub-glass-card rounded-3xl p-10 text-center">
    <Boxes className="mx-auto mb-3 h-10 w-10 text-stone-400" />
    <p className="text-lg font-black text-stone-950">{title}</p>
    <p className="mt-1 text-sm font-semibold text-stone-500">{text}</p>
  </div>
);

const SellerInput = ({ label, value, onChange, placeholder, type = 'text', textarea = false }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-stone-400">{label}</span>
    {textarea ? (
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={5} className="vendorhub-glass-field w-full resize-none rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-stone-500" />
    ) : (
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="vendorhub-glass-field h-12 w-full rounded-2xl px-4 text-sm font-bold text-white outline-none placeholder:text-stone-500" />
    )}
  </label>
);
