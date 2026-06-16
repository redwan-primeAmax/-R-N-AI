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
  
  let response: Response | null = null;
  let chosenUrl = "";
  let lastError = "";

  const base = import.meta.env.BASE_URL || './';
  const appBaseUrl = base.endsWith('/') ? base : base + '/';
  
  let relativeUrl = 'library1.zip';
  try {
    relativeUrl = new URL('library1.zip', window.location.href).href;
  } catch (e) {
    console.error("Failed to build absolute URL with location", e);
  }

  const candidates = [
    `${appBaseUrl}library1.zip`,
    relativeUrl,
    '/library1.zip',
    '/api/icons/download-proxy'
  ];

  const uniqueCandidates = Array.from(new Set(candidates));
  console.log("[IconManager] Candidate ZIP URLs:", uniqueCandidates);

  for (const url of uniqueCandidates) {
    try {
      console.log(`[IconManager] Attempting fetch to: ${url}`);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP status ${res.status}`);
      }
      
      const contentType = res.headers.get('Content-Type') || '';
      if (contentType.toLowerCase().includes('text/html')) {
        throw new Error("Returned HTML content-type instead of ZIP");
      }

      response = res;
      chosenUrl = url;
      break; // found one!
    } catch (err: any) {
      console.warn(`[IconManager] Failed to fetch from [${url}]: ${err.message || err}`);
      lastError = err.message || String(err);
    }
  }

  if (!response || !chosenUrl) {
    throw new Error(`আইকন লাইব্রেরি ডাউনলোডে কোনো লিংক কাজ করেনি। সর্বশেষ ত্রুটি: ${lastError}`);
  }

  console.log(`[IconManager] Selected working ZIP URL: ${chosenUrl}`);

  const contentLength = Number(response.headers.get('Content-Length')) || 63240612; // fallback total size if chunked
  let arrayBuf: ArrayBuffer;

  try {
    const reader = response.body?.getReader();
    if (reader) {
      let receivedLength = 0;
      const chunks: Uint8Array[] = [];
      let isFirstChunk = true;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          if (isFirstChunk && value && value.length >= 4) {
            isFirstChunk = false;
            // Verify ZIP magic bytes on first chunk: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
            const isZipMagic = value[0] === 0x50 && value[1] === 0x4B && value[2] === 0x03 && value[3] === 0x04;
            if (!isZipMagic) {
              const textSample = new TextDecoder().decode(value.slice(0, 50));
              console.error(`[IconManager] ZIP magic verification failed. Received sample: ${textSample}`);
              throw new Error("ফাইলটি জিপ (ZIP) ফরম্যাটে নেই (ম্যাজিক বাইট অমিল)। এটি সম্ভবত একটি HTML ত্রুটি পাতা বা ডোমেইন সংক্রান্ত সমস্যা।");
            }
          }
          
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
        
        const fallbackRes = await fetch(chosenUrl);
        if (!fallbackRes.ok) {
          throw new Error(`রিস্টার্ট ডাউনলোড ব্যর্থ: ${fallbackRes.status}`);
        }
        arrayBuf = await fallbackRes.arrayBuffer();
        
        const uint8 = new Uint8Array(arrayBuf);
        if (uint8.length >= 4) {
          const isZipMagic = uint8[0] === 0x50 && uint8[1] === 0x4B && uint8[2] === 0x03 && uint8[3] === 0x04;
          if (!isZipMagic) {
            throw new Error("ফাইলটি জিপ (ZIP) ফরম্যাটে নেই (ম্যাজিক বাইট অমিল)।");
          }
        }
      }
    } else {
      arrayBuf = await response.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuf);
      if (uint8.length >= 4) {
        const isZipMagic = uint8[0] === 0x50 && uint8[1] === 0x4B && uint8[2] === 0x03 && uint8[3] === 0x04;
        if (!isZipMagic) {
          throw new Error("ফাইলটি জিপ (ZIP) ফরম্যাটে নেই (ম্যাজিক বাইট অমিল)। এটি সম্ভবত একটি HTML ত্রুটি পাতা।");
        }
      }
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
