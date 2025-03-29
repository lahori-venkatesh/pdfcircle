importScripts('/opencv.js');

self.Module = {
  onRuntimeInitialized: () => {
    console.log('Worker: OpenCV.js initialized');
    self.isCvReady = true;
    self.postMessage({ ready: true });
    processPendingMessage();
  },
  onError: (err) => {
    console.error('Worker: OpenCV.js failed to initialize:', err);
    self.postMessage({ error: 'OpenCV.js failed to initialize: ' + err });
  },
};

let pendingMessage = null;
self.isCvReady = false;
let cachedMats = {};

self.onmessage = (e) => {
  console.log('Worker: Message received from main:', e.data);
  if (!self.isCvReady || !self.cv) {
    console.log('Worker: OpenCV not ready, queuing message');
    pendingMessage = e;
    return;
  }
  processMessage(e);
};

function processPendingMessage() {
  if (pendingMessage) {
    console.log('Worker: Processing queued message');
    processMessage(pendingMessage);
    pendingMessage = null;
  }
}

async function processMessage(e) {
  const { previewImageData, fullImageData, enhancements, outputFormat, changedKeys, forceFull } = e.data;
  console.log('Worker: Starting processMessage');

  try {
    const isFull = fullImageData || forceFull;
    const imageData = isFull ? fullImageData : previewImageData;
    console.log('Worker: Processing image, isFull:', isFull);

    let src = cachedMats.src || self.cv.matFromImageData(imageData);
    let dst = new self.cv.Mat();

    if (!cachedMats.src) cachedMats.src = src;

    if (!changedKeys || changedKeys.includes('saturation')) {
      console.log('Worker: Adjusting saturation');
      const hsv = cachedMats.hsv || new self.cv.Mat();
      const channels = cachedMats.channels || new self.cv.MatVector();

      self.cv.cvtColor(src, hsv, self.cv.COLOR_RGBA2RGB);
      self.cv.cvtColor(hsv, hsv, self.cv.COLOR_RGB2HSV);
      self.cv.split(hsv, channels);
      const s = channels.get(1);
      s.convertTo(s, -1, enhancements.saturation / 100);
      self.cv.merge(channels, hsv);
      self.cv.cvtColor(hsv, dst, self.cv.COLOR_HSV2RGB);

      if (!cachedMats.hsv) cachedMats.hsv = hsv;
      if (!cachedMats.channels) cachedMats.channels = channels;
      s.delete();
    } else {
      dst = src.clone();
    }

    if (!changedKeys || changedKeys.includes('brightness') || changedKeys.includes('contrast')) {
      console.log('Worker: Adjusting brightness/contrast');
      const temp = dst;
      dst = new self.cv.Mat();
      temp.convertTo(dst, -1, enhancements.contrast / 100, enhancements.brightness - 100);
      temp.delete();
    }

    if ((!changedKeys || changedKeys.includes('sharpness')) && enhancements.sharpness > 0) {
      console.log('Worker: Applying sharpening');
      const temp = dst;
      dst = new self.cv.Mat();
      const kernel = self.cv.Mat.eye(3, 3, self.cv.CV_32F);
      kernel.data32F.set([-1, -1, -1, -1, 8 + enhancements.sharpness / 10, -1, -1, -1, -1]);
      self.cv.filter2D(temp, dst, -1, kernel);
      kernel.delete();
      temp.delete();
    }

    if ((!changedKeys || changedKeys.includes('denoise')) && enhancements.denoise > 0) {
      console.log('Worker: Applying denoising');
      const temp = dst;
      dst = new self.cv.Mat();
      self.cv.fastNlMeansDenoisingColored(temp, dst, enhancements.denoise / 10);
      temp.delete();
    }

    console.log('Worker: Converting to output format');
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    self.cv.imshow(canvas, dst);
    const blob = await canvas.convertToBlob({ type: `image/${outputFormat}` });

    dst.delete();

    console.log('Worker: Sending result back to main');
    self.postMessage({
      [isFull ? 'full' : 'preview']: URL.createObjectURL(blob),
    });
  } catch (error) {
    console.error('Worker: Processing error:', error);
    self.postMessage({ error: `Processing failed: ${error.message}` });
  }
}

self.addEventListener('message', (e) => {
  if (e.data.fullImageData || e.data.previewImageData) {
    console.log('Worker: New image detected, clearing cache');
    Object.values(cachedMats).forEach((mat) => mat.delete());
    cachedMats = {};
  }
});