import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from '../state/GameProvider';
import { C } from '../ui/theme';

const Loading = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
    <ActivityIndicator color={C.grain} />
  </View>
);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <GameProvider fallback={<Loading />}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade' }}>
          <Stack.Screen name="play" options={{ gestureEnabled: false }} />
          <Stack.Screen name="result" options={{ gestureEnabled: false }} />
        </Stack>
      </GameProvider>
    </SafeAreaProvider>
  );
}
