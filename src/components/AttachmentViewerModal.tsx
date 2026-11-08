import React from 'react';
import { X, Download, FileText } from 'lucide-react';
import { BillAttachment } from '../types';

interface Props {
  attachment: BillAttachment | null;
  onClose: () => void;
}

export const AttachmentViewerModal: React.FC<Props> = ({ attachment, onClose }) => {
  if (!attachment) return null;

  const isImage = attachment.type.startsWith('image/');
  const isPdf = attachment.type === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 text-white">
          <div className="flex items-center space-x-2 truncate">
            <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium text-sm truncate">{attachment.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={attachment.dataUrl}
              download={attachment.name}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950">
          {isImage ? (
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg border border-slate-800"
            />
          ) : isPdf ? (
            <iframe
              src={attachment.dataUrl}
              title={attachment.name}
              className="w-full h-[70vh] rounded-lg border border-slate-800 bg-white"
            />
          ) : (
            <div className="text-center p-8 text-slate-400">
              <FileText className="w-16 h-16 mx-auto mb-3 text-slate-600" />
              <p className="text-base font-medium text-slate-300">{attachment.name}</p>
              <p className="text-xs text-slate-500 mt-1">Binary document stored</p>
              <a
                href={attachment.dataUrl}
                download={attachment.name}
                className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                <span>Download Document</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
