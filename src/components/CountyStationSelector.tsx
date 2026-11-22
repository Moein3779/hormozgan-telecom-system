import React, { useState } from 'react';
import { Building2, Plus, MapPin, Check, Trash2 } from 'lucide-react';
import { CountyId, Station, UserRole } from '../types';
import { COUNTIES, PROVINCE_NAME } from '../utils/storage';

interface CountyStationSelectorProps {
  selectedCountyId: CountyId;
  onSelectCounty: (id: CountyId) => void;
  stations: Station[];
  selectedStationId: string;
  onSelectStation: (id: string) => void;
  onAddStation: (countyId: CountyId, name: string) => void;
  onDeleteStation?: (stationId: string) => void;
  currentRole: UserRole;
}

export const CountyStationSelector: React.FC<CountyStationSelectorProps> = ({
  selectedCountyId,
  onSelectCounty,
  stations,
  selectedStationId,
  onSelectStation,
  onAddStation,
  onDeleteStation,
  currentRole
}) => {
  const [isAddingStation, setIsAddingStation] = useState(false);
  const [newStationName, setNewStationName] = useState('');

  const countyStations = stations.filter(s => s.countyId === selectedCountyId);
  const isSuperAdmin = currentRole === 'super_admin';

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStationName.trim()) return;
    onAddStation(selectedCountyId, newStationName.trim());
    setNewStationName('');
    setIsAddingStation(false);
  };

  return (
    <div className="bg-white rounded-xl border border-blue-100 p-4 sm:p-5 shadow-xs space-y-4" dir="rtl">
      {/* County Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>مرکز نگهداری / شهرستان:</span>
        </div>

        {/* 3 Counties Segmented Control */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-bold">
          {COUNTIES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onSelectCounty(c.id);
                // auto select first station of that county if available
                const first = stations.find(s => s.countyId === c.id);
                if (first) onSelectStation(first.id);
              }}
              className={`px-3.5 py-1.5 rounded-md transition-all whitespace-nowrap ${
                selectedCountyId === c.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stations inside Selected County */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-semibold whitespace-nowrap">
            ایستگاه‌ها:
          </span>

          {countyStations.length === 0 ? (
            <span className="text-slate-400 text-xs italic">
              هنوز ایستگاهی در این مرکز ثبت نشده است.
            </span>
          ) : (
            countyStations.map((station) => (
              <button
                key={station.id}
                onClick={() => onSelectStation(station.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap shrink-0 ${
                  selectedStationId === station.id
                    ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{station.name}</span>
                {selectedStationId === station.id && (
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Add Station Button (For Super Admin / من) */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            {!isAddingStation ? (
              <button
                onClick={() => setIsAddingStation(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن ایستگاه</span>
              </button>
            ) : (
              <form onSubmit={handleAddSubmit} className="flex items-center gap-1.5 text-xs">
                <input
                  type="text"
                  placeholder="نام ایستگاه (مثلاً ایستگاه امام علی)"
                  value={newStationName}
                  onChange={(e) => setNewStationName(e.target.value)}
                  autoFocus
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500"
                >
                  ثبت
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingStation(false)}
                  className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
