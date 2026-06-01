/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import localforage from 'localforage';
import JSZip from 'jszip';

export class LocalService {
  async loadModelFromZip(file: File): Promise<void> {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    const fileNames = Object.keys(contents.files);
    if (fileNames.length === 0) {
      throw new Error('ZIP file is empty.');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    await localforage.setItem('local_model_binary', arrayBuffer);
  }
}
