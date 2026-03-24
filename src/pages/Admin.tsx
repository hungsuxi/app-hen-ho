/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { Users, ShieldCheck, Calendar, MessageCircle, ShieldAlert, CheckCircle, XCircle, MoreVertical, Search, Filter, ArrowRight, Eye, MapPin, Briefcase, Heart, Info } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import Modal from '@/src/components/ui/Modal';
import { cn, formatDate, calculateAge } from '@/src/lib/utils';
import { db, handleFirestoreError, OperationType } from '@/src/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, setDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { UserProfile } from '@/src/types';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useToast } from '@/src/components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { TEST_PROFILES } from '@/src/lib/testData';
import { Database } from 'lucide-react';

const Admin = () => {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const { showToast, ToastContainer } = useToast();
  const navigate = useNavigate();
  const [pendingProfiles, setPendingProfiles] = React.useState<UserProfile[]>([]);
  const [reports, setReports] = React.useState<any[]>([]);
  const [totalUsers, setTotalUsers] = React.useState(0);
  const [approvedProfilesCount, setApprovedProfilesCount] = React.useState(0);
  const [totalEvents, setTotalEvents] = React.useState(0);
  const [upcomingEvents, setUpcomingEvents] = React.useState<any[]>([]);
  const [registrations, setRegistrations] = React.useState<any[]>([]);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'profiles' | 'reports'>('profiles');
  const [reviewFilter, setReviewFilter] = React.useState<'all' | 'pending'>('pending');
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [selectedProfile, setSelectedProfile] = React.useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<any | null>(null);
  const [warningMessage, setWarningMessage] = React.useState('');

  React.useEffect(() => {
    if (isAuthLoading) return;

    if (!user || user.role !== 'admin') {
      showToast('Bạn không có quyền truy cập trang này.', 'error');
      navigate('/');
      return;
    }

    setIsAdmin(true);
  }, [user, navigate, showToast, isAuthLoading]);

  React.useEffect(() => {
    if (!isAdmin) return;

    const profilesRef = collection(db, 'profiles');
    const q = reviewFilter === 'pending' 
      ? query(profilesRef, where('approvalStatus', '==', 'pending_review'))
      : query(profilesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profileData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as unknown as UserProfile[];
      setPendingProfiles(profileData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
    });

    return () => unsubscribe();
  }, [isAdmin, reviewFilter]);

  React.useEffect(() => {
    if (!isAdmin) return;

    const reportsRef = collection(db, 'reports');
    const q = query(reportsRef, where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(reportData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });

    return () => unsubscribe();
  }, [isAdmin]);

  React.useEffect(() => {
    if (!isAdmin) return;

    // Fetch total users count
    const usersRef = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      setTotalUsers(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Fetch approved profiles count
    const profilesRef = collection(db, 'profiles');
    const qApproved = query(profilesRef, where('approvalStatus', '==', 'approved'));
    const unsubscribeApproved = onSnapshot(qApproved, (snapshot) => {
      setApprovedProfilesCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
    });

    // Fetch total events count
    const eventsRef = collection(db, 'events');
    const unsubscribeEvents = onSnapshot(eventsRef, (snapshot) => {
      setTotalEvents(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    // Fetch upcoming events for the sidebar
    const qUpcoming = query(eventsRef, orderBy('eventDate', 'asc'), limit(3));
    const unsubscribeUpcoming = onSnapshot(qUpcoming, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUpcomingEvents(eventsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    // Fetch all registrations to count them per event
    const registrationsRef = collection(db, 'eventRegistrations');
    const unsubscribeRegs = onSnapshot(registrationsRef, (snapshot) => {
      const regsData = snapshot.docs.map(doc => doc.data());
      setRegistrations(regsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'eventRegistrations');
    });

    return () => {
      unsubscribeUsers();
      unsubscribeApproved();
      unsubscribeEvents();
      unsubscribeUpcoming();
      unsubscribeRegs();
    };
  }, [isAdmin]);

  const handleReview = async (profileId: string, status: 'approved' | 'rejected') => {
    try {
      const profileRef = doc(db, 'profiles', profileId);
      await updateDoc(profileRef, { 
        approvalStatus: status,
        approvedAt: status === 'approved' ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });
      showToast(`Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} hồ sơ thành công!`, 'success');
      if (selectedProfile?.uid === profileId) {
        setIsModalOpen(false);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `profiles/${profileId}`);
    }
  };

  const handleViewProfile = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setIsModalOpen(true);
  };

  const handleReportAction = async (reportId: string, action: 'resolved' | 'dismissed' | 'process') => {
    if (action === 'process') {
      const report = reports.find(r => r.id === reportId);
      setSelectedReport(report);
      setIsReportModalOpen(true);
      return;
    }
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, { 
        status: action,
        resolvedAt: serverTimestamp(),
        resolvedBy: user?.uid
      });
      showToast(`Đã ${action === 'resolved' ? 'xử lý' : 'bỏ qua'} báo cáo thành công!`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const handleProcessReport = async (actionType: 'ban' | 'reject' | 'warn') => {
    if (!selectedReport) return;
    const targetId = selectedReport.targetId || selectedReport.reportedId;
    
    if (!targetId) {
      showToast('Không tìm thấy ID người dùng bị báo cáo.', 'error');
      return;
    }

    try {
      const profileRef = doc(db, 'profiles', targetId);
      const reportRef = doc(db, 'reports', selectedReport.id);

      if (actionType === 'ban') {
        const bannedUntil = new Date();
        bannedUntil.setDate(bannedUntil.getDate() + 3);
        await updateDoc(profileRef, {
          bannedUntil: bannedUntil.toISOString(),
          updatedAt: serverTimestamp()
        });
        showToast('Đã cấm tài khoản 3 ngày.', 'success');
      } else if (actionType === 'reject') {
        await updateDoc(profileRef, {
          approvalStatus: 'rejected',
          updatedAt: serverTimestamp()
        });
        showToast('Đã hủy hồ sơ.', 'success');
      } else if (actionType === 'warn') {
        if (!warningMessage.trim()) {
          showToast('Vui lòng nhập nội dung nhắc nhở.', 'error');
          return;
        }
        await updateDoc(profileRef, {
          warningMessage: warningMessage.trim(),
          updatedAt: serverTimestamp()
        });
        showToast('Đã gửi thông báo nhắc nhở.', 'success');
      }

      await updateDoc(reportRef, {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        resolvedBy: user?.uid,
        actionTaken: actionType
      });

      setIsReportModalOpen(false);
      setSelectedReport(null);
      setWarningMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `profiles/${targetId}`);
    }
  };

  const handleSeedTestData = async () => {
    setIsSeeding(true);
    try {
      for (const profile of TEST_PROFILES) {
        if (profile.uid) {
          await setDoc(doc(db, 'profiles', profile.uid), {
            ...profile,
            id: profile.uid, // Ensure id is also set
            approvalStatus: 'pending_review', // Set to pending so admin can review them
            submittedAt: new Date().toISOString(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      showToast(`Đã thêm ${TEST_PROFILES.length} hồ sơ mẫu vào hàng chờ duyệt!`, 'success');
    } catch (error) {
      console.error('Seeding error:', error);
      showToast('Lỗi khi thêm dữ liệu mẫu.', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f3f3]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#ff5a7a] border-t-transparent"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f7f3f3] pt-32 pb-20">
      <ToastContainer />
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-500">Quản lý người dùng, duyệt hồ sơ và điều phối sự kiện.</p>
          </div>
          <Button 
            onClick={handleSeedTestData}
            variant="outline" 
            className="rounded-2xl bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            disabled={isSeeding}
          >
            <Database className="mr-2 h-4 w-4" /> 
            {isSeeding ? 'Đang thêm...' : 'Thêm dữ liệu mẫu'}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Tổng người dùng', value: totalUsers.toLocaleString(), icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Hồ sơ đã duyệt', value: approvedProfilesCount.toLocaleString(), icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: 'Chờ duyệt', value: pendingProfiles.length.toLocaleString(), icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Sự kiện', value: totalEvents.toLocaleString(), icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="flex items-center gap-6 p-8 border-none shadow-sm">
                <div className={cn('flex h-16 w-16 items-center justify-center rounded-3xl', stat.bg, stat.color)}>
                  <stat.icon className="h-8 w-8" />
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-slate-900">{stat.value}</div>
                  <div className="text-sm font-medium text-slate-500">{stat.label}</div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-10 flex gap-4 border-b border-slate-200">
          <button 
            className={cn(
              "pb-4 text-sm font-bold transition-all border-b-2",
              activeTab === 'profiles' ? "border-[#ff5a7a] text-[#ff5a7a]" : "border-transparent text-slate-400"
            )}
            onClick={() => setActiveTab('profiles')}
          >
            Duyệt hồ sơ ({pendingProfiles.length})
          </button>
          <button 
            className={cn(
              "pb-4 text-sm font-bold transition-all border-b-2",
              activeTab === 'reports' ? "border-[#ff5a7a] text-[#ff5a7a]" : "border-transparent text-slate-400"
            )}
            onClick={() => setActiveTab('reports')}
          >
            Báo cáo vi phạm ({reports.length})
          </button>
        </div>

        {activeTab === 'profiles' ? (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column: Profile Review Queue */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Duyệt hồ sơ mới ({pendingProfiles.length})</h2>
                <div className="flex items-center gap-2">
                  <Button 
                    variant={reviewFilter === 'pending' ? 'gradient' : 'outline'} 
                    size="sm" 
                    className="rounded-xl bg-white"
                    onClick={() => setReviewFilter('pending')}
                  >
                    <Filter className="mr-2 h-4 w-4" /> Chờ duyệt
                  </Button>
                  <Button 
                    variant={reviewFilter === 'all' ? 'gradient' : 'outline'} 
                    size="sm" 
                    className="rounded-xl bg-white"
                    onClick={() => setReviewFilter('all')}
                  >
                    Tất cả <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

            <div className="space-y-4">
              {pendingProfiles.length > 0 ? (
                pendingProfiles.map((profile, i) => (
                  <motion.div
                    key={profile.uid}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="flex items-center justify-between p-6 border-none shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <img
                          src={profile.avatarUrl}
                          alt={profile.fullName}
                          className="h-14 w-14 rounded-2xl object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900">{profile.fullName}</h3>
                            {reviewFilter === 'all' && (
                              <span className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                profile.approvalStatus === 'approved' ? "bg-emerald-100 text-emerald-600" :
                                profile.approvalStatus === 'rejected' ? "bg-red-100 text-red-600" :
                                "bg-amber-100 text-amber-600"
                              )}>
                                {profile.approvalStatus === 'approved' ? 'Đã duyệt' :
                                 profile.approvalStatus === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{profile.koreanRegion}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>{profile.occupation}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>{profile.createdAt ? formatDate(profile.createdAt) : 'Mới'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                          onClick={() => handleViewProfile(profile)}
                        >
                          <Eye className="mr-2 h-4 w-4" /> Chi tiết
                        </Button>
                        
                        {(profile.approvalStatus === 'pending_review' || profile.approvalStatus === 'rejected') && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            onClick={() => handleReview(profile.uid, 'approved')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" /> Duyệt
                          </Button>
                        )}
                        
                        {(profile.approvalStatus === 'pending_review' || profile.approvalStatus === 'approved') && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                            onClick={() => handleReview(profile.uid, 'rejected')}
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Từ chối
                          </Button>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <Card className="p-12 text-center text-slate-500">
                  Không có hồ sơ nào đang chờ duyệt.
                </Card>
              )}
            </div>
          </div>

          {/* Right Column: Recent Activity & Reports */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm p-6">
              <h2 className="mb-6 text-xl font-bold text-slate-900">Báo cáo vi phạm ({reports.length})</h2>
              <div className="space-y-4">
                {reports.length > 0 ? reports.slice(0, 3).map((report) => (
                  <div key={report.id} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500 shrink-0">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900 truncate">{report.reporterName || 'Nặc danh'}</span>
                        <span className="text-[10px] text-slate-400">Mới</span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{report.reason}</p>
                      <div className="mt-3 flex gap-2">
                        <button 
                          className="text-[10px] font-bold text-red-500 hover:underline"
                          onClick={() => handleReportAction(report.id, 'process')}
                        >
                          Xử lý
                        </button>
                        <button 
                          className="text-[10px] font-bold text-slate-400 hover:underline"
                          onClick={() => handleReportAction(report.id, 'dismissed')}
                        >
                          Bỏ qua
                        </button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500 text-center py-4">Không có báo cáo mới.</p>
                )}
                <Button 
                  variant="outline" 
                  className="w-full rounded-xl bg-white text-xs font-bold"
                  onClick={() => setActiveTab('reports')}
                >
                  Xem tất cả báo cáo
                </Button>
              </div>
            </Card>

            <Card className="border-none shadow-sm p-6">
              <h2 className="mb-6 text-xl font-bold text-slate-900">Sự kiện sắp tới</h2>
              <div className="space-y-6">
                {upcomingEvents.length > 0 ? upcomingEvents.map((event, i) => {
                  const eventRegs = registrations.filter(r => r.eventId === event.id).length;
                  return (
                    <div key={event.id || i} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-900 line-clamp-1">{event.title}</span>
                        <span className="text-xs text-slate-500">{eventRegs}/{event.capacity}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#ff5a7a] to-[#8a14d1]" 
                          style={{ width: `${Math.min(100, (eventRegs / event.capacity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-slate-500 text-center py-4">Không có sự kiện sắp tới.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Danh sách báo cáo vi phạm</h2>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('profiles')}>
              Quay lại duyệt hồ sơ
            </Button>
          </div>
          {reports.length > 0 ? reports.map((report) => (
            <Card key={report.id} className="p-6 border-none shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Báo cáo từ: {report.reporterName || 'Nặc danh'}</h3>
                    <p className="text-sm text-slate-500">Đối tượng: {report.targetName || 'Hồ sơ #' + (report.targetId || report.reportedId)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-500 hover:bg-red-50"
                    onClick={() => handleReportAction(report.id, 'process')}
                  >
                    Xử lý
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleReportAction(report.id, 'dismissed')}
                  >
                    Bỏ qua
                  </Button>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  <span className="font-bold">Lý do:</span> {report.reason}
                </p>
              </div>
            </Card>
          )) : (
            <div className="py-20 text-center">
              <p className="text-slate-500">Không có báo cáo vi phạm nào.</p>
            </div>
          )}
        </div>
      )}

      {/* Profile Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Chi tiết hồ sơ"
        className="max-w-2xl"
      >
        {selectedProfile && (
          <div className="space-y-8">
            <div className="flex items-center gap-6">
              <img
                src={selectedProfile.avatarUrl}
                alt={selectedProfile.fullName}
                className="h-24 w-24 rounded-3xl object-cover shadow-lg"
                referrerPolicy="no-referrer"
              />
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{selectedProfile.fullName}</h3>
                <div className="mt-1 flex items-center gap-3 text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {selectedProfile.koreanRegion}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{calculateAge(selectedProfile.birthYear)} tuổi</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{selectedProfile.gender === 'male' ? 'Nam' : 'Nữ'}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nghề nghiệp</label>
                <div className="flex items-center gap-2 text-slate-700">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <span>{selectedProfile.occupation}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tôn giáo</label>
                <div className="text-slate-700">{selectedProfile.religion || 'Không có'}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Hút thuốc</label>
                <div className="text-slate-700">{selectedProfile.smoking === 'yes' ? 'Có' : 'Không'}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Uống rượu</label>
                <div className="text-slate-700">
                  {selectedProfile.drinking === 'often' ? 'Thường xuyên' : 
                   selectedProfile.drinking === 'sometimes' ? 'Thỉnh thoảng' : 'Không'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">MBTI</label>
                <div className="font-mono font-bold text-[#ff5a7a]">{selectedProfile.mbti || 'Chưa cập nhật'}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Trạng thái duyệt</label>
                <div>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    selectedProfile.approvalStatus === 'approved' ? "bg-emerald-100 text-emerald-800" :
                    selectedProfile.approvalStatus === 'rejected' ? "bg-red-100 text-red-800" :
                    "bg-amber-100 text-amber-800"
                  )}>
                    {selectedProfile.approvalStatus === 'approved' ? 'Đã duyệt' :
                     selectedProfile.approvalStatus === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Giới thiệu bản thân</label>
              <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 italic">
                "{selectedProfile.bio}"
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Sở thích</label>
              <div className="flex flex-wrap gap-2">
                {selectedProfile.hobbies?.map((hobby, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 rounded-xl bg-[#ff5a7a]/10 px-3 py-1 text-xs font-medium text-[#ff5a7a]">
                    <Heart className="h-3 w-3 fill-current" /> {hobby}
                  </span>
                ))}
              </div>
            </div>

            {/* Full Album Section */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Album ảnh ({selectedProfile.photoUrls?.length || 0})</label>
              <div className="grid grid-cols-3 gap-3">
                {selectedProfile.photoUrls && selectedProfile.photoUrls.length > 0 ? (
                  selectedProfile.photoUrls.map((url, idx) => (
                    <div key={idx} className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                      <img 
                        src={url} 
                        alt={`Album ${idx + 1}`} 
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        onClick={() => window.open(url, '_blank')}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                        <Search className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                    Chưa có ảnh album.
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Button 
                className="flex-1 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => handleReview(selectedProfile.uid, 'approved')}
                disabled={selectedProfile.approvalStatus === 'approved'}
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Duyệt hồ sơ
              </Button>
              <Button 
                variant="outline"
                className="flex-1 rounded-2xl border-red-200 text-red-500 hover:bg-red-50"
                onClick={() => handleReview(selectedProfile.uid, 'rejected')}
                disabled={selectedProfile.approvalStatus === 'rejected'}
              >
                <XCircle className="mr-2 h-4 w-4" /> Từ chối
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Report Action Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Xử lý báo cáo vi phạm"
        className="max-w-md"
      >
        {selectedReport && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                Đang xử lý báo cáo đối với: <span className="font-bold">{selectedReport.targetName || 'Hồ sơ #' + (selectedReport.targetId || selectedReport.reportedId)}</span>
              </p>
              <p className="mt-1 text-xs text-red-600">Lý do báo cáo: {selectedReport.reason}</p>
            </div>

            <div className="space-y-3">
              <Button 
                variant="outline"
                className="w-full justify-start rounded-2xl bg-white border-slate-200 text-slate-700 hover:bg-slate-50 border h-auto py-3"
                onClick={() => handleProcessReport('ban')}
              >
                <ShieldAlert className="mr-3 h-5 w-5 text-amber-500" />
                <div className="text-left">
                  <div className="font-bold">Cấm tài khoản 3 ngày</div>
                  <div className="text-xs text-slate-500 font-normal">Người dùng sẽ không thể đăng nhập trong 3 ngày tới.</div>
                </div>
              </Button>

              <Button 
                variant="outline"
                className="w-full justify-start rounded-2xl bg-white border-slate-200 text-slate-700 hover:bg-slate-50 border h-auto py-3"
                onClick={() => handleProcessReport('reject')}
              >
                <XCircle className="mr-3 h-5 w-5 text-red-500" />
                <div className="text-left">
                  <div className="font-bold">Hủy hồ sơ</div>
                  <div className="text-xs text-slate-500 font-normal">Chuyển trạng thái hồ sơ sang "Từ chối".</div>
                </div>
              </Button>

              <div className="space-y-2 pt-2">
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-white">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-sm text-slate-700">Thông báo nhắc nhở</div>
                    <input 
                      type="text"
                      placeholder="Nhập nội dung nhắc nhở..."
                      className="mt-1 w-full border-none p-0 text-sm focus:ring-0 placeholder:text-slate-400"
                      value={warningMessage}
                      onChange={(e) => setWarningMessage(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  className="w-full rounded-2xl bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => handleProcessReport('warn')}
                  disabled={!warningMessage.trim()}
                >
                  Gửi nhắc nhở khi đăng nhập
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  </div>
);
};

export default Admin;
