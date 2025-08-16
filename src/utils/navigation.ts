// Navigation utility to prevent DOM manipulation conflicts

interface NavigationState {
  isNavigating: boolean;
  lastNavigation: number;
  navigationCount: number;
}

class NavigationManager {
  private state: NavigationState = {
    isNavigating: false,
    lastNavigation: 0,
    navigationCount: 0
  };

  private readonly MIN_NAVIGATION_INTERVAL = 300; // ms
  private readonly MAX_NAVIGATIONS_PER_MINUTE = 20;

  canNavigate(): boolean {
    const now = Date.now();
    
    // Check if we're already navigating
    if (this.state.isNavigating) {
      console.warn('Navigation blocked: Already navigating');
      return false;
    }

    // Check minimum interval between navigations
    if (now - this.state.lastNavigation < this.MIN_NAVIGATION_INTERVAL) {
      console.warn('Navigation blocked: Too fast');
      return false;
    }

    // Check rate limiting
    if (this.state.navigationCount > this.MAX_NAVIGATIONS_PER_MINUTE) {
      console.warn('Navigation blocked: Rate limit exceeded');
      return false;
    }

    return true;
  }

  startNavigation(): boolean {
    if (!this.canNavigate()) {
      return false;
    }

    this.state.isNavigating = true;
    this.state.lastNavigation = Date.now();
    this.state.navigationCount++;

    // Reset counter after a minute
    setTimeout(() => {
      this.state.navigationCount = Math.max(0, this.state.navigationCount - 1);
    }, 60000);

    return true;
  }

  completeNavigation(): void {
    this.state.isNavigating = false;
  }

  // Safe navigation with cleanup
  async safeNavigate(to: string, cleanupFn?: () => void): Promise<boolean> {
    if (!this.startNavigation()) {
      return false;
    }

    try {
      // Perform cleanup if provided
      if (cleanupFn) {
        try {
          cleanupFn();
        } catch (error) {
          console.warn('Cleanup error during navigation:', error);
        }
      }

      // Wait a bit to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Perform navigation
      window.location.href = to;
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      this.completeNavigation();
      return false;
    }
  }

  // Get current navigation state
  getState(): NavigationState {
    return { ...this.state };
  }

  // Reset navigation state (useful for testing or error recovery)
  reset(): void {
    this.state = {
      isNavigating: false,
      lastNavigation: 0,
      navigationCount: 0
    };
  }
}

// Global navigation manager instance
export const navigationManager = new NavigationManager();

// React hook for navigation management
export const useNavigationGuard = () => {
  const canNavigate = () => navigationManager.canNavigate();
  const startNavigation = () => navigationManager.startNavigation();
  const completeNavigation = () => navigationManager.completeNavigation();
  const safeNavigate = (to: string, cleanupFn?: () => void) => 
    navigationManager.safeNavigate(to, cleanupFn);

  return {
    canNavigate,
    startNavigation,
    completeNavigation,
    safeNavigate
  };
};

// Utility to safely switch between tools
export const safeToolSwitch = async (from: string, to: string): Promise<boolean> => {
  const cleanup = () => {
    // Clean up any global event listeners
    try {
      document.removeEventListener('mousemove', () => {});
      document.removeEventListener('mouseup', () => {});
      document.removeEventListener('touchmove', () => {});
      document.removeEventListener('touchend', () => {});
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  return navigationManager.safeNavigate(to, cleanup);
};
