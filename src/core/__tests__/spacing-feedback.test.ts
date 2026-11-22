import { spacingFeedback } from '../spacing-feedback';
test('accepts_every_allowed_spacing_answer', () => {
  expect(spacingFeedback([true, false], ['가 나다', '가나 다']).wrongIndices).toEqual([]);
  expect(spacingFeedback([false, true], ['가 나다', '가나 다']).wrongIndices).toEqual([]);
});
test('chooses_nearest_allowed_answer_and_preserves_punctuation_indices', () => {
  expect(spacingFeedback([false, false], ['가 나다', '가나 다'])).toEqual({
    target: [true, false],
    wrongIndices: [0]
  });
  expect(spacingFeedback([false, false, true], ['가. 나다'])).toEqual({
    target: [false, true, false],
    wrongIndices: [1, 2]
  });
});
