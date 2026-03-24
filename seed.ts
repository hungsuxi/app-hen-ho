/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// This is a mock seed script. In a real app, it would use the Firebase Admin SDK or Firestore client.
console.log("Seeding database with demo data...");

const demoProfiles = [
  {
    fullName: 'Thùy Linh',
    birthYear: 1998,
    koreanRegion: 'Seoul',
    occupation: 'Nhân viên văn phòng',
    datingGoal: 'Hẹn hò nghiêm túc',
    bio: 'Thích du lịch, nấu ăn và tìm kiếm một người bạn đồng hành chân thành tại Hàn Quốc.',
    avatarUrl: 'https://picsum.photos/seed/girl1/400/500',
    approvalStatus: 'approved',
  },
  {
    fullName: 'Minh Quân',
    birthYear: 1995,
    koreanRegion: 'Incheon',
    occupation: 'Kỹ sư IT',
    datingGoal: 'Tìm hiểu lâu dài',
    bio: 'Đam mê công nghệ và thể thao. Mong muốn tìm được một nửa có cùng sở thích.',
    avatarUrl: 'https://picsum.photos/seed/boy1/400/500',
    approvalStatus: 'approved',
  },
];

console.log(`Added ${demoProfiles.length} demo profiles.`);
console.log("Seeding completed successfully!");
