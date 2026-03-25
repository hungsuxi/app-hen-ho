/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Users, Calendar, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { cn } from '@/src/lib/utils';

import { useAuthStore } from '@/src/store/useAuthStore';

const Home = () => {
  const { profile } = useAuthStore();
  const isRejected = profile?.approvalStatus === 'rejected';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f3f3]">
      {/* Background Gradients */}
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#ff5a7a10] blur-[100px]" />
      <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#8a14d110] blur-[100px]" />

      <main className="container relative mx-auto px-4 sm:px-6 pt-24 sm:pt-40 pb-20">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs sm:text-sm font-medium text-[#ff5a7a] shadow-sm backdrop-blur-sm border border-white/20"
          >
            <Sparkles className="h-4 w-4" />
            <span>Kết nối cộng đồng người Việt tại Hàn Quốc</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 sm:mb-8 max-w-4xl text-3xl font-extrabold tracking-tight text-slate-900 sm:text-7xl"
          >
            Tìm kiếm <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff5a7a] to-[#8a14d1]">tình yêu</span> & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8a14d1] to-[#ff5a7a]">tri kỷ</span> đích thực
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 sm:mb-12 max-w-2xl text-base text-slate-600 sm:text-xl"
          >
            VietConnect KR là nền tảng hẹn hò và meetup an toàn, nghiêm túc dành riêng cho người Việt tại Hàn Quốc. Mọi hồ sơ đều được duyệt kỹ lưỡng.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <Link to="/register">
              <Button variant="gradient" size="lg" className="w-full sm:w-auto">
                Bắt đầu ngay <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            {isRejected ? (
              <div
                className="w-full sm:w-auto cursor-not-allowed"
                title="Hồ sơ của bạn đã bị từ chối. Vui lòng cập nhật lại thông tin."
              >
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/50 backdrop-blur-sm opacity-50 grayscale blur-[0.5px] pointer-events-none">
                  Khám phá hồ sơ
                </Button>
              </div>
            ) : (
              <Link to="/explore">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/50 backdrop-blur-sm">
                  Khám phá hồ sơ
                </Button>
              </Link>
            )}
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="mt-32 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Hồ sơ thật 100%',
              desc: 'Mọi tài khoản đều phải trải qua quy trình duyệt hồ sơ nghiêm ngặt từ đội ngũ admin.',
              icon: ShieldCheck,
              color: 'text-blue-500',
              bg: 'bg-blue-50',
            },
            {
              title: 'Match & Chat',
              desc: 'Chỉ khi cả hai cùng quan tâm, bạn mới có thể bắt đầu cuộc trò chuyện riêng tư.',
              icon: Heart,
              color: 'text-rose-500',
              bg: 'bg-rose-50',
            },
            {
              title: 'Sự kiện Offline',
              desc: 'Tham gia các buổi meetup, workshop, dã ngoại để kết nối trực tiếp ngoài đời thực.',
              icon: Calendar,
              color: 'text-amber-500',
              bg: 'bg-amber-50',
            },
            {
              title: 'Cộng đồng văn minh',
              desc: 'Môi trường kết nối lịch sự, tôn trọng và hỗ trợ lẫn nhau trong cuộc sống tại Hàn.',
              icon: Users,
              color: 'text-emerald-500',
              bg: 'bg-emerald-50',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
            >
              <Card className="h-full border-none bg-white/60 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-md">
                <div className={cn('mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl', feature.bg, feature.color)}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-slate-900">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-20 sm:mt-32 rounded-[32px] sm:rounded-[40px] bg-gradient-to-br from-[#ff5a7a] to-[#8a14d1] p-8 sm:p-12 text-white shadow-2xl">
          <div className="grid gap-8 sm:gap-12 text-center sm:grid-cols-3">
            <div>
              <div className="mb-1 sm:mb-2 text-3xl sm:text-5xl font-extrabold">5,000+</div>
              <div className="text-sm sm:text-lg font-medium opacity-80">Thành viên đã duyệt</div>
            </div>
            <div>
              <div className="mb-1 sm:mb-2 text-3xl sm:text-5xl font-extrabold">1,200+</div>
              <div className="text-sm sm:text-lg font-medium opacity-80">Cặp đôi đã match</div>
            </div>
            <div>
              <div className="mb-1 sm:mb-2 text-3xl sm:text-5xl font-extrabold">150+</div>
              <div className="text-sm sm:text-lg font-medium opacity-80">Sự kiện đã tổ chức</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-32 border-t border-slate-200 pt-12">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff5a7a] to-[#8a14d1] text-white shadow-lg">
                  <Heart className="h-6 w-6 fill-current" />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900">VietConnect KR</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Nền tảng hẹn hò và meetup an toàn, nghiêm túc dành riêng cho cộng đồng người Việt tại Hàn Quốc.
              </p>
            </div>
            <div>
              <h4 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-900">Khám phá</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><Link to="/explore" className="hover:text-[#ff5a7a] transition-colors">Tìm kiếm hồ sơ</Link></li>
                <li><Link to="/events" className="hover:text-[#ff5a7a] transition-colors">Sự kiện Offline</Link></li>
                <li><Link to="/matches" className="hover:text-[#ff5a7a] transition-colors">Tương hợp của tôi</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-900">Hỗ trợ</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a href="#" className="hover:text-[#ff5a7a] transition-colors">Trung tâm trợ giúp</a></li>
                <li><a href="#" className="hover:text-[#ff5a7a] transition-colors">Quy tắc cộng đồng</a></li>
                <li><a href="#" className="hover:text-[#ff5a7a] transition-colors">Chính sách bảo mật</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-900">Liên hệ</h4>
              <p className="text-sm text-slate-500">
                Email: support@vietconnectkr.com<br />
                Seoul, South Korea
              </p>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-100 py-8 text-center text-xs text-slate-400">
            © 2026 VietConnect KR. All rights reserved.
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Home;
