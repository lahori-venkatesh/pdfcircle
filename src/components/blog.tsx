import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image, FileText, FilePlus, Split, Images, Stamp, Zap, ShieldCheck, Clock, Smartphone, Sparkles, Upload, Download, Wand2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Blog = () => {
  const { t } = useTranslation();

  // Tools array aligned with JSON features, with Edit PDFs removed
  const tools = [
    {
      category: t('common.imageTools', 'Image Tools'),
      icon: Image,
      items: [
        {
          title: t('features.imageReduction.title', 'Image Size Reduce & Conversion'),
          description: t('features.imageReduction.description', 'Easily reduce image file sizes for faster loading and sharing while maintaining crystal-clear quality with our free online tools.'),
          enhancedDescription: 'Picture this: you’re launching a blog, but your gorgeous photos are slowing everything down. Our image size reducer trims JPGs, PNGs, and WebPs to load lightning-fast, keeping your visuals stunning. Bloggers, shop owners, and social media mavens—this one’s for you.',
          features: [
            'Shrink multiple images at once—perfect for portfolios.',
            'Keep every detail sharp, even at smaller sizes.',
            'Preview changes instantly to get it just right.',
            'Make your website zippy for better SEO.'
          ]
        },
        {
          title: t('features.imageToPdf.title', 'Create PDFs from Images'),
          description: t('features.imageToPdf.description', 'Turn your photos and graphics into professional PDF documents quickly and securely using pdfCircle’s free converter.'),
          enhancedDescription: 'Got a stack of photos from a project? Turn them into a sleek PDF portfolio in minutes. Whether you’re a student compiling notes or a designer sharing mockups, our free tool makes your images shine in a professional format.',
          features: [
            'Combine multiple images into one PDF.',
            'Choose layouts that fit your style.',
            'Secure processing keeps your files private.',
            'Download ready-to-share PDFs instantly.'
          ]
        },
        {
          title: t('features.pdfToImages.title', 'PDF to Images'),
          description: t('features.pdfToImages.description', 'Pull high-quality images out of any PDF file effortlessly with our reliable and free online extraction tools.'),
          enhancedDescription: 'Need a PDF slide for Instagram or a chart for a presentation? Our tool pulls images from PDFs in crisp JPG, PNG, or WebP formats. It’s a game-changer for teachers, marketers, and anyone sharing visuals online.',
          features: [
            'Extract specific pages or entire PDFs.',
            'Get high-res images for any purpose.',
            'Choose your favorite format with ease.',
            'Fast results, no software needed.'
          ]
        }
      ]
    },
    {
      category: t('common.pdfTools', 'PDF Tools'),
      icon: FileText,
      items: [
        {
          title: t('features.compressPdf.title', 'Compress PDFs'),
          description: t('features.compressPdf.description', 'Reduce PDF file sizes without sacrificing quality, making them ideal for email and online storage with our free tools.'),
          enhancedDescription: 'Ever hit “send” only to get a “file too large” error? Our PDF compressor shrinks files so you can email proposals or store reports without a hitch. Students, freelancers, and small biz owners—say goodbye to file-size stress.',
          features: [
            'Smart compression keeps text and images clear.',
            'No downloads—just use your browser.',
            'Lightning-fast processing saves time.',
            'Your files stay secure, always.'
          ]
        },
        {
          title: t('features.mergePdfs.title', 'Merge PDFs'),
          description: t('features.mergePdfs.description', 'Combine several PDF documents into one with our secure and free online merging tool, saving you time and effort.'),
          enhancedDescription: 'Juggling invoices, contracts, or lesson plans? Merge them into one tidy PDF with a quick drag-and-drop. Entrepreneurs and educators love how it streamlines their day, keeping everything in one place.',
          features: [
            'Rearrange pages however you like.',
            'No limit on files you can merge.',
            'Layouts stay perfect, no glitches.',
            'Access your PDF anywhere, anytime.'
          ]
        },
        {
          title: t('features.splitPdf.title', 'Split PDFs'),
          description: t('features.splitPdf.description', 'Divide oversized PDF documents into manageable parts using our fast and free splitting tool, perfect for organization.'),
          enhancedDescription: 'Need one chapter from a textbook or a single form from a packet? Split PDFs into exactly what you need, no fluff. Researchers, admins, and legal pros—this tool’s your new best friend.',
          features: [
            'Pinpoint the pages you want.',
            'Create multiple PDFs in one go.',
            'Super HStackTrace: simple, even for beginners.',
            'Download your splits in seconds.'
          ]
        },
        {
          title: t('features.addWatermark.title', 'PDFs with Watermarks'),
          description: t('features.addWatermark.description', 'Safeguard your documents by adding custom watermarks using our secure and free PDF protection tools.'),
          enhancedDescription: 'Protect your work with a watermark that screams “yours.” Add your logo, name, or a “Confidential” stamp to PDFs—perfect for photographers, authors, or anyone sharing sensitive files. It’s security with style.',
          features: [
            'Customize text, logos, or opacity.',
            'Apply to one page or all.',
            'Looks professional, not distracting.',
            'Safe processing, no leaks.'
          ]
        }
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('hero.title', 'Transform Your PDFs and Images with Free Online Tools')}
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          {t('hero.subtitle', 'Convert and compress PDFs and images instantly with pdfCircle – your all-in-one online tool for secure, fast, and free.')}
        </p>
        <Link
          to="/pdf-tools"
          className="inline-block mt-6 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          aria-label={t('hero.getStarted', 'Start Converting Now')}
        >
          {t('hero.getStarted', 'Start Converting Now')}
        </Link>
      </div>

      {/* Features Section */}
      <section className="mb-20">
        <div className="flex items-center mb-8">
          <Wand2 className="w-8 h-8 text-indigo-600 mr-3" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('features.title', 'Powerful PDF and Image Tools in One Place')}
          </h2>
        </div>
        {tools.map((section) => (
          <div key={section.category} className="mb-12">
            <div className="flex items-center mb-6">
              <section.icon className="w-7 h-7 text-indigo-600 mr-2" />
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {section.category}
              </h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {section.items.map((tool) => (
                <div
                  key={tool.title}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center mb-4">
                    {tool.title.includes('Watermark') ? (
                      <Sparkles className="w-6 h-6 text-indigo-600 mr-2" />
                    ) : (
                      <Zap className="w-6 h-6 text-indigo-600 mr-2" />
                    )}
                    <h4 className="text-xl font-semibold text-gray-800 dark:text-white">
                      {tool.title}
                    </h4>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {tool.enhancedDescription}
                  </p>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h5 className="text-sm font-semibold text-indigo-600 mb-2">
                      {t('blog.keyFeatures', 'Why It’s Awesome')}:
                    </h5>
                    <ul className="list-disc list-inside space-y-1">
                      {tool.features.map((feature, index) => (
                        <li key={index} className="text-gray-600 dark:text-gray-300 text-sm">
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* How It Works Section */}
      <section className="mb-20 bg-gray-50 dark:bg-gray-900 rounded-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('howItWorks.title', 'How pdfCircle Makes Document Processing Simple')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-2xl mx-auto">
            {t('howItWorks.subtitle', 'Three easy steps to transform your files—no hassle, no cost.')}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="text-center">
            <Upload className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('howItWorks.step1.title', 'Upload Your File in Seconds')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('howItWorks.step1.description', 'Drag and drop or select your PDF or image file to start transforming it with our free online tools.')}
            </p>
          </div>
          <div className="text-center">
            <Wand2 className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('howItWorks.step2.title', 'Choose Your Perfect Tool')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('howItWorks.step2.description', 'Pick from a wide range of options like PDF conversion, image enhancement, and compression—all free and secure.')}
            </p>
          </div>
          <div className="text-center">
            <Download className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('howItWorks.step3.title', 'Download Your Improved File')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('howItWorks.step3.description', 'Get your processed document or image instantly, ready to use with our fast and reliable service.')}
            </p>
          </div>
        </div>
        <div className="text-center mt-8">
          <Link
            to="/pdf-tools"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            aria-label={t('howItWorks.seeAllTools', 'Explore All Our Tools')}
          >
            {t('howItWorks.seeAllTools', 'Explore All Our Tools')}
          </Link>
        </div>
      </section>

      {/* Security Section */}
      <section className="mb-20 text-center">
        <ShieldCheck className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('security.title', 'Trust pdfCircle for Secure Document and Image Processing')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          We’ve got your back with top-notch security, so you can focus on creating, not worrying. Your files are safe with us—always.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <Clock className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('security.localProcessing.title', 'Local Processing for Privacy')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('security.localProcessing.description', 'Process your files directly on your device for maximum security, perfect for sensitive PDFs and images.')}
            </p>
          </div>
          <div>
            <ShieldCheck className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('security.endToEnd.title', 'End-to-End Encryption for Safety')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('security.endToEnd.description', 'Protect your data during transfers with advanced encryption, ensuring secure PDF and image handling.')}
            </p>
          </div>
          <div>
            <Smartphone className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('security.noStorage.title', 'No File Storage, Ever')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('security.noStorage.description', 'We delete your files immediately after processing, keeping your documents and images safe.')}
            </p>
          </div>
        </div>
        <Link
          to="/security"
          className="inline-block mt-6 text-indigo-600 font-semibold hover:text-indigo-700"
          aria-label={t('security.learnMore', 'Learn More About Our Security')}
        >
          {t('security.learnMore', 'Learn More About Our Security')}
        </Link>
      </section>

      {/* User Success Section */}
      <section className="mb-20 bg-indigo-50 dark:bg-indigo-900 rounded-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('blog.userSuccessTitle', 'Real People, Real Results')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-2xl mx-auto">
            {t('blog.userSuccessSubtitle', 'See how pdfCircle helps folks like you tackle their file challenges every day.')}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <p className="text-gray-600 dark:text-gray-300 italic mb-2">
              “ I converted my assignments images to pdf and it was so easy!”
            </p>
            <p className="text-sm font-semibold text-indigo-600">— Nagaraju, Student of NIT Jaipur</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <p className="text-gray-600 dark:text-gray-300 italic mb-2">
              “ I have Digital marketing agency, i provide digital marketing services like poster making, several time i used the image conversion tool in pdfcircle fast and securely.”
            </p>
            <p className="text-sm font-semibold text-indigo-600">—Rishab, the social artist founder</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {t('blog.ctaTitle', 'Ready to Make Your Files Work Smarter?')}
        </h2>
        <Link
          to="/pdf-tools"
          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          aria-label={t('hero.getStarted', 'Start Converting Now')}
        >
          {t('hero.getStarted', 'Start Converting Now')}
        </Link>
      </div>
    </div>
  );
};