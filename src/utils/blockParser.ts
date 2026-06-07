/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EditorBlock {
  id: string;
  type: string;
  content: string;
  indent?: number;
  checked?: boolean;
  language?: string;
  emoji?: string;
  isExpanded?: boolean;
  tableData?: string[][];
  withHeaderRow?: boolean;
  mediaData?: {
    id: string;
    type: 'image' | 'video' | 'audio' | 'file';
    fileName: string;
    fileSize: string;
    status: 'uploading' | 'completed' | 'error';
    url?: string;
  };
  bookmarkData?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    icon?: string;
    siteName?: string;
  };
  meta?: any;
  col1Content?: string;
  col2Content?: string;
  subPageId?: string;
  syncedBlockId?: string;
  embedData?: {
    provider: 'google_drive' | 'figma' | 'github' | 'pdf' | 'custom';
    url: string;
  };
  databaseData?: {
    layout: 'table' | 'board' | 'gallery' | 'list' | 'calendar' | 'timeline';
    columns: { id: string; name: string; type: 'text' | 'number' | 'select' | 'date'; options?: string[]; }[];
    rows: Record<string, any>[];
  };
}

// Helper to clean up HTML from unnecessary tags, forcing tag mappings and nesting rules
export function cleanBlockHTML(html: string, blockType: string): string {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  // Rule: A heading cannot contain another heading. Flatten any nested heading tags inside headings or paragraphs.
  if (blockType === 'h1' || blockType === 'h2' || blockType === 'h3' || blockType === 'paragraph') {
    const nestedHeadings = body.querySelectorAll('h1, h2, h3, p');
    nestedHeadings.forEach(h => {
      const parent = h.parentNode;
      if (parent) {
        const docFrag = doc.createDocumentFragment();
        while (h.firstChild) {
          docFrag.appendChild(h.firstChild);
        }
        parent.replaceChild(docFrag, h);
      }
    });
  }

  // Sanity check: Ensure list elements or details can't contain block tags that crash rendering
  // Ensure that no rogue script tags can run
  const scripts = body.querySelectorAll('script, iframe:not(.sandbox-iframe), object, embed');
  scripts.forEach(s => s.remove());

  // Flatten spans that have inline styles except simple formatting
  const spans = Array.from(body.querySelectorAll('span'));
  spans.forEach(span => {
    const style = span.getAttribute('style') || '';
    if (!style.includes('font-weight') && !style.includes('font-style') && !style.includes('text-decoration') && !style.includes('color')) {
      const parent = span.parentNode;
      if (parent) {
        const docFrag = doc.createDocumentFragment();
        const inner = span.innerHTML;
        const tempDiv = doc.createElement('div');
        tempDiv.innerHTML = inner;
        while (tempDiv.firstChild) {
          docFrag.appendChild(tempDiv.firstChild);
        }
        parent.replaceChild(docFrag, span);
      }
    }
  });

  // Check for mono-spaced fonts and replace with <code>
  const fontElms = Array.from(body.querySelectorAll('font'));
  fontElms.forEach(font => {
    const face = font.getAttribute('face') || '';
    if (face.toLowerCase() === 'monospace') {
      const parent = font.parentNode;
      if (parent) {
        const codeEl = doc.createElement('code');
        codeEl.innerHTML = font.innerHTML;
        parent.replaceChild(codeEl, font);
      }
    }
  });

  return body.innerHTML;
}

// Convert HTML String to Blocks
export function htmlToBlocks(html: string): EditorBlock[] {
  if (!html) {
    return [{ id: crypto.randomUUID(), type: 'paragraph', content: '' }];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  const blocks: EditorBlock[] = [];

  const addBlock = (type: EditorBlock['type'], content: string, extra: Partial<EditorBlock> = {}) => {
    const cleanedContent = cleanBlockHTML(content, type);
    // Detection for indent from CSS or data-attributes
    let indent = 0;
    if (extra.indent !== undefined) indent = extra.indent;

    blocks.push({
      id: crypto.randomUUID(),
      type,
      content: cleanedContent,
      indent,
      ...extra
    });
  };

  const children = Array.from(body.children);
  if (children.length === 0 && body.innerHTML) {
    addBlock('paragraph', body.innerHTML);
    return blocks;
  }

  children.forEach((child) => {
    const tagName = child.tagName.toLowerCase();
    const dataType = child.getAttribute('data-type');

    if (child.classList.contains('bookmark-block') || dataType === 'bookmark') {
      const url = child.getAttribute('data-url') || '';
      const status = child.getAttribute('data-status') || 'empty';
      let title = '';
      try {
        title = decodeURIComponent(child.getAttribute('data-title') || '');
      } catch (e) {
        title = child.getAttribute('data-title') || '';
      }
      addBlock('bookmark', '', { meta: { url, status, title } });
    } else if (child.classList.contains('audio-generator-block') || dataType === 'audio_generator') {
      let text = '';
      try {
        text = decodeURIComponent(child.getAttribute('data-text') || '');
      } catch (e) {
        text = child.getAttribute('data-text') || '';
      }
      let title = '';
      try {
        title = decodeURIComponent(child.getAttribute('data-title') || '');
      } catch (e) {
        title = child.getAttribute('data-title') || '';
      }
      const status = child.getAttribute('data-status') || 'idle';
      addBlock('audio_generator', '', { meta: { text, status, title } });
    } else if (child.classList.contains('column-block') || dataType === 'column') {
      let col1Content = '';
      let col2Content = '';
      try {
        col1Content = decodeURIComponent(child.getAttribute('data-col1') || '');
      } catch (e) {
        col1Content = child.getAttribute('data-col1') || '';
      }
      try {
        col2Content = decodeURIComponent(child.getAttribute('data-col2') || '');
      } catch (e) {
        col2Content = child.getAttribute('data-col2') || '';
      }
      addBlock('column', '', { col1Content, col2Content });
    } else if (child.classList.contains('page-link-block') || dataType === 'page_link') {
      const subPageId = child.getAttribute('data-subpageid') || '';
      addBlock('page_link', child.innerHTML, { subPageId });
    } else if (child.classList.contains('toc-block') || dataType === 'toc') {
      addBlock('toc', '');
    } else if (child.classList.contains('synced-block') || dataType === 'synced') {
      const syncedBlockId = child.getAttribute('data-synced-id') || '';
      addBlock('synced', child.innerHTML, { syncedBlockId });
    } else if (child.classList.contains('toggle-h1-block') || dataType === 'toggle_h1') {
      const isExpanded = child.getAttribute('data-expanded') === 'true';
      addBlock('toggle_h1', child.innerHTML, { isExpanded });
    } else if (child.classList.contains('toggle-h2-block') || dataType === 'toggle_h2') {
      const isExpanded = child.getAttribute('data-expanded') === 'true';
      addBlock('toggle_h2', child.innerHTML, { isExpanded });
    } else if (child.classList.contains('toggle-h3-block') || dataType === 'toggle_h3') {
      const isExpanded = child.getAttribute('data-expanded') === 'true';
      addBlock('toggle_h3', child.innerHTML, { isExpanded });
    } else if (child.classList.contains('database-block') || dataType === 'database') {
      let databaseData: any;
      try {
        databaseData = JSON.parse(decodeURIComponent(child.getAttribute('data-database') || '{}'));
      } catch (e) {
        databaseData = undefined;
      }
      addBlock('database', '', { databaseData });
    } else if (child.classList.contains('embed-block') || dataType === 'embed') {
      const provider = (child.getAttribute('data-provider') as any) || 'custom';
      const url = child.getAttribute('data-url') || '';
      addBlock('embed', '', { embedData: { provider, url } });
    } else if (child.classList.contains('table-view-block') || dataType === 'table_view') {
      addBlock('table_view', '');
    } else if (child.classList.contains('extension-block') || (dataType && !['bookmark', 'audio_generator', 'column', 'page_link', 'toc', 'synced', 'toggle_h1', 'toggle_h2', 'toggle_h3', 'database', 'embed', 'table_view', 'callout', 'sandbox', 'media', 'taskList', 'paragraph', 'h1', 'h2', 'h3', 'bullet', 'ordered', 'todo', 'code', 'quote', 'hr', 'table'].includes(dataType))) {
      const extType = dataType || (child.classList.contains('extension-block') ? child.getAttribute('data-type') : null);
      if (extType) {
        const metaAttr = child.getAttribute('data-meta');
        let meta = undefined;
        if (metaAttr) {
          try {
            meta = JSON.parse(decodeURIComponent(metaAttr));
          } catch (e) {}
        }
        addBlock(extType, child.innerHTML, { meta });
      }
    } else if (tagName === 'h1' || child.classList.contains('h1')) {
      addBlock('h1', child.innerHTML);
    } else if (tagName === 'h2' || child.classList.contains('h2')) {
      addBlock('h2', child.innerHTML);
    } else if (tagName === 'h3' || child.classList.contains('h3')) {
      addBlock('h3', child.innerHTML);
    } else if (tagName === 'blockquote') {
      addBlock('quote', child.innerHTML);
    } else if (tagName === 'hr') {
      addBlock('hr', '');
    } else if (tagName === 'p') {
      addBlock('paragraph', child.innerHTML);
    } else if (tagName === 'ul' || tagName === 'ol') {
      const isTaskList = child.classList.contains('task-list') || child.getAttribute('data-type') === 'taskList';
      const items = Array.from(child.children);
      items.forEach((li) => {
        const hasCheckbox = li.querySelector('input[type="checkbox"]') !== null;
        if (tagName === 'ul' && (isTaskList || hasCheckbox || li.hasAttribute('data-checked') || li.classList.contains('task-item-modern'))) {
          const checked = li.getAttribute('data-checked') === 'true' || 
                          li.classList.contains('checked') || 
                          li.querySelector('input[type="checkbox"]')?.hasAttribute('checked') || 
                          (li.querySelector('input[type="checkbox"]') as HTMLInputElement)?.checked ||
                          li.querySelector('input[type="checkbox"]')?.getAttribute('checked') === 'checked';
          
          const label = li.querySelector('label');
          let textContent = label ? label.innerHTML : li.innerHTML;
          if (!label) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = textContent;
            const cb = tempDiv.querySelector('input[type="checkbox"]');
            if (cb) cb.remove();
            textContent = tempDiv.innerHTML.trim();
          }
          addBlock('todo', textContent, { checked: !!checked });
        } else {
          addBlock(tagName === 'ul' ? 'bullet' : 'ordered', li.innerHTML);
        }
      });
    } else if (tagName === 'pre') {
      const code = child.querySelector('code');
      const text = code ? code.innerHTML : child.innerHTML;
      const lang = code?.getAttribute('class')?.replace('language-', '') || 'javascript';
      addBlock('code', text, { language: lang });
    } else if (child.classList.contains('callout') || child.getAttribute('data-type') === 'callout') {
      const emoji = child.getAttribute('data-emoji') || '💡';
      addBlock('callout', child.innerHTML, { emoji });
    } else if (child.classList.contains('sandbox-block') || child.getAttribute('data-type') === 'sandbox') {
      addBlock('sandbox', child.innerHTML);
    } else if (child.classList.contains('media-block') || child.getAttribute('data-type') === 'media' || child.classList.contains('media-upload-block')) {
      const id = child.getAttribute('data-id') || crypto.randomUUID();
      const type = (child.getAttribute('data-media-type') as any) || 'image';
      const fileName = child.getAttribute('data-name') || '';
      const fileSize = child.getAttribute('data-size') || '';
      const status = (child.getAttribute('data-status') as any) || 'completed';
      const url = child.getAttribute('data-url') || '';
      addBlock('media', '', {
        mediaData: { id, type, fileName, fileSize, status, url }
      });
    } else if (tagName === 'table') {
      const rows: string[][] = [];
      const trs = Array.from(child.querySelectorAll('tr'));
      trs.forEach((tr) => {
        const rowCells: string[] = [];
        const cells = Array.from(tr.querySelectorAll('td, th'));
        cells.forEach((cell) => {
          rowCells.push(cell.innerHTML);
        });
        rows.push(rowCells);
      });
      addBlock('table', '', { 
        tableData: rows.length ? rows : [["", "", ""], ["", "", ""], ["", "", ""]],
        withHeaderRow: child.querySelector('th') !== null
      });
    } else {
      addBlock('paragraph', child.innerHTML || child.textContent || '');
    }
  });

  return blocks;
}

// Convert Blocks back to HTML String
export function blocksToHtml(blocks: EditorBlock[]): string {
  let html = '';

  blocks.forEach((block) => {
    switch (block.type) {
      case 'toc':
        html += `<div class="toc-block" data-type="toc" style="margin-left: ${(block.indent || 0) * 24}px"></div>`;
        break;
      case 'synced':
        html += `<div class="synced-block" data-type="synced" data-synced-id="${block.syncedBlockId || ''}" style="margin-left: ${(block.indent || 0) * 24}px">${block.content}</div>`;
        break;
      case 'toggle_h1':
        html += `<div class="toggle-h1-block" data-type="toggle_h1" data-expanded="${block.isExpanded ? 'true' : 'false'}" style="margin-left: ${(block.indent || 0) * 24}px">${block.content}</div>`;
        break;
      case 'toggle_h2':
        html += `<div class="toggle-h2-block" data-type="toggle_h2" data-expanded="${block.isExpanded ? 'true' : 'false'}" style="margin-left: ${(block.indent || 0) * 24}px">${block.content}</div>`;
        break;
      case 'toggle_h3':
        html += `<div class="toggle-h3-block" data-type="toggle_h3" data-expanded="${block.isExpanded ? 'true' : 'false'}" style="margin-left: ${(block.indent || 0) * 24}px">${block.content}</div>`;
        break;
      case 'database': {
        const dbJson = encodeURIComponent(JSON.stringify(block.databaseData || {}));
        html += `<div class="database-block" data-type="database" data-database="${dbJson}" style="margin-left: ${(block.indent || 0) * 24}px"></div>`;
        break;
      }
      case 'embed':
        html += `<div class="embed-block" data-type="embed" data-provider="${block.embedData?.provider || 'custom'}" data-url="${block.embedData?.url || ''}" style="margin-left: ${(block.indent || 0) * 24}px"></div>`;
        break;
      case 'table_view':
        html += `<div class="table-view-block" data-type="table_view" style="margin-left: ${(block.indent || 0) * 24}px"></div>`;
        break;
      case 'bookmark':
        html += `<div class="bookmark-block" data-type="bookmark" data-url="${block.meta?.url || ''}" data-status="${block.meta?.status || 'empty'}" data-title="${encodeURIComponent(block.meta?.title || '')}" style="margin-left: ${(block.indent || 0) * 24}px"></div>`;
        break;
      case 'audio_generator':
        html += `<div class="audio-generator-block" data-type="audio_generator" data-text="${encodeURIComponent(block.meta?.text || '')}" data-status="${block.meta?.status || 'idle'}" data-title="${encodeURIComponent(block.meta?.title || '')}" style="margin-left: ${(block.indent || 0) * 24}px"></div>`;
        break;
      case 'column':
        html += `<div class="column-block" data-type="column" data-col1="${encodeURIComponent(block.col1Content || '')}" data-col2="${encodeURIComponent(block.col2Content || '')}" style="margin-left: ${(block.indent || 0) * 24}px"></div>`;
        break;
      case 'page_link':
        html += `<div class="page-link-block" data-type="page_link" data-subpageid="${block.subPageId || ''}" style="margin-left: ${(block.indent || 0) * 24}px">${block.content || ''}</div>`;
        break;
      case 'paragraph':
        html += `<p style="margin-left: ${(block.indent || 0) * 24}px">${block.content}</p>`;
        break;
      case 'h1':
        html += `<h1 style="margin-left: ${(block.indent || 0) * 24}px">${block.content}</h1>`;
        break;
      case 'h2':
        html += `<h2 style="margin-left: ${(block.indent || 0) * 24}px">${block.content}</h2>`;
        break;
      case 'h3':
        html += `<h3 style="margin-left: ${(block.indent || 0) * 24}px">${block.content}</h3>`;
        break;
      case 'quote':
        html += `<blockquote style="margin-left: ${(block.indent || 0) * 24}px">${block.content}</blockquote>`;
        break;
      case 'hr':
        html += `<hr style="margin-left: ${(block.indent || 0) * 24}px" />`;
        break;
      case 'bullet':
        html += `<ul data-type="bullet" style="margin-left: ${(block.indent || 0) * 24}px"><li>${block.content}</li></ul>`;
        break;
      case 'ordered':
        html += `<ol data-type="ordered" style="margin-left: ${(block.indent || 0) * 24}px"><li>${block.content}</li></ol>`;
        break;
      case 'todo':
        html += `<ul data-type="taskList" style="margin-left: ${(block.indent || 0) * 24}px"><li class="${block.checked ? 'checked task-item-modern' : 'task-item-modern'}" data-checked="${block.checked ? 'true' : 'false'}"><input type="checkbox" ${block.checked ? 'checked' : ''} disabled><label>${block.content}</label></li></ul>`;
        break;
      case 'toggle':
        html += `<div class="toggle-list" data-type="toggle" style="margin-left: ${(block.indent || 0) * 24}px" data-expanded="${block.isExpanded ? 'true' : 'false'}">${block.content}</div>`;
        break;
      case 'code':
        html += `<pre style="margin-left: ${(block.indent || 0) * 24}px"><code class="language-${block.language || 'javascript'}">${block.content}</code></pre>`;
        break;
      case 'callout':
        html += `<div class="callout" data-type="callout" data-emoji="${block.emoji || '💡'}">${block.content}</div>`;
        break;
      case 'sandbox':
        html += `<div class="sandbox-block" data-type="sandbox">${block.content}</div>`;
        break;
      case 'media':
        if (block.mediaData) {
          const { id, type, fileName, fileSize, status, url } = block.mediaData;
          html += `<div class="media-block" data-type="media" data-id="${id}" data-media-type="${type}" data-name="${fileName}" data-size="${fileSize}" data-status="${status}" data-url="${url || ''}"></div>`;
        }
        break;
      case 'table':
        if (block.tableData) {
          html += `<table><tbody>`;
          block.tableData.forEach((row, rIdx) => {
            html += `<tr>`;
            row.forEach((cell) => {
              if (block.withHeaderRow && rIdx === 0) {
                html += `<th>${cell}</th>`;
              } else {
                html += `<td>${cell}</td>`;
              }
            });
            html += `</tr>`;
          });
          html += `</tbody></table>`;
        }
        break;
      default:
        {
          // Extension block serialization
          const metaStr = block.meta ? encodeURIComponent(JSON.stringify(block.meta)) : '';
          html += `<div class="extension-block" data-type="${block.type}" data-meta="${metaStr}" style="margin-left: ${(block.indent || 0) * 24}px">${block.content || ''}</div>`;
          break;
        }
    }
  });

  return html;
}
