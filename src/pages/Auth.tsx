/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Mail, Lock, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { auth, db } from '@/src/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/src/components/ui/Toast';

interface AuthProps {
  mode: 'login' | 'register';
}

const Auth = ({ mode }: AuthProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const { showToast, ToastContainer } = useToast();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          role: user.email === 'michintashop@gmail.com' ? 'admin' : 'user',
          accountStatus: 'active',
          createdAt: serverTimestamp(),
        });
        showToast('Đăng ký thành công!', 'success');
        navigate('/profile/complete');
      } else {
        // Check profile for ban before proceeding
        const profileDocRef = doc(db, 'profiles', user.uid);
        const profileDoc = await getDoc(profileDocRef);
        
        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          if (profileData.bannedUntil) {
            const bannedUntil = new Date(profileData.bannedUntil);
            if (bannedUntil > new Date()) {
              await auth.signOut();
              showToast(`Tài khoản của bạn đã bị cấm cho đến ${bannedUntil.toLocaleString()}.`, 'error');
              setIsLoading(false);
              return;
            }
          }
        }

        showToast('Đăng nhập thành công!', 'success');
        navigate('/explore');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      showToast(error.message || 'Đã có lỗi xảy ra khi đăng nhập', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Vui lòng sử dụng Đăng nhập bằng Google để tiếp tục.', 'info');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f3f3] p-6">
      <ToastContainer />
      {/* Background Gradients */}
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#ff5a7a10] blur-[100px]" />
      <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#8a14d110] blur-[100px]" />

      <div className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-[40px] bg-white shadow-2xl lg:flex-row">
        {/* Left Side: Info */}
        <div className="relative flex flex-col justify-between bg-gradient-to-br from-[#ff5a7a] to-[#8a14d1] p-12 text-white lg:w-1/2">
          <div className="relative z-10">
            <Link to="/" className="mb-12 flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                <Heart className="h-5 w-5 text-white fill-current" />
              </div>
              <span className="text-xl font-bold tracking-tight">VietConnect KR</span>
            </Link>

            <h2 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight">
              {mode === 'login' ? 'Chào mừng bạn quay trở lại!' : 'Bắt đầu hành trình kết nối của bạn'}
            </h2>
            <p className="mb-8 text-lg text-white/80 leading-relaxed">
              {mode === 'login' 
                ? 'Đăng nhập để tiếp tục khám phá những hồ sơ phù hợp và tham gia các sự kiện cộng đồng.' 
                : 'Tạo tài khoản để kết nối với cộng đồng người Việt văn minh, an toàn tại Hàn Quốc.'}
            </p>

            <div className="space-y-6">
              {[
                { icon: ShieldCheck, text: 'Hồ sơ được duyệt kỹ lưỡng' },
                { icon: Sparkles, text: 'Kết nối dựa trên sở thích' },
                { icon: Heart, text: 'Hẹn hò nghiêm túc & an toàn' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-12 text-sm text-white/60">
            © 2026 VietConnect KR. All rights reserved.
          </div>

          {/* Decorative Circle */}
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </div>

        {/* Right Side: Form */}
        <div className="flex flex-col justify-center p-12 lg:w-1/2">
          <div className="mb-10">
            <h1 className="mb-2 text-3xl font-bold text-slate-900">
              {mode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}
            </h1>
            <p className="text-slate-500">
              {mode === 'login' 
                ? 'Nhập thông tin tài khoản của bạn để tiếp tục.' 
                : 'Chỉ mất 30 giây để bắt đầu kết nối.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email"
              type="email"
              placeholder="name@example.com"
              required
            />
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              required
            />
            {mode === 'register' && (
              <Input
                label="Xác nhận mật khẩu"
                type="password"
                placeholder="••••••••"
                required
              />
            )}

            <Button variant="gradient" size="lg" className="w-full" isLoading={isLoading} type="submit">
              {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="mx-4 flex-shrink text-xs font-bold uppercase tracking-widest text-slate-400">Hoặc</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <Button
              variant="outline"
              size="lg"
              className="w-full rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              onClick={handleGoogleSignIn}
              type="button"
              disabled={isLoading}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="mr-3 h-5 w-5" />
              {mode === 'login' ? 'Đăng nhập với Google' : 'Đăng ký với Google'}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>
                Chưa có tài khoản?{' '}
                <Link to="/register" className="font-bold text-[#ff5a7a] hover:underline">
                  Đăng ký ngay
                </Link>
              </>
            ) : (
              <>
                Đã có tài khoản?{' '}
                <Link to="/login" className="font-bold text-[#ff5a7a] hover:underline">
                  Đăng nhập
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
