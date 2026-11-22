/**
 * Data structures for Hormozgan Telecom Equipment Management
 * Province: استان هرمزگان (Fixed)
 * Counties: بندرعباس | بندر لنگه | بندر جاسک
 */

export type CountyId = 'bandar_abbas' | 'bandar_lengeh' | 'bandar_jask';

export type UserRole = 'super_admin' | 'supervisor' | 'technician';
// super_admin: من (دسترسی کامل مدیریت، افزودن ایستگاه، تابلو، مخزن، آپلود PDF)
// supervisor: مدیران بالادستی (فقط مشاهده نقشه‌ها و موجودی سوخت)
// technician: کارشناسان میدانی (مشاهده نقشه و ثبت آنلاین ارتفاع سوخت)

export interface PanelPdf {
  id: string;
  title: string;
  fileName: string;
  uploadDate: string;
  fileSize: string;
  dataUrl?: string; // Base64 data URL
  mimeType?: string;
  driveFileId?: string;
  driveModifiedTime?: string;
  driveWebViewLink?: string;
  lastSyncedAt?: string;
}

export interface ElectricalPanel {
  id: string; // Unique ID (e.g. pnl-ac1)
  name: string; // e.g. "تابلو AC-1" یا "تابلو DC شماره پنج" یا "تابلو ۴۸ شماره یک"
  pdfFile?: PanelPdf;
  notes?: string;
}

export type TankShape = 'rectangular' | 'spherical';

export interface FuelTank {
  id: string; // Unique ID (e.g. tnk-01)
  name: string; // e.g. "مخزن سوخت گازوئیل ژنراتور"
  shape?: TankShape; // 'rectangular' (مکعب مستطیل) | 'spherical' (کروی)
  lengthCm: number; // طول به سانتی‌متر (مکعب مستطیل)
  widthCm: number;  // عرض به سانتی‌متر (مکعب مستطیل)
  heightCm: number; // ارتفاع کل به سانتی‌متر (در مخزن کروی برابر قطر)
  diameterCm?: number; // قطر مخزن کروی به سانتی‌متر
  lastDipCm: number; // آخرین ارتفاع سوخت ثبت‌شده (cm)
  lastUpdatedDate?: string;
  lastUpdatedBy?: string;
}

export type PmFormStatus = 'completed' | 'needs_followup';

export interface PmForm {
  id: string;
  title: string;
  performedDate: string;
  nextDueDate?: string;
  technicianName: string;
  equipmentScope?: string;
  status: PmFormStatus;
  notes?: string;
  pdfFile?: PanelPdf;
}

export type DriveFolderTarget = 'auto' | 'panels' | 'pm';

export interface Station {
  id: string; // e.g. "imam-ali"
  name: string; // e.g. "ایستگاه امام علی"
  countyId: CountyId;
  panels: ElectricalPanel[];
  tanks: FuelTank[];
  pmForms?: PmForm[];
  driveFolderId?: string;
  driveFolderName?: string;
  driveFolderTarget?: DriveFolderTarget;
  driveLastSyncTime?: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
}

export interface CountyInfo {
  id: CountyId;
  name: string;
}
