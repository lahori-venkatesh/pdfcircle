// DOM Safety utilities to prevent manipulation errors

interface DOMSafetyOptions {
  enableLogging?: boolean;
  enableRecovery?: boolean;
}

class DOMSafetyManager {
  private options: DOMSafetyOptions;
  private removedNodes: WeakSet<Node> = new WeakSet();
  private activeElements: Map<string, Element> = new Map();

  constructor(options: DOMSafetyOptions = {}) {
    this.options = {
      enableLogging: true,
      enableRecovery: true,
      ...options
    };
  }

  // Safe element removal with validation
  safeRemoveChild(parent: Node, child: Node): boolean {
    try {
      // Check if parent and child are valid
      if (!parent || !child) {
        this.log('Invalid parent or child node');
        return false;
      }

      // Check if child is actually a child of parent
      if (!parent.contains(child)) {
        this.log('Child is not a descendant of parent');
        return false;
      }

      // Check if child has already been removed
      if (this.removedNodes.has(child)) {
        this.log('Child has already been removed');
        return false;
      }

      // Perform removal
      parent.removeChild(child);
      
      // Mark as removed
      this.removedNodes.add(child);
      
      this.log('Successfully removed child node');
      return true;
    } catch (error) {
      this.log('Error removing child node:', error);
      
      if (this.options.enableRecovery) {
        return this.recoverFromRemovalError(parent, child, error);
      }
      
      return false;
    }
  }

  // Safe element addition
  safeAppendChild(parent: Node, child: Node): boolean {
    try {
      if (!parent || !child) {
        this.log('Invalid parent or child node');
        return false;
      }

      // Check if child is already in the DOM
      if (child.parentNode) {
        this.log('Child already has a parent, removing first');
        this.safeRemoveChild(child.parentNode, child);
      }

      parent.appendChild(child);
      this.log('Successfully appended child node');
      return true;
    } catch (error) {
      this.log('Error appending child node:', error);
      return false;
    }
  }

  // Safe element insertion
  safeInsertBefore(parent: Node, child: Node, reference: Node | null): boolean {
    try {
      if (!parent || !child) {
        this.log('Invalid parent or child node');
        return false;
      }

      // Check if child is already in the DOM
      if (child.parentNode) {
        this.log('Child already has a parent, removing first');
        this.safeRemoveChild(child.parentNode, child);
      }

      parent.insertBefore(child, reference);
      this.log('Successfully inserted child node');
      return true;
    } catch (error) {
      this.log('Error inserting child node:', error);
      return false;
    }
  }

  // Track active elements
  trackElement(id: string, element: Element): void {
    this.activeElements.set(id, element);
  }

  // Untrack element
  untrackElement(id: string): void {
    this.activeElements.delete(id);
  }

  // Check if element is still valid
  isElementValid(element: Element): boolean {
    try {
      return element && 
             element.parentNode && 
             document.contains(element) && 
             !this.removedNodes.has(element);
    } catch {
      return false;
    }
  }

  // Clean up all tracked elements
  cleanup(): void {
    this.activeElements.clear();
    this.log('Cleaned up all tracked elements');
  }

  // Recovery mechanism for removal errors
  private recoverFromRemovalError(parent: Node, child: Node, error: any): boolean {
    try {
      this.log('Attempting recovery from removal error');
      
      // Try using modern remove() method if available
      if ('remove' in child && typeof (child as any).remove === 'function') {
        (child as any).remove();
        this.removedNodes.add(child);
        this.log('Recovery successful using remove() method');
        return true;
      }

      // Try to force removal by setting parentNode to null
      if ('parentNode' in child) {
        (child as any).parentNode = null;
        this.removedNodes.add(child);
        this.log('Recovery successful by nullifying parentNode');
        return true;
      }

      this.log('Recovery failed');
      return false;
    } catch (recoveryError) {
      this.log('Recovery attempt failed:', recoveryError);
      return false;
    }
  }

  private log(...args: any[]): void {
    if (this.options.enableLogging) {
      console.log('[DOMSafety]', ...args);
    }
  }
}

// Global DOM safety manager
export const domSafety = new DOMSafetyManager({
  enableLogging: true,
  enableRecovery: true
});

// Utility functions
export const safeRemoveChild = (parent: Node, child: Node): boolean => {
  return domSafety.safeRemoveChild(parent, child);
};

export const safeAppendChild = (parent: Node, child: Node): boolean => {
  return domSafety.safeAppendChild(parent, child);
};

export const safeInsertBefore = (parent: Node, child: Node, reference: Node | null): boolean => {
  return domSafety.safeInsertBefore(parent, child, reference);
};

export const isElementValid = (element: Element): boolean => {
  return domSafety.isElementValid(element);
};

// React hook for DOM safety
export const useDOMSafety = () => {
  const trackElement = (id: string, element: Element) => {
    domSafety.trackElement(id, element);
  };

  const untrackElement = (id: string) => {
    domSafety.untrackElement(id);
  };

  const cleanup = () => {
    domSafety.cleanup();
  };

  return {
    trackElement,
    untrackElement,
    cleanup,
    safeRemoveChild,
    safeAppendChild,
    safeInsertBefore,
    isElementValid
  };
};

// Override native DOM methods for safety
export const enableDOMSafetyOverrides = () => {
  if (typeof window === 'undefined') return;

  const originalRemoveChild = Node.prototype.removeChild;
  const originalAppendChild = Node.prototype.appendChild;
  const originalInsertBefore = Node.prototype.insertBefore;

  Node.prototype.removeChild = function(child: Node): Node {
    if (domSafety.safeRemoveChild(this, child)) {
      return child;
    }
    // Fall back to original method
    return originalRemoveChild.call(this, child);
  };

  Node.prototype.appendChild = function(child: Node): Node {
    if (domSafety.safeAppendChild(this, child)) {
      return child;
    }
    // Fall back to original method
    return originalAppendChild.call(this, child);
  };

  Node.prototype.insertBefore = function(child: Node, reference: Node | null): Node {
    if (domSafety.safeInsertBefore(this, child, reference)) {
      return child;
    }
    // Fall back to original method
    return originalInsertBefore.call(this, child, reference);
  };

  console.log('[DOMSafety] DOM method overrides enabled');
};
