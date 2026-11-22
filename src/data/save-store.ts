import type { SaveData } from './save';
export type SaveStore = {
  current(): SaveData;
  update(reduce: (latest: SaveData) => SaveData): Promise<SaveData>;
  flush(): Promise<void>;
};
export function createSaveStore(initial: SaveData, write: (next: SaveData) => Promise<void>): SaveStore {
  let committed = initial;
  let tail: Promise<unknown> = Promise.resolve();
  return {
    current: () => committed,
    update(reduce) {
      const task = tail.then(async () => {
        const next = reduce(committed);
        if (next !== committed) await write(next);
        committed = next;
        return committed;
      });
      tail = task.catch(() => {});
      return task;
    },
    async flush() {
      await tail;
    }
  };
}
