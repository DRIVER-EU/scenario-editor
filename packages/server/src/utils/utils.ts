import { RunResult } from 'sqlite3';

/**
 * Create a GUID
 * @see https://stackoverflow.com/a/2117523/319711
 *
 * @returns RFC4122 version 4 compliant GUID
 */
export const uniqueId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    // tslint:disable-next-line:no-bitwise
    const r = (Math.random() * 16) | 0;
    // tslint:disable-next-line:no-bitwise
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const logError = (err?: Error) => {
  if (err) {
    console.error(err.message);
  }
};

/** Wrap the result callback */
export const dbCallbackWrapper = (
  resolve: (value?: number | PromiseLike<number>) => void,
  reject: (reason?: any) => void,
) => {
  return function dbCallback(this: RunResult, err: Error | null) {
    if (err) {
      return reject(err.message);
    }
    resolve(this.lastID);
  };
};
