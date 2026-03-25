/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { Send, Image, Smile, MoreVertical, ShieldAlert, UserX, ArrowLeft, Heart, Sparkles } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { cn } from '@/src/lib/utils';

import { useAuthStore } from '@/src/store/useAuthStore';
import { db, handleFirestoreError, OperationType } from '@/src/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy, 
  doc, 
  getDoc,
  updateDoc,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { UserProfile, Message } from '@/src/types';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '@/src/components/ui/Modal';
import { useToast } from '@/src/components/ui/Toast';

const Chat = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [selectedChat, setSelectedChat] = React.useState<string | null>(null);

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const [isUnmatchModalOpen, setIsUnmatchModalOpen] = React.useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);

  // Handle chatId from navigation state
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (location.state?.chatId) {
      setSelectedChat(location.state.chatId);
    }
  }, [location.state]);
  const [message, setMessage] = React.useState('');
  const [chats, setChats] = React.useState<any[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoadingChats, setIsLoadingChats] = React.useState(true);
  const [selectedProfile, setSelectedProfile] = React.useState<UserProfile | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch matches/chats
  React.useEffect(() => {
    if (!user) return;

    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef, 
      where('users', 'array-contains', user.uid),
      where('status', '==', 'matched')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatPromises = snapshot.docs.map(async (matchDoc) => {
        const data = matchDoc.data();
        const otherUid = data.users.find((id: string) => id !== user.uid);
        
        return {
          id: matchDoc.id,
          otherUid,
          lastMessage: data.lastMessage || 'Bắt đầu trò chuyện...',
          updatedAt: data.updatedAt,
        };
      });

      Promise.all(chatPromises).then((basicChatData) => {
        // Now set up listeners for each other user's profile to get real-time online status
        const profileUnsubscribes: (() => void)[] = [];
        
        const updateChatsWithProfiles = () => {
          const now = new Date().getTime();
          const tenMinutes = 10 * 60 * 1000;

          const finalChats = basicChatData.map(chat => {
            const profile = profilesCache[chat.otherUid];
            const lastActive = profile?.lastActiveAt?.toDate?.()?.getTime() || 0;
            const isOnline = (now - lastActive) < tenMinutes;

            return {
              ...chat,
              fullName: profile?.fullName || 'Người dùng',
              avatarUrl: profile?.avatarUrl || 'https://picsum.photos/seed/avatar/100/100',
              time: chat.updatedAt ? new Date(chat.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              isOnline,
            };
          });
          setChats(finalChats);
        };

        const profilesCache: Record<string, UserProfile> = {};

        basicChatData.forEach((chat) => {
          const profileRef = doc(db, 'profiles', chat.otherUid);
          const unsub = onSnapshot(profileRef, (snap) => {
            if (snap.exists()) {
              profilesCache[chat.otherUid] = snap.data() as UserProfile;
              updateChatsWithProfiles();
            }
          });
          profileUnsubscribes.push(unsub);
        });

        // Also update every minute to refresh "isOnline" status even if no Firestore changes
        const interval = setInterval(updateChatsWithProfiles, 60000);

        setIsLoadingChats(false);

        return () => {
          profileUnsubscribes.forEach(unsub => unsub());
          clearInterval(interval);
        };
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch messages for selected chat
  React.useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      setSelectedProfile(null);
      return;
    }

    // Get profile of selected chat
    const chat = chats.find(c => c.id === selectedChat);
    if (chat) {
      const profileRef = doc(db, 'profiles', chat.otherUid);
      const unsubProfile = onSnapshot(profileRef, (snap) => {
        if (snap.exists()) {
          setSelectedProfile(snap.data() as UserProfile);
        }
      });

      const messagesRef = collection(db, 'chats', selectedChat, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));

      const unsubMessages = onSnapshot(q, (snapshot) => {
        const msgData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        setMessages(msgData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `chats/${selectedChat}/messages`);
      });

      return () => {
        unsubProfile();
        unsubMessages();
      };
    }
  }, [selectedChat, chats]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || !selectedChat || !user) return;

    const currentMsg = message;
    setMessage('');

    try {
      const messagesRef = collection(db, 'chats', selectedChat, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        content: currentMsg,
        type: 'text',
        createdAt: serverTimestamp(),
      });

      // Update last message in match doc
      const matchRef = doc(db, 'matches', selectedChat);
      await updateDoc(matchRef, {
        lastMessage: currentMsg,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${selectedChat}/messages`);
    }
  };

  const handleUnmatch = async () => {
    if (!selectedChat || !user) return;
    setIsSubmitting(true);
    try {
      const matchRef = doc(db, 'matches', selectedChat);
      await updateDoc(matchRef, {
        status: 'unmatched',
        unmatchedAt: serverTimestamp(),
        unmatchedBy: user.uid
      });
      showToast('Đã hủy tương hợp thành công.', 'success');
      setSelectedChat(null);
      setIsUnmatchModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${selectedChat}`);
      showToast('Có lỗi xảy ra khi hủy tương hợp.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat || !user) return;

    if (file.size > 1024 * 1024) { // 1MB limit for base64 storage in Firestore
      showToast('Ảnh quá lớn. Vui lòng chọn ảnh dưới 1MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const messagesRef = collection(db, 'chats', selectedChat, 'messages');
        await addDoc(messagesRef, {
          senderId: user.uid,
          content: '[Hình ảnh]',
          type: 'image',
          imageUrl: base64,
          createdAt: serverTimestamp(),
        });

        const matchRef = doc(db, 'matches', selectedChat);
        await updateDoc(matchRef, {
          lastMessage: '[Hình ảnh]',
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `chats/${selectedChat}/messages`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReport = async () => {
    if (!selectedChat || !user || !selectedProfile || !reportReason.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        targetId: selectedProfile.uid,
        targetName: selectedProfile.fullName,
        reason: reportReason,
        chatId: selectedChat,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      showToast('Đã gửi báo cáo thành công. Admin sẽ xem xét sớm nhất.', 'success');
      setIsReportModalOpen(false);
      setReportReason('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
      showToast('Có lỗi xảy ra khi gửi báo cáo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#f7f3f3] pt-16 sm:pt-32 pb-24 sm:pb-20 overflow-hidden">
      <ToastContainer />
      <div className="container mx-auto h-full max-w-6xl px-0 sm:px-6">
        <div className="flex h-full overflow-hidden sm:rounded-[40px] bg-white shadow-2xl">
          {/* Sidebar: Chat List */}
          <div className={cn(
            'flex w-full flex-col border-r border-slate-100 lg:w-80',
            selectedChat && 'hidden lg:flex'
          )}>
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Tin nhắn</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1 sm:space-y-2 scrollbar-hide">
              {isLoadingChats ? (
                <div className="flex justify-center p-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ff5a7a] border-t-transparent"></div>
                </div>
              ) : chats.length > 0 ? (
                chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat.id)}
                    className={cn(
                      'flex w-full items-center gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl p-3 sm:p-4 transition-all',
                      selectedChat === chat.id 
                        ? 'bg-gradient-to-r from-[#ff5a7a10] to-[#8a14d110] border border-[#ff5a7a20]' 
                        : 'hover:bg-slate-50 border border-transparent'
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={chat.avatarUrl}
                        alt={chat.fullName}
                        className="h-12 w-12 sm:h-12 sm:w-12 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {chat.isOnline && (
                        <div className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 truncate text-sm sm:text-base">{chat.fullName}</span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{chat.time}</span>
                      </div>
                      <p className="line-clamp-1 text-xs text-slate-500">{chat.lastMessage}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-slate-400">
                  Chưa có cuộc trò chuyện nào.
                </div>
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className={cn(
            'flex flex-1 flex-col bg-slate-50/50',
            !selectedChat && 'hidden lg:flex'
          )}>
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-white p-3 sm:p-4 px-4 sm:px-6 sticky top-0 z-10">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <button 
                      onClick={() => setSelectedChat(null)}
                      className="lg:hidden h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <img
                        src={selectedProfile?.avatarUrl || 'https://picsum.photos/seed/avatar/100/100'}
                        alt="User"
                        className="h-10 w-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate leading-tight">{selectedProfile?.fullName || 'Người dùng'}</h3>
                        {(() => {
                          const now = new Date().getTime();
                          const lastActive = selectedProfile?.lastActiveAt?.toDate?.()?.getTime() || 0;
                          const diff = now - lastActive;
                          const isOnline = diff < 10 * 60 * 1000;

                          if (isOnline) {
                            return (
                              <div className="flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Đang hoạt động</span>
                              </div>
                            );
                          }

                          if (!lastActive) {
                            return <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Ngoại tuyến</span>;
                          }

                          const minutes = Math.floor(diff / (60 * 1000));
                          const hours = Math.floor(minutes / 60);
                          const days = Math.floor(hours / 24);

                          let timeStr = '';
                          if (days > 0) timeStr = `${days} ngày trước`;
                          else if (hours > 0) timeStr = `${hours} giờ trước`;
                          else if (minutes > 0) timeStr = `${minutes} phút trước`;
                          else timeStr = 'vừa xong';

                          return <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">Hoạt động {timeStr}</span>;
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-red-50 hover:text-red-500"
                      onClick={() => setIsReportModalOpen(true)}
                      title="Báo cáo vi phạm"
                    >
                      <ShieldAlert className="h-5 w-5 text-slate-400" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => setIsUnmatchModalOpen(true)}
                      title="Hủy tương hợp"
                    >
                      <UserX className="h-5 w-5 text-slate-400" />
                    </Button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 scrollbar-hide">
                  {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    const time = msg.createdAt ? new Date((msg.createdAt as any).seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex w-full',
                          isMe ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div className={cn(
                          'max-w-[85%] sm:max-w-[70%] space-y-1',
                          isMe ? 'items-end' : 'items-start'
                        )}>
                          <div className={cn(
                            'rounded-2xl shadow-sm',
                            isMe 
                              ? 'bg-gradient-to-r from-[#ff5a7a] to-[#8a14d1] text-white rounded-tr-none' 
                              : 'bg-white text-slate-900 border border-slate-100 rounded-tl-none',
                            msg.type === 'image' ? 'p-1' : 'px-4 py-2.5 text-sm'
                          )}>
                            {msg.type === 'image' ? (
                              <img src={msg.imageUrl} alt="Chat image" className="max-w-full rounded-xl" referrerPolicy="no-referrer" />
                            ) : (
                              msg.content
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 px-1">{time}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendMessage} className="p-3 sm:p-6 bg-white border-t border-slate-100 relative pb-safe">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageSelect}
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-full text-slate-400 hover:text-[#ff5a7a]"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Image className="h-5 w-5" />
                      </Button>
                      <div className="relative" ref={emojiPickerRef}>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-full text-slate-400 hover:text-[#ff5a7a]"
                          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                        >
                          <Smile className="h-5 w-5" />
                        </Button>
                        {isEmojiPickerOpen && (
                          <div className="absolute bottom-14 left-0 z-50 shadow-2xl scale-90 sm:scale-100 origin-bottom-left">
                            <EmojiPicker onEmojiClick={handleEmojiClick} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Nhập tin nhắn..."
                        className="h-11 sm:h-12 w-full rounded-full bg-slate-100 px-5 sm:px-6 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5a7a40]"
                      />
                    </div>
                    <Button type="submit" variant="gradient" size="icon" className="h-11 w-11 sm:h-12 sm:w-12 rounded-full shadow-lg flex-shrink-0">
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-12">
                <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm">
                  <Heart className="h-12 w-12 text-[#ff5a7a20] fill-current" />
                </div>
                <h3 className="mb-2 text-2xl font-bold text-slate-900">Bắt đầu cuộc trò chuyện</h3>
                <p className="max-w-md text-slate-500">
                  Chọn một người bạn đã match để bắt đầu tìm hiểu nhau nhiều hơn nhé!
                </p>
                <div className="mt-8 flex items-center gap-2 rounded-full bg-[#ff5a7a10] px-4 py-2 text-xs font-bold text-[#ff5a7a]">
                  <Sparkles className="h-4 w-4" />
                  <span>Chỉ những người đã match mới có thể chat</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Báo cáo vi phạm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Vui lòng cho chúng tôi biết lý do bạn báo cáo người dùng này. Chúng tôi sẽ xem xét và xử lý trong vòng 24h.
          </p>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Lý do báo cáo..."
            className="w-full min-h-[120px] rounded-2xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5a7a40]"
          />
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 rounded-2xl"
              onClick={() => setIsReportModalOpen(false)}
            >
              Hủy
            </Button>
            <Button 
              variant="gradient" 
              className="flex-1 rounded-2xl"
              onClick={handleReport}
              disabled={isSubmitting || !reportReason.trim()}
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unmatch Modal */}
      <Modal
        isOpen={isUnmatchModalOpen}
        onClose={() => setIsUnmatchModalOpen(false)}
        title="Hủy tương hợp"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Bạn có chắc chắn muốn hủy tương hợp với <strong>{selectedProfile?.fullName}</strong>? 
            Hành động này không thể hoàn tác và toàn bộ tin nhắn sẽ bị xóa.
          </p>
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1 rounded-2xl"
              onClick={() => setIsUnmatchModalOpen(false)}
            >
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1 rounded-2xl"
              onClick={handleUnmatch}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận hủy'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Chat;
