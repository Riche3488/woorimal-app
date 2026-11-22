import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { reduceSession, type SessionAction, type SessionSnapshot } from '../core/session';

export function usePlaySession(initial: SessionSnapshot, checkpoint?: (s: SessionSnapshot) => Promise<void>) {
  const [session, setSession] = useState(initial);
  const [saveStatus, setSaveStatus] = useState<'saved'|'saving'|'error'>('saved');
  const current = useRef(initial), status = useRef(saveStatus), mounted = useRef(true);
  const write = useRef(checkpoint); write.current = checkpoint;
  const pending = useRef<SessionSnapshot | null>(null), busy = useRef(false);
  const running = useRef<Promise<void>>(Promise.resolve());
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchor = useRef(performance.now());
  const publishStatus = (next: typeof saveStatus) => { status.current=next; if (mounted.current) setSaveStatus(next); };
  const enqueue = useCallback((snapshot: SessionSnapshot): Promise<void> => {
    if (!write.current) return Promise.resolve();
    if (!pending.current || snapshot.revision >= pending.current.revision) pending.current=snapshot;
    if (busy.current) return running.current;
    busy.current=true;
    publishStatus('saving');
    running.current = (async () => {
      try {
        while (pending.current) {
          const next = pending.current;
          pending.current=null;
          await write.current!(next);
        }
        publishStatus('saved');
      } catch (error) {
        pending.current=current.current;
        publishStatus('error');
        throw error;
      } finally { busy.current=false; }
    })();
    return running.current;
  }, []);
  const dispatch = useCallback((action: SessionAction) => {
    if (status.current === 'error' && action.kind !== 'pause') return;
    const prev = current.current;
    let base = prev;
    const mono = performance.now();
    if (action.kind !== 'tick') {
      if (!prev.paused && !(status.current === 'saving' && prev.phase !== 'question')) base=reduceSession(prev,{kind:'tick',deltaMs:Math.max(0,mono-anchor.current),answeredAt:Date.now()});
      anchor.current=mono;
    }
    const next=reduceSession(base,action);
    if (next === prev) return;
    current.current=next;
    if (mounted.current) setSession(next);
    if (action.kind === 'tick' && next.phase === prev.phase) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    if (action.kind === 'draft') {
      draftTimer.current=setTimeout(() => { void enqueue(current.current).catch(() => {}); },300);
    } else void enqueue(next).catch(() => {});
  }, [enqueue]);
  useEffect(() => {
    mounted.current=true;
    anchor.current=performance.now();
    const timer=setInterval(() => {
      const mono=performance.now(), deltaMs=mono-anchor.current;
      anchor.current=mono;
      if (status.current !== 'error' && !(status.current === 'saving' && current.current.phase !== 'question')) dispatch({kind:'tick',deltaMs,answeredAt:Date.now()});
    },100);
    const sub=AppState.addEventListener('change', state => { if (state !== 'active') dispatch({kind:'pause'}); else anchor.current=performance.now(); });
    return () => {
      mounted.current=false;
      clearInterval(timer); sub.remove();
      if (draftTimer.current) clearTimeout(draftTimer.current);
      dispatch({kind:'pause'});
    };
  }, [dispatch]);
  const retrySave=useCallback(() => enqueue(current.current),[enqueue]);
  const pauseAndSave=useCallback(() => { dispatch({kind:'pause'}); return enqueue(current.current); },[dispatch,enqueue]);
  return { session, dispatch, saveStatus, retrySave, pauseAndSave };
}
