import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

const STROKE = 2.2;

export function HomeIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11L12 4l8 7" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 10v9h5v-6h2v6h5v-9" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function AccountsIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="6" width="18" height="13" rx="0" stroke={color} strokeWidth={STROKE} />
      <Path d="M3 10h18" stroke={color} strokeWidth={STROKE} />
      <Circle cx="17" cy="14.5" r="1.4" fill={color} />
    </Svg>
  );
}

export function BudgetsIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={STROKE} />
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={STROKE} />
      <Circle cx="12" cy="12" r="0.9" fill={color} />
    </Svg>
  );
}

export function LedgerIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 8h11M13 5l3 3-3 3" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 16H8M11 13l-3 3 3 3" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SettingsIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h10M18 7h2" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Circle cx="14" cy="7" r="2.2" stroke={color} strokeWidth={STROKE} />
      <Path d="M4 17h2M10 17h10" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Circle cx="7.5" cy="17" r="2.2" stroke={color} strokeWidth={STROKE} />
    </Svg>
  );
}
