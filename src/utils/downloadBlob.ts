/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function downloadBlob(
  data: BlobPart,
  filename: string,
  mimeType: string = 'application/octet-stream'
): void {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export function downloadText(
  text: string,
  filename: string,
  mimeType: string = 'text/plain;charset=utf-8',
  withBom: boolean = false
): void {
  const data = withBom ? ["\ufeff", text] : text;
  downloadBlob(data as any, filename, mimeType);
}
