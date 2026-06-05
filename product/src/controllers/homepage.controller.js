const mongoose = require('mongoose');
const HomepageSection = require('../models/homepageSection.model');

const productSelect = 'title description price category brand images stock rating metrics status';

const toDateOrNull = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeProducts = (products = []) => products
    .filter(Boolean)
    .map((product) => ({
        _id: product._id,
        id: product._id,
        title: product.title,
        description: product.description,
        price: product.price,
        category: product.category,
        brand: product.brand,
        images: product.images,
        stock: product.stock,
        rating: product.rating,
        metrics: product.metrics,
        status: product.status,
    }));

const serializeSection = (section) => {
    const data = section.toObject ? section.toObject() : section;
    return {
        ...data,
        id: data._id,
        products: normalizeProducts(data.products),
    };
};

const buildPayload = (body = {}, user = {}) => {
    const theme = body.theme && typeof body.theme === 'object' ? body.theme : {};
    const products = Array.isArray(body.products)
        ? body.products.filter((id) => mongoose.Types.ObjectId.isValid(id))
        : [];

    return {
        type: body.type,
        placement: body.placement || 'after_categories',
        title: body.title,
        subtitle: body.subtitle || '',
        tag: body.tag || body.title || '',
        headline: body.headline || body.title || '',
        strip: body.strip || body.subtitle || '',
        badgeTop: body.badgeTop || 'AI',
        badgeMid: body.badgeMid || 'Deals',
        badgeBottom: body.badgeBottom || 'Sale',
        actionLabel: body.actionLabel || 'Shop now',
        query: body.query || '',
        link: body.link || '',
        mediaUrl: body.mediaUrl || '',
        mediaAlt: body.mediaAlt || '',
        products,
        theme,
        position: Number(body.position || 0),
        isActive: body.isActive !== false,
        startAt: toDateOrNull(body.startAt),
        endAt: toDateOrNull(body.endAt),
        createdBy: user?.id && mongoose.Types.ObjectId.isValid(user.id) ? user.id : null,
    };
};

const homepageTypes = [
    'banner',
    'split_banner',
    'coupon_banner',
    'mini_banner',
    'gif_banner',
    'product_row',
    'product_grid',
    'featured_split',
    'compact_deals',
    'category_tiles',
    'mosaic_grid',
    'editorial_stack',
    'brand_marquee',
];

const validatePayload = (payload) => {
    if (!homepageTypes.includes(payload.type)) {
        return 'Section type must be a supported homepage layout';
    }
    if (!payload.title || payload.title.trim().length < 3) {
        return 'Section title must be at least 3 characters';
    }
    if (payload.endAt && payload.startAt && payload.endAt < payload.startAt) {
        return 'End date cannot be before start date';
    }
    return '';
};

exports.getPublicHomepage = async (req, res) => {
    try {
        const now = new Date();
        const sections = await HomepageSection.find({
            isActive: true,
            $and: [
                { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
                { $or: [{ endAt: null }, { endAt: { $gte: now } }] },
            ],
        })
            .sort({ placement: 1, position: 1, createdAt: -1 })
            .populate({ path: 'products', select: productSelect, match: { status: { $ne: 'archived' } } });

        res.status(200).json({
            success: true,
            data: sections.map(serializeSection),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to load homepage sections' });
    }
};

exports.getAdminHomepageSections = async (req, res) => {
    try {
        const sections = await HomepageSection.find({})
            .sort({ placement: 1, position: 1, createdAt: -1 })
            .populate({ path: 'products', select: productSelect });

        res.status(200).json({
            success: true,
            data: sections.map(serializeSection),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to load admin homepage sections' });
    }
};

exports.createHomepageSection = async (req, res) => {
    try {
        const payload = buildPayload(req.body, req.user);
        const message = validatePayload(payload);
        if (message) return res.status(400).json({ success: false, message });

        const section = await HomepageSection.create(payload);
        await section.populate({ path: 'products', select: productSelect });

        res.status(201).json({
            success: true,
            message: 'Homepage section created',
            data: serializeSection(section),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to create homepage section' });
    }
};

exports.updateHomepageSection = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid section id' });
        }

        const payload = buildPayload(req.body, req.user);
        const message = validatePayload(payload);
        if (message) return res.status(400).json({ success: false, message });
        delete payload.createdBy;

        const section = await HomepageSection.findByIdAndUpdate(req.params.id, payload, {
            new: true,
            runValidators: true,
        }).populate({ path: 'products', select: productSelect });

        if (!section) {
            return res.status(404).json({ success: false, message: 'Homepage section not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Homepage section updated',
            data: serializeSection(section),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update homepage section' });
    }
};

exports.deleteHomepageSection = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid section id' });
        }

        const section = await HomepageSection.findByIdAndDelete(req.params.id);
        if (!section) {
            return res.status(404).json({ success: false, message: 'Homepage section not found' });
        }

        res.status(200).json({ success: true, message: 'Homepage section deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to delete homepage section' });
    }
};
