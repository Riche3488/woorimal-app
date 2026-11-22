import { fireEvent, render, screen } from '@testing-library/react-native';
import { DailyMission } from '../DailyMission';
test('daily_mission_displays_units_and_finishes_without_required_review', async () => {
  const start = jest.fn();
  const view = await render(<DailyMission progress={{
    learned: 3,
    milestones: 2,
    complete: false
  }} due={0} tomorrow={2} onStart={start} />);
  expect(screen.getByText('오늘 3/5개 · 목표 2/3단계')).toBeTruthy();
  await fireEvent.press(screen.getByText('가볍게 5문제'));
  expect(start).toHaveBeenCalledTimes(1);
  await view.rerender(<DailyMission progress={{
    learned: 5,
    milestones: 3,
    complete: true
  }} due={0} tomorrow={2} onStart={start} />);
  expect(screen.getByText('오늘 목표 달성! 내일 또 만나요')).toBeTruthy();
  expect(screen.getByText('내일 복습 2개')).toBeTruthy();
});
