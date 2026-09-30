/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EditorBlock } from '../../../utils/blockParser';

type ToggleableType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'quote' | 'bullet' | 'ordered' | 'todo' | 'code';

function resolveActiveId(blocks: EditorBlock[], activeBlockId: string | null): string | null {
  return (
    activeBlockId ||
    document.activeElement?.getAttribute('data-block-id') ||
    document.activeElement?.getAttribute('id') ||
    (blocks.length > 0 ? blocks[blocks.length - 1].id : null)
  );
}

function isSpecialized(block: EditorBlock | undefined): boolean {
  if (!block) return true;
  return !['paragraph', 'h1', 'h2', 'h3', 'quote', 'bullet', 'ordered', 'todo'].includes(block.type);
}

function toggleBlockType(
  blocks: EditorBlock[],
  targetType: ToggleableType,
  activeBlockId: string | null,
  extraProps?: Partial<EditorBlock>
): EditorBlock[] {
  if (blocks.length === 0) return blocks;
  const activeId = resolveActiveId(blocks, activeBlockId);
  if (!activeId) return blocks;

  const activeBlock = blocks.find(b => b.id === activeId);
  if (!activeBlock) return blocks;

  if (isSpecialized(activeBlock)) {
    const newBlock: EditorBlock = {
      id: crypto.randomUUID(),
      type: targetType,
      content: '',
      ...extraProps
    };
    const idx = blocks.findIndex(b => b.id === activeId);
    if (idx > -1) {
      const res = [...blocks];
      res.splice(idx + 1, 0, newBlock);
      return res;
    }
    return [...blocks, newBlock];
  }

  const shouldRevert = activeBlock.type === targetType && targetType !== 'paragraph';

  return blocks.map(b =>
    b.id === activeId
      ? { ...b, type: shouldRevert ? 'paragraph' : targetType, ...extraProps }
      : b
  );
}

export function setParagraph(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  return toggleBlockType(blocks, 'paragraph', activeBlockId);
}

export function toggleHeading(blocks: EditorBlock[], level: number, activeBlockId: string | null): EditorBlock[] {
  return toggleBlockType(blocks, `h${level}` as ToggleableType, activeBlockId);
}

export function toggleBulletList(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  return toggleBlockType(blocks, 'bullet', activeBlockId);
}

export function toggleOrderedList(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  return toggleBlockType(blocks, 'ordered', activeBlockId);
}

export function toggleTaskList(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  return toggleBlockType(blocks, 'todo', activeBlockId, { checked: false });
}

export function toggleBlockquote(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  return toggleBlockType(blocks, 'quote', activeBlockId);
}

export function toggleCodeBlock(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  return toggleBlockType(blocks, 'code', activeBlockId, { language: 'javascript' });
}

export { toggleBlockType, resolveActiveId };
