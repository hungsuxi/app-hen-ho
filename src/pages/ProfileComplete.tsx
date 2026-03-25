/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, MapPin, Briefcase, Heart, Camera, ShieldCheck, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { auth, db, handleFirestoreError, OperationType } from '@/src/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/src/components/ui/Toast';
import { useAuthStore } from '@/src/store/useAuthStore';
import { cn, isProfileLocked } from '@/src/lib/utils';
import { Lock } from 'lucide-react';

const ProfileComplete = () => {
  const navigate = useNavigate();
  const { user, profile: existingProfile } = useAuthStore();
  const { showToast, ToastContainer } = useToast();
  const [step, setStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const albumInputRef = React.useRef<HTMLInputElement>(null);
  const [currentAlbumIndex, setCurrentAlbumIndex] = React.useState<number | null>(null);
  const totalSteps = 4;

  const isAdmin = user?.role === 'admin';
  const lockStatus = isProfileLocked(existingProfile?.lastSubmittedAt);

  React.useEffect(() => {
    if (lockStatus.locked && !isAdmin) {
      showToast(`Hồ sơ của bạn đang bị khóa. Bạn có thể sửa lại sau ${lockStatus.remainingDays} ngày nữa.`, 'info');
    }
  }, [lockStatus.locked, isAdmin]);

  const [formData, setFormData] = React.useState({
    fullName: existingProfile?.fullName || '',
    birthYear: existingProfile?.birthYear?.toString() || '',
    gender: existingProfile?.gender || 'male',
    hometownVn: existingProfile?.hometownVn || '',
    heightCm: existingProfile?.heightCm?.toString() || '',
    koreanRegion: existingProfile?.koreanRegion || '',
    occupation: existingProfile?.occupation || '',
    datingGoal: existingProfile?.datingGoal || 'serious',
    smoking: existingProfile?.smoking || 'no',
    drinking: existingProfile?.drinking || 'no',
    mbti: existingProfile?.mbti || '',
    religion: existingProfile?.religion || '',
    hobbies: Array.isArray(existingProfile?.hobbies) ? existingProfile.hobbies.join(', ') : existingProfile?.hobbies || '',
    partnerPreference: existingProfile?.partnerPreference || '',
    facebookUrl: existingProfile?.facebookUrl || '',
    zaloNumber: existingProfile?.zaloNumber || '',
    instagramUrl: existingProfile?.instagramUrl || '',
    bio: existingProfile?.bio || '',
    avatarUrl: existingProfile?.avatarUrl || 'https://picsum.photos/seed/avatar/400/400',
    photoUrls: existingProfile?.photoUrls || [],
  });

  React.useEffect(() => {
    if (existingProfile) {
      setFormData({
        fullName: existingProfile.fullName || '',
        birthYear: existingProfile.birthYear?.toString() || '',
        gender: existingProfile.gender || 'male',
        hometownVn: existingProfile.hometownVn || '',
        heightCm: existingProfile.heightCm?.toString() || '',
        koreanRegion: existingProfile.koreanRegion || '',
        occupation: existingProfile.occupation || '',
        datingGoal: existingProfile.datingGoal || 'serious',
        smoking: existingProfile.smoking || 'no',
        drinking: existingProfile.drinking || 'no',
        mbti: existingProfile.mbti || '',
        religion: existingProfile.religion || '',
        hobbies: Array.isArray(existingProfile.hobbies) ? existingProfile.hobbies.join(', ') : existingProfile.hobbies || '',
        partnerPreference: existingProfile.partnerPreference || '',
        facebookUrl: existingProfile.facebookUrl || '',
        zaloNumber: existingProfile.zaloNumber || '',
        instagramUrl: existingProfile.instagramUrl || '',
        bio: existingProfile.bio || '',
        avatarUrl: existingProfile.avatarUrl || 'https://picsum.photos/seed/avatar/400/400',
        photoUrls: existingProfile.photoUrls || [],
      });
    }
  }, [existingProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Dung lượng ảnh không được quá 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleAlbumUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || currentAlbumIndex === null) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Dung lượng ảnh không được quá 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const newPhotoUrls = [...formData.photoUrls];
      newPhotoUrls[currentAlbumIndex] = reader.result as string;
      setFormData(prev => ({ ...prev, photoUrls: newPhotoUrls }));
      setCurrentAlbumIndex(null);
    };
    reader.readAsDataURL(file);
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < totalSteps) {
      nextStep();
    } else {
      if (!user) {
        showToast('Vui lòng đăng nhập để tiếp tục.', 'error');
        return;
      }

      setIsLoading(true);
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        const profileData: any = {
          ...formData,
          uid: user.uid,
          birthYear: parseInt(formData.birthYear),
          heightCm: parseInt(formData.heightCm),
          hobbies: formData.hobbies.split(',').map(s => s.trim()).filter(Boolean),
          approvalStatus: 'pending_review',
          lastSubmittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (!existingProfile) {
          profileData.createdAt = serverTimestamp();
        }

        await setDoc(profileRef, profileData, { merge: true });
        showToast('Hồ sơ của bạn đã được gửi duyệt!', 'success');
        navigate('/explore');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `profiles/${user?.uid}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="mb-4 text-xl font-bold">Vui lòng đăng nhập</h2>
          <Button onClick={() => navigate('/login')}>Đi tới Đăng nhập</Button>
        </Card>
      </div>
    );
  }

  if (!isAdmin && lockStatus.locked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f3f3] p-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
          <Lock className="h-10 w-10 text-[#ff5a7a]" />
        </div>
        <h1 className="mb-4 text-3xl font-bold text-slate-900">Hồ sơ đang bị khóa</h1>
        <p className="mb-8 max-w-md text-slate-600">
          Theo quy định, bạn chỉ có thể sửa đổi thông tin hồ sơ sau mỗi 7 ngày. 
          Vui lòng quay lại sau <span className="font-bold text-[#ff5a7a]">{lockStatus.remainingDays} ngày</span> nữa.
        </p>
        <Button variant="gradient" size="lg" onClick={() => navigate('/profile')}>
          Quay lại hồ sơ
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3f3] pt-20 sm:pt-32 pb-20">
      <ToastContainer />
      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        {/* Progress Bar */}
        <div className="mb-8 sm:mb-12 flex items-center justify-between gap-2 sm:gap-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="relative flex-1">
              <div
                className={cn(
                  'h-1.5 sm:h-2 w-full rounded-full transition-all duration-300',
                  i + 1 <= step ? 'bg-gradient-to-r from-[#ff5a7a] to-[#8a14d1]' : 'bg-slate-200'
                )}
              />
              <div
                className={cn(
                  'absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap',
                  i + 1 === step ? 'text-[#ff5a7a]' : 'text-slate-400'
                )}
              >
                B{i + 1}
                <span className="hidden sm:inline">ước {i + 1}</span>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="mb-6 sm:mb-10">
                <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-slate-900">Thông tin cơ bản</h1>
                <p className="text-sm sm:text-base text-slate-500">Hãy cho mọi người biết bạn là ai.</p>
              </div>

              <Card className="grid gap-4 sm:gap-6 sm:grid-cols-2 p-4 sm:p-8">
                <Input label="Họ và tên" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Nguyễn Văn A" required className="rounded-xl sm:rounded-2xl" />
                <Input label="Năm sinh" name="birthYear" type="number" value={formData.birthYear} onChange={handleChange} placeholder="1995" required className="rounded-xl sm:rounded-2xl" />
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-slate-700">Giới tính</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="flex h-10 sm:h-11 w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <Input label="Quê quán (Việt Nam)" name="hometownVn" value={formData.hometownVn} onChange={handleChange} placeholder="Hà Nội" required className="rounded-xl sm:rounded-2xl" />
                <Input label="Chiều cao (cm)" name="heightCm" type="number" value={formData.heightCm} onChange={handleChange} placeholder="170" required className="rounded-xl sm:rounded-2xl" />
                <Input label="Khu vực sinh sống tại Hàn" name="koreanRegion" value={formData.koreanRegion} onChange={handleChange} placeholder="Seoul" required className="rounded-xl sm:rounded-2xl" />
                <Input label="Công việc hiện tại" name="occupation" value={formData.occupation} onChange={handleChange} placeholder="Kỹ sư phần mềm" required className="rounded-xl sm:rounded-2xl" />
                <Input label="MBTI" name="mbti" value={formData.mbti} onChange={handleChange} placeholder="ENFP" className="rounded-xl sm:rounded-2xl" />
                <Input label="Tôn giáo" name="religion" value={formData.religion} onChange={handleChange} placeholder="Không có / Phật giáo..." className="rounded-xl sm:rounded-2xl" />
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="mb-6 sm:mb-10">
                <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-slate-900">Lối sống & Mong muốn</h1>
                <p className="text-sm sm:text-base text-slate-500">Chia sẻ về phong cách sống và mẫu người bạn tìm kiếm.</p>
              </div>

              <Card className="space-y-6 p-4 sm:p-8">
                <div className="space-y-2 sm:space-y-3">
                  <label className="text-xs sm:text-sm font-medium text-slate-700">Mục tiêu kết nối</label>
                  <div className="grid gap-2 sm:gap-3 sm:grid-cols-3">
                    {[
                      { id: 'serious', label: 'Hẹn hò nghiêm túc' },
                      { id: 'long_term', label: 'Tìm hiểu lâu dài' },
                      { id: 'meetup', label: 'Gặp mặt trực tiếp' },
                    ].map((goal) => (
                      <label
                        key={goal.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-xl sm:rounded-2xl border p-3 sm:p-4 transition-all hover:bg-slate-50",
                          formData.datingGoal === goal.id ? "border-[#ff5a7a] bg-[#ff5a7a05]" : "border-slate-200"
                        )}
                      >
                        <input
                          type="radio"
                          name="datingGoal"
                          value={goal.id}
                          checked={formData.datingGoal === goal.id}
                          onChange={handleChange}
                          className="hidden"
                        />
                        <span className="text-xs sm:text-sm font-medium">{goal.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-slate-700">Sở thích cá nhân</label>
                  <Input name="hobbies" value={formData.hobbies} onChange={handleChange} placeholder="Du lịch, nấu ăn, xem phim..." className="rounded-xl sm:rounded-2xl" />
                </div>

                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">Hút thuốc</label>
                    <select name="smoking" value={formData.smoking} onChange={handleChange} className="flex h-10 sm:h-11 w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                      <option value="no">Không</option>
                      <option value="sometimes">Thỉnh thoảng</option>
                      <option value="yes">Có</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">Uống rượu</label>
                    <select name="drinking" value={formData.drinking} onChange={handleChange} className="flex h-10 sm:h-11 w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                      <option value="no">Không</option>
                      <option value="sometimes">Thỉnh thoảng</option>
                      <option value="often">Thường xuyên</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-slate-700">Mong muốn ở đối phương</label>
                  <Input name="partnerPreference" value={formData.partnerPreference} onChange={handleChange} placeholder="Hiền lành, biết lắng nghe, cùng sở thích..." className="rounded-xl sm:rounded-2xl" />
                </div>

                <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
                  <Input label="Link Facebook" name="facebookUrl" value={formData.facebookUrl} onChange={handleChange} placeholder="facebook.com/yourprofile" className="rounded-xl sm:rounded-2xl" />
                  <Input label="Số Zalo" name="zaloNumber" value={formData.zaloNumber} onChange={handleChange} placeholder="090..." className="rounded-xl sm:rounded-2xl" />
                  <Input label="Link Instagram" name="instagramUrl" value={formData.instagramUrl} onChange={handleChange} placeholder="instagram.com/yourprofile" className="rounded-xl sm:rounded-2xl" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-slate-700">Tự giới thiệu về bản thân</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    className="flex min-h-[100px] sm:min-h-[120px] w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-3 sm:px-4 py-3 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    placeholder="Hãy viết vài dòng về bản thân bạn..."
                  />
                </div>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="mb-6 sm:mb-10">
                <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-slate-900">Ảnh đại diện & Album</h1>
                <p className="text-sm sm:text-base text-slate-500">Hình ảnh rõ nét giúp bạn nhận được nhiều sự quan tâm hơn.</p>
              </div>

              <Card className="space-y-6 sm:space-y-8 p-4 sm:p-8">
                <div className="flex flex-col items-center justify-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="group relative h-32 w-32 sm:h-40 sm:w-40 overflow-hidden rounded-full bg-slate-100 border-4 border-white shadow-lg">
                    {formData.avatarUrl ? (
                      <img src={formData.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                        <User className="h-16 w-16 sm:h-20 sm:w-20" />
                      </div>
                    )}
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Camera className="h-6 w-6 sm:h-8 sm:w-8" />
                    </button>
                  </div>
                  <p className="mt-4 text-xs sm:text-sm font-medium text-slate-500">Ảnh đại diện chính</p>
                </div>

                <div className="grid gap-3 sm:gap-4 grid-cols-3">
                  <input
                    type="file"
                    ref={albumInputRef}
                    onChange={handleAlbumUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setCurrentAlbumIndex(i);
                        albumInputRef.current?.click();
                      }}
                      className="group relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 transition-all hover:bg-slate-100"
                    >
                      {formData.photoUrls[i] ? (
                        <img src={formData.photoUrls[i]} alt={`Album ${i}`} className="h-full w-full object-cover" />
                      ) : (
                        <>
                          <Camera className="mb-1 sm:mb-2 h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
                          <span className="text-[10px] sm:text-xs font-medium text-slate-500">Thêm ảnh {i + 1}</span>
                        </>
                      )}
                      {formData.photoUrls[i] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="mb-6 sm:mb-10">
                <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-slate-900">Xác nhận & Hoàn tất</h1>
                <p className="text-sm sm:text-base text-slate-500">Vui lòng kiểm tra lại thông tin trước khi gửi duyệt.</p>
              </div>

              <Card className="space-y-4 sm:space-y-6 bg-gradient-to-br from-[#ff5a7a05] to-[#8a14d105] p-4 sm:p-8">
                <div className="flex items-start gap-3 sm:gap-4 rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-sm">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                    <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">Quy trình duyệt hồ sơ</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Để đảm bảo an toàn cho cộng đồng, hồ sơ của bạn sẽ được admin kiểm duyệt trong vòng 24h. 
                      Bạn sẽ nhận được thông báo ngay khi hồ sơ được chấp nhận.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-sm">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">Lưu ý an toàn</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Không chia sẻ thông tin tài chính, mật khẩu hoặc mã OTP với bất kỳ ai. 
                      Ưu tiên gặp mặt tại những địa điểm công cộng, đông người.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-sm border border-[#ff5a7a20]">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-[#ff5a7a]">
                    <Lock className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">Quy định sửa hồ sơ</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Để đảm bảo tính xác thực, sau khi gửi duyệt, bạn sẽ <span className="font-bold text-[#ff5a7a]">không thể sửa đổi thông tin trong vòng 7 ngày</span>. 
                      Vui lòng kiểm tra kỹ các thông tin trước khi nhấn nút gửi.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          <div className="mt-8 sm:mt-12 flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className={cn('bg-white flex-1 sm:flex-none rounded-xl sm:rounded-2xl', step === 1 && 'invisible')}
            >
              <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" /> Quay lại
            </Button>
            <Button variant="gradient" size="lg" type="submit" className="flex-1 sm:flex-none rounded-xl sm:rounded-2xl">
              {step === totalSteps ? 'Gửi duyệt hồ sơ' : 'Tiếp tục'} <ArrowRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileComplete;
