const mongoose = require("mongoose");

const dashboardEventSchema = new mongoose.Schema({
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    type: {
        type: String,
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        default: "",
    },
    order: mongoose.Schema.Types.ObjectId,
    payment: mongoose.Schema.Types.ObjectId,
    product: mongoose.Schema.Types.ObjectId,
    severity: {
        type: String,
        enum: ["info", "success", "warning", "danger"],
        default: "info",
    },
    read: {
        type: Boolean,
        default: false,
        index: true,
    },
    readAt: Date,
    payload: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

dashboardEventSchema.index({ seller: 1, createdAt: -1 });
dashboardEventSchema.index({ seller: 1, read: 1, createdAt: -1 });

const DashboardEvent = mongoose.models.DashboardEvent || mongoose.model("DashboardEvent", dashboardEventSchema);

module.exports = DashboardEvent;
