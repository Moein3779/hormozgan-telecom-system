import React from 'react';
import { Radio, Share2, FolderSync, RefreshCw } from 'lucide-react';
import { UserRole } from '../types';
import { PROVINCE_NAME } from '../utils/storage';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenShare: () => void;
  onOpenDrive: () => void;
  isDriveConnected: boolean;
  isDriveSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  onOpenShare,
  onOpenDrive,
  isDriveConnected,
  isDriveSyncing = false
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-blue-100 shadow-xs" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Province */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                  سامانه مدیریت تجهیزات مخابراتی
                </h1>
                <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 whitespace-nowrap shrink-0 hidden xs:inline-block">
                  {PROVINCE_NAME}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block truncate">
                مراکز نگهداری، دیاگرام‌های تک‌خطی تابلوهای برق و محاسبه آنلاین مخازن سوخت
              </p>
            </div>
          </div>

          {/* Actions: Google Drive + Share + Role Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenDrive}
              title="اتصال و همگام‌سازی Google Drive"
              className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold border rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isDriveConnected
                  ? 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                  : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200'
              }`}
            >
              {isDriveSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FolderSync className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">
                {isDriveConnected ? 'درایو متصل' : 'Google Drive'}
              </span>
            </button>

            <button
              onClick={onOpenShare}
              title="ارسال و QR ورود به سامانه"
              className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">اشتراک‌گذاری</span>
            </button>

            <div className="relative">
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className={`text-xs font-bold py-2 pr-3 pl-2 sm:pr-4 sm:pl-3 rounded-lg border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[165px] sm:max-w-none ${
                  currentRole === 'super_admin'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : currentRole === 'supervisor'
                      ? 'bg-blue-50 text-blue-900 border-blue-300'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                <option value="super_admin" className="bg-white text-slate-900 font-bold">
                  مدیر سیستم (من) - دسترسی کامل
                </option>
                <option value="supervisor" className="bg-white text-slate-900">
                  مدیر بالادستی - فقط مشاهده
                </option>
                <option value="technician" className="bg-white text-slate-900">
                  کارشناس میدانی - ثبت ارتفاع سوخت
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
