import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Initialize PDF.js worker from node_modules using Vite's URL import
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure PDF.js worker
GlobalWorkerOptions.workerSrc = workerUrl;

export const pdfjsLib = { getDocument };