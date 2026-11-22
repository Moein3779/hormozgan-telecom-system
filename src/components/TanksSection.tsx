import React, { useState, useEffect } from 'react';
import {
  Fuel,
  QrCode,
  Plus,
  Trash2,
  Calculator,
  Box,
  Circle
} from 'lucide-react';
import { FuelTank, TankShape, UserRole } from '../types';
import {
  calculateTankVolume,
  calculateSphericalCapacityLiters,
  getTankShape
} from '../utils/tankFormulas';
import { TankGraphic } from './TankGraphic';

interface TanksSectionProps {
  tanks: FuelTank[];
  stationName: string;
  countyName: string;
  currentRole: UserRole;
  activeShape: TankShape;
  onShapeChange: (shape: TankShape) => void;
  onOpenDipModal: (tank: FuelTank) => void;
  onOpenQr: (tank: FuelTank) => void;
  onAddTank: (newTank: Omit<FuelTank, 'id'>) => void;
  onDeleteTank: (tankId: string) => void;
}

export const TanksSection: React.FC<TanksSectionProps> = ({
  tanks,
  stationName,
  countyName,
  currentRole,
  activeShape,
  onShapeChange,
  onOpenDipModal,
  onOpenQr,
  onAddTank,
  onDeleteTank
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [formShape, setFormShape] = useState<TankShape>(activeShape);
  const [name, setName] = useState('');
  const [lengthCm, setLengthCm] = useState(250);
  const [widthCm, setWidthCm] = useState(120);
  const [heightCm, setHeightCm] = useState(180);
  const [diameterCm, setDiameterCm] = useState(160);
  const [initialDipCm, setInitialDipCm] = useState(90);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const isSuperAdmin = currentRole === 'super_admin';

  useEffect(() => {
    setFormShape(activeShape);
  }, [activeShape]);

  useEffect(() => {
    setPendingDeleteId(null);
  }, [stationName, activeShape]);

  const rectangularTanks = tanks.filter((t) => getTankShape(t) === 'rectangular');
  const sphericalTanks = tanks.filter((t) => getTankShape(t) === 'spherical');
  const filteredTanks = activeShape === 'spherical' ? sphericalTanks : rectangularTanks;

  // Aggregate metrics for active sub-branch graphical overview
  const branchTotals = filteredTanks.reduce(
    (acc, tank) => {
      const res = calculateTankVolume(tank, tank.lastDipCm || 0);
      acc.current += res.currentLiters;
      acc.capacity += res.totalCapacityLiters;
      return acc;
    },
    { current: 0, capacity: 0 }
  );
  const branchFillPercent =
    branchTotals.capacity > 0
      ? Math.min(100, Math.max(0, Math.round((branchTotals.current / branchTotals.capacity) * 100)))
      : 0;

  const clampedInitialDip = Math.max(0, Math.min(initialDipCm, heightCm));
  const previewFillPercent =
    heightCm > 0 ? Math.min(100, Math.max(0, Math.round((clampedInitialDip / heightCm) * 100))) : 0;

  const previewCapacityLiters =
    formShape === 'spherical'
      ? calculateSphericalCapacityLiters(diameterCm, heightCm)
      : Math.round((lengthCm * widthCm * heightCm) / 1000);

  const handleOpenAddForm = (shapeToUse: TankShape = activeShape) => {
    setFormShape(shapeToUse);
    setHeightCm(shapeToUse === 'spherical' ? 180 : 150);
    setInitialDipCm(shapeToUse === 'spherical' ? 90 : 80);
    setIsAdding(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const todayStr = new Intl.DateTimeFormat('fa-IR').format(new Date());
    const safeH = Math.max(10, Number(heightCm) || 150);
    const safeDip = Math.max(0, Math.min(Number(initialDipCm) || 0, safeH));

    if (formShape === 'spherical') {
      const safeDiameter = Math.max(10, Number(diameterCm) || 150);
      onAddTank({
        name: name.trim(),
        shape: 'spherical',
        lengthCm: safeDiameter,
        widthCm: safeDiameter,
        heightCm: safeH,
        diameterCm: safeDiameter,
        lastDipCm: safeDip,
        lastUpdatedDate: todayStr
      });
    } else {
      const safeL = Math.max(10, Number(lengthCm) || 200);
      const safeW = Math.max(10, Number(widthCm) || 100);
      onAddTank({
        name: name.trim(),
        shape: 'rectangular',
        lengthCm: safeL,
        widthCm: safeW,
        heightCm: safeH,
        lastDipCm: safeDip,
        lastUpdatedDate: todayStr
      });
    }

    onShapeChange(formShape);
    setName('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Fuel className="w-5 h-5 text-blue-600" />
            <span>مخازن سوخت دیزل {stationName}</span>
          </h2>
          <p className="text-xs text-slate-500">
            انتخاب زیرشاخه مخزن (کروی یا مکعب مستطیل)، مشاهده سطح سوخت و محاسبه آنلاین با اسکن QR
          </p>
        </div>

        {/* Add Tank Button (Only for Super Admin / من) */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => {
              if (isAdding) {
                setIsAdding(false);
              } else {
                handleOpenAddForm(activeShape);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'بستن فرم ثبت' : 'افزودن مخزن سوخت'}</span>
          </button>
        )}
      </div>

      {/* Tank Shape Sub-branches & Visual Symbol Preview */}
      <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-600">
            زیرشاخه مخازن سوخت ({countyName}):
          </span>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => onShapeChange('rectangular')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeShape === 'rectangular'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>مکعب مستطیل ({rectangularTanks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => onShapeChange('spherical')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeShape === 'spherical'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Circle className="w-3.5 h-3.5" />
              <span>کروی ({sphericalTanks.length})</span>
            </button>
          </div>
        </div>

        {/* Graphical White-and-Blue Vessel Indicator for Selected Sub-branch */}
        <div className="bg-slate-50 border border-blue-100 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TankGraphic
              shape={activeShape}
              percentageFull={filteredTanks.length > 0 ? branchFillPercent : 0}
              size="md"
            />
            <div className="space-y-1 text-xs">
              <h3 className="text-sm font-bold text-slate-900">
                {activeShape === 'spherical'
                  ? 'مخزن کروی'
                  : 'مخزن مکعب مستطیل'}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {activeShape === 'spherical'
                  ? 'محاسبه بر اساس قطر داخلی، ارتفاع کل مخزن و ارتفاع سوخت موجود (π × r² × h)'
                  : 'محاسبه بر اساس طول، عرض، ارتفاع کل مخزن و ارتفاع سوخت موجود (L × W × h)'}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-white border border-blue-900 inline-block" />
                  <span>فضای خالی مخزن</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-blue-600 border border-blue-900 inline-block" />
                  <span>میزان سوخت موجود</span>
                </span>
              </div>
            </div>
          </div>

          {filteredTanks.length > 0 && (
            <div className="text-left sm:text-left border-t sm:border-t-0 sm:border-r border-slate-200 pt-2 sm:pt-0 sm:pr-4 shrink-0">
              <span className="text-[11px] text-slate-500 block">مجموع سوخت این زیرشاخه</span>
              <div className="text-lg font-black text-blue-700 font-tabular">
                {branchTotals.current.toLocaleString('fa-IR')} لیتر
              </div>
              <span className="text-[11px] text-slate-500 font-tabular">
                {branchFillPercent.toLocaleString('fa-IR')}٪ از {branchTotals.capacity.toLocaleString('fa-IR')} لیتر
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Inline Add Tank Form */}
      {isSuperAdmin && isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-white border-2 border-blue-500 rounded-xl p-5 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>ثبت مخزن سوخت جدید در {stationName}</span>
            </h3>

            {/* Shape Selector inside Form */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-bold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFormShape('rectangular')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all whitespace-nowrap shrink-0 ${
                  formShape === 'rectangular'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>مکعب مستطیل</span>
              </button>
              <button
                type="button"
                onClick={() => setFormShape('spherical')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all whitespace-nowrap shrink-0 ${
                  formShape === 'spherical'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Circle className="w-3.5 h-3.5" />
                <span>کروی</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              عنوان مخزن سوخت: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={
                formShape === 'spherical'
                  ? 'مثال: مخزن کروی سوخت اضطراری ایستگاه'
                  : 'مثال: مخزن سوخت ژنراتور اضطراری ایستگاه'
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {formShape === 'rectangular' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">طول (سانتی‌متر):</label>
                <input
                  type="number"
                  min="10"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold font-tabular"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">عرض (سانتی‌متر):</label>
                <input
                  type="number"
                  min="10"
                  value={widthCm}
                  onChange={(e) => setWidthCm(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold font-tabular"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">ارتفاع کل مخزن (سانتی‌متر):</label>
                <input
                  type="number"
                  min="10"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold font-tabular"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">ارتفاع سوخت موجود (cm):</label>
                <input
                  type="number"
                  min="0"
                  max={heightCm}
                  value={clampedInitialDip}
                  onChange={(e) => setInitialDipCm(Math.max(0, Math.min(heightCm, Number(e.target.value) || 0)))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold font-tabular"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">قطر مخزن کروی (سانتی‌متر):</label>
                <input
                  type="number"
                  min="10"
                  value={diameterCm}
                  onChange={(e) => setDiameterCm(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold font-tabular"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">ارتفاع کل مخزن (سانتی‌متر):</label>
                <input
                  type="number"
                  min="10"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold font-tabular"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">ارتفاع سوخت موجود (cm):</label>
                <input
                  type="number"
                  min="0"
                  max={heightCm}
                  value={clampedInitialDip}
                  onChange={(e) => setInitialDipCm(Math.max(0, Math.min(heightCm, Number(e.target.value) || 0)))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold font-tabular"
                />
              </div>
            </div>
          )}

          {/* Live Graphical Preview + Capacity */}
          <div className="bg-slate-50 p-3 rounded-lg text-slate-600 flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-3">
              <TankGraphic shape={formShape} percentageFull={previewFillPercent} size="sm" />
              <div className="space-y-0.5">
                <span className="block">
                  ظرفیت کل مخزن ({formShape === 'spherical' ? 'کروی' : 'مکعب مستطیل'}):{' '}
                  <strong className="font-bold text-slate-900 font-tabular">
                    {previewCapacityLiters.toLocaleString('fa-IR')} لیتر
                  </strong>
                </span>
                <span className="block text-slate-500 font-tabular">
                  سطح سوخت اولیه: {previewFillPercent.toLocaleString('fa-IR')}٪ ({clampedInitialDip} از {heightCm} cm)
                </span>
              </div>
            </div>
            <span>ابعاد ثابت می‌مانند و کارشناس در سایت فقط عدد دیپ را می‌زند.</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs whitespace-nowrap"
            >
              ثبت مخزن و صدور QR کد
            </button>
          </div>
        </form>
      )}

      {/* Tanks Cards Grid (Filtered by Active Sub-branch) */}
      {filteredTanks.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
          <div className="flex justify-center">
            <TankGraphic shape={activeShape} percentageFull={0} size="md" />
          </div>
          <p className="text-xs text-slate-500">
            هنوز هیچ مخزن سوخت{' '}
            <strong className="text-slate-700">
              {activeShape === 'spherical' ? 'کروی' : 'مکعب مستطیل'}
            </strong>{' '}
            در {stationName} ثبت نشده است.
          </p>
          {isSuperAdmin && !isAdding && (
            <button
              type="button"
              onClick={() => handleOpenAddForm(activeShape)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>
                افزودن مخزن {activeShape === 'spherical' ? 'کروی' : 'مکعب مستطیل'}
              </span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTanks.map((tank) => {
            const calc = calculateTankVolume(tank, tank.lastDipCm || 0);
            const isSpherical = calc.shape === 'spherical';
            const isConfirmingDelete = pendingDeleteId === tank.id;

            return (
              <div
                key={tank.id}
                className="bg-white rounded-xl border border-blue-100 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                        {isSpherical ? (
                          <Circle className="w-4 h-4" />
                        ) : (
                          <Box className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-blue-700 block">
                          {isSpherical ? 'مخزن کروی' : 'مخزن مکعب مستطیل'}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {tank.name}
                        </h3>
                      </div>
                    </div>

                    {isSuperAdmin && (
                      <div className="shrink-0">
                        {!isConfirmingDelete ? (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(tank.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="حذف مخزن"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px]">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteTank(tank.id);
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

                  {/* Remote Live Volume + White/Blue Graphical Tank Symbol */}
                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-3 mb-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-blue-900 font-bold block">
                        موجودی آنلاین سوخت (از راه دور):
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-blue-700 font-tabular">
                          {calc.currentLiters.toLocaleString('fa-IR')}
                        </span>
                        <span className="text-xs font-bold text-blue-900">لیتر</span>
                      </div>
                      <div className="text-xs flex items-center gap-2 text-slate-600">
                        <span className="font-bold text-slate-800 font-tabular">
                          {calc.percentageFull.toLocaleString('fa-IR')}٪ پر
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[11px] font-tabular">
                          کل {calc.totalCapacityLiters.toLocaleString('fa-IR')} لیتر
                        </span>
                      </div>
                    </div>

                    <TankGraphic
                      shape={calc.shape}
                      percentageFull={calc.percentageFull}
                      size="sm"
                    />
                  </div>

                  {/* Fluid Gauge progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        calc.percentageFull <= 20
                          ? 'bg-rose-500'
                          : calc.percentageFull <= 35
                            ? 'bg-amber-500'
                            : 'bg-blue-600'
                      }`}
                      style={{ width: `${calc.percentageFull}%` }}
                    />
                  </div>

                  {/* Fixed Dimensions row */}
                  <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {isSpherical
                        ? `قطر: ${calc.diameterCm} cm · ارتفاع مخزن: ${calc.heightCm} cm`
                        : `ابعاد: ${tank.lengthCm} × ${tank.widthCm} × ${tank.heightCm} cm`}
                    </span>
                    <span className="font-tabular text-slate-500">
                      ارتفاع سوخت: {tank.lastDipCm || 0} cm
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDipModal(tank)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-2xs transition-colors whitespace-nowrap"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>محاسبه آنلاین و ثبت دیپ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenQr(tank)}
                    title="مشاهده و چاپ بارکد QR ثابت"
                    className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors shrink-0 whitespace-nowrap"
                  >
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span className="hidden sm:inline">کد QR</span>
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
