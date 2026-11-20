// 가로세로 퍼즐 한 판: 판을 작게 보여 주고, 고른 낱말의 힌트를 보며 낱말을 통째로 입력한다.
// 이미 채워진 칸(엇갈리는 낱말·글자 보기)은 입력 모양(운○○)으로 알려 준다. 초성 보기는 빈칸을 초성으로(운ㄷㅎ) 보여 준다.
// 묶음의 판과 기기에서 만든 조합 퍼즐(save.madeCrosswords)을 같은 화면에서 푼다. 다 풀면 학습 안내를 보여 준다.
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shake } from '../components/art';
import {
  boardChosung, boardLetters, buildGrid, cellKey, CROSSWORD_LEVELS as LEVEL_LABELS, emptyCrossword, entryCells, entryPattern, isComplete, revealLetter, showChosung, solveEntry,
} from '../core/crossword';
import { useGame } from '../state/GameProvider';
import { C, paperCard, R, T } from '../ui/theme';

const GUTTER = 18;

export default function Puzzle() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { pack, save, updateCrossword } = useGame();
  const board = pack.crosswords?.find(b => b.id === id) ?? save.madeCrosswords.find(b => b.id === id);
  const { width } = useWindowDimensions();
  const grid = useMemo(() => (board ? buildGrid(board) : null), [board]);
  const progress = (board && save.crosswords[board.id]) || emptyCrossword();
  const firstOpen = board ? board.entries.findIndex((_, i) => !progress.solved.includes(i)) : -1;
  const [selected, setSelected] = useState(Math.max(0, firstOpen));
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; n: number; grains: number } | null>(null);

  if (!board || !grid) {
    return (
      <SafeAreaView style={s.screen}>
        <Pressable onPress={() => router.back()} style={s.headerPad}><Text style={s.back}>‹ 뒤로</Text></Pressable>
        <Text style={s.empty}>퍼즐을 찾을 수 없어요</Text>
      </SafeAreaView>
    );
  }

  const letters = boardLetters(board, progress);
  const hints = boardChosung(board, progress);
  const done = isComplete(board, progress);
  const entry = board.entries[selected];
  const selectedCells = new Set(entryCells(entry).map(([r, c]) => cellKey(r, c)));
  const cell = Math.floor(Math.min(width - GUTTER * 2, 420) / board.cols);
  const solvedHere = progress.solved.includes(selected);

  const choose = (i: number) => { setSelected(i); setText(''); setFeedback(null); };
  // 칸을 누르면 그 칸의 낱말로. 가로·세로가 겹치는 칸을 다시 누르면 방향을 바꾼다.
  const tapCell = (r: number, c: number) => {
    const g = grid.cells[r][c];
    if (!g) return;
    const both = [g.across, g.down].filter((x): x is number => x !== undefined);
    const next = both.length === 2 && both.includes(selected) ? both.find(x => x !== selected)! : both[0];
    choose(next);
  };
  const submit = () => {
    if (solvedHere || !text.trim()) return;
    const r = solveEntry(board, progress, selected, text);
    setFeedback(f => ({ ok: r.correct, n: (f?.n ?? 0) + 1, grains: r.grains }));
    if (!r.correct) return;
    if (save.settings.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    updateCrossword(board.id, r.progress, r.grains);
    setText('');
    const nextOpen = board.entries.findIndex((_, i) => !r.progress.solved.includes(i));
    if (nextOpen >= 0) setSelected(nextOpen);
  };
  const reveal = () => {
    const next = revealLetter(board, progress, selected);
    if (next !== progress) updateCrossword(board.id, next, 0);
  };
  const chosung = () => {
    const next = showChosung(board, progress, selected);
    if (next !== progress) updateCrossword(board.id, next, 0);
  };
  const chosungShown = progress.chosung?.includes(selected) ?? false;
  const pattern = entryPattern(board, selected, letters, progress);

  const clueList = (dir: 'across' | 'down') => board.entries
    .map((e, i) => ({ e, i }))
    .filter(x => x.e.dir === dir)
    .sort((a, b) => a.e.num - b.e.num);

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={s.back}>‹ 뒤로</Text></Pressable>
        <Text style={s.title} numberOfLines={1}>{board.theme}</Text>
        <Text style={s.level}>{LEVEL_LABELS[board.level]}</Text>
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={[s.grid, { width: cell * board.cols, height: cell * board.rows }]} accessibilityLabel={`${board.rows}×${board.cols} 퍼즐 판`}>
          {grid.cells.map((row, r) => row.map((g, c) => {
            const k = cellKey(r, c);
            if (!g) return <View key={k} style={[s.block, { left: c * cell, top: r * cell, width: cell, height: cell }]} />;
            const ch = letters[k];
            return (
              <Pressable key={k} onPress={() => tapCell(r, c)} accessibilityLabel={`${r + 1}행 ${c + 1}열${ch ? ` ${ch}` : ''}`}
                style={[s.cell, { left: c * cell, top: r * cell, width: cell, height: cell }, selectedCells.has(k) && !done && s.cellOn]}>
                {g.num !== undefined ? <Text style={[s.num, { fontSize: Math.max(8, cell * 0.24) }]}>{g.num}</Text> : null}
                {ch ? <Text style={[s.letter, { fontSize: cell * 0.5 }, progress.revealed[k] && s.letterHelp]}>{ch}</Text>
                  : hints[k] ? <Text style={[s.hint, { fontSize: cell * 0.42 }]}>{hints[k]}</Text> : null}
              </Pressable>
            );
          }))}
        </View>

        {done ? (
          <View style={s.doneCard}>
            <Text style={s.doneTitle}>다 풀었어요!</Text>
            <Text style={s.doneSub}>낱말 {board.entries.length}개 · 힌트 {progress.helps}번</Text>
            {board.intro ? <Text style={s.body}>{board.intro}</Text> : null}
            {board.notes.map(n => (
              <View key={n.title} style={s.note}>
                <Text style={s.noteTitle}>{n.title}</Text>
                <Text style={s.body}>{n.text}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Shake trigger={feedback && !feedback.ok ? feedback.n : 0}>
            <View style={s.input}>
              <Text style={s.clueHead}>{entry.num} {entry.dir === 'across' ? '가로' : '세로'} · {Array.from(entry.answer).length}글자</Text>
              <Text style={s.clue}>{entry.clue}</Text>
              <Text style={s.pattern} accessibilityLabel={`채워진 글자 ${pattern}`}>{pattern}</Text>
              {solvedHere ? <Text style={s.solved}>✓ 푼 낱말이에요</Text> : (
                <>
                  <View style={s.inputRow}>
                    <TextInput value={text} onChangeText={setText} onSubmitEditing={submit} submitBehavior="submit" returnKeyType="done"
                      autoCorrect={false} autoCapitalize="none" placeholder="낱말 입력" placeholderTextColor={C.faint}
                      style={s.field} accessibilityLabel="낱말 입력" />
                    <Pressable onPress={submit} style={s.submit} accessibilityRole="button"><Text style={s.submitText}>확인</Text></Pressable>
                  </View>
                  <View style={s.inputFoot}>
                    <Text style={[s.feedback, { color: feedback?.ok ? C.good : C.bad }]}>
                      {feedback ? (feedback.ok ? `정답! +${feedback.grains}` : '다시 생각해 봐요') : ''}
                    </Text>
                    <View style={s.helps}>
                      {chosungShown ? null : (
                        <Pressable onPress={chosung} hitSlop={8} accessibilityRole="button" accessibilityHint="맞히면 낱알이 3개로 줄어요"><Text style={s.help}>초성 보기</Text></Pressable>
                      )}
                      <Pressable onPress={reveal} hitSlop={8} accessibilityRole="button"><Text style={s.help}>글자 보기</Text></Pressable>
                    </View>
                  </View>
                </>
              )}
            </View>
          </Shake>
        )}

        {(['across', 'down'] as const).map(dir => (
          <View key={dir} style={s.clues}>
            <Text style={s.cluesTitle}>{dir === 'across' ? '가로' : '세로'}</Text>
            {clueList(dir).map(({ e, i }) => {
              const ok = progress.solved.includes(i);
              return (
                <Pressable key={i} onPress={() => choose(i)} accessibilityRole="button" style={[s.clueRow, i === selected && !done && s.clueRowOn]}>
                  <Text style={[s.clueNum, ok && { color: C.good }]}>{ok ? '✓' : e.num}</Text>
                  <Text style={[s.clueText, ok && s.clueTextDone]}>{ok ? `${e.answer} — ` : ''}{e.clue}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
  headerPad: { padding: 20 },
  back: { fontSize: 16, color: C.sub, fontWeight: '700', width: 48 },
  title: { ...T.title, fontSize: 18, flex: 1, textAlign: 'center' },
  level: { fontSize: 12, color: C.accent, fontWeight: '800', width: 48, textAlign: 'right' },
  empty: { fontSize: 15, color: C.sub, textAlign: 'center', marginTop: 40 },
  content: { paddingHorizontal: GUTTER, paddingBottom: 40, gap: 14, alignItems: 'stretch' },
  grid: { alignSelf: 'center', position: 'relative' },
  block: { position: 'absolute' },
  cell: { position: 'absolute', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  cellOn: { backgroundColor: C.grainSoft, borderColor: C.grain },
  num: { position: 'absolute', top: 1, left: 2, color: C.sub, fontWeight: '700' },
  letter: { color: C.ink, fontWeight: '800' },
  letterHelp: { color: C.accent },
  hint: { color: C.faint, fontWeight: '700' },
  input: { ...paperCard, padding: 16, gap: 8 },
  clueHead: { fontSize: 12, color: C.accent, fontWeight: '800' },
  clue: { fontSize: 17, lineHeight: 25, color: C.ink, fontWeight: '600' },
  pattern: { fontSize: 20, letterSpacing: 6, color: C.sub, fontWeight: '800' },
  solved: { fontSize: 14, color: C.good, fontWeight: '800' },
  inputRow: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: R.button, paddingHorizontal: 14, paddingVertical: 10, fontSize: 18, color: C.ink, backgroundColor: C.bg },
  submit: { backgroundColor: C.ink, borderRadius: R.button, paddingHorizontal: 18, justifyContent: 'center' },
  submitText: { color: C.grainLight, fontSize: 16, fontWeight: '800' },
  inputFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedback: { fontSize: 14, fontWeight: '800' },
  helps: { flexDirection: 'row', gap: 16 },
  help: { fontSize: 13, color: C.sub, textDecorationLine: 'underline' },
  doneCard: { ...paperCard, padding: 18, gap: 10, backgroundColor: C.goodSoft },
  doneTitle: { ...T.title, fontSize: 22, color: C.good },
  doneSub: { fontSize: 13, color: C.sub, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 21, color: C.ink },
  note: { gap: 4 },
  noteTitle: { fontSize: 14, fontWeight: '800', color: C.ink },
  clues: { gap: 4 },
  cluesTitle: { ...T.heading, fontSize: 15, marginBottom: 2 },
  clueRow: { flexDirection: 'row', gap: 8, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 10 },
  clueRowOn: { backgroundColor: C.grainSoft },
  clueNum: { width: 22, fontSize: 14, fontWeight: '800', color: C.accent },
  clueText: { flex: 1, fontSize: 14, lineHeight: 20, color: C.ink },
  clueTextDone: { color: C.sub },
});
