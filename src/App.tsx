import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  loadStations,
  saveStations,
  loadUserRole,
  saveUserRole,
  COUNTIES,
  PROVINCE_NAME
} from './utils/storage';
import {
  Station,
  CountyId,
  UserRole,
  ElectricalPanel,
  FuelTank,
  TankShape,
  PanelPdf,
  PmForm,
  DriveFileItem,
  DriveFolderTarget
} from './types';
import { getTankShape } from './utils/tankFormulas';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  clearAccessToken
} from './utils/googleAuth';
import {
  DriveAuthError,
  classifyDriveFilename,
  downloadDriveFileAsPanelPdf,
  getDriveFileMetadata,
  listDriveItems
} from './utils/googleDrive';
import { Header } from './components/Header';
import { CountyStationSelector } from './components/CountyStationSelector';
import { PanelsSection } from './components/PanelsSection';
import { TanksSection } from './components/TanksSection';
import { PmFormsSection } from './components/PmFormsSection';
import { SingleLineDiagramModal } from './components/SingleLineDiagramModal';
import { TankDipModal } from './components/TankDipModal';
import { PmFormModal } from './components/PmFormModal';
import { QRCodeModal } from './components/QRCodeModal';
import { ShareSiteModal } from './components/ShareSiteModal';
import { GoogleDriveSyncModal, DrivePickerTarget } from './components/GoogleDriveSyncModal';
import { Zap, Fuel, ClipboardCheck, FolderSync, RefreshCw, X } from 'lucide-react';

const AUTOSYNC_PREF_KEY = 'hormozgan_drive_autosync';

export default function App() {
  const [stations, setStations] = useState<Station[]>(() => loadStations());
  const [currentRole, setCurrentRole] = useState<UserRole>(() => loadUserRole());

  const [selectedCountyId, setSelectedCountyId] = useState<CountyId>('bandar_abbas');
  const [selectedStationId, setSelectedStationId] = useState<string>('imam-ali');
  const [activeTab, setActiveTab] = useState<'panels' | 'tanks' | 'pm'>('panels');
  const [activeTankShape, setActiveTankShape] = useState<TankShape>('rectangular');

  // Modals
  const [activeDiagramPanel, setActiveDiagramPanel] = useState<ElectricalPanel | null>(null);
  const [activeDipTank, setActiveDipTank] = useState<FuelTank | null>(null);
  const [activePmForm, setActivePmForm] = useState<PmForm | null>(null);
  const [activeQrData, setActiveQrData] = useState<{
    stationId: string;
    stationName: string;
    countyName: string;
    equipmentType: 'panel' | 'tank' | 'pm';
    equipmentId: string;
    equipmentName: string;
  } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Google Drive Auth & Sync State (token kept strictly in memory via googleAuth.ts)
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);
  const [needsDriveAuth, setNeedsDriveAuth] = useState(false);
  const [isDriveLoggingIn, setIsDriveLoggingIn] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [drivePickerTarget, setDrivePickerTarget] = useState<DrivePickerTarget>(null);
  const [drivePickedPdfForPanel, setDrivePickedPdfForPanel] = useState<PanelPdf | null>(null);
  const [drivePickedPdfForPm, setDrivePickedPdfForPm] = useState<PanelPdf | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(AUTOSYNC_PREF_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  const stationsRef = useRef<Station[]>(stations);
  stationsRef.current = stations;
  const isSyncingRef = useRef(false);
  const hasParsedUrlRef = useRef(false);

  // Check URL query parameters once on initial mount for persistent QR code scan links
  useEffect(() => {
    if (hasParsedUrlRef.current) return;
    hasParsedUrlRef.current = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const stationParam = params.get('station');
      const typeParam = params.get('type');
      const idParam = params.get('id');

      if (stationParam) {
        const foundStation = stations.find(s => s.id === stationParam);
        if (foundStation) {
          setSelectedCountyId(foundStation.countyId);
          setSelectedStationId(foundStation.id);

          if (typeParam === 'panel' && idParam) {
            const foundPanel = foundStation.panels.find(p => p.id === idParam);
            if (foundPanel) {
              setActiveTab('panels');
              setActiveDiagramPanel(foundPanel);
            }
          } else if (typeParam === 'tank' && idParam) {
            const foundTank = foundStation.tanks.find(t => t.id === idParam);
            if (foundTank) {
              setActiveTab('tanks');
              setActiveTankShape(getTankShape(foundTank));
              setActiveDipTank(foundTank);
            }
          } else if (typeParam === 'pm' && idParam) {
            const foundPm = (foundStation.pmForms || []).find(f => f.id === idParam);
            if (foundPm) {
              setActiveTab('pm');
              setActivePmForm(foundPm);
            }
          }
        }
      }
    } catch (e) {
      console.error('URL parse error:', e);
    }
  }, [stations]);

  // Persist stations to storage on change
  const handleUpdateStations = useCallback((updated: Station[]) => {
    setStations(updated);
    saveStations(updated);
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    saveUserRole(role);
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    try {
      localStorage.setItem(AUTOSYNC_PREF_KEY, String(enabled));
    } catch {
      // Ignore storage preference errors
    }
  };

  const handleAuthExpired = useCallback(() => {
    clearAccessToken();
    setDriveAccessToken(null);
    setNeedsDriveAuth(true);
  }, []);

  // Initialize Firebase Auth observer for Google Drive session
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setDriveUser(user);
        setDriveAccessToken(token);
        setNeedsDriveAuth(false);
      },
      (user) => {
        setDriveUser(user);
        setDriveAccessToken(null);
        setNeedsDriveAuth(Boolean(user));
      }
    );
    return () => unsubscribe();
  }, []);

  // Live Google Drive sync engine (linked files + watched folders)
  const syncDriveNow = useCallback(async (tokenOverride?: string) => {
    const token = tokenOverride || driveAccessToken;
    if (!token || isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsDriveSyncing(true);

    try {
      const currentList = stationsRef.current;
      let updatedCount = 0;
      let addedCount = 0;
      let anyStationMutated = false;

      const nowFa = new Intl.DateTimeFormat('fa-IR', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());

      const nextStations: Station[] = [];

      for (const station of currentList) {
        let stationChanged = false;
        const updatedPanels: ElectricalPanel[] = [];
        const updatedPmForms: PmForm[] = [];

        // 1. Check all Drive-linked electrical panels
        for (const panel of station.panels) {
          if (panel.pdfFile?.driveFileId) {
            const meta = await getDriveFileMetadata(token, panel.pdfFile.driveFileId);
            const needsDownload =
              meta &&
              ((meta.modifiedTime && meta.modifiedTime !== panel.pdfFile.driveModifiedTime) ||
                !panel.pdfFile.dataUrl);
            if (meta && needsDownload) {
              const refreshedPdf = await downloadDriveFileAsPanelPdf(
                token,
                meta,
                panel.pdfFile.title
              );
              updatedPanels.push({ ...panel, pdfFile: refreshedPdf });
              updatedCount += 1;
              stationChanged = true;
              continue;
            }
          }
          updatedPanels.push(panel);
        }

        // 2. Check all Drive-linked PM forms
        for (const form of station.pmForms || []) {
          if (form.pdfFile?.driveFileId) {
            const meta = await getDriveFileMetadata(token, form.pdfFile.driveFileId);
            const needsDownload =
              meta &&
              ((meta.modifiedTime && meta.modifiedTime !== form.pdfFile.driveModifiedTime) ||
                !form.pdfFile.dataUrl);
            if (meta && needsDownload) {
              const refreshedPdf = await downloadDriveFileAsPanelPdf(
                token,
                meta,
                form.pdfFile.title
              );
              updatedPmForms.push({ ...form, pdfFile: refreshedPdf });
              updatedCount += 1;
              stationChanged = true;
              continue;
            }
          }
          updatedPmForms.push(form);
        }

        // 3. Check station's watched Google Drive folder for new or updated files
        let nextSyncTime = station.driveLastSyncTime;
        if (station.driveFolderId) {
          const folderFiles = await listDriveItems(token, {
            folderId: station.driveFolderId,
            filesOnly: true
          });
          nextSyncTime = nowFa;
          if (nextSyncTime !== station.driveLastSyncTime) {
            stationChanged = true;
          }

          const trackedPanelDriveIds = new Set(
            updatedPanels
              .map((p) => p.pdfFile?.driveFileId)
              .filter((id): id is string => Boolean(id))
          );
          const trackedPmDriveIds = new Set(
            updatedPmForms
              .map((f) => f.pdfFile?.driveFileId)
              .filter((id): id is string => Boolean(id))
          );

          for (const file of folderFiles) {
            if (trackedPanelDriveIds.has(file.id) || trackedPmDriveIds.has(file.id)) {
              continue;
            }

            const downloadedPdf = await downloadDriveFileAsPanelPdf(token, file);
            const target: 'panels' | 'pm' =
              station.driveFolderTarget === 'panels' || station.driveFolderTarget === 'pm'
                ? station.driveFolderTarget
                : classifyDriveFilename(file.name);

            if (target === 'panels') {
              const newPanel: ElectricalPanel = {
                id: `pnl-drv-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
                name: downloadedPdf.title,
                pdfFile: downloadedPdf
              };
              updatedPanels.push(newPanel);
            } else {
              const newForm: PmForm = {
                id: `pm-drv-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
                title: downloadedPdf.title,
                technicianName: 'همگام‌سازی Google Drive',
                performedDate: downloadedPdf.uploadDate,
                status: 'completed',
                pdfFile: downloadedPdf
              };
              updatedPmForms.unshift(newForm);
            }

            addedCount += 1;
            stationChanged = true;
          }
        }

        if (stationChanged) {
          anyStationMutated = true;
          nextStations.push({
            ...station,
            panels: updatedPanels,
            pmForms: updatedPmForms,
            driveLastSyncTime: nextSyncTime
          });
        } else {
          nextStations.push(station);
        }
      }

      if (anyStationMutated) {
        handleUpdateStations(nextStations);

        setActiveDiagramPanel((prev) => {
          if (!prev) return null;
          for (const st of nextStations) {
            const match = st.panels.find((p) => p.id === prev.id);
            if (match) return match;
          }
          return prev;
        });

        setActivePmForm((prev) => {
          if (!prev) return null;
          for (const st of nextStations) {
            const match = (st.pmForms || []).find((f) => f.id === prev.id);
            if (match) return match;
          }
          return prev;
        });
      }

      if (updatedCount > 0 || addedCount > 0) {
        const msg = `همگام‌سازی Google Drive انجام شد: ${updatedCount} سند به‌روزرسانی و ${addedCount} سند جدید اضافه شد.`;
        setLastSyncMessage(msg);
        setSyncNotification(msg);
      } else {
        setLastSyncMessage(`آخرین بررسی همگام‌سازی در ساعت ${nowFa} · همه فایل‌ها به‌روز هستند.`);
      }
    } catch (err) {
      if (err instanceof DriveAuthError) {
        handleAuthExpired();
        setLastSyncMessage(err.message);
      } else {
        setLastSyncMessage(
          err instanceof Error ? err.message : 'خطا در همگام‌سازی Google Drive'
        );
      }
    } finally {
      isSyncingRef.current = false;
      setIsDriveSyncing(false);
    }
  }, [driveAccessToken, handleAuthExpired, handleUpdateStations]);

  // Automatic polling (every 30s) & window focus sync while Google Drive is connected
  useEffect(() => {
    if (!driveAccessToken || !autoSyncEnabled || needsDriveAuth) return;

    syncDriveNow();

    const intervalId = window.setInterval(() => {
      syncDriveNow();
    }, 30000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        syncDriveNow();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [driveAccessToken, autoSyncEnabled, needsDriveAuth, syncDriveNow]);

  const handleDriveSignIn = async () => {
    setIsDriveLoggingIn(true);
    try {
      const { user, accessToken } = await googleSignIn();
      setDriveUser(user);
      setDriveAccessToken(accessToken);
      setNeedsDriveAuth(false);
      await syncDriveNow(accessToken);
    } finally {
      setIsDriveLoggingIn(false);
    }
  };

  const handleDriveSignOut = async () => {
    await logoutGoogle();
    setDriveUser(null);
    setDriveAccessToken(null);
    setNeedsDriveAuth(false);
    setLastSyncMessage(null);
  };

  // Find currently active station
  const currentStation = stations.find(s => s.id === selectedStationId) ||
    stations.find(s => s.countyId === selectedCountyId) ||
    stations[0];

  const currentCounty = COUNTIES.find(c => c.id === (currentStation?.countyId || selectedCountyId)) || COUNTIES[0];

  const hasAnyDriveLinks = stations.some(
    (s) =>
      Boolean(s.driveFolderId) ||
      s.panels.some((p) => Boolean(p.pdfFile?.driveFileId)) ||
      (s.pmForms || []).some((f) => Boolean(f.pdfFile?.driveFileId))
  );

  // Station Handlers
  const handleAddStation = (countyId: CountyId, name: string) => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newStation: Station = {
      id: `stn-${randomSuffix}`,
      name,
      countyId,
      panels: [
        {
          id: `pnl-${randomSuffix}-1`,
          name: 'تابلو برق اصلی AC-1',
          pdfFile: {
            id: `pdf-${randomSuffix}-1`,
            title: `دیاگرام تک‌خطی تابلو برق ${name}`,
            fileName: 'panel_schematic.pdf',
            uploadDate: new Intl.DateTimeFormat('fa-IR').format(new Date()),
            fileSize: '۱.۵ مگابایت'
          }
        }
      ],
      tanks: [
        {
          id: `tnk-${randomSuffix}-1`,
          name: `مخزن سوخت ژنراتور ${name}`,
          shape: 'rectangular',
          lengthCm: 250,
          widthCm: 120,
          heightCm: 150,
          lastDipCm: 80,
          lastUpdatedDate: new Intl.DateTimeFormat('fa-IR').format(new Date())
        }
      ],
      pmForms: []
    };

    const updated = [...stations, newStation];
    handleUpdateStations(updated);
    setSelectedStationId(newStation.id);
  };

  // Panel Handlers
  const handleAddPanel = (name: string, pdf?: PanelPdf): ElectricalPanel | undefined => {
    if (!currentStation) return undefined;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newPanel: ElectricalPanel = {
      id: `pnl-${randomSuffix}`,
      name,
      pdfFile: pdf || {
        id: `pdf-${randomSuffix}`,
        title: `دیاگرام تک‌خطی ${name}`,
        fileName: 'diagram_schematic.pdf',
        uploadDate: new Intl.DateTimeFormat('fa-IR').format(new Date()),
        fileSize: '۱.۶ مگابایت'
      }
    };

    const updated = stations.map(s => {
      if (s.id === currentStation.id) {
        return {
          ...s,
          panels: [...s.panels, newPanel]
        };
      }
      return s;
    });

    handleUpdateStations(updated);
    return newPanel;
  };

  const handleDeletePanel = (panelId: string) => {
    if (!currentStation) return;
    const updated = stations.map(s => {
      if (s.id === currentStation.id) {
        return {
          ...s,
          panels: s.panels.filter(p => p.id !== panelId)
        };
      }
      return s;
    });
    handleUpdateStations(updated);
  };

  const handleUpdatePanelPdf = (panelId: string, newPdf: PanelPdf) => {
    if (!currentStation) return;
    const updated = stations.map(s => {
      if (s.id === currentStation.id) {
        return {
          ...s,
          panels: s.panels.map(p => p.id === panelId ? { ...p, pdfFile: newPdf } : p)
        };
      }
      return s;
    });
    handleUpdateStations(updated);

    if (activeDiagramPanel && activeDiagramPanel.id === panelId) {
      setActiveDiagramPanel(prev => prev ? { ...prev, pdfFile: newPdf } : null);
    }
  };

  // Tank Handlers
  const handleAddTank = (newTankData: Omit<FuelTank, 'id'>) => {
    if (!currentStation) return;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newTank: FuelTank = {
      ...newTankData,
      id: `tnk-${randomSuffix}`
    };

    const updated = stations.map(s => {
      if (s.id === currentStation.id) {
        return {
          ...s,
          tanks: [...s.tanks, newTank]
        };
      }
      return s;
    });
    handleUpdateStations(updated);
  };

  const handleDeleteTank = (tankId: string) => {
    if (!currentStation) return;
    const updated = stations.map(s => {
      if (s.id === currentStation.id) {
        return {
          ...s,
          tanks: s.tanks.filter(t => t.id !== tankId)
        };
      }
      return s;
    });
    handleUpdateStations(updated);
  };

  const handleSaveTankDip = (tankId: string, dipCm: number) => {
    if (!currentStation) return;
    const updated = stations.map(s => {
      if (s.id === currentStation.id) {
        return {
          ...s,
          tanks: s.tanks.map(t => {
            if (t.id === tankId) {
              return {
                ...t,
                lastDipCm: dipCm,
                lastUpdatedDate: new Intl.DateTimeFormat('fa-IR').format(new Date())
              };
            }
            return t;
          })
        };
      }
      return s;
    });
    handleUpdateStations(updated);
  };

  // PM Form Handlers
  const handleAddPmForm = (newFormData: Omit<PmForm, 'id'>): PmForm | undefined => {
    if (!currentStation) return undefined;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newForm: PmForm = {
      ...newFormData,
      id: `pm-${randomSuffix}`
    };

    const updated = stations.map(s => {
      if (s.id === currentStation.id) {
        return {
          ...s,
          pmForms: [newForm, ...(s.pmForms || [])]
        };
      }
      return s;
    });
    handleUpdateStations(updated);
    return newForm;
  };

  const handleDeletePmForm = (formId: string) => {
    if (!currentStation) return;
    const updated = stations.map(s => {
      if (s.id === currentStation.id) {
        return {
          ...s,
          pmForms: (s.pmForms || []).filter(f => f.id !== formId)
        };
      }
      return s;
    });
    handleUpdateStations(updated);
  };

  const handleUpdatePmPdf = (formId: string, newPdf: PanelPdf) => {
    if (!currentStation) return;
    const updated = stations.map(s => {
      if (s.id === currentStation.id) {
        return {
          ...s,
          pmForms: (s.pmForms || []).map(f => f.id === formId ? { ...f, pdfFile: newPdf } : f)
        };
      }
      return s;
    });
    handleUpdateStations(updated);

    if (activePmForm && activePmForm.id === formId) {
      setActivePmForm(prev => prev ? { ...prev, pdfFile: newPdf } : null);
    }
  };

  // Google Drive Modal Handlers
  const handlePickFileForTarget = (pdf: PanelPdf, _file: DriveFileItem) => {
    if (!drivePickerTarget) return;

    if (drivePickerTarget.kind === 'update-panel') {
      handleUpdatePanelPdf(drivePickerTarget.panelId, pdf);
    } else if (drivePickerTarget.kind === 'new-panel') {
      setDrivePickedPdfForPanel(pdf);
      setActiveTab('panels');
    } else if (drivePickerTarget.kind === 'update-pm') {
      handleUpdatePmPdf(drivePickerTarget.formId, pdf);
    } else if (drivePickerTarget.kind === 'new-pm') {
      setDrivePickedPdfForPm(pdf);
      setActiveTab('pm');
    }
    setDrivePickerTarget(null);
  };

  const handleImportDriveAsPanel = (pdf: PanelPdf) => {
    handleAddPanel(pdf.title, pdf);
    setActiveTab('panels');
  };

  const handleImportDriveAsPmForm = (pdf: PanelPdf) => {
    handleAddPmForm({
      title: pdf.title,
      technicianName: driveUser?.displayName || driveUser?.email || 'همگام‌سازی Google Drive',
      performedDate: pdf.uploadDate,
      status: 'completed',
      pdfFile: pdf
    });
    setActiveTab('pm');
  };

  const handleLinkWatchFolder = (
    folderId: string | undefined,
    folderName: string | undefined,
    target: DriveFolderTarget
  ) => {
    if (!currentStation) return;
    const updated = stations.map((s) => {
      if (s.id === currentStation.id) {
        return {
          ...s,
          driveFolderId: folderId,
          driveFolderName: folderName,
          driveFolderTarget: target
        };
      }
      return s;
    });
    handleUpdateStations(updated);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900" dir="rtl">
      {/* Top Blue-White Header */}
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenDrive={() => {
          setDrivePickerTarget(null);
          setIsDriveModalOpen(true);
        }}
        isDriveConnected={Boolean(driveAccessToken && !needsDriveAuth)}
        isDriveSyncing={isDriveSyncing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Drive Auto-Sync Live Update Toast */}
        {syncNotification && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs shadow-2xs no-print">
            <div className="flex items-center gap-2 font-bold">
              <FolderSync className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncNotification(null)}
              className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
              aria-label="بستن اعلان همگام‌سازی"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Reconnect Prompt when station has Drive-linked docs and no active Drive token */}
        {hasAnyDriveLinks && (!driveAccessToken || needsDriveAuth) && (
          <div className="bg-blue-50 border border-blue-200 text-blue-950 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs no-print">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                فایل‌های متصل به Google Drive در سامانه وجود دارد. برای بررسی و دریافت خودکار آخرین نسخه‌های آپدیت‌شده به گوگل متصل شوید.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setDrivePickerTarget(null);
                setIsDriveModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              اتصال به Google Drive
            </button>
          </div>
        )}

        {/* County & Station Selector */}
        <CountyStationSelector
          selectedCountyId={selectedCountyId}
          onSelectCounty={(id) => setSelectedCountyId(id)}
          stations={stations}
          selectedStationId={currentStation?.id || selectedStationId}
          onSelectStation={(id) => setSelectedStationId(id)}
          onAddStation={handleAddStation}
          currentRole={currentRole}
        />

        {/* Equipment Category Tabs (تابلوهای برق | مخازن سوخت | آخرین فرم PM) */}
        <div className="flex items-center gap-2 border-b border-blue-100 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('panels')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'panels'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Zap className={`w-4 h-4 ${activeTab === 'panels' ? 'text-amber-300' : 'text-blue-600'}`} />
            <span>تابلوهای برق ({currentStation?.panels.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('tanks')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'tanks'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Fuel className={`w-4 h-4 ${activeTab === 'tanks' ? 'text-emerald-300' : 'text-blue-600'}`} />
            <span>مخازن سوخت ({currentStation?.tanks.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('pm')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'pm'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ClipboardCheck className={`w-4 h-4 ${activeTab === 'pm' ? 'text-blue-100' : 'text-blue-600'}`} />
            <span>آخرین فرم PM ({currentStation?.pmForms?.length || 0})</span>
          </button>
        </div>

        {/* Tab 1: Panels */}
        {activeTab === 'panels' && currentStation && (
          <PanelsSection
            panels={currentStation.panels}
            stationId={currentStation.id}
            stationName={currentStation.name}
            countyName={currentCounty.name}
            currentRole={currentRole}
            onOpenDiagram={(panel) => setActiveDiagramPanel(panel)}
            onOpenQr={(panel) => setActiveQrData({
              stationId: currentStation.id,
              stationName: currentStation.name,
              countyName: currentCounty.name,
              equipmentType: 'panel',
              equipmentId: panel.id,
              equipmentName: panel.name
            })}
            onAddPanel={handleAddPanel}
            onDeletePanel={handleDeletePanel}
            onOpenDrivePicker={() => {
              setDrivePickerTarget({ kind: 'new-panel', label: 'ثبت تابلو برق جدید' });
              setIsDriveModalOpen(true);
            }}
            drivePickedPdf={drivePickedPdfForPanel}
            onConsumeDrivePickedPdf={() => setDrivePickedPdfForPanel(null)}
          />
        )}

        {/* Tab 2: Tanks */}
        {activeTab === 'tanks' && currentStation && (
          <TanksSection
            tanks={currentStation.tanks}
            stationName={currentStation.name}
            countyName={currentCounty.name}
            currentRole={currentRole}
            activeShape={activeTankShape}
            onShapeChange={setActiveTankShape}
            onOpenDipModal={(tank) => setActiveDipTank(tank)}
            onOpenQr={(tank) => setActiveQrData({
              stationId: currentStation.id,
              stationName: currentStation.name,
              countyName: currentCounty.name,
              equipmentType: 'tank',
              equipmentId: tank.id,
              equipmentName: tank.name
            })}
            onAddTank={handleAddTank}
            onDeleteTank={handleDeleteTank}
          />
        )}

        {/* Tab 3: Latest PM Form */}
        {activeTab === 'pm' && currentStation && (
          <PmFormsSection
            pmForms={currentStation.pmForms || []}
            stationId={currentStation.id}
            stationName={currentStation.name}
            countyName={currentCounty.name}
            currentRole={currentRole}
            onOpenForm={(form) => setActivePmForm(form)}
            onOpenQr={(form) => setActiveQrData({
              stationId: currentStation.id,
              stationName: currentStation.name,
              countyName: currentCounty.name,
              equipmentType: 'pm',
              equipmentId: form.id,
              equipmentName: form.title
            })}
            onAddForm={handleAddPmForm}
            onDeleteForm={handleDeletePmForm}
            onOpenDrivePicker={() => {
              setDrivePickerTarget({ kind: 'new-pm', label: 'ثبت فرم PM جدید' });
              setIsDriveModalOpen(true);
            }}
            drivePickedPdf={drivePickedPdfForPm}
            onConsumeDrivePickedPdf={() => setDrivePickedPdfForPm(null)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-blue-100 bg-white py-3.5 text-xs text-slate-500 no-print text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>
            {PROVINCE_NAME} · مراکز نگهداری {COUNTIES.map(c => c.name).join(' · ')}
          </span>
          <span className="text-[11px] text-slate-400">
            طراحی اختصاصی دو‌رنگ آبی و سفید · بارکدهای QR با آدرس دائمی
          </span>
        </div>
      </footer>

      {/* MODAL 1: Single Line Diagram PDF Viewer */}
      {activeDiagramPanel && currentStation && (
        <SingleLineDiagramModal
          panel={activeDiagramPanel}
          stationId={currentStation.id}
          stationName={currentStation.name}
          countyName={currentCounty.name}
          isOpen={true}
          onClose={() => setActiveDiagramPanel(null)}
          onUpdatePdf={handleUpdatePanelPdf}
          onOpenQr={() => setActiveQrData({
            stationId: currentStation.id,
            stationName: currentStation.name,
            countyName: currentCounty.name,
            equipmentType: 'panel',
            equipmentId: activeDiagramPanel.id,
            equipmentName: activeDiagramPanel.name
          })}
          onOpenDrivePicker={() => {
            setDrivePickerTarget({
              kind: 'update-panel',
              panelId: activeDiagramPanel.id,
              label: activeDiagramPanel.name
            });
            setIsDriveModalOpen(true);
          }}
          currentRole={currentRole}
        />
      )}

      {/* MODAL 2: Online Fuel Tank Dip Calculator */}
      {activeDipTank && currentStation && (
        <TankDipModal
          tank={activeDipTank}
          stationName={currentStation.name}
          countyName={currentCounty.name}
          isOpen={true}
          onClose={() => setActiveDipTank(null)}
          onSaveDip={handleSaveTankDip}
          currentRole={currentRole}
        />
      )}

      {/* MODAL 3: PM Form Details & PDF Viewer */}
      {activePmForm && currentStation && (
        <PmFormModal
          form={activePmForm}
          stationId={currentStation.id}
          stationName={currentStation.name}
          countyName={currentCounty.name}
          isOpen={true}
          onClose={() => setActivePmForm(null)}
          onUpdatePdf={handleUpdatePmPdf}
          onOpenQr={() => setActiveQrData({
            stationId: currentStation.id,
            stationName: currentStation.name,
            countyName: currentCounty.name,
            equipmentType: 'pm',
            equipmentId: activePmForm.id,
            equipmentName: activePmForm.title
          })}
          onOpenDrivePicker={() => {
            setDrivePickerTarget({
              kind: 'update-pm',
              formId: activePmForm.id,
              label: activePmForm.title
            });
            setIsDriveModalOpen(true);
          }}
          currentRole={currentRole}
        />
      )}

      {/* MODAL 4: Printable QR Code Sticker */}
      {activeQrData && (
        <QRCodeModal
          stationId={activeQrData.stationId}
          stationName={activeQrData.stationName}
          countyName={activeQrData.countyName}
          equipmentType={activeQrData.equipmentType}
          equipmentId={activeQrData.equipmentId}
          equipmentName={activeQrData.equipmentName}
          isOpen={true}
          onClose={() => setActiveQrData(null)}
        />
      )}

      {/* MODAL 5: Share Main Portal QR & Link */}
      <ShareSiteModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* MODAL 6: Google Drive Browser & Auto-Sync Settings */}
      {currentStation && (
        <GoogleDriveSyncModal
          isOpen={isDriveModalOpen}
          onClose={() => {
            setIsDriveModalOpen(false);
            setDrivePickerTarget(null);
          }}
          user={driveUser}
          accessToken={driveAccessToken}
          needsAuth={needsDriveAuth}
          isLoggingIn={isDriveLoggingIn}
          onSignIn={handleDriveSignIn}
          onSignOut={handleDriveSignOut}
          onAuthExpired={handleAuthExpired}
          station={currentStation}
          currentRole={currentRole}
          autoSyncEnabled={autoSyncEnabled}
          onToggleAutoSync={handleToggleAutoSync}
          isSyncing={isDriveSyncing}
          lastSyncMessage={lastSyncMessage}
          onSyncNow={() => syncDriveNow()}
          pickerTarget={drivePickerTarget}
          onPickFileForTarget={handlePickFileForTarget}
          onImportAsPanel={handleImportDriveAsPanel}
          onImportAsPmForm={handleImportDriveAsPmForm}
          onLinkWatchFolder={handleLinkWatchFolder}
        />
      )}
    </div>
  );
}

