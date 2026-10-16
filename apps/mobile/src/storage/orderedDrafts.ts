type DraftStorage = {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  list?(prefix: string): Promise<{ key: string; value: string }[]>;
};
// Shared ordering survives screen unmount/remount, so a reopened read cannot
// overtake edits queued by the previous instance. Failures never poison retries.
export function orderedDraftStorage(storage: DraftStorage) {
  let tail: Promise<unknown> = Promise.resolve();
  function run<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.catch(() => undefined).then(operation);
    tail = result.catch(() => undefined);
    return result;
  }
  return {
    read: (key: string) => run(() => storage.read(key)),
    write: (key: string, value: string) => run(() => storage.write(key, value)),
    remove: (key: string) => run(() => storage.remove(key)),
    list: (prefix: string) =>
      run(() => {
        if (!storage.list) throw new Error("Draft enumeration unavailable");
        return storage.list(prefix);
      }),
  };
}
