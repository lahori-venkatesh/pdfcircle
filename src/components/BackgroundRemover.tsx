import React from 'react';
import { Clock } from 'lucide-react';

export function BackgroundRemover() {
  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-6 rounded-lg text-center">
      <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">Background Remover Coming Soon!</h3>
      <p>
        We're working on bringing you background removal capabilities. Stay tuned for updates!
      </p>
    </div>
  );

  // Original functionality commented out below
  /*
  const { saveOperation } = useOperationsCache();
  const [image, setImage] = useState<ImageItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackgroundRemovalReady, setIsBackgroundRemovalReady] = useState(false);
  const [backgroundRemovalFunction, setBackgroundRemovalFunction] = useState<any>(null);

  useEffect(() => {
    const initBackgroundRemoval = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const fn = imglyRemoveBackground.removeBackground || 
                  imglyRemoveBackground.remove || 
                  (typeof imglyRemoveBackground === 'function' ? imglyRemoveBackground : null);

        if (typeof fn !== 'function') {
          throw new Error('Background removal function not found');
        }

        setBackgroundRemovalFunction(() => fn);
        setIsBackgroundRemovalReady(true);
      } catch (err) {
        console.error('Failed to initialize background removal:', err);
        setError('Failed to initialize background removal. Please try again.');
      }
    };

    initBackgroundRemoval();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 1) {
      setError('Please select only one image');
      return;
    }

    const file = acceptedFiles[0];
    const validation = validateFile(file, ALLOWED_IMAGE_TYPES);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file type');
      return;
    }

    if (image?.preview) revokeBlobUrl(image.preview);
    if (image?.removedBackground) revokeBlobUrl(image.removedBackground);

    setImage({
      file,
      preview: createSecureObjectURL(file)
    });
    setError(null);
  }, [image]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleRemoveBackground = async () => {
    if (!image || !isBackgroundRemovalReady || !backgroundRemovalFunction) return;

    setLoading(true);
    setError(null);

    try {
      const blob = await backgroundRemovalFunction(image.file);
      const removedBackgroundUrl = createSecureObjectURL(blob);

      setImage(prev => ({
        ...prev!,
        removedBackground: removedBackgroundUrl
      }));

      saveOperation({
        type: 'background_removal',
        metadata: {
          filename: image.file.name,
          fileSize: blob.size,
          settings: {}
        },
        preview: removedBackgroundUrl
      });
    } catch (err) {
      setError(`Failed to remove background: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!image?.removedBackground) return;

    try {
      const response = await fetch(image.removedBackground);
      const blob = await response.blob();
      const filename = image.file.name.replace(/\.[^/.]+$/, '') + '-no-bg.png';
      const link = createSecureDownloadLink(blob, filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Error downloading image. Please try again.');
    }
  };

  const resetImage = useCallback(() => {
    if (image?.preview) revokeBlobUrl(image.preview);
    if (image?.removedBackground) revokeBlobUrl(image.removedBackground);
    setImage(null);
    setError(null);
  }, [image]);

  return (
    <>
      <SEOHeaders
        title="Free Background Remover - Remove Image Backgrounds Online"
        description="Remove backgrounds from images instantly with our free online background removal tool. No signup required."
        keywords={[
          'background remover',
          'remove image background',
          'transparent background',
          'free background removal',
          'online background eraser',
          'image background remover'
        ]}
      />
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">
          Background Remover
        </h1>

        <AdComponent
          slot="background-remover-top"
          className="mb-6"
          style={{ minHeight: '90px' }}
        />

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          {!image ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {isDragActive ? 'Drop the image here' : 'Drag & drop an image here, or tap to select'}
              </p>
              <p className="text-sm text-gray-500 mt-2">Supports JPEG, PNG, WebP (max 10MB)</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Preview</h2>
                <button
                  onClick={resetImage}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Original Image</h3>
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={image.preview}
                      alt="Original"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    {image.removedBackground ? 'Background Removed' : 'Result Preview'}
                  </h3>
                  <div className="aspect-square bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAOdEVYdFRpdGxlAENoZWNrZXJzKacnrwAAABd0RVh0QXV0aG9yAExhcG8gQ2FsYW1hbmRyZWnfkRoqAAAAKXRFWHREZXNjcmlwdGlvbgBCYXNlZCBvbiBKaWduZXNlIHRlbXBsYXRlIGJ5IFNldmVyaW4=')) rounded-lg overflow-hidden">
                    {image.removedBackground ? (
                      <img
                        src={image.removedBackground}
                        alt="No Background"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        Result will appear here
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleRemoveBackground}
                  disabled={loading || !!image.removedBackground || !isBackgroundRemovalReady}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Removing Background...
                    </>
                  ) : (
                    <>
                      <Eraser className="w-5 h-5 mr-2" />
                      Remove Background
                    </>
                  )}
                </button>

                {image.removedBackground && (
                  <button
                    onClick={handleDownload}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download PNG
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">How to Remove Image Backgrounds</h2>
            <ol className="space-y-4 text-gray-600">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold">1</span>
                <div>
                  <h3 className="font-medium text-gray-800">Upload Your Image</h3>
                  <p>Drag and drop your image or click to browse. Supports JPEG, PNG, and WebP formats.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold">2</span>
                <div>
                  <h3 className="font-medium text-gray-800">Process Image</h3>
                  <p>Click "Remove Background" and wait a few seconds while our AI processes your image.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold">3</span>
                <div>
                  <h3 className="font-medium text-gray-800">Download Result</h3>
                  <p>Download your image with the background removed as a transparent PNG file.</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
  */
}