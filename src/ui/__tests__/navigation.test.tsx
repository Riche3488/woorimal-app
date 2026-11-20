// 결과 화면의 "홈"이 홈을 새로 쌓지 않고 처음 홈으로 돌아가는지(쌓이면 홈 영상 플레이어가 판마다 늘어 영상·그림이 멈춘다).
import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { goHome } from '../navigation';

const stackNames = () => {
  const root: any = (screen as unknown as { getRouterState(): unknown }).getRouterState();
  return root.routes[0].state.routes.map((r: any) => r.name);
};

test('판을 여러 번 끝내고 홈으로 가도 스택에는 홈 하나만', async () => {
  await renderRouter({ index: () => <Text>home</Text>, play: () => <Text>play</Text>, result: () => <Text>result</Text> }, { initialUrl: '/' });
  for (let i = 0; i < 3; i++) {
    await act(() => router.push('/play'));
    await act(() => router.replace('/result'));
    await act(() => goHome());
  }
  expect(stackNames()).toEqual(['index']);
  expect(screen.getByText('home')).toBeTruthy();
});

test('홈이 스택에 없을 때(결과 화면으로 바로 열린 경우)도 홈으로 간다', async () => {
  await renderRouter({ index: () => <Text>home</Text>, result: () => <Text>result</Text> }, { initialUrl: '/result' });
  await act(() => goHome());
  expect(screen.getByText('home')).toBeTruthy();
});
