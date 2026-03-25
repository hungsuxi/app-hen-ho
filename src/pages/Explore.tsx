/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { Heart, MapPin, Briefcase, Filter, Search, Sparkles, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { cn, calculateAge, calculateMatchPercentage } from '@/src/lib/utils';
import { db, handleFirestoreError, OperationType } from '@/src/firebase';
import { collection, query, where, onSnapshot, limit, addDoc, getDocs, serverTimestamp, orderBy, updateDoc, doc } from 'firebase/firestore';
import { UserProfile } from '@/src/types';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/src/components/ui/Toast';

const Explore = () => {
  const { user, profile: currentUserProfile } = useAuthStore();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [filter, setFilter] = React.useState('all');
  const [profiles, setProfiles] = React.useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [limitCount, setLimitCount] = React.useState(20);

  const isGuest = !user;

  React.useEffect(() => {
    const profilesRef = collection(db, 'profiles');
    let q = query(
      profilesRef, 
      where('approvalStatus', '==', 'approved'), 
      limit(limitCount)
    );

    if (filter === 'serious') {
      q = query(
        profilesRef, 
        where('approvalStatus', '==', 'approved'), 
        where('datingGoal', '==', 'serious'), 
        limit(limitCount)
      );
    } else if (filter === 'new') {
      q = query(
        profilesRef, 
        where('approvalStatus', '==', 'approved'), 
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profileData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(p => !user || p.id !== user.uid) as unknown as UserProfile[];
      setProfiles(profileData);
      setIsLoading(false);
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn('Permission denied for profiles list. User might not be logged in.');
        setIsLoading(false);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, 'profiles');
    });

    return () => unsubscribe();
  }, [filter, limitCount]);

  const handleInterest = async (targetUid: string) => {
    if (isGuest) {
      showToast('Vui lòng đăng nhập để thực hiện hành động này.', 'error');
      navigate('/login');
      return;
    }

    try {
      const matchesRef = collection(db, 'matches');
      
      // Check if a match already exists between these two users
      const q = query(
        matchesRef,
        where('users', 'array-contains', user.uid)
      );
      
      const snapshot = await getDocs(q);
      const existingMatch = snapshot.docs.find(doc => {
        const data = doc.data();
        return data.users.includes(targetUid);
      });

      if (existingMatch) {
        const data = existingMatch.data();
        if (data.status === 'matched') {
          showToast('Hai bạn đã match với nhau rồi!', 'info');
          return;
        }
        if (data.initiator === user.uid) {
          showToast('Bạn đã gửi yêu cầu thích cho người này rồi.', 'info');
          return;
        }
        // If the other person initiated, and I like them now, it's a match!
        await updateDoc(doc(db, 'matches', existingMatch.id), {
          status: 'matched',
          updatedAt: serverTimestamp()
        });
        showToast('Chúc mừng! Hai bạn đã match với nhau.', 'success');
        return;
      }

      // No existing match, create a new one
      await addDoc(matchesRef, {
        users: [user.uid, targetUid],
        initiator: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast('Đã gửi yêu cầu thích thành công!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'matches');
    }
  };

  const handleLoadMore = () => {
    setLimitCount(prev => prev + 20);
  };

  const filteredProfiles = profiles.filter(profile => {
    const nameMatch = (profile.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const regionMatch = (profile.koreanRegion || '').toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || regionMatch;
  });

  return (
    <div className="min-h-screen bg-[#f7f3f3] pt-20 sm:pt-32 pb-24 sm:pb-20">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Hero Section */}
        <div className="relative mb-8 sm:mb-12 overflow-hidden rounded-[30px] sm:rounded-[40px] bg-gradient-to-br from-[#ff5a7a] to-[#8a14d1] p-6 sm:p-12 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 sm:mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium backdrop-blur-md"
            >
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Khám phá những hồ sơ phù hợp</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-4 sm:mb-6 text-3xl font-extrabold tracking-tight sm:text-5xl"
            >
              Tìm thấy <span className="text-white/80 italic">một nửa</span> của bạn tại Hàn Quốc
            </motion.h1>
            
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm kiếm tên, khu vực..."
                  className="h-12 sm:h-14 w-full rounded-xl sm:rounded-2xl bg-white/10 pl-11 sm:pl-12 pr-4 text-sm sm:text-base text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-md"
                />
              </div>
              <Button variant="secondary" size="lg" className="h-12 sm:h-14 bg-white text-[#ff5a7a] rounded-xl sm:rounded-2xl">
                <Filter className="mr-2 h-5 w-5" /> Lọc hồ sơ
              </Button>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 right-40 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </div>

        {/* Filter Tabs */}
        <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'verified', label: 'Đã xác thực' },
            { id: 'new', label: 'Mới nhất' },
            { id: 'near', label: 'Gần bạn' },
            { id: 'serious', label: 'Hẹn hò nghiêm túc' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                'whitespace-nowrap rounded-full px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all',
                filter === item.id 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {isLoading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="h-[280px] sm:h-[350px] p-0 overflow-hidden">
                <Skeleton className="h-2/3 w-full rounded-none" />
                <div className="p-3 sm:p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </Card>
            ))
          ) : filteredProfiles.length > 0 ? (
            filteredProfiles.map((profile, i) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="group relative flex h-full flex-col overflow-hidden p-0 transition-all hover:-translate-y-2 hover:shadow-xl rounded-2xl sm:rounded-3xl">
                  {/* Profile Image */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <Link to={`/profile/${profile.id}`}>
                      <img
                        src={profile.avatarUrl}
                        alt={profile.fullName}
                        className={cn(
                          "h-full w-full object-cover transition-transform duration-500 group-hover:scale-110",
                          isGuest && "blur-md scale-105"
                        )}
                        referrerPolicy="no-referrer"
                      />
                    </Link>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                    
                    {/* Badges */}
                    <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex flex-col gap-1 sm:gap-2">
                      <div className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-slate-900/80 px-2 sm:px-3 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-bold text-white backdrop-blur-sm border border-white/10">
                        <span>ID: {(i + 1).toString().padStart(3, '0')}</span>
                      </div>
                      {profile.approvalStatus === 'approved' && (
                        <div className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-blue-500 px-2 sm:px-3 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-bold text-white shadow-sm shadow-blue-500/20">
                          <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span className="hidden sm:inline">ĐÃ XÁC THỰC</span>
                          <span className="sm:hidden">XÁC THỰC</span>
                        </div>
                      )}
                      {(() => {
                        const now = new Date().getTime();
                        const lastActive = profile.lastActiveAt?.toDate?.()?.getTime() || 0;
                        const isOnline = (now - lastActive) < 10 * 60 * 1000;
                        if (isOnline) {
                          return (
                            <div className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-emerald-500 px-2 sm:px-3 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-bold text-white shadow-sm shadow-emerald-500/20">
                              <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-white animate-pulse" />
                              <span className="hidden sm:inline">ĐANG HOẠT ĐỘNG</span>
                              <span className="sm:hidden">ONLINE</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {!isGuest && (
                        <div className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-white/20 px-2 sm:px-3 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-bold text-white backdrop-blur-sm border border-white/20">
                          <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>{calculateMatchPercentage(currentUserProfile, profile)}% <span className="hidden sm:inline">MATCH</span></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="flex flex-1 flex-col p-3 sm:p-6">
                    <div className="mb-1 sm:mb-2 flex items-center justify-between">
                      <h3 className="truncate text-sm sm:text-xl font-bold text-slate-900">
                        {profile.fullName}, {calculateAge(profile.birthYear)}
                      </h3>
                    </div>

                    {/* Hobbies, MBTI, Religion - show for everyone if present */}
                    <div className="mb-2 sm:mb-4 flex flex-wrap gap-1 sm:gap-1.5">
                      {Array.isArray(profile.hobbies) && profile.hobbies.slice(0, 1).map((hobby, idx) => (
                        <span key={idx} className="rounded-full bg-slate-100 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-medium text-slate-600">
                          #{hobby}
                        </span>
                      ))}
                      {profile.mbti && (
                        <span className="rounded-full bg-[#ff5a7a10] px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold text-[#ff5a7a]">
                          {profile.mbti}
                        </span>
                      )}
                    </div>
                    
                    {!isGuest ? (
                      <div className="flex flex-1 flex-col">
                        <div className="mb-2 sm:mb-4 flex flex-wrap gap-1.5 sm:gap-2">
                          <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-slate-500">
                            <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            <span className="truncate">{profile.koreanRegion}</span>
                          </div>
                        </div>

                        <div className="mb-2 sm:mb-4">
                          <span className="inline-block rounded-lg bg-[#ff5a7a10] px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-bold text-[#ff5a7a] uppercase tracking-wider">
                            {profile.datingGoal === 'serious' ? 'Nghiêm túc' : profile.datingGoal}
                          </span>
                        </div>

                        <p className="mb-3 sm:mb-6 line-clamp-1 sm:line-clamp-2 text-[11px] sm:text-sm text-slate-600 leading-relaxed">
                          {profile.bio}
                        </p>

                        <div className="mt-auto flex gap-2 sm:gap-3">
                          <Button 
                            variant="gradient" 
                            className="h-8 sm:h-10 flex-1 rounded-xl text-xs sm:text-sm"
                            onClick={() => handleInterest(profile.id)}
                          >
                            Thích
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl border-slate-200"
                            onClick={() => navigate(`/profile/${profile.id}`)}
                          >
                            <UserIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto space-y-2 sm:space-y-4">
                        <div className="py-2 sm:py-3 text-center border-y border-dashed border-slate-200">
                          <p className="text-[10px] sm:text-xs text-slate-400 italic">Đăng nhập để xem thêm</p>
                        </div>
                        <Button 
                          variant="gradient" 
                          className="h-8 sm:h-10 w-full rounded-xl text-xs sm:text-sm"
                          onClick={() => navigate('/login')}
                        >
                          Đăng nhập
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-slate-500">Không tìm thấy hồ sơ nào phù hợp.</p>
            </div>
          )}
        </div>

        {/* Load More */}
        <div className="mt-16 flex justify-center">
          <Button 
            variant="outline" 
            size="lg" 
            className="rounded-full bg-white px-12"
            onClick={handleLoadMore}
          >
            Xem thêm hồ sơ
          </Button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default Explore;
