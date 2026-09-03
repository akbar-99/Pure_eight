"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, TrendingUp, ShoppingCart, Calendar, Users,
  Megaphone, Star, Globe, UserPlus, Package, UserCheck, Gift,
  BarChart2, Settings, Building2, ClipboardCheck, BookOpen,
  FileText, Truck, DollarSign, ChevronLeft, ChevronRight,
  ThumbsUp, MessageSquare, Sparkles, Tag, MapPin,
  Smartphone, TabletSmartphone, WifiOff, Fingerprint, Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, HQ_ONLY_NAV_ITEMS } from "@/lib/constants";
import { PureEightLogo, PureEightMark } from "@/components/ui/pure-eight-logo";
import { useState } from "react";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, TrendingUp, ShoppingCart, Calendar, Users,
  Megaphone, Star, Globe, UserPlus, Package, UserCheck, Gift,
  BarChart2, Settings, Building2, ClipboardCheck, BookOpen,
  FileText, Truck, DollarSign, ThumbsUp, MessageSquare, Sparkles,
  Tag, MapPin, Smartphone, TabletSmartphone, WifiOff, Fingerprint, Receipt,
};

interface SidebarProps {
  role?: string;
  outletName?: string;
  brandName?: string;
}

export function Sidebar({ role, outletName, brandName = "Pure Eight" }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isHQ = ["franchisor_admin", "hq_manager", "regional_manager"].includes(role ?? "");
  const navItems = isHQ ? [...NAV_ITEMS, ...HQ_ONLY_NAV_ITEMS] : NAV_ITEMS;

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-black text-white border-r border-graphite transition-all duration-200 flex-shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand */}
      <div className={cn(
        "flex items-center gap-2 h-14 border-b border-graphite flex-shrink-0",
        collapsed ? "justify-center px-2" : "px-4"
      )}>
        {collapsed ? (
          /* Collapsed: just the double-oval mark */
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center"
            aria-label="Expand sidebar"
          >
            <PureEightMark size={28} color="light" />
          </button>
        ) : (
          /* Expanded: full logo + outlet name + collapse button */
          <>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <PureEightLogo width={132} color="light" className="block" />
              {outletName && (
                <p className="text-[11px] leading-none text-silver truncate">{outletName}</p>
              )}
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded text-silver hover:text-white hover:bg-graphite transition-colors flex-shrink-0"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-none">
        <ul role="list" className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-[4px] text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white text-black"
                      : "text-silver hover:text-white hover:bg-graphite",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-graphite">
          <p className="text-xs text-grey capitalize">{role?.replace(/_/g, " ")}</p>
        </div>
      )}
    </aside>
  );
}
