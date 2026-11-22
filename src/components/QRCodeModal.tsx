import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, Copy, Check, ShieldCheck, Tag, Share2 } from 'lucide-react';
import { getEquipmentQrUrl } from '../utils/storage';
import { downloadQrCodeAsPng, shareUrl } from '../utils/qrHelper';

interface QRCodeModalProps {
  stationId: string;
  stationName: string;
  countyName: string;
  equipmentType: 'panel' | 'tank' | 'pm';
  equipmentId: string;
  equipmentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  stationId,
  stationName,
  countyName,
  equipmentType,
  equipmentId,
  equipmentName,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [sharedStatus, setSharedStatus] = useState<'idle' | 'shared' | 'copied'>('idle');

  if (!isOpen) return null;

  const qrUrl = getEquipmentQrUrl(stationId, equipmentType, equipmentId);
  const svgId = `qr-sticker-${stationId}-${equipmentType}-${equipmentId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const result = await shareUrl(
      qrUrl,
      `${equipmentName} - ${stationName}`,
      `لینک مستقیم ${equipmentName} (${stationName} - ${countyName}):`
    );
    if (result === 'shared' || result === 'copied') {
      setSharedStatus(result);
      setTimeout(() => setSharedStatus('idle'), 2000);
    }
  };

  const handleDownload = () => {
    downloadQrCodeAsPng(svgId, `QR_${stationName.replace(/\s+/g, '_')}_${equipmentName.replace(/\s+/g, '_')}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                برچسب و QR کد دائمی تجهیز
              </h3>
              <p className="text-[11px] text-slate-500">
                {stationName} ({countyName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Printable Sticker Box */}
          <div 
            id="printable-asset-sticker"
            className="print-card border-2 border-slate-900 rounded-xl p-4 bg-white text-center space-y-3"
          >
            <div className="border-b-2 border-slate-900 pb-2">
              <span className="text-[11px] font-bold text-slate-600 block">
                مخابرات منطقه هرمزگان · مرکز نگهداری {countyName}
              </span>
              <h4 className="text-sm font-black text-slate-950">
                {stationName}
              </h4>
              <span className="text-xs font-bold text-blue-800 block mt-0.5">
                {equipmentName}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-2">
              <div className="p-2 border border-slate-200 rounded-lg bg-white">
                <QRCodeSVG
                  id={svgId}
                  value={qrUrl}
                  size={160}
                  level="H"
                  includeMargin={true}
                  className="w-full max-w-[160px] h-auto"
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 mt-1 font-bold">
                {equipmentId}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-2 text-[11px] text-slate-700 space-y-0.5">
              <p className="font-bold text-slate-900">
                {equipmentType === 'panel'
                  ? 'اسکن با موبایل جهت باز شدن فوری نقشه دیاگرام تک‌خطی (PDF)'
                  : equipmentType === 'tank'
                    ? 'اسکن با موبایل جهت ورود مستقیم به محاسبه آنلاین موجودی سوخت'
                    : 'اسکن با موبایل جهت مشاهده فوری جزئیات و فایل آخرین فرم PM'}
              </p>
              <p className="text-[10px] text-slate-500">
                نصب روی بدنه تجهیز در سایت مخابراتی
              </p>
            </div>
          </div>

          {/* Guarantee Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-emerald-900 no-print">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>آدرس ثابت QR کد:</strong> با تغییر فایل PDF نقشه یا ویرایش ابعاد مخزن، این بارکد هرگز تغییر نمی‌کند و نیاز به تعویض برچسب فیزیکی نیست.
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 no-print">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>چاپ برچسب</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود PNG</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleShare}
                className="flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                {sharedStatus !== 'idle' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {sharedStatus === 'copied'
                    ? 'لینک کپی شد'
                    : sharedStatus === 'shared'
                      ? 'ارسال شد'
                      : 'اشتراک‌گذاری'}
                </span>
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 px-2.5 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'کپی شد' : 'کپی لینک'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
