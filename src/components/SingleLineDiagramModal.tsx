import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  ZoomIn, 
  ZoomOut, 
  Upload, 
  Check, 
  Zap,
  QrCode,
  Share2,
  AlertCircle,
  FolderSync,
  FileText,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';
import { ElectricalPanel, UserRole, PanelPdf } from '../types';
import { getEquipmentQrUrl } from '../utils/storage';
import { shareUrl } from '../utils/qrHelper';
import { getFileKind, getFileKindLabel, isPdfRenderable } from '../utils/googleDrive';

interface SingleLineDiagramModalProps {
  panel: ElectricalPanel;
  stationId: string;
  stationName: string;
  countyName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePdf?: (panelId: string, newPdf: PanelPdf) => void;
  onOpenQr?: () => void;
  onOpenDrivePicker?: () => void;
  currentRole: UserRole;
}

export const SingleLineDiagramModal: React.FC<SingleLineDiagramModalProps> = ({
  panel,
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
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isChangingFile, setIsChangingFile] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [justUploaded, setJustUploaded] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<'idle' | 'shared' | 'copied'>('idle');

  if (!isOpen) return null;

  const isSuperAdmin = currentRole === 'super_admin';
  const pdf = panel.pdfFile;
  const equipmentUrl = getEquipmentQrUrl(stationId, 'panel', panel.id);

  const handleShare = async () => {
    const result = await shareUrl(
      equipmentUrl,
      `${panel.name} - ${stationName}`,
      `نقشه دیاگرام تک‌خطی ${panel.name} (${stationName} - ${countyName}):`
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
      setFileError('لطفاً فقط فایل PDF انتخاب کنید.');
      e.target.value = '';
      return;
    }

    const title = customTitle.trim() || `دیاگرام تک‌خطی ${panel.name}`;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = Number(sizeMb) >= 1 ? `${sizeMb} مگابایت` : `${Math.round(file.size / 1024)} کیلوبایت`;

    const reader = new FileReader();
    reader.onload = () => {
      const newPdf: PanelPdf = {
        id: `pdf-${Date.now()}`,
        title,
        fileName: file.name,
        uploadDate: new Intl.DateTimeFormat('fa-IR').format(new Date()),
        fileSize: sizeStr,
        dataUrl: reader.result as string
      };
      onUpdatePdf(panel.id, newPdf);
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
        `نام تابلو: ${panel.name}`,
        `عنوان نقشه: ${pdf?.title || 'دیاگرام تک‌خطی و نقشه الکتریکال تابلو'}`,
        `تاریخ: ${pdf?.uploadDate || '۱۴۰۳/۰۸/۱۰'}`,
        pdf?.driveWebViewLink ? `لینک Google Drive: ${pdf.driveWebViewLink}` : ''
      ].filter(Boolean);
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${panel.name.replace(/\s+/g, '_')}_diagram.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const canRenderPdfIframe = isPdfRenderable(pdf);
  const isDriveDocument = Boolean(pdf?.driveFileId);
  const hasNonPdfDocument = Boolean(pdf && (isDriveDocument || (pdf.dataUrl && !canRenderPdfIframe)));
  const fileKind = getFileKind(pdf?.mimeType, pdf?.fileName);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between border-b border-blue-700 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                دیاگرام تک‌خطی: {panel.name}
              </h3>
              <p className="text-[11px] text-blue-100 truncate">
                {stationName} ({countyName}) · {pdf?.title || 'نقشه و وایرینگ تابلو برق'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom */}
            <div className="hidden sm:flex items-center gap-1 bg-blue-700/60 rounded-lg p-1 border border-blue-500/40 text-xs">
              <button
                onClick={() => setZoomLevel(z => Math.max(z - 15, 70))}
                className="p-1 rounded text-blue-100 hover:text-white hover:bg-blue-600"
                title="کوچک‌نمایی"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-blue-100">
                {zoomLevel}٪
              </span>
              <button
                onClick={() => setZoomLevel(z => Math.min(z + 15, 150))}
                className="p-1 rounded text-blue-100 hover:text-white hover:bg-blue-600"
                title="بزرگ‌نمایی"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

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
              title="اشتراک‌گذاری لینک نقشه تابلو"
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
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-900 bg-white hover:bg-blue-50 rounded-lg shadow-2xs transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">دانلود فایل نقشه</span>
            </button>

            <button
              onClick={() => window.print()}
              className="hidden md:flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ</span>
            </button>

            <button
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

        {/* Admin File Replacement Drawer (Only for Super Admin / من) */}
        {isSuperAdmin && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs shrink-0 no-print">
            <span className="text-slate-600">
              دسترسی مدیریت: تغییر یا بارگذاری نسخه جدید فایل نقشه (PDF از دستگاه یا از Google Drive)
            </span>
            <button
              type="button"
              onClick={() => setIsChangingFile(!isChangingFile)}
              className="text-blue-700 font-bold hover:underline flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isChangingFile ? 'بستن فرم بارگذاری' : 'تغییر یا اتصال فایل جدید'}</span>
            </button>
          </div>
        )}

        {isSuperAdmin && isChangingFile && (
          <div className="bg-blue-50/50 p-4 border-b border-blue-200 space-y-2 text-xs shrink-0 no-print">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  عنوان دلخواه نقشه:
                </label>
                <input
                  type="text"
                  placeholder={`دیاگرام تک‌خطی ${panel.name}`}
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
            <p className="text-[11px] text-slate-500">
              * تغییر فایل نقشه یا اتصال به Google Drive، آدرس QR کد چاپ‌شده روی تابلو را تغییر نمی‌دهد و کد QR برای همیشه ثابت می‌ماند.
            </p>
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
              <span>فایل نقشه تابلو برق با موفقیت بارگذاری شد.</span>
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

        {/* Viewport Content */}
        <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-y-auto flex justify-center">
          {canRenderPdfIframe && pdf?.dataUrl ? (
            <iframe
              src={pdf.dataUrl}
              className="w-full h-full min-h-[500px] bg-white rounded-lg shadow-sm border border-slate-300"
              title={pdf.title}
            />
          ) : hasNonPdfDocument && pdf ? (
            <div className="bg-white shadow-md rounded-xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 text-center space-y-5 self-center">
              <div
                className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
                  fileKind === 'excel'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-blue-50 text-blue-600 border border-blue-200'
                }`}
              >
                {fileKind === 'excel' ? (
                  <FileSpreadsheet className="w-8 h-8" />
                ) : (
                  <FileText className="w-8 h-8" />
                )}
              </div>

              <div className="space-y-1.5">
                <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700">
                  فایل {getFileKindLabel(pdf.mimeType, pdf.fileName)} متصل به Google Drive
                </span>
                <h4 className="text-base font-bold text-slate-900 break-words">
                  {pdf.title}
                </h4>
                <p className="text-xs text-slate-600 font-mono break-all">
                  {pdf.fileName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-right">
                <div>
                  <span className="text-slate-500 block">حجم فایل:</span>
                  <strong className="text-slate-900 font-tabular">{pdf.fileSize}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">آخرین همگام‌سازی:</span>
                  <strong className="text-slate-900 font-tabular">
                    {pdf.lastSyncedAt || pdf.uploadDate}
                  </strong>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                این سند با فرمت {getFileKindLabel(pdf.mimeType, pdf.fileName)} است. برای مشاهده کامل می‌توانید نسخه همگام‌شده را دانلود کنید یا مستقیماً در Google Drive باز نمایید.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
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
            // High-fidelity structured schematic view for sample blueprint
            <div 
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="transition-transform duration-150 bg-white shadow-md rounded-xl border border-slate-300 max-w-3xl w-full p-6 sm:p-10 text-slate-900 space-y-6"
            >
              {/* Document Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block">
                    استان هرمزگان · مرکز نگهداری {countyName}
                  </span>
                  <h2 className="text-xl font-black text-slate-950 mt-0.5">
                    دیاگرام تک‌خطی (Single Line Diagram) - {panel.name}
                  </h2>
                  <span className="text-xs text-slate-600 font-bold block mt-0.5">
                    {stationName}
                  </span>
                </div>
                <div className="text-left text-xs space-y-0.5">
                  <div className="bg-blue-50 border border-blue-200 px-2.5 py-1 rounded font-mono font-bold text-blue-900 text-xs">
                    {panel.id.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    تاریخ ثبت: {pdf?.uploadDate || '۱۴۰۳/۰۸/۱۰'}
                  </div>
                </div>
              </div>

              {/* Single-Line Diagram Graphical Illustration */}
              <div className="border border-slate-300 rounded-lg p-5 bg-slate-50/70 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-700 font-bold border-b border-slate-200 pb-2">
                  <span>دیاگرام شماتیک و مسیر جریان الکتریکی (Power Flow)</span>
                  <span className="font-mono text-[10px] text-slate-500">DWG-HRZ-{panel.id.toUpperCase()}</span>
                </div>

                {/* Graphical Power Flow */}
                <div className="bg-white rounded border border-slate-300 p-4 space-y-4">
                  {/* Mains & Gen Incomers */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <span className="text-xs font-bold text-blue-950 block">ورودی ترانسفورماتور شهر</span>
                      <span className="text-[11px] font-mono text-blue-800 block">380V / 3Ph / 50Hz</span>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                      <span className="text-xs font-bold text-amber-950 block">ورودی دیزل ژنراتور اضطراری</span>
                      <span className="text-[11px] font-mono text-amber-800 block">ATS Interlock 250A</span>
                    </div>
                  </div>

                  {/* Main Busbar */}
                  <div className="h-2.5 bg-blue-600 rounded-full w-full relative">
                    <span className="absolute -top-4 right-2 text-[10px] font-mono font-bold text-blue-900">
                      شینه‌کشی مسی فازها و نول (Cu Busbar 40x5mm)
                    </span>
                  </div>

                  {/* Outgoing Feeders */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                      <span className="font-bold text-slate-800 block text-[11px]">رکتیفایر ۴۸ ولت</span>
                      <span className="font-mono text-[10px] text-slate-500">MCCB 160A</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                      <span className="font-bold text-slate-800 block text-[11px]">تهویه و چیلر</span>
                      <span className="font-mono text-[10px] text-slate-500">MCCB 100A</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                      <span className="font-bold text-slate-800 block text-[11px]">روشنایی و پریزها</span>
                      <span className="font-mono text-[10px] text-slate-500">MCB 63A</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-white p-3 rounded border border-slate-200 leading-relaxed">
                  <strong>نکات فنی وایرینگ:</strong> کلیه فیدرها مجهز به سرج ارستر کلاس B+C و شینه ارت متصل به چاه ارت زیر ۲ اهم می‌باشد.
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>واحد نگهداری ارتباطات هرمزگان</span>
                <span className="font-mono">{stationName}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
