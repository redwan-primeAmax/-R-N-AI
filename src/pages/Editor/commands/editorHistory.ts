/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EditorBlock } from '../../../utils/blockParser';

export function runUndo(
  historyRef: React.MutableRefObject<EditorBlock[][]> | undefined,
  historyPointer: number | undefined,
  setHistoryPointer: ((p: number) => void) | undefined,
  setBlocks: React.Dispatch<React.SetStateAction<EditorBlock[]>>
) {
  if (historyRef && setHistoryPointer && historyPointer !== undefined && historyPointer > 0) {
    const currentHistory = historyRef.current;
    const previousBlocks = currentHistory[historyPointer - 1];
    setBlocks(previousBlocks);
    setHistoryPointer(historyPointer - 1);
  } else {
    document.execCommand('undo', false);
  }
}

export function runRedo(
  historyRef: React.MutableRefObject<EditorBlock[][]> | undefined,
  historyPointer: number | undefined,
  setHistoryPointer: ((p: number) => void) | undefined,
  setBlocks: React.Dispatch<React.SetStateAction<EditorBlock[]>>
) {
  if (historyRef && setHistoryPointer && historyPointer !== undefined && historyPointer < historyRef.current.length - 1) {
    const currentHistory = historyRef.current;
    const nextBlocks = currentHistory[historyPointer + 1];
    setBlocks(nextBlocks);
    setHistoryPointer(historyPointer + 1);
  } else {
    document.execCommand('redo', false);
  }
}
