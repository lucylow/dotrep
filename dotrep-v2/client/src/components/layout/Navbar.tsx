import { Link, useLocation } from "wouter";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useMobile";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Home", path: "/" },
    { label: "Docs", path: "/docs" },
  ];

  const isActive = (path: string) => location === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/60 dark:border-gray-700/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2 text-[#6C3CF0] hover:text-[#A074FF] transition-smooth group">
              <Shield className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-xl font-extrabold">DotRep</span>
            </a>
          </Link>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="flex items-center gap-6" aria-label="Main navigation">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <a
                    className={`text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#6C3CF0] focus:ring-offset-2 rounded-md px-2 py-1 ${
                      isActive(item.path)
                        ? "text-[#6C3CF0]"
                        : "text-[#4F4F4F] hover:text-[#6C3CF0]"
                    }`}
                    aria-current={isActive(item.path) ? "page" : undefined}
                  >
                    {item.label}
                  </a>
                </Link>
              ))}
              <Link href="/dashboard">
                <Button 
                  className="btn-primary px-6 py-2 focus:outline-none focus:ring-2 focus:ring-[#6C3CF0] focus:ring-offset-2"
                  aria-label="Open application dashboard"
                >
                  Open App
                </Button>
              </Link>
            </nav>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#131313] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6C3CF0] focus:ring-offset-2 rounded-md"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
        </div>

        {/* Mobile Menu */}
        {isMobile && mobileMenuOpen && (
          <div 
            id="mobile-menu"
            className="pb-4 border-t border-gray-200/60 mt-2"
            role="menu"
            aria-label="Mobile navigation menu"
          >
            <div className="flex flex-col gap-4 pt-4">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <a
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#6C3CF0] focus:ring-offset-2 rounded-md px-2 py-1 ${
                      isActive(item.path)
                        ? "text-[#6C3CF0]"
                        : "text-[#4F4F4F] hover:text-[#6C3CF0]"
                    }`}
                    role="menuitem"
                    aria-current={isActive(item.path) ? "page" : undefined}
                  >
                    {item.label}
                  </a>
                </Link>
              ))}
              <Link href="/dashboard">
                <Button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full bg-gradient-to-r from-[#6C3CF0] to-[#A074FF] text-white rounded-xl py-2 shadow-[0_4px_14px_rgba(108,60,240,0.25)] focus:outline-none focus:ring-2 focus:ring-[#6C3CF0] focus:ring-offset-2"
                  role="menuitem"
                >
                  Open App
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}


