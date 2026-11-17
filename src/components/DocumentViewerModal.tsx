import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileData?: string;
  fileName?: string;
  fileType?: string;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  fileData,
  fileName,
  fileType
}) => {
  if (!isOpen || !fileData) return null;

  const isPdf = fileType === 'application/pdf' || fileData.startsWith('data:application/pdf');

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = fileData;
    a.download = fileName || 'bill-document';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a]/95 border border-white/10 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white truncate text-sm sm:text-base">{title}</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition active:scale-95 shadow-md shadow-indigo-600/20"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-black/30 min-h-[300px]">
          {isPdf ? (
            <div className="w-full h-[65vh] flex flex-col items-center justify-center text-center p-6">
              <iframe
                src={fileData}
                title="PDF Preview"
                className="w-full h-full rounded-2xl border border-white/10 hidden md:block"
              />
              <div className="md:hidden flex flex-col items-center">
                <FileText className="w-16 h-16 text-indigo-400 mb-3" />
                <p className="text-sm font-bold text-slate-200 mb-3">PDF Document Attached</p>
                <a
                  href={fileData}
                  download={fileName || 'document.pdf'}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open / Download PDF</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center">
              <img
                src={fileData}
                alt={title}
                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-black/40 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <span className="truncate">{fileName || 'Attached Bill Document'}</span>
          <span className="text-slate-500 shrink-0 font-medium">Stored locally in device storage</span>
        </div>
      </div>
    </div>
  );
};
