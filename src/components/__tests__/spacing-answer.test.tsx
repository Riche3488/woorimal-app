import { fireEvent, render, screen } from '@testing-library/react-native';
import { SpacingAnswer } from '../answers';

const layout = (width: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 40 } } });
const tapAt = (locationX: number) => ({ nativeEvent: { locationX, locationY: 20 } });

describe('SpacingAnswer', () => {
  test('undo and reset restore only edited gaps, with an accessible selected-position control', async () => {
    const onSubmit=jest.fn();
    await render(<SpacingAnswer syllables={['가','나','다']} onSubmit={onSubmit} disabled={false}/>);
    await fireEvent.press(screen.getByLabelText('1번째 글자 뒤 띄우기'));
    await fireEvent.press(screen.getByLabelText('2번째 글자 뒤 띄우기'));
    await fireEvent.press(screen.getByText('되돌리기'));
    await fireEvent.press(screen.getByText('확인'));
    expect(onSubmit).toHaveBeenLastCalledWith([true,false]);
    await fireEvent.press(screen.getByText('처음으로'));
    await fireEvent.press(screen.getByText('확인'));
    expect(onSubmit).toHaveBeenLastCalledWith([false,false]);
    expect(screen.getByText('선택한 자리 바꾸기')).toBeTruthy();
  });
  test('처음엔 모든 자리가 붙어 있고, 누른 자리만 띄워서 낸다', async () => {
    const onSubmit = jest.fn();
    await render(<SpacingAnswer syllables={['몇', '날', '며', '칠']} onSubmit={onSubmit} disabled={false} />);

    const gaps = screen.getAllByLabelText(/번째 글자 뒤 띄우기/);
    expect(gaps).toHaveLength(3);
    gaps.forEach(g => expect(g).not.toBeSelected());
    expect(screen.queryAllByText('∨')).toHaveLength(0);

    await fireEvent.press(gaps[1]);
    expect(screen.getByLabelText('2번째 글자 뒤 띄우기')).toBeSelected();
    expect(screen.getAllByText('∨')).toHaveLength(1);

    await fireEvent.press(screen.getByText('확인'));
    expect(onSubmit).toHaveBeenCalledWith([false, true, false]);
  });

  test('띄운 자리를 다시 누르면 붙는다', async () => {
    const onSubmit = jest.fn();
    await render(<SpacingAnswer syllables={['가', '나']} onSubmit={onSubmit} disabled={false} />);
    const gap = screen.getByLabelText('1번째 글자 뒤 띄우기');
    await fireEvent.press(gap);
    await fireEvent.press(gap);
    expect(screen.getByLabelText('1번째 글자 뒤 띄우기')).not.toBeSelected();
    await fireEvent.press(screen.getByText('확인'));
    expect(onSubmit).toHaveBeenCalledWith([false]);
  });

  test('글자 오른쪽 절반을 누르면 뒤 자리, 왼쪽 절반을 누르면 앞 자리가 띄워진다', async () => {
    const onSubmit = jest.fn();
    // 좁은 문장부호 옆에서도 이웃 자리가 아니라 누른 쪽 자리가 바뀌어야 한다.
    await render(<SpacingAnswer syllables={['다', '.', '그']} onSubmit={onSubmit} disabled={false} />);
    const dot = screen.getByTestId('syllable-1');
    await fireEvent(dot, 'layout', layout(8));

    await fireEvent.press(dot, tapAt(2)); // 왼쪽 절반 → '다' 뒤
    expect(screen.getByLabelText('1번째 글자 뒤 띄우기')).toBeSelected();
    expect(screen.getByLabelText('2번째 글자 뒤 띄우기')).not.toBeSelected();

    await fireEvent.press(dot, tapAt(6)); // 오른쪽 절반 → '.' 뒤
    expect(screen.getByLabelText('2번째 글자 뒤 띄우기')).toBeSelected();

    await fireEvent.press(screen.getByText('확인'));
    expect(onSubmit).toHaveBeenCalledWith([true, true]);
  });

  test('첫 글자와 끝 글자는 어디를 눌러도 하나뿐인 이웃 자리를 바꾼다', async () => {
    const onSubmit = jest.fn();
    await render(<SpacingAnswer syllables={['가', '나', '다']} onSubmit={onSubmit} disabled={false} />);
    const first = screen.getByTestId('syllable-0');
    const last = screen.getByTestId('syllable-2');
    await fireEvent(first, 'layout', layout(28));
    await fireEvent(last, 'layout', layout(28));
    await fireEvent.press(first, tapAt(3));
    await fireEvent.press(last, tapAt(25));
    await fireEvent.press(screen.getByText('확인'));
    expect(onSubmit).toHaveBeenCalledWith([true, true]);
  });

  test('disabled이면 자리를 바꾸지도 내지도 않는다', async () => {
    const onSubmit = jest.fn();
    await render(<SpacingAnswer syllables={['가', '나']} onSubmit={onSubmit} disabled />);
    await fireEvent.press(screen.getByLabelText('1번째 글자 뒤 띄우기'));
    await fireEvent.press(screen.getByTestId('syllable-0'), tapAt(20));
    expect(screen.getByLabelText('1번째 글자 뒤 띄우기')).not.toBeSelected();
    await fireEvent.press(screen.getByText('확인'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
