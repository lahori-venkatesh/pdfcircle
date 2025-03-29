import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import { PDFDocument, PDFImage } from "npm:pdf-lib@1.17.1";
import imageCompression from "npm:browser-image-compression@2.0.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json',
};

const BUCKET_NAME = 'uploads';

// Quality presets for different compression levels
const QUALITY_PRESETS = {
  MAXIMUM: {
    imageQuality: 0.95,
    imageResolution: 300,
    compressPages: false,
    targetReduction: 0.10
  },
  HIGH: {
    imageQuality: 0.85,
    imageResolution: 200,
    compressPages: true,
    targetReduction: 0.25
  },
  MEDIUM: {
    imageQuality: 0.70,
    imageResolution: 150,
    compressPages: true,
    targetReduction: 0.45
  },
  LOW: {
    imageQuality: 0.50,
    imageResolution: 100,
    compressPages: true,
    targetReduction: 0.65
  },
  MINIMUM: {
    imageQuality: 0.30,
    imageResolution: 72,
    compressPages: true,
    targetReduction: 0.75
  }
};

function getQualitySettings(quality: number) {
  if (quality >= 90) return QUALITY_PRESETS.MAXIMUM;
  if (quality >= 80) return QUALITY_PRESETS.HIGH;
  if (quality >= 60) return QUALITY_PRESETS.MEDIUM;
  if (quality >= 40) return QUALITY_PRESETS.LOW;
  return QUALITY_PRESETS.MINIMUM;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      throw new Error('Invalid request body');
    }

    const { pdfPath, quality } = body;
    if (!pdfPath || typeof quality !== 'number') {
      throw new Error('Missing required fields');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(pdfPath);

    if (downloadError || !fileData) {
      throw new Error('Failed to download PDF');
    }

    const pdfBytes = await fileData.arrayBuffer();
    const settings = getQualitySettings(quality);

    // Load and process PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Process each page
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Get all images on the page
      const images = page.node.Resources().get('XObject')?.asDict() || new Map();
      
      // Process each image
      for (const [name, xObject] of images.entries()) {
        if (xObject instanceof PDFImage) {
          const imageData = xObject.decode();
          if (imageData) {
            // Compress image
            const imageBlob = new Blob([imageData]);
            const compressedImage = await imageCompression(imageBlob, {
              maxSizeMB: 1,
              maxWidthOrHeight: settings.imageResolution,
              useWebWorker: true,
              fileType: 'image/jpeg',
              initialQuality: settings.imageQuality
            });

            // Replace image in PDF
            const compressedData = await compressedImage.arrayBuffer();
            const image = await pdfDoc.embedJpg(new Uint8Array(compressedData));
            page.node.setXObject(name, image.ref);
          }
        }
      }
    }

    // Save compressed PDF
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: false,
      addDefaultPage: false,
      updateFieldAppearances: false
    });

    // Upload compressed PDF
    const timestamp = Date.now();
    const compressedPath = `compressed-${timestamp}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(compressedPath, compressedBytes, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });

    if (uploadError) {
      throw new Error('Failed to upload compressed PDF');
    }

    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(compressedPath, 300);

    if (urlError || !urlData?.signedUrl) {
      throw new Error('Failed to generate download URL');
    }

    // Calculate compression stats
    const originalSize = pdfBytes.byteLength;
    const compressedSize = compressedBytes.byteLength;
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

    // Schedule cleanup
    setTimeout(async () => {
      try {
        await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .remove([pdfPath, compressedPath]);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }, 300000); // 5 minutes

    return new Response(
      JSON.stringify({
        url: urlData.signedUrl,
        originalSize,
        compressedSize,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        settings: {
          quality,
          targetReduction: settings.targetReduction * 100,
          actualReduction: Math.round(compressionRatio * 100) / 100
        }
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Compression failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});