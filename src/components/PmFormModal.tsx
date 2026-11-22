import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  ClipboardCheck,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  QrCode,
  Share2,
  Check,
  FolderSync,
  FileText,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';
import { PmForm, UserRole, PanelPdf } from '../types';
import { getEquipmentQrUrl } from '../utils/storage';
import { shareUrl } from '../utils/qrHelper';
import { getFileKind, getFileKindLabel, isPdfRenderable } from '../utils/googleDrive';

interface PmFormModalProps {
  form: PmForm;
  stationId: string;
  stationName: string;
  countyName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePdf?: (formId: string, newPdf: PanelPdf) => void;
  onOpenQr?: () => void;
  onOpenDrivePicker?: () => void;
  currentRole: UserRole;
}

export const PmFormModal: React.FC<PmFormModalProps> = ({
  form,
  stationId,
  stationName,
  countyName,
  isOpen,
  onClose,
  onUpdatePdf,
  onOpenQr,
  onOpenDrivePicker,
  currentRole
}) => {
  const [isChangingFile, setIsChangingFile] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<'idle' | 'shared' | 'copied'>('idle');

  if (!isOpen) return null;

  const canUploadPdf = currentRole === 'super_admin' || currentRole === 'technician';
  const pdf = form.pdfFile;
  const pmUrl = getEquipmentQrUrl(stationId, 'pm', form.id);

  const handleShare = async () => {
    const result = await shareUrl(
      pmUrl,
      `${form.title} - ${stationName}`,
      `آخرین فرم PM ایستگاه ${stationName} (${countyName}) - ${form.title}:`
    );
    if (result === 'shared' || result === 'copied') {
      setShareFeedback(result);
      setTimeout(() => setShareFeedback('idle'), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file || !onUpdatePdf) return;

    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) {
      setFileError('لطفاً فقط فایل PDF انتخاب نمایید.');
      e.target.value = '';
      return;
    }

    const title = customTitle.trim() || `فایل فرم PM - ${form.title}`;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = Number(sizeMb) >= 1
      ? `${sizeMb} مگابایت`
      : `${Math.max(1, Math.round(file.size / 1024))} کیلوبایت`;

    const reader = new FileReader();
    reader.onload = () => {
      const newPdf: PanelPdf = {
        id: `pdf-pm-${Date.now()}`,
        title,
        fileName: file.name,
        uploadDate: new Intl.DateTimeFormat('fa-IR').format(new Date()),
        fileSize: sizeStr,
        dataUrl: reader.result as string
      };
      onUpdatePdf(form.id, newPdf);
      setIsChangingFile(false);
      setCustomTitle('');
      setJustUploaded(true);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (pdf?.dataUrl) {
      const a = document.createElement('a');
      a.href = pdf.dataUrl;
      a.download = pdf.fileName;
      a.click();
    } else {
      const lines = [
        `استان هرمزگان - ${countyName}`,
        `ایستگاه: ${stationName}`,
        `عنوان فرم PM: ${form.title}`,
        `شناسه: ${form.id}`,
        `تاریخ انجام: ${form.performedDate}`,
        form.nextDueDate ? `تاریخ سرویس بعدی: ${form.nextDueDate}` : '',
        `کارشناس مجری: ${form.technicianName}`,
        `وضعیت: ${form.status === 'completed' ? 'تکمیل‌شده' : 'نیاز به پیگیری'}`,
        form.equipmentScope ? `محدوده تجهیزات: ${form.equipmentScope}` : '',
        form.notes ? `شرح گزارش: ${form.notes}` : '',
        pdf?.driveWebViewLink ? `لینک Google Drive: ${pdf.driveWebViewLink}` : ''
      ].filter(Boolean);

      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.id}_pm_report.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const canRenderPdfIframe = isPdfRenderable(pdf);
  const isDriveDocument = Boolean(pdf?.driveFileId);
  const hasNonPdfDocument = Boolean(pdf && (isDriveDocument || (pdf.dataUrl && !canRenderPdfIframe)));
  const fileKind = getFileKind(pdf?.mimeType, pdf?.fileName);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      dir="rtl"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between border-b border-blue-700 shrink-0 no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {form.title}
              </h3>
              <p className="text-[11px] text-blue-100 truncate">
                {stationName} ({countyName}) · تاریخ انجام: {form.performedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenQr && (
              <button
                type="button"
                onClick={onOpenQr}
                title="تبدیل به QR Code"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">کد QR</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              title="اشتراک‌گذاری لینک فرم PM"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
            >
              {shareFeedback !== 'idle' ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {shareFeedback === 'copied'
                  ? 'کپی شد'
                  : shareFeedback === 'shared'
                    ? 'ارسال شد'
                    : 'اشتراک‌گذاری'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-900 bg-white hover:bg-blue-50 rounded-lg shadow-2xs transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">دانلود فرم</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="hidden md:flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-700 transition-colors"
              aria-label="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drive Sync Status Bar */}
        {isDriveDocument && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 no-print">
            <span className="text-emerald-900 font-semibold flex items-center gap-1.5">
              <FolderSync className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                همگام‌سازی خودکار با Google Drive ({getFileKindLabel(pdf?.mimeType, pdf?.fileName)})
                {pdf?.lastSyncedAt ? ` · آخرین همگام‌سازی: ${pdf.lastSyncedAt}` : ''}
              </span>
            </span>
            {pdf?.driveWebViewLink && (
              <a
                href={pdf.driveWebViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 hover:underline font-bold"
              >
                <span>مشاهده در Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* File Upload Drawer */}
        {canUploadPdf && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs shrink-0 no-print">
            <span className="text-slate-600">
              بارگذاری یا جایگزینی فایل فرم PM (PDF از دستگاه یا از Google Drive)
            </span>
            <button
              type="button"
              onClick={() => {
                setIsChangingFile(!isChangingFile);
                setFileError(null);
              }}
              className="text-blue-700 font-bold hover:underline flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isChangingFile ? 'بستن فرم بارگذاری' : 'پیوست یا اتصال فایل جدید'}</span>
            </button>
          </div>
        )}

        {canUploadPdf && isChangingFile && (
          <div className="bg-blue-50/50 p-4 border-b border-blue-200 space-y-2 text-xs shrink-0 no-print">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  عنوان فایل پیوست:
                </label>
                <input
                  type="text"
                  placeholder={`فایل فرم PM - ${form.title}`}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  انتخاب فایل PDF از دستگاه یا از Google Drive:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileUpload}
                    className="flex-1 min-w-[180px] text-xs text-slate-500 file:mr-0 file:ml-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                  {onOpenDrivePicker && (
                    <button
                      type="button"
                      onClick={onOpenDrivePicker}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <FolderSync className="w-3.5 h-3.5" />
                      <span>انتخاب از Google Drive</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            {fileError && (
              <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fileError}</span>
              </p>
            )}
          </div>
        )}

        {/* Post-upload immediate QR Code & Share bar */}
        {justUploaded && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 no-print">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>فایل PDF فرم PM با موفقیت بارگذاری شد.</span>
            </span>
            <div className="flex items-center gap-2">
              {onOpenQr && (
                <button
                  type="button"
                  onClick={onOpenQr}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors whitespace-nowrap"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>تبدیل به QR Code</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>
                  {shareFeedback === 'copied'
                    ? 'لینک کپی شد!'
                    : shareFeedback === 'shared'
                      ? 'ارسال شد!'
                      : 'اشتراک‌گذاری'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-y-auto flex justify-center">
          {canRenderPdfIframe && pdf?.dataUrl ? (
            <iframe
              src={pdf.dataUrl}
              className="w-full h-full min-h-[500px] bg-white rounded-lg shadow-sm border border-slate-300"
              title={pdf.title}
            />
          ) : hasNonPdfDocument && pdf ? (
            <div className="bg-white shadow-md rounded-xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 space-y-5 self-start print-card">
              <div className="flex items-start gap-4 border-b border-slate-200 pb-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    fileKind === 'excel'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}
                >
                  {fileKind === 'excel' ? (
                    <FileSpreadsheet className="w-7 h-7" />
                  ) : (
                    <FileText className="w-7 h-7" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    فرم PM · فایل {getFileKindLabel(pdf.mimeType, pdf.fileName)} متصل به Google Drive
                  </span>
                  <h4 className="text-base font-bold text-slate-900 break-words">
                    {form.title}
                  </h4>
                  <p className="text-xs text-slate-600 font-mono break-all">
                    {pdf.fileName}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block mb-0.5">تاریخ انجام سرویس (PM):</span>
                  <strong className="text-slate-900 font-tabular text-sm">{form.performedDate}</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block mb-0.5">کارشناس / مجری مسئول:</span>
                  <strong className="text-slate-900 text-sm">{form.technicianName}</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block mb-0.5">حجم فایل:</span>
                  <strong className="text-slate-900 font-tabular text-sm">{pdf.fileSize}</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block mb-0.5">آخرین همگام‌سازی:</span>
                  <strong className="text-slate-900 font-tabular text-sm">
                    {pdf.lastSyncedAt || pdf.uploadDate}
                  </strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                {pdf.dataUrl && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود فایل ({getFileKindLabel(pdf.mimeType, pdf.fileName)})</span>
                  </button>
                )}
                {pdf.driveWebViewLink && (
                  <a
                    href={pdf.driveWebViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>باز کردن در Google Drive</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-xl border border-slate-300 max-w-3xl w-full p-6 sm:p-10 text-slate-900 space-y-6 self-start print-card">
              {/* Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block">
                    استان هرمزگان · مرکز نگهداری {countyName}
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-950 mt-0.5">
                    {form.title}
                  </h2>
                  <span className="text-xs text-slate-600 font-bold block mt-1">
                    ایستگاه مخابراتی: {stationName}
                  </span>
                </div>

                <div className="text-left text-xs space-y-1 shrink-0">
                  <div className="bg-blue-50 border border-blue-200 px-2.5 py-1 rounded font-mono font-bold text-blue-900">
                    {form.id.toUpperCase()}
                  </div>
                  <div className="text-[11px] font-semibold flex items-center justify-end gap-1">
                    {form.status === 'completed' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">تکمیل‌شده</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-amber-700">نیاز به پیگیری</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Structured Details Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block mb-0.5">تاریخ انجام سرویس (PM):</span>
                  <strong className="text-slate-900 font-tabular text-sm">{form.performedDate}</strong>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block mb-0.5">کارشناس / مجری مسئول:</span>
                  <strong className="text-slate-900 text-sm">{form.technicianName}</strong>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block mb-0.5">تاریخ دوره بعدی (پیشنهادی):</span>
                  <strong className="text-slate-900 font-tabular text-sm">
                    {form.nextDueDate || 'ثبت نشده'}
                  </strong>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block mb-0.5">فایل اسکن PDF پیوست:</span>
                  <strong className="text-slate-900 text-sm">
                    {pdf ? `${pdf.fileName} (${pdf.fileSize})` : 'فایل PDF پیوست نشده است'}
                  </strong>
                </div>
              </div>

              {form.equipmentScope && (
                <div className="border border-slate-200 rounded-lg p-4 space-y-1 text-xs">
                  <h4 className="font-bold text-slate-900">تجهیزات و بخش‌های بررسی‌شده:</h4>
                  <p className="text-slate-700 leading-relaxed">{form.equipmentScope}</p>
                </div>
              )}

              <div className="border border-slate-200 rounded-lg p-4 space-y-1.5 text-xs bg-slate-50/50">
                <h4 className="font-bold text-slate-900">شرح اقدامات، مشاهدات و گزارش فنی:</h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {form.notes || 'توضیحات تکمیلی برای این فرم ثبت نشده است.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>واحد نگهداری ارتباطات هرمزگان</span>
                <span>{stationName}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
