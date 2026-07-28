"use client";
import { signOut } from "@/app/auth/actions";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-charcoal hover:bg-pearl rounded-[4px] transition-colors"
      >
        <LogOut className="h-4 w-4 text-grey" />
        Sign out
      </button>
    </form>
  );
}
