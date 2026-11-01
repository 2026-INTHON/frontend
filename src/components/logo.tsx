import { Image } from 'react-native';

// 확정 로고: Righteous "Malo" + o 말풍선 꼬리 + 라임 점 (Figma 「Malo 최종 로고」)
const SRC = { ink: require('../../assets/img/logo-ink.png'), white: require('../../assets/img/logo-white.png') };
const RATIO = 1500 / 468;

export function Logo({ height = 40, tone = 'ink', maxWidth }: { height?: number; tone?: 'ink' | 'white'; maxWidth?: number }) {
  const h = maxWidth == null ? height : Math.min(height, maxWidth / RATIO);
  return <Image source={SRC[tone]} style={{ height: h, width: h * RATIO }} resizeMode="contain" accessibilityRole="image" accessibilityLabel="Malo" />;
}
