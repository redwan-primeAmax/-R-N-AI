/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import localforage from 'localforage';
import JSZip from 'jszip';

export class LocalService {
  async loadModelFromZip(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const contents = await zip.loadAsync(arrayBuffer);
    
    const fileNames = Object.keys(contents.files);
    if (fileNames.length === 0) {
      throw new Error('ZIP file is empty.');
    }
    
    await localforage.setItem('local_model_binary', arrayBuffer);
  }
}
