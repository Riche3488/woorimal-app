import { asChoice } from './choices';
import { localDay } from './growth';
import { distinctAnswers, pickRound } from './picker';
import type { Progress } from './progress';
import type { AppQuestion } from './types';
export function pickQuickRound(bank: AppQuestion[], progress: Progress, {
  now,
  rng
}: {
  now: number;
  rng: () => number;
}): AppQuestion[] {
  const eligible = bank.filter(q => q.kind === 'choice' || q.kind === 'typed' && ['meaning', 'chosung', 'proverb'].includes(q.type));
  const today = localDay(new Date(now));
  const isDue = (q: AppQuestion) => !!progress.stats[q.key]?.box && !!progress.stats[q.key]?.dueDay && progress.stats[q.key].dueDay! <= today;
  const due = eligible.filter(isDue).sort((a, b) => progress.stats[a.key].dueDay!.localeCompare(progress.stats[b.key].dueDay!));
  const fresh = pickRound(eligible.filter(q => !isDue(q)), progress, {
    now,
    rng,
    count: 20
  });
  const out: AppQuestion[] = [];
  const convert = (q: AppQuestion) => asChoice(q, bank, rng);
  for (const q of due) {
    const choice = convert(q);
    if (choice.kind === 'choice') {
      out.push(choice);
      break;
    }
  }
  for (const q of fresh) {
    const choice = convert(q);
    if (choice.kind === 'choice' && distinctAnswers([...out, choice], 6).length > out.length) out.push(choice);
    if (out.length === 5) break;
  }
  return out.length >= 3 ? out : [];
}
