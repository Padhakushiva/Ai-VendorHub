import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Edit3,
  LayoutDashboard,
  Loader,
  LogOut,
  PackageCheck,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useAuthBridge } from '../context/AuthBridgeContext';
import { useProduct } from '../context/ProductContext';

const emptyCampaign = {
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
  mediaUrl: '',
  mediaAlt: '',
  products: [],
  position: '1',
  isActive: true,
  startAt: '',
  endAt: '',
  theme: {
    bg: '#d73a20',
    shapeStyle: 'circles',
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

const placementLabels = {
  after_categories: 'After categories',
  after_stats: 'After stats',
  before_catalog: 'Before catalog',
};

const placementDescriptions = {
  after_categories: 'Appears just below category chips, best for high-impact sale posters.',
  after_stats: 'Appears after product stats, best for deal rows and mid-page promotions.',
  before_catalog: 'Appears before the full product catalog, best for final conversion pushes.',
};

const homepageTypeOptions = [
  ['banner', 'Swipeable sale poster'],
  ['split_banner', 'Split promo banner'],
  ['coupon_banner', 'Coupon code banner'],
  ['mini_banner', 'Mini announcement banner'],
  ['gif_banner', 'Editable GIF banner'],
  ['product_row', 'Curated product lane'],
  ['product_grid', 'Deal grid block'],
  ['featured_split', 'Featured hero split'],
  ['compact_deals', 'Compact deal rail'],
  ['category_tiles', 'Department tile grid'],
  ['mosaic_grid', 'Mosaic product wall'],
  ['editorial_stack', 'Editorial story stack'],
  ['brand_marquee', 'Brand marquee rail'],
];

const bannerTypes = ['banner', 'split_banner', 'coupon_banner', 'mini_banner', 'gif_banner'];

const productBackedTypes = ['product_row', 'product_grid', 'featured_split', 'compact_deals', 'category_tiles', 'mosaic_grid', 'editorial_stack', 'brand_marquee'];

const homepageTypeLabels = Object.fromEntries(homepageTypeOptions);

const bannerShapeOptions = [
  ['circles', 'Circles'],
  ['diagonal', 'Diagonal'],
  ['waves', 'Waves'],
  ['burst', 'Burst'],
  ['blocks', 'Blocks'],
  ['spotlight', 'Spotlight'],
];

const campaignPresets = [
  {
    label: 'Mega Sale Poster',
    type: 'banner',
    placement: 'after_categories',
    title: 'Mega Electronics Sale',
    tag: 'VendorHub Sale',
    headline: 'Extra discounts for smart shoppers',
    strip: 'Early access for premium members',
    query: 'best value electronics',
    badgeTop: 'AI',
    badgeMid: 'Deals',
    badgeBottom: 'Sale',
    theme: {
      bg: '#d73a20',
      shapeA: '#f97316',
      shapeB: '#f59e0b',
      stripBg: '#facc15',
      text: '#ffe500',
      badgeTopBg: '#c92c13',
      badgeMidBg: '#facc15',
    },
  },
  {
    label: 'Today Deals Row',
    type: 'product_row',
    placement: 'after_stats',
    title: "Today's Deals",
    tag: 'Deal lane',
    headline: 'Fresh discounts picked for the homepage',
    strip: 'Admin curated offers',
    query: 'today deals',
    theme: {
      frame: 'bg-[#c2410c]',
      stripe: 'bg-[#fb923c]',
    },
  },
  {
    label: 'Split Promo Banner',
    type: 'split_banner',
    placement: 'after_categories',
    title: 'Laptop Upgrade Week',
    tag: 'Creator Sale',
    headline: 'Power gear for work, gaming, and study',
    strip: 'Bundle deals on laptops, audio, and accessories',
    query: 'laptop accessories',
    badgeTop: 'Pro',
    badgeMid: 'Gear',
    badgeBottom: 'Drop',
    theme: {
      bg: '#1d4ed8',
      shapeA: '#38bdf8',
      shapeB: '#0f172a',
      stripBg: '#67e8f9',
      text: '#ffffff',
      badgeTopBg: '#0f172a',
      badgeMidBg: '#67e8f9',
    },
  },
  {
    label: 'Coupon Banner',
    type: 'coupon_banner',
    placement: 'after_stats',
    title: 'App Coupon Blast',
    tag: 'Extra coupon',
    headline: 'Use code VENDOR25',
    strip: 'Extra savings unlock at checkout',
    query: 'best value',
    badgeTop: '25%',
    badgeMid: 'OFF',
    badgeBottom: 'Code',
    theme: {
      bg: '#7c2d12',
      shapeA: '#f97316',
      shapeB: '#fde68a',
      stripBg: '#fed7aa',
      text: '#fff7ed',
      badgeTopBg: '#111827',
      badgeMidBg: '#fed7aa',
    },
  },
  {
    label: 'Mini Announcement',
    type: 'mini_banner',
    placement: 'before_catalog',
    title: 'Free shipping strip',
    tag: 'Fast delivery',
    headline: 'Free shipping on selected products',
    strip: 'Limited time fulfillment offer',
    query: 'ready to ship',
    theme: {
      bg: '#065f46',
      shapeA: '#34d399',
      shapeB: '#d9f99d',
      stripBg: '#bbf7d0',
      text: '#ecfdf5',
      badgeTopBg: '#064e3b',
      badgeMidBg: '#bbf7d0',
    },
  },
  {
    label: 'GIF Hero Banner',
    type: 'gif_banner',
    placement: 'after_categories',
    title: 'Animated Sale Drop',
    tag: 'Animated deal',
    headline: 'Moving offers for high attention',
    strip: 'Paste any GIF URL and edit the campaign text',
    query: 'animated deals',
    mediaUrl: 'https://media.giphy.com/media/l0HlQ7LRalQqdWfao/giphy.gif',
    mediaAlt: 'Animated shopping deal',
    badgeTop: 'GIF',
    badgeMid: 'Live',
    badgeBottom: 'Sale',
    theme: {
      bg: '#111827',
      shapeStyle: 'spotlight',
      shapeA: '#8b5cf6',
      shapeB: '#22d3ee',
      stripBg: '#a78bfa',
      text: '#ffffff',
      badgeTopBg: '#4c1d95',
      badgeMidBg: '#67e8f9',
    },
  },
  {
    label: 'Top Selection Row',
    type: 'product_row',
    placement: 'before_catalog',
    title: 'Top Selection',
    tag: 'Premium row',
    headline: 'Homepage picks for serious shoppers',
    strip: 'Featured products before full catalog',
    query: 'top selection',
    theme: {
      frame: 'bg-[#047857]',
      stripe: 'bg-[#29aa78]',
    },
  },
  {
    label: 'Deal Grid Block',
    type: 'product_grid',
    placement: 'after_stats',
    title: 'Flash Deal Store',
    tag: 'Hot picks',
    headline: 'Colorful grid for multiple offers',
    strip: 'Best products grouped together',
    query: 'flash deals',
    theme: {
      frame: 'bg-[#be123c]',
      stripe: 'bg-[#fb7185]',
    },
  },
  {
    label: 'Featured Split',
    type: 'featured_split',
    placement: 'before_catalog',
    title: 'Premium Spotlight',
    tag: 'Hero product',
    headline: 'One big feature with supporting picks',
    strip: 'Use this for seasonal hero products',
    query: 'premium picks',
    theme: {
      frame: 'bg-[#1d4ed8]',
      stripe: 'bg-[#60a5fa]',
    },
  },
  {
    label: 'Department Tiles',
    type: 'category_tiles',
    placement: 'after_categories',
    title: 'Featured Departments',
    tag: 'Hot picks',
    headline: 'Color category cards for homepage browsing',
    strip: 'Departments generated from selected products',
    query: 'electronics',
    theme: {
      frame: 'bg-[#047857]',
      stripe: 'bg-[#29aa78]',
    },
  },
  {
    label: 'Mosaic Product Wall',
    type: 'mosaic_grid',
    placement: 'after_stats',
    title: 'Weekend Product Wall',
    tag: 'Mixed picks',
    headline: 'Large-small visual shopping block',
    strip: 'A richer grid for seasonal collections',
    query: 'weekend deals',
    theme: {
      frame: 'bg-[#854d0e]',
      stripe: 'bg-[#facc15]',
    },
  },
  {
    label: 'Editorial Stack',
    type: 'editorial_stack',
    placement: 'before_catalog',
    title: 'Setup Stories',
    tag: 'Buying guide',
    headline: 'Products grouped like a shoppable guide',
    strip: 'Useful for tech setups and lifestyle collections',
    query: 'premium setup',
    theme: {
      frame: 'bg-[#0f766e]',
      stripe: 'bg-[#2dd4bf]',
    },
  },
  {
    label: 'Brand Marquee',
    type: 'brand_marquee',
    placement: 'after_categories',
    title: 'Brands Trending Now',
    tag: 'Popular brands',
    headline: 'Quick brand discovery rail',
    strip: 'Brand chips generated from selected products',
    query: 'top brands',
    theme: {
      frame: 'bg-[#4338ca]',
      stripe: 'bg-[#818cf8]',
    },
  },
];

export default function AdminPortal() {
  const { user, isAuthenticated, loading, loginUrl, logout } = useAuthBridge();
  const {
    products,
    adminHomepageSections,
    homepageSections,
    fetchProducts,
    fetchHomepageSections,
    fetchAdminHomepageSections,
    createHomepageSection,
    updateHomepageSection,
    deleteHomepageSection,
  } = useProduct();

  const [activeView, setActiveView] = useState('campaigns');
  const [form, setForm] = useState(emptyCampaign);
  const [notice, setNotice] = useState('');
  const [formStatus, setFormStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = isAuthenticated && user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      Promise.all([fetchAdminHomepageSections(), fetchHomepageSections(), fetchProducts()]).then((results) => {
        const failed = results.find((result) => result?.success === false);
        if (failed) setNotice(failed.message);
      });
    }
  }, [fetchAdminHomepageSections, fetchHomepageSections, fetchProducts, isAdmin]);

  const stats = useMemo(() => {
    const activeCampaigns = adminHomepageSections.filter((section) => section.isActive).length;
    const banners = adminHomepageSections.filter((section) => bannerTypes.includes(section.type)).length;
    const rows = adminHomepageSections.filter((section) => !bannerTypes.includes(section.type)).length;
    const livePlacements = new Set(homepageSections.map((section) => section.placement).filter(Boolean)).size;
    return { activeCampaigns, banners, rows, livePlacements };
  }, [adminHomepageSections, homepageSections]);

  const updateField = (field, value) => {
    setFormStatus(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateTheme = (field, value) => {
    setFormStatus(null);
    setForm((current) => ({ ...current, theme: { ...current.theme, [field]: value } }));
  };

  const toggleProduct = (productId) => {
    setForm((current) => ({
      ...current,
      products: current.products.includes(productId)
        ? current.products.filter((id) => id !== productId)
        : [...current.products, productId],
    }));
  };

  const resetForm = () => {
    setForm(emptyCampaign);
    setFormStatus(null);
  };

  const applyPreset = (preset) => {
    setForm((current) => ({
      ...emptyCampaign,
      ...preset,
      id: '',
      position: current.position || '1',
      products: current.products,
      isActive: true,
      theme: { ...emptyCampaign.theme, ...(preset.theme || {}) },
    }));
    const message = `${preset.label} preset loaded. Adjust products, dates, and colors before publishing.`;
    setNotice(message);
    setFormStatus({ type: 'info', message });
  };

  const editSection = (section) => {
    setForm({
      ...emptyCampaign,
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
      mediaUrl: section.mediaUrl || '',
      mediaAlt: section.mediaAlt || '',
      products: Array.isArray(section.products) ? section.products.map((product) => product.id).filter(Boolean) : [],
      position: String(section.position ?? 1),
      isActive: section.isActive !== false,
      startAt: section.startAt ? section.startAt.slice(0, 16) : '',
      endAt: section.endAt ? section.endAt.slice(0, 16) : '',
      theme: { ...emptyCampaign.theme, ...(section.theme || {}) },
    });
    setActiveView('campaigns');
  };

  const buildPayload = () => {
    const title = (form.title || form.headline || form.tag || form.strip || 'Homepage campaign').trim();
    return {
      ...form,
      title,
      position: Number(form.position || 0),
      startAt: form.startAt || null,
      endAt: form.endAt || null,
    };
  };

  const saveCampaign = async (event) => {
    event.preventDefault();
    setFormStatus(null);
    const derivedTitle = (form.title || form.headline || form.tag || form.strip || '').trim();
    if (derivedTitle.length < 3) {
      const message = 'Add at least a title, headline, tag, or strip text before publishing.';
      setNotice(message);
      setFormStatus({ type: 'error', message });
      return;
    }

    setBusy(true);
    const result = form.id
      ? await updateHomepageSection(form.id, buildPayload())
      : await createHomepageSection(buildPayload());
    setBusy(false);
    setNotice(result.message);
    setFormStatus({ type: result.success ? 'success' : 'error', message: result.message });
    if (result.success) {
      resetForm();
      setFormStatus({ type: 'success', message: `${result.message}. It is synced to the storefront.` });
      setActiveView('overview');
    }
  };

  const removeSection = async (section) => {
    if (!window.confirm(`Delete "${section.title}" from homepage CMS?`)) return;
    setBusy(true);
    const result = await deleteHomepageSection(section.id);
    setBusy(false);
    setNotice(result.message);
    if (form.id === section.id) resetForm();
  };

  const refreshAll = async () => {
    setBusy(true);
    await Promise.all([fetchAdminHomepageSections(), fetchHomepageSections(), fetchProducts()]);
    setBusy(false);
    setNotice('Admin portal synced.');
  };

  if (loading) {
    return <AdminShell><div className="h-60 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.05]" /></AdminShell>;
  }

  if (!isAuthenticated) {
    return (
      <AdminShell>
        <AccessPanel
          icon={ShieldCheck}
          title="Admin login required"
          text="Sign in with an admin account to manage storefront campaigns, sale posters, and homepage rows."
          actionLabel="Login as admin"
          actionHref={`${loginUrl}${loginUrl.includes('?') ? '&' : '?'}role=admin`}
        />
      </AdminShell>
    );
  }

  if (!isAdmin) {
    return (
      <AdminShell>
        <AccessPanel
          icon={XCircle}
          title="Admin access only"
          text={`You are signed in as ${user?.role || 'user'}. Admin portal controls are only available for role admin.`}
          actionLabel="Back to storefront"
          actionHref="/"
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[#0d101b] shadow-2xl shadow-black/35">
        <header className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(99,91,255,0.28),transparent_32%),linear-gradient(135deg,#141827,#070911)] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#d8d4ff]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Command Portal
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-6xl">
                Storefront Control Center
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[#b8b5ca]">
                Manage homepage campaigns, sale banners, swipeable posters, product rows, schedules, and live storefront content from one admin-only workspace.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#aaa5ff]">Signed in admin</p>
              <p className="mt-2 text-xl font-black text-white">{user?.username || 'Admin'}</p>
              <p className="text-sm font-bold text-zinc-400">{user?.email}</p>
              <button type="button" onClick={logout} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-400/15">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </header>

        <div className="grid border-b border-white/10 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetric icon={CheckCircle2} label="Active campaigns" value={stats.activeCampaigns} />
          <AdminMetric icon={LayoutDashboard} label="Sale banners" value={stats.banners} />
          <AdminMetric icon={PackageCheck} label="Product rows" value={stats.rows} />
          <AdminMetric icon={Store} label="Live placements" value={stats.livePlacements} />
        </div>

        <div className="grid min-h-[760px] lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="border-b border-white/10 bg-[#080a13] p-5 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              <AdminNav active={activeView === 'campaigns'} icon={LayoutDashboard} label="Campaign Studio" onClick={() => setActiveView('campaigns')} />
              <AdminNav active={activeView === 'overview'} icon={BarChart3} label="Live Overview" onClick={() => setActiveView('overview')} />
              <AdminNav active={activeView === 'products'} icon={Boxes} label="Product Picker" onClick={() => setActiveView('products')} />
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8f8aa3]">System flow</p>
              <div className="mt-4 space-y-3 text-sm font-bold text-zinc-300">
                <FlowRow text="Admin creates campaign" />
                <FlowRow text="MongoDB stores config" />
                <FlowRow text="Homepage API filters live sections" />
                <FlowRow text="React renders dynamic storefront" />
              </div>
            </div>
          </aside>

          <main className="bg-[linear-gradient(135deg,#15171c,#0d0e12)] p-5 text-white sm:p-7 lg:p-9">
            {notice && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-[#202228] px-4 py-3 text-sm font-bold text-zinc-100">
                <Sparkles className="mt-0.5 h-4 w-4 text-[#aaa5ff]" />
                <span>{notice}</span>
              </div>
            )}

            {activeView === 'campaigns' && (
              <div className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_430px]">
                <CampaignForm form={form} products={products} busy={busy} formStatus={formStatus} updateField={updateField} updateTheme={updateTheme} toggleProduct={toggleProduct} resetForm={resetForm} applyPreset={applyPreset} onSubmit={saveCampaign} />
                <CampaignList sections={adminHomepageSections} busy={busy} refreshAll={refreshAll} editSection={editSection} removeSection={removeSection} />
              </div>
            )}

            {activeView === 'overview' && (
              <div className="grid gap-6 xl:grid-cols-3">
                {adminHomepageSections.map((section) => (
                  <CampaignCard key={section.id} section={section} onEdit={() => editSection(section)} />
                ))}
                {!adminHomepageSections.length && <EmptyState title="No campaigns yet" text="Create your first admin campaign from Campaign Studio." />}
              </div>
            )}

            {activeView === 'products' && (
              <div className="rounded-3xl border border-white/10 bg-[#1c1d22] p-5">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#aaa5ff]">Product Picker</p>
                    <h2 className="mt-2 text-3xl font-black text-white">Catalog available for homepage rows</h2>
                  </div>
                  <button type="button" onClick={refreshAll} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/5">
                    <RefreshCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => <ProductPickCard key={product.id} product={product} />)}
                  {!products.length && <EmptyState title="No products loaded" text="Create products first, then attach them to homepage rows." />}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </AdminShell>
  );
}

const AdminShell = ({ children }) => (
  <section className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(99,91,255,0.18),transparent_28%),linear-gradient(135deg,#050505,#111318_45%,#050505)] px-3 py-4 sm:px-6 lg:px-10">
    {children}
  </section>
);

const AccessPanel = ({ icon: Icon, title, text, actionLabel, actionHref }) => (
  <div className="mx-auto mt-14 max-w-3xl rounded-[34px] border border-white/10 bg-[#10131f] p-8 text-center shadow-2xl shadow-black/35">
    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-[#10131f]">
      <Icon className="h-8 w-8" />
    </div>
    <h1 className="mt-6 text-4xl font-black text-white">{title}</h1>
    <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-7 text-[#aaa6ba]">{text}</p>
    <a href={actionHref} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-zinc-200">
      {actionLabel}
      <ArrowUpRight className="h-4 w-4" />
    </a>
  </div>
);

const CampaignForm = ({ form, products, busy, formStatus, updateField, updateTheme, toggleProduct, resetForm, applyPreset, onSubmit }) => (
  <form onSubmit={onSubmit} className="rounded-3xl border border-white/10 bg-[#1c1d22] p-5 shadow-xl shadow-black/20 sm:p-6">
    <PanelTitle
      eyebrow="Campaign Studio"
      title={form.id ? 'Edit homepage campaign' : 'Create homepage campaign'}
      text="Build sale posters, swipeable banners, and product lanes that update the ecommerce homepage without code changes."
      actionLabel={form.id ? 'New campaign' : ''}
      onAction={resetForm}
    />

    <HomepageBlueprint activePlacement={form.placement} />
    <PresetStrip applyPreset={applyPreset} />
    <CampaignPreview form={form} products={products} updateField={updateField} updateTheme={updateTheme} />

    <div className="mt-7 grid gap-5">
      <div className="grid gap-5 md:grid-cols-3">
        <AdminSelect label="Homepage module" value={form.type} onChange={(value) => updateField('type', value)} options={homepageTypeOptions} />
        <AdminSelect label="Homepage placement" value={form.placement} onChange={(value) => updateField('placement', value)} options={Object.entries(placementLabels)} />
        <AdminInput label="Position" type="number" value={form.position} onChange={(value) => updateField('position', value)} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <AdminInput label="Title" value={form.title} onChange={(value) => updateField('title', value)} placeholder="Mega electronics sale" />
        <AdminInput label="Small tag" value={form.tag} onChange={(value) => updateField('tag', value)} placeholder="VendorHub Sale" />
      </div>
      <AdminInput label="Headline" value={form.headline} onChange={(value) => updateField('headline', value)} placeholder="Extra discounts for smart shoppers" />
      <AdminInput label="Strip / subtitle text" value={form.strip} onChange={(value) => updateField('strip', value)} placeholder="Early access for premium members" />
      <div className="grid gap-5 md:grid-cols-2">
        <AdminInput label="Search query on click" value={form.query} onChange={(value) => updateField('query', value)} placeholder="best value laptop" />
        <AdminInput label="Direct link optional" value={form.link} onChange={(value) => updateField('link', value)} placeholder="/deals" />
      </div>

      {form.type === 'gif_banner' && (
        <div className="grid gap-5 md:grid-cols-[1fr_0.65fr]">
          <AdminInput label="GIF URL" value={form.mediaUrl} onChange={(value) => updateField('mediaUrl', value)} placeholder="https://media.giphy.com/media/.../giphy.gif" />
          <AdminInput label="GIF alt text" value={form.mediaAlt} onChange={(value) => updateField('mediaAlt', value)} placeholder="Animated sale banner" />
        </div>
      )}

      {form.type === 'gif_banner' ? (
        <div className="p-4">
          <div className="relative overflow-hidden rounded-2xl border-2 border-black" style={{ backgroundColor: form.theme.bg }}>
            <div className="absolute inset-0 opacity-60" style={getBannerShapeStyle(form.theme)} />
            <div className="relative grid gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div className="overflow-hidden rounded-2xl border-2 border-black bg-black shadow-[7px_7px_0_#000]">
                {form.mediaUrl ? (
                  <img src={form.mediaUrl} alt={form.mediaAlt || form.title || 'Campaign GIF'} className="aspect-video h-full w-full object-cover" />
                ) : (
                  <div className="grid aspect-video place-items-center bg-white/10 text-center text-sm font-black text-white/65">
                    Paste a GIF URL below
                  </div>
                )}
              </div>
              <div>
                <span className="inline-flex rotate-[-2deg] rounded-lg border-2 border-black px-3 py-1 text-xs font-black uppercase text-black" style={{ backgroundColor: form.theme.stripBg }}>
                  <InlineEditable value={form.tag} fallback="Animated deal" onChange={(value) => updateField('tag', value)} />
                </span>
                <h3 className="mt-4 text-3xl font-black uppercase leading-none [text-shadow:3px_3px_0_#050505]" style={{ color: form.theme.text }}>
                  <InlineEditable value={form.headline || form.title} fallback="Animated homepage offer" onChange={(value) => updateField('headline', value)} />
                </h3>
                <p className="mt-4 rounded-xl px-4 py-3 text-sm font-black uppercase text-black" style={{ backgroundColor: form.theme.stripBg }}>
                  <InlineEditable value={form.strip} fallback="GIF campaign strip text" onChange={(value) => updateField('strip', value)} />
                </p>
              </div>
            </div>
            <div className="relative grid gap-3 border-t-2 border-black bg-black/25 p-4 md:grid-cols-[1fr_0.7fr]">
              <AdminInput label="Edit GIF URL directly" value={form.mediaUrl} onChange={(value) => updateField('mediaUrl', value)} placeholder="https://media.giphy.com/media/.../giphy.gif" />
              <AdminInput label="Edit alt text" value={form.mediaAlt} onChange={(value) => updateField('mediaAlt', value)} placeholder="Animated campaign" />
            </div>
          </div>
        </div>
      ) : bannerTypes.includes(form.type) ? (
        <>
          <div className="grid gap-5 md:grid-cols-3">
            <AdminInput label="Badge top" value={form.badgeTop} onChange={(value) => updateField('badgeTop', value)} />
            <AdminInput label="Badge middle" value={form.badgeMid} onChange={(value) => updateField('badgeMid', value)} />
            <AdminInput label="Badge bottom" value={form.badgeBottom} onChange={(value) => updateField('badgeBottom', value)} />
          </div>
          <ThemeEditor form={form} updateTheme={updateTheme} banner />
        </>
      ) : (
        <>
          <ThemeEditor form={form} updateTheme={updateTheme} />
          {productBackedTypes.includes(form.type) && <ProductSelector products={products} selected={form.products} toggleProduct={toggleProduct} type={form.type} />}
        </>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <SchedulePicker
          label="Start date and time"
          value={form.startAt}
          onChange={(value) => updateField('startAt', value)}
          tone="start"
        />
        <SchedulePicker
          label="End date and time"
          value={form.endAt}
          onChange={(value) => updateField('endAt', value)}
          tone="end"
        />
      </div>

      <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#111216] px-4 py-3">
        <span>
          <span className="block text-sm font-black text-white">Active on storefront</span>
          <span className="block text-xs font-semibold text-zinc-500">Turn off to save draft without showing it.</span>
        </span>
        <input type="checkbox" checked={form.isActive} onChange={(event) => updateField('isActive', event.target.checked)} className="h-5 w-5 accent-[#8b85ff]" />
      </label>
    </div>

    {formStatus && (
      <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-black ${
        formStatus.type === 'success'
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
          : formStatus.type === 'error'
            ? 'border-rose-400/30 bg-rose-400/10 text-rose-100'
            : 'border-[#aaa5ff]/30 bg-[#635bff]/10 text-[#dedbff]'
      }`}>
        {formStatus.message}
      </div>
    )}

    <button type="submit" disabled={busy} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-black shadow-lg shadow-white/10 transition hover:-translate-y-0.5 hover:bg-zinc-200 disabled:opacity-60">
      {busy ? <Loader className="h-4 w-4 animate-spin" /> : <LayoutDashboard className="h-4 w-4" />}
      {form.id ? 'Update campaign' : 'Publish campaign'}
    </button>
  </form>
);

const HomepageBlueprint = ({ activePlacement }) => (
  <div className="mt-7 rounded-3xl border border-white/10 bg-[#111216] p-4">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#aaa5ff]">Homepage placement map</p>
        <p className="mt-1 text-sm font-semibold text-zinc-400">Choose where this module appears on the customer storefront.</p>
      </div>
      <LayoutDashboard className="h-5 w-5 text-[#aaa5ff]" />
    </div>
    <div className="grid gap-3 lg:grid-cols-3">
      {Object.entries(placementLabels).map(([key, label]) => (
        <div key={key} className={`rounded-2xl border p-4 ${activePlacement === key ? 'border-[#aaa5ff] bg-[#635bff]/15' : 'border-white/10 bg-black/20'}`}>
          <p className="text-sm font-black text-white">{label}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-zinc-400">{placementDescriptions[key]}</p>
        </div>
      ))}
    </div>
  </div>
);

const PresetStrip = ({ applyPreset }) => (
  <div className="mt-5 rounded-3xl border border-white/10 bg-[#111216] p-4">
    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#aaa5ff]">Quick homepage templates</p>
    <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {campaignPresets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => applyPreset(preset)}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
        >
          <span className="block text-sm font-black text-white">{preset.label}</span>
          <span className="mt-1 block text-xs font-semibold text-zinc-500">{homepageTypeLabels[preset.type] || preset.type}</span>
        </button>
      ))}
    </div>
  </div>
);

const CampaignPreview = ({ form, products, updateField, updateTheme }) => {
  const selectedProducts = products.filter((product) => form.products.includes(product.id)).slice(0, 4);
  return (
    <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-[#111216]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#aaa5ff]">Live style preview</p>
          <p className="mt-1 text-xs font-semibold text-zinc-500">Click preview text to edit. Use shape buttons to change the banner pattern directly.</p>
        </div>
        <PreviewThemeTools form={form} updateTheme={updateTheme} />
      </div>
      {bannerTypes.includes(form.type) ? (
        <div className="p-4">
          <div className="relative overflow-hidden rounded-2xl border-2 border-black" style={{ backgroundColor: form.theme.bg }}>
            <div className="absolute inset-0 opacity-70" style={getBannerShapeStyle(form.theme)} />
            <div className="relative px-5 py-6">
              <span className="inline-flex rotate-[-2deg] rounded-lg border-2 border-black px-3 py-1 text-xs font-black uppercase text-black" style={{ backgroundColor: form.theme.stripBg }}>
                <InlineEditable value={form.tag} fallback="VendorHub Sale" onChange={(value) => updateField('tag', value)} />
              </span>
              <h3 className="mt-4 max-w-2xl text-3xl font-black uppercase leading-none [text-shadow:3px_3px_0_#050505]" style={{ color: form.theme.text }}>
                <InlineEditable value={form.headline || form.title} fallback="Homepage sale headline" onChange={(value) => updateField('headline', value)} />
              </h3>
            </div>
            <div className="relative px-5 py-3 text-sm font-black uppercase text-black" style={{ backgroundColor: form.theme.stripBg }}>
              <InlineEditable value={form.strip} fallback="Campaign strip text" onChange={(value) => updateField('strip', value)} />
            </div>
          </div>
        </div>
      ) : form.type === 'featured_split' ? (
        <div className="grid gap-3 p-4 lg:grid-cols-[1.3fr_0.9fr]">
          <div className={`rounded-2xl p-4 ${form.theme.frame}`}>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/75"><InlineEditable value={form.tag} fallback="Hero product" onChange={(value) => updateField('tag', value)} /></p>
            <h3 className="mt-2 text-3xl font-black text-white"><InlineEditable value={form.title} fallback="Featured split module" onChange={(value) => updateField('title', value)} /></h3>
            <div className="mt-4 rounded-xl bg-white p-3">
              <div className="aspect-[1.4] rounded-lg bg-[#e5e5e5]" />
              <p className="mt-3 text-lg font-black text-black">{selectedProducts[0]?.title || 'Main product slot'}</p>
            </div>
          </div>
          <div className="grid gap-3">
            {(selectedProducts.slice(1, 4).length ? selectedProducts.slice(1, 4) : Array.from({ length: 3 })).map((product, index) => (
              <div key={product?.id || index} className="rounded-2xl bg-white p-3">
                <p className="text-sm font-black text-black">{product?.title || `Side slot ${index + 1}`}</p>
                <p className="text-xs font-black text-black">Special offer</p>
              </div>
            ))}
          </div>
        </div>
      ) : form.type === 'compact_deals' ? (
        <div className="p-4">
          <div className={`rounded-2xl p-4 ${form.theme.frame}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-2xl font-black text-white"><InlineEditable value={form.title} fallback="Compact deal rail" onChange={(value) => updateField('title', value)} /></h3>
              <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-black"><InlineEditable value={form.tag} fallback="Deals" onChange={(value) => updateField('tag', value)} /></span>
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              {(selectedProducts.length ? selectedProducts : Array.from({ length: 4 })).map((product, index) => (
                <div key={product?.id || index} className="rounded-xl bg-white px-3 py-4">
                  <p className="truncate text-sm font-black text-black">{product?.title || `Deal ${index + 1}`}</p>
                  <p className="text-xs font-black text-black">Limited offer</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : form.type === 'category_tiles' ? (
        <div className="p-4">
          <div className={`rounded-2xl p-4 ${form.theme.frame}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-2xl font-black text-white"><InlineEditable value={form.title} fallback="Department tile grid" onChange={(value) => updateField('title', value)} /></h3>
              <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-black"><InlineEditable value={form.tag} fallback="Hot picks" onChange={(value) => updateField('tag', value)} /></span>
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              {(selectedProducts.length ? selectedProducts : Array.from({ length: 4 })).map((product, index) => (
                <div key={product?.id || index} className="overflow-hidden rounded-xl bg-white">
                  <div className={['bg-blue-300', 'bg-violet-300', 'bg-yellow-300', 'bg-emerald-300'][index % 4] + ' h-20'} />
                  <p className="px-3 py-3 text-sm font-black text-black">{product?.category || `Department ${index + 1}`}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className={`rounded-2xl p-4 ${form.theme.frame}`}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/75"><InlineEditable value={form.tag} fallback="Product lane" onChange={(value) => updateField('tag', value)} /></p>
                <h3 className="text-2xl font-black text-white"><InlineEditable value={form.title} fallback="Homepage product row" onChange={(value) => updateField('title', value)} /></h3>
              </div>
              <span className="grid h-10 w-14 place-items-center rounded-full bg-white text-xl font-black text-black">→</span>
            </div>
            <div className={`grid gap-2 rounded-xl bg-white p-2 sm:grid-cols-2 ${form.type === 'product_grid' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
              {(selectedProducts.length ? selectedProducts : Array.from({ length: 4 })).map((product, index) => (
                <div key={product?.id || index} className="rounded-lg bg-[#f3f3f3] p-3">
                  <div className="aspect-[1.5] rounded-md bg-[#e5e5e5]" />
                  <p className="mt-2 truncate text-sm font-black text-black">{product?.title || `Product slot ${index + 1}`}</p>
                  <p className="text-xs font-black text-black">{index % 2 ? 'Special offer' : 'Widest Range'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InlineEditable = ({ value, fallback, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || fallback || '');

  useEffect(() => {
    if (!editing) setDraft(value || fallback || '');
  }, [editing, fallback, value]);

  const commit = () => {
    const clean = draft.trim();
    onChange(clean);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') {
            setDraft(value || fallback || '');
            setEditing(false);
          }
        }}
        className="min-w-[160px] max-w-full rounded-lg border border-black/20 bg-white px-2 py-1 text-current outline-none ring-2 ring-[#aaa5ff]"
      />
    );
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className="rounded-md px-1 text-left outline-none transition hover:bg-white/20 focus:ring-2 focus:ring-[#aaa5ff]" title="Click to edit">
      {value || fallback}
    </button>
  );
};

const PreviewThemeTools = ({ form, updateTheme }) => {
  if (bannerTypes.includes(form.type)) {
    return (
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {bannerShapeOptions.map(([shape, label]) => (
            <button
              key={shape}
              type="button"
              onClick={() => updateTheme('shapeStyle', shape)}
              className={`rounded-full border px-3 py-1.5 text-xs font-black transition hover:-translate-y-0.5 ${form.theme.shapeStyle === shape ? 'border-white bg-white text-black' : 'border-white/10 bg-white/5 text-zinc-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ColorDot label="Background" value={form.theme.bg} onChange={(value) => updateTheme('bg', value)} />
          <ColorDot label="Shape A" value={form.theme.shapeA} onChange={(value) => updateTheme('shapeA', value)} />
          <ColorDot label="Shape B" value={form.theme.shapeB} onChange={(value) => updateTheme('shapeB', value)} />
          <ColorDot label="Strip" value={form.theme.stripBg} onChange={(value) => updateTheme('stripBg', value)} />
          <ColorDot label="Text" value={form.theme.text} onChange={(value) => updateTheme('text', value)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {[
        ['bg-[#047857]', 'Green'],
        ['bg-[#c2410c]', 'Orange'],
        ['bg-[#1d4ed8]', 'Blue'],
        ['bg-[#7c3aed]', 'Violet'],
        ['bg-[#be123c]', 'Rose'],
        ['bg-[#0f766e]', 'Teal'],
        ['bg-[#854d0e]', 'Gold'],
        ['bg-[#4338ca]', 'Indigo'],
      ].map(([frame, label]) => (
        <button
          key={frame}
          type="button"
          onClick={() => updateTheme('frame', frame)}
          className={`rounded-full border px-3 py-1.5 text-xs font-black transition hover:-translate-y-0.5 ${form.theme.frame === frame ? 'border-white bg-white text-black' : 'border-white/10 bg-white/5 text-zinc-300'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

const getBannerShapeStyle = (theme = {}) => {
  const shapeA = theme.shapeA || '#f97316';
  const shapeB = theme.shapeB || '#f59e0b';

  switch (theme.shapeStyle) {
    case 'diagonal':
      return { background: `linear-gradient(135deg, transparent 0 26%, ${shapeA} 27% 42%, transparent 43% 58%, ${shapeB} 59% 74%, transparent 75% 100%)` };
    case 'waves':
      return { background: `radial-gradient(ellipse at 12% 22%, ${shapeA} 0 18%, transparent 19%), radial-gradient(ellipse at 70% 88%, ${shapeB} 0 22%, transparent 23%), repeating-radial-gradient(circle at 50% 120%, transparent 0 28px, rgba(255,255,255,0.12) 29px 33px)` };
    case 'burst':
      return { background: `conic-gradient(from 20deg at 72% 34%, ${shapeA}, transparent 18deg, ${shapeB} 36deg, transparent 54deg, ${shapeA} 72deg, transparent 90deg)` };
    case 'blocks':
      return { background: `linear-gradient(90deg, ${shapeA} 0 18%, transparent 18% 34%, ${shapeB} 34% 52%, transparent 52% 72%, ${shapeA} 72% 100%)` };
    case 'spotlight':
      return { background: `radial-gradient(circle at 76% 22%, ${shapeB} 0 24%, transparent 25%), radial-gradient(circle at 20% 70%, ${shapeA} 0 18%, transparent 19%)` };
    case 'circles':
    default:
      return { background: `radial-gradient(circle at 12% 28%, ${shapeA} 0 18%, transparent 19%), radial-gradient(circle at 78% 12%, ${shapeB} 0 16%, transparent 17%), linear-gradient(135deg, transparent 0 34%, rgba(0,0,0,0.12) 35% 44%, transparent 45% 100%)` };
  }
};

const ColorDot = ({ label, value, onChange }) => (
  <label className="group relative grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-white/5" title={label}>
    <span className="h-5 w-5 rounded-full border border-black/30" style={{ backgroundColor: value || '#ffffff' }} />
    <input type="color" value={value || '#ffffff'} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label} />
  </label>
);

const CampaignList = ({ sections, busy, refreshAll, editSection, removeSection }) => (
  <div className="rounded-3xl border border-white/10 bg-[#1c1d22] p-5 shadow-xl shadow-black/20 sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#aaa5ff]">Published controls</p>
        <h2 className="mt-2 text-2xl font-black text-white">Homepage campaigns</h2>
      </div>
      <button type="button" onClick={refreshAll} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-100 hover:bg-white/5">
        <RefreshCcw className={`mr-1 inline h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
        Sync
      </button>
    </div>
    <div className="mt-5 grid gap-3">
      {sections.map((section) => (
        <CampaignRow key={section.id} section={section} onEdit={() => editSection(section)} onDelete={() => removeSection(section)} />
      ))}
      {!sections.length && <EmptyState title="No campaigns yet" text="Create a banner or product row to start controlling the homepage." />}
    </div>
  </div>
);

const CampaignRow = ({ section, onEdit, onDelete }) => (
  <article className="rounded-3xl border border-white/10 bg-[#111216] p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge active={section.isActive} />
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black uppercase text-zinc-300">{homepageTypeLabels[section.type] || section.type}</span>
        </div>
        <h3 className="mt-3 truncate text-base font-black text-white">{section.title}</h3>
        <p className="mt-1 text-xs font-bold text-zinc-500">{placementLabels[section.placement] || section.placement} · position {section.position}</p>
        {!bannerTypes.includes(section.type) && <p className="mt-2 text-xs font-semibold text-zinc-400">{section.products?.length || 0} products linked</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onEdit} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-zinc-100 hover:bg-white/5" aria-label="Edit campaign">
          <Edit3 className="h-4 w-4" />
        </button>
        <button type="button" onClick={onDelete} className="grid h-10 w-10 place-items-center rounded-xl border border-rose-400/30 text-rose-200 hover:bg-rose-400/10" aria-label="Delete campaign">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  </article>
);

const CampaignCard = ({ section, onEdit }) => (
  <article className="rounded-3xl border border-white/10 bg-[#1c1d22] p-5 shadow-xl shadow-black/20">
    <div className="flex items-start justify-between gap-3">
      <div>
        <StatusBadge active={section.isActive} />
        <h3 className="mt-4 text-xl font-black text-white">{section.title}</h3>
      </div>
      <button type="button" onClick={onEdit} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-100 hover:bg-white/5">Edit</button>
    </div>
    <p className="mt-2 text-sm font-semibold leading-6 text-zinc-400">{section.headline || section.subtitle || 'No description added.'}</p>
    <div className="mt-5 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.1em] text-zinc-500">
      <span>{section.type}</span>
      <span>{placementLabels[section.placement] || section.placement}</span>
      <span>{section.products?.length || 0} products</span>
    </div>
  </article>
);

const ProductSelector = ({ products, selected, toggleProduct, type }) => (
  <div>
    <span className="mb-3 block text-xs font-black uppercase tracking-[0.12em] text-zinc-500">
      Products for {homepageTypeLabels[type] || 'this module'}
    </span>
    <div className="grid max-h-72 gap-2 overflow-y-auto rounded-2xl border border-white/10 bg-[#111216] p-3">
      {products.map((product) => (
        <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5">
          <input type="checkbox" checked={selected.includes(product.id)} onChange={() => toggleProduct(product.id)} className="h-4 w-4 accent-[#8b85ff]" />
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-100">{product.title}</span>
          <span className="text-xs font-black text-zinc-500">{product.category || 'General'}</span>
        </label>
      ))}
      {!products.length && <p className="px-3 py-5 text-center text-sm font-semibold text-zinc-500">No products loaded yet.</p>}
    </div>
  </div>
);

const ThemeEditor = ({ form, updateTheme, banner = false }) => {
  const fields = banner
    ? [['bg', 'Background'], ['shapeA', 'Shape A'], ['shapeB', 'Shape B'], ['stripBg', 'Strip'], ['text', 'Headline'], ['badgeTopBg', 'Badge top'], ['badgeMidBg', 'Badge mid']]
    : [['frame', 'Row frame'], ['stripe', 'Row stripe']];
  const rowOptions = ['bg-[#047857]', 'bg-[#c2410c]', 'bg-[#1d4ed8]', 'bg-[#7c3aed]', 'bg-[#be123c]', 'bg-[#0f766e]'];

  return (
    <div>
      <span className="mb-3 block text-xs font-black uppercase tracking-[0.12em] text-zinc-500">Theme controls</span>
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map(([field, label]) => (
          <label key={field} className="block rounded-2xl border border-white/10 bg-[#111216] p-3">
            <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.12em] text-zinc-500">{label}</span>
            {field === 'frame' || field === 'stripe' ? (
              <select value={form.theme[field]} onChange={(event) => updateTheme(field, event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[#0c0d11] px-3 text-sm font-bold text-zinc-100 outline-none">
                {rowOptions.map((option) => <option key={`${field}-${option}`} value={option}>{option}</option>)}
              </select>
            ) : (
              <div className="flex items-center gap-3">
                <input type="color" value={form.theme[field] || '#ffffff'} onChange={(event) => updateTheme(field, event.target.value)} className="h-10 w-12 rounded-lg border border-white/10 bg-transparent" />
                <input value={form.theme[field] || ''} onChange={(event) => updateTheme(field, event.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0c0d11] px-3 text-sm font-bold text-zinc-100 outline-none" />
              </div>
            )}
          </label>
        ))}
      </div>
    </div>
  );
};

const ProductPickCard = ({ product }) => (
  <article className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-2xl border border-white/10 bg-[#111216] p-3">
    <div className="h-16 overflow-hidden rounded-xl bg-[#25262c]">
      {product.image ? <img src={product.image} alt={product.title} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center"><Boxes className="h-5 w-5 text-zinc-500" /></div>}
    </div>
    <div className="min-w-0">
      <h3 className="truncate text-sm font-black text-white">{product.title}</h3>
      <p className="mt-1 text-xs font-bold text-zinc-500">{product.category || 'General'}</p>
      <p className="mt-2 text-xs font-black text-zinc-300">Stock {product.stock || 0}</p>
    </div>
  </article>
);

const AdminMetric = ({ icon: Icon, label, value }) => (
  <div className="border-b border-white/10 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
    <div className="flex items-center gap-4">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#c8c3ff]"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8f8aa3]">{label}</p>
        <p className="mt-1 text-2xl font-black text-white">{value}</p>
      </div>
    </div>
  </div>
);

const AdminNav = ({ active, icon: Icon, label, onClick }) => (
  <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${active ? 'bg-white text-[#10131f]' : 'text-[#aaa6ba] hover:bg-white/[0.06] hover:text-white'}`}>
    <Icon className="h-5 w-5" />
    {label}
  </button>
);

const FlowRow = ({ text }) => (
  <div className="flex items-center gap-2">
    <CalendarClock className="h-4 w-4 text-[#aaa5ff]" />
    <span>{text}</span>
  </div>
);

const PanelTitle = ({ eyebrow, title, text, actionLabel, onAction }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#aaa5ff]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-zinc-400">{text}</p>
    </div>
    {actionLabel && <button type="button" onClick={onAction} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-black"><Plus className="h-4 w-4" />{actionLabel}</button>}
  </div>
);

const SchedulePicker = ({ label, value, onChange, tone }) => {
  const setRelative = (minutesFromNow) => {
    const next = new Date(Date.now() + minutesFromNow * 60 * 1000);
    onChange(toDateTimeLocal(next));
  };

  return (
    <div className={`rounded-3xl border p-4 ${tone === 'start' ? 'border-emerald-400/25 bg-emerald-400/5' : 'border-amber-400/25 bg-amber-400/5'}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tone === 'start' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'}`}>
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-zinc-500">{label}</p>
            <p className="mt-1 text-sm font-black text-white">{formatScheduleLabel(value)}</p>
          </div>
        </div>
        {value && (
          <button type="button" onClick={() => onChange('')} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-black text-zinc-300 hover:bg-white/5">
            Clear
          </button>
        )}
      </div>

      <input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-white/10 bg-[#111216] px-4 text-sm font-bold text-zinc-100 outline-none focus:border-[#8b85ff]"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setRelative(0)} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-black">
          Now
        </button>
        <button type="button" onClick={() => setRelative(60)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-black text-zinc-300 hover:bg-white/5">
          +1 hour
        </button>
        <button type="button" onClick={() => setRelative(24 * 60)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-black text-zinc-300 hover:bg-white/5">
          Tomorrow
        </button>
        <button type="button" onClick={() => setRelative(7 * 24 * 60)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-black text-zinc-300 hover:bg-white/5">
          +7 days
        </button>
      </div>
    </div>
  );
};

const toDateTimeLocal = (date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const formatScheduleLabel = (value) => {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const AdminInput = ({ label, value, onChange, placeholder = '', type = 'text' }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-zinc-500">{label}</span>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-12 w-full rounded-2xl border border-white/10 bg-[#111216] px-4 text-sm font-bold text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#8b85ff]" />
  </label>
);

const AdminSelect = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-zinc-500">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-2xl border border-white/10 bg-[#111216] px-4 text-sm font-bold text-zinc-100 outline-none focus:border-[#8b85ff]">
      {options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}
    </select>
  </label>
);

const StatusBadge = ({ active }) => (
  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${active ? 'bg-emerald-400/10 text-emerald-200' : 'bg-zinc-500/10 text-zinc-400'}`}>
    {active ? 'Active' : 'Inactive'}
  </span>
);

const EmptyState = ({ title, text }) => (
  <div className="rounded-3xl border border-dashed border-white/15 bg-[#111216] p-8 text-center">
    <Boxes className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
    <p className="text-lg font-black text-white">{title}</p>
    <p className="mt-1 text-sm font-semibold text-zinc-500">{text}</p>
  </div>
);
