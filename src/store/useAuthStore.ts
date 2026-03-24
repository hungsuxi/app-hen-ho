/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { User, UserProfile } from '@/src/types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  warningMessage: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setWarningMessage: (message: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  warningMessage: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setWarningMessage: (warningMessage) => set({ warningMessage }),
  setIsLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, profile: null, warningMessage: null }),
}));
