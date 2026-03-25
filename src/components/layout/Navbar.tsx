/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { Heart, Users, Calendar, MessageCircle, User, LogOut, ShieldCheck, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/src/store/useAuthStore';
import { auth } from '@/src/firebase';
import { signOut } from 'firebase/auth';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { user, profile, logout } = useAuthStore();
  const isRejected = profile?.approvalStatus === 'rejected';

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { label: 'Khám phá', path: '/explore', icon: Heart, public: true, restricted: true },
    { label: 'Sự kiện', path: '/events', icon: Calendar, public: true, restricted: true },
    { label: 'Match', path: '/matches', icon: Users, public: false, restricted: true },
    { label: 'Chat', path: '/chat', icon: MessageCircle, public: false, restricted: true },
    { label: 'Hồ sơ', path: '/profile', icon: User, public: false, restricted: false },
  ];

  const filteredNavItems = navItems.filter(item => item.public || user);

  const isAdmin = user?.email === 'michintashop@gmail.com' || user?.role === 'admin';

  return (
    <header
      className={cn(
        'fixed left-1/2 z-50 w-[95%] sm:w-[90%] max-w-5xl -translate-x-1/2 transition-all duration-300',
        isScrolled 
          ? 'bottom-6 top-auto sm:top-4 sm:bottom-auto' 
          : 'top-6 bottom-auto'
      )}
    >
      <nav
        className={cn(
          'flex items-center justify-between rounded-full bg-white/90 px-4 sm:px-6 py-2 sm:py-3 shadow-lg backdrop-blur-md border border-white/20',
          isScrolled && 'shadow-xl'
        )}
      >
        <Link to="/" className={cn("items-center gap-2", isScrolled ? "hidden sm:flex" : "flex")}>
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[#ff5a7a] to-[#8a14d1] flex items-center justify-center">
            <Heart className="h-4 w-4 text-white fill-current" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 hidden sm:block">
            VietConnect <span className="text-[#ff5a7a]">KR</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isDisabled = isRejected && item.restricted;

            if (isDisabled) {
              return (
                <div
                  key={item.path}
                  className="flex items-center gap-1 sm:gap-2 rounded-full px-2 sm:px-4 py-2 text-sm font-medium text-slate-300 cursor-not-allowed opacity-50 grayscale blur-[0.5px]"
                  title="Hồ sơ của bạn đã bị từ chối. Vui lòng cập nhật lại thông tin."
                >
                  <item.icon className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="hidden xl:block whitespace-nowrap">{item.label}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'relative flex items-center gap-1 sm:gap-2 rounded-full px-2 sm:px-4 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-[#ff5a7a]' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-full bg-[#ff5a7a15]"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden xl:block whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
          
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                'relative flex items-center gap-1 sm:gap-2 rounded-full px-2 sm:px-4 py-2 text-sm font-medium transition-colors',
                location.pathname === '/admin' ? 'text-[#8a14d1]' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {location.pathname === '/admin' && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-full bg-[#8a14d115]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <ShieldCheck className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden xl:block whitespace-nowrap">Admin</span>
            </Link>
          )}
        </div>

        {user ? (
          <button 
            onClick={handleLogout}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            title="Đăng xuất"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : (
          <Link 
            to="/login"
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#ff5a7a] text-white hover:bg-[#ff4a6a] transition-colors"
            title="Đăng nhập"
          >
            <LogIn className="h-4 w-4" />
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
