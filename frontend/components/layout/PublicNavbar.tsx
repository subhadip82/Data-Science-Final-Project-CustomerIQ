"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Moon, Sun, Bell, Menu, X, ChevronDown, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { NotificationPopover } from "@/components/layout/NotificationPopover";

const publicNavLinks = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Resources", hasDropdown: true },
];

export function PublicNavbar() {
  const { isSignedIn, isLoaded } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        "bg-[#0A0D1D]/90 backdrop-blur-md border-b border-white/[0.08]"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="flex items-end gap-1 h-6">
              <span className="w-1.5 h-3 rounded-full bg-[#6366F1]" />
              <span className="w-1.5 h-4.5 rounded-full bg-[#A855F7]" />
              <span className="w-1.5 h-6 rounded-full bg-[#EC4899]" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">
              Customer<span className="text-white">IQ</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {publicNavLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1",
                    isActive
                      ? "bg-[#1E2540] text-white border border-white/10 shadow-inner"
                      : "text-white/70 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  {link.label}
                  {link.hasDropdown && <ChevronDown className="w-3 h-3 text-white/50" />}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Sun/Moon Capsule Switch */}
            <div className="hidden sm:flex items-center bg-[#13192F] border border-white/10 rounded-full p-0.5">
              <button
                onClick={() => setTheme("light")}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                  mounted && theme === "light"
                    ? "bg-[#252E4E] text-amber-400 shadow"
                    : "text-white/40 hover:text-white"
                )}
                aria-label="Light mode"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                  mounted && theme === "dark"
                    ? "bg-[#3B82F6] text-white shadow-md shadow-blue-500/50"
                    : "text-white/40 hover:text-white"
                )}
                aria-label="Dark mode"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoaded && !isSignedIn && (
              <>
                <Link
                  href="/login"
                  className="px-4 py-1.5 rounded-full text-xs font-semibold text-white/90 hover:text-white border border-white/20 hover:bg-white/10 transition-all"
                >
                  Login
                </Link>
                <Link
                  href="/sign-up"
                  className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-[#5B4DF6] to-[#7B42F6] hover:opacity-95 transition-all shadow-md shadow-indigo-500/25 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Sign Up
                </Link>
              </>
            )}

            {isLoaded && isSignedIn && (
              <>
                <NotificationPopover />
                <Link
                  href="/app"
                  className="hidden sm:flex px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-[#5B4DF6] to-[#7B42F6] hover:opacity-95 transition-all shadow-md shadow-indigo-500/25 items-center gap-1"
                >
                  Dashboard →
                </Link>
                <UserButton />
              </>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-white/10 mt-2 pt-4 animate-fade-in bg-[#0A0D1D]">
            {publicNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 rounded-lg text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors mb-1"
              >
                {link.label}
              </Link>
            ))}
            {isLoaded && !isSignedIn && (
              <div className="flex gap-2 mt-3 px-2">
                <Link href="/login" className="flex-1 px-4 py-2 rounded-full text-xs font-semibold border border-white/20 text-center text-white hover:bg-white/10 transition-colors">Login</Link>
                <Link href="/sign-up" className="flex-1 px-4 py-2 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-[#5B4DF6] to-[#7B42F6] text-center hover:opacity-95 transition-opacity">Sign Up</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
