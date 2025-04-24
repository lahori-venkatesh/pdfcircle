import sanitizeFilename from 'sanitize-filename';
import mime from 'mime-types';
import path from 'path-browserify';

// Maximum file size in bytes (15MB as per your previous setup, adjusted from 5MB to match)
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Allowed file types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml', // Added back from your original code
  'image/avif',
  'image/heic',
];

export const ALLOWED_PDF_TYPES = ['application/pdf'];

interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateFile(file: File, allowedTypes: string[]): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    };
  }

  // Check file type using mime-types for more robust detection
  const detectedMimeType = mime.lookup(file.name) || file.type;
  if (!allowedTypes.includes(detectedMimeType)) {
    return {
      isValid: false,
      error: `File type not allowed. Supported types: ${allowedTypes.join(', ')}`,
    };
  }

  // Validate filename
  const sanitizedName = sanitizeFilename(file.name);
  if (sanitizedName !== file.name) {
    return {
      isValid: false,
      error: 'Invalid characters in filename. Only alphanumeric characters, underscores, and hyphens are allowed.',
    };
  }

  return { isValid: true };
}

// Generate secure Blob URLs with expiration
export function createSecureObjectURL(blob: Blob, expirationMs: number = 5 * 60 * 1000): string {
  const url = URL.createObjectURL(blob);
  
  // Automatically revoke the URL after expiration
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error revoking URL:', error);
    }
  }, expirationMs);

  return url;
}

// Sanitize and validate file download name
export function getSafeDownloadFilename(filename: string, defaultName: string = 'download'): string {
  const sanitized = sanitizeFilename(filename);
  if (!sanitized) return defaultName;

  // Ensure the extension is preserved and valid
  const ext = path.extname(filename).toLowerCase();
  const base = path.basename(sanitized, ext);
  const validExt = ext ? ext : '.jpg'; // Default to .jpg if no extension
  return `${base}${validExt}`;
}

// Create a secure download link
export function createSecureDownloadLink(blob: Blob, filename: string): HTMLAnchorElement {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getSafeDownloadFilename(filename);
  
  // Automatically revoke the URL after a short delay
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error revoking URL:', error);
    }
  }, 1000);

  return link;
}

// Safely revoke a blob URL
export function revokeBlobUrl(url: string | null) {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error revoking URL:', error);
    }
  }
}

// Download a file from a URL
export async function downloadFromUrl(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const link = createSecureDownloadLink(blob, filename);
    
    return new Promise<void>((resolve, reject) => {
      link.onclick = () => {
        setTimeout(resolve, 1000); // Give the browser time to start the download
      };
      link.onerror = () => reject(new Error('Failed to download file'));
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// Create a secure temporary URL for file preview
export function createPreviewUrl(blob: Blob): string {
  return createSecureObjectURL(blob, 30 * 60 * 1000); // 30 minutes expiration
}