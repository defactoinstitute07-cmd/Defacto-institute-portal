import React, { useRef, useState } from "react";
import {
  X,
  Loader2,
  UploadCloud,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";

const BulkImportModal = ({
  isOpen,
  onClose,
  bulkFile,
  setBulkFile,
  bulkResults,
  setBulkResults,
  saving,
  onConfirm,
  err,
  setErr,
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  const processFile = (file) => {
    if (!file) return;

    setFileName(file.name);
    setErr("");
    setBulkFile(null);
    setBulkResults(null);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          setErr("File is empty or structured incorrectly.");
          return;
        }

        setBulkFile(data);
      } catch {
        setErr("Failed to parse file. Upload valid Excel or CSV.");
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e) => processFile(e.target.files?.[0]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };



  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680, width: '95vw' }}>

        {/* HEADER */}
        <div style={{
          padding: '24px 32px',
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
          position: 'relative',
          color: '#fff',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <UploadCloud size={100} style={{ position: 'absolute', right: -10, bottom: -20, opacity: 0.1, color: '#fff' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
            <div style={{ padding: 6, background: 'rgba(255,255,255,0.15)', borderRadius: '4px' }}>
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>BULK IMPORT STUDENTS</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8, fontWeight: 500 }}>Upload Excel or CSV file to batch register</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '4px',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: 'pointer', position: 'relative', zIndex: 1
          }}>
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '32px' }}>
          {err && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <AlertTriangle size={14} />
              {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 24, alignItems: 'stretch' }}>

            {/* LEFT SIDE: Template Info */}
            <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', padding: '20px', background: '#ecfdf5', borderRadius: '4px', border: '1px solid #d1fae5' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#065f46', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <FileText size={16} />
                Required Columns
              </div>

              <ul style={{
                listStyle: 'none', padding: 0, margin: 0,
                fontSize: '0.75rem', color: '#065f46',
                display: 'flex', flexDirection: 'column', gap: 10
              }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>• NAME *</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• PHONE</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• EMAIL</li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span>• DOB <br /><i style={{ fontSize: '0.65rem', opacity: 0.7 }}>(DD-MM-YYYY)</i></span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• GENDER</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• ADDRESS</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• CLASSNAME</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• BATCHNAME</li>
              </ul>
            </div>

            {/* RIGHT SIDE: Upload Dropzone */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: `2px dashed ${isDragging ? '#059669' : bulkFile && !err ? '#059669' : '#e2e8f0'}`,
                  borderRadius: '4px',
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: isDragging ? '#f0fdf4' : bulkFile && !err ? '#f0fdf4' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '280px'
                }}
              >
                <input
                  type="file"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv, .xlsx, .xls"
                />

                {bulkFile && !err ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <CheckCircle size={40} color="#059669" />
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>{fileName}</div>
                    <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase' }}>{bulkFile.length} records ready</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Click or drag a new file to replace</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: 16, background: '#f8fafc', borderRadius: '4px', color: '#64748b' }}>
                      <FileSpreadsheet size={32} />
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>DRAG & DROP FILE HERE</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Excel (.xlsx, .xls) or CSV template</div>

                    <button type="button" style={{
                      marginTop: 12, padding: '10px 24px', background: '#059669', color: '#fff',
                      borderRadius: '4px', border: 'none', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer',
                      letterSpacing: '0.05em'
                    }} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      BROWSE FILES
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, padding: '16px 20px', background: '#ecfdf5', borderRadius: '4px', border: '1px solid #d1fae5', display: 'flex', gap: 12, alignItems: 'center' }}>
            <AlertTriangle size={18} color="#059669" />
            <div style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600, lineHeight: 1.5 }}>
              All imported students will be assigned the default password <strong>student@123</strong>. Ensure headers match exactly.
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" onClick={onClose} disabled={saving} style={{
            padding: '10px 24px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer'
          }}>
            CANCEL
          </button>
          <button
            type="button"
            disabled={!bulkFile || saving}
            onClick={onConfirm}
            style={{
              padding: '10px 32px', background: (!bulkFile || saving) ? '#94a3b8' : '#059669', color: '#fff',
              borderRadius: '4px', border: 'none', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            {saving ? <><Loader2 className="spin" size={14} /> IMPORTING...</> : "CONFIRM IMPORT"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default BulkImportModal;