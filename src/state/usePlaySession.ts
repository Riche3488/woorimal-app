import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { reduceSession, type SessionAction, type SessionSnapshot } from '../core/session';
import { recordExperienceEvent } from '../data/experience-events';
export function usePlaySession(initial: SessionSnapshot, checkpoint?: (s: SessionSnapshot) => Promise<SessionSnapshot | void>) {
  const [session, setSession] = useState(initial);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const current = useRef(initial),
    status = useRef(saveStatus),
    mounted = useRef(true);
  const write = useRef(checkpoint);
  write.current = checkpoint;
  const pending = useRef<SessionSnapshot | null>(null),
    busy = useRef(false);
  const running = useRef<Promise<void>>(Promise.resolve());
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchor = useRef(performance.now());
  const publishStatus = (next: typeof saveStatus) => {
    status.current = next;
    if (mounted.current) setSaveStatus(next);
  };
  const enqueue = useCallback((snapshot: SessionSnapshot): Promise<void> => {
    if (!write.current) return Promise.resolve();
    if (!pending.current || snapshot.revision >= pending.current.revision) pending.current = snapshot;
    if (busy.current) return running.current;
    busy.current = true;
    publishStatus('saving');
    running.current = (async () => {
      try {
        while (pending.current) {
          const next = pending.current;
          pending.current = null;
          const ack = await write.current!(next);
          if (ack && ack.id === current.current.id) {
            const live = current.current;
            const results = live.round.results.map((r, i) => ack.round.results[i] ?? r);
            const merged = {
              ...live,
              round: {
                ...live.round,
                results,
                grains: results.reduce((sum, r) => sum + r.grains, 0)
              },
              recordedCount: ack.recordedCount,
              masteredCount: ack.masteredCount
            };
            current.current = merged;
            if (mounted.current) setSession(merged);
          }
        }
        publishStatus('saved');
      } catch (error) {
        pending.current = current.current;
        publishStatus('error');
        throw error;
      } finally {
        busy.current = false;
      }
    })();
    return running.current;
  }, []);
  const dispatch = useCallback((action: SessionAction) => {
    if (status.current === 'error' && action.kind !== 'pause') return;
    const prev = current.current;
    let base = prev;
    const mono = performance.now();
    if (action.kind !== 'tick') {
      if (!prev.paused && !(status.current === 'saving' && prev.phase !== 'question')) base = reduceSession(prev, {
        kind: 'tick',
        deltaMs: Math.max(0, mono - anchor.current),
        answeredAt: Date.now()
      });
      anchor.current = mono;
    }
    const next = reduceSession(base, action);
    if (next === prev) return;
    current.current = next;
    if (prev.phase === 'question' && (next.phase === 'feedback' || next.phase === 'retry')) void recordExperienceEvent({
      id: `${next.id}:feedback:${next.round.index}`,
      at: Date.now(),
      kind: 'feedback_opened',
      sessionId: next.id,
      index: next.round.index - 1
    }).catch(() => {});
    if (action.kind === 'next') void recordExperienceEvent({
      id: `${next.id}:continued:${next.round.index}`,
      at: Date.now(),
      kind: 'feedback_continued',
      sessionId: next.id,
      index: next.round.index - 1
    }).catch(() => {});
    // 같은 단계 안의 시계 진행은 기록(current)에만 쌓는다. 화면에 보이는 건 시간제 문제의 남은 시간뿐이라
    // 그때만 다시 그린다(입력 중 0.1초마다 다시 그리면 한글 조합이 버벅인다).
    const quietTick = action.kind === 'tick' && next.phase === prev.phase;
    if (mounted.current && !(quietTick && !(next.policy.timed && next.phase === 'question'))) setSession(next);
    if (quietTick) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    if (action.kind === 'draft') {
      draftTimer.current = setTimeout(() => {
        void enqueue(current.current).catch(() => {});
      }, 300);
    } else void enqueue(next).catch(() => {});
  }, [enqueue]);
  useEffect(() => {
    mounted.current = true;
    anchor.current = performance.now();
    const timer = setInterval(() => {
      const mono = performance.now(),
        deltaMs = mono - anchor.current;
      anchor.current = mono;
      if (status.current !== 'error' && !(status.current === 'saving' && current.current.phase !== 'question')) dispatch({
        kind: 'tick',
        deltaMs,
        answeredAt: Date.now()
      });
    }, 100);
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') dispatch({
        kind: 'pause'
      });else anchor.current = performance.now();
    });
    return () => {
      mounted.current = false;
      clearInterval(timer);
      sub.remove();
      if (draftTimer.current) clearTimeout(draftTimer.current);
      dispatch({
        kind: 'pause'
      });
    };
  }, [dispatch]);
  const retrySave = useCallback(() => enqueue(current.current), [enqueue]);
  const pauseAndSave = useCallback(() => {
    dispatch({
      kind: 'pause'
    });
    return enqueue(current.current);
  }, [dispatch, enqueue]);
  return {
    session,
    dispatch,
    saveStatus,
    retrySave,
    pauseAndSave
  };
}
