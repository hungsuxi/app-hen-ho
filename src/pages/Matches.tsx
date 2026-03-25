/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, MapPin, User, Sparkles, ShieldCheck, ArrowRight, Users, Clock } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { cn, calculateAge, calculateMatchPercentage } from '@/src/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/src/store/useAuthStore';
import { db, handleFirestoreError, OperationType } from '@/src/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '@/src/types';
import { useToast } from '@/src/components/ui/Toast';

const Matches = () => {
  const navigate = useNavigate();
  const { user, profile: currentUserProfile } = useAuthStore();
  const { showToast, ToastContainer } = useToast();
  const [activeTab, setActiveTab] = React.useState('matched');
  const [matches, setMatches] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const handleAcceptMatch = async (matchId: string) => {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        status: 'matched',
        updatedAt: serverTimestamp(),
      });
      showToast('Chúc mừng! Hai bạn đã match thành công.', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const handleRejectMatch = async (matchId: string) => {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
      showToast('Đã từ chối yêu cầu.', 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  React.useEffect(() => {
    if (!user) return;

    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef, 
      where('users', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log('Matches snapshot received, count:', snapshot.size);
      
      try {
        const matchData = await Promise.all(snapshot.docs.map(async (matchDoc) => {
          try {
            const data = matchDoc.data();
            const otherUid = data.users.find((id: string) => id !== user.uid);
            
            if (!otherUid) {
              console.warn('Match document has no other user ID:', matchDoc.id);
              return null;
            }
            
            // Fetch other user's profile
            const profileRef = doc(db, 'profiles', otherUid);
            const profileSnap = await getDoc(profileRef);
            const profile = profileSnap.exists() ? profileSnap.data() as UserProfile : null;

            if (!profile) {
              console.warn('Profile not found for UID:', otherUid);
            }

            return {
              id: matchDoc.id,
              otherUid,
              fullName: profile?.fullName || 'Người dùng',
              birthYear: profile?.birthYear || 1995,
              koreanRegion: profile?.koreanRegion || 'N/A',
              datingGoal: profile?.datingGoal || 'N/A',
              avatarUrl: profile?.avatarUrl || 'https://picsum.photos/seed/avatar/400/500',
              status: data.status,
              initiator: data.initiator,
              lastMessage: data.lastMessage || '',
              updatedAt: data.updatedAt,
              matchPercentage: calculateMatchPercentage(currentUserProfile, profile),
            };
          } catch (err) {
            console.error('Error processing match document:', matchDoc.id, err);
            return null;
          }
        }));

        const validMatches = matchData.filter((m): m is any => m !== null);
        console.log('Processed matches:', validMatches.length);
        setMatches(validMatches);
      } catch (err) {
        console.error('Error processing matches snapshot:', err);
      } finally {
        setIsLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentUserProfile]);

  const filteredMatches = matches.filter(m => {
    if (activeTab === 'matched') return m.status === 'matched';
    if (activeTab === 'pending') return m.status === 'pending' && m.initiator !== user?.uid;
    if (activeTab === 'liked') return m.status === 'pending' && m.initiator === user?.uid;
    return false;
  });

  const counts = {
    matched: matches.filter(m => m.status === 'matched').length,
    pending: matches.filter(m => m.status === 'pending' && m.initiator !== user?.uid).length,
    liked: matches.filter(m => m.status === 'pending' && m.initiator === user?.uid).length,
  };

  return (
    <div className="min-h-screen bg-[#f7f3f3] pt-20 sm:pt-32 pb-24 sm:pb-20">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 sm:mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 sm:mb-4 inline-flex items-center gap-2 rounded-full bg-[#ff5a7a10] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#ff5a7a]"
          >
            <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
            <span>Những kết nối của bạn</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl"
          >
            Danh sách <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff5a7a] to-[#8a14d1]">Match</span>
          </motion.h1>
        </div>

        {/* Tabs */}
        <div className="mb-8 grid grid-cols-3 gap-2 sm:flex sm:items-center sm:justify-center sm:gap-4">
          {[
            { id: 'matched', label: 'Đã Match', icon: Users, count: counts.matched },
            { id: 'pending', label: 'Đang chờ', icon: Clock, count: counts.pending },
            { id: 'liked', label: 'Đã thích', icon: Heart, count: counts.liked },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-full px-1 sm:px-8 py-2.5 sm:py-3 text-[10px] sm:text-sm font-bold transition-all border',
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-lg border-slate-900' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
              )}
            >
              <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="truncate">{tab.label}</span>
              {tab.count > 0 && (
                <span className={cn(
                  "flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full text-[9px] sm:text-[10px] flex-shrink-0",
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-[#ff5a7a10] text-[#ff5a7a]"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#ff5a7a] border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Matches Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {filteredMatches.map((match, i) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="group relative overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-xl rounded-2xl sm:rounded-3xl">
                <div className="relative aspect-[3/4] sm:aspect-[4/5] overflow-hidden">
                  <img
                    src={match.avatarUrl}
                    alt={match.fullName}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  
                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4">
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-1">
                        <h3 className="truncate text-sm font-bold text-white sm:text-xl">
                          {match.fullName}, {calculateAge(match.birthYear)}
                        </h3>
                        <ShieldCheck className="h-3 w-3 flex-shrink-0 text-blue-400 sm:h-4 sm:w-4" />
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[8px] font-bold text-white backdrop-blur-sm border border-white/20 sm:gap-1 sm:px-2 sm:text-[10px]">
                        <Sparkles className="h-2 w-2 sm:h-3 sm:w-3" />
                        <span>{match.matchPercentage}%</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-[9px] font-medium text-white/80 sm:gap-3 sm:text-xs">
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <MapPin className="h-2 w-2 sm:h-3 sm:w-3" />
                        <span className="truncate">{match.koreanRegion}</span>
                      </div>
                      <div className="hidden h-1 w-1 rounded-full bg-white/40 sm:block" />
                      <span className="truncate">{match.datingGoal === 'serious' ? 'Nghiêm túc' : match.datingGoal}</span>
                    </div>
                  </div>
                </div>

                <div className="p-2 sm:p-5">
                  {match.status === 'matched' ? (
                    <div className="space-y-2 sm:space-y-4">
                      <div className="flex items-start gap-1.5 rounded-xl bg-slate-50 p-1.5 sm:gap-3 sm:rounded-2xl sm:p-3">
                        <MessageCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-400 sm:h-4 sm:w-4" />
                        <p className="line-clamp-1 text-[10px] text-slate-600 sm:text-sm">
                          {match.lastMessage || 'Chưa có tin nhắn mới'}
                        </p>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2">
                        <Button 
                          variant="gradient" 
                          className="h-8 flex-1 rounded-lg px-2 text-[10px] sm:h-10 sm:rounded-xl sm:text-sm"
                          onClick={() => navigate('/chat', { state: { chatId: match.id } })}
                        >
                          Nhắn tin
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg border-slate-200 sm:h-10 sm:w-10 sm:rounded-xl"
                          onClick={() => navigate(`/profile/${match.otherUid}`)}
                        >
                          <User className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : activeTab === 'pending' ? (
                    <div className="space-y-2 sm:space-y-4">
                      <p className="text-center text-[10px] font-medium text-slate-500 sm:text-sm">
                        Muốn kết nối với bạn
                      </p>
                      <div className="flex gap-1.5 sm:gap-2">
                        <Button 
                          variant="gradient" 
                          className="h-8 flex-1 rounded-lg px-1 text-[10px] sm:h-10 sm:rounded-xl sm:text-sm"
                          onClick={() => handleAcceptMatch(match.id)}
                        >
                          Chấp nhận
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-8 flex-1 rounded-lg px-1 text-[10px] border-slate-200 sm:h-10 sm:rounded-xl sm:text-sm"
                          onClick={() => handleRejectMatch(match.id)}
                        >
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-4">
                      <p className="text-center text-[10px] font-medium text-slate-500 sm:text-sm">
                        Đang chờ phản hồi
                      </p>
                      <Button 
                        variant="outline" 
                        className="h-8 w-full rounded-lg text-[10px] border-slate-200 sm:h-10 sm:rounded-xl sm:text-sm"
                        onClick={() => navigate(`/profile/${match.otherUid}`)}
                      >
                        Xem hồ sơ
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {filteredMatches.length === 0 && !isLoading && (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm">
              <Sparkles className="h-12 w-12 text-[#ff5a7a20]" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-slate-900">Chưa có kết nối nào</h3>
            <p className="mb-8 max-w-md text-slate-500">
              Hãy tiếp tục khám phá những hồ sơ phù hợp để tìm thấy một nửa của mình nhé!
            </p>
            <Button 
              variant="gradient" 
              size="lg" 
              className="rounded-2xl px-12"
              onClick={() => navigate('/explore')}
            >
              Khám phá ngay <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
};

export default Matches;
