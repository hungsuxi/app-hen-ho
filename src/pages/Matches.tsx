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
    <div className="min-h-screen bg-[#f7f3f3] pt-32 pb-20">
      <div className="container mx-auto max-w-5xl px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ff5a7a10] px-4 py-2 text-sm font-bold text-[#ff5a7a]"
          >
            <Heart className="h-4 w-4 fill-current" />
            <span>Những kết nối tuyệt vời của bạn</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl"
          >
            Danh sách <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff5a7a] to-[#8a14d1]">Match</span>
          </motion.h1>
        </div>

        {/* Tabs */}
        <div className="mb-10 flex items-center justify-center gap-4">
          {[
            { id: 'matched', label: 'Đã Match', icon: Users, count: counts.matched },
            { id: 'pending', label: 'Đang chờ', icon: Clock, count: counts.pending },
            { id: 'liked', label: 'Đã thích', icon: Heart, count: counts.liked },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold transition-all',
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-lg' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  "ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMatches.map((match, i) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="group relative overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={match.avatarUrl}
                    alt={match.fullName}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-white">
                          {match.fullName}, {calculateAge(match.birthYear)}
                        </h3>
                        <ShieldCheck className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm border border-white/20">
                        <Sparkles className="h-3 w-3" />
                        <span>{match.matchPercentage}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium text-white/80">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{match.koreanRegion}</span>
                      </div>
                      <div className="h-1 w-1 rounded-full bg-white/40" />
                      <span>{match.datingGoal}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {match.status === 'matched' ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                        <MessageCircle className="mt-1 h-4 w-4 text-slate-400" />
                        <p className="line-clamp-1 text-sm text-slate-600">
                          {match.lastMessage || 'Chưa có tin nhắn mới'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="gradient" 
                          className="flex-1 rounded-xl"
                          onClick={() => navigate('/chat', { state: { chatId: match.id } })}
                        >
                          Nhắn tin ngay
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="rounded-xl border-slate-200"
                          onClick={() => navigate(`/profile/${match.otherUid}`)}
                        >
                          <User className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : activeTab === 'pending' ? (
                    <div className="space-y-4">
                      <p className="text-center text-sm font-medium text-slate-500">
                        {match.fullName} muốn kết nối với bạn
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="gradient" 
                          className="flex-1 rounded-xl"
                          onClick={() => handleAcceptMatch(match.id)}
                        >
                          Chấp nhận
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 rounded-xl border-slate-200"
                          onClick={() => handleRejectMatch(match.id)}
                        >
                          Từ chối
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="w-full rounded-xl text-slate-500"
                        onClick={() => navigate(`/profile/${match.otherUid}`)}
                      >
                        Xem hồ sơ chi tiết
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-center text-sm font-medium text-slate-500">
                        Đang chờ phản hồi từ {match.fullName}
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full rounded-xl border-slate-200"
                        onClick={() => navigate(`/profile/${match.otherUid}`)}
                      >
                        Xem hồ sơ chi tiết
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
