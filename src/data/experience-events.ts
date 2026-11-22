import AsyncStorage from '@react-native-async-storage/async-storage';
import { appendExperienceEvent, type ExperienceEvent } from '../core/experience-events';
const KEY = 'woorimal.experience.v1';
type Diagnostics = { enabled: boolean; events: ExperienceEvent[] };
let tail: Promise<unknown> = Promise.resolve();
async function read(): Promise<Diagnostics> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { enabled: false, events: [] };
  const data = JSON.parse(raw);
  return { enabled: data.enabled === true, events: Array.isArray(data.events) ? data.events : [] };
}
function update(fn: (data: Diagnostics) => Diagnostics): Promise<void> {
  const task = tail.then(async () => { await AsyncStorage.setItem(KEY, JSON.stringify(fn(await read()))); });
  tail = task.catch(() => {});
  return task;
}
export async function recordExperienceEvent(event: ExperienceEvent): Promise<void> {
  await update(d => d.enabled ? { ...d, events: appendExperienceEvent(d.events, event, Date.now()) } : d);
}
export function setExperienceDiagnostics(enabled: boolean): Promise<void> {
  return update(d => ({ enabled, events: enabled ? d.events : [] }));
}
export function clearExperienceDiagnostics(): Promise<void> { return update(d => ({ ...d, events: [] })); }
export async function exportExperienceDiagnostics(): Promise<string> {
  await tail;
  const d = await read();
  const events = d.events.reduce<ExperienceEvent[]>((out, e) => appendExperienceEvent(out, e, Date.now()), []);
  return JSON.stringify({ schema: 1, enabled: d.enabled, events }, null, 2);
}
export async function experienceDiagnosticsEnabled(): Promise<boolean> { await tail; return (await read()).enabled; }
