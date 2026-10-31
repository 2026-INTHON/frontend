import { Redirect } from 'expo-router';

// 챕터 완료 알림 주소(/chapters?...)로 들어오면 에피소드 목록에서 다시 확인해요
export default function ChaptersRedirect() {
  return <Redirect href="/episodes" />;
}
