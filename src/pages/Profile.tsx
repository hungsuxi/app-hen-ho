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
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '@/src/types';

import { useToast } from '@/src/components/ui/Toast';

const Profile = () => {
  const { uid } = useParams();
  const { user, profile: myProfile, isLoading: isMyProfileLoading } = useAuthStore();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [otherProfile, setOtherProfile] = React.useState<UserProfile | null>(null);
  const [isOtherProfileLoading, setIsOtherProfileLoading] = React.useState(!!uid);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const albumInputRef = React.useRef<HTMLInputElement>(null);
  const [currentAlbumIndex, setCurrentAlbumIndex] = React.useState<number | null>(null);

  const isOwnProfile = !uid || uid === user?.uid;
  const profile = isOwnProfile ? myProfile : otherProfile;
  const isLoading = isOwnProfile ? isMyProfileLoading : isOtherProfileLoading;
  const isAdmin = user?.role === 'admin';
  const lockStatus = isProfileLocked(profile?.lastSubmittedAt);

  React.useEffect(() => {
    if (isOwnProfile) return;

    const profileRef = doc(db, 'profiles', uid);
    const unsubscribe = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        setOtherProfile(snap.data() as UserProfile);
      } else {
        setOtherProfile(null);
      }
      setIsOtherProfileLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `profiles/${uid}`);
      setIsOtherProfileLoading(false);
    });

    return () => unsubscribe();
  }, [uid, isOwnProfile]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 1024 * 1024) {
      showToast('Ảnh quá lớn. Vui lòng chọn ảnh dưới 1MB.', 'error');
      return;
    }

    setIsUpdatingAvatar(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          avatarUrl: base64,
          updatedAt: serverTimestamp(),
        });
        
        // Update local state
        if (myProfile) {
          useAuthStore.getState().setProfile({ ...myProfile, avatarUrl: base64 });
        }
        showToast('Cập nhật ảnh đại diện thành công!', 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `profiles/${user.uid}`);
      } finally {
        setIsUpdatingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAlbumPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !myProfile || currentAlbumIndex === null) return;

    if (file.size > 1024 * 1024) {
      showToast('Ảnh quá lớn. Vui lòng chọn ảnh dưới 1MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const newPhotoUrls = [...(myProfile.photoUrls || [])];
        // Ensure array has enough slots
        while (newPhotoUrls.length <= currentAlbumIndex) {
          newPhotoUrls.push('');
        }
        newPhotoUrls[currentAlbumIndex] = base64;
        
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          photoUrls: newPhotoUrls,
          updatedAt: serverTimestamp(),
        });
        
        useAuthStore.getState().setProfile({ ...myProfile, photoUrls: newPhotoUrls });
        showToast('Cập nhật ảnh album thành công!', 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `profiles/${user.uid}`);
      } finally {
        setCurrentAlbumIndex(null);
      }
    };
    reader.readAsDataURL(file);
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
    <div className="min-h-screen bg-[#f7f3f3] pt-20 sm:pt-32 pb-24 sm:pb-20">
      <ToastContainer />
      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        {/* Profile Status Banner */}
        {profile?.approvalStatus !== 'approved' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-3xl p-5 sm:p-6 shadow-sm border-l-4",
              profile?.approvalStatus === 'pending_review' 
                ? "bg-amber-50 border-amber-500 text-amber-800"
                : "bg-red-50 border-red-500 text-red-800"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full shrink-0",
              profile?.approvalStatus === 'pending_review' ? "bg-amber-100" : "bg-red-100"
            )}>
              {profile?.approvalStatus === 'pending_review' ? (
                <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {profile?.approvalStatus === 'pending_review' 
                  ? 'Hồ sơ đang chờ duyệt' 
                  : 'Hồ sơ bị từ chối'}
              </h3>
              <p className="text-xs sm:text-sm opacity-90">
                {profile?.approvalStatus === 'pending_review'
                  ? 'Admin đang kiểm duyệt hồ sơ của bạn. Quá trình này thường mất tối đa 24h.'
                  : 'Hồ sơ của bạn không đáp ứng tiêu chuẩn cộng đồng. Vui lòng cập nhật lại thông tin.'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Profile Header Card */}
        <Card className="mb-6 sm:mb-8 overflow-hidden p-0 border-none shadow-sm rounded-3xl sm:rounded-[40px]">
          <div className="h-20 sm:h-32 bg-gradient-to-r from-[#ff5a7a] to-[#8a14d1]" />
          <div className="relative px-4 sm:px-8 pb-6 sm:pb-8">
            <div className="flex flex-col items-center md:flex-row md:items-center md:justify-between gap-6 -mt-10 md:-mt-16">
              <div className="flex flex-col items-center md:flex-row md:items-center gap-4 md:gap-8 w-full md:w-auto">
                <div className="relative shrink-0">
                  <Avatar src={profile.avatarUrl} size="xl" className="h-24 w-24 md:h-40 md:w-40 border-4 border-white shadow-xl" />
                  {isOwnProfile && (
                    <>
                      <input 
                        type="file" 
                        ref={avatarInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                      <button 
                        className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-md hover:bg-slate-50 transition-all disabled:opacity-50 border border-slate-100"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUpdatingAvatar}
                      >
                        {isUpdatingAvatar ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </button>
                    </>
                  )}
                </div>
                <div className="text-center md:text-left">
                  <div className="mb-3 flex flex-col items-center gap-2 md:flex-row md:gap-4 md:items-center">
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">{profile.fullName}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      {(() => {
                        const now = new Date().getTime();
                        const lastActive = profile.lastActiveAt?.toDate?.()?.getTime() || 0;
                        const diff = now - lastActive;
                        const isOnline = diff < 10 * 60 * 1000;

                        if (isOnline) {
                          return (
                            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold text-white shadow-sm shadow-emerald-200 whitespace-nowrap">
                              <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                              <span>ĐANG HOẠT ĐỘNG</span>
                            </div>
                          );
                        }

                        if (!lastActive) return null;

                        const minutes = Math.floor(diff / (60 * 1000));
                        const hours = Math.floor(minutes / 60);
                        const days = Math.floor(hours / 24);

                        let timeStr = '';
                        if (days > 0) timeStr = `${days} ngày trước`;
                        else if (hours > 0) timeStr = `${hours} giờ trước`;
                        else if (minutes > 0) timeStr = `${minutes} phút trước`;
                        else timeStr = 'vừa xong';

                        return (
                          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500 whitespace-nowrap">
                            <span>HOẠT ĐỘNG {timeStr.toUpperCase()}</span>
                          </div>
                        );
                      })()}
                      {profile.approvalStatus === 'approved' && (
                        <div className="flex items-center gap-1.5 rounded-full bg-blue-500 px-3 py-1 text-[10px] font-bold text-white shadow-sm shadow-blue-200 whitespace-nowrap">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>ĐÃ XÁC THỰC</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 md:gap-6 text-xs md:text-base font-semibold text-slate-500 md:justify-start">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-[#ff5a7a]" />
                      <span>{profile.koreanRegion}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-[#8a14d1]" />
                      <span>{profile.occupation}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-full md:w-auto gap-3 justify-center md:justify-end mt-4 md:mt-0">
                <Button 
                  variant="outline" 
                  className="flex-1 md:flex-none rounded-2xl bg-white h-11 md:h-12 px-6 font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
                  onClick={() => showToast('Tính năng cài đặt đang được phát triển.', 'info')}
                >
                  <Settings className="mr-2 h-5 w-5" /> Cài đặt
                </Button>
                <Button 
                  variant="gradient" 
                  className={cn("flex-1 md:flex-none rounded-2xl h-11 md:h-12 px-6 font-bold shadow-lg shadow-[#ff5a7a20]", lockStatus.locked && !isAdmin && "opacity-50 cursor-not-allowed")}
                  onClick={() => {
                    if (lockStatus.locked && !isAdmin) {
                      showToast(`Hồ sơ đang bị khóa. Bạn có thể sửa lại sau ${lockStatus.remainingDays} ngày nữa.`, 'info');
                      return;
                    }
                    navigate('/profile/complete');
                  }}
                >
                  {lockStatus.locked && !isAdmin ? <Lock className="mr-2 h-5 w-5" /> : <Edit3 className="mr-2 h-5 w-5" />} 
                  Sửa hồ sơ
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            <Card className="border-none shadow-sm p-6">
              <h2 className="mb-4 sm:mb-6 text-lg sm:text-xl font-bold text-slate-900">Giới thiệu</h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{profile.bio}</p>
            </Card>

            <Card className="border-none shadow-sm p-6">
              <h2 className="mb-4 sm:mb-6 text-lg sm:text-xl font-bold text-slate-900">Thông tin chi tiết</h2>
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
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

            <Card className="border-none shadow-sm p-6">
              <h2 className="mb-4 sm:mb-6 text-lg sm:text-xl font-bold text-slate-900">Sở thích</h2>
              <div className="flex flex-wrap gap-2 sm:gap-3">
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
              <Card className="border-none shadow-sm p-6">
                <h2 className="mb-4 sm:mb-6 text-lg sm:text-xl font-bold text-slate-900">Thông tin liên lạc</h2>
                <div className="flex flex-wrap gap-3 sm:gap-4">
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

            {(isOwnProfile || (profile.photoUrls && profile.photoUrls.length > 0)) && (
              <Card className="border-none shadow-sm p-6">
                <h2 className="mb-4 sm:mb-6 text-lg sm:text-xl font-bold text-slate-900">Album ảnh</h2>
                <div className="grid gap-2 sm:gap-4 grid-cols-3">
                  <input 
                    type="file" 
                    ref={albumInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleAlbumPhotoChange}
                  />
                  {profile.photoUrls?.map((url, idx) => (
                    <div key={idx} className="group relative aspect-square overflow-hidden rounded-3xl border border-slate-100">
                      <img src={url} alt={`Album ${idx}`} className="h-full w-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                      {isOwnProfile && (
                        <button 
                          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => {
                            setCurrentAlbumIndex(idx);
                            albumInputRef.current?.click();
                          }}
                        >
                          <Camera className="h-6 w-6" />
                        </button>
                      )}
                    </div>
                  ))}
                  {isOwnProfile && Array.from({ length: Math.max(0, 3 - (profile.photoUrls?.length || 0)) }).map((_, i) => {
                    const idx = (profile.photoUrls?.length || 0) + i;
                    return (
                      <button 
                        key={`empty-${idx}`}
                        onClick={() => {
                          setCurrentAlbumIndex(idx);
                          albumInputRef.current?.click();
                        }}
                        className="flex aspect-square flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all"
                      >
                        <Camera className="mb-2 h-6 w-6" />
                        <span className="text-xs font-medium">Thêm ảnh</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Account & Support */}
          <div className="space-y-6 sm:space-y-8">
            <Card className="border-none shadow-sm p-6">
              <h2 className="mb-4 sm:mb-6 text-lg sm:text-xl font-bold text-slate-900">Tài khoản</h2>
              <div className="space-y-2 sm:space-y-4">
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

            <Card className="bg-gradient-to-br from-[#ff5a7a05] to-[#8a14d105] border-none shadow-sm p-6">
              <h2 className="mb-3 sm:mb-4 text-lg sm:text-xl font-bold text-slate-900">Hỗ trợ</h2>
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
