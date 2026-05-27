from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUTPUT = "/Users/shivachoudhry/Downloads/Ai-VendorHub/Auth_Service_Backend_Frontend_Documentation.pdf"


def para(text, style):
    return Paragraph(text, style)


def make_table(rows, widths, header=True):
    table = Table(rows, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    style = [
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d8dee9")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#1f2937")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]
    if header:
        style.extend([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8.2),
        ])
    table.setStyle(TableStyle(style))
    return table


def status_badge(text, tone, styles):
    colors_map = {
        "done": "#047857",
        "partial": "#b45309",
        "pending": "#b91c1c",
        "optional": "#4338ca",
    }
    return Paragraph(f"<font color='{colors_map[tone]}'><b>{text}</b></font>", styles["Cell"])


def build():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title="Ai-VendorHub Auth Service Backend & Frontend Documentation",
    )

    base = getSampleStyleSheet()
    styles = {
        "Title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=27,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#111827"),
            spaceAfter=8,
        ),
        "Subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#475569"),
            spaceAfter=16,
        ),
        "H1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=19,
            textColor=colors.HexColor("#111827"),
            spaceBefore=12,
            spaceAfter=8,
        ),
        "H2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#1d4ed8"),
            spaceBefore=10,
            spaceAfter=6,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor("#334155"),
            spaceAfter=7,
        ),
        "Cell": ParagraphStyle(
            "Cell",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.2,
            leading=10.5,
            textColor=colors.HexColor("#1f2937"),
        ),
        "CellSmall": ParagraphStyle(
            "CellSmall",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=9.8,
            textColor=colors.HexColor("#1f2937"),
        ),
        "Callout": ParagraphStyle(
            "Callout",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#0f172a"),
            backColor=colors.HexColor("#e0f2fe"),
            borderColor=colors.HexColor("#7dd3fc"),
            borderWidth=0.6,
            borderPadding=8,
            spaceBefore=6,
            spaceAfter=10,
        ),
    }

    story = []

    story.append(para("Ai-VendorHub Auth Service Documentation", styles["Title"]))
    story.append(para("Backend + Frontend Coverage Report | Auth Service Only", styles["Subtitle"]))
    story.append(para(
        "This PDF documents the Auth service backend APIs, the React frontend pages created for those APIs, "
        "and the remaining frontend-only gaps. It focuses only on Auth service, not product/cart/order/payment services.",
        styles["Callout"],
    ))

    story.append(para("1. Service Overview", styles["H1"]))
    overview_rows = [
        [para("<b>Item</b>", styles["Cell"]), para("<b>Details</b>", styles["Cell"])],
        [para("Backend Auth Service", styles["Cell"]), para("Express.js service mounted under <b>/api</b>, normally running at <b>http://localhost:3001/api</b>.", styles["Cell"])],
        [para("Frontend Auth UI", styles["Cell"]), para("React + Vite frontend normally running at <b>http://localhost:5173</b>.", styles["Cell"])],
        [para("Auth Mechanism", styles["Cell"]), para("JWT access token + refresh token cookie. Frontend also stores access token in localStorage for Authorization header.", styles["Cell"])],
        [para("Session Handling", styles["Cell"]), para("Refresh-token sessions stored in Redis with max 5 active sessions per user.", styles["Cell"])],
        [para("Security Middleware", styles["Cell"]), para("Helmet, CORS, JSON parser, cookie parser, Passport initialization, login/register/email rate limits.", styles["Cell"])],
        [para("Events", styles["Cell"]), para("Publishes <b>user.created</b> and <b>user.updated</b> to RabbitMQ queues.", styles["Cell"])],
        [para("Email Features", styles["Cell"]), para("Email verification and password reset via email service; dev token returned outside production for local testing.", styles["Cell"])],
    ]
    story.append(make_table(overview_rows, [1.65 * inch, 5.35 * inch]))

    story.append(para("2. Frontend Pages Created", styles["H1"]))
    pages_rows = [
        [para("<b>Frontend Route</b>", styles["Cell"]), para("<b>Purpose</b>", styles["Cell"]), para("<b>Status</b>", styles["Cell"])],
        [para("/login", styles["Cell"]), para("Buyer/Seller login, role toggle, Google login entry.", styles["Cell"]), status_badge("Done", "done", styles)],
        [para("/register", styles["Cell"]), para("Buyer/Seller signup, role-based form, Google signup entry.", styles["Cell"]), status_badge("Done", "done", styles)],
        [para("/forgot-password", styles["Cell"]), para("Request password reset email and show local dev reset link if backend returns token.", styles["Cell"]), status_badge("Done", "done", styles)],
        [para("/reset-password/:token", styles["Cell"]), para("Reset password using token from email/dev link.", styles["Cell"]), status_badge("Done", "done", styles)],
        [para("/verify-email/:token", styles["Cell"]), para("Verify email token and update account session.", styles["Cell"]), status_badge("Done", "done", styles)],
        [para("/auth/success", styles["Cell"]), para("Google OAuth success bridge page; refreshes user then redirects to profile.", styles["Cell"]), status_badge("Done", "done", styles)],
        [para("/profile", styles["Cell"]), para("Account dashboard: profile update, addresses, security, sessions, payments info, saved/support UI.", styles["Cell"]), status_badge("Done", "done", styles)],
    ]
    story.append(make_table(pages_rows, [1.7 * inch, 4.4 * inch, 0.9 * inch]))

    story.append(para("3. Backend API To Frontend Mapping", styles["H1"]))
    api_rows = [
        [para("<b>Backend API</b>", styles["CellSmall"]), para("<b>Method</b>", styles["CellSmall"]), para("<b>Feature</b>", styles["CellSmall"]), para("<b>Frontend?</b>", styles["CellSmall"]), para("<b>Frontend Usage</b>", styles["CellSmall"])],
        [para("/api/auth/register", styles["CellSmall"]), para("POST", styles["CellSmall"]), para("Buyer registration", styles["CellSmall"]), status_badge("Yes", "done", styles), para("/register", styles["CellSmall"])],
        [para("/api/auth/register/seller", styles["CellSmall"]), para("POST", styles["CellSmall"]), para("Seller registration", styles["CellSmall"]), status_badge("Yes", "done", styles), para("/register", styles["CellSmall"])],
        [para("/api/auth/login", styles["CellSmall"]), para("POST", styles["CellSmall"]), para("Buyer login", styles["CellSmall"]), status_badge("Yes", "done", styles), para("/login", styles["CellSmall"])],
        [para("/api/auth/login/seller", styles["CellSmall"]), para("POST", styles["CellSmall"]), para("Seller login", styles["CellSmall"]), status_badge("Yes", "done", styles), para("/login", styles["CellSmall"])],
        [para("/api/auth/google", styles["CellSmall"]), para("GET", styles["CellSmall"]), para("Start Google OAuth", styles["CellSmall"]), status_badge("Yes", "done", styles), para("Google button in login/register", styles["CellSmall"])],
        [para("/api/auth/google/callback", styles["CellSmall"]), para("GET", styles["CellSmall"]), para("Google OAuth callback", styles["CellSmall"]), status_badge("Indirect", "partial", styles), para("Google calls backend; redirects to /auth/success", styles["CellSmall"])],
        [para("/api/auth/me", styles["CellSmall"]), para("GET", styles["CellSmall"]), para("Current user/seller", styles["CellSmall"]), status_badge("Yes", "done", styles), para("AuthContext + protected routes + profile", styles["CellSmall"])],
        [para("/api/auth/refresh", styles["CellSmall"]), para("POST", styles["CellSmall"]), para("Refresh access token", styles["CellSmall"]), status_badge("Yes", "done", styles), para("Axios 401 interceptor + profile sync button", styles["CellSmall"])],
        [para("/api/auth/logout", styles["CellSmall"]), para("POST", styles["CellSmall"]), para("Logout current session", styles["CellSmall"]), status_badge("Yes", "done", styles), para("Profile logout button", styles["CellSmall"])],
        [para("/api/auth/logout-all", styles["CellSmall"]), para("POST", styles["CellSmall"]), para("Logout all devices", styles["CellSmall"]), status_badge("Yes", "done", styles), para("Profile security section", styles["CellSmall"])],
        [para("/api/auth/users/me", styles["CellSmall"]), para("PATCH", styles["CellSmall"]), para("Update profile", styles["CellSmall"]), status_badge("Yes", "done", styles), para("Profile edit form", styles["CellSmall"])],
        [para("/api/auth/verify-email/request", styles["CellSmall"]), para("POST", styles["CellSmall"]), para("Request email verification", styles["CellSmall"]), status_badge("Yes", "done", styles), para("Profile security/email prompt", styles["CellSmall"])],
        [para("/api/auth/verify-email/:token", styles["CellSmall"]), para("POST", styles["CellSmall"]), para("Verify email", styles["CellSmall"]), status_badge("Yes", "done", styles), para("/verify-email/:token", styles["CellSmall"])],
        [para("/api/auth/password/forgot", styles["CellSmall"]), para("POST", styles["CellSmall"]), para("Forgot password email", styles["CellSmall"]), status_badge("Yes", "done", styles), para("/forgot-password", styles["CellSmall"])],
        [para("/api/auth/password/reset/:token", styles["CellSmall"]), para("POST", styles["CellSmall"]), para("Reset password", styles["CellSmall"]), status_badge("Yes", "done", styles), para("/reset-password/:token", styles["CellSmall"])],
        [para("/api/auth/users/me/addresses", styles["CellSmall"]), para("POST", styles["CellSmall"]), para("Add address", styles["CellSmall"]), status_badge("Yes", "done", styles), para("Profile address modal", styles["CellSmall"])],
        [para("/api/auth/users/me/addresses/:addressId", styles["CellSmall"]), para("DELETE", styles["CellSmall"]), para("Delete address", styles["CellSmall"]), status_badge("Yes", "done", styles), para("Profile address cards", styles["CellSmall"])],
    ]
    story.append(make_table(api_rows, [1.65 * inch, 0.55 * inch, 1.35 * inch, 0.75 * inch, 2.7 * inch]))

    story.append(PageBreak())
    story.append(para("4. APIs Existing But No Separate Frontend Needed", styles["H1"]))
    optional_rows = [
        [para("<b>API</b>", styles["Cell"]), para("<b>Reason</b>", styles["Cell"]), para("<b>Frontend Status</b>", styles["Cell"])],
        [para("GET /api", styles["Cell"]), para("Health-check endpoint only. Useful for developer/server status, not required for user auth flow.", styles["Cell"]), status_badge("Optional", "optional", styles)],
        [para("GET /api/auth/logout", styles["Cell"]), para("Alias for logout. Frontend already uses POST /api/auth/logout, which is better for state-changing action.", styles["Cell"]), status_badge("Not needed", "optional", styles)],
        [para("GET /api/auth/verify-email/:token", styles["Cell"]), para("Alias for verify email. Frontend uses POST /api/auth/verify-email/:token.", styles["Cell"]), status_badge("Not needed", "optional", styles)],
        [para("GET /api/auth/users/me/addresses", styles["Cell"]), para("Address list endpoint exists, but frontend currently receives addresses from GET /api/auth/me and updates state after add/delete.", styles["Cell"]), status_badge("Optional", "optional", styles)],
    ]
    story.append(make_table(optional_rows, [2.2 * inch, 3.8 * inch, 1.0 * inch]))

    story.append(para("5. Request Bodies For Main Auth APIs", styles["H1"]))
    body_rows = [
        [para("<b>API</b>", styles["CellSmall"]), para("<b>Example Body</b>", styles["CellSmall"])],
        [para("POST /api/auth/register", styles["CellSmall"]), para("{ username, email, password, fullName: { firstName, lastName }, role: 'user', address: { addressLine, city, state, pincode, phone } }", styles["CellSmall"])],
        [para("POST /api/auth/register/seller", styles["CellSmall"]), para("{ username, email, password, fullName: { firstName, lastName } }", styles["CellSmall"])],
        [para("POST /api/auth/login", styles["CellSmall"]), para("{ email, password } OR { username, password }", styles["CellSmall"])],
        [para("POST /api/auth/login/seller", styles["CellSmall"]), para("{ email, password } OR { username, password }", styles["CellSmall"])],
        [para("PATCH /api/auth/users/me", styles["CellSmall"]), para("{ username, email, fullName: { firstName, lastName } }", styles["CellSmall"])],
        [para("POST /api/auth/password/forgot", styles["CellSmall"]), para("{ email }", styles["CellSmall"])],
        [para("POST /api/auth/password/reset/:token", styles["CellSmall"]), para("{ password }", styles["CellSmall"])],
        [para("POST /api/auth/users/me/addresses", styles["CellSmall"]), para("{ addressLine, city, state, pincode, phone }", styles["CellSmall"])],
    ]
    story.append(make_table(body_rows, [2.15 * inch, 4.85 * inch]))

    story.append(para("6. Auth Frontend Completion Summary", styles["H1"]))
    count_rows = [
        [para("<b>Category</b>", styles["Cell"]), para("<b>Count / Status</b>", styles["Cell"])],
        [para("Backend Auth APIs/routes available", styles["Cell"]), para("20 total including aliases and health check", styles["Cell"])],
        [para("Important frontend-connected Auth APIs", styles["Cell"]), para("17 connected directly or indirectly", styles["Cell"])],
        [para("Remaining important frontend features", styles["Cell"]), para("0 major Auth features pending", styles["Cell"])],
        [para("Optional frontend-only improvements", styles["Cell"]), para("Health status widget, dedicated address refresh button, optional GET aliases", styles["Cell"])],
    ]
    story.append(make_table(count_rows, [3.0 * inch, 4.0 * inch]))

    story.append(para("7. Interview Readiness Notes", styles["H1"]))
    story.append(para(
        "<b>Ready from Auth POV:</b> register/login for buyer and seller, Google OAuth, JWT access token, refresh token, 5 active sessions, "
        "logout current device, logout all devices, profile update, email verification, forgot/reset password, address management, "
        "rate limiting, security middleware, and user.created/user.updated events.",
        styles["Body"],
    ))
    story.append(para(
        "<b>Frontend Ready:</b> Auth UI contains complete user-facing flows for the important Auth APIs. The remaining items are optional utility screens, "
        "not blockers for placement/interview demo.",
        styles["Body"],
    ))
    story.append(para(
        "<b>Demo flow suggestion:</b> Register a buyer, verify email, login, update profile, add address, refresh session, logout all devices, "
        "then test forgot/reset password. For Google OAuth, open /login and click Google after backend env is configured.",
        styles["Body"],
    ))

    doc.build(story)


if __name__ == "__main__":
    build()
