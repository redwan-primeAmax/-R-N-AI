/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
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
