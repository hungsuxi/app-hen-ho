/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'user' | 'admin';
export type AccountStatus = 'active' | 'suspended';
export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'need_changes';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  birthYear: number;
  gender: 'male' | 'female' | 'other';
  hometownVn: string;
  heightCm: number;
  koreanRegion: string;
  occupation: string;
  datingGoal: 'serious' | 'long_term' | 'meetup' | 'friendship';
  hobbies?: string[];
  personality: string;
  partnerPreference: string;
  smoking?: 'yes' | 'no' | 'sometimes';
  drinking?: 'often' | 'sometimes' | 'no';
  mbti?: string;
  religion?: string;
  facebookUrl?: string;
  zaloNumber?: string;
  instagramUrl?: string;
  bio: string;
  avatarUrl: string;
  photoUrls: string[];
  approvalStatus: ApprovalStatus;
  reviewNote?: string;
  submittedAt?: string;
  approvedAt?: string;
  lastSubmittedAt?: any;
  bannedUntil?: string;
  warningMessage?: string;
}

export interface Match {
  id: string;
  users: [string, string];
  status: 'pending' | 'matched' | 'rejected';
  createdAt: string;
}

export interface Conversation {
  id: string;
  matchId: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt?: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  city: string;
  district: string;
  eventDate: string;
  location: string;
  capacity: number;
  description: string;
  status: 'open' | 'full' | 'closed';
  imageUrl?: string;
  createdAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}
