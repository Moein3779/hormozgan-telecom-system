import React, { useId } from 'react';
import { TankShape } from '../types';

interface TankGraphicProps {
  shape: TankShape;
  percentageFull: number;
  dipCm?: number;
  heightCm?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const TankGraphic: React.FC<TankGraphicProps> = ({
  shape,
  percentageFull,
  dipCm,
  heightCm,
  size = 'md'
}) => {
  const uid = useId().replace(/:/g, '');
  const clampedPct = Math.max(0, Math.min(100, percentageFull));

  const dimensionsClass =
    size === 'sm'
      ? 'w-20 h-20'
      : size === 'lg'
        ? 'w-44 h-40'
        : 'w-28 h-24';

  if (shape === 'spherical') {
    // Circular/spherical vessel centered at (80, 74) with radius 54
    const cx = 80;
    const cy = 74;
    const r = 54;
    const bottomY = cy + r; // 128
    const totalDiameterPx = r * 2; // 108
    const fillHeightPx = (clampedPct / 100) * totalDiameterPx;
    const fillTopY = bottomY - fillHeightPx;

    // Horizontal half-chord width at fillTopY to draw a realistic 3D liquid surface ellipse
    const dy = fillTopY - cy;
    const chordHalfWidth =
      Math.abs(dy) < r ? Math.sqrt(Math.max(0, r * r - dy * dy)) : 0;

    return (
      <div className={`relative flex items-center justify-center shrink-0 ${dimensionsClass}`}>
        <svg
          viewBox="0 0 160 150"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label={`نمای مخزن کروی (${clampedPct} درصد پر)`}
        >
          <defs>
            <clipPath id={`sphere-clip-${uid}`}>
              <circle cx={cx} cy={cy} r={r} />
            </clipPath>
            <linearGradient id={`sphere-fuel-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>

          {/* Subtle tank support legs */}
          <path
            d="M 52 121 L 46 140 M 108 121 L 114 140 M 40 140 L 120 140"
            stroke="#94A3B8"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {/* Top nozzle */}
          <rect
            x="72"
            y="11"
            width="16"
            height="10"
            rx="2"
            fill="#FFFFFF"
            stroke="#1E3A8A"
            strokeWidth="2.2"
          />

          {/* Empty white spherical body */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="#FFFFFF"
            stroke="#1E3A8A"
            strokeWidth="2.5"
          />

          {/* Blue fuel region clipped inside sphere */}
          <g clipPath={`url(#sphere-clip-${uid})`}>
            {clampedPct > 0 && (
              <>
                <rect
                  x={cx - r - 2}
                  y={fillTopY}
                  width={totalDiameterPx + 4}
                  height={fillHeightPx + 4}
                  fill={`url(#sphere-fuel-${uid})`}
                  className="transition-all duration-300"
                />
                {clampedPct < 99 && chordHalfWidth > 4 && (
                  <ellipse
                    cx={cx}
                    cy={fillTopY}
                    rx={chordHalfWidth}
                    ry={Math.min(7, chordHalfWidth * 0.16)}
                    fill="#60A5FA"
                    stroke="#1D4ED8"
                    strokeWidth="1"
                  />
                )}
              </>
            )}
          </g>

          {/* Subtle meridian contour + crisp outer sphere border */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={22}
            ry={r}
            fill="none"
            stroke={clampedPct > 55 ? 'rgba(255,255,255,0.28)' : 'rgba(148,163,184,0.35)'}
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#1E3A8A"
            strokeWidth="2.5"
          />
        </svg>

        {size === 'lg' && dipCm !== undefined && heightCm !== undefined && (
          <div className="absolute -bottom-1 bg-white/95 border border-blue-200 rounded-md px-2 py-0.5 text-[10px] font-bold text-blue-950 font-tabular shadow-2xs whitespace-nowrap">
            {dipCm} از {heightCm} cm ({clampedPct.toLocaleString('fa-IR')}٪)
          </div>
        )}
      </div>
    );
  }

  // Rectangular cuboid 3D isometric-style tank graphic (white empty body + blue fuel fill)
  // Front face: x: 24..116 (width 92), y: 34..128 (height 94)
  // 3D depth offset: dx = +22, dy = -16
  const frontX = 24;
  const frontW = 92;
  const frontTopY = 34;
  const frontBottomY = 128;
  const frontH = frontBottomY - frontTopY; // 94
  const dx = 22;
  const dy = -16;

  const fillH = (clampedPct / 100) * frontH;
  const fillTopY = frontBottomY - fillH;

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${dimensionsClass}`}>
      <svg
        viewBox="0 0 160 150"
        className="w-full h-full overflow-visible"
        role="img"
        aria-label={`نمای مخزن مکعب مستطیل (${clampedPct} درصد پر)`}
      >
        <defs>
          <linearGradient id={`rect-fuel-front-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>

        {/* Tank top face (white) */}
        <polygon
          points={`${frontX},${frontTopY} ${frontX + dx},${frontTopY + dy} ${frontX + frontW + dx},${frontTopY + dy} ${frontX + frontW},${frontTopY}`}
          fill="#FFFFFF"
          stroke="#1E3A8A"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Tank right side face (empty white/slate tint) */}
        <polygon
          points={`${frontX + frontW},${frontTopY} ${frontX + frontW + dx},${frontTopY + dy} ${frontX + frontW + dx},${frontBottomY + dy} ${frontX + frontW},${frontBottomY}`}
          fill="#F8FAFC"
          stroke="#1E3A8A"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Tank front face (empty white) */}
        <rect
          x={frontX}
          y={frontTopY}
          width={frontW}
          height={frontH}
          fill="#FFFFFF"
          stroke="#1E3A8A"
          strokeWidth="2.2"
        />

        {/* Blue Fuel Volume up to dip percentage */}
        {clampedPct > 0 && (
          <g>
            {/* Fuel top surface inside tank */}
            {clampedPct < 99.5 && (
              <polygon
                points={`${frontX},${fillTopY} ${frontX + dx},${fillTopY + dy} ${frontX + frontW + dx},${fillTopY + dy} ${frontX + frontW},${fillTopY}`}
                fill="#60A5FA"
                stroke="#1D4ED8"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            )}

            {/* Fuel right side depth face */}
            <polygon
              points={`${frontX + frontW},${fillTopY} ${frontX + frontW + dx},${fillTopY + dy} ${frontX + frontW + dx},${frontBottomY + dy} ${frontX + frontW},${frontBottomY}`}
              fill="#1D4ED8"
              stroke="#1E3A8A"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Fuel front face */}
            <rect
              x={frontX}
              y={fillTopY}
              width={frontW}
              height={fillH}
              fill={`url(#rect-fuel-front-${uid})`}
              stroke="#1E3A8A"
              strokeWidth="1.8"
            />
          </g>
        )}

        {/* Crisp outer frame re-stroke so borders remain sharp */}
        <rect
          x={frontX}
          y={frontTopY}
          width={frontW}
          height={frontH}
          fill="none"
          stroke="#1E3A8A"
          strokeWidth="2.3"
        />
        <polygon
          points={`${frontX + frontW},${frontTopY} ${frontX + frontW + dx},${frontTopY + dy} ${frontX + frontW + dx},${frontBottomY + dy} ${frontX + frontW},${frontBottomY}`}
          fill="none"
          stroke="#1E3A8A"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />

        {/* Level gauge tick marks on the left edge */}
        <line x1="16" y1={frontTopY} x2="21" y2={frontTopY} stroke="#64748B" strokeWidth="1.5" />
        <line x1="16" y1={(frontTopY + frontBottomY) / 2} x2="21" y2={(frontTopY + frontBottomY) / 2} stroke="#64748B" strokeWidth="1.5" />
        <line x1="16" y1={frontBottomY} x2="21" y2={frontBottomY} stroke="#64748B" strokeWidth="1.5" />
      </svg>

      {size === 'lg' && dipCm !== undefined && heightCm !== undefined && (
        <div className="absolute -bottom-1 bg-white/95 border border-blue-200 rounded-md px-2 py-0.5 text-[10px] font-bold text-blue-950 font-tabular shadow-2xs whitespace-nowrap">
          {dipCm} از {heightCm} cm ({clampedPct.toLocaleString('fa-IR')}٪)
        </div>
      )}
    </div>
  );
};
