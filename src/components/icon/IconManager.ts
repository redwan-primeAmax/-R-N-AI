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

export interface IconLibrary {
  id: string;
  name: string;
  fileName: string;
}

export const AVAILABLE_LIBRARIES: IconLibrary[] = [
  { id: 'pack1', name: 'Note App Icon Pack', fileName: 'note_app_svg_icon_pack.zip' },
  { id: 'part1', name: 'SVG Icon Pack Part 1', fileName: 'svg-icon-pack-part1.zip' },
  { id: 'part2', name: 'SVG Icon Pack Part 2', fileName: 'svg-icon-pack-part2.zip' }
  // You can add more here if found
];

export function isLibraryDownloaded(libraryId?: string): boolean {
  if (libraryId) {
    return localStorage.getItem(`lib_downloaded_${libraryId}`) === 'true';
  }
  return localStorage.getItem('library_downloaded') === 'true';
}

export async function getTotalIconsCount(): Promise<number> {
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
  libraryFileName: string,
  onProgress: (status: string, current: number, total: number, foundCount: number) => void
): Promise<number> {
  // Graceful scaled progress feedback helper
  const reportProgress = (status: string, current: number, total: number, rangeStart: number, rangeEnd: number, loadedSoFar = 0) => {
    let pct = 0;
    if (total > 0) {
      pct = Math.min(1, Math.max(0, current / total));
    }
    const scaled = Math.round(rangeStart + pct * (rangeEnd - rangeStart));
    onProgress(status, scaled, 100, loadedSoFar);
  };

  reportProgress("আইকন লাইব্রেরি লোড হচ্ছে...", 0, 100, 0, 10);
  
  // Construct URL for the local zip file
  const base = import.meta.env.BASE_URL || './';
  const appBaseUrl = base.endsWith('/') ? base : base + '/';
  const url = `${appBaseUrl}svg_data/${libraryFileName}`;

  console.log(`[IconManager] Loading library from: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`সার্ভার থেকে আইকন ফাইল পাওয়া যায়নি: ${response.status}`);
  }

  const arrayBuf = await response.arrayBuffer();
  
  reportProgress("জিপ আর্কাইভ রিড করা হচ্ছে...", 0, 1, 10, 20, 0);
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
    
    if (content.toLowerCase().includes('<svg')) {
      // Normalize SVG for scaling
      let normalizedContent = content;
      
      // Ensure it has a viewBox if it has width/height
      if (!normalizedContent.toLowerCase().includes('viewbox')) {
        const widthMatch = normalizedContent.match(/width=["'](\d+)(px)?["']/i);
        const heightMatch = normalizedContent.match(/height=["'](\d+)(px)?["']/i);
        if (widthMatch && heightMatch) {
          const w = widthMatch[1];
          const h = heightMatch[1];
          normalizedContent = normalizedContent.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`);
        } else {
          // Default fallback viewBox for icons if none found
          normalizedContent = normalizedContent.replace('<svg', '<svg viewBox="0 0 24 24"');
        }
      }

      // Remove hardcoded width/height to let CSS handle it
      normalizedContent = normalizedContent.replace(/width=["']\d+(px)?["']/gi, 'width="100%"');
      normalizedContent = normalizedContent.replace(/height=["']\d+(px)?["']/gi, 'height="100%"');

      svgRecords.push({
        id,
        category,
        subcategory,
        name,
        content: normalizedContent
      });
      iconCount++;
    }
  };

  // Clear existing icons for fresh load
  await iconsDb.icons.clear();

  // Traverse and extract
  for (let i = 0; i < entries.length; i++) {
    const entryKey = entries[i];
    const entry = mainZip.files[entryKey];
    if (entry.dir) continue;

    if (entryKey.endsWith('.zip') && !entryKey.includes('__MACOSX')) {
      reportProgress(`নেস্টেড জিপ থেকে ডেকম্প্রেস করা হচ্ছে: ${entryKey.split('/').pop()}`, i, entries.length, 20, 70, iconCount);
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
      
      // Periodically report progress for regular SVGs
      if (iconCount % 100 === 0) {
        reportProgress(`এসভিজি প্রসেস করা হচ্ছে...`, i, entries.length, 20, 70, iconCount);
      }
    }
  }

  // Bulk index icons
  reportProgress(`ডাটাবেজ প্রস্তুত করা হচ্ছে... ${iconCount} টি আইকন ইনডেক্স হবে।`, 0, iconCount, 70, 80, iconCount);

  const CHUNK_SIZE = 1000;
  for (let i = 0; i < svgRecords.length; i += CHUNK_SIZE) {
    const chunk = svgRecords.slice(i, i + CHUNK_SIZE);
    await iconsDb.icons.bulkPut(chunk);
    reportProgress(`ডাটাবেজে সংরক্ষিত হচ্ছে...`, i, svgRecords.length, 80, 100, iconCount);
  }

  localStorage.setItem('library_downloaded', 'true');
  const lib = AVAILABLE_LIBRARIES.find(l => l.fileName === libraryFileName);
  if (lib) {
    localStorage.setItem(`lib_downloaded_${lib.id}`, 'true');
  }
  localStorage.setItem('library_icon_count', String(iconCount));
  
  reportProgress("সম্পূর্ণ হয়েছে!", iconCount, iconCount, 100, 100, iconCount);
  return iconCount;
}

