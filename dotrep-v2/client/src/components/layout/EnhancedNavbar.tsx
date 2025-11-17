import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Bell, 
  Settings, 
  User, 
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield
} from 'lucide-react';
import { useEnhancedTheme, type Theme, type ColorScheme } from '@/contexts/EnhancedThemeContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

const EnhancedNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme, colorScheme, setColorScheme, resolvedTheme } = useEnhancedTheme();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDisconnect = async () => {
    await logout();
    setIsUserMenuOpen(false);
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', current: location === '/dashboard' },
    { name: 'Reputation', href: '/reputation', current: location === '/reputation' },
    { name: 'Connect', href: '/connect', current: location === '/connect' },
    { name: 'Proof Explorer', href: '/proof-explorer', current: location === '/proof-explorer' },
    { name: 'Telemetry', href: '/telemetry', current: location === '/telemetry' },
  ];

  const themeOptions: { id: Theme; name: string; icon: string }[] = [
    { id: 'light', name: 'Light', icon: '☀️' },
    { id: 'dark', name: 'Dark', icon: '🌙' },
    { id: 'system', name: 'System', icon: '💻' },
  ];

  const colorSchemes: { id: ColorScheme; name: string; class: string }[] = [
    { id: 'blue', name: 'Blue', class: 'bg-blue-500' },
    { id: 'purple', name: 'Purple', class: 'bg-purple-500' },
    { id: 'green', name: 'Green', class: 'bg-green-500' },
    { id: 'orange', name: 'Orange', class: 'bg-orange-500' },
  ];

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-8">
            <Link href="/">
              <a className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  DotRep
                </span>
              </a>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href}>
                  <a
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      item.current
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    {item.name}
                  </a>
                </Link>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8 hidden lg:block">
            <div className={cn(
              "relative transition-all duration-200",
              isSearchFocused ? "scale-105" : "scale-100"
            )}>
              <Search className={cn(
                "absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200",
                isSearchFocused 
                  ? "text-blue-500" 
                  : "text-gray-400"
              )} size={20} />
              <input
                type="text"
                placeholder="Search contributions, users, or addresses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Theme & Color Picker */}
            <div className="hidden md:flex items-center space-x-2 border-r border-gray-200 dark:border-gray-700 pr-4">
              {/* Theme Toggle */}
              <div className="relative">
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                  className="appearance-none bg-transparent border-none text-sm focus:outline-none focus:ring-0 cursor-pointer"
                >
                  {themeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.icon} {option.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" size={16} />
              </div>

              {/* Color Scheme */}
              <div className="flex items-center space-x-1">
                {colorSchemes.map((scheme) => (
                  <button
                    key={scheme.id}
                    onClick={() => setColorScheme(scheme.id)}
                    className={cn(
                      "w-3 h-3 rounded-full transition-transform duration-200",
                      scheme.class,
                      colorScheme === scheme.id && "ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600 scale-110"
                    )}
                    title={scheme.name}
                  />
                ))}
              </div>
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
            </button>

            {/* User Menu */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <ChevronDown 
                    size={16} 
                    className={cn(
                      "transition-transform duration-200",
                      isUserMenuOpen && "rotate-180"
                    )} 
                  />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
                    >
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email || 'No email'}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <Link href="/dashboard">
                          <a
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <User size={16} className="mr-3" />
                            Your Profile
                          </a>
                        </Link>
                        <Link href="/dashboard">
                          <a
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Settings size={16} className="mr-3" />
                            Settings
                          </a>
                        </Link>
                      </div>

                      {/* Disconnect */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                        <button
                          onClick={handleDisconnect}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                        >
                          <LogOut size={16} className="mr-3" />
                          Disconnect
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/connect">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  Connect Wallet
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden border-t border-gray-200 dark:border-gray-700"
            >
              <div className="py-4 space-y-2">
                {navigation.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <a
                      className={cn(
                        "block px-4 py-2 rounded-lg text-base font-medium transition-colors duration-200",
                        item.current
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </a>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default EnhancedNavbar;


