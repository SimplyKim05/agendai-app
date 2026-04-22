import React, { useState } from 'react';
import { Download, FileText, File, FileType, Presentation } from 'lucide-react';
import { Agenda } from '../types';
import { exportText, exportDocx, exportPdf, exportPptx } from '../lib/exportUtils';

export default function ExportMenu({ agenda, selectedActionItems }: { agenda: Agenda, selectedActionItems: string[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    { name: 'Text (.txt)', icon: FileText, action: () => exportText(agenda, selectedActionItems) },
    { name: 'Word (.docx)', icon: File, action: () => exportDocx(agenda, selectedActionItems) },
    { name: 'PDF (.pdf)', icon: FileType, action: () => exportPdf(agenda, selectedActionItems) },
    { name: 'PowerPoint (.pptx)', icon: Presentation, action: () => exportPptx(agenda, selectedActionItems) },
    { name: 'Google Slides', icon: Presentation, action: () => alert('Google Slides integration requires OAuth account linking. Please contact support.') },
  ];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
      >
        <Download size={16} />
        Export
      </button>
      {isOpen && (
        <div className="absolute right-0 top-12 bg-white rounded-lg shadow-xl border border-slate-200 py-2 w-48 z-50">
          {options.map((opt) => (
            <button
              key={opt.name}
              onClick={() => { opt.action(); setIsOpen(false); }}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-medium text-slate-700 flex items-center gap-2"
            >
              <opt.icon size={16} />
              {opt.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
