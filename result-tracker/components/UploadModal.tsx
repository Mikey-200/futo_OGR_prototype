"use client";

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommit: (parsedData: any[]) => Promise<void>;
}

interface ParsedRow {
  reg_number: string;
  ca_score: number;
  exam_score: number;
}

export default function UploadModal({ isOpen, onClose, onCommit }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationState, setValidationState] = useState<'idle' | 'rejected' | 'passed'>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setValidationState('idle');
    setErrors([]);
    setParsedRows([]);
  };

  const handleClose = () => {
    if (isCommitting) return;
    resetState();
    onClose();
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) {
      setValidationState('rejected');
      setErrors(["File is empty or contains only headers."]);
      return;
    }

    const headers = lines[0].toLowerCase().split(',');
    const hasValidHeaders = headers.some(h => h.includes('reg_number')) && 
                            headers.some(h => h.includes('ca_score')) && 
                            headers.some(h => h.includes('exam_score'));

    if (!hasValidHeaders) {
      setValidationState('rejected');
      setErrors(["CSV must contain 'reg_number', 'ca_score', and 'exam_score' headers."]);
      return;
    }

    const regIdx = headers.findIndex(h => h.trim() === 'reg_number');
    const caIdx = headers.findIndex(h => h.trim() === 'ca_score');
    const examIdx = headers.findIndex(h => h.trim() === 'exam_score');

    let newErrors: string[] = [];
    let validRows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row.length < 3) continue;

      const reg = row[regIdx]?.trim() || '';
      const caRaw = row[caIdx]?.trim();
      const examRaw = row[examIdx]?.trim();

      const ca = parseFloat(caRaw);
      const exam = parseFloat(examRaw);
      
      const rowNum = i + 1;

      if (!/^\d{11}$/.test(reg)) {
         newErrors.push(`Row ${rowNum}: Registration Number '${reg}' is invalid (Must be exactly 11 digits).`);
      }
      
      if (isNaN(ca) || ca < 0 || ca > 40) {
         newErrors.push(`Row ${rowNum}: CA Score '${caRaw}' is invalid (Maximum allowed is 40 points).`);
      }
      
      if (isNaN(exam) || exam < 0 || exam > 70) {
         newErrors.push(`Row ${rowNum}: Exam Score '${examRaw}' is invalid (Maximum allowed is 70 points).`);
      }

      validRows.push({ reg_number: reg, ca_score: ca, exam_score: exam });
    }

    if (newErrors.length > 0) {
      setValidationState('rejected');
      setErrors(newErrors);
    } else {
      setValidationState('passed');
      setParsedRows(validRows);
    }
  };

  const handleFile = (file: File) => {
    resetState();
    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      setValidationState('rejected');
      setErrors(["Please upload a valid CSV file."]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        parseCSV(e.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleCommit = async () => {
    setIsCommitting(true);
    await onCommit(parsedRows);
    setIsCommitting(false);
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center">
            <UploadCloud className="w-5 h-5 mr-2 text-[#0d5c2e]" />
            Bulk Ledger Upload
          </h2>
          <button onClick={handleClose} disabled={isCommitting} className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1">
          {validationState === 'idle' && (
            <div 
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
                isDragging ? 'border-[#0d5c2e] bg-[#f0f9f4]' : 'border-slate-300 hover:border-[#0d5c2e]/50 hover:bg-slate-50'
              }`}
            >
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={(e) => e.target.files && handleFile(e.target.files[0])}
              />
              <div className="w-16 h-16 mx-auto bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Drag and drop departmental test_records.csv here</h3>
              <p className="text-sm font-medium text-slate-500">or click to browse local files.</p>
            </div>
          )}

          {validationState === 'rejected' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
              <div className="flex items-start space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-black text-rose-900 tracking-tight">Validation Failed</h3>
                  <p className="text-sm font-semibold text-rose-700/80 mt-1">Please correct the following errors and upload again:</p>
                </div>
              </div>
              <ul className="space-y-2 mt-4 max-h-[40vh] overflow-y-auto pr-2">
                {errors.map((err, i) => (
                  <li key={i} className="text-sm font-medium text-rose-800 bg-white p-3 rounded-lg border border-rose-100 shadow-sm">
                    {err}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <button onClick={resetState} className="text-sm font-bold text-rose-700 hover:text-rose-800 bg-rose-100 px-4 py-2 rounded-lg transition-colors">
                  &larr; Try another file
                </button>
              </div>
            </div>
          )}

          {validationState === 'passed' && (
            <div className="space-y-6">
              <div className="flex items-start space-x-3 bg-[#e6f2eb] border border-[#0d5c2e]/20 p-4 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-[#0d5c2e] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-black text-[#0d5c2e] uppercase tracking-widest">Passed Validation</h3>
                  <p className="text-sm font-semibold text-[#0d5c2e]/80 mt-1">Successfully verified {parsedRows.length} records. Review the preview below before committing.</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Data Preview (First 5 Rows)</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Reg No</th>
                        <th className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">CA Score</th>
                        <th className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Exam Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-sm font-bold text-slate-900">{row.reg_number}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-600">{row.ca_score}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-600">{row.exam_score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 5 && (
                  <div className="px-4 py-2 bg-slate-50 text-center border-t border-slate-200">
                    <p className="text-xs font-bold text-slate-400">...and {parsedRows.length - 5} more rows</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3 shrink-0">
          <button 
            onClick={handleClose} 
            disabled={isCommitting}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel Upload
          </button>
          {validationState === 'passed' && (
            <button 
              onClick={handleCommit}
              disabled={isCommitting}
              className="flex items-center justify-center px-6 py-2.5 bg-[#0d5c2e] hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm transition-all disabled:opacity-50 min-w-[240px]"
            >
              {isCommitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Committing to Cloud...
                </>
              ) : (
                'Confirm and Commit Ledger to Cloud'
              )}
            </button>
          )}
        </div>
        
      </div>
    </div>
  );
}
