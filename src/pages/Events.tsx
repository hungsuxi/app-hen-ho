/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, Clock, ArrowRight, Sparkles, Filter, Search, X, Plus, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { cn, formatDate } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/Toast';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/firebase';
import { Event } from '@/src/types';

const Events = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [filter, setFilter] = React.useState('all');
  const [events, setEvents] = React.useState<Event[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = React.useState({
    title: '',
    city: '',
    district: '',
    eventDate: '',
    location: '',
    capacity: 30,
    description: '',
    imageUrl: '',
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for base64 in Firestore
        showToast('Ảnh quá lớn. Vui lòng chọn ảnh dưới 1MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  React.useEffect(() => {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, orderBy('eventDate', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setEvents(eventsData);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'events');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRegister = async (eventId: string, eventTitle: string) => {
    if (!user) {
      showToast('Vui lòng đăng nhập để đăng ký sự kiện.', 'error');
      navigate('/login');
      return;
    }

    try {
      const registrationsRef = collection(db, 'eventRegistrations');
      await addDoc(registrationsRef, {
        userId: user.uid,
        eventId,
        eventTitle,
        registeredAt: serverTimestamp(),
        status: 'pending',
      });
      showToast('Đăng ký sự kiện thành công! Chúng tôi sẽ liên hệ với bạn sớm.', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'eventRegistrations');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'admin') {
      showToast('Bạn không có quyền thực hiện hành động này.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const eventsRef = collection(db, 'events');
      await addDoc(eventsRef, {
        ...formData,
        capacity: Number(formData.capacity),
        status: 'open',
        createdAt: serverTimestamp(),
      });
      showToast('Tạo sự kiện thành công!', 'success');
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        city: '',
        district: '',
        eventDate: '',
        location: '',
        capacity: 30,
        description: '',
        imageUrl: '',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'events');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') {
      return new Date(event.eventDate) > new Date();
    }
    return (event.city || '').toLowerCase() === filter.toLowerCase();
  });

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#f7f3f3] pt-20 sm:pt-32 pb-20">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Hero Section */}
        <div className="relative mb-8 sm:mb-12 overflow-hidden rounded-[32px] sm:rounded-[40px] bg-gradient-to-br from-[#8a14d1] to-[#ff5a7a] p-8 sm:p-12 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs sm:text-sm font-medium backdrop-blur-md"
            >
              <Sparkles className="h-4 w-4" />
              <span>Gặp gỡ trực tiếp - Kết nối thực tế</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 text-3xl font-extrabold tracking-tight sm:text-5xl"
            >
              Sự kiện & <span className="text-white/80 italic">Meetup</span> cộng đồng
            </motion.h1>
            
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sự kiện..."
                  className="h-12 sm:h-14 w-full rounded-2xl bg-white/10 pl-12 pr-4 text-sm sm:text-base text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-md"
                />
              </div>
              <Button variant="secondary" size="lg" className="h-12 sm:h-14 bg-white text-[#8a14d1]">
                <Filter className="mr-2 h-5 w-5" /> Lọc sự kiện
              </Button>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 right-40 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </div>

        {/* Filter Tabs */}
        <div className="mb-8 sm:mb-10 flex items-center justify-between gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-3 sm:gap-4">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'seoul', label: 'Seoul' },
              { id: 'incheon', label: 'Incheon' },
              { id: 'busan', label: 'Busan' },
              { id: 'upcoming', label: 'Sắp tới' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  'whitespace-nowrap rounded-full px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all',
                  filter === item.id 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          
          {isAdmin && (
            <Button 
              variant="gradient" 
              size="sm"
              className="rounded-full shadow-lg whitespace-nowrap"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Tạo sự kiện
            </Button>
          )}
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid gap-10 lg:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 animate-pulse rounded-[32px] bg-white shadow-sm" />
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid gap-10 lg:grid-cols-2">
            {filteredEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="group relative flex flex-col overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-xl sm:flex-row">
                  {/* Event Image */}
                  <div className="relative aspect-video w-full overflow-hidden sm:aspect-square sm:w-48">
                    <img
                      src={event.imageUrl || `https://picsum.photos/seed/${event.id}/400/400`}
                      alt={event.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4">
                      <div className={cn(
                        'rounded-full px-3 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-md',
                        event.status === 'open' ? 'bg-emerald-500/90' : 'bg-red-500/90'
                      )}>
                        {event.status === 'open' ? 'ĐANG MỞ' : 'HẾT CHỖ'}
                      </div>
                    </div>
                  </div>

                  {/* Event Info */}
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#ff5a7a] uppercase tracking-wider">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(event.eventDate)}</span>
                      </div>
                      <h3 className="mb-3 text-xl font-bold text-slate-900 leading-tight group-hover:text-[#ff5a7a] transition-colors">
                        {event.title}
                      </h3>
                      
                      <div className="mb-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Users className="h-4 w-4" />
                          <span>{event.capacity} người tham gia tối đa</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                            <img src={`https://picsum.photos/seed/user${i}/32/32`} alt="User" referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>
                      <Button 
                        variant={event.status === 'open' ? 'gradient' : 'outline'} 
                        size="sm" 
                        className="rounded-xl"
                        onClick={() => handleRegister(event.id, event.title)}
                      >
                        {event.status === 'open' ? 'Đăng ký ngay' : 'Xem chi tiết'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Calendar className="h-10 w-10" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">Không tìm thấy sự kiện nào</h3>
            <p className="text-slate-500">Hãy thử thay đổi bộ lọc hoặc quay lại sau.</p>
          </div>
        )}

        {/* Create Event CTA */}
        <div className="mt-12 sm:mt-20 rounded-[32px] sm:rounded-[40px] bg-white p-8 sm:p-12 shadow-lg border border-slate-100">
          <div className="flex flex-col items-center gap-6 sm:gap-8 text-center lg:flex-row lg:text-left">
            <div className="flex-1">
              <h2 className="mb-3 sm:mb-4 text-2xl sm:text-3xl font-extrabold text-slate-900">Bạn muốn tổ chức sự kiện?</h2>
              <p className="text-sm sm:text-lg text-slate-600">
                Hãy tạo những buổi gặp mặt ý nghĩa để kết nối cộng đồng người Việt tại khu vực của bạn. 
                Chúng tôi sẽ hỗ trợ bạn truyền thông và quản lý đăng ký.
              </p>
            </div>
            <Button 
              variant="gradient" 
              size="lg" 
              className="w-full sm:w-auto rounded-2xl px-12"
              onClick={() => isAdmin ? setIsCreateModalOpen(true) : showToast('Vui lòng liên hệ Admin để tổ chức sự kiện.', 'info')}
            >
              Tạo sự kiện mới <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[24px] sm:rounded-[40px] bg-white shadow-2xl mx-4 sm:mx-0"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-8">
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Tạo sự kiện mới</h2>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateEvent} className="max-h-[80vh] overflow-y-auto p-5 sm:p-8 scrollbar-hide">
                <div className="grid gap-5 sm:gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      label="Tên sự kiện"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ví dụ: Meetup Kết nối Seoul"
                      className="rounded-xl sm:rounded-2xl"
                    />
                  </div>
                  <Input
                    label="Thành phố"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ví dụ: Seoul"
                    className="rounded-xl sm:rounded-2xl"
                  />
                  <Input
                    label="Quận/Huyện"
                    required
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="Ví dụ: Gangnam"
                    className="rounded-xl sm:rounded-2xl"
                  />
                  <Input
                    label="Ngày giờ diễn ra"
                    type="datetime-local"
                    required
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="rounded-xl sm:rounded-2xl"
                  />
                  <Input
                    label="Số lượng tham gia tối đa"
                    type="number"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="rounded-xl sm:rounded-2xl"
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Địa điểm chi tiết"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Ví dụ: Cổng số 10, Ga Gangnam"
                      className="rounded-xl sm:rounded-2xl"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-slate-700">Ảnh sự kiện</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "relative flex h-40 sm:h-48 w-full cursor-pointer flex-col items-center justify-center rounded-[24px] sm:rounded-[32px] border-2 border-dashed transition-all overflow-hidden",
                        formData.imageUrl ? "border-transparent" : "border-slate-200 hover:border-[#ff5a7a] hover:bg-[#ff5a7a05]"
                      )}
                    >
                      {formData.imageUrl ? (
                        <>
                          <img 
                            src={formData.imageUrl} 
                            alt="Preview" 
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900">
                              <Upload className="h-4 w-4" /> Thay đổi ảnh
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center text-slate-400 p-4 text-center">
                          <div className="mb-2 sm:mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-slate-50">
                            <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                          <p className="text-xs sm:text-sm font-medium">Nhấn để tải ảnh lên (Dưới 1MB)</p>
                          <p className="mt-1 text-[10px] sm:text-xs">PNG, JPG, GIF</p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Hoặc URL hình ảnh"
                      value={formData.imageUrl.startsWith('data:') ? '' : formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="rounded-xl sm:rounded-2xl"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-slate-700">Mô tả sự kiện</label>
                    <textarea
                      required
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 p-4 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#ff5a7a40]"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Mô tả chi tiết về nội dung sự kiện..."
                    />
                  </div>
                </div>
                
                <div className="mt-8 sm:mt-10 flex gap-3 sm:gap-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-xl sm:rounded-2xl" 
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button 
                    variant="gradient" 
                    className="flex-1 rounded-xl sm:rounded-2xl" 
                    type="submit"
                    isLoading={isSubmitting}
                  >
                    Tạo sự kiện
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ToastContainer />
    </div>
  );
};

export default Events;
