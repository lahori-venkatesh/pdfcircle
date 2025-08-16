// Utility to safely handle component cleanup and prevent DOM manipulation issues

interface CleanupItem {
  id: string;
  cleanup: () => void;
}

class ComponentCleanupManager {
  private cleanupItems: Map<string, CleanupItem[]> = new Map();
  private globalCleanupItems: CleanupItem[] = [];

  // Register cleanup for a specific component
  registerCleanup(componentId: string, cleanup: () => void): string {
    const id = `${componentId}_${Date.now()}_${Math.random()}`;
    const item: CleanupItem = { id, cleanup };
    
    if (!this.cleanupItems.has(componentId)) {
      this.cleanupItems.set(componentId, []);
    }
    
    this.cleanupItems.get(componentId)!.push(item);
    return id;
  }

  // Register global cleanup
  registerGlobalCleanup(cleanup: () => void): string {
    const id = `global_${Date.now()}_${Math.random()}`;
    const item: CleanupItem = { id, cleanup };
    this.globalCleanupItems.push(item);
    return id;
  }

  // Clean up a specific component
  cleanupComponent(componentId: string): void {
    const items = this.cleanupItems.get(componentId);
    if (items) {
      items.forEach(item => {
        try {
          item.cleanup();
        } catch (error) {
          console.warn(`Cleanup error for ${item.id}:`, error);
        }
      });
      this.cleanupItems.delete(componentId);
    }
  }

  // Clean up everything
  cleanupAll(): void {
    // Clean up all components
    this.cleanupItems.forEach((items, componentId) => {
      this.cleanupComponent(componentId);
    });

    // Clean up global items
    this.globalCleanupItems.forEach(item => {
      try {
        item.cleanup();
      } catch (error) {
        console.warn(`Global cleanup error for ${item.id}:`, error);
      }
    });
    this.globalCleanupItems = [];
  }

  // Remove a specific cleanup item
  removeCleanup(componentId: string, cleanupId: string): void {
    const items = this.cleanupItems.get(componentId);
    if (items) {
      const index = items.findIndex(item => item.id === cleanupId);
      if (index !== -1) {
        items.splice(index, 1);
      }
    }
  }
}

// Global instance
export const cleanupManager = new ComponentCleanupManager();

// React hook for component cleanup
export const useComponentCleanup = (componentId: string) => {
  const registerCleanup = (cleanup: () => void) => {
    return cleanupManager.registerCleanup(componentId, cleanup);
  };

  const cleanup = () => {
    cleanupManager.cleanupComponent(componentId);
  };

  return { registerCleanup, cleanup };
};

// Safe DOM manipulation utilities
export const safeDOMOperation = <T>(operation: () => T): T | null => {
  try {
    return operation();
  } catch (error) {
    if (error instanceof Error && 
        (error.message.includes('removeChild') || 
         error.message.includes('appendChild') ||
         error.message.includes('insertBefore'))) {
      console.warn('DOM manipulation error caught and handled:', error.message);
      return null;
    }
    throw error;
  }
};

// Safe element removal
export const safeRemoveElement = (element: Element | null): boolean => {
  if (!element || !element.parentNode) return false;
  
  return safeDOMOperation(() => {
    element.parentNode!.removeChild(element);
    return true;
  }) || false;
};

// Safe element addition
export const safeAddElement = (parent: Element, child: Element): boolean => {
  return safeDOMOperation(() => {
    parent.appendChild(child);
    return true;
  }) || false;
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupManager.cleanupAll();
  });
}
