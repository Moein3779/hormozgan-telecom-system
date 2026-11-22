import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Check,
  AlertCircle,
  Link2,
  Unlink,
  LogOut,
  ChevronLeft,
  ExternalLink,
  Clock,
  FolderSync
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  DriveFileItem,
  DriveFolderTarget,
  PanelPdf,
  Station,
  UserRole
} from '../types';
import {
  DriveAuthError,
  downloadDriveFileAsPanelPdf,
  formatBytesFa,
  formatDriveDateFa,
  getFileKind,
  getFileKindLabel,
  listDriveItems
} from '../utils/googleDrive';
import { GoogleSignInButton } from './GoogleSignInButton';

export type DrivePickerTarget =
  | { kind: 'update-panel'; panelId: string; label: string }
  | { kind: 'new-panel'; label: string }
  | { kind: 'update-pm'; formId: string; label: string }
  | { kind: 'new-pm'; label: string }
  | null;

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  accessToken: string | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onAuthExpired: () => void;
  station: Station;
  currentRole: UserRole;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  isSyncing: boolean;
  lastSyncMessage: string | null;
  onSyncNow: () => Promise<void>;
  pickerTarget: DrivePickerTarget;
  onPickFileForTarget: (pdf: PanelPdf, file: DriveFileItem) => void;
  onImportAsPanel: (pdf: PanelPdf) => void;
  onImportAsPmForm: (pdf: PanelPdf) => void;
  onLinkWatchFolder: (folderId: string | undefined, folderName: string | undefined, target: DriveFolderTarget) => void;
}

interface FolderCrumb {
  id: string;
  name: string;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  accessToken,
  needsAuth,
  isLoggingIn,
  onSignIn,
  onSignOut,
  onAuthExpired,
  station,
  currentRole,
  autoSyncEnabled,
  onToggleAutoSync,
  isSyncing,
  lastSyncMessage,
  onSyncNow,
  pickerTarget,
  onPickFileForTarget,
  onImportAsPanel,
  onImportAsPmForm,
  onLinkWatchFolder
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'sync'>('browse');
  const [breadcrumbs, setBreadcrumbs] = useState<FolderCrumb[]>([{ id: 'root', name: 'درایو من (My Drive)' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<'all' | 'pdf' | 'word' | 'excel'>('all');
  const [items, setItems] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];
  const isSuperAdmin = currentRole === 'super_admin';
  const canModifyEquipment = currentRole === 'super_admin' || currentRole === 'technician';

  const loadFolderContents = useCallback(async () => {
    if (!accessToken || !isOpen) return;
    setIsLoadingFiles(true);
    setErrorMsg(null);
    try {
      const files = await listDriveItems(accessToken, {
        folderId: currentFolder.id,
        searchQuery,
        filterKind
      });
      setItems(files);
    } catch (err) {
      if (err instanceof DriveAuthError) {
        onAuthExpired();
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'خطا در بارگذاری فایل‌های Google Drive');
      }
    } finally {
      setIsLoadingFiles(false);
    }
  }, [accessToken, isOpen, currentFolder.id, searchQuery, filterKind, onAuthExpired]);

  useEffect(() => {
    if (isOpen && pickerTarget) {
      setActiveTab('browse');
    }
  }, [isOpen, pickerTarget]);

  useEffect(() => {
    if (isOpen && accessToken && activeTab === 'browse') {
      loadFolderContents();
    }
  }, [isOpen, accessToken, activeTab, loadFolderContents]);

  if (!isOpen) return null;

  const handleOpenFolder = (folder: DriveFileItem) => {
    setSearchQuery('');
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setSearchQuery('');
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const handleSelectFile = async (
    file: DriveFileItem,
    mode: 'target' | 'panel' | 'pm'
  ) => {
    if (!accessToken) {
      onAuthExpired();
      return;
    }
    setBusyFileId(file.id);
    setErrorMsg(null);
    setFeedbackMsg(null);

    try {
      const pdf = await downloadDriveFileAsPanelPdf(accessToken, file);
      if (mode === 'target' && pickerTarget) {
        onPickFileForTarget(pdf, file);
        onClose();
      } else if (mode === 'panel') {
        onImportAsPanel(pdf);
        setFeedbackMsg(`«${file.name}» به عنوان نقشه تابلو برق در ${station.name} متصل و ثبت شد.`);
      } else if (mode === 'pm') {
        onImportAsPmForm(pdf);
        setFeedbackMsg(`«${file.name}» در بخش آخرین فرم PM ایستگاه ${station.name} متصل و ثبت شد.`);
      }
    } catch (err) {
      if (err instanceof DriveAuthError) {
        onAuthExpired();
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'خطا در دریافت فایل از Google Drive');
      }
    } finally {
      setBusyFileId(null);
    }
  };

  const linkedPanels = station.panels.filter((p) => p.pdfFile?.driveFileId);
  const linkedPmForms = (station.pmForms || []).filter((f) => f.pdfFile?.driveFileId);

  const renderFileIcon = (file: DriveFileItem) => {
    const kind = getFileKind(file.mimeType, file.name);
    if (kind === 'folder') return <FolderOpen className="w-5 h-5 text-amber-500 shrink-0" />;
    if (kind === 'excel') return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
    if (kind === 'word') return <FileText className="w-5 h-5 text-blue-600 shrink-0" />;
    return <FileText className="w-5 h-5 text-rose-600 shrink-0" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <FolderSync className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {pickerTarget
                  ? `انتخاب فایل از Google Drive برای: ${pickerTarget.label}`
                  : 'اتصال و همگام‌سازی خودکار Google Drive'}
              </h3>
              <p className="text-[11px] text-blue-100 truncate">
                {user?.email && accessToken
                  ? `متصل به حساب: ${user.email}`
                  : 'پشتیبانی از فایل‌های PDF، Word، Excel، Google Docs و Google Sheets'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {accessToken && (
              <button
                type="button"
                onClick={onSignOut}
                title="خروج از حساب گوگل"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">قطع اتصال</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-blue-700 transition-colors"
              aria-label="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Auth Gate when not signed in or token expired */}
        {!accessToken || needsAuth ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-5 bg-slate-50">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <FolderSync className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h4 className="text-base font-bold text-slate-900">
                اتصال سامانه به Google Drive شخصی شما
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                با ورود به حساب گوگل خود، سامانه می‌تواند پوشه‌ها و فایل‌های PDF، Word و Excel تجهیزات را از Google Drive بخواند و هر زمان فایل جدیدی جایگزین کردید، نسخه سامانه را به‌صورت خودکار به‌روزرسانی کند.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <GoogleSignInButton
              onClick={async () => {
                setErrorMsg(null);
                try {
                  await onSignIn();
                } catch (err) {
                  setErrorMsg(
                    err instanceof Error
                      ? err.message
                      : 'ورود با حساب گوگل انجام نشد. لطفاً مجدداً تلاش کنید.'
                  );
                }
              }}
              disabled={isLoggingIn}
              label={isLoggingIn ? 'در حال اتصال به گوگل...' : 'ورود با حساب گوگل (Google Drive)'}
            />
          </div>
        ) : (
          <>
            {/* Navigation Tabs inside Drive Modal */}
            {!pickerTarget && (
              <div className="px-5 pt-3 pb-2 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('browse')}
                    className={`px-3.5 py-1.5 rounded-md transition-all whitespace-nowrap ${
                      activeTab === 'browse'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    مرور فایل‌های درایو
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sync')}
                    className={`px-3.5 py-1.5 rounded-md transition-all whitespace-nowrap ${
                      activeTab === 'sync'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    تنظیمات همگام‌سازی خودکار ({linkedPanels.length + linkedPmForms.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onSyncNow}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'در حال بررسی تغییرات...' : 'همگام‌سازی فوری الان'}</span>
                </button>
              </div>
            )}

            {/* Alerts */}
            {(errorMsg || feedbackMsg || lastSyncMessage) && (
              <div className="px-5 pt-3 space-y-2 shrink-0">
                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                {feedbackMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-2 rounded-lg text-xs flex items-center gap-2 font-semibold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{feedbackMsg}</span>
                  </div>
                )}
                {lastSyncMessage && !feedbackMsg && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-900 px-3.5 py-2 rounded-lg text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{lastSyncMessage}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tab 1: Drive File Browser */}
            {activeTab === 'browse' && (
              <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-5 space-y-3">
                {/* Search + Type Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="جستجو در نام فایل‌های Google Drive..."
                      className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-bold shrink-0 overflow-x-auto">
                    {(
                      [
                        { id: 'all', label: 'همه' },
                        { id: 'pdf', label: 'PDF' },
                        { id: 'word', label: 'Word' },
                        { id: 'excel', label: 'Excel' }
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilterKind(f.id)}
                        className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                          filterKind === f.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Breadcrumbs & Watch Folder Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs shrink-0">
                  <div className="flex flex-wrap items-center gap-1 text-slate-600">
                    {breadcrumbs.map((crumb, idx) => (
                      <React.Fragment key={crumb.id}>
                        {idx > 0 && <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />}
                        <button
                          type="button"
                          onClick={() => handleBreadcrumbClick(idx)}
                          className={`hover:text-blue-700 transition-colors ${
                            idx === breadcrumbs.length - 1 ? 'font-bold text-slate-900' : ''
                          }`}
                        >
                          {crumb.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {!pickerTarget && isSuperAdmin && currentFolder.id !== 'root' && (
                      <button
                        type="button"
                        onClick={() => {
                          onLinkWatchFolder(
                            currentFolder.id,
                            currentFolder.name,
                            station.driveFolderTarget || 'auto'
                          );
                          setFeedbackMsg(
                            `پوشه «${currentFolder.name}» برای همگام‌سازی خودکار به ایستگاه «${station.name}» متصل شد.`
                          );
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md whitespace-nowrap"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>
                          {station.driveFolderId === currentFolder.id
                            ? 'متصل به این ایستگاه'
                            : `اتصال خودکار این پوشه به ${station.name}`}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={loadFolderContents}
                      disabled={isLoadingFiles}
                      className="p-1 text-slate-500 hover:text-blue-600 rounded"
                      title="به‌روزرسانی لیست"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Files & Folders List */}
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                  {isLoadingFiles ? (
                    <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                      <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
                      <p>در حال دریافت فایل‌ها از Google Drive...</p>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      هیچ فایل PDF، Word، Excel یا پوشه‌ای در این مسیر یافت نشد.
                    </div>
                  ) : (
                    items.map((item) => {
                      const kind = getFileKind(item.mimeType, item.name);
                      const isFolder = kind === 'folder';
                      const isBusy = busyFileId === item.id;

                      return (
                        <div
                          key={item.id}
                          className="p-3 sm:px-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {renderFileIcon(item)}
                            <div className="min-w-0">
                              {isFolder ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenFolder(item)}
                                  className="text-xs sm:text-sm font-bold text-slate-900 hover:text-blue-700 truncate block text-right"
                                >
                                  {item.name}
                                </button>
                              ) : (
                                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                  {item.name}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span>{getFileKindLabel(item.mimeType, item.name)}</span>
                                {!isFolder && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-tabular">{formatBytesFa(item.size)}</span>
                                  </>
                                )}
                                {item.modifiedTime && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-tabular">
                                      آخرین تغییر: {formatDriveDateFa(item.modifiedTime)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {isFolder ? (
                              <button
                                type="button"
                                onClick={() => handleOpenFolder(item)}
                                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
                              >
                                باز کردن پوشه
                              </button>
                            ) : pickerTarget ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleSelectFile(item, 'target')}
                                className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
                              >
                                {isBusy ? 'در حال دریافت...' : 'انتخاب و اتصال فایل'}
                              </button>
                            ) : (
                              <>
                                {isSuperAdmin && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleSelectFile(item, 'panel')}
                                    className="px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
                                  >
                                    {isBusy ? 'دریافت...' : 'افزودن به تابلو برق'}
                                  </button>
                                )}
                                {canModifyEquipment && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleSelectFile(item, 'pm')}
                                    className="px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
                                  >
                                    ثبت در فرم PM
                                  </button>
                                )}
                                {item.webViewLink && (
                                  <a
                                    href={item.webViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="مشاهده در Google Drive"
                                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg border border-slate-200 bg-white"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Auto-Sync Settings & Linked Equipment */}
            {activeTab === 'sync' && !pickerTarget && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
                {/* Auto Sync Switch */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">
                      همگام‌سازی خودکار و زنده با Google Drive
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      هر ۳۰ ثانیه و هنگام بازگشت به صفحه، تاریخ تغییر فایل‌های متصل‌شده و پوشه دیده‌بان در Google Drive بررسی می‌شود و فایل‌های به‌روزرسانی‌شده به‌صورت خودکار جایگزین می‌شوند.
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer bg-white border border-blue-200 px-3.5 py-2 rounded-lg font-bold text-slate-800 shrink-0">
                    <input
                      type="checkbox"
                      checked={autoSyncEnabled}
                      onChange={(e) => onToggleAutoSync(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span>{autoSyncEnabled ? 'همگام‌سازی خودکار فعال' : 'همگام‌سازی خودکار خاموش'}</span>
                  </label>
                </div>

                {/* Station Watched Folder */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-slate-900 text-sm">
                      پوشه همگام‌سازی خودکار ایستگاه «{station.name}»
                    </h4>
                    {station.driveFolderId && isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => onLinkWatchFolder(undefined, undefined, 'auto')}
                        className="flex items-center gap-1 text-rose-600 hover:underline font-semibold"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>لغو اتصال پوشه</span>
                      </button>
                    )}
                  </div>

                  {station.driveFolderId ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-lg">
                        <div>
                          <span className="text-slate-500 block">پوشه متصل‌شده در Google Drive:</span>
                          <strong className="text-slate-900 text-sm">{station.driveFolderName || station.driveFolderId}</strong>
                        </div>
                        {station.driveLastSyncTime && (
                          <span className="text-[11px] text-slate-500 font-tabular">
                            آخرین بررسی: {station.driveLastSyncTime}
                          </span>
                        )}
                      </div>

                      {isSuperAdmin && (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-slate-600 font-semibold">
                            فایل‌های جدید اضافه‌شده به این پوشه کجا ثبت شوند؟
                          </span>
                          <select
                            value={station.driveFolderTarget || 'auto'}
                            onChange={(e) =>
                              onLinkWatchFolder(
                                station.driveFolderId,
                                station.driveFolderName,
                                e.target.value as DriveFolderTarget
                              )
                            }
                            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                          >
                            <option value="auto">تشخیص خودکار (بر اساس نام فایل: PM یا تابلو برق)</option>
                            <option value="panels">همه فایل‌ها به تابلوهای برق</option>
                            <option value="pm">همه فایل‌ها به آخرین فرم PM</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 leading-relaxed">
                      هنوز پوشه‌ای برای این ایستگاه انتخاب نشده است. از تب «مرور فایل‌های درایو» وارد پوشه مورد نظر خود شوید و دکمه «اتصال خودکار این پوشه» را بزنید تا هر فایل PDF، Word یا Excel که در آن پوشه بگذارید به‌صورت خودکار وارد سامانه شود.
                    </p>
                  )}
                </div>

                {/* Linked Files List */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                    اسناد متصل به Google Drive در {station.name}
                  </h4>

                  {linkedPanels.length === 0 && linkedPmForms.length === 0 ? (
                    <p className="text-slate-500">
                      هنوز هیچ تابلو برق یا فرم PM به فایل Google Drive متصل نشده است.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {linkedPanels.map((p) => (
                        <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              تابلو برق: {p.name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              فایل: {p.pdfFile?.fileName} · همگام‌سازی: {p.pdfFile?.lastSyncedAt || p.pdfFile?.uploadDate}
                            </p>
                          </div>
                          {p.pdfFile?.driveWebViewLink && (
                            <a
                              href={p.pdfFile.driveWebViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 hover:underline flex items-center gap-1 shrink-0"
                            >
                              <span>درایو</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))}

                      {linkedPmForms.map((f) => (
                        <div key={f.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              فرم PM: {f.title}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              فایل: {f.pdfFile?.fileName} · همگام‌سازی: {f.pdfFile?.lastSyncedAt || f.pdfFile?.uploadDate}
                            </p>
                          </div>
                          {f.pdfFile?.driveWebViewLink && (
                            <a
                              href={f.pdfFile.driveWebViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 hover:underline flex items-center gap-1 shrink-0"
                            >
                              <span>درایو</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
