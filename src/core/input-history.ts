export function undoGaps(history: boolean[][]): boolean[][] {
  return history.length > 1 ? history.slice(0, -1) : history;
}
