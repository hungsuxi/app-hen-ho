/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: any) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: any) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function calculateAge(birthYear: number) {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
}

export function calculateMatchPercentage(user: any, target: any) {
  if (!user || !target) return 0;
  
  let score = 0;
  
  // Same region in Korea (30%)
  if (user.koreanRegion && target.koreanRegion && user.koreanRegion.toLowerCase() === target.koreanRegion.toLowerCase()) {
    score += 30;
  }
  
  // Same hometown in VN (20%)
  if (user.hometownVn && target.hometownVn && user.hometownVn.toLowerCase() === target.hometownVn.toLowerCase()) {
    score += 20;
  }
  
  // Same dating goal (20%)
  if (user.datingGoal && target.datingGoal && user.datingGoal === target.datingGoal) {
    score += 20;
  }
  
  // Age difference within 5 years (15%)
  const ageDiff = Math.abs(user.birthYear - target.birthYear);
  if (ageDiff <= 3) {
    score += 15;
  } else if (ageDiff <= 7) {
    score += 5;
  }
  
  // Shared hobbies (10%)
  const userHobbies = Array.isArray(user.hobbies) ? user.hobbies : [];
  const targetHobbies = Array.isArray(target.hobbies) ? target.hobbies : [];
  const shared = userHobbies.filter((h: string) => targetHobbies.includes(h));
  if (shared.length > 0) {
    score += Math.min(10, shared.length * 5);
  }
  
  // Same MBTI (5%)
  if (user.mbti && target.mbti && user.mbti.toLowerCase() === target.mbti.toLowerCase()) {
    score += 5;
  }

  // Same Religion (5%)
  if (user.religion && target.religion && user.religion.toLowerCase() === target.religion.toLowerCase()) {
    score += 5;
  }
  
  // Base score of 40% to make it look better
  return Math.min(100, 40 + score);
}

export function isProfileLocked(lastSubmittedAt: any) {
  if (!lastSubmittedAt) return { locked: false, remainingDays: 0 };
  const lastDate = lastSubmittedAt.toDate ? lastSubmittedAt.toDate() : new Date(lastSubmittedAt);
  const now = new Date();
  const diffTime = now.getTime() - lastDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  if (diffDays < 7) {
    return { 
      locked: true, 
      remainingDays: Math.ceil(7 - diffDays) 
    };
  }
  
  return { locked: false, remainingDays: 0 };
}
