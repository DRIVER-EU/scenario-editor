import * as fs from 'fs';
import * as path from 'path';
import { Database } from 'sqlite3';
import { TrialOverview, IUploadedFile } from '../../models';
import { ITrial, uniqueId, ITrialOverview } from 'trial-manager-models';
import { logError, dbCallbackWrapper } from '../../utils';

const TRIAL = 'trial';
const EXT = '.sqlite3';
const ASSETS = 'asset';

const sortTrialsByLastEdit = (a: TrialOverview, b: TrialOverview) =>
  a.lastEdit > b.lastEdit ? -1 : 1;

export class TrialRepository {
  private databases: { [id: string]: { db: Database; filename: string } } = {};
  private overview: TrialOverview[] = [];

  constructor(private folder: string) {
    this.init();
  }

  async init() {
    const dbs = await this.openAllDatabases();
    this.createOverview(dbs);
    this.closeAllDatabasesOnExit();
  }

  get trialList() {
    return this.overview;
  }

  async openTrial(id: string) {
    return this.getTrial(id);
  }

  getTrialFilename(id: string) {
    const dbi = this.databases[id];
    if (!dbi) {
      return console.error(`Error, no database with id ${id} found!`);
    }
    return dbi.filename;
  }

  async clone(id: string) {
    return new Promise<ITrialOverview>(async (resolve, reject) => {
      const filename = this.getTrialFilename(id);
      if (!filename) {
        const msg = `${id} not found, cannot clone.`;
        console.error(msg);
        return reject(msg);
      }
      console.log(`Cloning ${id} - ${filename}...`);
      fs.exists(filename, exists => {
        if (!exists) {
          const msg = `${filename} no longer exists, cannot clone.`;
          console.error(msg);
          return reject(msg);
        }
        const newId = uniqueId();
        const newFilename = this.toFilename(newId);
        console.log(`...to ${newId} - ${newFilename}`);
        fs.copyFile(filename, newFilename, err => {
          if (err) {
            const msg = `Error copying ${filename} to ${newFilename}:`;
            console.error(msg);
            return reject(msg);
          }
          const db = new Database(newFilename, async errDb => {
            if (errDb) {
              const msg = `Error opening database ${newFilename}:`;
              console.error(msg);
              return reject(msg);
            }
            this.databases[newId] = { filename: newFilename, db };
            const trial = await this.getTrial(newId);
            trial.id = newId;
            trial.title += ' (copy)';
            trial.creationDate = trial.lastEdit = new Date();
            this.overview.push(new TrialOverview(trial));
            this.overview.sort(sortTrialsByLastEdit);
            this.updateTrial(newId, trial);
            resolve({
              id: newId,
              title: trial.title,
              creationDate: trial.creationDate,
              lastEdit: trial.lastEdit,
              description: trial.description,
            });
          });
        });
      });
    });
  }

  async createTrial(trial: TrialOverview) {
    trial.id = uniqueId();
    const now = new Date();
    trial.creationDate = trial.lastEdit = now;
    this.overview.push(new TrialOverview(trial));
    this.overview.sort(sortTrialsByLastEdit);
    await this.createDb(trial);
    return trial;
  }

  async createTrialFromFile(file: IUploadedFile) {
    const { originalname } = file;
    const ext = path.extname(originalname);
    const baseName = path
      .basename(originalname)
      .replace(new RegExp(`${ext}$`, 'g'), '');
    let p: string;
    let count = 0;
    do {
      count++;
      p = path.resolve(this.folder, `${baseName} (${count})${ext}`);
    } while (fs.existsSync(p));
    fs.writeFile(p, file.buffer, err => {
      if (err) {
        return console.error(err);
      }
      this.closeAllDatabases();
      this.init();
    });
  }

  async updateTrial(id: string, trial: TrialOverview) {
    return new Promise((resolve, reject) => {
      const db = this.databases.hasOwnProperty(id)
        ? this.databases[id].db
        : null;
      if (!db) {
        reject(`Database with id ${id} does not exist!`);
      }
      const now = new Date();
      trial.lastEdit = now;
      db.get(`UPDATE ${TRIAL} SET data = ?`, JSON.stringify(trial), err => {
        if (err) {
          console.error(err);
          return reject(err);
        }
        this.overview = this.overview.filter(s => s.id !== id);
        this.overview.push(new TrialOverview(trial));
        this.overview.sort(sortTrialsByLastEdit);
        resolve();
      });
    });
  }

  async removeTrial(id: string) {
    return new Promise((resolve, reject) => {
      if (!this.databases.hasOwnProperty(id)) {
        return reject(`Error, no database with ID ${id} exists!`);
      }
      const { db, filename } = this.databases[id];
      db.close(err => {
        if (err) {
          logError(err);
          return reject(err);
        } else {
          fs.unlink(filename, err2 => {
            if (err2) {
              logError(err2);
              return reject(err2);
            }
            delete this.databases[id];
            this.overview = this.overview.filter(s => s.id !== id);
            resolve();
          });
        }
      });
    });
  }

  // Asset mgmt

  async getAssets(id: string) {
    return new Promise<
      Array<{
        id: number;
        mimetype: string;
        filename: string;
      }>
    >(async (resolve, reject) => {
      const db = this.databases.hasOwnProperty(id)
        ? this.databases[id].db
        : undefined;
      if (!db) {
        return reject(`Error, no database with id ${id} found!`);
      }
      db.all(
        `SELECT id, alias, mimetype, filename FROM ${ASSETS}`,
        (
          err: Error,
          row: Array<{
            id: number;
            alias: string;
            mimetype: string;
            filename: string;
          }>,
        ) => {
          if (err) {
            console.error(err);
            return reject(err);
          }
          resolve(row);
        },
      );
    });
  }

  async getAsset(id: string, assetId: number | string) {
    return new Promise<{
      id: number;
      data: Uint8Array;
      mimetype: string;
      filename: string;
    }>(async (resolve, reject) => {
      const db = this.databases.hasOwnProperty(id)
        ? this.databases[id].db
        : undefined;
      if (!db) {
        return reject(`Error, no database with id ${id} found!`);
      }
      db.get(
        `SELECT id, alias, mimetype, filename, data FROM ${ASSETS} WHERE id=?`,
        assetId,
        (
          err: Error,
          row: {
            id: number;
            alias: string;
            mimetype: string;
            data: Uint8Array;
            filename: string;
          },
        ) => {
          if (err) {
            console.error(err);
            return reject(err);
          }
          resolve(row);
        },
      );
    });
  }

  async createAsset(id: string, file?: IUploadedFile, alias?: string) {
    return new Promise<{ alias: string; filename: string; mimetype: string }>(
      async (resolve, reject) => {
        if (!file) {
          return reject(`Error, no file attached!`);
        }
        const db = this.databases.hasOwnProperty(id)
          ? this.databases[id].db
          : undefined;
        if (!db) {
          return reject(`Error, no database with id ${id} found!`);
        }
        const { originalname, mimetype, buffer } = file;
        db.run(
          `INSERT INTO ${ASSETS}(alias, filename, mimetype, data) VALUES(?, ?, ?, ?)`,
          alias,
          originalname,
          mimetype,
          buffer,
          dbCallbackWrapper((rowId: number) => {
            const asset = {
              id: rowId,
              alias,
              filename: originalname,
              mimetype,
            };
            resolve(asset);
          }, reject),
        );
      },
    );
  }

  async updateAsset(
    id: string,
    assetId: string | number,
    file?: IUploadedFile,
    alias?: string,
  ) {
    return new Promise(async (resolve, reject) => {
      const db = this.databases.hasOwnProperty(id)
        ? this.databases[id].db
        : undefined;
      if (!db) {
        return reject(`Error, no database with id ${id} found!`);
      }
      if (file) {
        const { originalname, mimetype, buffer } = file;
        db.run(
          `UPDATE ${ASSETS} SET alias = ?, filename = ?, mimetype = ?, data = ? WHERE id = ?`,
          alias,
          originalname,
          mimetype,
          buffer,
          assetId,
          dbCallbackWrapper(resolve, reject),
        );
      } else {
        db.run(
          `UPDATE ${ASSETS} SET alias = ? WHERE id = ?`,
          alias,
          assetId,
          dbCallbackWrapper(resolve, reject),
        );
      }
    });
  }

  async removeAsset(id: string, assetId: number | string) {
    return new Promise(async (resolve, reject) => {
      const db = this.databases.hasOwnProperty(id)
        ? this.databases[id].db
        : undefined;
      if (!db) {
        return reject(`Error, no database with id ${id} found!`);
      }
      db.run(
        `DELETE FROM ${ASSETS} WHERE id=?`,
        assetId,
        dbCallbackWrapper(resolve, reject),
      );
    });
  }

  // Private methods

  /** Get an absolute path to the SQLITE database */
  private toFilename(id: string) {
    return path.resolve(this.folder, `${TRIAL}_${id}${EXT}`);
  }

  private async getTrial(id: string | Database) {
    return new Promise<ITrial>((resolve, reject) => {
      const db =
        typeof id === 'string'
          ? this.databases.hasOwnProperty(id)
            ? this.databases[id].db
            : null
          : id;
      if (!db) {
        reject(`Database with id ${id} does not exist!`);
      }
      db.get(`SELECT data FROM ${TRIAL}`, (err, row) => {
        if (err) {
          console.error(err);
          return reject(err);
        }
        const trial = JSON.parse(row.data);
        if (typeof id === 'string') {
          // In case we are dealing with a copy, set the correct ID.
          trial.id = id;
        }
        resolve(trial);
      });
    });
  }

  private async openAllDatabases() {
    const files = fs.readdirSync(this.folder);
    const dbs = files
      .filter(f => path.extname(f) === EXT)
      .map(f => path.resolve(this.folder, f))
      .reduce(
        (acc, f) => [...acc, this.openDatabase(f)],
        [] as Array<Promise<{ db: Database; filename: string }>>,
      );
    return await Promise.all(dbs);
      // .reduce(
      //   async (acc, f) => {
      //     const result = await this.openDatabase(f);
      //     return [...acc, result];
      //   },
      //   [] as Array<{ db: Database; filename: string }>,
      // );
  }

  private openDatabase(filename: string) {
    return new Promise<{ filename: string, db: Database }>((resolve, reject) => {
      const db = new Database(filename, err => {
        if (err) {
          reject(err);
        } else {
          resolve({ filename, db });
        }
      });
    });
  }

  private async createOverview(dbs: Array<{ db: Database; filename: string }>) {
    const trials = await Promise.all<TrialOverview>(
      dbs.reduce((acc, db) => {
        const trial = this.getTrial(db.db);
        acc.push(trial);
        return acc;
      }, []),
    );
    trials.sort(sortTrialsByLastEdit);
    // Remove duplicates, only keep the last version.
    const uniqueTrials = trials.filter(
      (t, i) => trials.slice(0, i + 1).filter(x => x.id === t.id).length === 1,
    );
    this.databases = uniqueTrials.reduce((acc, s, i) => {
      if (acc.hasOwnProperty(s.id)) {
        // Should not be reached
        console.warn(
          `Trial with duplicate ID found: ${s.title} (${
            s.id
          }: ${s.lastEdit.toString()}).`,
        );
      } else {
        acc[s.id] = dbs[i];
      }
      return acc;
    }, {});
    console.log(`${uniqueTrials.length} scenarios loaded...`);
    this.overview = uniqueTrials.map(s => new TrialOverview(s));
  }

  private async createDb(trial: TrialOverview) {
    const { id } = trial;
    return new Promise((resolve, reject) => {
      if (this.databases.hasOwnProperty(id)) {
        return reject(
          `Cannot create DB: Database with ID ${id} already exists!`,
        );
      }
      const filename = this.toFilename(id);
      if (fs.existsSync(filename)) {
        return reject(`Cannot create DB: ${filename} already exists!`);
      }
      const db = new Database(filename, logError);
      this.databases[id] = { db, filename };
      db.serialize(() => {
        db.run(`CREATE TABLE ${TRIAL} (data TEXT)`, logError);
        db.run(
          `INSERT INTO ${TRIAL}(data) VALUES(?)`,
          JSON.stringify(trial),
          logError,
        );

        db.run(
          `CREATE TABLE ${ASSETS} (
          id INTEGER PRIMARY KEY,
          alias TEXT,
          filename TEXT,
          mimetype TEXT,
          data BLOB
          )`,
          logError,
        );
      });
      resolve();
    });
  }

  private closeAllDatabases() {
    Object.keys(this.databases).forEach(id => this.databases[id].db.close());
  }

  private closeAllDatabasesOnExit() {
    process.on('exit', () => {
      console.log('Closing all databases...');
      this.closeAllDatabases();
    });
  }
}
