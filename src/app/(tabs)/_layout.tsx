import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../../components/ui';
import { C } from '../../lib/theme';
import { useServerRecords } from '../../lib/sync';
import { useT } from '../../lib/i18n';

const ICON: Record<string, keyof typeof Feather.glyphMap> = { home: 'home', mistakes: 'book', stats: 'bar-chart-2' };
const LABEL: Record<string, string> = { home: '홈', mistakes: '복습 노트', stats: '내 기록' };

export default function TabsLayout() {
  useServerRecords(); // 코인·기록·오답은 서버 값 우선
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => <Bar state={state} go={navigateToTab} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="mistakes" />
      <Tabs.Screen name="stats" />
    </Tabs>
  );
}

function Bar({ state, go }: { state: any; go: (key: string) => void }) {
  const ins = useSafeAreaInsets();
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6, paddingBottom: ins.bottom + 4 }}>
      {state.routes.map((r: any, i: number) => {
        const on = state.index === i;
        return (
          <Pressable key={r.key} onPress={() => go(r.key)} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <Feather name={ICON[r.name]} size={19} color={on ? C.ink : C.sub} />
            <T s="small" style={{ fontSize: 11, lineHeight: 15, color: on ? C.ink : C.sub, fontFamily: on ? 'NotoSansKR_700Bold' : 'NotoSansKR_500Medium' }}>{t(LABEL[r.name])}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
