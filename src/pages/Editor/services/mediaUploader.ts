/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { operationRunner } from '../../../services/storage/OperationRunner';

export interface UploadOptions {
  file: File;
  editor: any;
  noteId: string;
  workspaceId: string;
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (err: any) => void;
}

/**
 * Handles uploading local media file and inserting a corresponding block into the editor.
 * Uses operationRunner to persist the file in indexedDB / local-storage.
 */
export async function uploadAndInsertMedia({
  file,
  editor,
  noteId,
  workspaceId,
  onStart,
  onComplete,
  onError
}: UploadOptions): Promise<void> {
  if (!file || !editor) return;

  // Limit size to 50MB
  if (file.size > 50 * 1024 * 1024) {
    alert("ফাইলটি অত্যন্ত বড় (সর্বোচ্চ ৫০ এমবি গ্রহণযোগ্য)!");
    return;
  }

  const fileId = crypto.randomUUID();
  const type = file.type.startsWith('image/') ? 'image' : 
               file.type.startsWith('video/') ? 'video' : 
               file.type.startsWith('audio/') ? 'audio' : 'file';

  if (onStart) {
    onStart();
  }

  try {
    // Insert the media block first in editing blocks
    (editor.chain().focus() as any).setMedia({ 
      id: fileId,
      type,
      fileName: file.name,
      fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      status: 'uploading'
    }).run();

    // Run background operation to load and write blob to MediaStore
    await operationRunner.runUpload(file, noteId, workspaceId, fileId);

    if (onComplete) {
      onComplete();
    }
  } catch (err) {
    console.error('Media upload operation failed:', err);
    if (onError) {
      onError(err);
    }
    alert('ফাইল আপলোড শুরু করতে ব্যর্থ হয়েছে!');
  }
}
