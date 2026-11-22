import React, { useState, useEffect } from 'react';
import {
  X,
  Fuel,
  Ruler,
  Check,
  Save,
  Box,
  Circle
} from 'lucide-react';
import { FuelTank, UserRole } from '../types';
import { calculateTankVolume, TankCalculationResult, getTankShape } from '../utils/tankFormulas';
import { TankGraphic } from './TankGraphic';

interface TankDipModalProps {
  tank: FuelTank;
  stationName: string;
  countyName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveDip: (tankId: string, dipCm: number) => void;
  currentRole: UserRole;
}

export const TankDipModal: React.FC<TankDipModalProps> = ({
  tank,
  stationName,
  countyName,
  isOpen,
  onClose,
  onSaveDip,
  currentRole
}) => {
  const [dipCm, setDipCm] = useState<number>(tank.lastDipCm || 80);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (tank.lastDipCm !== undefined) {
      setDipCm(tank.lastDipCm);
    }
  }, [tank.id, tank.lastDipCm]);

  if (!isOpen) return null;

  const tankShape = getTankShape(tank);
  const isSpherical = tankShape === 'spherical';
  const result: TankCalculationResult = calculateTankVolume(tank, dipCm);
  const maxHeight = result.heightCm;
  const clampedDip = Math.max(0, Math.min(dipCm, maxHeight));

  const handleSave = () => {
    onSaveDip(tank.id, clampedDip);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                محاسبه آنلاین موجودی: {tank.name}
              </h3>
              <p className="text-[11px] text-blue-100 flex items-center gap-1.5">
                <span>{stationName} ({countyName})</span>
                <span aria-hidden="true">·</span>
                <span>{isSpherical ? 'مخزن کروی' : 'مخزن مکعب مستطیل'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-100 hover:text-white hover:bg-blue-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 text-xs">
          {/* Fixed Dimensions Card */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 text-slate-700 space-y-1">
            <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
              {isSpherical ? <Circle className="w-3.5 h-3.5" /> : <Box className="w-3.5 h-3.5" />}
              <span>
                {isSpherical
                  ? 'مشخصات ثابت مخزن کروی (ثبت‌شده توسط مدیر):'
                  : 'مشخصات و ابعاد ثابت مخزن مکعب مستطیل (ثبت‌شده توسط مدیر):'}
              </span>
            </span>

            {isSpherical ? (
              <div className="grid grid-cols-3 gap-2 text-center pt-1 font-semibold text-slate-800">
                <div className="bg-white p-1.5 rounded border border-blue-100">
                  قطر مخزن: <strong className="font-mono text-blue-950">{result.diameterCm} cm</strong>
                </div>
                <div className="bg-white p-1.5 rounded border border-blue-100">
                  ارتفاع کل مخزن: <strong className="font-mono text-blue-950">{result.heightCm} cm</strong>
                </div>
                <div className="bg-white p-1.5 rounded border border-blue-100">
                  شعاع: <strong className="font-mono text-blue-950">{(result.diameterCm || 150) / 2} cm</strong>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center pt-1 font-semibold text-slate-800">
                <div className="bg-white p-1.5 rounded border border-blue-100">
                  طول: <strong className="font-mono text-blue-950">{tank.lengthCm} cm</strong>
                </div>
                <div className="bg-white p-1.5 rounded border border-blue-100">
                  عرض: <strong className="font-mono text-blue-950">{tank.widthCm} cm</strong>
                </div>
                <div className="bg-white p-1.5 rounded border border-blue-100">
                  ارتفاع کل: <strong className="font-mono text-blue-950">{tank.heightCm} cm</strong>
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-500 pt-1 text-center font-medium">
              ظرفیت اسمی کل مخزن: <strong className="text-slate-800 font-bold">{result.totalCapacityLiters.toLocaleString('fa-IR')} لیتر</strong>
            </div>
          </div>

          {/* Primary Calculation Output Results */}
          <div className="grid grid-cols-2 gap-3">
            {/* Current Liters */}
            <div className="bg-white rounded-xl border-2 border-blue-600 p-4 shadow-xs text-center flex flex-col justify-center">
              <span className="text-slate-500 text-[11px] font-semibold block mb-1">
                موجودی سوخت موجود (لیتر)
              </span>
              <span className="text-3xl font-black text-blue-700 font-tabular tracking-tight">
                {result.currentLiters.toLocaleString('fa-IR')}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {(result.currentLiters / 1000).toFixed(2)} متر مکعب
              </span>
            </div>

            {/* Percentage & Deficit */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs text-center flex flex-col justify-center">
              <span className="text-slate-500 text-[11px] font-semibold block mb-1">
                درصد پر بودن مخزن
              </span>
              <span className="text-2xl font-black text-slate-900 font-tabular">
                {result.percentageFull.toLocaleString('fa-IR')}٪
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                کسری: <strong className="font-tabular text-slate-700">{result.remainingLitersToFull.toLocaleString('fa-IR')} لیتر</strong>
              </span>
            </div>
          </div>

          {/* Technician Input: Liquid Height (Dip in cm) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-blue-600 shrink-0" />
                <span>ارتفاع سوخت موجود بر حسب سانتی‌متر (دیپ):</span>
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDipCm(Math.max(0, clampedDip - 5))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center text-xs"
                >
                  -۵
                </button>
                <div className="flex items-center gap-1 bg-white border-2 border-blue-600 rounded-lg px-2.5 py-1">
                  <input
                    type="number"
                    min="0"
                    max={maxHeight}
                    value={clampedDip}
                    onChange={(e) => setDipCm(Math.max(0, Math.min(maxHeight, Number(e.target.value) || 0)))}
                    className="w-16 text-center font-black text-xl text-blue-700 font-tabular focus:outline-none"
                    autoFocus
                  />
                  <span className="text-[11px] font-bold text-slate-400">cm</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDipCm(Math.min(maxHeight, clampedDip + 5))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center text-xs"
                >
                  +۵
                </button>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max={maxHeight}
              step="1"
              value={clampedDip}
              onChange={(e) => setDipCm(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>۰ cm (خالی)</span>
              <span>{Math.round(maxHeight / 2)} cm</span>
              <span>{maxHeight} cm (کامل)</span>
            </div>
          </div>

          {/* Graphical White & Blue Tank Level */}
          <div className="bg-slate-50 border border-blue-100 rounded-xl p-4 flex flex-col items-center justify-center gap-3">
            <TankGraphic
              shape={tankShape}
              percentageFull={result.percentageFull}
              dipCm={clampedDip}
              heightCm={maxHeight}
              size="lg"
            />
            <div className="flex items-center gap-4 text-[11px] text-slate-600 pt-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-white border border-blue-900 inline-block" />
                <span>فضای خالی مخزن</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-blue-600 border border-blue-900 inline-block" />
                <span>سوخت موجود: {result.currentLiters.toLocaleString('fa-IR')} لیتر</span>
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-colors"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>ثبت شد</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>ثبت موجودی جدید در سامانه</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
