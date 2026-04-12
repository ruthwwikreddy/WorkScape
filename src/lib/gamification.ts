// Gamification system for WorkScape

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'collaboration' | 'productivity' | 'social' | 'milestone';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface UserStats {
  id: string;
  userId: string;
  totalTasksCompleted: number;
  totalMeetingsAttended: number;
  totalChatMessages: number;
  totalFilesShared: number;
  totalTimeSpent: number; // in minutes
  currentStreak: number;
  longestStreak: number;
  achievements: Achievement[];
  level: number;
  experience: number;
  title: string;
}

export interface SocialAction {
  type: 'reaction' | 'mention' | 'high-five' | 'celebration';
  fromUserId: string;
  fromUserName: string;
  toUserId?: string;
  timestamp: string;
  data?: any;
}

// Achievement definitions
export const ACHIEVEMENTS: Omit<Achievement, 'unlockedAt' | 'progress' | 'maxProgress'>[] = [
  // Collaboration achievements
  {
    id: 'first-task',
    title: 'Task Master',
    description: 'Complete your first task',
    icon: '✅',
    category: 'collaboration',
    rarity: 'common',
    points: 10,
  },
  {
    id: 'task-streak-5',
    title: 'On Fire',
    description: 'Complete 5 tasks in a row',
    icon: '🔥',
    category: 'collaboration',
    rarity: 'rare',
    points: 50,
  },
  {
    id: 'task-streak-10',
    title: 'Unstoppable',
    description: 'Complete 10 tasks in a row',
    icon: '⚡',
    category: 'collaboration',
    rarity: 'epic',
    points: 100,
  },
  {
    id: 'tasks-100',
    title: 'Centurion',
    description: 'Complete 100 tasks total',
    icon: '💯',
    category: 'collaboration',
    rarity: 'rare',
    points: 75,
  },
  {
    id: 'tasks-500',
    title: 'Productivity King',
    description: 'Complete 500 tasks total',
    icon: '👑',
    category: 'collaboration',
    rarity: 'epic',
    points: 200,
  },
  
  // Social achievements
  {
    id: 'first-chat',
    title: 'Social Butterfly',
    description: 'Send your first chat message',
    icon: '💬',
    category: 'social',
    rarity: 'common',
    points: 10,
  },
  {
    id: 'chat-100',
    title: 'Conversationalist',
    description: 'Send 100 chat messages',
    icon: '🗣️',
    category: 'social',
    rarity: 'rare',
    points: 50,
  },
  {
    id: 'first-high-five',
    title: 'Team Player',
    description: 'Give your first high-five',
    icon: '🙌',
    category: 'social',
    rarity: 'common',
    points: 15,
  },
  {
    id: 'high-fives-50',
    title: 'Cheerleader',
    description: 'Give 50 high-fives',
    icon: '🎉',
    category: 'social',
    rarity: 'rare',
    points: 75,
  },
  
  // Productivity achievements
  {
    id: 'first-meeting',
    title: 'Meeting Starter',
    description: 'Attend your first meeting',
    icon: '🤝',
    category: 'productivity',
    rarity: 'common',
    points: 10,
  },
  {
    id: 'meetings-10',
    title: 'Meeting Maven',
    description: 'Attend 10 meetings',
    icon: '📅',
    category: 'productivity',
    rarity: 'rare',
    points: 50,
  },
  {
    id: 'first-file',
    title: 'File Sharer',
    description: 'Share your first file',
    icon: '📁',
    category: 'productivity',
    rarity: 'common',
    points: 10,
  },
  {
    id: 'files-20',
    title: 'Collaboration Expert',
    description: 'Share 20 files',
    icon: '📚',
    category: 'productivity',
    rarity: 'rare',
    points: 50,
  },
  
  // Milestone achievements
  {
    id: 'first-login',
    title: 'Welcome Aboard',
    description: 'Log in for the first time',
    icon: '🚀',
    category: 'milestone',
    rarity: 'common',
    points: 5,
  },
  {
    id: 'streak-3',
    title: 'Consistent',
    description: 'Log in 3 days in a row',
    icon: '📈',
    category: 'milestone',
    rarity: 'rare',
    points: 30,
  },
  {
    id: 'streak-7',
    title: 'Dedicated',
    description: 'Log in 7 days in a row',
    icon: '🌟',
    category: 'milestone',
    rarity: 'epic',
    points: 75,
  },
  {
    id: 'streak-30',
    title: 'Legend',
    description: 'Log in 30 days in a row',
    icon: '🏆',
    category: 'milestone',
    rarity: 'legendary',
    points: 300,
  },
];

// User titles based on level and achievements
export const USER_TITLES = [
  { level: 1, title: 'Intern' },
  { level: 5, title: 'Junior Associate' },
  { level: 10, title: 'Associate' },
  { level: 15, title: 'Senior Associate' },
  { level: 20, title: 'Team Lead' },
  { level: 30, title: 'Senior Team Lead' },
  { level: 40, title: 'Manager' },
  { level: 50, title: 'Senior Manager' },
  { level: 60, title: 'Director' },
  { level: 75, title: 'Senior Director' },
  { level: 90, title: 'VP' },
  { level: 100, title: 'Executive' },
];

// Experience points required for each level
export const LEVEL_XP = Array.from({ length: 101 }, (_, i) => i * 100);

// Calculate level from experience points
export function calculateLevel(experience: number): number {
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (experience >= LEVEL_XP[i]) {
      return i + 1;
    }
  }
  return 1;
}

// Get user title based on level
export function getUserTitle(level: number): string {
  const title = USER_TITLES.find(t => level >= t.level);
  return title?.title || 'Intern';
}

// Check if an achievement should be unlocked
export function checkAchievement(
  achievementId: string,
  stats: UserStats
): boolean {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!achievement) return false;
  
  switch (achievementId) {
    case 'first-task':
      return stats.totalTasksCompleted >= 1;
    case 'task-streak-5':
      return stats.currentStreak >= 5;
    case 'task-streak-10':
      return stats.currentStreak >= 10;
    case 'tasks-100':
      return stats.totalTasksCompleted >= 100;
    case 'tasks-500':
      return stats.totalTasksCompleted >= 500;
    case 'first-chat':
      return stats.totalChatMessages >= 1;
    case 'chat-100':
      return stats.totalChatMessages >= 100;
    case 'first-high-five':
      return stats.achievements.some(a => a.id === 'first-high-five');
    case 'high-fives-50':
      return stats.achievements.filter(a => a.id === 'first-high-five').length >= 50;
    case 'first-meeting':
      return stats.totalMeetingsAttended >= 1;
    case 'meetings-10':
      return stats.totalMeetingsAttended >= 10;
    case 'first-file':
      return stats.totalFilesShared >= 1;
    case 'files-20':
      return stats.totalFilesShared >= 20;
    case 'first-login':
      return true; // Already logged in to check
    case 'streak-3':
      return stats.currentStreak >= 3;
    case 'streak-7':
      return stats.currentStreak >= 7;
    case 'streak-30':
      return stats.currentStreak >= 30;
    default:
      return false;
  }
}

// Calculate achievement progress
export function getAchievementProgress(
  achievementId: string,
  stats: UserStats
): { progress: number; maxProgress: number } {
  switch (achievementId) {
    case 'task-streak-5':
      return { progress: stats.currentStreak, maxProgress: 5 };
    case 'task-streak-10':
      return { progress: stats.currentStreak, maxProgress: 10 };
    case 'tasks-100':
      return { progress: stats.totalTasksCompleted, maxProgress: 100 };
    case 'tasks-500':
      return { progress: stats.totalTasksCompleted, maxProgress: 500 };
    case 'chat-100':
      return { progress: stats.totalChatMessages, maxProgress: 100 };
    case 'high-fives-50':
      return { progress: stats.achievements.filter(a => a.id === 'first-high-five').length, maxProgress: 50 };
    case 'meetings-10':
      return { progress: stats.totalMeetingsAttended, maxProgress: 10 };
    case 'files-20':
      return { progress: stats.totalFilesShared, maxProgress: 20 };
    case 'streak-3':
      return { progress: stats.currentStreak, maxProgress: 3 };
    case 'streak-7':
      return { progress: stats.currentStreak, maxProgress: 7 };
    case 'streak-30':
      return { progress: stats.currentStreak, maxProgress: 30 };
    default:
      return { progress: 0, maxProgress: 1 };
  }
}

// Social reaction types
export const REACTIONS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '🤔', label: 'Think' },
  { emoji: '🙌', label: 'High Five' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '💯', label: '100' },
];

// Get rarity color
export function getRarityColor(rarity: Achievement['rarity']): string {
  switch (rarity) {
    case 'common':
      return 'text-gray-400';
    case 'rare':
      return 'text-blue-400';
    case 'epic':
      return 'text-purple-400';
    case 'legendary':
      return 'text-yellow-400';
    default:
      return 'text-gray-400';
  }
}

// Get rarity background
export function getRarityBg(rarity: Achievement['rarity']): string {
  switch (rarity) {
    case 'common':
      return 'bg-gray-500/20 border-gray-500/30';
    case 'rare':
      return 'bg-blue-500/20 border-blue-500/30';
    case 'epic':
      return 'bg-purple-500/20 border-purple-500/30';
    case 'legendary':
      return 'bg-yellow-500/20 border-yellow-500/30';
    default:
      return 'bg-gray-500/20 border-gray-500/30';
  }
}
