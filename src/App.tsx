/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '@/src/components/layout/Navbar';
import Home from '@/src/pages/Home';
import Auth from '@/src/pages/Auth';
import ProfileComplete from '@/src/pages/ProfileComplete';
import Explore from '@/src/pages/Explore';
import Events from '@/src/pages/Events';
import Matches from '@/src/pages/Matches';
import Chat from '@/src/pages/Chat';
import Admin from '@/src/pages/Admin';
import Profile from '@/src/pages/Profile';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { FirebaseProvider, ErrorBoundary } from '@/src/contexts/FirebaseContext';
import Modal from '@/src/components/ui/Modal';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Button } from '@/src/components/ui/Button';
import { Info } from 'lucide-react';

export default function App() {
  const { warningMessage, setWarningMessage } = useAuthStore();

  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <Router>
          <div className="min-h-screen bg-[#f7f3f3] font-sans text-slate-900 selection:bg-[#ff5a7a20] selection:text-[#ff5a7a]">
            <Navbar />
            
            {warningMessage && (
              <Modal
                isOpen={!!warningMessage}
                onClose={() => setWarningMessage(null)}
                title="Thông báo từ hệ thống"
                className="max-w-md"
              >
                <div className="space-y-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                    <Info className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900">Nhắc nhở quan trọng</h3>
                    <p className="text-slate-600 leading-relaxed">{warningMessage}</p>
                  </div>
                  <Button 
                    className="w-full rounded-2xl bg-slate-900 text-white"
                    onClick={() => setWarningMessage(null)}
                  >
                    Tôi đã hiểu
                  </Button>
                </div>
              </Modal>
            )}

            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Auth mode="login" />} />
              <Route path="/register" element={<Auth mode="register" />} />
              <Route path="/profile/complete" element={<ProtectedRoute><ProfileComplete /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:uid" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/explore" element={<ProtectedRoute allowGuest><Explore /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute allowGuest><Events /></ProtectedRoute>} />
              <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
