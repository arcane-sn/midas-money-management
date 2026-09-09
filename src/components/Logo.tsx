import { Text } from 'react-native';
import { colors, fonts } from '@/theme';

interface LogoProps {
  size?: number;
}

export function Logo({ size = 26 }: LogoProps) {
  return <Text style={{ fontFamily: fonts.logo, fontSize: size, color: colors.ink }}>Midas</Text>;
}
