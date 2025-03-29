import React from 'react';
import { Clock } from 'lucide-react';

export function WordToPDF() {
  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-6 rounded-lg text-center">
      <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">Word to PDF Coming Soon!</h3>
      <p>
        We're working on bringing you Word to PDF conversion capabilities. Stay tuned for updates!
      </p>
    </div>
  );
}