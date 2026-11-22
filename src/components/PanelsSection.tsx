import React, { useState, useEffect } from 'react';
import {
  Zap,
  FileText,
  QrCode,
  Plus,
  Trash2,
  Share2,
  Check,
  AlertCircle,
  X,
  FolderSync
} from 'lucide-react';
import { ElectricalPanel, UserRole, PanelPdf } from '../types';
import { getEquipmentQrUrl } from '../utils/storage';
import { shareUrl } from '../utils/qrHelper';
import { getFileKindLabel } from '../utils/googleDrive';

interface PanelsSectionProps {
  panels: ElectricalPanel[];
  stationId: string;
  stationName: string;
  countyName: string;
  currentRole: UserRole;
  onOpenDiagram: (panel: ElectricalPanel) => void;
  onOpenQr: (panel: ElectricalPanel) => void;
  onAddPanel: (name: string, pdf?: PanelPdf) => ElectricalPanel | void;
  onDeletePanel: (panelId: string) => void;
  onOpenDrivePicker?: () => void;
  drivePickedPdf?: PanelPdf | null;
  onConsumeDrivePickedPdf?: () => void;
}

export const PanelsSection: React.FC<PanelsSectionProps> = ({
  panels,
  stationId,
  stationName,
  countyName,
  currentRole,
  onOpenDiagram,
  onOpenQr,
  onAddPanel,
  onDeletePanel,
  onOpenDrivePicker,
  drivePickedPdf,
  onConsumeDrivePickedPdf
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newPanelName, setNewPanelName] = useState('');
  const [newPdfTitle, setNewPdfTitle] = useState('');
  const [uploadedPdf, setUploadedPdf] = useState<PanelPdf | undefined>(undefined);
  const [fileError, setFileError] = useState<string | null>(null);
  const [lastCreatedPanel, setLastCreatedPanel] = useState<ElectricalPanel | null>(null);
  const [sharedItemId, setSharedItemId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const isSuperAdmin = currentRole === 'super_admin';

  useEffect(() => {
    setLastCreatedPanel(null);
    setPendingDeleteId(null);
  }, [stationId]);

  useEffect(() => {
    if (drivePickedPdf) {
      setIsAdding(true);
      setUploadedPdf(drivePickedPdf);
      if (!newPanelName.trim()) {
        setNewPanelName(drivePickedPdf.title || drivePickedPdf.fileName.replace(/\.(pdf|docx?|xlsx?|csv)$/i, ''));
      }
      onConsumeDrivePickedPdf?.();
    }
  }, [drivePickedPdf, newPanelName, onConsumeDrivePickedPdf]);

  const handleSharePanel = async (panel: ElectricalPanel) => {
    const url = getEquipmentQrUrl(stationId, 'panel', panel.id);
    const result = await shareUrl(
      url,
      `${panel.name} - ${stationName}`,
      `نقشه دیاگرام تک‌خطی ${panel.name} (${stationName} - ${countyName}):`
    );
    if (result === 'shared' || result === 'copied') {
      setSharedItemId(panel.id);
      setTimeout(() => setSharedItemId((prev) => (prev === panel.id ? null : prev)), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) {
      setFileError('لطفاً فقط فایل PDF انتخاب نمایید.');
      e.target.value = '';
      return;
    }

    const effectiveName = newPanelName.trim() || file.name.replace(/\.pdf$/i, '');
    if (!newPanelName.trim()) {
      setNewPanelName(effectiveName);
    }

    const title = newPdfTitle.trim() || `دیاگرام تک‌خطی ${effectiveName}`;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = Number(sizeMb) >= 1
      ? `${sizeMb} مگابایت`
      : `${Math.max(1, Math.round(file.size / 1024))} کیلوبایت`;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPdf({
        id: `pdf-${Date.now()}`,
        title,
        fileName: file.name,
        uploadDate: new Intl.DateTimeFormat('fa-IR').format(new Date()),
        fileSize: sizeStr,
        dataUrl: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const submitPanel = (openQrImmediately: boolean) => {
    const finalName = newPanelName.trim() || uploadedPdf?.fileName.replace(/\.pdf$/i, '') || '';
    if (!finalName) return;

    const created = onAddPanel(finalName, uploadedPdf);
    setNewPanelName('');
    setNewPdfTitle('');
    setUploadedPdf(undefined);
    setFileError(null);
    setIsAdding(false);

    if (created) {
      setLastCreatedPanel(created);
      if (openQrImmediately) {
        onOpenQr(created);
      }
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPanel(false);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Banner of Panels */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <span>تابلوهای برق {stationName}</span>
          </h2>
          <p className="text-xs text-slate-500">
            مشاهده دیاگرام تک‌خطی، نقشه‌های کابل‌کشی، اشتراک‌گذاری و اسکن کدهای QR
          </p>
        </div>

        {/* Add Panel Button (Only for Super Admin / من) */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'بستن فرم ثبت' : 'افزودن تابلو برق'}</span>
          </button>
        )}
      </div>

      {/* Immediate Post-Upload QR & Share Banner */}
      {lastCreatedPanel && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-950 font-bold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              «{lastCreatedPanel.name}» با موفقیت ثبت شد. می‌توانید همین حالا کد QR بسازید یا آن را به اشتراک بگذارید:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenQr(lastCreatedPanel)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>تبدیل به QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => handleSharePanel(lastCreatedPanel)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              {sharedItemId === lastCreatedPanel.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>{sharedItemId === lastCreatedPanel.id ? 'لینک کپی شد!' : 'اشتراک‌گذاری'}</span>
            </button>

            <button
              type="button"
              onClick={() => setLastCreatedPanel(null)}
              className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
              aria-label="بستن اعلان"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Inline Add Panel Form */}
      {isSuperAdmin && isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-white border-2 border-blue-500 rounded-xl p-5 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>ثبت تابلو برق جدید در {stationName}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                نام یا شماره تابلو (مثلاً AC-1 یا تابلو ۴۸ شماره یک): <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: تابلو برق AC-2"
                value={newPanelName}
                onChange={(e) => setNewPanelName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                بارگذاری فایل نقشه (PDF از دستگاه یا فایل از Google Drive):
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
                  ✓ فایل آماده ثبت شد: {uploadedPdf.fileName} ({uploadedPdf.fileSize})
                  {uploadedPdf.driveFileId ? ' · متصل به Google Drive' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setFileError(null);
              }}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              انصراف
            </button>
            {uploadedPdf && newPanelName.trim() && (
              <button
                type="button"
                onClick={() => submitPanel(true)}
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
              ثبت تابلو و صدور QR کد
            </button>
          </div>
        </form>
      )}

      {/* Panels Cards Grid */}
      {panels.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
          هیچ تابلو برقی در این ایستگاه ثبت نشده است.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {panels.map((panel) => {
            const isConfirmingDelete = pendingDeleteId === panel.id;
            const isShared = sharedItemId === panel.id;

            return (
              <div
                key={panel.id}
                className="bg-white rounded-xl border border-blue-100 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {panel.name}
                      </h3>
                    </div>

                    {isSuperAdmin && (
                      <div className="shrink-0">
                        {!isConfirmingDelete ? (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(panel.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="حذف تابلو"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px]">
                            <button
                              type="button"
                              onClick={() => {
                                onDeletePanel(panel.id);
                                setPendingDeleteId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 text-white font-bold rounded hover:bg-rose-500"
                            >
                              حذف
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                            >
                              لغو
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] text-slate-600 flex items-center justify-between gap-2">
                    <span className="font-mono text-slate-500">شناسه: {panel.id}</span>
                    <span className={`font-semibold ${panel.pdfFile?.driveFileId ? 'text-emerald-700' : 'text-blue-700'}`}>
                      {panel.pdfFile?.driveFileId
                        ? `همگام با درایو (${getFileKindLabel(panel.pdfFile.mimeType, panel.pdfFile.fileName)})`
                        : panel.pdfFile?.dataUrl
                          ? 'دارای فایل PDF'
                          : panel.pdfFile
                            ? 'دارای نقشه پیش‌فرض'
                            : 'نقشه پیش‌فرض'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenDiagram(panel)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-2xs transition-colors whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>دیاگرام تک‌خطی</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenQr(panel)}
                    title="تبدیل به QR Code و چاپ"
                    className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors shrink-0 whitespace-nowrap"
                  >
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span className="hidden lg:inline">کد QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSharePanel(panel)}
                    title="اشتراک‌گذاری لینک نقشه تابلو"
                    className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shrink-0 whitespace-nowrap"
                  >
                    {isShared ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    <span className="hidden xl:inline">{isShared ? 'کپی شد' : 'اشتراک'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
