import { DriveFileItem, PanelPdf } from '../types';

export class DriveAuthError extends Error {
  constructor(message = 'نشست Google Drive منقضی شده است. لطفاً مجدداً وارد شوید.') {
    super(message);
    this.name = 'DriveAuthError';
  }
}

export const DRIVE_MIME = {
  FOLDER: 'application/vnd.google-apps.folder',
  PDF: 'application/pdf',
  GOOGLE_DOC: 'application/vnd.google-apps.document',
  GOOGLE_SHEET: 'application/vnd.google-apps.spreadsheet',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel',
  CSV: 'text/csv'
} as const;

const SUPPORTED_EQUIPMENT_MIMES = [
  DRIVE_MIME.PDF,
  DRIVE_MIME.GOOGLE_DOC,
  DRIVE_MIME.GOOGLE_SHEET,
  DRIVE_MIME.DOCX,
  DRIVE_MIME.DOC,
  DRIVE_MIME.XLSX,
  DRIVE_MIME.XLS,
  DRIVE_MIME.CSV
];

export type EquipmentFileKind = 'folder' | 'pdf' | 'word' | 'excel' | 'other';

export function getFileKind(mimeType?: string, fileName?: string): EquipmentFileKind {
  const mime = (mimeType || '').toLowerCase();
  const lower = (fileName || '').toLowerCase();

  if (mime === DRIVE_MIME.FOLDER) return 'folder';
  if (mime === DRIVE_MIME.PDF || lower.endsWith('.pdf')) return 'pdf';
  if (
    mime === DRIVE_MIME.GOOGLE_DOC ||
    mime === DRIVE_MIME.DOCX ||
    mime === DRIVE_MIME.DOC ||
    lower.endsWith('.docx') ||
    lower.endsWith('.doc')
  ) {
    return 'word';
  }
  if (
    mime === DRIVE_MIME.GOOGLE_SHEET ||
    mime === DRIVE_MIME.XLSX ||
    mime === DRIVE_MIME.XLS ||
    mime === DRIVE_MIME.CSV ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.csv')
  ) {
    return 'excel';
  }
  return 'other';
}

export function getFileKindLabel(mimeType?: string, fileName?: string): string {
  const kind = getFileKind(mimeType, fileName);
  switch (kind) {
    case 'folder':
      return 'پوشه';
    case 'pdf':
      return 'PDF';
    case 'word':
      return 'Word';
    case 'excel':
      return 'Excel';
    default:
      return 'فایل';
  }
}

export function isPdfRenderable(pdf?: PanelPdf): boolean {
  if (!pdf?.dataUrl) return false;
  return pdf.dataUrl.startsWith('data:application/pdf');
}

export function formatBytesFa(bytesInput?: string | number): string {
  const bytes = Number(bytesInput);
  if (!bytes || Number.isNaN(bytes)) return 'نامشخص';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} مگابایت`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} کیلوبایت`;
}

export function formatDriveDateFa(isoDate?: string): string {
  if (!isoDate) return new Intl.DateTimeFormat('fa-IR').format(new Date());
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

function escapeDriveQuery(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export async function listDriveItems(
  accessToken: string,
  options: {
    folderId?: string;
    searchQuery?: string;
    filterKind?: 'all' | 'pdf' | 'word' | 'excel';
    filesOnly?: boolean;
  } = {}
): Promise<DriveFileItem[]> {
  const { folderId = 'root', searchQuery = '', filterKind = 'all', filesOnly = false } = options;

  const conditions: string[] = ['trashed = false'];

  if (searchQuery.trim()) {
    conditions.push(`name contains '${escapeDriveQuery(searchQuery.trim())}'`);
  } else if (folderId) {
    conditions.push(`'${escapeDriveQuery(folderId)}' in parents`);
  }

  let mimeGroup: string[] = SUPPORTED_EQUIPMENT_MIMES;
  if (filterKind === 'pdf') {
    mimeGroup = [DRIVE_MIME.PDF];
  } else if (filterKind === 'word') {
    mimeGroup = [DRIVE_MIME.DOCX, DRIVE_MIME.DOC, DRIVE_MIME.GOOGLE_DOC];
  } else if (filterKind === 'excel') {
    mimeGroup = [DRIVE_MIME.XLSX, DRIVE_MIME.XLS, DRIVE_MIME.CSV, DRIVE_MIME.GOOGLE_SHEET];
  }

  const mimeOrClauses = mimeGroup.map((m) => `mimeType = '${m}'`);
  if (!filesOnly) {
    mimeOrClauses.unshift(`mimeType = '${DRIVE_MIME.FOLDER}'`);
  }
  conditions.push(`(${mimeOrClauses.join(' or ')})`);

  const params = new URLSearchParams({
    q: conditions.join(' and '),
    fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,parents)',
    orderBy: 'folder,modifiedTime desc',
    pageSize: '100',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true'
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (res.status === 401) {
    throw new DriveAuthError();
  }
  if (!res.ok) {
    throw new Error(`خطا در خواندن فایل‌های Google Drive (${res.status})`);
  }

  const data = await res.json();
  return (data.files || []) as DriveFileItem[];
}

export async function getDriveFileMetadata(
  accessToken: string,
  fileId: string
): Promise<DriveFileItem | null> {
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,size,modifiedTime,webViewLink,trashed',
    supportsAllDrives: 'true'
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (res.status === 401) {
    throw new DriveAuthError();
  }
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`خطا در بررسی وضعیت فایل (${res.status})`);
  }

  const item = await res.json();
  if (item.trashed) return null;
  return item as DriveFileItem;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('خطا در تبدیل فایل دریافتی'));
    reader.readAsDataURL(blob);
  });
}

export async function downloadDriveFileAsPanelPdf(
  accessToken: string,
  file: DriveFileItem,
  customTitle?: string
): Promise<PanelPdf> {
  const isGoogleDocOrSheet =
    file.mimeType === DRIVE_MIME.GOOGLE_DOC || file.mimeType === DRIVE_MIME.GOOGLE_SHEET;

  const downloadUrl = isGoogleDocOrSheet
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=application/pdf`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`;

  const res = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (res.status === 401) {
    throw new DriveAuthError();
  }
  if (!res.ok) {
    throw new Error(`خطا در دریافت فایل از Google Drive (${res.status})`);
  }

  const blob = await res.blob();
  const effectiveMime = isGoogleDocOrSheet ? DRIVE_MIME.PDF : (blob.type || file.mimeType);
  const typedBlob = blob.type ? blob : new Blob([blob], { type: effectiveMime });

  // Skip inline base64 encoding only if > 8MB to protect browser memory
  const MAX_INLINE_BYTES = 8 * 1024 * 1024;
  const dataUrl = typedBlob.size <= MAX_INLINE_BYTES ? await blobToDataUrl(typedBlob) : undefined;

  const cleanBaseName = file.name.replace(/\.(pdf|docx?|xlsx?|csv)$/i, '');
  const nowFa = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());

  return {
    id: `drv-${file.id}-${Date.now()}`,
    title: customTitle?.trim() || cleanBaseName || file.name,
    fileName: isGoogleDocOrSheet && !file.name.toLowerCase().endsWith('.pdf')
      ? `${file.name}.pdf`
      : file.name,
    uploadDate: formatDriveDateFa(file.modifiedTime),
    fileSize: formatBytesFa(typedBlob.size || file.size),
    dataUrl,
    mimeType: effectiveMime,
    driveFileId: file.id,
    driveModifiedTime: file.modifiedTime,
    driveWebViewLink: file.webViewLink,
    lastSyncedAt: nowFa
  };
}

export function classifyDriveFilename(fileName: string): 'panels' | 'pm' {
  const lower = fileName.toLowerCase();
  if (
    lower.includes('pm') ||
    lower.includes('فرم') ||
    lower.includes('سرویس') ||
    lower.includes('نگهداری') ||
    lower.includes('چک') ||
    lower.includes('بازدید')
  ) {
    return 'pm';
  }
  return 'panels';
}
