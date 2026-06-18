import Dexie, { type Table } from 'dexie';

export interface CustomIcon {
  id: string;         // Unique path/identifier
  category: string;   // Category name
  subcategory: string; // Subcategory name
  name: string;       // human readable name
  content: string;    // Raw SVG string
}

export function cleanRootSvgAttributes(svgContent: string): string {
  const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i);
  if (!svgOpenTagMatch) return svgContent;

  let openTag = svgOpenTagMatch[0];
  const remaining = svgContent.slice(svgOpenTagMatch.index! + openTag.length);

  const viewBoxMatch = openTag.match(/viewBox=["']([^"']+)["']/i);
  let viewBox = viewBoxMatch ? viewBoxMatch[1] : '';

  const widthMatch = openTag.match(/width=["']([^"']+)["']/i);
  const heightMatch = openTag.match(/height=["']([^"']+)["']/i);

  const wVal = widthMatch ? widthMatch[1].replace(/px/gi, '') : '';
  const hVal = heightMatch ? heightMatch[1].replace(/px/gi, '') : '';

  if (!viewBox) {
    if (wVal && hVal && !isNaN(Number(wVal)) && !isNaN(Number(hVal))) {
      viewBox = `0 0 ${wVal} ${hVal}`;
    } else {
      viewBox = '0 0 24 24'; // fallback
    }
  }

  openTag = openTag
    .replace(/\s+width=["'][/0-9.a-zA-Z%]+["']/gi, '')
    .replace(/\s+height=["'][/0-9.a-zA-Z%]+["']/gi, '')
    .replace(/\s+viewBox=["'][^"']*["']/gi, '')
    .replace(/\s+preserveAspectRatio=["'][^"']*["']/gi, '');

  openTag = openTag.replace(/<svg/i, `<svg width="100%" height="100%" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet"`);

  return svgContent.slice(0, svgOpenTagMatch.index!) + openTag + remaining;
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
