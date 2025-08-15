// Safe download utility that avoids direct DOM manipulation
export const safeDownloadBlob = (blob: Blob, filename: string): void => {
  try {
    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // Use a more reliable method to trigger download
    if (document.body) {
      // Temporarily add to body
      document.body.appendChild(link);
      
      // Trigger click
      link.click();
      
      // Clean up - use setTimeout to ensure the download starts
      setTimeout(() => {
        try {
          if (document.body && document.body.contains(link)) {
            document.body.removeChild(link);
          }
        } catch (error) {
          console.warn('Error removing download link:', error);
        }
        
        // Revoke the blob URL
        URL.revokeObjectURL(url);
      }, 100);
    } else {
      // Fallback if document.body is not available
      link.click();
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file');
  }
};

// Alternative download method using window.open
export const downloadViaWindow = (blob: Blob, filename: string): void => {
  try {
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    
    if (newWindow) {
      // Clean up the URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } else {
      // Fallback to safe download if window.open fails
      safeDownloadBlob(blob, filename);
    }
  } catch (error) {
    console.error('Error downloading via window:', error);
    // Fallback to safe download
    safeDownloadBlob(blob, filename);
  }
};

// Download multiple files as zip
export const downloadMultipleFiles = async (files: Array<{ blob: Blob; filename: string }>): Promise<void> => {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    files.forEach(({ blob, filename }) => {
      zip.file(filename, blob);
    });
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    safeDownloadBlob(zipBlob, 'downloads.zip');
  } catch (error) {
    console.error('Error creating zip download:', error);
    throw new Error('Failed to create zip download');
  }
};
