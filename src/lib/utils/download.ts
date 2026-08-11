export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.setAttribute('href', url);
  anchor.setAttribute('download', filename);
  anchor.style.visibility = 'hidden';
  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    // anchor.click() only *initiates* the download, which the browser performs
    // asynchronously. Revoking the object URL synchronously here can free the blob
    // before the browser reads it, causing a silent download failure — especially
    // for large blobs or non-Chromium browsers. Defer revocation to the next macrotask.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
