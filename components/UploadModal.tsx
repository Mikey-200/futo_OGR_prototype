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
      setErrors(['File is empty or contains only headers.']);
      return;
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const regIdx = headers.findIndex(h => h === 'reg_number');
    const caIdx = headers.findIndex(h => h === 'ca_score');
    const examIdx = headers.findIndex(h => h === 'exam_score');

    if (regIdx === -1 || caIdx === -1 || examIdx === -1) {
      setValidationState('rejected');
      setErrors(["CSV must contain 'reg_number', 'ca_score', and 'exam_score' column headers."]);
      return;
    }

    const newErrors: string[] = [];
    const validRows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 3) continue;

      const reg = cols[regIdx]?.trim() || '';
      const caRaw = cols[caIdx]?.trim();
      const examRaw = cols[examIdx]?.trim();
      const ca = parseFloat(caRaw);
      const exam = parseFloat(examRaw);
      const rowNum = i + 1;

      if (!/^\d{11}$/.test(reg))
        newErrors.push(`Row ${rowNum}: Registration Number '${reg}' must be exactly 11 digits.`);
      if (isNaN(ca) || ca < 0 || ca > 40)
        newErrors.push(`Row ${rowNum}: CA Score '${caRaw}' is out of bounds (0–40 allowed).`);
      if (isNaN(exam) || exam < 0 || exam > 70)
        newErrors.push(`Row ${rowNum}: Exam Score '${examRaw}' is out of bounds (0–70 allowed).`);

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
    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      setValidationState('rejected');
      setErrors(['Please upload a valid .csv file.']);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) parseCSV(e.target.result as string);
    };
    reader.readAsText(file);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleCommit = async () => {
    setIsCommitting(true);
    await onCommit(parsedRows);
    setIsCommitting(false);
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/30 backdrop-blur-sm">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <h2 className="text-[15px] font-black text-[#0F172A] tracking-tight flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[#15803D]" />
            Bulk Ledger Upload
          </h2>
          <button onClick={handleClose} disabled={isCommitting} className="text-[#94A3B8] hover:text-[#0F172A] transition-colors disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* Idle — Dropzone */}
          {validationState === 'idle' && (
            <div
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-[#15803D] bg-[#F0FDF4]'
                  : 'border-[#E2E8F0] hover:border-[#15803D]/40 hover:bg-[#F8FAFC]'
              }`}
            >
              <input type="file" accept=".csv" className="hidden" ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <div className="w-16 h-16 mx-auto bg-[#F8FAFC] border border-[#E2E8F0] rounded-full flex items-center justify-center mb-4 shadow-sm">
                <FileText className="w-8 h-8 text-[#CBD5E1]" />
              </div>
              <h3 className="text-[14px] font-black text-[#0F172A] mb-1.5">
                Drag and drop departmental test_records.csv here
              </h3>
              <p className="text-[12px] font-medium text-[#94A3B8]">or click to browse local files.</p>
            </div>
          )}

          {/* Rejected — Error state */}
          {validationState === 'rejected' && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-[14px] font-black text-rose-800 tracking-tight">Validation Failed</h3>
                  <p className="text-[12px] font-semibold text-rose-600/80 mt-0.5">
                    Correct the following errors and upload again:
                  </p>
                </div>
              </div>
              <ul className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                {errors.map((err, i) => (
                  <li key={i} className="text-[12px] font-medium text-rose-700 bg-white border border-rose-100 rounded-xl p-3 shadow-sm">
                    {err}
                  </li>
                ))}
              </ul>
              <button onClick={resetState} className="mt-4 text-[12px] font-bold text-rose-600 hover:text-rose-700 bg-rose-100 px-4 py-2 rounded-lg transition-colors">
                ← Try another file
              </button>
            </div>
          )}

          {/* Passed — Preview */}
          {validationState === 'passed' && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 bg-[#F0FDF4] border border-[#86EFAC] p-4 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-[12px] font-black text-[#15803D] uppercase tracking-widest">Passed Validation</h3>
                  <p className="text-[12px] font-semibold text-[#15803D]/70 mt-0.5">
                    Verified {parsedRows.length} records. Review the preview below before committing.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
                <div className="bg-[#F8FAFC] px-4 py-2.5 border-b border-[#E2E8F0]">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">
                    Data Preview — First 5 Rows
                  </h4>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F8FAFC]">
                    <tr>
                      {["Reg No", "CA Score", "Exam Score"].map((h) => (
                        <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8] border-b border-[#E2E8F0]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-2.5 text-[13px] font-bold font-mono text-[#0F172A]">{row.reg_number}</td>
                        <td className="px-4 py-2.5 text-[13px] font-mono text-[#475569]">{row.ca_score}</td>
                        <td className="px-4 py-2.5 text-[13px] font-mono text-[#475569]">{row.exam_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 5 && (
                  <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] text-center">
                    <p className="text-[11px] font-bold text-[#94A3B8]">
                      ...and {parsedRows.length - 5} more rows
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={handleClose}
            disabled={isCommitting}
            className="px-5 py-2.5 text-[13px] font-bold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-xl transition-all disabled:opacity-40"
          >
            Cancel Upload
          </button>
          {validationState === 'passed' && (
            <button
              onClick={handleCommit}
              disabled={isCommitting}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#15803D] hover:bg-[#166534] disabled:bg-[#86EFAC] text-white font-bold text-[13px] rounded-xl shadow-sm transition-all min-w-[220px]"
            >
              {isCommitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Committing to Cloud...</span></>
              ) : (
                <span>Confirm and Commit Ledger to Cloud</span>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
