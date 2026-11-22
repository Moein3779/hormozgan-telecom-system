import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  FileText,
  QrCode,
  Trash2,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  Share2,
  Check,
  X,
  FolderSync
} from 'lucide-react';
import { PmForm, PmFormStatus, UserRole, PanelPdf } from '../types';
import { getEquipmentQrUrl } from '../utils/storage';
import { shareUrl } from '../utils/qrHelper';
import { getFileKindLabel } from '../utils/googleDrive';

interface PmFormsSectionProps {
  pmForms: PmForm[];
  stationId: string;
  stationName: string;
  countyName: string;
  currentRole: UserRole;
  onOpenForm: (form: PmForm) => void;
  onOpenQr: (form: PmForm) => void;
  onAddForm: (newForm: Omit<PmForm, 'id'>) => PmForm | void;
  onDeleteForm: (formId: string) => void;
  onOpenDrivePicker?: () => void;
  drivePickedPdf?: PanelPdf | null;
  onConsumeDrivePickedPdf?: () => void;
}

export const PmFormsSection: React.FC<PmFormsSectionProps> = ({
  pmForms,
  stationId,
  stationName,
  countyName,
  currentRole,
  onOpenForm,
  onOpenQr,
  onAddForm,
  onDeleteForm,
  onOpenDrivePicker,
  drivePickedPdf,
  onConsumeDrivePickedPdf
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [performedDate, setPerformedDate] = useState(() =>
    new Intl.DateTimeFormat('fa-IR').format(new Date())
  );
  const [nextDueDate, setNextDueDate] = useState('');
  const [equipmentScope, setEquipmentScope] = useState('');
  const [status, setStatus] = useState<PmFormStatus>('completed');
  const [notes, setNotes] = useState('');
  const [uploadedPdf, setUploadedPdf] = useState<PanelPdf | undefined>(undefined);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [lastCreatedForm, setLastCreatedForm] = useState<PmForm | null>(null);
  const [sharedItemId, setSharedItemId] = useState<string | null>(null);

  const canAdd = currentRole === 'super_admin' || currentRole === 'technician';
  const isSuperAdmin = currentRole === 'super_admin';

  useEffect(() => {
    setLastCreatedForm(null);
    setPendingDeleteId(null);
  }, [stationId]);

  useEffect(() => {
    if (drivePickedPdf) {
      setIsAdding(true);
      setUploadedPdf(drivePickedPdf);
      if (!title.trim()) {
        setTitle(
          drivePickedPdf.title ||
            drivePickedPdf.fileName.replace(/\.(pdf|docx?|xlsx?|csv)$/i, '')
        );
      }
      onConsumeDrivePickedPdf?.();
    }
  }, [drivePickedPdf, title, onConsumeDrivePickedPdf]);

  // Newest added/stored form is treated as latest PM form (we prepend new forms on add)
  const latestForm = pmForms[0];
  const previousForms = pmForms.slice(1);

  const handleShareForm = async (form: PmForm) => {
    const url = getEquipmentQrUrl(stationId, 'pm', form.id);
    const result = await shareUrl(
      url,
      `${form.title} - ${stationName}`,
      `آخرین فرم PM ایستگاه ${stationName} (${countyName}) - ${form.title}:`
    );
    if (result === 'shared' || result === 'copied') {
      setSharedItemId(form.id);
      setTimeout(() => setSharedItemId((prev) => (prev === form.id ? null : prev)), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) {
      setFileError('لطفاً فقط فایل با فرمت PDF انتخاب نمایید.');
      e.target.value = '';
      return;
    }

    const effectiveTitle = title.trim() || file.name.replace(/\.pdf$/i, '');
    if (!title.trim()) {
      setTitle(effectiveTitle);
    }

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = Number(sizeMb) >= 1
      ? `${sizeMb} مگابایت`
      : `${Math.max(1, Math.round(file.size / 1024))} کیلوبایت`;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPdf({
        id: `pdf-pm-${Date.now()}`,
        title: effectiveTitle || `فایل فرم PM ${stationName}`,
        fileName: file.name,
        uploadDate: performedDate.trim() || new Intl.DateTimeFormat('fa-IR').format(new Date()),
        fileSize: sizeStr,
        dataUrl: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setTitle('');
    setTechnicianName('');
    setPerformedDate(new Intl.DateTimeFormat('fa-IR').format(new Date()));
    setNextDueDate('');
    setEquipmentScope('');
    setStatus('completed');
    setNotes('');
    setUploadedPdf(undefined);
    setFileError(null);
  };

  const submitForm = (openQrImmediately: boolean) => {
    const finalTitle = title.trim() || uploadedPdf?.fileName.replace(/\.pdf$/i, '') || '';
    const finalTechnician = technicianName.trim() || (uploadedPdf ? 'ثبت‌نشده' : '');
    if (!finalTitle || !finalTechnician) return;

    const created = onAddForm({
      title: finalTitle,
      technicianName: finalTechnician,
      performedDate: performedDate.trim() || new Intl.DateTimeFormat('fa-IR').format(new Date()),
      nextDueDate: nextDueDate.trim() || undefined,
      equipmentScope: equipmentScope.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
      pdfFile: uploadedPdf
    });

    resetForm();
    setIsAdding(false);

    if (created) {
      setLastCreatedForm(created);
      if (openQrImmediately) {
        onOpenQr(created);
      }
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm(false);
  };

  const renderFormCard = (form: PmForm, isLatest: boolean) => {
    const isConfirmingDelete = pendingDeleteId === form.id;
    const isShared = sharedItemId === form.id;

    return (
      <div
        key={form.id}
        className={`bg-white rounded-xl p-5 transition-all flex flex-col justify-between space-y-4 ${
          isLatest
            ? 'border-2 border-blue-500 shadow-xs'
            : 'border border-blue-100 shadow-xs hover:border-blue-300'
        }`}
      >
        <div className="space-y-3">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isLatest ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'
              }`}>
                <ClipboardCheck className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-0.5">
                  {isLatest && (
                    <>
                      <span className="font-bold text-blue-700">آخرین فرم PM ثبت‌شده</span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span className="font-mono font-tabular">{form.id}</span>
                  <span aria-hidden="true">·</span>
                  <span className={`inline-flex items-center gap-1 font-semibold ${
                    form.status === 'completed' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {form.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span>{form.status === 'completed' ? 'تکمیل‌شده' : 'نیاز به پیگیری'}</span>
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {form.title}
                </h3>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="flex items-center gap-1 shrink-0">
                {!isConfirmingDelete ? (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(form.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="حذف فرم PM"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteForm(form.id);
                        setPendingDeleteId(null);
                      }}
                      className="px-2 py-1 bg-rose-600 text-white font-bold rounded-md hover:bg-rose-500"
                    >
                      حذف
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(null)}
                      className="px-2 py-1 bg-slate-100 text-slate-600 font-medium rounded-md hover:bg-slate-200"
                    >
                      لغو
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clean unboxed metadata row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>تاریخ انجام:</span>
              <strong className="font-tabular text-slate-900">{form.performedDate}</strong>
            </span>

            <span className="inline-flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>مجری:</span>
              <strong className="text-slate-900">{form.technicianName}</strong>
            </span>

            {form.nextDueDate && (
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span>سرویس بعدی:</span>
                <strong className="font-tabular text-slate-800">{form.nextDueDate}</strong>
              </span>
            )}
          </div>

          {form.equipmentScope && (
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">محدوده بازدید: </span>
              {form.equipmentScope}
            </p>
          )}

          {form.notes && (
            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed">
              {form.notes}
            </p>
          )}
          {form.pdfFile?.driveFileId && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-2.5 py-1.5">
              <span className="inline-flex items-center gap-1 font-semibold">
                <FolderSync className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  همگام با درایو ({getFileKindLabel(form.pdfFile.mimeType, form.pdfFile.fileName)})
                </span>
              </span>
              {form.pdfFile.lastSyncedAt && (
                <span className="font-tabular text-emerald-700">
                  {form.pdfFile.lastSyncedAt}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenForm(form)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-2xs transition-colors whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>
              {form.pdfFile?.driveFileId
                ? `مشاهده فایل ${getFileKindLabel(form.pdfFile.mimeType, form.pdfFile.fileName)} فرم`
                : form.pdfFile?.dataUrl
                  ? 'مشاهده فایل PDF فرم'
                  : 'مشاهده جزئیات و چاپ فرم'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQr(form)}
            title="مشاهده و چاپ بارکد QR فرم PM"
            className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors shrink-0 whitespace-nowrap"
          >
            <QrCode className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">کد QR</span>
          </button>

          <button
            type="button"
            onClick={() => handleShareForm(form)}
            title="اشتراک‌گذاری لینک فرم PM"
            className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shrink-0 whitespace-nowrap"
          >
            {isShared ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{isShared ? 'کپی شد' : 'اشتراک‌گذاری'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            <span>آخرین فرم PM و سوابق سرویس {stationName}</span>
          </h2>
          <p className="text-xs text-slate-500">
            ثبت، پیگیری، اشتراک‌گذاری و بایگانی فایل PDF فرم‌های نگهداری پیشگیرانه (Preventive Maintenance) ایستگاه
          </p>
        </div>

        {canAdd && (
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'بستن فرم ثبت' : 'افزودن فرم PM جدید'}</span>
          </button>
        )}
      </div>

      {/* Immediate Post-Upload QR & Share Banner */}
      {lastCreatedForm && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-950 font-bold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              «{lastCreatedForm.title}» با موفقیت بارگذاری و ثبت شد. همین حالا تبدیل به QR Code کنید یا به اشتراک بگذارید:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenQr(lastCreatedForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>تبدیل به QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => handleShareForm(lastCreatedForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              {sharedItemId === lastCreatedForm.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>{sharedItemId === lastCreatedForm.id ? 'لینک کپی شد!' : 'اشتراک‌گذاری'}</span>
            </button>

            <button
              type="button"
              onClick={() => setLastCreatedForm(null)}
              className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
              aria-label="بستن اعلان"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Inline Add PM Form */}
      {canAdd && isAdding && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-white border-2 border-blue-500 rounded-xl p-5 shadow-xs space-y-4 text-xs"
        >
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>ثبت فرم PM جدید در {stationName}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                عنوان فرم PM: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: فرم PM دوره‌ای زمستان ۱۴۰۳"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                نام کارشناس / مجری سرویس: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: مهندس رضایی"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                تاریخ انجام PM:
              </label>
              <input
                type="text"
                placeholder="۱۴۰۳/۰۸/۲۰"
                value={performedDate}
                onChange={(e) => setPerformedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-tabular text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                تاریخ سرویس بعدی (اختیاری):
              </label>
              <input
                type="text"
                placeholder="مثال: ۱۴۰۳/۱۱/۲۰"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-tabular text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                تجهیزات بررسی‌شده (اختیاری):
              </label>
              <input
                type="text"
                placeholder="مثال: تابلوهای AC/DC، ژنراتور، مخزن سوخت، سیستم ارت"
                value={equipmentScope}
                onChange={(e) => setEquipmentScope(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                وضعیت فرم PM:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PmFormStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="completed">تکمیل‌شده (سرویس بدون ایراد)</option>
                <option value="needs_followup">نیاز به پیگیری / رفع نقص</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              شرح اقدامات انجام‌شده و گزارش فنی:
            </label>
            <textarea
              rows={3}
              placeholder="موارد بررسی‌شده، مقادیر اندازه‌گیری، تعویض قطعات یا موارد نیازمند پیگیری را بنویسید..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              پیوست فایل فرم PM (PDF از دستگاه یا فایل Word / Excel / PDF از Google Drive):
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                className="flex-1 min-w-[180px] text-xs text-slate-500 file:mr-0 file:ml-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />
              {onOpenDrivePicker && (
                <button
                  type="button"
                  onClick={onOpenDrivePicker}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <FolderSync className="w-3.5 h-3.5" />
                  <span>انتخاب از Google Drive</span>
                </button>
              )}
            </div>
            {fileError && (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fileError}</span>
              </p>
            )}
            {uploadedPdf && (
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                ✓ فایل بارگذاری شد: {uploadedPdf.fileName} ({uploadedPdf.fileSize})
                {uploadedPdf.driveFileId ? ' · متصل به Google Drive' : ''}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsAdding(false);
              }}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              انصراف
            </button>
            {uploadedPdf && (
              <button
                type="button"
                onClick={() => submitForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>ثبت و تبدیل فوری به QR Code</span>
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs whitespace-nowrap"
            >
              ثبت فرم PM در سامانه
            </button>
          </div>
        </form>
      )}

      {/* Empty State or Populated Forms */}
      {pmForms.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
          <p className="text-xs text-slate-500">
            هنوز هیچ فرم PM برای ایستگاه {stationName} ثبت نشده است.
          </p>
          {canAdd && !isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت اولین فرم PM</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Latest PM Form */}
          {latestForm && renderFormCard(latestForm, true)}

          {/* Previous PM Archive */}
          {previousForms.length > 0 && (
            <div className="space-y-3 pt-1">
              <h3 className="text-xs font-bold text-slate-600">
                سابقه فرم‌های PM قبلی ({previousForms.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {previousForms.map((form) => renderFormCard(form, false))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
