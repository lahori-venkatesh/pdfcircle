// Component lifecycle manager to prevent DOM manipulation conflicts

interface ComponentState {
  isMounted: boolean;
  isUnmounting: boolean;
  cleanupTasks: Array<() => void>;
  eventListeners: Array<{ element: EventTarget; type: string; handler: EventListener; options?: AddEventListenerOptions }>;
}

class ComponentLifecycleManager {
  private components: Map<string, ComponentState> = new Map();
  private globalCleanupTasks: Array<() => void> = [];

  // Register a component
  registerComponent(componentId: string): void {
    if (this.components.has(componentId)) {
      console.warn(`Component ${componentId} already registered`);
      return;
    }

    this.components.set(componentId, {
      isMounted: true,
      isUnmounting: false,
      cleanupTasks: [],
      eventListeners: []
    });

    console.log(`Component ${componentId} registered`);
  }

  // Mark component as unmounting
  markUnmounting(componentId: string): void {
    const component = this.components.get(componentId);
    if (component) {
      component.isUnmounting = true;
      console.log(`Component ${componentId} marked as unmounting`);
    }
  }

  // Unregister a component
  unregisterComponent(componentId: string): void {
    const component = this.components.get(componentId);
    if (component) {
      // Execute cleanup tasks
      component.cleanupTasks.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn(`Cleanup error for ${componentId}:`, error);
        }
      });

      // Remove event listeners
      component.eventListeners.forEach(({ element, type, handler, options }) => {
        try {
          element.removeEventListener(type, handler, options);
        } catch (error) {
          console.warn(`Event listener removal error for ${componentId}:`, error);
        }
      });

      this.components.delete(componentId);
      console.log(`Component ${componentId} unregistered`);
    }
  }

  // Add cleanup task for a component
  addCleanupTask(componentId: string, cleanup: () => void): void {
    const component = this.components.get(componentId);
    if (component && !component.isUnmounting) {
      component.cleanupTasks.push(cleanup);
    }
  }

  // Add event listener with automatic cleanup
  addEventListener(
    componentId: string,
    element: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    const component = this.components.get(componentId);
    if (component && !component.isUnmounting) {
      element.addEventListener(type, handler, options);
      component.eventListeners.push({ element, type, handler, options });
    }
  }

  // Remove event listener
  removeEventListener(
    componentId: string,
    element: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    const component = this.components.get(componentId);
    if (component) {
      try {
        element.removeEventListener(type, handler, options);
        
        // Remove from tracking
        const index = component.eventListeners.findIndex(
          listener => listener.element === element && 
                     listener.type === type && 
                     listener.handler === handler
        );
        
        if (index !== -1) {
          component.eventListeners.splice(index, 1);
        }
      } catch (error) {
        console.warn(`Event listener removal error:`, error);
      }
    }
  }

  // Check if component is mounted
  isComponentMounted(componentId: string): boolean {
    const component = this.components.get(componentId);
    return component ? component.isMounted && !component.isUnmounting : false;
  }

  // Check if component is unmounting
  isComponentUnmounting(componentId: string): boolean {
    const component = this.components.get(componentId);
    return component ? component.isUnmounting : false;
  }

  // Add global cleanup task
  addGlobalCleanupTask(cleanup: () => void): void {
    this.globalCleanupTasks.push(cleanup);
  }

  // Execute global cleanup
  executeGlobalCleanup(): void {
    this.globalCleanupTasks.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Global cleanup error:', error);
      }
    });
    this.globalCleanupTasks = [];
  }

  // Get component count
  getComponentCount(): number {
    return this.components.size;
  }

  // Get all component IDs
  getComponentIds(): string[] {
    return Array.from(this.components.keys());
  }

  // Force cleanup all components (emergency use)
  forceCleanupAll(): void {
    const componentIds = this.getComponentIds();
    componentIds.forEach(id => this.unregisterComponent(id));
    this.executeGlobalCleanup();
    console.log('Forced cleanup of all components');
  }
}

// Global lifecycle manager instance
export const lifecycleManager = new ComponentLifecycleManager();

// React hook for component lifecycle management
export const useComponentLifecycle = (componentId: string) => {
  const register = () => lifecycleManager.registerComponent(componentId);
  const unregister = () => lifecycleManager.unregisterComponent(componentId);
  const markUnmounting = () => lifecycleManager.markUnmounting(componentId);
  const addCleanupTask = (cleanup: () => void) => lifecycleManager.addCleanupTask(componentId, cleanup);
  const addEventListener = (
    element: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ) => lifecycleManager.addEventListener(componentId, element, type, handler, options);
  const removeEventListener = (
    element: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ) => lifecycleManager.removeEventListener(componentId, element, type, handler, options);
  const isMounted = () => lifecycleManager.isComponentMounted(componentId);
  const isUnmounting = () => lifecycleManager.isComponentUnmounting(componentId);

  return {
    register,
    unregister,
    markUnmounting,
    addCleanupTask,
    addEventListener,
    removeEventListener,
    isMounted,
    isUnmounting
  };
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    lifecycleManager.forceCleanupAll();
  });
}
