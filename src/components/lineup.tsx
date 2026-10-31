import { useState } from 'react';
import { Image, View } from 'react-native';
import { CHARACTERS, IMG } from '../lib/data';

// 캐릭터 4명을 같은 키로 나란히 (이미지마다 가로세로 비율이 달라서 비율대로 폭을 정해요)
const RATIO: Record<string, number> = { seoyun: 261 / 862, boss: 286 / 866, junho: 342 / 871, prof: 302 / 854 };
const OVERLAP = 0.1; // 옆 사람과 살짝 겹치기

export function Lineup({ fill = 0.92 }: { fill?: number }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const sum = CHARACTERS.reduce((a, c) => a + RATIO[c.id], 0);
  const H = Math.min(box.h * fill, box.w / (sum * (1 - OVERLAP)));
  return (
    <View onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' }}>
      {H > 0
        ? CHARACTERS.map((c) => {
            const w = H * RATIO[c.id];
            return <Image key={c.id} source={IMG.char[c.id]} style={{ width: w, height: H, marginHorizontal: (-w * OVERLAP) / 2 }} resizeMode="contain" />;
          })
        : null}
    </View>
  );
}
