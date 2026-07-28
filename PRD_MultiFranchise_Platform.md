# Product Requirements Document

# Multi-Franchise Business Management Platform

**Web Application | iOS | Android**
*Premium Black & White — Designed for Luxury*

---

## Document Control

| Field | Value |
|---|---|
| Document Title | PRD — Multi-Franchise Business Management Platform |
| Version | 1.0 |
| Status | Draft for Review |
| Prepared For | Internal Engineering, Product, Design & Stakeholders |
| Date | 2026-05-26 |
| Confidentiality | Confidential — Internal Use Only |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Objectives](#2-product-vision--objectives)
3. [Target Users & Personas](#3-target-users--personas)
4. [Business Model & Multi-Tenancy](#4-business-model--multi-tenancy)
5. [System Architecture Overview](#5-system-architecture-overview)
6. [Design System — Black & White Luxury](#6-design-system--black--white-luxury)
7. [Core Modules](#7-core-modules)
8. [Advanced Modules (New)](#8-advanced-modules-new)
9. [User Roles & Permissions](#9-user-roles--permissions)
10. [Web Application Specification](#10-web-application-specification)
11. [Mobile App — Staff & Manager](#11-mobile-app--staff--manager)
12. [Customer Mobile App (B2C)](#12-customer-mobile-app-b2c)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Integrations](#14-integrations)
15. [Reporting & Analytics](#15-reporting--analytics)
16. [Data Model — Core Entities](#16-data-model--core-entities)
17. [Phased Roadmap](#17-phased-roadmap)
18. [Success Metrics](#18-success-metrics)
19. [Risks & Mitigation](#19-risks--mitigation)
20. [Recommended Technology Stack](#20-recommended-technology-stack)
21. [Acceptance Criteria — Examples](#21-acceptance-criteria--examples)
22. [Out of Scope (for V1)](#22-out-of-scope-for-v1)
23. [Open Questions](#23-open-questions)
24. [Glossary](#24-glossary)

---

## 1. Executive Summary

This document defines the requirements for a next-generation, multi-tenant Business Management Platform serving a franchisor (Head Office / HQ) and a network of franchisees. The platform will be delivered as a responsive Web Application and native Mobile Applications for iOS and Android, with an additional consumer-facing booking app for end customers.

The product is modelled on the operational backbone of the existing in-house Waffor platform — covering Dashboards, Business Trends, Quick Sale (POS), Appointments, Customers (CRM), Campaigns, Feedback, Online Booking, Lead Management, Multi-location and Settings — and significantly extends it with advanced modules required to run a franchise network at scale: a Franchise Management Hub, Royalty & Revenue-Share Engine, Inventory, Staff/HR & Payroll, Loyalty 2.0, AI Insights, Quality Audit, Training, Document Management, Vendor Management, Reputation Management and an integrated Customer App.

The visual language is intentionally minimal: a premium, monochrome (black and white) design system that signals luxury, trust and clarity. Typography, whitespace and precise iconography will carry the brand, with an extremely restrained metallic accent used only for status emphasis.

### 1.1 Strategic Outcomes

- **Centralised Control with Local Autonomy.** HQ has real-time visibility across every franchise; franchisees retain day-to-day operational independence within HQ-defined guardrails.
- **Revenue Predictability.** Automated royalty calculation, marketing-fund collection and reconciliation reduce revenue leakage and disputes.
- **Standardised Customer Experience.** A common service catalogue, pricing logic, loyalty programme and brand voice across every outlet.
- **Operational Excellence.** Real-time KPIs, automated audits and AI-powered recommendations drive performance up and cost down.
- **Scale-Ready Architecture.** A multi-tenant, role-based system built to onboard hundreds of franchisees with predictable cost per outlet.

### 1.2 Scope Snapshot

| Surface | Primary Users | Delivery |
|---|---|---|
| Web App (HQ Console) | Franchisor / Head Office | Responsive Web |
| Web App (Outlet Console) | Franchisee Owner & Manager | Responsive Web |
| Mobile App (Staff/Manager) | Outlet Staff, Manager, Franchisee | iOS + Android (native) |
| Mobile App (Customer) | End Customers | iOS + Android (native) |
| Online Booking Site | Walk-in / Web Customers | Public Web |

---

## 2. Product Vision & Objectives

### 2.1 Vision Statement

To build the most elegant, intelligent and trustworthy operating system for premium service businesses — a platform that lets a single brand operate hundreds of outlets as if they were one, while giving each franchisee the autonomy and tools to delight their local customers.

### 2.2 Business Objectives

- **Grow Network Revenue.** Increase same-outlet revenue by ≥15% in the first 12 months via better customer retention, smarter campaigns and dynamic pricing.
- **Reduce Operating Friction.** Cut average daily admin time per outlet by 40% through automation of billing, reconciliation, payroll prep, stock and reporting.
- **Improve Customer Retention.** Lift repeat-visit rate by ≥20% through loyalty 2.0, AI churn-prediction and personalised campaigns.
- **Standardise Brand Experience.** Achieve ≥95% adherence to brand standards across the network via automated audits, training and centrally controlled catalogues.
- **Eliminate Revenue Leakage.** Achieve 100% automated royalty/marketing-fee calculation and same-day reconciliation visibility.

### 2.3 Product Principles

1. Luxury is restraint. The interface uses generous whitespace, a precise monochrome palette and one typographic family. No visual noise.
2. Every screen earns its place. If a screen does not directly support a measurable user task, it does not ship.
3. HQ sees everything; franchisees see what they need. Data scoping is enforced at the API layer, not by the UI.
4. Mobile is first-class, not a port. The mobile app is a complete operational surface, not a viewer.
5. Insight, not data. Dashboards surface decisions and exceptions; raw data is one click away, never the default.
6. Configurable, not customised. Differences between outlets are expressed via configuration, not by code branches.
7. Resilient by default. The POS continues to bill offline; sync happens transparently when connectivity returns.

---

## 3. Target Users & Personas

The platform serves four distinct user categories. All flows, permissions and screens in this document map back to one or more of these personas.

### 3.1 Persona Summary

| Persona | Primary Surface | Core Need |
|---|---|---|
| Franchisor Admin (HQ Owner) | Web (HQ Console) | Network-wide visibility, control of standards, revenue assurance. |
| HQ Operations / Regional Manager | Web + Mobile | Outlet performance monitoring, audit, training, support. |
| Franchisee Owner | Web + Mobile | P&L for own outlet(s), staff & customer management, growth. |
| Outlet Manager | Web + Mobile | Daily operations: appointments, billing, staff, stock, customers. |
| Outlet Staff (Therapist/Stylist/Technician) | Mobile | Own schedule, customer history, tips, commissions. |
| End Customer | Customer Mobile App + Web | Discover, book, pay, get reminders, earn rewards. |

### 3.2 Detailed Personas

#### 3.2.1 Franchisor Admin — "The Network Operator"

- **Goals:** Grow the network, protect the brand, ensure every franchisee is profitable and compliant.
- **Key tasks:** Approve new outlets, view consolidated P&L, monitor royalty collection, push catalogue updates, run network-wide campaigns, audit outlets.
- **Pain points without the platform:** Manual royalty reconciliation, inconsistent reporting from outlets, no early warning on under-performing franchisees.
- **Success metric:** Time from "opening a new franchise" to "fully operational on the platform" < 48 hours.

#### 3.2.2 Franchisee Owner — "The Local Entrepreneur"

- **Goals:** Maximise outlet revenue, retain customers, control costs, follow brand standards.
- **Key tasks:** View daily/weekly/monthly P&L, approve expenses, manage staff & rosters, run local campaigns within HQ guardrails.
- **Pain points:** Juggling multiple tools, manually computing staff commissions, losing customers to no-shows and lack of follow-up.
- **Success metric:** Daily P&L visible by 9:00 AM next day with zero manual effort.

#### 3.2.3 Outlet Manager — "The Operator"

- **Goals:** Run a smooth day — every appointment delivered on time, every bill closed correctly.
- **Key tasks:** Calendar management, walk-in billing, customer check-in, staff coordination, end-of-day reconciliation.
- **Pain points:** Switching between calendar, billing and customer screens; manual end-of-day cash reconciliation.
- **Success metric:** End-of-day close in < 5 minutes.

#### 3.2.4 Outlet Staff — "The Service Provider"

- **Goals:** Deliver great service, track earnings, build a personal customer book.
- **Key tasks:** View today's schedule, see customer notes/history, mark service complete, view tips & commission.
- **Pain points:** Not knowing repeat customer preferences, unclear commission calculation.
- **Success metric:** 100% of services start within 5 minutes of scheduled time.

#### 3.2.5 End Customer — "The Guest"

- **Goals:** Easy booking, recognised on arrival, rewarded for loyalty.
- **Key tasks:** Browse outlets, book/reschedule, pay, redeem offers, leave feedback.
- **Pain points:** Phone-only booking, forgetting appointments, not feeling valued.
- **Success metric:** ≥4.7 average rating across outlets, ≥60% bookings via self-service.

---

## 4. Business Model & Multi-Tenancy

### 4.1 Operating Model

The business is a franchised brand. The Franchisor (HQ) owns the brand, the operational standards, the customer-facing catalogue, the loyalty programme and the technology. Franchisees operate one or more outlets under the brand, pay royalties and marketing contributions, and follow HQ-defined SOPs.

The platform must mirror this real-world structure: a single global tenant (HQ) with sub-tenants (Franchisees), each of which owns one or more outlets (Locations). Data must be scoped so that:

- HQ users see all data across all franchisees and outlets, with the ability to filter and drill down.
- Franchisee Owners see all data for the outlets they own, and nothing else.
- Outlet Managers and Staff see data only for the specific outlet they are assigned to.
- Customers see only their own bookings, history, wallet balances and rewards — across the brand, not by outlet.

### 4.2 Tenancy Hierarchy

| Level | Entity | Examples of Scope-Owned Data |
|---|---|---|
| L0 | Brand / HQ | Catalogue, brand assets, network policies, master loyalty rules, royalty rules. |
| L1 | Franchisee | Owner profile, agreement, all outlets the franchisee operates, consolidated P&L. |
| L2 | Outlet (Location) | Staff, stock, appointments, bills, expenses, local offers, audit reports. |
| L3 | Staff Member | Schedule, services delivered, commissions, tips, performance. |
| L4 | Customer | Profile, visits, bills, loyalty balance, communications consent. |

### 4.3 Centralised vs. Local Control

Each configurable area must be classifiable as Centralised (HQ-only), Local (Franchisee-only) or Hybrid (HQ sets policy, Franchisee operates within it). This is captured in the Settings & Permissions model and must be enforced by the API.

| Configuration Area | Centralised | Hybrid | Local |
|---|:---:|:---:|:---:|
| Service catalogue & pricing | ✓ | | |
| Brand assets & templates | ✓ | | |
| Master loyalty programme | ✓ | | |
| Royalty & marketing fee rules | ✓ | | |
| Tax configuration | | ✓ | |
| Promotional offers / discounts | | ✓ | |
| Campaign templates | | ✓ | |
| Staff hiring & roster | | | ✓ |
| Local expenses | | | ✓ |
| Walk-in billing | | | ✓ |
| Customer service & feedback handling | | | ✓ |

### 4.4 Franchise Onboarding Lifecycle

1. Lead captured in Lead Management (HQ pipeline).
2. Agreement uploaded; commercials configured (royalty %, marketing fund %, fees).
3. Outlet(s) provisioned with template settings (catalogue, tax, branding).
4. Franchisee owner & manager accounts created; invitations sent.
5. Master data inherited from HQ; local data (staff, opening hours) configured.
6. Soft-launch period (configurable, e.g., 14 days) with HQ in shadow mode for audits.
7. Go-live: outlet appears on public booking site, customer app and HQ dashboards.

---

## 5. System Architecture Overview

The platform is a multi-tenant, cloud-hosted SaaS with a clean separation between presentation, business logic and data layers. This section describes the conceptual architecture; concrete technology choices are recommended in Section 20.

### 5.1 High-Level Components

- **Web Front-End.** Single Page Application serving HQ Console, Outlet Console and Public Booking Site as themed shells over a shared component library.
- **Mobile Front-End.** Native iOS (Swift/SwiftUI) and Android (Kotlin/Jetpack Compose) apps for Staff/Manager and a separate native app for Customers — or one codebase via React Native / Flutter if velocity is prioritised over native polish.
- **API Gateway.** Single entry point for all clients; handles authN/Z, rate-limiting, request routing and tenant resolution.
- **Core Services.** Bounded-context microservices: Identity & Access, Catalogue, Booking, POS, Customer, Loyalty, Campaign, Inventory, HR/Payroll, Finance, Audit, Notifications, Reporting.
- **Data Layer.** Primary OLTP database (PostgreSQL) with tenant_id scoping; read-replicas for reporting; data warehouse (e.g., BigQuery / Redshift) for analytics; Redis for caching & sessions.
- **Event Bus.** Asynchronous events (e.g., Kafka / SNS+SQS) for cross-service workflows such as `bill-created → loyalty-credit`, `churn-detected → campaign-trigger`.
- **Integration Layer.** Connectors for WhatsApp Business API, SMS gateways, payment gateways, Google (Business Profile, Maps, Booking), Mailchimp, accounting tools.
- **Object Storage.** Images, documents, audit photos, signed contracts (S3 / equivalent) with signed-URL access.
- **Observability.** Centralised logs, metrics, traces (e.g., OpenTelemetry → Datadog / Grafana stack); audit log is a first-class, immutable data store.

### 5.2 Tenant Isolation

Tenant isolation is enforced in three layers:

1. **Authentication:** every JWT carries `tenant_id` and outlet scope claims.
2. **Authorization:** every API request is filtered by a middleware that injects `tenant_id` and `outlet_id` into every query.
3. **Database:** row-level security policies on every shared table; sensitive data (e.g., payouts) lives in tenant-specific schemas.

### 5.3 Offline-First Considerations

The POS, Appointment and Quick-Sale flows on mobile must remain usable when connectivity is poor. The mobile app maintains a local SQLite store for the day's data, queues mutations, and reconciles with the server when online. Conflict resolution rules are described in Section 14.

### 5.4 Environments

| Environment | Purpose | Data |
|---|---|---|
| Local / Dev | Engineer workstations | Synthetic seed data |
| QA | Automated + manual testing | Anonymised production-like data |
| Staging | Pre-release sign-off, UAT | Fresh copy of production (masked) |
| Production | Live customers | Real data, full audit logging |

---

## 6. Design System — Black & White Luxury

The visual identity is the single most important brand asset of this platform. It must look and feel premium on every device — a piece of editorial design, not a tool. The design system below is binding: any UI built for this platform must conform.

### 6.1 Design Philosophy

- **Monochrome by default.** The full palette is black, white and a calibrated greyscale. Colour is never decorative; it is reserved exclusively for status (success, warning, danger, info) and used at low saturation.
- **Type as hierarchy.** We do not rely on colour blocks for hierarchy; we use type weight, size and whitespace.
- **Generous whitespace.** Minimum 24px outer padding on desktop; minimum 16px on mobile. Density modes are NOT offered — restraint is the brand.
- **Sharp, modern geometry.** Borders are 1px, hairline silver. Radii are subtle (4–8px). No drop-shadows except a single, almost-invisible elevation token.
- **Iconography is line-based.** 1.5px stroke, rounded caps, monochrome. No filled icons in primary navigation.
- **Motion is purposeful.** 150–250ms ease-out on state changes; no bouncing, no parallax, no decorative animation.

### 6.2 Colour Tokens

| Token | Hex | Usage |
|---|---|---|
| color/black | `#000000` | Primary text, primary buttons, headers |
| color/charcoal | `#1A1A1A` | Body text on white |
| color/graphite | `#2E2E2E` | Secondary headings |
| color/steel | `#4A4A4A` | Tertiary text, metadata |
| color/grey | `#777777` | Disabled text, placeholders |
| color/silver | `#BFBFBF` | Borders, dividers, table lines |
| color/pearl | `#E8E8E8` | Subtle backgrounds, hover states |
| color/offwhite | `#F5F5F5` | Section backgrounds, table stripes |
| color/white | `#FFFFFF` | Page background, primary surface |
| color/accent | `#8C7853` | Single metallic accent — used ONLY for premium status badges (VIP, Gold tier) and never for actions |
| status/success | `#1E8E3E` | Confirmation states only |
| status/warning | `#B26A00` | Caution states only |
| status/danger | `#B3261E` | Destructive actions, errors |
| status/info | `#1F6FEB` | Information banners only |

### 6.3 Typography

Two typefaces only. A modern editorial serif for marquee numbers and a precise neo-grotesque sans for everything else. Fallbacks are system-native so the app is usable even before web fonts load.

| Token | Family | Use |
|---|---|---|
| font/display | "Playfair Display" / serif | Hero numbers on dashboards, marketing surfaces |
| font/sans | "Inter" / system-ui, -apple-system, sans-serif | All UI text |
| font/mono | "JetBrains Mono" / ui-monospace | IDs, codes, amounts in audit logs |

| Scale | Size / Line-Height | Weight | Example |
|---|---|---|---|
| display/xl | 56 / 64 | 700 | Headline KPI value |
| display/l | 40 / 48 | 700 | Page title |
| heading/xl | 32 / 40 | 700 | Section heading |
| heading/l | 24 / 32 | 600 | Sub-section |
| heading/m | 20 / 28 | 600 | Card title |
| body/l | 16 / 24 | 400 | Default body |
| body/m | 14 / 22 | 400 | Secondary body |
| caption | 12 / 16 | 500 | Labels, captions, badges |

### 6.4 Spacing, Radii, Borders, Elevation

| Token | Value | Notes |
|---|---|---|
| space/2 | 8 px | Inline gaps inside controls |
| space/3 | 12 px | Form field padding |
| space/4 | 16 px | Card inner padding (mobile) |
| space/5 | 24 px | Card inner padding (desktop), section gaps |
| space/6 | 32 px | Major section gap |
| space/8 | 48 px | Page-level gaps |
| radius/sm | 4 px | Buttons, inputs |
| radius/md | 8 px | Cards |
| radius/lg | 16 px | Modals, sheets |
| border/hairline | 1 px solid silver | All dividers |
| border/strong | 2 px solid black | Selected / focus |
| elevation/0 | none | Default |
| elevation/1 | 0 1px 2px rgba(0,0,0,.06) | Card resting |
| elevation/2 | 0 4px 12px rgba(0,0,0,.08) | Menus, popovers |

### 6.5 Component Inventory (Core)

- **Buttons.** Primary (black fill, white text), Secondary (white fill, black border), Tertiary (text-only, black), Destructive (border in danger). All have hover, focus-visible, pressed, loading and disabled states.
- **Inputs.** Single-line, multi-line, select, multi-select, date/time, phone (with country picker), currency, search, OTP, password. All have label-above pattern, help text and error state.
- **Cards.** Default (1px silver border), Elevated (with elevation/1), Inset (offwhite background).
- **Data Display.** Tables (sticky header, hover row, sortable), KPI Card, Trend Chart (line, bar, area — monochrome with single accent stroke), Status Pill, Avatar.
- **Navigation.** Side Nav (HQ & Outlet web), Top Bar (search, alerts, profile, location switcher, tenant switcher), Tab Bar (mobile), Breadcrumbs.
- **Feedback.** Toast, Banner, Empty State, Skeleton Loader, Confirmation Modal, Drawer / Sheet.
- **Forms.** Inline validation, multi-step wizard, autosave indicator.
- **Data Entry on Mobile.** Large touch targets (≥44pt), bottom sheets for selects, numeric keypad for amounts.

### 6.6 Accessibility

- **WCAG 2.2 AA minimum.** Colour contrast ≥4.5:1 for text, ≥3:1 for UI components.
- **Keyboard.** Every interactive element reachable via Tab; focus ring visible (2px black outline).
- **Screen Readers.** All inputs have programmatic labels; tables have row/column headers; landmark roles on every page.
- **Motion.** Respects `prefers-reduced-motion`.
- **Touch Targets.** Mobile minimum 44×44 pt.
- **Localisation-Ready.** All strings extracted; right-to-left layout supported; currency, date and number formatting locale-aware.

---

## 7. Core Modules

This section catalogues the modules that replicate (and improve on) the existing Waffor platform — these are the must-have foundation. Each module is specified with its purpose, primary users, key screens, functional requirements, business rules and franchise-scoping behaviour. Module IDs are referenced throughout the rest of the document.

### 7.1 Dashboard (M-DASH)

**Purpose.** A single landing surface that surfaces the most important operational and financial signals at-a-glance, with three context tabs (Sales / Staff / Customer). For HQ users, the dashboard aggregates across the network; for franchisees, across their outlets; for managers, for their outlet.

**Primary Users.** All authenticated business users (HQ, Franchisee, Manager).

**Key Screens.**
- Dashboard Home with Sales / Staff / Customer Insight tabs
- Date selector (Today, Yesterday, Last 7d, MTD, QTD, YTD, Custom range)
- Outlet selector (single, multiple, or All)

**Functional Requirements.**
- **FR-DASH-01.** Display KPI cards: Bill Count, Total Bill Value, Average Bill Value, Total Expense Value.
- **FR-DASH-02.** Secondary KPI strip: Cancelled Bill Count & Value, Staff Tips Value, Unpaid Value, Reward Points Value.
- **FR-DASH-03.** Visual modules: Modes of Payment, Modes of Collected Dues, Top Services, Top Staff, Top Customers (configurable widgets).
- **FR-DASH-04.** Comparison toggle vs. previous period; show delta % with directional indicator (no colour, only arrow + value).
- **FR-DASH-05.** Drill-through: clicking any KPI navigates to the underlying report pre-filtered to that date/outlet.
- **FR-DASH-06.** HQ Mode: outlet-level heat map showing performance distribution; ability to rank outlets by any KPI.
- **FR-DASH-07.** Empty states are explicit ("No data available for the selected period") and never display "0" without context.
- **FR-DASH-08.** Refreshes every 60 seconds for current-day data; older periods are cached.

### 7.2 Business Trends & Analytics (M-TRND)

**Purpose.** Time-series analytics across sales, bill count, average bill value, staff sales performance, sales by item and payment modes. Provides trend lines and benchmarks against prior periods.

**Functional Requirements.**
- **FR-TRND-01.** Multi-select metric chooser (Sales, Bill Count, Avg Bill Value, Staff Sales Performance, Sales by Item, Payment Modes).
- **FR-TRND-02.** Two granularities: Days, Months; supported ranges: Last 7d, Last 30d, Last 90d, Last 12m, Custom.
- **FR-TRND-03.** Compare two outlets or two periods on the same chart (monochrome stroke + dashed accent).
- **FR-TRND-04.** Hover tooltip with absolute and YoY/MoM delta.
- **FR-TRND-05.** Export current view to PDF and CSV.
- **FR-TRND-06.** HQ Mode: roll-up across all outlets with ability to break-down by region, franchisee or outlet.

### 7.3 Quick Sale / Point of Sale (M-POS)

**Purpose.** Fast, error-resistant billing for walk-in and appointment-based services and products. The single most-used screen by outlet staff and managers — must be optimised for speed and clarity.

**Key Screens.**
- Quick Sale Bill Entry
- Billing Summary panel (sticky, right-hand side)
- Checkout / Payment Capture
- Receipt / Invoice

**Functional Requirements.**
- **FR-POS-01.** Customer lookup by mobile / name / customer ID with type-ahead; option to create new customer inline (single name + mobile minimum).
- **FR-POS-02.** Add line items of four types: Service, Product, Package, Gift Voucher, Prepaid Wallet.
- **FR-POS-03.** Per-line: assign staff, set quantity, price, line-discount (% or value).
- **FR-POS-04.** Bill-level discounts: by Value, by Percentage, by Redeem Gift Voucher / Coupon.
- **FR-POS-05.** Apply Loyalty Points: show available balance, conversion rate, and updated total.
- **FR-POS-06.** Add Tip (per staff or pooled).
- **FR-POS-07.** Split payment across multiple modes (Cash, Card, UPI, Wallet, Bank Transfer, Prepaid Wallet, Gift Voucher).
- **FR-POS-08.** Tax engine respects HSN/SAC configuration; inclusive/exclusive supported.
- **FR-POS-09.** Park / Resume bill; one outlet may have multiple parked bills.
- **FR-POS-10.** Print or send receipt by WhatsApp, SMS or Email.
- **FR-POS-11.** Offline mode: continue billing for up to 24 hours, queue for sync; assign a temporary local-only bill number that reconciles on sync.
- **FR-POS-12.** Refund / Cancel bill with reason code; produces a credit note and adjusts loyalty/inventory accordingly.
- **FR-POS-13.** Remarks field (free text) per bill, searchable later.
- **FR-POS-14.** "Switch to old quick sale" is removed; only the new flow is supported.

### 7.4 Appointment Management (M-APPT)

**Purpose.** Visual calendar to schedule, edit and track service appointments. Supports day / week / month views, multi-staff resources and colour-coded statuses.

**Key Screens.**
- Calendar (Day, Week, Month) with Staff columns
- List View
- Appointment Detail Drawer
- New Appointment Wizard

**Functional Requirements.**
- **FR-APPT-01.** Drag-and-drop reschedule; resize to adjust duration.
- **FR-APPT-02.** Multi-service appointments with sequential or parallel staff assignment.
- **FR-APPT-03.** Status states: Pending, Confirmed, Checked-in, In-service, Completed, No-show, Cancelled (with reason).
- **FR-APPT-04.** Buffer time between appointments configurable per service.
- **FR-APPT-05.** Resource conflicts blocked at the API layer; UI shows clear inline error.
- **FR-APPT-06.** Recurring appointments (daily/weekly/monthly) with rule editor.
- **FR-APPT-07.** Automated reminders (WhatsApp/SMS) at configurable T-24h, T-2h.
- **FR-APPT-08.** Convert appointment to Bill with one tap; pre-fills services and staff.
- **FR-APPT-09.** Colour Code legend on top-right; colours used here are the only colour exception, kept low-saturation.
- **FR-APPT-10.** Calendar print-out for end-of-day handover.

### 7.5 Customer Management / CRM (M-CRM)

**Purpose.** A 360° view of every customer with smart segmentation — Total, Active, Churn-Prediction, Defected — and tools to filter, communicate and act.

**Functional Requirements.**
- **FR-CRM-01.** Segment counters: Total Customers, Active Customers, Churn Prediction (Likely to be inactive), Defected Customers (Inactive).
- **FR-CRM-02.** Click any segment to filter the list to that cohort.
- **FR-CRM-03.** Search by Mobile / Customer ID / Email / Name; filter by alphabet; Filter Customer drawer with multi-criteria (last visit, total spend, services taken, tags).
- **FR-CRM-04.** Bulk actions: Send Promotional Offer, Tag/Untag, Export to CSV.
- **FR-CRM-05.** Download Customer Database (subject to HQ permission and audit log).
- **FR-CRM-06.** Customer 360°: profile, visit history, bills, loyalty balance, wallet balance, packages held, communications consent, feedback responses, internal notes, photos.
- **FR-CRM-07.** Two sub-tabs in addition to Customer Segment: Service Segment (cohorts based on services taken) and Upcoming Wishes (birthdays/anniversaries within a window).
- **FR-CRM-08.** Merge duplicate customer records (HQ-only permission).
- **FR-CRM-09.** Customer scoping: a customer belongs to the brand, not the outlet — visible at every outlet, with last-visited-outlet shown.

### 7.6 Campaign Management (M-CAMP)

**Purpose.** Targeted WhatsApp and SMS marketing to drive repeat visits and revenue. Templates, scheduling, deliverability tracking and audience scoping.

**Functional Requirements.**
- **FR-CAMP-01.** Create campaign by channel: WhatsApp, SMS, Email (advanced), Push (advanced).
- **FR-CAMP-02.** Audience selector: any saved CRM segment, custom filter or uploaded list (HQ only).
- **FR-CAMP-03.** WhatsApp templates pre-approved with Meta; merge tags for personalisation (name, last service, loyalty tier).
- **FR-CAMP-04.** Schedule: send now or at a future date/time; respect quiet hours per region.
- **FR-CAMP-05.** Approval workflow (optional): franchisee campaigns ≥ a configurable spend or audience size require HQ approval before send.
- **FR-CAMP-06.** Brand-asset library shared from HQ; franchisees may not upload off-brand creatives.
- **FR-CAMP-07.** Reports: Targeted, Sent, Delivered, Read, Replied, Failed; attribution to bills within X days.
- **FR-CAMP-08.** Recharge & balance visibility for SMS and WhatsApp packs; low-balance banner at top of every page.
- **FR-CAMP-09.** Network-wide campaigns (HQ): one campaign spawns a per-outlet copy so attribution rolls up correctly.

### 7.7 Feedback (M-FBK)

**Purpose.** Capture post-service feedback to power Net Promoter Score, reputation management and operational improvement.

**Functional Requirements.**
- **FR-FBK-01.** Create Form: drag-and-drop question types (rating 1–5, NPS 0–10, single-select, multi-select, free text, photo upload).
- **FR-FBK-02.** Link with Bill: send feedback request automatically when a bill is closed.
- **FR-FBK-03.** Link with Appointment: send when appointment status moves to Completed.
- **FR-FBK-04.** Channel: WhatsApp, SMS, Email, in-customer-app.
- **FR-FBK-05.** Consent List: only customers who have consented (or whose consent is implied by bill linkage) are messaged.
- **FR-FBK-06.** Dashboards: NPS over time, response rate, top complaints, top compliments (with simple keyword grouping).
- **FR-FBK-07.** Closed-loop: a low rating raises a ticket assigned to the outlet manager; HQ has visibility.
- **FR-FBK-08.** Optionally route 5-star feedback to a public review platform (Google Business) via the customer's choice.

### 7.8 Online Booking (M-OBK)

**Purpose.** Public web surface (and integrations into Google, Instagram, Facebook) that lets prospective customers find an outlet and book online — bringing more sales to franchisees with zero local marketing effort.

**Functional Requirements.**
- **FR-OBK-01.** Get Started flow guides the franchisee through preferences, booking links, social posts.
- **FR-OBK-02.** Booking Settings: services offered online, staff selectable, advance window, slot duration, deposit policy, cancellation window.
- **FR-OBK-03.** Booking Links: unique URL per outlet plus QR codes; shareable on WhatsApp, Instagram, Facebook.
- **FR-OBK-04.** Pre-Booking Confirmation toggle: every request requires manual confirmation.
- **FR-OBK-05.** Client Login (optional): registered customers see their profile, history and loyalty balance during booking.
- **FR-OBK-06.** Google Business / Reserve with Google integration.
- **FR-OBK-07.** Public Booking Site has its own minimal theme; all outlets across the brand share a directory page ("Outlets near you").

### 7.9 Lead Management (M-LEAD)

**Purpose.** CRM-lite for prospects who have not yet become customers, with a follow-up engine that prevents leads from going cold.

**Functional Requirements.**
- **FR-LEAD-01.** Capture lead from any source: walk-in enquiry, website form, social, ad campaign, manual entry.
- **FR-LEAD-02.** Fields: name, mobile, source, description, expected service/package, assigned staff.
- **FR-LEAD-03.** Status: New, Contacted, Hold, Need Follow-up, Not Converted, Converted to Customer.
- **FR-LEAD-04.** Schedule follow-up date/time; in-app reminder + WhatsApp/SMS to assignee.
- **FR-LEAD-05.** On Converted: customer record created automatically; the lead activity becomes the customer's pre-history.
- **FR-LEAD-06.** HQ Mode: leads from cross-outlet sources (website, social ads) auto-routed by geography or round-robin.

### 7.10 Multi-Location Management (M-MLM)

**Purpose.** Manage many outlets from one place, with the flexibility to operate at Network level (centralised) or Location level (decentralised) per concern.

**Functional Requirements.**
- **FR-MLM-01.** Two operating models per configurable area: Network Level (e.g., shared SMS pack, shared catalogue) or Location Level (e.g., separate SMS pack, separate catalogue).
- **FR-MLM-02.** Outlet switcher always visible in the top bar (web) and quick-switch sheet (mobile).
- **FR-MLM-03.** HQ users have a "All Locations" pseudo-outlet for consolidated views.
- **FR-MLM-04.** Settings inheritance: outlets inherit from a parent template; overrides are explicitly marked and auditable.
- **FR-MLM-05.** Outlet provisioning checklist surfaces what is missing before go-live.

### 7.11 Reports (M-RPT)

**Purpose.** A curated library of reports plus a flexible explorer for custom analysis. Reports are the system of record for all numerical claims.

**Report Catalogue (minimum set).**
- Sales: Daily, Service-wise, Product-wise, Package-wise, Voucher Redemption.
- Customer: New vs. Repeat, Retention Cohort, Churn, Wishes, Birthday/Anniversary Yield.
- Staff: Sales Performance, Commission Statement, Attendance, Utilisation %, Tip Statement.
- Operations: Appointments (booked/completed/cancelled), No-show, Booking Source.
- Finance: Day-end Cash, Payment Mode breakdown, Outstanding Dues, Refunds, Expenses, Tax (HSN/SAC-wise), Profit & Loss (computed).
- Inventory: Stock-on-hand, Below Re-order, Consumption, Wastage, Vendor-wise Purchase.
- Loyalty: Points Issued, Points Redeemed, Liability, Tier Distribution.
- Franchise (HQ only): Royalty Statement, Marketing Fund, Outstanding to HQ, Network P&L.

**Functional Requirements.**
- **FR-RPT-01.** Every report is filterable by Date, Outlet (one/many/all), Staff, Customer Segment, Channel.
- **FR-RPT-02.** Export PDF (branded) and CSV/XLSX.
- **FR-RPT-03.** Scheduled email/WhatsApp delivery (daily/weekly/monthly) to configured recipients.
- **FR-RPT-04.** Report Builder (advanced): drag-and-drop columns, group-by, filters; save as personal or shared report.
- **FR-RPT-05.** Drill from any report row into the underlying transactions.

### 7.12 Settings (M-SET)

**Purpose.** All configuration grouped into five panels: Account, Business, Data & Migration, Modules, Loyalty, Integrations. Settings are the contract that defines how the platform behaves for each tenant/outlet.

**Sub-modules.**
- **Account:** Plans & Billing, Login Details, SMS Recharge, WhatsApp Recharge, Download Center.
- **Business:** Business Details, Business Locations, Security, Point of Sale, Notifications, Expense Management, Cash Registry, Custom Fields, Miscellaneous Charges, HSN/SAC Code.
- **Data & Migration:** Upload Master Data, Upload Customer Data, Centralized Management.
- **Modules:** Customer Segmentation, Staff, Service, Resource, Appointment, Service Reminder, Online Booking, Product, Package, Membership, Prepaid Wallet, Gift Voucher, Covid-19 (deprecate), Role Settings.
- **Loyalty:** Discount Coupon, Greeting, Reward Point.
- **Integrations:** Google Booking, WhatsApp, SMS/Text Messaging, Payment Gateway, Mailchimp, plus new connectors below.

**Key Functional Requirements.**
- **FR-SET-01.** Role Settings: granular RBAC; HQ defines roles; franchisees may not create roles that exceed their granted permissions.
- **FR-SET-02.** Security: password policy, session timeout, 2FA, IP allow-list (HQ option), audit log retention.
- **FR-SET-03.** Centralised Management: HQ can push catalogue/price updates with effective date; outlets see a diff before activation.
- **FR-SET-04.** Notifications: per-event toggles for Client, Staff, Report, Reminder.
- **FR-SET-05.** Custom Fields on Customer, Staff, Bill, Appointment, Lead.
- **FR-SET-06.** Download Center: exports are queued and emailed; never block the UI.

---

## 8. Advanced Modules (New)

This section introduces the modules that take the platform beyond the existing Waffor scope and turn it into a complete franchise-operating system. Each module is designed to deliver measurable business outcomes and to integrate with the core modules above.

### 8.1 Franchise Management Hub (M-FRH)

**Purpose.** The dedicated HQ workspace where the franchisor onboards franchisees, signs agreements, configures commercials, monitors compliance and manages the network as a portfolio.

**Functional Requirements.**
- **FR-FRH-01.** Franchisee Directory with status (Prospect, Onboarding, Active, Suspended, Terminated).
- **FR-FRH-02.** Agreement Vault: upload contract PDFs, capture key terms (royalty %, marketing %, term length, territory, renewal date) as structured fields.
- **FR-FRH-03.** Outlet Provisioning Wizard: create outlets from template, set hours, tax, hardware, staff seats.
- **FR-FRH-04.** Territory Map: visualise outlets on a map; detect territorial overlaps; route online bookings to the nearest outlet.
- **FR-FRH-05.** Network Health Scorecard per outlet: composite of revenue, customer satisfaction, audit score, financial compliance.
- **FR-FRH-06.** Renewal & Compliance Alerts: contracts nearing renewal, expired licences, missed royalty payments.
- **FR-FRH-07.** Cross-outlet Benchmark Reports: outlet vs. network median, top decile, geo-peers.

### 8.2 Royalty & Revenue-Share Engine (M-ROY)

**Purpose.** Automate the calculation, invoicing, collection and reconciliation of royalties, marketing-fund contributions and any other inter-company fees.

**Functional Requirements.**
- **FR-ROY-01.** Rule engine supports flat %, tiered %, fixed-fee, hybrid; rules versioned with effective dates.
- **FR-ROY-02.** Calculation runs nightly on closed bills; preview screen lets HQ inspect before invoicing.
- **FR-ROY-03.** Auto-generate royalty invoices on the configured cycle (weekly/monthly); send via email + in-app.
- **FR-ROY-04.** Auto-debit via integrated payment gateway / bank mandate (where permitted); manual reconciliation otherwise.
- **FR-ROY-05.** Disputes: franchisee can flag a line item; raises a ticket for HQ resolution; audit trail captured.
- **FR-ROY-06.** Marketing Fund Wallet: contributions credited to a network-level wallet; HQ records spend; statement visible to all contributors.
- **FR-ROY-07.** Statements: monthly statement PDF per franchisee with running balance.

### 8.3 Inventory & Stock Management (M-INV)

**Purpose.** Track products and consumables across outlets and a central warehouse, with automated re-orders and wastage controls.

**Functional Requirements.**
- **FR-INV-01.** Multi-warehouse: HQ central, regional hubs, and outlet-level stock.
- **FR-INV-02.** SKU master with categories, units, batch, expiry; barcodes/QR supported.
- **FR-INV-03.** Inward (Purchase Order → GRN), Outward (Service consumption auto-deduct, Retail sale, Transfer, Wastage).
- **FR-INV-04.** Re-order rules per outlet with min/max and lead-time; auto-generated indents to HQ or vendor.
- **FR-INV-05.** Cycle-count and physical stock-take workflows (mobile-first).
- **FR-INV-06.** Wastage tracking with reason codes and photo evidence.
- **FR-INV-07.** Cost of Goods feed into P&L.

### 8.4 Staff Management — HR, Payroll & Attendance (M-HR)

**Purpose.** Manage the full lifecycle of staff at every outlet — hiring, onboarding, rostering, attendance, performance, payroll preparation and exit.

**Functional Requirements.**
- **FR-HR-01.** Staff profile: KYC documents, role, skills/certifications, joining date, commission scheme, salary structure.
- **FR-HR-02.** Rostering: drag-and-drop weekly roster; constraints (max hours, mandatory off); conflict detection.
- **FR-HR-03.** Attendance via mobile selfie with geo-fence, or biometric device, or NFC; auto-link to payroll.
- **FR-HR-04.** Leave management: types, balances, approval flow.
- **FR-HR-05.** Commissions: configurable schemes (% of service, slabs, product mix); preview, lock, payout.
- **FR-HR-06.** Tips: pooled or individual; payout cycle configurable.
- **FR-HR-07.** Payroll: monthly compute (salary + commissions + tips - deductions); export to bank file or accounting integration.
- **FR-HR-08.** Performance: utilisation %, revenue per staff, repeat-customer %, feedback scores; appraisal templates.
- **FR-HR-09.** Exit checklist: revoke access, settle final dues, archive record.

### 8.5 Loyalty & Rewards 2.0 (M-LOY)

**Purpose.** A modern, tiered loyalty programme that drives retention across the brand — not per outlet.

**Functional Requirements.**
- **FR-LOY-01.** Tiers (e.g., Silver / Gold / Platinum) with thresholds, perks, expiry rules. Tier badge uses the metallic accent.
- **FR-LOY-02.** Earn rules per service category / product; multipliers for off-peak hours, birthday month, etc.
- **FR-LOY-03.** Redeem rules: cap per bill, blacklist services, expiry of points.
- **FR-LOY-04.** Brand-wide balance: points earned at any outlet, redeemable at any outlet; inter-outlet settlement automated.
- **FR-LOY-05.** Vouchers & coupons: code generation, single-use, multi-use, channel-restricted.
- **FR-LOY-06.** Referral programme: refer-a-friend with reward to both parties; trackable referral codes.
- **FR-LOY-07.** Gift Card: purchase, gift, redeem; balance check by mobile or QR.

### 8.6 AI Insights & Recommendations (M-AI)

**Purpose.** Move the platform from descriptive to prescriptive — every screen surfaces what to do, not only what happened.

**Functional Requirements.**
- **FR-AI-01.** Churn Prediction: score every customer on likelihood to churn; surface in CRM with recommended action.
- **FR-AI-02.** Next-Best-Action: per customer, suggest the next service / product / offer based on history and peers.
- **FR-AI-03.** Demand Forecast: appointments and walk-ins forecast per outlet per slot; informs rostering.
- **FR-AI-04.** Smart Pricing: suggest off-peak discounts and peak-hour premiums within HQ-defined corridors.
- **FR-AI-05.** Anomaly Detection: flag unusual cash variance, sudden drop in bills, spike in voids.
- **FR-AI-06.** Outlet Benchmarking: explain why outlet X outperforms Y on a given KPI (feature importance, plain-English).
- **FR-AI-07.** Conversational Assistant: natural-language Q&A over the user's authorised data (e.g., "What was my best service last month?").

### 8.7 Quality Audit & Mystery-Shopper (M-AUD)

**Purpose.** Codify brand standards and verify them through scheduled audits — internal, external and mystery-shopper.

**Functional Requirements.**
- **FR-AUD-01.** Audit templates with weighted checklists; section scores roll up to an outlet score.
- **FR-AUD-02.** Mobile-first conduct: photo evidence per item, geo-tag, signature.
- **FR-AUD-03.** Action items auto-raised for failed criteria; assigned to outlet with due-date.
- **FR-AUD-04.** Audit history per outlet; trend over time.
- **FR-AUD-05.** Mystery-shopper invitation links with anonymised feedback flow.

### 8.8 Training & Knowledge Portal (M-TRN)

**Purpose.** Centralise all SOPs, brand standards and learning content; track who has completed what.

**Functional Requirements.**
- **FR-TRN-01.** Course Builder: upload PDFs, videos, embed YouTube/Vimeo; sequence modules; add quizzes.
- **FR-TRN-02.** Assignment rules: by role, outlet, region, individual.
- **FR-TRN-03.** Mobile playback with offline download.
- **FR-TRN-04.** Certification: pass-mark, expiry, retake rules.
- **FR-TRN-05.** Compliance dashboard: % staff certified per outlet, overdue list.

### 8.9 Internal Communication & Tickets (M-COMM)

**Purpose.** In-app channels and ticketing so that HQ ↔ Franchisee ↔ Staff communication is structured, searchable and audit-friendly.

**Functional Requirements.**
- **FR-COMM-01.** Announcement broadcast (HQ → all/segment of franchisees) with read-receipts.
- **FR-COMM-02.** Outlet group chats (manager + staff).
- **FR-COMM-03.** Ticketing for support requests (e.g., POS issue, royalty dispute, training query) with SLA tracking.
- **FR-COMM-04.** Knowledge-base linked from tickets; suggested articles.

### 8.10 Document Management (M-DOC)

**Purpose.** A single source of truth for legal and operational documents — agreements, licences, NDAs, certificates, ID proofs.

**Functional Requirements.**
- **FR-DOC-01.** Folder structure with permissions per role.
- **FR-DOC-02.** Expiry tracking with reminders (e.g., licence renewals).
- **FR-DOC-03.** E-signature integration (DocuSign / equivalent).
- **FR-DOC-04.** Version history and audit log.

### 8.11 Vendor & Supplier Management (M-VEN)

- **FR-VEN-01.** Vendor master: contacts, GST/tax IDs, payment terms, products supplied, KYC docs.
- **FR-VEN-02.** Purchase Orders, GRNs, returns; three-way match with invoice.
- **FR-VEN-03.** Vendor scorecard: on-time %, quality issues, price competitiveness.
- **FR-VEN-04.** HQ-approved vendor list per category; outlets can only PO from approved vendors unless overridden.

### 8.12 Finance & Accounting Bridge (M-FIN)

- **FR-FIN-01.** Chart of Accounts with mapping rules from bill, expense, payroll, royalty.
- **FR-FIN-02.** Daily journal export to Tally / Zoho Books / QuickBooks via integrations.
- **FR-FIN-03.** Bank reconciliation helpers (paste statement → auto-match).
- **FR-FIN-04.** Outlet-level and consolidated P&L, Balance Sheet (basic), Cash Flow.

### 8.13 Customer Mobile App (B2C) — M-CUST

**Purpose.** A premium-feel customer app that mirrors the brand and reduces dependency on phone calls and walk-ins.

**Functional Requirements.**
- **FR-CUST-01.** Discover: list of outlets by location with distance, hours, rating.
- **FR-CUST-02.** Book: service catalogue, staff selection (optional), time slots, deposit if required.
- **FR-CUST-03.** Manage: upcoming/past bookings, reschedule (within policy), cancel.
- **FR-CUST-04.** Pay: in-app payment for bills and packages.
- **FR-CUST-05.** Wallet: prepaid balance, gift vouchers, loyalty points and tier.
- **FR-CUST-06.** Offers: personalised offers (driven by M-AI), redeemable in-store or in-app.
- **FR-CUST-07.** Feedback: in-app feedback forms; review prompts.
- **FR-CUST-08.** Notifications: appointment reminders, birthday wishes, offer drops, tier milestones.
- **FR-CUST-09.** Refer-a-friend with share-sheet integration.
- **FR-CUST-10.** Profile, family members ("book for"), saved cards.

### 8.14 Reputation & Reviews Aggregator (M-REP)

- **FR-REP-01.** Pull reviews from Google Business Profile, Facebook, Justdial, Yelp into one inbox.
- **FR-REP-02.** Reply from the platform; templates and AI-suggested replies.
- **FR-REP-03.** Sentiment trend and keyword cloud per outlet and across network.
- **FR-REP-04.** Solicit Google reviews post-bill (only from customers who scored ≥4 internally).

### 8.15 Dynamic Offers & Smart Pricing (M-DYN)

- **FR-DYN-01.** Time-of-day pricing: off-peak discounts auto-applied to selected services.
- **FR-DYN-02.** Cohort offers: birthday-month, win-back, anniversary, post-defect.
- **FR-DYN-03.** Flash offers: HQ-published, time-bound, geo-targeted.
- **FR-DYN-04.** Guardrails: HQ-defined min margin and brand rules; system blocks offers that violate.

### 8.16 Notifications & Engagement Center (M-NOT)

- **FR-NOT-01.** Unified preference center per user (channel and event-type).
- **FR-NOT-02.** Push (FCM/APNs), WhatsApp, SMS, Email, In-app, Webhook.
- **FR-NOT-03.** Templated, localised messages; merge tags; preview.
- **FR-NOT-04.** Quiet hours and frequency caps to prevent fatigue.

### 8.17 Activity Log & Audit Trail (M-LOG)

- **FR-LOG-01.** Immutable log of all create/update/delete on financial, customer and configuration entities.
- **FR-LOG-02.** Who, what, when, IP, device, before/after diff.
- **FR-LOG-03.** Search & filter; export for auditors.
- **FR-LOG-04.** Retention configurable, minimum 7 years for financial data.

### 8.18 Two-Factor Auth, SSO & Device Trust (M-SEC)

- **FR-SEC-01.** 2FA via TOTP and SMS; mandatory for HQ and Franchisee Owner roles.
- **FR-SEC-02.** SSO (Google Workspace / Microsoft 365) optional at the HQ level.
- **FR-SEC-03.** Device list per user; revoke remotely.
- **FR-SEC-04.** Suspicious activity detection (impossible travel, new device).

---

## 9. User Roles & Permissions

A precise role and permission model is the foundation of franchise scoping. The model is RBAC (Role-Based Access Control) with attribute-level constraints (ABAC) for cross-tenant scenarios.

### 9.1 Default Roles

| Role | Scope | Indicative Permissions |
|---|---|---|
| Super Admin (Platform-internal) | Cross-tenant (platform) | Tenant provisioning, platform-wide admin; never sees customer PII in plaintext. |
| Franchisor Admin | All HQ + all outlets | Full access; manages roles, agreements, royalties, network campaigns. |
| HQ Manager | All outlets (read), HQ (read/write) | Operational monitoring, audits, training; cannot edit royalty rules. |
| Regional Manager | Outlets in assigned region | Audit, performance, support across a region. |
| Franchisee Owner | All outlets owned | Full operational control over own outlets; cannot edit HQ catalogue. |
| Outlet Manager | Single outlet | POS, appointments, customers, staff, expenses, day-end. |
| Senior Staff / Stylist | Single outlet (own data + customers) | Own calendar, customer notes, mark services done. |
| Staff / Therapist | Single outlet (own data) | Own calendar, attendance, tips. |
| Receptionist | Single outlet | Calendar, billing, customer check-in; no payroll or P&L. |
| Accountant (Franchisee) | Single franchisee | Financial reports, expenses, royalty statements; no PII edit. |
| Customer | Self | Bookings, profile, wallet, reviews — own only. |

### 9.2 Permission Matrix (Indicative)

The full matrix is configured in Role Settings; below is an indicative subset to illustrate the principle. "R" = Read, "W" = Write, "–" = no access.

| Capability | Franchisor | Franchisee | Manager | Staff | Customer |
|---|:---:|:---:|:---:|:---:|:---:|
| View Network Dashboard | R/W | – | – | – | – |
| View Outlet Dashboard | R | R/W | R | R (limited) | – |
| Edit Catalogue & Prices | R/W | – | – | – | – |
| Create Bills | R | R/W | R/W | R/W | – |
| Cancel Bill | R/W | R/W | R/W (with reason) | – | – |
| Manage Royalty Rules | R/W | R | – | – | – |
| Run Network Campaign | R/W | – | – | – | – |
| Run Local Campaign | R | R/W | R/W | – | – |
| View Own Schedule | – | R | R | R/W | – |
| Book Appointment | – | R/W | R/W | R/W | R/W (own) |
| Download Customer DB | R/W | R (own outlets, audited) | – | – | – |
| Edit Loyalty Programme | R/W | – | – | – | – |

### 9.3 Cross-Tenant Visibility (Critical)

- **All Franchisee data is fully visible to HQ.** This is explicit and contractually documented; HQ sees revenue, customers (subject to data-protection law), staff, performance and operational data of every outlet.
- **Franchisee data is NOT visible across franchisees.** A Franchisee A cannot see Franchisee B's outlets, customers, staff or financials.
- **Customer data is brand-wide for the customer's own experience,** but a staff member at outlet X cannot fish across customers who have never visited outlet X without a justified search — every cross-outlet customer lookup is logged.
- **Audit log preserves every cross-outlet read.** Quarterly review by HQ compliance.

---

## 10. Web Application Specification

The Web App is the primary surface for HQ, Franchisee Owners and Outlet Managers. It is a single application that themes itself to the user's role and context.

### 10.1 Navigation Architecture

Persistent left navigation with the following entries (visibility per role):

- Dashboard
- Business Trends
- Quick Sale
- Appointment
- Customers
- Campaigns
- Feedback
- Online Booking
- Lead Management
- Inventory *(new)*
- Staff & HR *(new)*
- Loyalty *(new)*
- Reports
- Franchise Hub *(HQ only, new)*
- Audits *(new)*
- Training *(new)*
- Documents *(new)*
- Vendors *(new)*
- Finance *(new)*
- Reputation *(new)*
- Communication *(new)*
- Settings
- Multi-location

### 10.2 Global UI Elements

- **Top Bar.** Tenant switcher (HQ users), outlet switcher, global search (customer, bill, lead, staff), notifications bell, quick-add (+), help, profile.
- **Quick-Add.** Customer, Appointment, Quick Sale, Lead, Expense — one tap from any screen.
- **Global Search.** Universal search across customers, bills, appointments, staff, leads, products; results grouped by type.
- **Notifications.** Real-time bell with unread count; deep-links to source entity.
- **Recharge Banner.** Persistent low-balance banner for SMS/WhatsApp packs, present in current platform — to be retained.
- **Audit Footer.** Every page has the user's session info and a discreet "Powered by …" footer (rebrandable).

### 10.3 Responsive Behaviour

- **Breakpoints.** ≥1280 desktop (3-column layouts allowed), 1024–1279 laptop, 768–1023 tablet (2-column max), <768 mobile-web (single column, drawer nav).
- **Tablet-First in-store.** Receptionists are expected to use 10–13" tablets; the entire web app must remain fully usable in landscape on a tablet.

### 10.4 Performance Targets

- **First Contentful Paint** ≤ 1.8s on a modern 4G connection.
- **Largest Contentful Paint** ≤ 2.5s.
- **Interaction-to-Next-Paint** ≤ 200ms for primary actions.
- **Bundle** ≤ 350KB gzipped initial route; code-split per module.
- **API** p95 ≤ 400ms for read endpoints, p95 ≤ 800ms for writes (excluding payment/3rd-party hops).

---

## 11. Mobile App — Staff & Manager

A native mobile app for outlet staff, managers and franchisee owners. Optimised for one-handed use in the salon floor, offline tolerant, and biometric-protected.

### 11.1 Surfaces

- **Home.** Today's headline KPIs (manager+); my next appointment (staff); quick actions: New Sale, New Appointment, Check-in, Tip out.
- **Calendar.** Day view default; swipeable to next/prev day; staff filter chip.
- **Quick Sale.** Full POS on mobile; bottom-sheet driven, single-thumb operation; barcode scanner for products.
- **Customers.** Search, 360°, last-visit, notes, photos.
- **Inbox.** Tickets, announcements, mentions.
- **More.** Reports (curated mobile set), audits, training, settings.

### 11.2 Mobile-Specific Capabilities

- **Offline POS.** Last 24h of bills, customers and catalogue cached; mutations queued.
- **Camera.** Customer photos (with explicit consent UI), audit photos, expense receipts (OCR).
- **Barcode/QR.** Product scan, customer ID, gift-voucher redemption.
- **Biometrics.** App-unlock via FaceID/TouchID/Biometric.
- **Push Notifications.** Appointment reminders for staff, ticket updates for managers, broadcasts from HQ.
- **Selfie Attendance.** Geo-fence + selfie clock-in/out; manager approval queue.
- **Tip Out.** End-of-day tip distribution view per staff.
- **Day-end Close.** Cash counted, payment-mode reconciliation; lock-of-day requires manager PIN.

### 11.3 Platform Targets

- **iOS** 16+ (covers ~95% installed base).
- **Android** 10+ (API 29+).
- **Devices** Phone first; tablet layout for managers (iPad/Android tablet) with master-detail.

### 11.4 Performance & Build Constraints

- **Cold start** ≤ 2.5s on mid-range Android (e.g., Pixel 6a equivalent).
- **APK / IPA size** ≤ 60 MB.
- **Crash-free sessions** ≥ 99.5%.
- **Background sync** Battery-aware; never wakes the device unnecessarily.

---

## 12. Customer Mobile App (B2C)

A dedicated app for end customers — the brand in their pocket. Same monochrome design system, with hero photography of services to add warmth. Single app for all outlets across the brand.

### 12.1 Key Flows

1. Onboarding: phone + OTP, optional name, optional location for outlet discovery.
2. Discover: nearby outlets, service catalogue, packages, offers.
3. Book: choose outlet → service → staff (optional) → slot → deposit (if required) → confirm.
4. Pre-arrival: reminder, directions, parking notes, prep instructions.
5. In-store: in-app check-in via QR; bill shows live; pay in-app or at counter.
6. Post-visit: receipt, photos (with consent), feedback, review prompt.
7. Loyalty: balance, tier progress, perks; wishes (birthday, anniversary) auto-celebrated.
8. Wallet: prepaid top-ups, gift cards, share/gift to a friend.
9. Refer & Earn: unique code, share-sheet, track redemptions.

### 12.2 Brand Touches

- **Photography.** Editorial black-and-white photography for hero modules; full-bleed.
- **Micro-copy.** Warm, concise, sentence case; no corporate jargon.
- **Empty states.** Treated as design moments, not error pages.

---

## 13. Non-Functional Requirements

### 13.1 Performance

| Metric | Target |
|---|---|
| API read p95 | ≤ 400 ms |
| API write p95 | ≤ 800 ms |
| Web FCP | ≤ 1.8 s |
| Web LCP | ≤ 2.5 s |
| Mobile cold start | ≤ 2.5 s |
| Mobile crash-free sessions | ≥ 99.5% |
| Dashboard refresh | 60 s for live data |
| Report generation (≤ 100k rows) | ≤ 5 s |
| Bill print/send | ≤ 2 s after Save |

### 13.2 Scalability

- **Target year-1:** 500 outlets, 5,000 daily active users, 200,000 bills/day, 2,000,000 customers.
- **Target year-3:** 5,000 outlets, 50,000 DAU, 2M bills/day, 20M customers.
- **Horizontal scaling** for all stateless services; database read-replicas for reporting; warehouse for heavy analytics.

### 13.3 Availability

- **Uptime SLA.** 99.9% monthly for core (POS, Appointments, Auth); 99.5% for reporting and integrations.
- **Graceful degradation.** Non-essential services (campaigns, analytics) may be degraded without affecting POS.
- **Multi-region.** Primary in country of operation; DR in a second region with ≤ 1h RPO, ≤ 4h RTO.

### 13.4 Security

- **Encryption.** TLS 1.2+ in transit; AES-256 at rest. Field-level encryption for PII (name, mobile, email, ID numbers).
- **Authentication.** OAuth 2.0 / OIDC; password policy enforced; 2FA for elevated roles; SSO optional.
- **Secrets.** Managed via Vault / cloud KMS; no secrets in code, repo or images.
- **Pen-test.** External pen-test annually and pre-major-release.
- **Vulnerability mgmt.** Automated scanning of dependencies and containers; SLA: critical ≤ 7 days, high ≤ 30 days.
- **Logging.** Centralised, tamper-resistant; PII redacted in app logs.
- **Data export.** Customer & franchisee can request data export per privacy law.

### 13.5 Privacy & Compliance

- **Personal Data.** Treated under DPDP Act (India) and GDPR-equivalent best practice.
- **Consent.** Explicit consent capture for marketing communication; revocable at any time.
- **Data Subject Rights.** Access, rectification, deletion (right to be forgotten) supported within 30 days.
- **Retention.** Financial 7 years; marketing communications 2 years; customer profile until deletion request.
- **Tax.** GST / HSN-SAC compliant invoices.

### 13.6 Reliability & Observability

- **Health Checks.** Per service; surfaced in an internal status page.
- **Tracing.** OpenTelemetry across services.
- **Alerting.** p95 latency, error rate, queue depth, job failure; paged via on-call rotation.
- **Runbooks.** For every alert; reviewed quarterly.

### 13.7 Maintainability

- **Code quality.** Lint, format, type-check enforced in CI; coverage ≥ 75% on critical services.
- **Documentation.** API spec via OpenAPI; ADRs for major decisions; user-facing docs in a public help centre.
- **Feature flags.** All new modules behind flags; per-tenant rollout.
- **Migrations.** Backward-compatible DB migrations; no downtime deploys.

---

## 14. Integrations

### 14.1 Required Integrations (Day 1)

| Category | Provider(s) | Use |
|---|---|---|
| Payment Gateway | Razorpay, Stripe, PayU, Cashfree | In-app payments, refunds, mandates. |
| UPI / QR | Razorpay UPI, BharatQR | In-store payment, QR-at-counter. |
| WhatsApp Business API | Meta via WATI / Gupshup / Twilio | Reminders, campaigns, OTP, feedback links. |
| SMS Gateway | Twilio, Gupshup, MSG91 | OTP, reminders, low-priority comms. |
| Email | SendGrid, Amazon SES | Receipts, statements, marketing. |
| Push | Firebase Cloud Messaging, APNs | Native push notifications. |
| Google Business Profile | Google | Listings, Reserve with Google, reviews. |
| Maps | Google Maps / Mapbox | Outlet discovery, routing. |
| Auth | Google, Apple | Customer SSO. |
| E-signature | DocuSign / Leegality / equivalent | Franchise agreements, KYC. |

### 14.2 Phase-2 Integrations

| Category | Provider(s) |
|---|---|
| Accounting | Tally, Zoho Books, QuickBooks, Xero |
| Marketing | Mailchimp, Klaviyo |
| Reviews Aggregator | Birdeye / Reputation.com |
| Inventory / Procurement | Optional ERP bridge |
| BI | Looker, Power BI, Metabase (read-only DW) |

### 14.3 Public API & Webhooks

- **Public API** v1 — REST + OpenAPI; rate-limited per tenant; scoped tokens (read/write per resource).
- **Webhooks** for: `bill.created`, `bill.refunded`, `appointment.created/updated`, `customer.created`, `lead.converted`, `royalty.invoiced`.
- **Sandbox** with seeded data for partners.

### 14.4 Conflict Resolution for Offline Sync

1. Server is source of truth for catalogue and pricing — local mutations cannot override.
2. Bills: client-issued local IDs; on sync, server assigns canonical IDs; client maps.
3. Concurrent edits to the same resource (e.g., appointment): last-write-wins by server timestamp, with a conflict log surfaced to the manager.
4. Stock: optimistic decrement client-side; server applies authoritative deduction on sync; underflows are flagged for review.

---

## 15. Reporting & Analytics

Reports are split into Operational (real-time, transactional) and Analytical (warehouse-backed).

### 15.1 Operational Reports

- Served from primary OLTP replicas.
- Limited to the current and recent periods (≤ 90 days).
- Used inside live operational screens (Dashboard, Reports list).

### 15.2 Analytical Reports

- Served from the data warehouse, refreshed every 15 minutes (configurable).
- Multi-year history, cohorts, predictive models.
- Surfaced in the Insights tab of each module and in the AI Assistant.

### 15.3 Data Warehouse Model

- **Star schema.** Fact: Bills, BillLines, Appointments, LoyaltyTxns, Payroll, Inventory Moves. Dim: Customer, Service, Product, Staff, Outlet, Franchisee, Time, Channel.
- **Identity.** Slowly Changing Dimension Type 2 for Outlet and Service (so historical reports remain truthful when prices change).
- **Access.** Read-only via BI tools; no PII columns exposed without explicit permission.

### 15.4 KPI Catalogue (Selected)

| KPI | Definition | Owner |
|---|---|---|
| GMV | Sum of all bill totals before refunds | HQ / Franchisee |
| Net Revenue | GMV − Refunds − Discounts | HQ / Franchisee |
| Average Bill Value | Net Revenue ÷ Bill Count | Franchisee / Manager |
| Bills per Hour | Bills ÷ Operating Hours | Manager |
| Staff Utilisation % | Booked Hours ÷ Available Hours | Manager |
| Repeat Rate | Customers with ≥2 visits ÷ Total Customers | Franchisee |
| Retention (90-day) | % of customers who return within 90 days | Franchisee |
| NPS | % Promoters − % Detractors | HQ / Franchisee |
| Loyalty Liability | Σ unredeemed point value | HQ |
| Royalty Collected | Σ royalty invoices paid ÷ Σ raised | HQ |

---

## 16. Data Model — Core Entities

A high-level catalogue of the principal entities; relationships are noted but the full ERD lives in the technical design document. All entities carry `tenant_id`, created/updated timestamps and soft-delete metadata. Money fields are stored in minor units (paise) with currency code; quantities use Decimal.

| Entity | Key Fields | Notes |
|---|---|---|
| Tenant | id, name, type (HQ/Franchisee), parent_id | Hierarchical. |
| Outlet | id, tenant_id, name, address, geo, hours, timezone | Physical location. |
| User | id, name, email, mobile, status, mfa | Cross-tenant via Membership. |
| Membership | user_id, tenant_id, outlet_id, role_id | Multi-tenant access. |
| Role | id, tenant_id, name, permissions[] | RBAC. |
| Customer | id, brand_id, name, mobile (unique per brand), tags[] | Brand-wide. |
| Service | id, brand_id, name, duration, price, hsn | Brand catalogue. |
| Product (SKU) | id, brand_id, name, sku, barcode, unit | Brand catalogue. |
| Package | id, brand_id, items[], price, validity | Brand catalogue. |
| Voucher | id, brand_id, type, value, expiry | Brand catalogue. |
| Appointment | id, outlet_id, customer_id, items[], status | Per outlet. |
| Bill | id, outlet_id, customer_id, lines[], totals, payments[] | Per outlet. |
| LoyaltyTxn | id, customer_id, points, type (earn/redeem/expire) | Brand-wide. |
| Staff | id, outlet_id, user_id, role, skills[], commission_scheme | Per outlet. |
| StockMove | id, outlet_id, sku_id, qty, type, reason | Per outlet. |
| RoyaltyInvoice | id, franchisee_id, period, lines[], total, status | HQ ↔ Franchisee. |
| AuditLog | id, actor_id, action, entity, before, after, ip | Immutable. |

---

## 17. Phased Roadmap

Delivery is structured in four phases. Each phase ends with a usable, sellable release. Estimated durations are indicative for an experienced team of ~10.

### 17.1 Phase 0 — Foundations (Weeks 1–6)

- Cloud accounts, environments, CI/CD, observability.
- Identity, multi-tenancy, RBAC, audit log.
- Design system v1 (Black & White luxury), component library.
- Tenant onboarding admin & sandbox tenant.

### 17.2 Phase 1 — Outlet MVP (Weeks 7–22)

- Dashboard, Quick Sale (POS), Appointments, Customers, Settings (basics), Reports (essential).
- Online Booking site, Lead Management.
- Staff app v1: calendar, attendance, my customers.
- Integrations: WhatsApp, SMS, Payment Gateway.
- **Outcome:** 5 pilot outlets fully operational on the new platform.

### 17.3 Phase 2 — Franchise Engine (Weeks 23–36)

- Franchise Management Hub, Royalty Engine.
- Multi-location, Centralised Management, Network Campaigns.
- Inventory v1, Staff/HR v1, Loyalty 2.0.
- Customer Mobile App v1.
- **Outcome:** First franchisees onboarded with automated royalty; customer app live.

### 17.4 Phase 3 — Intelligence & Reach (Weeks 37–52)

- AI Insights (churn, NBA, demand forecast), Smart Pricing.
- Quality Audit, Training Portal, Reputation Aggregator.
- Finance/Accounting bridge, Vendor Management.
- Public API & Webhooks v1.
- **Outcome:** Network operates as a data-driven, brand-consistent system.

### 17.5 Post-launch (Continuous)

- Localisation for additional regions/languages.
- Hardware integrations (biometric devices, label printers, cash drawers).
- Marketplace for third-party plug-ins.
- Quarterly UX research and design refresh.

---

## 18. Success Metrics

The platform is measured against three classes of metrics: Adoption (do users use it?), Operational (does it run reliably?) and Business (does it move the needle?).

### 18.1 Adoption

| Metric | Target (Year 1) |
|---|---|
| % bills created via new POS (vs. workaround) | ≥ 98% |
| % staff using mobile app weekly | ≥ 90% |
| % customers booking via online/customer app | ≥ 40% |
| % appointments confirmed within SLA | ≥ 95% |
| % outlets passing weekly data-hygiene check | ≥ 90% |

### 18.2 Operational

| Metric | Target |
|---|---|
| Core uptime | ≥ 99.9% |
| P1 incidents per month | ≤ 1 |
| Mean Time to Recovery (P1) | ≤ 60 min |
| Customer support tickets per outlet per month | ≤ 3 |
| Audit findings closed within SLA | ≥ 90% |

### 18.3 Business Outcomes

| Metric | Target |
|---|---|
| Same-outlet revenue growth (LFL) | ≥ +15% |
| 90-day customer retention | ≥ +20% vs. baseline |
| Royalty collection accuracy | ≥ 99.5% |
| Royalty days-sales-outstanding | ≤ 7 days |
| NPS network-wide | ≥ 60 |

---

## 19. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Franchisee resistance to centralised oversight | Medium | High | Clear contractual terms; transparency on what HQ sees; opt-in advanced sharing; data-protection guarantees. |
| POS downtime during peak hours | Low | Very High | Offline POS; multi-region failover; pre-peak chaos drills. |
| Royalty disputes due to calculation errors | Medium | High | Versioned rule engine; preview before invoicing; dispute workflow with full audit trail. |
| Data privacy violation (cross-outlet customer access) | Low | Very High | Strict row-level security; logged cross-outlet reads; quarterly compliance review. |
| Integration provider outage (WhatsApp / Payment) | Medium | Medium | Multi-provider abstraction; automatic failover; queued retry. |
| Scope creep delaying MVP | High | Medium | Strict phase gates; new requests routed to backlog with phase tags. |
| Vendor lock-in to specific cloud | Low | Medium | Standard services where possible; containerised workloads; portable IaC. |
| Adoption fatigue from too many modules at once | Medium | Medium | Per-tenant feature flags; in-product onboarding; opt-in advanced modules. |
| Staff app misuse (selfie attendance fraud) | Medium | Medium | Geo-fence + liveness check; periodic random photo prompts; manager review queue. |
| Localisation gaps in new regions | Medium | Medium | i18n from day one; locale-aware formatting; in-product translator workflow. |

---

## 20. Recommended Technology Stack

The choices below are recommendations, not mandates; the engineering team may adapt within the spirit of the principles in Section 5.

### 20.1 Front-End

- **Web.** React + TypeScript, Next.js (App Router) for routing/SSR; Tailwind CSS configured with the design tokens in Section 6; Headless UI for accessible primitives; TanStack Query for data; Recharts/Visx for monochrome charts.
- **Mobile (Staff/Manager).** React Native with TypeScript and Expo for shared codebase; OR native Swift + Kotlin if native quality is a hard requirement.
- **Customer App.** Same approach as Staff; brand-led typography and photography overlay.

### 20.2 Back-End

- **Language.** TypeScript (Node.js / NestJS) or Go for performance-critical services.
- **API.** REST primary, GraphQL gateway optional for client-aggregating reads.
- **Data.** PostgreSQL 16 with row-level security; Redis for cache & session; ElasticSearch / OpenSearch for search; ClickHouse or BigQuery for warehouse.
- **Events.** Kafka or AWS SNS+SQS; outbox pattern for transactional reliability.
- **Storage.** S3-compatible; signed URLs only.

### 20.3 Platform / DevOps

- **Cloud.** AWS (preferred) or GCP — pick one and commit; multi-AZ; managed services where possible.
- **Containers.** Docker + Kubernetes (EKS/GKE) for production; serverless for ad-hoc workloads.
- **CI/CD.** GitHub Actions or GitLab CI; trunk-based development; preview environments per PR.
- **IaC.** Terraform; environment parity enforced.
- **Observability.** OpenTelemetry; Datadog OR Grafana/Loki/Tempo/Prometheus.

### 20.4 Security

- **Identity.** Auth0 / AWS Cognito / Keycloak; OIDC.
- **Secrets.** Vault or AWS Secrets Manager.
- **WAF / DDoS.** Cloudflare or AWS WAF + Shield.
- **SAST/DAST.** GitHub Advanced Security / Snyk; nightly DAST in staging.

---

## 21. Acceptance Criteria — Examples

Acceptance criteria are written in Given/When/Then format and attached to every story. Below is a representative sample to set the bar.

### 21.1 Quick Sale — Create Bill

- **Given** I am an Outlet Manager on the Quick Sale screen, and a customer with mobile 98xxxxxx is selected,
- **When** I add two services, choose Cash payment for ₹1,000 and UPI for ₹500, and press Checkout,
- **Then** the bill is saved with status "Closed", a receipt is generated, loyalty points are credited per the brand rule, an invoice number per the outlet sequence is assigned, and the bill appears in today's Dashboard within 60 seconds.

### 21.2 Appointment — No-Show Handling

- **Given** an appointment scheduled for 14:00 today,
- **When** the start time passes by 15 minutes and no check-in has been recorded,
- **Then** the appointment moves to "No-show" automatically, the assigned staff is freed up in the calendar, and a configurable WhatsApp message is sent to the customer with a re-book CTA.

### 21.3 Royalty — Monthly Invoice

- **Given** a franchisee with royalty rule "7% of monthly net revenue, billed monthly on the 1st",
- **When** the month closes,
- **Then** a royalty invoice is generated by 06:00 on the 1st, sent to the franchisee, visible in their Settings → Plans & Billing, and a corresponding receivable is recorded in HQ Finance. Disputes raised within 7 days pause auto-debit.

### 21.4 Multi-Location — SMS Pack Sharing

- **Given** Multi-Location is configured at Network Level for SMS,
- **When** any outlet sends an SMS,
- **Then** the cost is debited from the shared HQ SMS wallet, and the per-outlet usage report continues to attribute the message to the originating outlet for audit.

---

## 22. Out of Scope (for V1)

The following are explicitly out of scope for the first major release; they may be considered for later phases.

- Full-blown accounting (ledger, balance sheet beyond basic) — accounting bridge to external tools is provided instead.
- Manufacturer-grade inventory (BOM, MRP run, lot recalls).
- E-commerce / direct retail sales beyond gift cards and prepaid wallets.
- Native desktop apps (Windows/macOS) — the web app covers desktop use.
- White-label re-skin for third-party brands.
- Cryptocurrency payments.
- Custom hardware (own POS terminal devices).
- Telephony (cloud call-centre) integration.

---

## 23. Open Questions

Items requiring stakeholder decision before development of the corresponding module begins.

1. **Royalty calculation basis** — gross bill value, net revenue (excluding tax), or service-only revenue?
2. **Customer data ownership** — does the franchisee "own" their local customer book, or is it brand-owned with usage rights to the franchisee? Affects exit/termination.
3. **Loyalty across franchisees** — is point-redemption value uniform, or does each franchisee fund the rebate locally?
4. **Pricing flexibility** — can franchisees price below MRP if HQ does not object, or is pricing strictly controlled?
5. **Mobile stack** — is React Native acceptable, or do brand expectations demand fully native iOS/Android?
6. **Hardware policy** — does HQ supply biometric devices and printers, or list approved models with franchisees procuring?
7. **Data residency** — is data required to remain within a specific country / region?
8. **Customer app** — single brand-wide app, or per-region apps in different stores?

---

## 24. Glossary

| Term | Definition |
|---|---|
| HQ | Head Office / Franchisor — the corporate entity that owns the brand and operates the central platform. |
| Franchisee | An independent operator licensed to run one or more outlets under the brand. |
| Outlet / Location | A single physical premises where services are delivered. |
| Tenant | A logical container of data and configuration in the platform — HQ is one tenant, each franchisee is another. |
| Brand-wide | Data scoped to the entire network rather than a single outlet (e.g., customer record, loyalty balance). |
| Royalty | The fee paid by a franchisee to HQ, typically a percentage of revenue. |
| Marketing Fund | A pooled fund contributed to by franchisees, used by HQ for network marketing. |
| NBA | Next-Best-Action — an AI recommendation for what to offer a customer next. |
| NPS | Net Promoter Score — % Promoters minus % Detractors based on 0–10 likelihood-to-recommend. |
| LFL | Like-for-Like — comparing the same outlets in two periods, excluding new and closed outlets. |
| GMV | Gross Merchandise Value — total bill value before refunds, taxes treatment per definition. |
| RBAC | Role-Based Access Control. |
| ABAC | Attribute-Based Access Control — finer-grained scoping based on attributes of user and resource. |
| SLA | Service-Level Agreement. |
| DSR | Data Subject Rights — privacy-law rights of an individual over their data. |

---

## Document End

This Product Requirements Document is the single source of truth for V1 of the Multi-Franchise Business Management Platform. Any change to scope, behaviour or business rule documented here is to be tracked via a Change Request approved by Product, Engineering and the Franchisor sponsor. Subsequent technical design documents will reference this PRD by section number.

*— End of Document —*