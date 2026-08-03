#!/usr/bin/env python3
"""One-shot docs patcher: Iranian First sections for all ADRs and ARDs."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ADRS = ROOT / "adrs"
ARDS = ROOT / "docs" / "ards"

MARKER_ADR = "## Iranian User Experience Requirements"
MARKER_ARD = "## Localization Requirements"

COMMON_TAIL = """
### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.
""".strip()


def section_for_adr(name: str) -> str:
    n = name.lower()

    def block(persian: str, rtl: str, mobile: str, business: str) -> str:
        return "\n".join(
            [
                MARKER_ADR,
                "",
                "- **Persian localization impact:** " + persian,
                "- **RTL requirements:** " + rtl,
                "- **Mobile usability impact:** " + mobile,
                "- **Iranian business workflow impact:** " + business,
                "",
                COMMON_TAIL,
                "",
            ]
        )

    # Specific overrides by keyword
    if "product-architecture" in n or n.startswith("adr-001"):
        return block(
            "Product vision and UX copy default to Persian for merchants and customers; English docs only for engineering.",
            "All primary product surfaces are RTL-first compositions.",
            "MVP optimized for Iranian Android retailers and shoppers.",
            "Retention loops assume SMS, QR stickers, in-store pickup, and traditional shopkeeper cognition.",
        )
    if "ddd" in n or "bounded-context" in n:
        return block(
            "Ubiquitous language for code may be English; domain events and user notifications resolve to Persian presentation.",
            "UI bounded to contexts must still render RTL; context boundaries do not justify LTR UX.",
            "Domain operations on POS/mobile must stay low-latency for Iranian peak hours.",
            "Contexts model Iranian retail realities (phone membership, pickup, تومان money concepts).",
        )
    if "modular-monolith" in n:
        return block(
            "Module UIs and API messages share a Persian i18n strategy at app shell.",
            "Shared layout/providers enforce RTL once for all modules.",
            "Single deployable must remain light enough for mobile networks.",
            "Modules prioritize POS + storefront Iranian workflows before Western SaaS extras.",
        )
    if "merchant-domain" in n:
        return block(
            "Merchant onboarding and profile fields support Persian trade names and contact copy.",
            "Merchant admin shells are RTL.",
            "Onboarding flows must work on merchant phones.",
            "Assume Iranian business registration/contact habits; phone-centric identity.",
        )
    if "store-domain" in n:
        return block(
            "Store names, branding text, and geo labels are Persian-capable UTF-8.",
            "Store settings UIs RTL; maps panels respect RTL chrome around map canvas.",
            "Store setup usable on mobile; maps/navigation oriented to Iranian cities.",
            "Physical store address + Jalali hours patterns for Iranian opening times.",
        )
    if "customer-membership" in n:
        return block(
            "Membership UX, empty states, and CRM notes display Persian.",
            "Customer lists and membership cards are RTL.",
            "Phone capture and membership join optimized for counter + personal mobile.",
            "Membership keyed by Iranian mobile; loyalty language familiar locally.",
        )
    if "catalog-inventory" in n:
        return block(
            "Product titles/descriptions store Persian; barcode UX supports local labeling habits.",
            "Catalog tables and stock screens RTL with logical columns.",
            "Scan + rapid stock adjustment on handheld devices.",
            "Inventory language matches shop-floor vocabulary, not ERP jargon.",
        )
    if "pos-sales" in n:
        return block(
            "POS Chrome, keypad hints, and errors entirely Persian.",
            "RTL POS layout with large tap targets; scanner feedback clear in RTL.",
            "Critical path under 3s culture; offline-friendly staff PWA on cheap Androids.",
            "Phone capture at checkout must feel natural for Iranian cashiers under rush.",
        )
    if "loyalty" in n:
        return block(
            "Points, rewards, coupons, and wallet copy in Persian.",
            "Reward lists and progress indicators RTL.",
            "Customer redemption flows touch-friendly in store PWA.",
            "Loyalty mechanics explainable without marketing English buzzwords.",
        )
    if "order-pickup" in n or "pickup-only" in n:
        return block(
            "Pickup statuses and instructions in Persian (آماده تحویل، تکمیل، …).",
            "Status timelines and CTAs RTL; no delivery-oriented LTR shipping UIs.",
            "Customer navigates to store; merchant prepares order on phone/tablet.",
            "Pickup-only matches Iranian neighborhood retail; never courier-first.",
        )
    if "payment-domain" in n or "payment-psp" in n:
        return block(
            "Payment labels, failures, and receipts Persian; amounts in تومان formatting.",
            "Checkout payment steps RTL.",
            "Iranian PSP UX patterns; mobile browser/WebView friendly.",
            "PSP ports for Iranian providers; no Stripe-as-default assumption.",
        )
    if "admin-domain" in n or "admin-dashboard" in n:
        return block(
            "Admin console copy Persian by default; privilege warnings plain Persian.",
            "Admin tables/filters RTL.",
            "Ops usable on laptop; critical alerts readable on mobile.",
            "Internal ops still respect Iranian merchant data presentation (Jalali, تومان).",
        )
    if "analytics-domain" in n or "product-analytics" in n or "behavior-clickstream" in n or "session-analytics" in n or "mongodb-analytics" in n or "event-warehouse" in n or "management-dashboard-analytics" in n or "merchant-oltp-dashboards" in n:
        return block(
            "Dashboard titles, legends, and exports for humans are Persian; event codes may be English.",
            "Charts and filter bars layout RTL; axes/tooltips readable in Persian.",
            "Reports skimable on tablet; avoid huge desktop-only bi tools for merchants.",
            "Time buckets Jalali/`Asia/Tehran` for merchant-facing analytics.",
        )
    if "scope-guardrails" in n:
        return block(
            "Out-of-scope Western features must not displace Persian MVP polish.",
            "Do not accept LTR-only third-party embeds that break merchant UX without ADR.",
            "Protect mobile performance against feature creep.",
            "Keep Iranian pickup/SMS/POS priorities over delivery/marketplace.",
        )
    if "nextjs" in n or "app-router" in n:
        return block(
            "App Router default locale/presentation is Persian; metadata for storefront Persian SEO.",
            "`html`/`body` defaults `lang=fa` `dir=rtl` for merchant/customer apps.",
            "Route segments and loading UX tuned for mobile networks.",
            "Server/client boundaries must not leak English-only flash of unstyled LTR.",
        )
    if "component-architecture" in n or "shadcn" in n or "tailwind" in n:
        return block(
            "Design system tokens include Persian typography; components accept Persian strings without clipping.",
            "shadcn/Tailwind configured RTL-first; logical properties mandatory in component primitives.",
            "Touch density variants for POS vs analytical screens.",
            "Components avoid Western-only date/currency subcomponents without Iranian adapters.",
        )
    if "uiuxpromax" in n:
        return block(
            "uiuxpromax briefs must require Persian copy samples and fa-IR persona.",
            "Generated designs must be RTL compositions before coding.",
            "Mockups at 390px Android widths for merchant/customer journeys.",
            "Prompts must describe Iranian retail contexts (مغازه، صندوقدار، مشتری).",
        )
    if "merchant-staff-pwa" in n or "offline-first" in n:
        return block(
            "Staff PWA strings Persian; offline banners Persian.",
            "RTL shell separate from customer store PWA.",
            "Installability and offline queue UX for low-connectivity shops.",
            "Cashier workflows: barcode, phone, totaling in تومان.",
        )
    if "store-customer-pwa" in n or "storefront" in n:
        return block(
            "Storefront and store PWA fully Persian; SEO title/description Persian.",
            "Customer experience RTL end-to-end including install prompts.",
            "Lightweight assets for Iranian mobile data; home-screen install UX.",
            "QR → PWA → membership/pickup loops matching local shop behavior.",
        )
    if "state-management" in n or "data-fetching" in n:
        return block(
            "Cached display state must preserve Unicode Persian payloads.",
            "Suspense/error UI Persian RTL.",
            "Prefer snappy mobile perceived performance over chatty fetches.",
            "Stale-while-revalidate must not flash English placeholders.",
        )
    if "forms-validation" in n or "frontend-error" in n or "error-handling" in n:
        return block(
            "Validation and error copy Persian; map technical codes to plain language.",
            "Form field order and error icons RTL-aware.",
            "Inline errors visible above mobile keyboards.",
            "Phone/OTP/price validators encode Iranian formats.",
        )
    if "backend-layering" in n or "api-standards" in n or "api-protection" in n:
        return block(
            "Human-readable API messages Persian (or stable codes + Persian client maps).",
            "N/A for internal JSON keys; document Persian message strategy.",
            "Payload sizes and latency budgets respect mobile clients.",
            "Rate-limit and auth errors user-safe in Persian.",
        )
    if "merchant-authentication" in n or "customer-sms-otp" in n or "nextauth" in n or "authorization" in n or "sms-provider" in n:
        return block(
            "Auth screens and SMS OTP templates Persian; Iranian MSISDN validation.",
            "Login/OTP layouts RTL; numeral entry friendly.",
            "SMS reliability and short Persian OTP messages; mobile-first.",
            "Shopkeeper and customer login via phone OTP norms in Iran.",
        )
    if "event-driven" in n or "event-catalog" in n or "outbox" in n or "emqx" in n or "mqtt" in n:
        return block(
            "User-visible realtime toasts/notifications Persian; wire schemas English OK.",
            "Notification drawers RTL.",
            "Realtime useful on shop floor mobiles without draining battery unnecessarily.",
            "Pickup/POS events drive Iranian counter and customer wait perceptions.",
        )
    if "minio" in n:
        return block(
            "Alt text / file labels user-facing Persian when shown in UI.",
            "Media galleries RTL.",
            "Compress images for mobile catalog browsing.",
            "Product imagery for local storefront branding.",
        )
    if "postgresql" in n or "drizzle" in n or "database-modeling" in n or "indexing" in n or "query-design" in n or "data-integrity" in n or "multi-tenant" in n or "inventory-sync" in n or "search-barcode" in n:
        return block(
            "UTF-8 Persian text columns; search/indexing plans for Persian product/customer text; no ASCII-only collations.",
            "N/A at SQL layer for visual RTL; presentation still RTL.",
            "Query budgets protect POS mobile latency.",
            "Tenant data models Iranian merchants/stores; barcode+name search for local catalogs.",
        )
    if "redis" in n or "cache-" in n or "rate-limiting" in n:
        return block(
            "Cached responses may include Persian strings; keys remain ID-based.",
            "N/A visual RTL; do not corrupt Unicode in serializers.",
            "TTLs and stampede controls keep mobile UX responsive.",
            "OTP/rate limits tuned for Iranian SMS abuse patterns.",
        )
    if "audit-logging" in n or "data-retention" in n or "analytics-failure" in n:
        return block(
            "Audit UIs showing actions to humans use Persian labels; raw payloads may be JSON English keys.",
            "Audit viewers RTL.",
            "Investigations possible on modest ops devices.",
            "Retention/compliance messaging for Iranian operators when exposed.",
        )
    if "docker" in n or "container" in n or "cicd" in n or "deployment" in n or "scalability" in n or "data-plane-deployment" in n or "backup" in n or "observability" in n or "monitoring" in n or "env-secrets" in n:
        return block(
            "Ops docs may be English; any merchant-visible status must be Persian.",
            "N/A unless operator UI ships — then RTL Persian.",
            "Deployments must not regress mobile asset performance.",
            "Infra supports Iran hosting/latency considerations as documented in ops ADRs.",
        )
    if "security" in n:
        return block(
            "Security warnings to users Persian; avoid scary English-only blocks.",
            "Security settings pages RTL.",
            "Auth challenges mobile-friendly.",
            "Threat model includes SMS OTP abuse common in local markets.",
        )
    if "testing" in n:
        return block(
            "Tests cover Persian strings for critical paths; fixtures include Persian names.",
            "RTL/layout tests or screenshots for primary shells where feasible.",
            "E2E on mobile viewports.",
            "Format tests for تومان and Jalali helpers.",
        )
    if "qr-acquisition" in n:
        return block(
            "QR landing and first-run copy Persian.",
            "Landing RTL; CTA large for outdoor/window glare scenarios.",
            "Fast first paint on mobile data after scan.",
            "Sticker/QR loops for physical Iranian storefronts.",
        )
    if "notifications" in n:
        return block(
            "All notification templates Persian by default.",
            "In-app notification center RTL.",
            "SMS length-conscious Persian templates.",
            "Order/loyalty notices match local customer expectations.",
        )
    if "governance" in n or "adr-ard" in n:
        return block(
            "Governance docs in English OK; mandate Iranian First in every ADR/ARD process.",
            "Process checklists include RTL/Persian gates.",
            "N/A beyond ensuring mobile UX DoD enforced.",
            "No Accepted implementation without Iranian checklist.",
        )
    if "customer-dashboard" in n or "merchant-dashboard" in n:
        return block(
            "Dashboard chrome, KPIs, and empty states Persian.",
            "Full RTL dashboards; mirrored nav.",
            "Merchant KPIs readable on phone; customer dashboard PWA-first.",
            "KPIs use تومان and Jalali ranges.",
        )

    # Fallback
    return block(
        "Any user-visible output from this decision must default to Persian (`fa-IR`).",
        "Any UI produced under this decision must be RTL-first with logical CSS.",
        "Validate on mobile widths typical of Iranian Android devices.",
        "Align flows with Iranian merchant/customer behavior (SMS, pickup, local retail language).",
    )


def ard_block(ard_name: str) -> str:
    n = ard_name.lower()
    loc = [
        "Default locale `fa-IR`; all merchant/customer copy Persian.",
        "API human messages Persian or code→Persian map.",
        "Follow `docs/rules/iranian-first-development.md`.",
    ]
    rtl = [
        "Implement RTL-first (`dir=rtl`, logical CSS).",
        "Mirror directional icons/navigation.",
        "No LTR-only layouts for in-scope screens.",
    ]
    persian_ux = [
        "Persian typography; strings must not clip or overflow.",
        "Plain-language errors for traditional merchants.",
        "Jalali dates + تومان formatting wherever shown.",
    ]
    iranian = [
        "Iranian mobile numbers and SMS OTP patterns when identity involved.",
        "Workflows match local retail (POS rush, QR, pickup) — not Western delivery ecommerce.",
        "Mobile-first Android usability and modest bandwidth.",
        "Pass `docs/checklists/iranian-feature-checklist.md` before completion.",
    ]

    if "pos" in n or "inventory" in n or "catalog" in n:
        iranian.append("Counter/scan UX optimized for noisy shop environments.")
    if "storefront" in n or "pwa" in n or "customer" in n or "qr" in n or "pickup" in n:
        loc.append("Storefront SEO metadata Persian when applicable.")
        iranian.append("Customer journeys assume phone OTP + store visit.")
    if "analytics" in n or "dashboard" in n or "audit" in n or "observability" in n or "warehouse" in n or "behavior" in n:
        persian_ux.append("Reports: Persian labels + Jalali/`Asia/Tehran` buckets for humans.")
    if "auth" in n or "notification" in n or "sms" in n:
        loc.append("SMS templates Persian; MSISDN Iran rules.")
    if "payment" in n:
        iranian.append("Iranian PSP assumptions; تومان display clarity.")
    if "foundation" in n or "infrastructure" in n or "hardening" in n:
        rtl.append("Scaffold app shell with `lang=fa` `dir=rtl` defaults for product apps.")
        loc.append("i18n plumbing installed early even if some strings temporary.")

    return "\n".join(
        [
            MARKER_ARD,
            "",
            *[f"- {x}" for x in loc],
            "",
            "## RTL Requirements",
            "",
            *[f"- {x}" for x in rtl],
            "",
            "## Persian UX Requirements",
            "",
            *[f"- {x}" for x in persian_ux],
            "",
            "## Iranian User Considerations",
            "",
            *[f"- {x}" for x in iranian],
            "",
        ]
    )


def patch_adr(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if MARKER_ADR in text:
        return False
    section = section_for_adr(path.name)
    # Insert before Completion Criteria if present, else append
    needle = "## Completion Criteria"
    if needle in text:
        text = text.replace(needle, section + "\n" + needle, 1)
    else:
        text = text.rstrip() + "\n\n" + section
    # Add checklist item under Completion Criteria
    text = text.replace(
        "## Completion Criteria\n\n",
        "## Completion Criteria\n\n"
        "- [ ] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX\n",
        1,
    )
    path.write_text(text, encoding="utf-8")
    return True


def patch_ard(path: Path) -> bool:
    if path.name.upper().startswith("STATUS") or path.name.lower() == "readme.md":
        return False
    if not path.name.lower().startswith("ard-"):
        return False
    text = path.read_text(encoding="utf-8")
    if MARKER_ARD in text:
        return False
    section = ard_block(path.name)
    needle = "## Definition of Done"
    if needle in text:
        text = text.replace(needle, section + needle, 1)
    else:
        # before Implementation Checklist or append
        needle2 = "## Implementation Checklist"
        if needle2 in text:
            text = text.replace(needle2, section + needle2, 1)
        else:
            text = text.rstrip() + "\n\n" + section
    # Enrich DoD line if present
    if "Iranian feature checklist" not in text:
        text = text.replace(
            "## Definition of Done\n\n",
            "## Definition of Done\n\n"
            "Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.\n\n",
            1,
        )
    # Add validation items
    if "## Validation Checklist" in text and "iranian-feature-checklist" not in text.split("## Validation Checklist", 1)[1][:800]:
        text = text.replace(
            "## Validation Checklist\n\n",
            "## Validation Checklist\n\n"
            "- [ ] iranian-first-development.md conformance\n"
            "- [ ] iranian-feature-checklist.md passed (or N/A with reason)\n"
            "- [ ] RTL + Persian copy reviewed for in-scope screens\n",
            1,
        )
    path.write_text(text, encoding="utf-8")
    return True


def main() -> None:
    adr_n = ard_n = 0
    for p in sorted(ADRS.glob("ADR-*.md")):
        if patch_adr(p):
            adr_n += 1
            print("ADR", p.name)
    for p in sorted(ARDS.glob("ard-*.md")):
        if patch_ard(p):
            ard_n += 1
            print("ARD", p.name)
    print(f"Patched ADRs={adr_n} ARDs={ard_n}")


if __name__ == "__main__":
    main()
