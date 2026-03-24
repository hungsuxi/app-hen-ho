/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, Briefcase, Heart, Camera, ShieldCheck, Sparkles, Settings, LogOut, Edit3, ChevronRight, ShieldAlert, XCircle, Facebook, Instagram, MessageCircle, Lock } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Avatar } from '@/src/components/ui/Avatar';
import { cn, calculateAge, isProfileLocked } from '@/src/lib/utils';
import { useAuthStore } from '@/src/store/useAuthStore';
import { auth, db, handleFirestoreError, OperationType } from '@/src/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '@/src/types';

import { useToast } from '@/src/components/ui/Toast';

const Profile = () => {
  const { uid } = useParams();
  const { user, profile: myProfile, isLoading: isMyProfileLoading } = useAuthStore();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [otherProfile, setOtherProfile] = React.useState<UserProfile | null>(null);
  const [isOtherProfileLoading, setIsOtherProfileLoading] = React.useState(!!uid);

  const profile = uid ? otherProfile : myProfile;
  const isLoading = uid ? isOtherProfileLoading : isMyProfileLoading;
  const isAdmin = user?.role === 'admin';
  const lockStatus = isProfileLocked(profile?.lastSubmittedAt);

  React.useEffect(() => {
    if (!uid) return;

    const fetchOtherProfile = async () => {
      try {
        const docRef = doc(db, 'profiles', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOtherProfile(docSnap.data() as UserProfile);
        } else {
          setOtherProfile(null);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `profiles/${uid}`);
      } finally {
        setIsOtherProfileLoading(false);
      }
    };

    fetchOtherProfile();
  }, [uid]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f3f3] pt-32 pb-20">
        <div className="container mx-auto max-w-4xl px-6">
          <Skeleton className="h-64 w-full rounded-[40px]" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f7f3f3] pt-32 pb-20">
        <div className="container mx-auto max-w-4xl px-6 text-center">
          <Card className="p-12">
            <h2 className="mb-4 text-2xl font-bold">Bạn chưa hoàn thiện hồ sơ</h2>
            <Button onClick={() => navigate('/profile/complete')}>Hoàn thiện ngay</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3f3] pt-32 pb-20">
      <ToastContainer />
      <div className="container mx-auto max-w-4xl px-6">
        {/* Profile Status Banner */}
        {profile?.approvalStatus !== 'approved' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mb-8 flex items-center gap-4 rounded-3xl p-6 shadow-sm border-l-4",
              profile?.approvalStatus === 'pending_review' 
                ? "bg-amber-50 border-amber-500 text-amber-800"
                : "bg-red-50 border-red-500 text-red-800"
            )}
          >
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              profile?.approvalStatus === 'pending_review' ? "bg-amber-100" : "bg-red-100"
            )}>
              {profile?.approvalStatus === 'pending_review' ? (
                <ShieldAlert className="h-6 w-6" />
              ) : (
                <XCircle className="h-6 w-6" />
              )}
            </div>
            <div>
              <h3 className="font-bold">
                {profile?.approvalStatus === 'pending_review' 
                  ? 'Hồ sơ đang chờ duyệt' 
                  : 'Hồ sơ bị từ chối'}
              </h3>
              <p className="text-sm opacity-90">
                {profile?.approvalStatus === 'pending_review'
                  ? 'Admin đang kiểm duyệt hồ sơ của bạn. Quá trình này thường mất tối đa 24h.'
                  : 'Hồ sơ của bạn không đáp ứng tiêu chuẩn cộng đồng. Vui lòng cập nhật lại thông tin.'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Profile Header Card */}
        <Card className="mb-8 overflow-hidden p-0 border-none shadow-sm">
          <div className="h-32 bg-gradient-to-r from-[#ff5a7a] to-[#8a14d1]" />
          <div className="relative px-8 pb-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:gap-8 -mt-12">
              <div className="relative">
                <Avatar src={profile.avatarUrl} size="xl" className="border-4 border-white shadow-lg" />
                <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-md hover:bg-slate-50 transition-all">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="mb-2 flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
                  <h1 className="text-3xl font-extrabold text-slate-900">{profile.fullName}</h1>
                  {profile.approvalStatus === 'approved' && (
                    <Badge variant="success" className="rounded-full">
                      <ShieldCheck className="mr-1 h-3 w-3" /> Đã xác thực
                    </Badge>
                  )}
                  {profile.approvalStatus === 'pending_review' && (
                    <Badge variant="warning" className="rounded-full">
                      Đang chờ duyệt
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-slate-500 sm:justify-start">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.koreanRegion}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    <span>{profile.occupation}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl bg-white"
                  onClick={() => showToast('Tính năng cài đặt đang được phát triển.', 'info')}
                >
                  <Settings className="mr-2 h-4 w-4" /> Cài đặt
                </Button>
                <Button 
                  variant="gradient" 
                  size="sm" 
                  className={cn("rounded-xl", lockStatus.locked && !isAdmin && "opacity-50 cursor-not-allowed")}
                  onClick={() => {
                    if (lockStatus.locked && !isAdmin) {
                      showToast(`Hồ sơ đang bị khóa. Bạn có thể sửa lại sau ${lockStatus.remainingDays} ngày nữa.`, 'info');
                      return;
                    }
                    navigate('/profile/complete');
                  }}
                >
                  {lockStatus.locked && !isAdmin ? <Lock className="mr-2 h-4 w-4" /> : <Edit3 className="mr-2 h-4 w-4" />} 
                  Sửa hồ sơ
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-sm">
              <h2 className="mb-6 text-xl font-bold text-slate-900">Giới thiệu</h2>
              <p className="text-slate-600 leading-relaxed">{profile.bio}</p>
            </Card>

            <Card className="border-none shadow-sm">
              <h2 className="mb-6 text-xl font-bold text-slate-900">Thông tin chi tiết</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {[
                  { label: 'Tuổi', value: calculateAge(profile.birthYear) },
                  { label: 'Giới tính', value: profile.gender === 'male' ? 'Nam' : 'Nữ' },
                  { label: 'Quê quán', value: profile.hometownVn },
                  { label: 'Chiều cao', value: `${profile.heightCm} cm` },
                  { label: 'Mục tiêu', value: profile.datingGoal === 'serious' ? 'Hẹn hò nghiêm túc' : profile.datingGoal },
                  { label: 'Công việc', value: profile.occupation },
                  { label: 'Tôn giáo', value: profile.religion || 'Không có' },
                  { label: 'MBTI', value: profile.mbti || 'Chưa cập nhật' },
                  { label: 'Hút thuốc', value: profile.smoking === 'yes' ? 'Có' : profile.smoking === 'sometimes' ? 'Thỉnh thoảng' : 'Không' },
                  { label: 'Uống rượu', value: profile.drinking === 'often' ? 'Thường xuyên' : profile.drinking === 'sometimes' ? 'Thỉnh thoảng' : 'Không' },
                  { label: 'Mong muốn', value: profile.partnerPreference || 'Chưa cập nhật' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <span className="text-sm font-medium text-slate-400">{item.label}</span>
                    <span className="font-bold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-none shadow-sm">
              <h2 className="mb-6 text-xl font-bold text-slate-900">Sở thích</h2>
              <div className="flex flex-wrap gap-3">
                {profile && Array.isArray(profile.hobbies) ? (profile.hobbies as string[]).map((hobby: string) => (
                  <Badge key={hobby} variant="secondary" className="rounded-xl px-4 py-2 text-xs font-bold">
                    {hobby.trim()}
                  </Badge>
                )) : profile && typeof profile.hobbies === 'string' ? (profile.hobbies as string).split(',').map((hobby: string) => (
                  <Badge key={hobby} variant="secondary" className="rounded-xl px-4 py-2 text-xs font-bold">
                    {hobby.trim()}
                  </Badge>
                )) : null}
              </div>
            </Card>

            {(profile.facebookUrl || profile.zaloNumber || profile.instagramUrl) && (
              <Card className="border-none shadow-sm">
                <h2 className="mb-6 text-xl font-bold text-slate-900">Thông tin liên lạc</h2>
                <div className="flex flex-wrap gap-4">
                  {profile.facebookUrl && (
                    <a href={profile.facebookUrl.startsWith('http') ? profile.facebookUrl : `https://${profile.facebookUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600 transition-all hover:bg-blue-100">
                      <Facebook className="h-4 w-4" /> Facebook
                    </a>
                  )}
                  {profile.zaloNumber && (
                    <a href={`https://zalo.me/${profile.zaloNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600 transition-all hover:bg-emerald-100">
                      <MessageCircle className="h-4 w-4" /> Zalo: {profile.zaloNumber}
                    </a>
                  )}
                  {profile.instagramUrl && (
                    <a href={profile.instagramUrl.startsWith('http') ? profile.instagramUrl : `https://${profile.instagramUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-2xl bg-pink-50 px-4 py-2 text-sm font-bold text-pink-600 transition-all hover:bg-pink-100">
                      <Instagram className="h-4 w-4" /> Instagram
                    </a>
                  )}
                </div>
              </Card>
            )}

            {profile.photoUrls && profile.photoUrls.length > 0 && (
              <Card className="border-none shadow-sm">
                <h2 className="mb-6 text-xl font-bold text-slate-900">Album ảnh</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {profile.photoUrls.map((url, idx) => (
                    <div key={idx} className="aspect-square overflow-hidden rounded-3xl border border-slate-100">
                      <img src={url} alt={`Album ${idx}`} className="h-full w-full object-cover transition-transform hover:scale-110" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Account & Support */}
          <div className="space-y-8">
            <Card className="border-none shadow-sm">
              <h2 className="mb-6 text-xl font-bold text-slate-900">Tài khoản</h2>
              <div className="space-y-4">
                <button className="flex w-full items-center justify-between rounded-2xl p-4 transition-all hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">Xác thực danh tính</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
                <button className="flex w-full items-center justify-between rounded-2xl p-4 transition-all hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">Gói Premium</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-[#ff5a7a05] to-[#8a14d105] border-none shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-900">Hỗ trợ</h2>
              <p className="mb-6 text-sm text-slate-500 leading-relaxed">
                Nếu bạn gặp bất kỳ khó khăn nào trong quá trình sử dụng, hãy liên hệ với chúng tôi.
              </p>
              <Button variant="outline" className="w-full rounded-xl bg-white">
                Gửi yêu cầu hỗ trợ
              </Button>
            </Card>

            <Button variant="ghost" className="w-full rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
