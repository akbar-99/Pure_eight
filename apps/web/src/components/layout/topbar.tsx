"use client";

import { Bell, Search, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { QuickAddMenu } from "@/components/layout/quick-add-menu";
import { useState, useRef, useEffect } from "react";

interface TopbarProps {
  userName?: string;
  userRole?: string;
  outletName?: string;
  outlets?: { id: string; name: string }[];
  onOutletChange?: (outletId: string) => void;
}

export function Topbar({
  userName,
  userRole,
  outletName,
  outlets = [],
  onOutletChange,
}: TopbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-silver flex-shrink-0">
      {/* Left: Outlet switcher */}
      <div className="flex items-center gap-3">
        {outlets.length > 1 ? (
          <button className="flex items-center gap-1.5 text-sm font-medium text-charcoal hover:text-black transition-colors">
            <span>{outletName ?? "All Outlets"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-grey" />
          </button>
        ) : (
          <span className="text-sm font-medium text-charcoal">{outletName}</span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <Button variant="ghost" size="icon-sm" aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>

        {/* Quick Add */}
        <QuickAddMenu />

        {/* Notifications */}
        <div className="relative">
          <Button variant="ghost" size="icon-sm" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-black" />
        </div>

        {/* Profile + dropdown */}
        <div className="relative ml-1" ref={dropdownRef}>
          <button
            className="flex items-center gap-2"
            onClick={() => setProfileOpen((prev) => !prev)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <Avatar name={userName} size="sm" />
            {userName && (
              <span className="text-sm font-medium text-charcoal hidden md:block">
                {userName?.split(" ")[0]}
              </span>
            )}
            <ChevronDown className="h-3 w-3 text-grey hidden md:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-silver rounded-[8px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] py-1 z-50">
              {/* User info */}
              <div className="px-3 py-2 border-b border-pearl">
                <p className="text-sm font-medium text-charcoal truncate">{userName}</p>
                {userRole && (
                  <p className="text-xs text-grey capitalize mt-0.5">
                    {userRole.replace(/_/g, " ")}
                  </p>
                )}
              </div>

              {/* Sign out */}
              <div className="py-1">
                <SignOutButton />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
