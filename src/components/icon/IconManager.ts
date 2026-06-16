import Dexie, { type Table } from 'dexie';
import JSZip from 'jszip';

export interface CustomIcon {
  id: string;         // Unique path/identifier
  category: string;   // Category name (e.g., General, Shapes)
  subcategory: string; // Subcategory name (if any, e.g. Solid, Monoline)
  name: string;       // human readable name
  content: string;    // Raw SVG string
}

export class NotionCloneIconsDB extends Dexie {
  icons!: Table<CustomIcon, string>;

  constructor() {
    super('NotionCloneIcons');
    this.version(1).stores({
      icons: 'id, category, subcategory, name'
    });
  }
}

export const iconsDb = new NotionCloneIconsDB();

export function isLibraryDownloaded(): boolean {
  return localStorage.getItem('library_downloaded') === 'true';
}

export async function getTotalIconsCount(): Promise<number> {
  if (!isLibraryDownloaded()) return 0;
  return await iconsDb.icons.count();
}

export async function getCategories(): Promise<string[]> {
  const categories = new Set<string>();
  await iconsDb.icons.each(icon => {
    if (icon.category) categories.add(icon.category);
  });
  return Array.from(categories).sort();
}

export async function getSubcategories(category: string): Promise<string[]> {
  const subcategories = new Set<string>();
  await iconsDb.icons.where('category').equals(category).each(icon => {
    if (icon.subcategory) subcategories.add(icon.subcategory);
  });
  return Array.from(subcategories).sort();
}

export async function downloadAndExtractIcons(
  onProgress: (status: string, current: number, total: number) => void
): Promise<number> {
  // Graceful scaled progress feedback helper
  const reportProgress = (status: string, current: number, total: number, rangeStart: number, rangeEnd: number) => {
    let pct = 0;
    if (total > 0) {
      pct = Math.min(1, Math.max(0, current / total));
    }
    const scaled = Math.round(rangeStart + pct * (rangeEnd - rangeStart));
    onProgress(status, scaled, 100);
  };

  reportProgress("ডাউনলোড শুরু হচ্ছে...", 0, 100, 0, 100);
  
  let response: Response;
  try {
    response = await fetch('/api/icons/download-proxy');
    if (!response.ok) {
      let errMsg = "ডাউনলোড সার্ভার ত্রুটি!";
      try {
        const text = await response.text();
        try {
          const errJson = JSON.parse(text);
          if (errJson && errJson.error) {
            errMsg = errJson.error;
          } else if (text) {
            errMsg = text.substring(0, 150);
          }
        } catch (e) {
          if (text) {
            errMsg = text.substring(0, 150);
          }
        }
      } catch (e2) {}
      throw new Error(`সার্ভার ত্রুটি: ${errMsg}`);
    }
  } catch (err: any) {
    throw new Error(`আইকন লাইব্রেরি ডাউনলোড ব্যর্থ হয়েছে। কারণ: ${err.message || err}`);
  }

  const contentLength = Number(response.headers.get('Content-Length')) || 63240612; // fallback total size if chunked
  let arrayBuf: ArrayBuffer;

  try {
    const reader = response.body?.getReader();
    if (reader) {
      let receivedLength = 0;
      const chunks: Uint8Array[] = [];
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          receivedLength += value.length;
          
          const pct = Math.round((receivedLength / contentLength) * 100);
          reportProgress(`আইকন লাইব্রেরি ডাউনলোড হচ্ছে... ${pct}% (${Math.round(receivedLength / 1024 / 1024)} MB)`, receivedLength, contentLength, 0, 50);
        }
        
        const joinedArray = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
          joinedArray.set(chunk, position);
          position += chunk.length;
        }
        arrayBuf = joinedArray.buffer;
      } catch (streamErr: any) {
        console.warn("[IconManager] Streaming reader failed, falling back to direct full download...", streamErr);
        reportProgress("ডাউনলোড পুনরায় শুরু হচ্ছে (নন-স্ট্রিমিং)...", 0, 100, 0, 50);
        
        const fallbackRes = await fetch('/api/icons/download-proxy');
        if (!fallbackRes.ok) {
          throw new Error(`রিস্টার্ট ডাউনলোড ব্যর্থ: ${fallbackRes.status}`);
        }
        arrayBuf = await fallbackRes.arrayBuffer();
      }
    } else {
      arrayBuf = await response.arrayBuffer();
    }
  } catch (downloadErr: any) {
    throw new Error(`ডাউনলোড সম্পন্ন করতে ব্যর্থ: ${downloadErr.message || downloadErr}`);
  }

  reportProgress("জিপ আর্কাইভ রিড করা হচ্ছে...", 0, 1, 50, 51);
  let mainZip: JSZip;
  try {
    const jszip = new JSZip();
    mainZip = await jszip.loadAsync(arrayBuf);
  } catch (err: any) {
    throw new Error(`জিপ আর্কাইভ পড়তে ব্যর্থ হয়েছে: ${err.message || err}`);
  }
  
  const entries = Object.keys(mainZip.files);
  const svgRecords: CustomIcon[] = [];
  let iconCount = 0;

  const addSvgRecord = (path: string, content: string) => {
    const parts = path.split('/').filter(p => p && !p.startsWith('.') && p !== '__MACOSX');
    if (parts.length === 0) return;

    const filename = parts[parts.length - 1];
    if (!filename.toLowerCase().endsWith('.svg')) return;

    // clean and make name human readable
    const name = filename
      .replace(/\.svg$/i, '')
      .replace(/[-_]/g, ' ')
      .trim();

    let category = 'General';
    let subcategory = '';

    if (parts.length === 2) {
      category = parts[0];
    } else if (parts.length >= 3) {
      category = parts[0];
      subcategory = parts[1];
    }

    const id = path.toLowerCase();
    
    // Validate SVG structure
    if (content.toLowerCase().includes('<svg')) {
      svgRecords.push({
        id,
        category,
        subcategory,
        name,
        content
      });
      iconCount++;
    }
  };

  // Traverse the files inside the outer ZIP with progress scaled 50% to 80%
  for (let i = 0; i < entries.length; i++) {
    const entryKey = entries[i];
    const entry = mainZip.files[entryKey];
    if (entry.dir) continue;

    if (entryKey.endsWith('.zip') && !entryKey.includes('__MACOSX')) {
      reportProgress(`নেস্টেড জিপ থেকে ডেকম্প্রেস করা হচ্ছে: ${entryKey.split('/').pop()}`, i, entries.length, 50, 80);
      try {
        const nestedData = await entry.async('arraybuffer');
        const nestedZip = await JSZip.loadAsync(nestedData);
        const nestedEntries = Object.keys(nestedZip.files);
        
        for (const nestedKey of nestedEntries) {
          const nestedFile = nestedZip.files[nestedKey];
          if (nestedFile.dir) continue;
          
          if (nestedKey.endsWith('.svg') && !nestedKey.includes('__MACOSX')) {
            const content = await nestedFile.async('string');
            addSvgRecord(nestedKey, content);
          }
        }
      } catch (err) {
        console.error('Nested zip extraction failed:', entryKey, err);
      }
    } else if (entryKey.endsWith('.svg') && !entryKey.includes('__MACOSX')) {
      const content = await entry.async('string');
      addSvgRecord(entryKey, content);
    }
  }

  // Bulk index icons in custom batches to be fast, progress scaled 80% to 100%
  reportProgress(`ডাটাবেজ প্রস্তুত করা হচ্ছে... ${iconCount} টি আইকন ইনডেক্স হবে।`, 0, iconCount, 80, 85);
  await iconsDb.icons.clear();

  const CHUNK_SIZE = 3000;
  for (let i = 0; i < svgRecords.length; i += CHUNK_SIZE) {
    const chunk = svgRecords.slice(i, i + CHUNK_SIZE);
    await iconsDb.icons.bulkPut(chunk);
    reportProgress(`নতুন আইকন ডাটাবেজে সংরক্ষিত হচ্ছে... ${Math.min(i + CHUNK_SIZE, svgRecords.length)} / ${svgRecords.length}`, i, svgRecords.length, 85, 100);
  }

  localStorage.setItem('library_downloaded', 'true');
  localStorage.setItem('library_icon_count', String(iconCount));
  
  reportProgress("সম্পূর্ণ হয়েছে!", iconCount, iconCount, 100, 100);
  return iconCount;
}
