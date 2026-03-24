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
    <div className="min-h-screen bg-[#f7f3f3] pt-32 pb-20">
      <div className="container mx-auto px-6">
        {/* Hero Section */}
        <div className="relative mb-12 overflow-hidden rounded-[40px] bg-gradient-to-br from-[#ff5a7a] to-[#8a14d1] p-12 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-md"
            >
              <Sparkles className="h-4 w-4" />
              <span>Khám phá những hồ sơ phù hợp nhất</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl"
            >
              Tìm thấy <span className="text-white/80 italic">một nửa</span> của bạn tại Hàn Quốc
            </motion.h1>
            
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm kiếm theo tên, khu vực..."
                  className="h-14 w-full rounded-2xl bg-white/10 pl-12 pr-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-md"
                />
              </div>
              <Button variant="secondary" size="lg" className="bg-white text-[#ff5a7a]">
                <Filter className="mr-2 h-5 w-5" /> Lọc hồ sơ
              </Button>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 right-40 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </div>

        {/* Filter Tabs */}
        <div className="mb-10 flex items-center gap-4 overflow-x-auto pb-2">
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
                'whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-bold transition-all',
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
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="h-[400px] p-0 overflow-hidden">
                <Skeleton className="h-2/3 w-full rounded-none" />
                <div className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>
            ))
          ) : filteredProfiles.length > 0 ? (
            filteredProfiles.map((profile, i) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="group relative flex h-full flex-col overflow-hidden p-0 transition-all hover:-translate-y-2 hover:shadow-xl">
                  {/* Profile Image */}
                  <div className="relative aspect-[4/5] overflow-hidden">
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-sm border border-white/10">
                        <span>ID: {(i + 1).toString().padStart(3, '0')}</span>
                      </div>
                      {profile.approvalStatus === 'approved' && (
                        <div className="flex items-center gap-1.5 rounded-full bg-blue-500/90 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                          <ShieldCheck className="h-3 w-3" />
                          <span>ĐÃ XÁC THỰC</span>
                        </div>
                      )}
                      {!isGuest && (
                        <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-sm border border-white/20">
                          <Sparkles className="h-3 w-3" />
                          <span>{calculateMatchPercentage(currentUserProfile, profile)}% MATCH</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-900">
                        {profile.fullName}, {calculateAge(profile.birthYear)}
                      </h3>
                    </div>

                    {/* Hobbies, MBTI, Religion - show for everyone if present */}
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {Array.isArray(profile.hobbies) && profile.hobbies.slice(0, 2).map((hobby, idx) => (
                        <span key={idx} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          #{hobby}
                        </span>
                      ))}
                      {profile.mbti && (
                        <span className="rounded-full bg-[#ff5a7a10] px-2 py-0.5 text-[10px] font-bold text-[#ff5a7a]">
                          {profile.mbti}
                        </span>
                      )}
                      {profile.religion && profile.religion !== 'Không' && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                          {profile.religion}
                        </span>
                      )}
                    </div>
                    
                    {!isGuest ? (
                      <div className="flex flex-1 flex-col">
                        <div className="mb-4 flex flex-wrap gap-2">
                          <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                            <MapPin className="h-3 w-3" />
                            <span>{profile.koreanRegion}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                            <Briefcase className="h-3 w-3" />
                            <span>{profile.occupation}</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <span className="inline-block rounded-lg bg-[#ff5a7a10] px-3 py-1 text-[11px] font-bold text-[#ff5a7a] uppercase tracking-wider">
                            {profile.datingGoal === 'serious' ? 'Hẹn hò nghiêm túc' : profile.datingGoal}
                          </span>
                        </div>

                        <p className="mb-6 line-clamp-2 text-sm text-slate-600 leading-relaxed">
                          {profile.bio}
                        </p>

                        <div className="mt-auto flex gap-3">
                          <Button 
                            variant="gradient" 
                            className="flex-1 rounded-2xl"
                            onClick={() => handleInterest(profile.id)}
                          >
                            Thích
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="rounded-2xl border-slate-200"
                            onClick={() => navigate(`/profile/${profile.id}`)}
                          >
                            <UserIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto space-y-4">
                        <div className="py-3 text-center border-y border-dashed border-slate-200">
                          <p className="text-xs text-slate-400 italic">Đăng nhập để xem thêm thông tin</p>
                        </div>
                        <Button 
                          variant="gradient" 
                          className="w-full rounded-2xl"
                          onClick={() => navigate('/login')}
                        >
                          Đăng nhập để kết nối
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
