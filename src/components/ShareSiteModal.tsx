import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share2, Copy, Check, Download, Smartphone } from 'lucide-react';
import { downloadQrCodeAsPng } from '../utils/qrHelper';

interface ShareSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareSiteModal: React.FC<ShareSiteModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const siteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : '';

  const svgId = 'qr-main-site-share';

  const handleCopy = () => {
    if (!siteUrl) return;
    navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!siteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'سامانه تجهیزات مخابرات هرمزگان',
          text: 'ورود به سامانه مدیریت تابلوهای برق و مخازن سوخت استان هرمزگان:',
          url: siteUrl
        });
      } catch {
        // User cancelled share sheet
      }
    } else {
      handleCopy();
    }
  };

  const handleDownloadQr = () => {
    downloadQrCodeAsPng(svgId, 'QR_Hormozgan_Telecom_Portal');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">ارسال و اشتراک‌گذاری با همکاران</h3>
              <p className="text-[11px] text-blue-100">بدون نیاز به تایپ آدرس توسط همکاران</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-100 hover:text-white hover:bg-blue-700 transition-colors"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* QR Code for main portal */}
          <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/40 text-center space-y-2.5">
            <span className="font-bold text-slate-800 block">
              همکاران با دوربین موبایل این کد را اسکن کنند:
            </span>
            <div className="inline-block p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <QRCodeSVG
                id={svgId}
                value={siteUrl || 'https://ais-pre-ft2sbwo3jy7aylfmyshpqg-362982801304.asia-southeast1.run.app'}
                size={160}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              سامانه تجهیزات مخابراتی استان هرمزگان
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>ارسال لینک در پیام‌رسان</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-200 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-blue-600" />}
              <span>{copied ? 'لینک کپی شد!' : 'کپی آدرس سایت'}</span>
            </button>
          </div>

          <button
            onClick={handleDownloadQr}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 text-blue-700 font-semibold rounded-xl border border-blue-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>دانلود تصویر QR ورودی سامانه</span>
          </button>

          {/* Tip for home screen */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed">
            <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>نکته:</strong> اگر همکاران پس از باز کردن لینک در مرورگر گوشی، گزینه <strong>«افزودن به صفحه اصلی (Add to Home Screen)»</strong> را بزنند، آیکون سامانه مثل یک اپلیکیشن روی گوشی‌شان ذخیره می‌شود و دیگر نیازی به وارد کردن آدرس ندارند.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
