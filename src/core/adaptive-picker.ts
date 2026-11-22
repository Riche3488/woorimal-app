import { asChoice, choiceAvailability } from './choices';
import { localDay } from './growth';
import { answerId, distinctAnswers, pickRound } from './picker';
import type { Progress } from './progress';
import type { AppQuestion } from './types';
export function pickAdaptiveRound(bank: AppQuestion[], p: Progress, opts: {
  now: number;
  rng: () => number;
  count: number;
  choiceMode: boolean;
}): AppQuestion[] {
  const {
      now,
      rng,
      count,
      choiceMode
    } = opts,
    available = choiceAvailability(bank);
  const today = localDay(new Date(now));
  const isDue = (q: AppQuestion) => !!p.stats[q.key]?.box && !!p.stats[q.key]?.dueDay && p.stats[q.key].dueDay! <= today;
  const profile = (q: AppQuestion) => p.recentAttempts?.[`${q.type}:${choiceMode && available(q) ? 'choice' : q.kind}`] ?? [];
  if (!bank.some(q => profile(q).length >= 20)) {
    const cold = {
      ...p,
      triesByType: Object.fromEntries(bank.map(q => [q.type, 0]))
    };
    const firstDue = count === 5 ? bank.find(isDue) : undefined;
    const pool = count === 5 ? bank.filter(q => !isDue(q) || q === firstDue) : bank;
    const gentle = pool.filter(q => q.level !== 'hard');
    return pickRound(gentle.length ? gentle : pool, cold, {
      now,
      rng,
      count
    }).map(q => choiceMode ? asChoice(q, bank, rng) : q);
  }
  const latency = (q: AppQuestion) => {
    const history = profile(q);
    if (history.length < 10) return 0;
    const times = history.filter(a => a.key === q.key && a.correct).map(a => a.elapsedMs).sort((a, b) => a - b);
    return times.length ? times[Math.floor(times.length / 2)] : 0;
  };
  const due = distinctAnswers(bank.filter(q => p.stats[q.key]?.box && p.stats[q.key]?.dueDay && p.stats[q.key].dueDay! <= today).sort((a, b) => p.stats[a.key].dueDay!.localeCompare(p.stats[b.key].dueDay!) || latency(b) - latency(a)), count === 5 ? 1 : Math.min(2, count));
  const chosen = [...due],
    taken = new Set(chosen.map(answerId));
  const groups: AppQuestion[][] = [[], [], []];
  for (const q of bank) {
    if (taken.has(answerId(q)) || isDue(q)) continue;
    const h = profile(q),
      rate = h.length ? h.filter(a => a.correct).length / h.length : 0;
    if (q.level === 'hard') {
      if (h.length >= 20 && rate >= .85) groups[2].push(q);
    } else if (q.easy) groups[0].push(q);else groups[1].push(q);
  }
  const need = Math.max(0, count - chosen.length),
    raw = [need * .3, need * .5, need * .2],
    quota = raw.map(Math.floor);
  const order = [0, 1, 2].sort((a, b) => raw[b] - quota[b] - (raw[a] - quota[a]) || a - b);
  for (let i = 0, left = need - quota.reduce((a, b) => a + b, 0); i < left; i++) quota[order[i % 3]]++;
  const take = (pool: AppQuestion[], n: number) => {
    const qs = pickRound(pool.filter(q => !taken.has(answerId(q))), p, {
      now,
      rng,
      count: n
    });
    for (const q of qs) {
      taken.add(answerId(q));
      chosen.push(q);
    }
  };
  for (let i = 0; i < 3; i++) take(groups[i], quota[i]);
  for (let i = 0; i < 3 && chosen.length < count; i++) take(groups[i], count - chosen.length);
  // Keep the opening forgiving while mixing the selected buckets through the round.
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }
  return chosen.map(q => choiceMode ? asChoice(q, bank, rng) : q);
}
