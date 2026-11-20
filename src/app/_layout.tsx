import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from '../state/GameProvider';
import { C, FONT } from '../ui/theme';

const Loading = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
    <ActivityIndicator color={C.grain} />
  </View>
);

export default function RootLayout() {
  // 글꼴을 못 읽어도(오류) 시스템 글꼴로 계속 연다.
  const [fontsLoaded, fontError] = useFonts({ [FONT.display]: require('../../assets/fonts/GowunBatang-Bold.ttf') });
  if (!fontsLoaded && !fontError) return <Loading />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <GameProvider fallback={<Loading />}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade' }}>
          <Stack.Screen name="play" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="result" options={{ gestureEnabled: false, animation: 'fade_from_bottom' }} />
        </Stack>
      </GameProvider>
    </SafeAreaProvider>
  );
}
