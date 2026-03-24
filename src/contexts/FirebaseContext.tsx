/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { Component, ReactNode, ErrorInfo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { useAuthStore } from '../store/useAuthStore';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types/index';

interface FirebaseContextType {
  isAuthReady: boolean;
}

const FirebaseContext = React.createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const { setUser, setProfile, setWarningMessage, setIsLoading } = useAuthStore();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setIsAuthReady(true);

      if (firebaseUser) {
        // Listen for user data (role, status, etc.)
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubUser = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            // Ensure admin email always has admin role in state
            if (firebaseUser.email === 'michintashop@gmail.com' && data.role !== 'admin') {
              data.role = 'admin';
            }
            setUser(data as any);
          } else {
            // Fallback if doc doesn't exist yet (e.g. just registered)
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: firebaseUser.email === 'michintashop@gmail.com' ? 'admin' : 'user',
              accountStatus: 'active',
            } as any);
          }
          setIsLoading(false);
        }, (error) => {
          console.error('Error fetching user data:', error);
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`, firebaseUser);
          setIsLoading(false);
        });

        // Listen for profile changes
        const profileRef = doc(db, 'profiles', firebaseUser.uid);
        const unsubProfile = onSnapshot(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            const profileData = snapshot.data() as UserProfile;
            
            // Check for ban
            if (profileData.bannedUntil) {
              const bannedUntil = new Date(profileData.bannedUntil);
              if (bannedUntil > new Date()) {
                auth.signOut();
                // We can't easily show a toast here because we're logging out
                // The Auth page should probably handle showing the reason
                return;
              }
            }

            // Check for warning
            if (profileData.warningMessage) {
              setWarningMessage(profileData.warningMessage);
            }

            setProfile(profileData);
          } else {
            setProfile(null);
          }
        }, (error) => {
          if (error.code === 'permission-denied') {
            console.warn('Permission denied for profile fetching.');
            return;
          }
          handleFirestoreError(error, OperationType.GET, `profiles/${firebaseUser.uid}`, firebaseUser);
        });

        return () => {
          unsubUser();
          unsubProfile();
        };
      } else {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setIsLoading]);

  return (
    <FirebaseContext.Provider value={{ isAuthReady }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = React.useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary Component
export class ErrorBoundary extends (Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = 'Something went wrong.';
      try {
        // Check if the error is a FirestoreErrorInfo JSON string
        const parsedError = JSON.parse(this.state.error?.message || '');
        if (parsedError.error && parsedError.operationType) {
          errorMessage = `Firestore Error: ${parsedError.error} during ${parsedError.operationType} operation.`;
        }
      } catch (e) {
        // Not a JSON error, use the original message
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-md rounded-3xl bg-white p-8 shadow-xl">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">Oops! An error occurred</h2>
            <p className="mb-6 text-slate-600">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-slate-900 px-6 py-2 text-white hover:bg-slate-800"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}
