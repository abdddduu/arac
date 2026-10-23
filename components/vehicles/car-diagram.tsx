import {
  PANEL_LABELS_TR,
  PANEL_STATE_COLORS,
  PANEL_STATE_LABELS_TR,
  type PanelCode,
  type PanelState,
} from '@/lib/status-rules';

type PanelsRecord = Record<PanelCode, PanelState>;

type Region = {
  code: PanelCode;
  shape: 'rect' | 'path';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rx?: number;
  d?: string;
};

const REGIONS: Region[] = [
  { code: 'front_bumper', shape: 'rect', x: 32, y: 8, width: 136, height: 24, rx: 12 },
  { code: 'hood', shape: 'rect', x: 38, y: 36, width: 124, height: 58, rx: 8 },
  { code: 'front_left_fender', shape: 'rect', x: 12, y: 36, width: 26, height: 58, rx: 7 },
  { code: 'front_right_fender', shape: 'rect', x: 162, y: 36, width: 26, height: 58, rx: 7 },
  { code: 'front_left_door', shape: 'rect', x: 14, y: 106, width: 26, height: 78, rx: 7 },
  { code: 'front_right_door', shape: 'rect', x: 160, y: 106, width: 26, height: 78, rx: 7 },
  { code: 'roof', shape: 'rect', x: 44, y: 98, width: 112, height: 172, rx: 26 },
  { code: 'rear_left_door', shape: 'rect', x: 14, y: 188, width: 24, height: 82, rx: 7 },
  { code: 'rear_right_door', shape: 'rect', x: 162, y: 188, width: 24, height: 82, rx: 7 },
  { code: 'trunk', shape: 'rect', x: 38, y: 272, width: 124, height: 56, rx: 8 },
  { code: 'rear_left_fender', shape: 'rect', x: 12, y: 274, width: 26, height: 54, rx: 7 },
  { code: 'rear_right_fender', shape: 'rect', x: 162, y: 274, width: 26, height: 54, rx: 7 },
  { code: 'rear_bumper', shape: 'rect', x: 32, y: 332, width: 136, height: 24, rx: 12 },
];

export function CarDiagram({
  panels,
  onPanelClick,
  size = 180,
}: {
  panels: PanelsRecord;
  onPanelClick?: (code: PanelCode) => void;
  size?: number;
}) {
  const height = Math.round(size * 1.78);
  return (
    <svg
      viewBox="0 0 200 380"
      width={size}
      height={height}
      role="img"
      aria-label="Araç panel diyagramı"
      className="select-none"
    >
      <rect
        x="8"
        y="4"
        width="184"
        height="372"
        rx="44"
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="3"
      />
      {REGIONS.map((region) => {
        const state = panels[region.code];
        const fill = PANEL_STATE_COLORS[state];
        const common = {
          fill,
          stroke: '#ffffff',
          strokeWidth: 2,
          cursor: onPanelClick ? 'pointer' : 'default',
          onClick: onPanelClick ? () => onPanelClick(region.code) : undefined,
        };
        return (
          <g key={region.code} {...(typeof common.onClick === 'function' ? { onClick: common.onClick } : {})}>
            {region.shape === 'rect' ? (
              <rect
                x={region.x}
                y={region.y}
                width={region.width}
                height={region.height}
                rx={region.rx}
                fill={fill}
                stroke="#ffffff"
                strokeWidth={2}
                style={{ cursor: onPanelClick ? 'pointer' : 'default' }}
              >
                <title>
                  {PANEL_LABELS_TR[region.code]} · {PANEL_STATE_LABELS_TR[state]}
                </title>
              </rect>
            ) : (
              <path d={region.d} fill={fill} stroke="#ffffff" strokeWidth={2}>
                <title>
                  {PANEL_LABELS_TR[region.code]} · {PANEL_STATE_LABELS_TR[state]}
                </title>
              </path>
            )}
          </g>
        );
      })}
    </svg>
  );
}
