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
  const [reportReason, setReportReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Handle chatId from navigation state
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

  // Fetch matches/chats
  React.useEffect(() => {
    if (!user) return;

    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef, 
      where('users', 'array-contains', user.uid),
      where('status', '==', 'matched')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatData = await Promise.all(snapshot.docs.map(async (matchDoc) => {
        const data = matchDoc.data();
        const otherUid = data.users.find((id: string) => id !== user.uid);
        
        // Fetch other user's profile
        const profileRef = doc(db, 'profiles', otherUid);
        const profileSnap = await getDoc(profileRef);
        const profile = profileSnap.exists() ? profileSnap.data() as UserProfile : null;

        return {
          id: matchDoc.id,
          otherUid,
          fullName: profile?.fullName || 'Người dùng',
          avatarUrl: profile?.avatarUrl || 'https://picsum.photos/seed/avatar/100/100',
          lastMessage: data.lastMessage || 'Bắt đầu trò chuyện...',
          time: data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          isOnline: false, // Placeholder
        };
      }));

      setChats(chatData);
      setIsLoadingChats(false);
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
      const fetchProfile = async () => {
        const profileRef = doc(db, 'profiles', chat.otherUid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setSelectedProfile(profileSnap.data() as UserProfile);
        }
      };
      fetchProfile();
    }

    const messagesRef = collection(db, 'chats', selectedChat, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${selectedChat}/messages`);
    });

    return () => unsubscribe();
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
    <div className="min-h-screen bg-[#f7f3f3] pt-32 pb-20">
      <ToastContainer />
      <div className="container mx-auto h-[calc(100vh-200px)] max-w-6xl px-6">
        <div className="flex h-full overflow-hidden rounded-[40px] bg-white shadow-2xl">
          {/* Sidebar: Chat List */}
          <div className={cn(
            'flex w-full flex-col border-r border-slate-100 lg:w-80',
            selectedChat && 'hidden lg:flex'
          )}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-2xl font-extrabold text-slate-900">Tin nhắn</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                      'flex w-full items-center gap-4 rounded-3xl p-4 transition-all',
                      selectedChat === chat.id 
                        ? 'bg-gradient-to-r from-[#ff5a7a10] to-[#8a14d110] border border-[#ff5a7a20]' 
                        : 'hover:bg-slate-50 border border-transparent'
                    )}
                  >
                    <div className="relative">
                      <img
                        src={chat.avatarUrl}
                        alt={chat.fullName}
                        className="h-12 w-12 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {chat.isOnline && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{chat.fullName}</span>
                        <span className="text-[10px] text-slate-400">{chat.time}</span>
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
                <div className="flex items-center justify-between border-b border-slate-100 bg-white p-4 px-6">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedChat(null)}
                      className="lg:hidden h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedProfile?.avatarUrl || 'https://picsum.photos/seed/avatar/100/100'}
                        alt="User"
                        className="h-10 w-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h3 className="font-bold text-slate-900">{selectedProfile?.fullName || 'Người dùng'}</h3>
                        <span className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider">Đang hoạt động</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full hover:bg-red-50 hover:text-red-500"
                      onClick={() => setIsReportModalOpen(true)}
                      title="Báo cáo vi phạm"
                    >
                      <ShieldAlert className="h-5 w-5 text-slate-400" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => setIsUnmatchModalOpen(true)}
                      title="Hủy tương hợp"
                    >
                      <UserX className="h-5 w-5 text-slate-400" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full hover:bg-slate-100"
                      onClick={() => showToast('Tính năng đang được phát triển.', 'info')}
                    >
                      <MoreVertical className="h-5 w-5 text-slate-400" />
                    </Button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                          'max-w-[70%] space-y-1',
                          isMe ? 'items-end' : 'items-start'
                        )}>
                          <div className={cn(
                            'rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                            isMe 
                              ? 'bg-gradient-to-r from-[#ff5a7a] to-[#8a14d1] text-white rounded-tr-none' 
                              : 'bg-white text-slate-900 border border-slate-100 rounded-tl-none'
                          )}>
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-slate-400 px-1">{time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-[#ff5a7a]">
                        <Image className="h-5 w-5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-[#ff5a7a]">
                        <Smile className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Nhập tin nhắn..."
                        className="h-12 w-full rounded-full bg-slate-100 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5a7a40]"
                      />
                    </div>
                    <Button type="submit" variant="gradient" size="icon" className="h-12 w-12 rounded-full shadow-lg">
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
