import React, { useRef, useState } from 'react';
import { Upload, X, FileSpreadsheet, Image, File } from 'lucide-react';

const colors = {
  ink: '#1a1a1a',
  muted: '#8a8478',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
};

function getFileIcon(file) {
  if (file.type?.startsWith('image/')) return Image;
  if (file.name?.endsWith('.csv') || file.type?.includes('spreadsheet') || file.type?.includes('csv')) return FileSpreadsheet;
  return File;
}

function getFileThumb(file) {
  if (file.type?.startsWith('image/')) return URL.createObjectURL(file);
  return null;
}

export default function SmartImportDropZone({ files, setFiles, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (newFiles) => {
    const arr = Array.from(newFiles);
    setFiles(prev => [...prev, ...arr]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !disabled && inputRef.current?.click()}
        className="transition-all cursor-pointer"
        style={{
          padding: files.length > 0 ? '24px' : '48px 32px',
          borderRadius: '24px',
          background: isDragging
            ? 'linear-gradient(145deg, rgba(255,255,255,1) 0%, rgba(255,252,250,0.95) 100%)'
            : 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
          border: `2px dashed ${isDragging ? colors.etchDark : 'rgba(200,180,170,0.35)'}`,
          boxShadow: isDragging ? '0 8px 32px rgba(180,120,120,0.12)' : '0 4px 24px rgba(180,120,120,0.06)',
          textAlign: 'center',
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.csv,.xlsx,.xls,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {files.length === 0 ? (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(145deg, #faf4f4 0%, #f5ebeb 100%)',
              boxShadow: '4px 4px 10px rgba(210,190,190,0.2), -4px -4px 10px rgba(255,255,255,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Upload size={28} style={{ color: colors.etchDark }} />
            </div>
            <p style={{
              fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em',
              color: 'transparent',
              backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
              backgroundClip: 'text', WebkitBackgroundClip: 'text',
              textShadow: '0 2px 3px rgba(255,255,255,0.7)',
            }}>
              Drop your documents here
            </p>
            <p style={{ color: colors.muted, marginTop: 8, fontSize: 14 }}>
              Photos, CSVs, schedules — any format
            </p>
          </>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {files.map((file, i) => {
              const Icon = getFileIcon(file);
              const thumb = getFileThumb(file);
              return (
                <div key={i} className="relative group" style={{
                  width: 80, height: 80, borderRadius: 16, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(200,180,170,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Icon size={24} style={{ color: colors.etchDark, margin: '0 auto' }} />
                      <p className="text-[9px] mt-1 px-1 truncate" style={{ color: colors.muted }}>{file.name}</p>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X size={10} style={{ color: colors.ink }} />
                  </button>
                </div>
              );
            })}
            {/* Add more button */}
            <div style={{
              width: 80, height: 80, borderRadius: 16,
              border: '2px dashed rgba(200,180,170,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={20} style={{ color: colors.etchLight }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}