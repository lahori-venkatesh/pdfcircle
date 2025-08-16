# PDFCircle

A privacy-first, browser-based PDF processing tool that keeps your documents secure by processing everything locally in your browser.

## 🚀 Features

### PDF Operations
- **Merge PDFs** - Combine multiple PDF files into one
- **Split PDF** - Divide a single PDF into multiple files
- **Compress PDF** - Reduce file size while maintaining quality
- **Convert PDF to Word** - Extract text and formatting
- **Convert PDF to Excel** - Extract tabular data
- **Convert PDF to Images** - Extract pages as image files
- **OCR PDF** - Extract text from scanned documents
- **Sign PDF** - Add digital signatures to documents
- **Lock/Unlock PDF** - Password protect or remove protection
- **Watermark PDF** - Add text or image watermarks
- **Edit PDF** - Modify text and images
- **Create PDF from HTML** - Convert web pages to PDF
- **Bank Statement Processing** - Specialized tools for financial documents

### Security & Privacy
- 🔒 **100% Local Processing** - All files stay in your browser
- 🛡️ **No Server Storage** - Your documents never leave your device
- 🔐 **Privacy-First Design** - Complete control over your data
- 🌐 **Browser-Based** - No software installation required

### User Experience
- 🌍 **Multi-Language Support** - English, Hindi, Kannada, Tamil, Telugu
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- ⚡ **Fast Processing** - Optimized for quick operations
- 🎨 **Modern UI** - Clean, intuitive interface

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **PDF Processing**: PDF.js, Tesseract.js (OCR)
- **Backend**: Supabase (authentication and minimal data)
- **Deployment**: Netlify

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pdfcircle.git
   cd pdfcircle
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🚀 Deployment

### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

### Manual Deployment
```bash
npm run build
# Upload the 'dist' folder to your hosting provider
```

## 📖 Usage

### Getting Started
1. Open PDFCircle in your browser
2. Choose the PDF operation you need
3. Upload your file(s)
4. Configure settings as needed
5. Process and download your result

### Supported File Formats
- **Input**: PDF, Images (PNG, JPG, JPEG)
- **Output**: PDF, Word (.docx), Excel (.xlsx), Images (PNG, JPG)

### File Size Limits
- Maximum file size: 50MB per file
- Recommended: Under 20MB for optimal performance

## 🔧 Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

### Customization
- Modify `tailwind.config.js` for styling changes
- Update `src/locales/` for language translations
- Edit `src/components/` for UI modifications

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Write meaningful commit messages
- Test on multiple browsers
- Ensure responsive design

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Venkatesh** - Lead Developer
- **Prudhvi Verma** - Development Support

## 🆘 Support

### Common Issues
- **Large files slow to process**: Try compressing files first
- **OCR not working**: Ensure images are clear and well-lit
- **Browser compatibility**: Use Chrome, Firefox, or Safari

### Getting Help
- 📧 Email: [your-email@example.com]
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/pdfcircle/issues)
- 📖 Documentation: [Wiki](https://github.com/yourusername/pdfcircle/wiki)

## 🔄 Changelog

### v1.0.0 (Current)
- Initial release with core PDF operations
- Multi-language support
- Responsive design
- Privacy-first architecture

## 🙏 Acknowledgments

- PDF.js team for PDF processing capabilities
- Tesseract.js team for OCR functionality
- Supabase team for backend services
- All contributors and users

---

**Made with ❤️ for secure, private document processing**
