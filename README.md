# PDF Circle

A comprehensive, privacy-first, browser-based PDF and image processing tool developed by Venkatesh with support from Prudhvi Verma. PDF Circle ensures complete data privacy by processing all files locally in your browser without storing anything on servers.

## 🌟 Features

### PDF Tools
- **Create PDF** - Convert various formats to PDF
- **Merge PDFs** - Combine multiple PDF files into one
- **Split PDF** - Divide PDFs into separate files
- **Compress PDF** - Reduce file size while maintaining quality
- **Add Watermark** - Add text or image watermarks to PDFs
- **PDF to Images** - Convert PDF pages to image formats
- **E-Sign PDF** - Add digital signatures to documents
- **PDF to Word** - Convert PDFs to editable Word documents
- **PDF to Excel** - Extract tables from PDFs to Excel format
- **HTML to PDF** - Convert web pages to PDF
- **OCR PDF** - Extract text from scanned documents
- **Compare PDFs** - Find differences between PDF files
- **Edit PDF** - Modify text and content in PDFs
- **Lock PDF** - Password protect your documents
- **Unlock PDF** - Remove password protection
- **Bank Statement PDF** - Process financial documents

### Image Tools
- **Image Compression** - Reduce file size with quality control
- **Format Conversion** - Convert between JPEG, PNG, WebP, SVG, PDF, AVIF, HEIC, ICO
- **Image Resizing** - Resize images with aspect ratio control
- **Image Cropping** - Interactive crop tool with preset ratios
- **Watermark Addition** - Add text watermarks to images
- **Batch Processing** - Process multiple images at once
- **ICO Generation** - Create favicon files in multiple sizes

## 🛡️ Privacy & Security

- **100% Client-side Processing** - All files are processed in your browser
- **No Server Storage** - Files are never uploaded to our servers
- **Local Processing** - Your data stays on your device
- **Secure** - No data transmission to external servers

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pdfcircle.git
cd pdfcircle
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## 🛠️ Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **PDF Processing**: pdf-lib, pdfjs-dist, jspdf
- **Image Processing**: Sharp, browser-image-compression
- **OCR**: Tesseract.js
- **Authentication**: Supabase
- **Internationalization**: i18next
- **UI Components**: Lucide React icons

## 📱 Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Multi-language Support** - English, Hindi, Kannada, Tamil, Telugu
- **Dark/Light Theme** - Toggle between themes
- **Progressive Web App** - Install as a native app
- **Offline Capability** - Works without internet connection
- **Drag & Drop** - Easy file upload interface

## 🔧 Development

### Project Structure
```
src/
├── components/          # React components
│   ├── pdf/           # PDF processing tools
│   └── ...
├── contexts/          # React contexts
├── lib/              # External library configurations
├── locales/          # Translation files
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── ...
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Venkatesh** - Lead Developer
- **Prudhvi Verma** - Supporting Developer
- All contributors and users who help improve PDF Circle

## 📞 Support

For support, questions, or feature requests, please open an issue on GitHub or contact us through the application's contact form.

---

**PDF Circle** - Your privacy-first PDF and image processing solution. 
