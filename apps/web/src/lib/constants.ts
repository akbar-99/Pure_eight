export const ROLES = {
  FRANCHISOR_ADMIN: "franchisor_admin",
  HQ_MANAGER: "hq_manager",
  REGIONAL_MANAGER: "regional_manager",
  FRANCHISEE_OWNER: "franchisee_owner",
  OUTLET_MANAGER: "outlet_manager",
  SENIOR_STAFF: "senior_staff",
  STAFF: "staff",
  RECEPTIONIST: "receptionist",
  ACCOUNTANT: "accountant",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const HQ_ROLES: Role[] = [
  ROLES.FRANCHISOR_ADMIN,
  ROLES.HQ_MANAGER,
  ROLES.REGIONAL_MANAGER,
];

export const APPOINTMENT_STATUSES = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CHECKED_IN: "checked_in",
  IN_SERVICE: "in_service",
  COMPLETED: "completed",
  NO_SHOW: "no_show",
  CANCELLED: "cancelled",
} as const;

export const BILL_STATUSES = {
  OPEN: "open",
  PARKED: "parked",
  CLOSED: "closed",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
  VOID: "void",
} as const;

export const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "wallet", label: "Wallet" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "prepaid_wallet", label: "Prepaid Wallet" },
  { value: "gift_voucher", label: "Gift Voucher" },
  { value: "loyalty_points", label: "Loyalty Points" },
] as const;

export const LOYALTY_TIERS = {
  STANDARD: "standard",
  SILVER: "silver",
  GOLD: "gold",
  PLATINUM: "platinum",
} as const;

export const NAV_ITEMS = [
  { href: "/dashboard/overview",      label: "Dashboard",       icon: "LayoutDashboard" },
  { href: "/dashboard/trends",        label: "Business Trends", icon: "TrendingUp"      },
  { href: "/dashboard/pos",           label: "Quick Sale",      icon: "ShoppingCart"    },
  { href: "/dashboard/appointments",  label: "Appointments",    icon: "Calendar"        },
  { href: "/dashboard/customers",     label: "Customers",       icon: "Users"           },
  { href: "/dashboard/campaigns",     label: "Campaigns",       icon: "Megaphone"       },
  { href: "/dashboard/offers",        label: "Offers",          icon: "Tag"             },
  { href: "/dashboard/feedback",      label: "Feedback",        icon: "Star"            },
  { href: "/dashboard/reputation",    label: "Reputation",      icon: "ThumbsUp"        },
  { href: "/dashboard/customer-app",  label: "Customer App",    icon: "Smartphone"      },
  { href: "/dashboard/online-booking",label: "Online Booking",  icon: "Globe"           },
  { href: "/dashboard/leads",         label: "Leads",           icon: "UserPlus"        },
  { href: "/dashboard/inventory",     label: "Inventory",       icon: "Package"         },
  { href: "/dashboard/staff",         label: "Staff & HR",      icon: "UserCheck"       },
  { href: "/dashboard/staff-app",     label: "Staff App",       icon: "TabletSmartphone"},
  { href: "/dashboard/loyalty",       label: "Loyalty",         icon: "Gift"            },
  { href: "/dashboard/communication", label: "Communication",   icon: "MessageSquare"   },
  { href: "/dashboard/ai-insights",   label: "AI Insights",     icon: "Sparkles"        },
  { href: "/dashboard/reports",       label: "Reports",         icon: "BarChart2"       },
  { href: "/dashboard/settings",      label: "Settings",        icon: "Settings"        },
];

export const HQ_ONLY_NAV_ITEMS = [
  { href: "/dashboard/franchise-hub",  label: "Franchise Hub",    icon: "Building2"      },
  { href: "/dashboard/multi-location", label: "Multi-Location",   icon: "MapPin"         },
  { href: "/dashboard/audits",         label: "Audits",           icon: "ClipboardCheck" },
  { href: "/dashboard/training",       label: "Training",         icon: "BookOpen"       },
  { href: "/dashboard/documents",      label: "Documents",        icon: "FileText"       },
  { href: "/dashboard/vendors",        label: "Vendors",          icon: "Truck"          },
  { href: "/dashboard/finance",        label: "Finance",          icon: "DollarSign"     },
  { href: "/dashboard/offline-pos",    label: "Offline POS",      icon: "WifiOff"        },
  { href: "/dashboard/biometric",      label: "Biometric",        icon: "Fingerprint"    },
];
