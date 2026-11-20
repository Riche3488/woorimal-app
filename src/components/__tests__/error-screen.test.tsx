import { fireEvent, render, screen } from '@testing-library/react-native';
import { ErrorScreen } from '../ErrorScreen';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...a: unknown[]) => mockReplace(...a) } }));

test('ErrorScreen: 앱을 끄지 않고 다시 시도·처음으로를 보인다', async () => {
  const retry = jest.fn(async () => {});
  await render(<ErrorScreen error={new Error('boom')} retry={retry} />);
  expect(screen.getByText('문제가 생겼어요')).toBeTruthy();

  await fireEvent.press(screen.getByText('다시 시도'));
  expect(retry).toHaveBeenCalledTimes(1);

  await fireEvent.press(screen.getByText('처음으로'));
  expect(mockReplace).toHaveBeenCalledWith('/');
  expect(retry).toHaveBeenCalledTimes(2);
});
