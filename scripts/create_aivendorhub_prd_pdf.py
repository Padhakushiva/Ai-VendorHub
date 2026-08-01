from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    ListFlowable,
    ListItem,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Ai-VendorHub_PRD.pdf"

PAGE_W, PAGE_H = A4
MARGIN_X = 21 * mm
MARGIN_TOP = 21 * mm
MARGIN_BOTTOM = 20 * mm
CONTENT_W = PAGE_W - (2 * MARGIN_X)

NAVY = colors.HexColor("#1e293b")
BLUE = colors.HexColor("#1e40af")
BRIGHT_BLUE = colors.HexColor("#3b82f6")
MUTED = colors.HexColor("#6b7280")
LIGHT_BLUE = colors.HexColor("#dbeafe")
ROW_GRAY = colors.HexColor("#f3f4f6")
LIGHT_RULE = colors.HexColor("#d1d5db")
GREEN = colors.HexColor("#16a34a")
AMBER = colors.HexColor("#ca8a04")
RED = colors.HexColor("#dc2626")
INK = colors.HexColor("#111827")


def build_styles():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(
        "CoverKicker",
        parent=base["BodyText"],
        fontName="Courier",
        fontSize=13,
        leading=16,
        alignment=TA_CENTER,
        textColor=BRIGHT_BLUE,
        spaceAfter=16,
    ))
    base.add(ParagraphStyle(
        "CoverTitle",
        parent=base["Title"],
        fontName="Times-Bold",
        fontSize=30,
        leading=35,
        alignment=TA_CENTER,
        textColor=colors.white,
        spaceAfter=8,
    ))
    base.add(ParagraphStyle(
        "CoverSubtitle",
        parent=base["BodyText"],
        fontName="Times-Roman",
        fontSize=15,
        leading=18,
        alignment=TA_CENTER,
        textColor=MUTED,
        spaceAfter=22,
    ))
    base.add(ParagraphStyle(
        "CoverMetaLabel",
        parent=base["BodyText"],
        fontName="Times-Roman",
        fontSize=12,
        leading=16,
        textColor=MUTED,
        alignment=TA_RIGHT,
    ))
    base.add(ParagraphStyle(
        "CoverMetaValue",
        parent=base["BodyText"],
        fontName="Times-Roman",
        fontSize=12,
        leading=16,
        textColor=colors.white,
    ))
    base.add(ParagraphStyle(
        "CoverMetaCode",
        parent=base["BodyText"],
        fontName="Courier",
        fontSize=11,
        leading=15,
        textColor=BRIGHT_BLUE,
    ))
    base.add(ParagraphStyle(
        "CoverMetaStatus",
        parent=base["BodyText"],
        fontName="Times-Bold",
        fontSize=12,
        leading=16,
        textColor=GREEN,
    ))
    base.add(ParagraphStyle(
        "Header",
        parent=base["BodyText"],
        fontName="Times-Roman",
        fontSize=10.8,
        leading=13,
        textColor=MUTED,
    ))
    base.add(ParagraphStyle(
        "Section",
        parent=base["Heading1"],
        fontName="Times-Bold",
        fontSize=18.5,
        leading=23,
        textColor=BLUE,
        spaceBefore=12,
        spaceAfter=8,
    ))
    base.add(ParagraphStyle(
        "Subsection",
        parent=base["Heading2"],
        fontName="Times-Bold",
        fontSize=13,
        leading=16,
        textColor=BLUE,
        spaceBefore=9,
        spaceAfter=5,
    ))
    base.add(ParagraphStyle(
        "Body",
        parent=base["BodyText"],
        fontName="Times-Roman",
        fontSize=11.4,
        leading=15.2,
        textColor=INK,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    ))
    base.add(ParagraphStyle(
        "BodyBold",
        parent=base["BodyText"],
        fontName="Times-Bold",
        fontSize=11.4,
        leading=15.2,
        textColor=INK,
    ))
    base.add(ParagraphStyle(
        "Cell",
        parent=base["BodyText"],
        fontName="Times-Roman",
        fontSize=9.6,
        leading=12,
        textColor=INK,
    ))
    base.add(ParagraphStyle(
        "CellBold",
        parent=base["BodyText"],
        fontName="Times-Bold",
        fontSize=9.7,
        leading=12,
        textColor=INK,
    ))
    base.add(ParagraphStyle(
        "CellBlue",
        parent=base["BodyText"],
        fontName="Times-Bold",
        fontSize=9.8,
        leading=12,
        textColor=BLUE,
    ))
    base.add(ParagraphStyle(
        "TOC",
        parent=base["BodyText"],
        fontName="Times-Roman",
        fontSize=11,
        leading=15,
        textColor=INK,
    ))
    base.add(ParagraphStyle(
        "Small",
        parent=base["BodyText"],
        fontName="Times-Roman",
        fontSize=9.1,
        leading=11.2,
        textColor=MUTED,
    ))
    base.add(ParagraphStyle(
        "DiagramText",
        parent=base["BodyText"],
        fontName="Times-Bold",
        fontSize=8.4,
        leading=9.6,
        textColor=INK,
        alignment=TA_CENTER,
    ))
    return base


S = build_styles()


def p(text, style="Body"):
    return Paragraph(text, S[style])


def h(num, title):
    return [p(f"{num}.  {title}", "Section"), rule()]


def sh(num, title):
    return p(f"{num}  {title}", "Subsection")


def rule(width=CONTENT_W, color=LIGHT_RULE, thickness=0.45):
    t = Table([[""]], colWidths=[width], rowHeights=[1])
    t.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (-1, -1), thickness, color),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def bullets(items, numbered=False):
    kwargs = {
        "bulletType": "1" if numbered else "bullet",
        "leftIndent": 15,
        "bulletFontName": "Times-Roman",
        "bulletFontSize": 10,
        "bulletColor": INK,
    }
    if numbered:
        kwargs["start"] = "1"
    return ListFlowable(
        [ListItem(p(item, "Body"), leftIndent=10) for item in items],
        **kwargs,
    )


def callout(label, text):
    body = Paragraph(f"<b>{label}:</b> {text}", S["Body"])
    t = Table([["", body]], colWidths=[3 * mm, CONTENT_W - 3 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BLUE),
        ("BACKGROUND", (0, 0), (0, 0), BRIGHT_BLUE),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("RIGHTPADDING", (0, 0), (0, 0), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (1, 0), (1, 0), 10),
        ("RIGHTPADDING", (1, 0), (1, 0), 10),
    ]))
    return t


def prd_table(rows, widths, header=True, shaded=True):
    converted = []
    for r, row in enumerate(rows):
        style = "CellBold" if header and r == 0 else "Cell"
        converted.append([cell if hasattr(cell, "wrapOn") else p(str(cell), style) for cell in row])
    t = Table(converted, colWidths=widths, hAlign="LEFT", repeatRows=1 if header else 0)
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEABOVE", (0, 0), (-1, 0), 0.9, colors.black),
        ("LINEBELOW", (0, 0), (-1, 0), 0.45, colors.black),
        ("LINEBELOW", (0, -1), (-1, -1), 0.9, colors.black),
    ]
    if shaded:
        commands.append(("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, ROW_GRAY]))
    if header:
        commands.append(("BACKGROUND", (0, 0), (-1, 0), ROW_GRAY))
    t.setStyle(TableStyle(commands))
    return t


def metadata_table():
    rows = [
        [p("Field", "CellBlue"), p("Detail", "Cell")],
        [p("Product Name", "CellBlue"), "Ai-VendorHub"],
        [p("Repository", "CellBlue"), "Ai-VendorHub-master"],
        [p("Owner / Team", "CellBlue"), "Shiva Choudhry"],
        [p("Date", "CellBlue"), str(date.today())],
        [p("Version", "CellBlue"), "1.0"],
        [p("Primary Stack", "CellBlue"), "Node.js, Express.js, React, MongoDB, RabbitMQ, Redis, Socket.IO"],
        [p("AI Stack", "CellBlue"), "Google Gemini / LangChain, semantic ranking, persistent AI memory"],
        [p("Status", "CellBlue"), "Active Development"],
    ]
    return prd_table(rows, [42 * mm, CONTENT_W - 42 * mm])


class DataFlowDiagram(Flowable):
    def __init__(self, title, boxes, arrows, height=78 * mm):
        super().__init__()
        self.title = title
        self.boxes = boxes
        self.arrows = arrows
        self.width = CONTENT_W
        self.height = height

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFont("Times-Bold", 12)
        c.setFillColor(BLUE)
        c.drawString(0, self.height - 9, self.title)
        c.setStrokeColor(LIGHT_RULE)
        c.line(0, self.height - 14, self.width, self.height - 14)

        def box_center(name):
            for item in self.boxes:
                if item["id"] == name:
                    return item["x"] + item["w"] / 2, item["y"] + item["h"] / 2
            return 0, 0

        for arrow in self.arrows:
            x1, y1 = box_center(arrow[0])
            x2, y2 = box_center(arrow[1])
            c.setStrokeColor(MUTED)
            c.setLineWidth(0.8)
            c.line(x1, y1, x2, y2)
            angle_right = x2 >= x1
            head = 4
            if abs(x2 - x1) >= abs(y2 - y1):
                sign = 1 if angle_right else -1
                c.line(x2, y2, x2 - sign * head, y2 + head / 2)
                c.line(x2, y2, x2 - sign * head, y2 - head / 2)
            else:
                sign = 1 if y2 >= y1 else -1
                c.line(x2, y2, x2 - head / 2, y2 - sign * head)
                c.line(x2, y2, x2 + head / 2, y2 - sign * head)

        for item in self.boxes:
            fill = item.get("fill", colors.white)
            stroke = item.get("stroke", BLUE)
            c.setFillColor(fill)
            c.setStrokeColor(stroke)
            c.setLineWidth(0.9)
            c.roundRect(item["x"], item["y"], item["w"], item["h"], 4, stroke=1, fill=1)
            c.setFillColor(item.get("text_color", INK))
            c.setFont("Times-Bold", 8.5)
            lines = item["label"].split("\n")
            y = item["y"] + item["h"] / 2 + (len(lines) - 1) * 5
            for line in lines:
                c.drawCentredString(item["x"] + item["w"] / 2, y, line)
                y -= 10

        c.restoreState()


def cover_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    center_x = PAGE_W / 2
    canvas.setFillColor(BRIGHT_BLUE)
    canvas.setFont("Courier", 13)
    canvas.drawCentredString(center_x, 650, "PRODUCT REQUIREMENTS DOCUMENT")

    canvas.setFont("Times-Bold", 30)
    title_left = "Ai-Vendor"
    title_right = "Hub"
    left_width = canvas.stringWidth(title_left, "Times-Bold", 30)
    right_width = canvas.stringWidth(title_right, "Times-Bold", 30)
    start_x = center_x - (left_width + right_width) / 2
    canvas.setFillColor(colors.white)
    canvas.drawString(start_x, 608, title_left)
    canvas.setFillColor(BRIGHT_BLUE)
    canvas.drawString(start_x + left_width, 608, title_right)

    canvas.setFillColor(MUTED)
    canvas.setFont("Times-Roman", 15)
    canvas.drawCentredString(center_x, 579, "AI-Powered Multi-Vendor Marketplace Platform")

    canvas.setStrokeColor(BRIGHT_BLUE)
    canvas.setLineWidth(1.1)
    canvas.line(center_x - 105 * mm / 2, 535, center_x + 105 * mm / 2, 535)

    rows = [
        ("Version", "1.0", colors.white, "Times-Roman"),
        ("Date", str(date.today()), colors.white, "Times-Roman"),
        ("Owner", "Shiva Choudhry", colors.white, "Times-Roman"),
        ("Repo", "Ai-VendorHub-master", BRIGHT_BLUE, "Courier"),
        ("Status", "Active Development", GREEN, "Times-Bold"),
    ]
    label_x = center_x - 28
    value_x = center_x - 18
    y = 490
    for label, value, value_color, font_name in rows:
        canvas.setFillColor(MUTED)
        canvas.setFont("Times-Roman", 12)
        canvas.drawRightString(label_x, y, label)
        canvas.setFillColor(value_color)
        canvas.setFont(font_name, 12)
        canvas.drawString(value_x, y, value)
        y -= 22

    canvas.setFillColor(MUTED)
    canvas.setFont("Times-Roman", 12)
    canvas.drawCentredString(center_x, 55, "Confidential - Internal Use Only")
    canvas.restoreState()


def content_page(canvas, doc):
    canvas.saveState()
    canvas.setFont("Times-Roman", 10.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN_X, PAGE_H - 15 * mm, "Ai-VendorHub - Product Requirements Document")
    canvas.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 15 * mm, "v1.0 - 2026")
    canvas.setStrokeColor(LIGHT_RULE)
    canvas.setLineWidth(0.35)
    canvas.line(MARGIN_X, PAGE_H - 18 * mm, PAGE_W - MARGIN_X, PAGE_H - 18 * mm)
    canvas.drawCentredString(PAGE_W / 2, 11 * mm, str(doc.page - 1))
    canvas.restoreState()


def cover_story():
    return [
        NextPageTemplate("content"),
        PageBreak(),
    ]


def contents():
    items = [
        "1 Product Overview",
        "2 Objectives and Goals",
        "3 Target Users",
        "4 Actual Problem Statement",
        "5 Proposed Solution",
        "6 Features",
        "7 User Flow",
        "8 Data Flow Diagrams",
        "9 Functional Requirements",
        "10 Non-Functional Requirements",
        "11 Tech Stack",
        "12 AI Intelligence Layer",
        "13 Risk Assessment",
    ]
    story = [p("Contents", "Section"), rule()]
    for item in items:
        story.append(p(item, "TOC"))
    story.append(PageBreak())
    return story


def overview():
    return [
        *h("1", "Product Overview"),
        callout("One-liner", "Ai-VendorHub is an AI-powered, microservices-based e-commerce marketplace where customers can discover products, sellers can manage inventory and analytics, and admins can operate marketplace content, notifications, and platform workflows."),
        Spacer(1, 8),
        metadata_table(),
        Spacer(1, 12),
        sh("Description", ""),
        p("Ai-VendorHub is a full-stack marketplace platform built around independent backend services for authentication, products, cart, orders, payments, notifications, seller dashboard, and AI. It combines standard e-commerce flows with real-time operational events, seller analytics, and an AI shopping assistant that can search, recommend, compare, explain, and act on products."),
    ]


def objectives():
    return [
        *h("2", "Objectives and Goals"),
        bullets([
            "<b>Enable Marketplace Commerce</b> - Support customer discovery, cart, checkout, payments, order tracking, and notification workflows.",
            "<b>Empower Sellers</b> - Provide product management, order visibility, inventory analytics, low-stock alerts, and product health insights.",
            "<b>Add AI-Assisted Shopping</b> - Help users search naturally, compare options, build bundles, understand product fit, and take cart or wishlist actions.",
            "<b>Use Scalable Service Boundaries</b> - Keep auth, product, cart, order, payment, notification, seller dashboard, and AI concerns isolated.",
            "<b>Support Operational Visibility</b> - Use events, feeds, metrics, and notifications to make marketplace activity observable.",
            "<b>Remain Demo-Friendly</b> - Keep services understandable, independently runnable, and suitable for interview or academic explanation.",
        ], numbered=True),
    ]


def target_users():
    return [
        *h("3", "Target Users"),
        prd_table([
            ["User Persona", "Type", "Description"],
            ["Customer / Buyer", "Primary", "Browses products, uses AI recommendations, manages cart, places orders, pays, tracks status, and receives notifications."],
            ["Seller", "Primary", "Creates and updates products, manages stock, views seller orders, tracks analytics, and handles low-stock alerts."],
            ["Admin", "Primary", "Manages homepage sections, platform notifications, order operations, and broader product oversight."],
            ["Marketplace Operator", "Secondary", "Monitors service health, AI metrics, feature flags, and event-driven workflows."],
            ["Interview / Demo Evaluator", "Secondary", "Reviews architecture, service boundaries, data flow, and real-world engineering choices."],
        ], [45 * mm, 27 * mm, CONTENT_W - 72 * mm]),
    ]


def problem_solution():
    return [
        *h("4", "Actual Problem Statement"),
        callout("Core Problem", "Most student marketplace projects stop at CRUD. They do not show realistic service separation, cart/order/payment consistency, seller operations, event-driven updates, or useful AI beyond a weak chatbot."),
        Spacer(1, 8),
        p("Existing simple e-commerce projects usually miss these production-style concerns:"),
        bullets([
            "<b>No real service boundaries</b> - auth, catalog, cart, orders, and payments often live in one monolith.",
            "<b>Weak seller workflow</b> - sellers can list products, but do not get analytics, inventory risk, or live order context.",
            "<b>Limited AI usefulness</b> - chatbots often answer generic questions without product grounding, personalization, or actions.",
            "<b>Low operational visibility</b> - no notifications, event feeds, metrics, or workflow status clarity.",
        ]),
        *h("5", "Proposed Solution"),
        p("Ai-VendorHub addresses these gaps using a layered marketplace architecture:"),
        bullets([
            "<b>Layer 1 - Identity and Security</b>: JWT-based authentication, role-based access, profile management, address book, Google OAuth support, password reset, and email verification.",
            "<b>Layer 2 - Marketplace Core</b>: product catalog, wishlist, recently viewed products, cart validation, order lifecycle, payment creation/verification, and notifications.",
            "<b>Layer 3 - Seller and Admin Operations</b>: seller metrics, conversion funnel, inventory movement, inventory risk, forecasting, low-stock alerts, homepage content management, and notification controls.",
            "<b>Layer 4 - AI Intelligence</b>: natural-language search, semantic ranking, persistent memory, personalized recommendations, product comparison, smart budget bundles, mood shopping, seller listing generation, and cart/wishlist actions.",
        ]),
        callout("Why this works", "The project demonstrates both product thinking and backend engineering: user-facing commerce, seller operations, AI-assisted discovery, and microservice communication all exist as separate explainable modules."),
    ]


def features():
    return [
        *h("6", "Features"),
        sh("6.1", "F1 - Secure Authentication"),
        bullets(["User, seller, and admin login flows", "JWT authorization middleware", "Profile and address management", "Email verification, password reset, refresh token, logout, and logout-all flows", "Google OAuth callback support when configured"]),
        sh("6.2", "F2 - Product Discovery and Catalog"),
        bullets(["Product CRUD for seller/admin roles", "Image upload support", "Pagination, filtering, text search, category, brand, price, and rating filters", "Trending products, product comparison, related products, variants, recently viewed history, and wishlist"]),
        sh("6.3", "F3 - Cart, Order, and Payment Workflow"),
        bullets(["Stock-aware add/update/remove cart operations", "Cart validation, cart status, save-for-later, and abandoned-cart scan", "Order creation from cart, order history, cancellation, address updates, expiry scan, and status updates", "Razorpay payment creation/verification and local test-success payment route"]),
        sh("6.4", "F4 - Notifications and Events"),
        bullets(["User/seller/admin notification inbox", "Unread counts, read-all, single-read, delete, admin create, email retry", "RabbitMQ-style event modules for product, cart, order, payment, notification, and dashboard workflows"]),
        sh("6.5", "F5 - Seller Dashboard"),
        bullets(["Seller metrics", "Seller order and product views", "Live order feed", "Conversion funnel", "Product health", "Inventory movement", "Top-losing products", "Inventory risk and forecast", "Low-stock alert read/resolve actions"]),
        sh("6.6", "F6 - AI Shopping and Seller Assistant"),
        bullets(["Conversational shopping assistant", "Search intent parser", "Product page AI insights", "Similar products", "Product comparison", "Smart budget bundles", "Mood shopping", "Review summaries", "Description/category/tag generation", "Persistent memory, semantic ranking, personalization, and cart/wishlist actions"]),
    ]


def user_flow():
    return [
        *h("7", "User Flow"),
        sh("7.1", "Primary Flow - Customer Purchase Journey"),
        bullets([
            "Customer registers or logs in and receives a JWT.",
            "Customer browses products using filters, search, wishlist, recently viewed, or AI chat.",
            "AI interprets intent, semantically ranks products, and shows personalized product cards.",
            "Customer adds items to cart manually or asks AI to add the selected product.",
            "Cart service validates stock and recalculates totals.",
            "Customer creates an order from the cart with shipping address.",
            "Order service publishes lifecycle events and clears the cart.",
            "Payment service creates/verifies Razorpay payment or test success payment.",
            "Notification and seller dashboard services surface order/payment/inventory events.",
        ], numbered=True),
        sh("7.2", "Secondary Flow - Seller Product and Inventory Journey"),
        bullets([
            "Seller registers/logs in with seller role.",
            "Seller creates products with title, description, category, price, stock, tags, variants, and images.",
            "AI helps generate descriptions, tags, categories, and seller-facing product improvements.",
            "Seller dashboard tracks product health, orders, live feed, stock risk, forecasts, and low-stock alerts.",
            "Seller updates inventory or resolves low-stock alerts based on dashboard signals.",
        ], numbered=True),
    ]


def diagrams():
    checkout_boxes = [
        {"id": "client", "label": "React\nClient", "x": 0, "y": 122, "w": 60, "h": 28, "fill": LIGHT_BLUE},
        {"id": "auth", "label": "Auth\nService", "x": 95, "y": 122, "w": 60, "h": 28},
        {"id": "product", "label": "Product\nService", "x": 190, "y": 122, "w": 65, "h": 28},
        {"id": "cart", "label": "Cart\nService", "x": 95, "y": 70, "w": 60, "h": 28},
        {"id": "order", "label": "Order\nService", "x": 190, "y": 70, "w": 65, "h": 28},
        {"id": "payment", "label": "Payment\nService", "x": 300, "y": 70, "w": 70, "h": 28},
        {"id": "events", "label": "RabbitMQ\nEvents", "x": 95, "y": 18, "w": 70, "h": 28, "fill": ROW_GRAY},
        {"id": "notify", "label": "Notification\nService", "x": 205, "y": 18, "w": 75, "h": 28},
        {"id": "seller", "label": "Seller\nDashboard", "x": 320, "y": 18, "w": 75, "h": 28},
    ]
    checkout_arrows = [
        ("client", "auth"), ("client", "product"), ("client", "cart"), ("cart", "product"),
        ("cart", "order"), ("order", "payment"), ("order", "events"), ("payment", "events"),
        ("events", "notify"), ("events", "seller"),
    ]

    ai_boxes = [
        {"id": "chat", "label": "User\nPrompt", "x": 0, "y": 122, "w": 58, "h": 28, "fill": LIGHT_BLUE},
        {"id": "guard", "label": "Scope +\nIntent", "x": 86, "y": 122, "w": 62, "h": 28},
        {"id": "memory", "label": "AI Memory\nMongoDB", "x": 178, "y": 122, "w": 70, "h": 28, "fill": ROW_GRAY},
        {"id": "signals", "label": "Cart/Wishlist\nOrders/Views", "x": 282, "y": 122, "w": 82, "h": 28},
        {"id": "candidates", "label": "Product\nCandidates", "x": 58, "y": 66, "w": 70, "h": 28},
        {"id": "embed", "label": "Semantic\nEmbeddings", "x": 166, "y": 66, "w": 72, "h": 28},
        {"id": "rank", "label": "Personalized\nRanking", "x": 276, "y": 66, "w": 78, "h": 28, "fill": LIGHT_BLUE},
        {"id": "action", "label": "Cart/Wishlist\nAction", "x": 92, "y": 14, "w": 78, "h": 28},
        {"id": "reply", "label": "AI Reply +\nProduct Cards", "x": 232, "y": 14, "w": 86, "h": 28, "fill": LIGHT_BLUE},
    ]
    ai_arrows = [
        ("chat", "guard"), ("guard", "memory"), ("memory", "signals"),
        ("guard", "candidates"), ("candidates", "embed"), ("embed", "rank"),
        ("signals", "rank"), ("rank", "reply"), ("rank", "action"), ("action", "reply"),
        ("reply", "memory"),
    ]

    return [
        *h("8", "Data Flow Diagrams"),
        p("The following diagrams summarize the two most important flows: checkout/service orchestration and AI personalization/action execution."),
        DataFlowDiagram("Diagram 1 - Customer Checkout and Event Data Flow", checkout_boxes, checkout_arrows),
        Spacer(1, 10),
        DataFlowDiagram("Diagram 2 - AI Semantic Search, Memory, and Action Data Flow", ai_boxes, ai_arrows),
        PageBreak(),
    ]


def requirements():
    return [
        *h("9", "Functional Requirements"),
        prd_table([
            ["ID", "Feature", "Requirement", "Priority"],
            ["FR-01", "Authentication", "System shall support user, seller, and admin registration/login with JWT authorization.", "High"],
            ["FR-02", "Profile", "System shall allow authenticated users to manage profile and addresses.", "High"],
            ["FR-03", "Catalog", "System shall allow sellers/admins to create, update, archive/delete, and list products.", "High"],
            ["FR-04", "Discovery", "System shall support search, filters, trending, related products, wishlist, and recently viewed products.", "High"],
            ["FR-05", "Cart", "System shall validate stock and pricing when cart items are added or updated.", "High"],
            ["FR-06", "Order", "System shall create orders from cart items and support order status, cancellation, and address update flows.", "High"],
            ["FR-07", "Payment", "System shall create/verify payments and expose local test success flow.", "High"],
            ["FR-08", "Notifications", "System shall provide notification inbox, unread counts, read/delete actions, admin create, and retry email delivery.", "Medium"],
            ["FR-09", "Seller Dashboard", "System shall show seller metrics, orders, products, inventory analytics, feed, and low-stock alerts.", "High"],
            ["FR-10", "AI Search", "AI shall parse natural language queries and return real ranked products from the catalog.", "High"],
            ["FR-11", "AI Actions", "AI chat shall support add-to-cart, wishlist, save-for-later, and remove-from-cart intents.", "Medium"],
            ["FR-12", "AI Memory", "AI shall persist conversation and user preference memory when MongoDB is configured.", "Medium"],
        ], [18 * mm, 34 * mm, CONTENT_W - 77 * mm, 25 * mm]),
        *h("10", "Non-Functional Requirements"),
        sh("10.1", "Performance"),
        bullets(["Product and cart APIs should return within a few hundred milliseconds in local demo conditions.", "AI endpoints should degrade gracefully with fallback ranking when LLM calls fail.", "Cart/order/payment flows should avoid blocking unrelated services where possible."]),
        sh("10.2", "Security"),
        bullets(["JWT must protect private customer, seller, admin, cart, order, notification, and AI routes.", "Sensitive secrets must live in environment variables.", "Role checks must restrict seller/admin operations."]),
        sh("10.3", "Reliability"),
        bullets(["Order creation should validate cart and product availability before final order creation.", "Payment verification should update payment state only after validation.", "Event publishing should not crash primary user flows if RabbitMQ is unavailable."]),
        sh("10.4", "Maintainability"),
        bullets(["Each service should own its route, controller, model, and middleware layers.", "Shared behavior should be isolated behind services/helpers rather than duplicated ad hoc.", "AI memory, ranking, and action services should remain independently testable."]),
    ]


def stack_and_ai():
    return [
        *h("11", "Tech Stack"),
        prd_table([
            ["Layer", "Technology", "Purpose"],
            ["Frontend", "React + Vite", "Marketplace UI, auth pages, product browsing, cart, checkout, admin and AI components."],
            ["Styling", "Tailwind CSS", "Responsive utility-first UI."],
            ["Backend Runtime", "Node.js", "JavaScript service runtime."],
            ["Backend Framework", "Express.js", "REST routing and middleware."],
            ["Database", "MongoDB / Mongoose", "Users, products, cart, orders, payments, notifications, dashboard data, AI memory."],
            ["Cache", "Redis", "Auth/cache support and service-side acceleration where configured."],
            ["Messaging", "RabbitMQ", "Product, cart, order, payment, notification, and dashboard event flows."],
            ["Realtime", "Socket.IO", "Dashboard/live event features."],
            ["Payment", "Razorpay", "Payment order creation and verification."],
            ["AI", "Gemini / LangChain + local embeddings", "Search intent, chat, semantic ranking, product insight, seller content generation."],
            ["Media", "ImageKit", "Product image upload and delivery."],
            ["Testing", "Jest", "Auth, product, cart, order, and AI integration tests."],
        ], [35 * mm, 45 * mm, CONTENT_W - 80 * mm]),
        *h("12", "AI Intelligence Layer"),
        callout("AI Goal", "Make marketplace discovery feel like a useful shopping co-pilot instead of a generic chatbot."),
        bullets([
            "<b>Intent Understanding</b> - parses product, category, budget, comparison, mood, and action requests.",
            "<b>Semantic Search</b> - uses local deterministic embeddings to score product meaning even when exact keywords do not match.",
            "<b>Personalization</b> - combines user memory, cart, wishlist, recently viewed products, and order history signals.",
            "<b>Persistent Memory</b> - stores user preference summaries and session history in MongoDB when configured.",
            "<b>Action Execution</b> - can add products to cart, save for later, add to wishlist, or remove from cart through service APIs.",
            "<b>Seller AI</b> - generates product descriptions, bullet points, SEO keywords, categories, subcategories, and tags.",
            "<b>Product Insight</b> - summarizes product fit, risks, similar options, review sentiment, and comparison tradeoffs.",
        ]),
    ]


def risks():
    return [
        *h("13", "Risk Assessment"),
        prd_table([
            ["#", "Risk", "Likelihood", "Impact", "Severity", "Mitigation"],
            ["R1", "Microservice startup complexity - multiple services must run together for full workflow.", p("Medium", "Cell"), p("High", "Cell"), p("High", "Cell"), "Provide scripts/docker compose and clear service dependency docs."],
            ["R2", "Distributed data consistency - cart/order/payment/product states may drift.", "Medium", "High", "Critical", "Use explicit validation, idempotency, lifecycle events, and reconciliation jobs."],
            ["R3", "AI hallucination - model may invent product details.", "Medium", "High", "High", "Restrict prompts to real product data, return product cards, and fallback to deterministic ranking."],
            ["R4", "RabbitMQ unavailable - event consumers miss dashboard/notification updates.", "Medium", "Medium", "Medium", "Keep core flows non-blocking and add retry/dead-letter handling."],
            ["R5", "Secrets exposure - JWT, payment, email, OAuth, ImageKit, and Gemini keys leak.", "Medium", "High", "High", "Use .env, secret rotation, gitignore, and deployment secret stores."],
            ["R6", "Payment verification edge cases - local test route may be confused with production flow.", "Low", "High", "Medium", "Gate test-success route by environment and clearly document production payment path."],
            ["R7", "AI memory privacy - long-term user preferences must be handled carefully.", "Medium", "Medium", "Medium", "Store minimal preference summaries, avoid sensitive data, and support deletion/reset endpoint."],
            ["R8", "Scaling bottleneck - single service instances and local caches limit growth.", "Low", "Medium", "Medium", "Introduce gateway, containers, Redis pub/sub, queue workers, and horizontal scaling."],
        ], [12 * mm, 48 * mm, 24 * mm, 22 * mm, 22 * mm, CONTENT_W - 128 * mm]),
        Spacer(1, 12),
        sh("Risk Priority Matrix", ""),
        prd_table([
            ["", "Low Impact", "Medium Impact", "High Impact"],
            ["High Likelihood", "-", "-", "-"],
            ["Medium Likelihood", "-", "R4, R7", "R1, R2, R3, R5"],
            ["Low Likelihood", "-", "R8", "R6"],
        ], [34 * mm, 39 * mm, 42 * mm, CONTENT_W - 115 * mm]),
        Spacer(1, 16),
        p("Ai-VendorHub PRD v1.0 - 2026", "Small"),
    ]


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    cover_frame = Frame(0, 0, PAGE_W, PAGE_H, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    content_frame = Frame(
        MARGIN_X,
        MARGIN_BOTTOM,
        CONTENT_W,
        PAGE_H - MARGIN_TOP - MARGIN_BOTTOM,
        leftPadding=0,
        rightPadding=0,
        topPadding=8 * mm,
        bottomPadding=8 * mm,
    )
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        title="Ai-VendorHub - Product Requirements Document",
        author="Shiva Choudhry",
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
    )
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame], onPage=cover_page),
        PageTemplate(id="content", frames=[content_frame], onPage=content_page),
    ])

    story = []
    story.extend(cover_story())
    story.extend(contents())
    for section in [
        overview,
        objectives,
        target_users,
        problem_solution,
        features,
        user_flow,
        diagrams,
        requirements,
        stack_and_ai,
        risks,
    ]:
        story.extend(section())
        story.append(Spacer(1, 8))

    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build()
