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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
            <h3 className="font-semibold text-slate-100 truncate text-sm sm:text-base">{title}</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/40 min-h-[300px]">
          {isPdf ? (
            <div className="w-full h-[65vh] flex flex-col items-center justify-center text-center p-6">
              <iframe
                src={fileData}
                title="PDF Preview"
                className="w-full h-full rounded-xl border border-slate-800 hidden md:block"
              />
              <div className="md:hidden flex flex-col items-center">
                <FileText className="w-16 h-16 text-indigo-400 mb-3" />
                <p className="text-sm font-medium text-slate-300 mb-3">PDF Document Attached</p>
                <a
                  href={fileData}
                  download={fileName || 'document.pdf'}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-2"
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
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-800"
              />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="truncate">{fileName || 'Attached Bill Document'}</span>
          <span className="text-slate-500 shrink-0">Stored locally in app storage</span>
        </div>
      </div>
    </div>
  );
};
