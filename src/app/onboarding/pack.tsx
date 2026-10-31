import { Redirect } from 'expo-router';

// Keep existing links working; Korean is the only active learning pack.
export default function Pack() {
  return <Redirect href="/onboarding/lang" />;
}
