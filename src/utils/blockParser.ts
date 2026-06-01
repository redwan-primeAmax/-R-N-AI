/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EditorBlock {
  id: string;
  type: 'paragraph' | 'h1' | 'h2' | 'h3' | 'bullet' | 'ordered' | 'todo' | 'code' | 'quote' | 'callout' | 'hr' | 'table' | 'media' | 'sandbox';
  content: string;
  checked?: boolean;
  language?: string;
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
    blocks.push({
      id: crypto.randomUUID(),
      type,
      content: cleanedContent,
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

    if (tagName === 'h1' || child.classList.contains('h1')) {
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
      addBlock('callout', child.innerHTML);
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
      case 'paragraph':
        html += `<p>${block.content}</p>`;
        break;
      case 'h1':
        html += `<h1>${block.content}</h1>`;
        break;
      case 'h2':
        html += `<h2>${block.content}</h2>`;
        break;
      case 'h3':
        html += `<h3>${block.content}</h3>`;
        break;
      case 'quote':
        html += `<blockquote>${block.content}</blockquote>`;
        break;
      case 'hr':
        html += `<hr />`;
        break;
      case 'bullet':
        html += `<ul data-type="bullet"><li>${block.content}</li></ul>`;
        break;
      case 'ordered':
        html += `<ol data-type="ordered"><li>${block.content}</li></ol>`;
        break;
      case 'todo':
        html += `<ul data-type="taskList"><li class="${block.checked ? 'checked task-item-modern' : 'task-item-modern'}" data-checked="${block.checked ? 'true' : 'false'}"><input type="checkbox" ${block.checked ? 'checked' : ''} disabled><label>${block.content}</label></li></ul>`;
        break;
      case 'code':
        html += `<pre><code class="language-${block.language || 'javascript'}">${block.content}</code></pre>`;
        break;
      case 'callout':
        html += `<div class="callout" data-type="callout">${block.content}</div>`;
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
    }
  });

  return html;
}
