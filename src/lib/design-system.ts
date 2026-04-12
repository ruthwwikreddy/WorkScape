import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { colors, spacing, typography, borderRadius, shadows, transitions, zIndex, breakpoints } from '../tokens';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Design system utility functions
export const ds = {
  // Color utilities
  color: {
    bg: (color: string) => {
      if (color === 'black') return colors.primary.black;
      if (color === 'white') return colors.primary.white;
      if (color in colors.semantic) return colors.semantic[color as keyof typeof colors.semantic];
      return colors.primary.black;
    },
    text: (color: string) => {
      if (color === 'white') return colors.primary.white;
      if (color === 'black') return colors.primary.black;
      if (color in colors.semantic) return colors.semantic[color as keyof typeof colors.semantic];
      return colors.primary.white;
    },
    status: (status: keyof typeof colors.status) => colors.status[status],
  },

  // Spacing utilities
  space: (size: keyof typeof spacing) => spacing[size],

  // Typography utilities
  font: {
    size: (size: keyof typeof typography.fontSize) => typography.fontSize[size],
    weight: (weight: keyof typeof typography.fontWeight) => typography.fontWeight[weight],
    family: (family: keyof typeof typography.fontFamily) => typography.fontFamily[family],
  },

  // Border radius utilities
  radius: (size: keyof typeof borderRadius) => borderRadius[size],

  // Shadow utilities
  shadow: (size: keyof typeof shadows) => shadows[size],

  // Transition utilities
  transition: (speed: keyof typeof transitions) => transitions[speed],

  // Z-index utilities
  zIndex: (level: keyof typeof zIndex) => zIndex[level],

  // Breakpoint utilities
  breakpoint: (bp: keyof typeof breakpoints) => breakpoints[bp],
};

// Common component styles
export const componentStyles = {
  // Button styles
  button: {
    base: 'inline-flex items-center justify-center rounded-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black',
    variants: {
      primary: 'bg-white text-black hover:bg-gray-200 focus:ring-white',
      secondary: 'bg-white/10 border-2 border-white/20 text-white hover:bg-white/20 focus:ring-white',
      danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
      success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500',
    },
    sizes: {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
      xl: 'px-10 py-5 text-xl',
    },
  },

  // Input styles
  input: {
    base: 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all',
    variants: {
      default: '',
      error: 'border-red-500 focus:ring-red-500',
      success: 'border-green-500 focus:ring-green-500',
    },
  },

  // Card styles
  card: {
    base: 'bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm',
    variants: {
      default: 'hover:border-white/30 transition-all',
      interactive: 'hover:border-white/30 hover:scale-105 transition-all cursor-pointer',
      elevated: 'shadow-xl',
    },
  },

  // Modal styles
  modal: {
    overlay: 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50',
    content: 'fixed inset-0 flex items-center justify-center z-50 p-4',
    panel: 'bg-black border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden',
  },

  // Badge styles
  badge: {
    base: 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
    variants: {
      default: 'bg-white/10 text-white',
      primary: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      success: 'bg-green-500/20 text-green-400 border border-green-500/30',
      error: 'bg-red-500/20 text-red-400 border border-red-500/30',
      warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    },
  },

  // Avatar styles
  avatar: {
    base: 'rounded-full flex items-center justify-center font-bold',
    sizes: {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base',
      xl: 'w-16 h-16 text-lg',
    },
  },

  // Tooltip styles
  tooltip: {
    base: 'absolute z-50 px-3 py-2 text-xs font-medium text-white bg-black/90 backdrop-blur-sm rounded-lg border border-white/10 shadow-lg',
    arrow: 'absolute w-2 h-2 bg-black/90 border border-white/10 rotate-45',
  },
};

// Theme configuration
export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  animation: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
};

export default theme;
