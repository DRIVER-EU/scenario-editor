import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { TrialOverview, IUploadedFile } from '../../models';
import { TrialRepository } from './trial.repository';

@Injectable()
export class TrialService {
  private repo: TrialRepository;

  constructor() {
    const trialsFolder =
      process.env.TRIAL_MANAGER_SERVER_FOLDER || 'trials';
    const folder = path.resolve(process.cwd(), trialsFolder);
    if (!fs.existsSync(folder)) {
      console.log('No data folder found. Creating new one: ' + folder);
      fs.mkdirSync(folder);
    }
    this.repo = new TrialRepository(folder);
  }

  async findSome(skip = 0, take = 25) {
    return this.repo.trialList.slice(skip, skip + take);
  }

  async findOne(id: string) {
    return this.findById(id);
  }

  async getTrialFile(id: string) {
    return this.repo.getTrialFilename(id);
  }

  async create(newTrial: TrialOverview) {
    if (!newTrial.title) {
      return 'Error, no title provided';
    }
    return this.repo.createTrial(newTrial);
  }

  async update(id: string, trial: TrialOverview) {
    if (trial.id !== id) {
      return `Error: Trial id (${trial.id}) does not match id (${id})!`;
    }
    return this.repo.updateTrial(id, trial);
  }

  async remove(id: string) {
    return this.repo.removeTrial(id);
  }

  // Asset mgmt

  async getAssets(id: string) {
    return this.repo.getAssets(id);
  }

  async getAsset(id: string, assetId: string) {
    return this.repo.getAsset(id, assetId);
  }

  async createAsset(id: string, file: IUploadedFile, alias: string) {
    return this.repo.createAsset(id, file, alias);
  }

  async updateAsset(id: string, assetId: string, file: IUploadedFile, alias: string) {
    return this.repo.updateAsset(id, assetId, file, alias);
  }

  async removeAsset(id: string, assetId: string) {
    return this.repo.removeAsset(id, assetId);
  }

  // Private methods

  private findById(id: string) {
    return this.repo.openTrial(id);
  }
}