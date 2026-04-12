// Responsive spatial layout system for WorkScape

export interface ViewportSize {
  width: number;
  height: number;
}

export interface LayoutConfig {
  scale: number;
  offsetX: number;
  offsetY: number;
  showMinimap: boolean;
  showZoomControls: boolean;
  enablePan: boolean;
  enableZoom: boolean;
}

// Breakpoint definitions
export const BREAKPOINTS = {
  xs: 0,      // Mobile portrait
  sm: 640,    // Mobile landscape / Small tablet
  md: 768,    // Tablet
  lg: 1024,   // Desktop
  xl: 1280,   // Large desktop
  '2xl': 1536, // Extra large desktop
} as const;

// Office layout dimensions
export const OFFICE_CONFIG = {
  base: {
    width: 1200,
    height: 800,
  },
  responsive: {
    xs: { width: 600, height: 400 },
    sm: { width: 800, height: 500 },
    md: { width: 1000, height: 600 },
    lg: { width: 1200, height: 800 },
    xl: { width: 1400, height: 900 },
    '2xl': { width: 1600, height: 1000 },
  },
} as const;

// Get layout configuration based on viewport size
export function getLayoutConfig(viewport: ViewportSize): LayoutConfig {
  const { width, height } = viewport;
  
  // Determine breakpoint
  let breakpoint: keyof typeof OFFICE_CONFIG.responsive = 'lg';
  if (width < BREAKPOINTS.sm) breakpoint = 'xs';
  else if (width < BREAKPOINTS.md) breakpoint = 'sm';
  else if (width < BREAKPOINTS.lg) breakpoint = 'md';
  else if (width < BREAKPOINTS.xl) breakpoint = 'lg';
  else if (width < BREAKPOINTS['2xl']) breakpoint = 'xl';
  else breakpoint = '2xl';
  
  const officeSize = OFFICE_CONFIG.responsive[breakpoint];
  
  // Calculate scale to fit office in viewport with padding
  const padding = 40;
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  
  const scaleX = availableWidth / officeSize.width;
  const scaleY = availableHeight / officeSize.height;
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1x
  
  // Center the office
  const offsetX = (width - officeSize.width * scale) / 2;
  const offsetY = (height - officeSize.height * scale) / 2;
  
  // Show minimap on smaller screens
  const showMinimap = width < BREAKPOINTS.md;
  
  // Show zoom controls on all screens
  const showZoomControls = true;
  
  // Enable pan/zoom based on screen size
  const enablePan = width < BREAKPOINTS.lg;
  const enableZoom = width < BREAKPOINTS.lg;
  
  return {
    scale,
    offsetX,
    offsetY,
    showMinimap,
    showZoomControls,
    enablePan,
    enableZoom,
  };
}

// Responsive zone configurations
export const ZONE_CONFIG = {
  // Zone visibility based on screen size
  visibility: {
    xs: ['central-hub', 'reception'] as string[],
    sm: ['central-hub', 'reception', 'conference-a'] as string[],
    md: ['central-hub', 'reception', 'conference-a', 'conference-b'] as string[],
    lg: ['central-hub', 'reception', 'conference-a', 'conference-b', 'executive-suite'] as string[],
    xl: ['central-hub', 'reception', 'conference-a', 'conference-b', 'executive-suite', 'pantry'] as string[],
    '2xl': ['central-hub', 'reception', 'conference-a', 'conference-b', 'executive-suite', 'pantry', 'all-zones'] as string[],
  },
  
  // Zone size adjustments based on screen size
  size: {
    xs: { scale: 0.7 },
    sm: { scale: 0.8 },
    md: { scale: 0.9 },
    lg: { scale: 1.0 },
    xl: { scale: 1.0 },
    '2xl': { scale: 1.0 },
  },
} as const;

// Get visible zones based on viewport size
export function getVisibleZones(viewport: ViewportSize): string[] {
  const { width } = viewport;
  
  if (width < BREAKPOINTS.sm) return ZONE_CONFIG.visibility.xs;
  if (width < BREAKPOINTS.md) return ZONE_CONFIG.visibility.sm;
  if (width < BREAKPOINTS.lg) return ZONE_CONFIG.visibility.md;
  if (width < BREAKPOINTS.xl) return ZONE_CONFIG.visibility.lg;
  if (width < BREAKPOINTS['2xl']) return ZONE_CONFIG.visibility.xl;
  return ZONE_CONFIG.visibility['2xl'];
}

// Responsive UI element visibility
export const UI_VISIBILITY = {
  // Elements to hide on smaller screens
  hideBelow: {
    md: ['avatar-details', 'zone-labels'] as string[],
    lg: ['minimap'] as string[],
    xl: [] as string[],
  },
  
  // Elements to show only on specific screens
  showOnly: {
    xs: ['mobile-nav', 'back-button'] as string[],
    sm: ['mobile-nav'] as string[],
    md: [] as string[],
  },
} as const;

// Get UI element visibility based on viewport
export function getUIVisibility(viewport: ViewportSize, element: string): boolean {
  const { width } = viewport;
  
  // Check if element should be hidden below certain breakpoint
  for (const [breakpoint, elements] of Object.entries(UI_VISIBILITY.hideBelow)) {
    const bpValue = BREAKPOINTS[breakpoint as keyof typeof BREAKPOINTS];
    if (width < bpValue && elements.includes(element)) {
      return false;
    }
  }
  
  // Check if element should only show on certain screens
  for (const [breakpoint, elements] of Object.entries(UI_VISIBILITY.showOnly)) {
    const bpValue = BREAKPOINTS[breakpoint as keyof typeof BREAKPOINTS];
    if (width >= bpValue && elements.includes(element)) {
      return false;
    }
  }
  
  return true;
}

// Responsive avatar size
export function getAvatarSize(viewport: ViewportSize): number {
  const { width } = viewport;
  
  if (width < BREAKPOINTS.sm) return 24;
  if (width < BREAKPOINTS.md) return 32;
  if (width < BREAKPOINTS.lg) return 40;
  return 48;
}

// Responsive font sizes
export function getFontSize(viewport: ViewportSize, baseSize: number): number {
  const { width } = viewport;
  
  if (width < BREAKPOINTS.sm) return baseSize * 0.75;
  if (width < BREAKPOINTS.md) return baseSize * 0.875;
  if (width < BREAKPOINTS.lg) return baseSize * 0.95;
  return baseSize;
}

// Responsive spacing
export function getSpacing(viewport: ViewportSize, baseSpacing: number): number {
  const { width } = viewport;
  
  if (width < BREAKPOINTS.sm) return baseSpacing * 0.5;
  if (width < BREAKPOINTS.md) return baseSpacing * 0.75;
  if (width < BREAKPOINTS.lg) return baseSpacing * 0.9;
  return baseSpacing;
}

// Touch-friendly adjustments
export function getTouchConfig(viewport: ViewportSize) {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const { width } = viewport;
  
  return {
    isTouch,
    largerHitAreas: isTouch && width < BREAKPOINTS.md,
    enableSwipeGestures: isTouch && width < BREAKPOINTS.lg,
    enablePinchZoom: isTouch && width < BREAKPOINTS.lg,
  };
}

// Responsive animation settings
export function getAnimationConfig(viewport: ViewportSize) {
  const { width } = viewport;
  
  return {
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    slowerAnimations: width < BREAKPOINTS.md,
    disableAnimations: width < BREAKPOINTS.sm,
  };
}

// Responsive HUD layout
export function getHUDLayout(viewport: ViewportSize) {
  const { width, height } = viewport;
  
  if (width < BREAKPOINTS.md) {
    // Mobile layout
    return {
      position: 'bottom' as const,
      orientation: 'horizontal' as const,
      collapsed: true,
      collapsible: true,
      showMinimap: false,
    };
  } else if (width < BREAKPOINTS.lg) {
    // Tablet layout
    return {
      position: 'right' as const,
      orientation: 'vertical' as const,
      collapsed: false,
      collapsible: true,
      showMinimap: true,
    };
  } else {
    // Desktop layout
    return {
      position: 'right' as const,
      orientation: 'vertical' as const,
      collapsed: false,
      collapsible: false,
      showMinimap: true,
    };
  }
}

// Export all responsive utilities
export const responsive = {
  getLayoutConfig,
  getVisibleZones,
  getUIVisibility,
  getAvatarSize,
  getFontSize,
  getSpacing,
  getTouchConfig,
  getAnimationConfig,
  getHUDLayout,
  BREAKPOINTS,
  OFFICE_CONFIG,
};
