const mongoose = require('mongoose');
require('./product.model');

const themeSchema = new mongoose.Schema({
    bg: { type: String, default: '#d73a20' },
    shapeStyle: { type: String, default: 'circles' },
    shapeA: { type: String, default: '#f97316' },
    shapeB: { type: String, default: '#f59e0b' },
    stripBg: { type: String, default: '#facc15' },
    text: { type: String, default: '#ffe500' },
    badgeTopBg: { type: String, default: '#c92c13' },
    badgeMidBg: { type: String, default: '#facc15' },
    frame: { type: String, default: 'bg-[#047857]' },
    stripe: { type: String, default: 'bg-[#29aa78]' },
}, { _id: false });

const homepageSectionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: [
            'banner',
            'split_banner',
            'coupon_banner',
            'mini_banner',
            'product_row',
            'product_grid',
            'featured_split',
            'compact_deals',
            'category_tiles',
            'mosaic_grid',
            'editorial_stack',
            'brand_marquee',
        ],
        required: true,
        index: true,
    },
    placement: {
        type: String,
        enum: ['after_categories', 'after_stats', 'before_catalog'],
        default: 'after_categories',
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    subtitle: {
        type: String,
        default: '',
        trim: true,
    },
    tag: {
        type: String,
        default: '',
        trim: true,
    },
    headline: {
        type: String,
        default: '',
        trim: true,
    },
    strip: {
        type: String,
        default: '',
        trim: true,
    },
    badgeTop: {
        type: String,
        default: 'AI',
        trim: true,
    },
    badgeMid: {
        type: String,
        default: 'Deals',
        trim: true,
    },
    badgeBottom: {
        type: String,
        default: 'Sale',
        trim: true,
    },
    actionLabel: {
        type: String,
        default: 'Shop now',
        trim: true,
    },
    query: {
        type: String,
        default: '',
        trim: true,
    },
    link: {
        type: String,
        default: '',
        trim: true,
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    }],
    theme: {
        type: themeSchema,
        default: () => ({}),
    },
    position: {
        type: Number,
        default: 0,
        index: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    startAt: {
        type: Date,
        default: null,
        index: true,
    },
    endAt: {
        type: Date,
        default: null,
        index: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
}, {
    timestamps: true,
});

homepageSectionSchema.index({ isActive: 1, placement: 1, position: 1 });
homepageSectionSchema.index({ startAt: 1, endAt: 1 });

module.exports = mongoose.model('HomepageSection', homepageSectionSchema);
