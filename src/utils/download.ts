import { getSafeDownloadFilename } from './security';

/**
 * Safely download a blob as a file
 * @param blob - The blob to download
 * @param filename - The filename for the download
 */
export function safeDownloadBlob(blob: Blob, filename: string): void {
  try {
    // Create a secure download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getSafeDownloadFilename(filename);
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL after a short delay
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error revoking URL:', error);
      }
    }, 1000);
  } catch (error) {
    console.error('Error downloading blob:', error);
    throw new Error('Failed to download file: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Download a blob with a specific MIME type
 * @param blob - The blob to download
 * @param filename - The filename for the download
 * @param mimeType - The MIME type for the blob
 */
export function safeDownloadBlobWithMime(blob: Blob, filename: string, mimeType: string): void {
  try {
    // Create a new blob with the specified MIME type
    const typedBlob = new Blob([blob], { type: mimeType });
    safeDownloadBlob(typedBlob, filename);
  } catch (error) {
    console.error('Error downloading blob with MIME type:', error);
    throw new Error('Failed to download file with MIME type: ' + (error instanceof Error ? error.message : String(error)));
  }
}
