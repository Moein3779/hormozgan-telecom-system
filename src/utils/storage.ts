import { Station, CountyInfo, UserRole, ElectricalPanel, FuelTank } from '../types';

export const PROVINCE_NAME = 'استان هرمزگان';

export const COUNTIES: CountyInfo[] = [
  { id: 'bandar_abbas', name: 'بندرعباس' },
  { id: 'bandar_lengeh', name: 'بندر لنگه' },
  { id: 'bandar_jask', name: 'بندر جاسک' }
];

export const INITIAL_STATIONS: Station[] = [
  {
    id: 'imam-ali',
    name: 'ایستگاه امام علی',
    countyId: 'bandar_abbas',
    panels: [
      {
        id: 'pnl-ac1',
        name: 'تابلو برق AC-1 (ورودی ترانس و ژنراتور)',
        pdfFile: {
          id: 'pdf-pnl-ac1',
          title: 'دیاگرام تک‌خطی و نقشه وایرینگ تابلو AC-1',
          fileName: 'single_line_diagram_ac1.pdf',
          uploadDate: '۱۴۰۳/۰۸/۱۰',
          fileSize: '۱.۸ مگابایت'
        }
      },
      {
        id: 'pnl-dc1',
        name: 'تابلو ۴۸ شماره یک (DC-1)',
        pdfFile: {
          id: 'pdf-pnl-dc1',
          title: 'دیاگرام تک‌خطی تابلو توزیع ۴۸ ولت DC-1',
          fileName: 'diagram_dc_distribution_48v.pdf',
          uploadDate: '۱۴۰۳/۰۸/۱۵',
          fileSize: '۱.۴ مگابایت'
        }
      }
    ],
    tanks: [
      {
        id: 'tnk-main',
        name: 'مخزن سوخت ژنراتور ایستگاه امام علی',
        shape: 'rectangular',
        lengthCm: 250, // طول به سانتی‌متر
        widthCm: 120,  // عرض به سانتی‌متر
        heightCm: 150, // ارتفاع کل به سانتی‌متر
        lastDipCm: 90, // ارتفاع فعلی سوخت: ۹۰ سانتی‌متر (حدود ۲۷۰۰ لیتر)
        lastUpdatedDate: '۱۴۰۳/۰۸/۱۰'
      },
      {
        id: 'tnk-sphere-01',
        name: 'مخزن کروی ذخیره سوخت اضطراری امام علی',
        shape: 'spherical',
        lengthCm: 160,
        widthCm: 160,
        heightCm: 180, // ارتفاع کل مخزن: ۱۸۰ سانتی‌متر
        diameterCm: 160, // قطر داخلی: ۱۶۰ سانتی‌متر
        lastDipCm: 95,
        lastUpdatedDate: '۱۴۰۳/۰۸/۱۲'
      }
    ],
    pmForms: [
      {
        id: 'pm-imam-01',
        title: 'فرم PM دوره‌ای پاییز ۱۴۰۳ — تجهیزات نیرو و ژنراتور',
        performedDate: '۱۴۰۳/۰۸/۱۸',
        nextDueDate: '۱۴۰۳/۱۱/۱۸',
        technicianName: 'مهندس محمدی',
        equipmentScope: 'تابلو AC-1، تابلو ۴۸ ولت DC-1، دیزل ژنراتور و مخزن سوخت',
        status: 'completed',
        notes: 'تست بار ژنراتور انجام شد، ولتاژ رکتیفایر روی ۵۳/۵ ولت پایدار است و اتصالات ارت بازبینی گردید.',
        pdfFile: {
          id: 'pdf-pm-imam-01',
          title: 'گزارش فرم PM پاییز ۱۴۰۳ ایستگاه امام علی',
          fileName: 'pm_form_imam_ali_1403_08.pdf',
          uploadDate: '۱۴۰۳/۰۸/۱۸',
          fileSize: '۱.۲ مگابایت'
        }
      }
    ]
  },
  {
    id: 'lengeh-central',
    name: 'ایستگاه مرکزی بندر لنگه',
    countyId: 'bandar_lengeh',
    panels: [
      {
        id: 'pnl-lengeh-01',
        name: 'تابلو اصلی برق AC مرکز لنگه',
        pdfFile: {
          id: 'pdf-lengeh-01',
          title: 'دیاگرام تک‌خطی تابلو برق لنگه',
          fileName: 'schematic_lengeh_center.pdf',
          uploadDate: '۱۴۰۳/۰۷/۲۰',
          fileSize: '۲.۰ مگابایت'
        }
      }
    ],
    tanks: [
      {
        id: 'tnk-lengeh-01',
        name: 'مخزن سوخت ایستگاه لنگه',
        shape: 'rectangular',
        lengthCm: 200,
        widthCm: 100,
        heightCm: 140,
        lastDipCm: 80,
        lastUpdatedDate: '۱۴۰۳/۰۷/۲۵'
      }
    ],
    pmForms: [
      {
        id: 'pm-lengeh-01',
        title: 'فرم PM دوره‌ای مرکز بندر لنگه',
        performedDate: '۱۴۰۳/۰۷/۲۵',
        nextDueDate: '۱۴۰۳/۱۰/۲۵',
        technicianName: 'مهندس کریمی',
        equipmentScope: 'تابلو اصلی AC، باطری‌بانک و مخزن سوخت دیزل',
        status: 'completed',
        notes: 'سرویس فیلترهای هوا و سوخت ژنراتور انجام و سطح آب باطری‌ها کنترل شد.'
      }
    ]
  },
  {
    id: 'jask-main',
    name: 'ایستگاه مایکروویو جاسک',
    countyId: 'bandar_jask',
    panels: [
      {
        id: 'pnl-jask-01',
        name: 'تابلو برق اضطراری جاسک',
        pdfFile: {
          id: 'pdf-jask-01',
          title: 'دیاگرام تک‌خطی تابلو اضطراری جاسک',
          fileName: 'jask_emergency_panel_diagram.pdf',
          uploadDate: '۱۴۰۳/۰۶/۱۵',
          fileSize: '۱.۵ مگابایت'
        }
      }
    ],
    tanks: [
      {
        id: 'tnk-jask-01',
        name: 'مخزن سوخت اضطراری جاسک',
        shape: 'rectangular',
        lengthCm: 180,
        widthCm: 100,
        heightCm: 120,
        lastDipCm: 70,
        lastUpdatedDate: '۱۴۰۳/۰۶/۲۰'
      }
    ],
    pmForms: [
      {
        id: 'pm-jask-01',
        title: 'فرم PM تجهیزات اضطراری ایستگاه جاسک',
        performedDate: '۱۴۰۳/۰۶/۲۰',
        nextDueDate: '۱۴۰۳/۰۹/۲۰',
        technicianName: 'مهندس زارعی',
        equipmentScope: 'تابلو برق اضطراری، چنج‌اور ATS و مخزن سوخت',
        status: 'needs_followup',
        notes: 'کنتاکتور خروجی ژنراتور نیاز به تعویض در سرویس آتی دارد.'
      }
    ]
  }
];

const STATIONS_KEY = 'hormozgan_telecom_stations_v3';
const ROLE_KEY = 'hormozgan_user_role_v3';

export function loadStations(): Station[] {
  try {
    const raw = localStorage.getItem(STATIONS_KEY);
    if (!raw) {
      localStorage.setItem(STATIONS_KEY, JSON.stringify(INITIAL_STATIONS));
      return INITIAL_STATIONS;
    }
    const parsed: Station[] = JSON.parse(raw);
    return parsed.map((station) => {
      const normalizedTanks = (station.tanks || []).map((t) => ({
        ...t,
        shape: t.shape || 'rectangular'
      }));
      if (Array.isArray(station.pmForms)) {
        return {
          ...station,
          tanks: normalizedTanks
        };
      }
      const initialMatch = INITIAL_STATIONS.find((s) => s.id === station.id);
      return {
        ...station,
        tanks: normalizedTanks,
        pmForms: initialMatch?.pmForms || []
      };
    });
  } catch {
    return INITIAL_STATIONS;
  }
}

export function saveStations(stations: Station[]): void {
  try {
    localStorage.setItem(STATIONS_KEY, JSON.stringify(stations));
  } catch (err) {
    console.warn('localStorage quota exceeded, saving compact Drive references', err);
    try {
      const compactStations = stations.map((s) => ({
        ...s,
        panels: s.panels.map((p) =>
          p.pdfFile?.driveFileId && (p.pdfFile.dataUrl?.length || 0) > 250000
            ? { ...p, pdfFile: { ...p.pdfFile, dataUrl: undefined } }
            : p
        ),
        pmForms: (s.pmForms || []).map((f) =>
          f.pdfFile?.driveFileId && (f.pdfFile.dataUrl?.length || 0) > 250000
            ? { ...f, pdfFile: { ...f.pdfFile, dataUrl: undefined } }
            : f
        )
      }));
      localStorage.setItem(STATIONS_KEY, JSON.stringify(compactStations));
    } catch (innerErr) {
      console.error('Failed to save stations even in compact mode', innerErr);
    }
  }
}

export function loadUserRole(): UserRole {
  try {
    const raw = localStorage.getItem(ROLE_KEY);
    if (raw === 'super_admin' || raw === 'supervisor' || raw === 'technician') {
      return raw;
    }
    return 'super_admin'; // Default is "من" (ادمین اصلی)
  } catch {
    return 'super_admin';
  }
}

export function saveUserRole(role: UserRole): void {
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch (err) {
    console.error('Failed to save role', err);
  }
}

/**
 * QR Code permanent URL generator
 * Format: ?station=imam-ali&type=panel&id=pnl-ac1
 * Format: ?station=imam-ali&type=tank&id=tnk-main
 * Changes to PDF files or tank dimensions NEVER alter this URL or the QR Code!
 */
export function getEquipmentQrUrl(stationId: string, type: 'panel' | 'tank' | 'pm', equipmentId: string): string {
  if (typeof window === 'undefined') return `?station=${stationId}&type=${type}&id=${equipmentId}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?station=${encodeURIComponent(stationId)}&type=${type}&id=${encodeURIComponent(equipmentId)}`;
}
