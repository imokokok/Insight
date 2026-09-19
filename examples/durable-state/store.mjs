import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// One writer process per directory. Refuse abandoned locks after a crash;
// an operator must confirm the old process is stopped before removing .writer.
export async function openDurableState(directory) {
  const root = resolve(directory);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const lock = join(root, '.writer');
  await mkdir(lock, { mode: 0o700 });
  let closed = false,
    closing = false;
  let pending = Promise.resolve();
  const limit = 4 * 1024 * 1024;
  const pathFor = (key) => {
    if (typeof key !== 'string' || !key || key.length > 1024) throw new Error('Invalid state key');
    return join(root, `${createHash('sha256').update(key).digest('hex')}.json`);
  };
  const serialize = (operation) => {
    if (closed || closing) return Promise.reject(new Error('State store is closed'));
    const result = pending.then(operation);
    pending = result.catch(() => {});
    return result;
  };
  return {
    load(key) {
      return serialize(async () => {
        const path = pathFor(key);
        let contents;
        try {
          if ((await stat(path)).size > limit) throw new Error('State file exceeds size limit');
          contents = await readFile(path, 'utf8');
        } catch (error) {
          if (error.code === 'ENOENT') return null;
          throw error;
        }
        const record = JSON.parse(contents);
        if (
          record.schema !== 'workflow.durable-state.v1' ||
          record.key !== key ||
          !Object.hasOwn(record, 'value')
        )
          throw new Error('State file does not match requested key');
        return record.value;
      });
    },
    save(key, value) {
      const path = pathFor(key);
      if (value === undefined) return Promise.reject(new Error('State value is required'));
      const contents = JSON.stringify({ schema: 'workflow.durable-state.v1', key, value });
      if (Buffer.byteLength(contents) > limit)
        return Promise.reject(new Error('State exceeds size limit'));
      return serialize(async () => {
        const temporary = `${path}.${randomUUID()}.tmp`;
        try {
          const file = await open(temporary, 'wx', 0o600);
          try {
            await file.writeFile(contents);
            await file.sync();
          } finally {
            await file.close();
          }
          await rename(temporary, path);
          const dir = await open(root, 'r');
          try {
            await dir.sync();
          } finally {
            await dir.close();
          }
        } finally {
          await rm(temporary, { force: true });
        }
      });
    },
    async close() {
      if (closed || closing) return pending;
      closing = true;
      await pending;
      await rm(lock, { recursive: true });
      closed = true;
    },
  };
}
