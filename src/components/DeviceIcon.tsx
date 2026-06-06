import type { DeviceType } from '../types/factory';

interface DeviceIconProps {
  type: DeviceType;
  className?: string;
}

const baseProps = (className?: string) => ({
  className,
  viewBox: '0 0 64 64',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

const ring = (cx = 32, cy = 32, outer = 19, inner = 11, width = 3) => (
  <>
    <circle cx={cx} cy={cy} r={outer} strokeWidth={width} />
    <circle cx={cx} cy={cy} r={inner} strokeWidth={width * 0.82} opacity="0.72" />
  </>
);

const smallStock = (y = 51) =>
  [18, 25, 32, 39, 46].map((cx) => <circle key={cx} cx={cx} cy={y} r="2.4" fill="currentColor" strokeWidth="0" />);

export function DeviceIcon({ type, className }: DeviceIconProps) {
  const common = baseProps(className);

  if (type === 'material_source') {
    return (
      <svg {...common}>
        <path d="M13 15h27l-5 16H18L13 15Z" strokeWidth="3" />
        <path d="M23 31h16v10H23V31Z" strokeWidth="2.6" />
        <path d="M42 36h11" strokeWidth="3.2" />
        <path d="M49 31l7 5-7 5" strokeWidth="2.8" />
        <path d="M16 49c5-7 10 7 15 0s10 7 15 0" strokeWidth="2.4" opacity="0.9" />
        {smallStock(54)}
      </svg>
    );
  }

  if (type === 'storage_feeder') {
    return (
      <svg {...common}>
        <path d="M13 12h38l-6 17H19L13 12Z" strokeWidth="3" />
        <path d="M22 29h20v12H22V29Z" strokeWidth="2.8" />
        <path d="M27 41v7M37 41v7" strokeWidth="2.4" />
        {smallStock()}
      </svg>
    );
  }

  if (type === 'assembly_storage') {
    return (
      <svg {...common}>
        <path d="M13 17h38v30H13V17Z" strokeWidth="3" />
        <path d="M32 17v30" strokeWidth="2.4" opacity="0.7" />
        <path d="M20 25h7M20 33h7M20 41h7M37 25h7M37 33h7M37 41h7" strokeWidth="2.2" />
        <circle cx="12" cy="32" r="3" fill="currentColor" strokeWidth="0" />
        <circle cx="52" cy="32" r="3" fill="currentColor" strokeWidth="0" />
      </svg>
    );
  }

  if (type === 'assembly_cleaner') {
    return (
      <svg {...common}>
        <path d="M12 35c5-7 9 7 14 0s9 7 14 0 9 7 14 0" strokeWidth="2.8" />
        <path d="M15 20h31v22H15V20Z" strokeWidth="2.8" />
        <path d="M46 18l8-5M47 27h10M46 36l8 5" strokeWidth="2.4" opacity="0.82" />
        <path d="M22 25h15M22 31h10" strokeWidth="2.2" opacity="0.72" />
      </svg>
    );
  }

  if (type === 'pairing_station') {
    return (
      <svg {...common}>
        <circle cx="19" cy="32" r="11" strokeWidth="3" />
        <circle cx="19" cy="32" r="6" strokeWidth="2" opacity="0.65" />
        <circle cx="43" cy="32" r="11" strokeWidth="3" />
        <circle cx="43" cy="32" r="6" strokeWidth="2" opacity="0.65" />
        <path d="M29 32h6M32 25v14" strokeWidth="2.6" />
        <path d="M49 16l6 6-6 6" strokeWidth="2.4" opacity="0.75" />
      </svg>
    );
  }

  if (type === 'riveting_station') {
    return (
      <svg {...common}>
        <path d="M18 14h28v10H18V14Z" strokeWidth="3" />
        <path d="M32 24v14" strokeWidth="4" />
        <path d="M20 43h24" strokeWidth="3" />
        {ring(32, 43, 10, 5, 2.4)}
      </svg>
    );
  }

  if (type === 'grease_injection') {
    return (
      <svg {...common}>
        {ring(29, 36, 15, 8)}
        <path d="M43 14l7 10-7 10-7-10 7-10Z" strokeWidth="2.8" />
        <path d="M43 34v12" strokeWidth="3" />
        <circle cx="43" cy="50" r="2.8" fill="currentColor" strokeWidth="0" />
      </svg>
    );
  }

  if (type === 'cap_press') {
    return (
      <svg {...common}>
        {ring(32, 34, 15, 8)}
        <path d="M17 17h30M22 17l5 10M42 17l-5 10" strokeWidth="2.8" />
        <path d="M20 50h24" strokeWidth="3" />
      </svg>
    );
  }

  if (type === 'manual_buffer') {
    return (
      <svg {...common}>
        <path d="M12 22h40v18H12V22Z" strokeWidth="3" />
        <path d="M18 40v10M46 40v10" strokeWidth="2.6" />
        {smallStock(31)}
        <path d="M16 15h32" strokeWidth="2.4" opacity="0.7" />
      </svg>
    );
  }

  if (type === 'rust_proof') {
    return (
      <svg {...common}>
        {ring(35, 37, 14, 7)}
        <path d="M12 19h18l-5 9H12V19Z" strokeWidth="2.8" />
        <path d="M30 23h19" strokeWidth="3" />
        <path d="M17 32c4 4 7 4 11 0M13 39c5 5 10 5 15 0" strokeWidth="2.2" opacity="0.72" />
      </svg>
    );
  }

  if (type === 'packing_sink') {
    return (
      <svg {...common}>
        <path d="M14 23l18-9 18 9v24l-18 8-18-8V23Z" strokeWidth="3" />
        <path d="M14 23l18 9 18-9M32 32v23" strokeWidth="2.6" />
        <path d="M23 18l18 9" strokeWidth="2" opacity="0.68" />
      </svg>
    );
  }

  if (type === 'or_grinder') {
    return (
      <svg {...common}>
        <circle cx="30" cy="32" r="20" strokeWidth="3" />
        <circle cx="30" cy="32" r="12" strokeWidth="2.2" opacity="0.62" />
        <circle cx="40" cy="32" r="10" strokeWidth="3" />
        <path d="M40 23c4 4 4 14 0 18" strokeWidth="2" opacity="0.86" />
        <path d="M50 32h7" strokeWidth="2.8" />
        <path d="M52 26l4-3M52 38l4 3" strokeWidth="1.8" opacity="0.72" />
      </svg>
    );
  }

  if (type === 'ir_grinder') {
    return (
      <svg {...common}>
        <circle cx="39" cy="32" r="16" strokeWidth="3" />
        <circle cx="39" cy="32" r="8" strokeWidth="2.2" opacity="0.7" />
        <circle cx="18" cy="32" r="8" strokeWidth="3" />
        <path d="M26 32h7" strokeWidth="2.8" />
        <path d="M16 25c6 3 8 11 4 16" strokeWidth="1.9" opacity="0.82" />
        <path d="M47 23l5 5M47 41l5-5" strokeWidth="2" opacity="0.72" />
      </svg>
    );
  }

  if (type === 'bore_grinder') {
    return (
      <svg {...common}>
        {ring(28, 32, 18, 8)}
        <path d="M28 32h25" strokeWidth="4" />
        <path d="M50 24v16" strokeWidth="2.8" />
        <circle cx="28" cy="32" r="3.4" fill="currentColor" strokeWidth="0" />
      </svg>
    );
  }

  if (type === 'superfinishing' || type === 'small_superfinishing') {
    return (
      <svg {...common}>
        {ring(28, 31, 17, 9)}
        <path d="M42 18l11-4-4 11-12 12-7-7 12-12Z" strokeWidth="2.6" />
        <path d="M14 50c6-7 11 7 17 0s11 7 17 0" strokeWidth="2.4" opacity="0.92" />
      </svg>
    );
  }

  if (
    type === 'general_gauge' ||
    type === 'or_gauge' ||
    type === 'ir_gauge' ||
    type === 'bore_gauge' ||
    type === 'sf_check' ||
    type === 'eddy_check' ||
    type === 'dimension_check' ||
    type === 'flexibility_check' ||
    type === 'vibration_check' ||
    type === 'visual_check'
  ) {
    const isBore = type === 'bore_gauge';
    const isSf = type === 'sf_check' || type === 'vibration_check' || type === 'flexibility_check';
    return (
      <svg {...common}>
        {isSf ? <path d="M12 49c5-8 9 8 14 0s9 8 14 0 9 8 14 0" strokeWidth="2.5" /> : ring(27, 33, isBore ? 17 : 15, isBore ? 7 : 9)}
        <path d="M53 15L38 29" strokeWidth="3" />
        <circle cx="36" cy="31" r="3" fill="currentColor" strokeWidth="0" />
        <path d="M45 15h9v9" strokeWidth="2.4" />
        {type === 'eddy_check' ? <path d="M16 17c7 4 7 10 0 14M22 17c7 4 7 10 0 14" strokeWidth="2.1" opacity="0.75" /> : null}
        {type === 'dimension_check' ? <path d="M12 15h22M12 15v8M34 15v8" strokeWidth="2.2" opacity="0.75" /> : null}
        {type === 'visual_check' ? <path d="M16 18c8-7 22-7 30 0M20 20c5 4 17 4 22 0" strokeWidth="2.2" opacity="0.75" /> : null}
        {isSf ? <path d="M18 25h27M18 33h20" strokeWidth="2.4" opacity="0.7" /> : null}
      </svg>
    );
  }

  if (type === 'spin_dryer') {
    return (
      <svg {...common}>
        <ellipse cx="32" cy="15" rx="17" ry="6" strokeWidth="2.8" />
        <path d="M15 15v30c0 4 8 7 17 7s17-3 17-7V15" strokeWidth="2.8" />
        <path d="M23 23v21M32 24v22M41 23v21" strokeWidth="2" opacity="0.72" />
        <path d="M48 31c4 5 3 11-2 15" strokeWidth="2.4" />
        <path d="M44 45l5 1-1-5" strokeWidth="2.2" />
      </svg>
    );
  }

  if (type === 'finished_sink') {
    return (
      <svg {...common}>
        <path d="M13 18h38v29H13V18Z" strokeWidth="3" />
        <path d="M20 28h16M20 37h10" strokeWidth="2.6" />
        <path d="M38 37l5 5 10-13" strokeWidth="3.2" />
        <path d="M8 33h13M16 27l7 6-7 6" strokeWidth="2.8" />
      </svg>
    );
  }

  if (type === 'robot') {
    return (
      <svg {...common}>
        <path d="M10 15h44" strokeWidth="3" />
        <path d="M21 15v15l11 8 11-8V15" strokeWidth="3" />
        <path d="M26 40l-8 9M38 40l8 9M24 51h16" strokeWidth="2.8" />
        {smallStock(56)}
      </svg>
    );
  }

  if (type === 'conveyor') {
    return (
      <svg {...common}>
        <rect x="10" y="23" width="42" height="18" rx="5" strokeWidth="3" />
        <path d="M16 41l7-11M28 41l7-11M40 41l7-11" strokeWidth="2" opacity="0.72" />
        <path d="M16 32h29M40 25l10 7-10 7" strokeWidth="2.7" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      {ring()}
      <path d="M52 14L39 27" strokeWidth="3" />
    </svg>
  );
}
