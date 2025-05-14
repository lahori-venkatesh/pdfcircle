
export interface CachedOperation {
  id: string;
  type: string;
  timestamp: number;
  metadata: {
    filename?: string;
    fileSize?: number;
    format?: string;
    settings?: Record<string, any>;
  };
  preview?: string;
}

export interface CachedSettings {
  compression: {
    level: number;
    targetSize?: number;
  };
  format: string;
  enhancement?: string;
  camera?: {
    facingMode: 'user' | 'environment';
    resolution: {
      width: number;
      height: number;
    };
  };
  pageRanges?: string;
}
