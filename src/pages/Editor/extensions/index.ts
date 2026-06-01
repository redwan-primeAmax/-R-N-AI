import SearchAndReplace from '@sereneinserenade/tiptap-search-and-replace';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Placeholder } from '@tiptap/extension-placeholder';
import FocusClasses from '@tiptap/extension-focus';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Image } from '@tiptap/extension-image';
import { Details } from '@tiptap/extension-details';
import { DetailsSummary } from '@tiptap/extension-details-summary';
import { DetailsContent } from '@tiptap/extension-details-content';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Link } from '@tiptap/extension-link';
import { Typography } from '@tiptap/extension-typography';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';
import Youtube from '@tiptap/extension-youtube';
import { common, createLowlight } from 'lowlight';

import { CustomCodeBlock } from './CodeBlockExtension';
import { Callout } from './CalloutExtension';
import { MediaExtension } from './MediaExtension';

export const getEditorExtensions = () => [
  SearchAndReplace,
  StarterKit.configure({ 
    heading: { levels: [1, 2, 3, 4, 5, 6] }, 
    horizontalRule: false,
    codeBlock: false 
  }),
  Underline, 
  TaskList, 
  TaskItem.configure({ 
    nested: true,
    HTMLAttributes: {
      class: 'task-item-modern',
    },
  }), 
  Highlight.configure({ multicolor: true }),
  TextStyle, 
  Color, 
  FontFamily, 
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Placeholder.configure({ 
    placeholder: () => ""
  }),
  FocusClasses.configure({
    className: 'has-focus',
    mode: 'all',
  }),
  Youtube.configure({ controls: false, nocookie: true }),
  Image.configure({ HTMLAttributes: { class: 'rounded-xl max-w-full h-auto border border-white/10' } }),
  Details, 
  DetailsSummary, 
  DetailsContent, 
  Table.configure({ resizable: true }),
  TableRow, 
  TableHeader, 
  TableCell, 
  Link.configure({ openOnClick: true, linkOnPaste: true, protocols: ['http', 'https'] }),
  Typography, 
  HorizontalRule, 
  CustomCodeBlock.configure({ lowlight: createLowlight(common) }),
  Callout, 
  MediaExtension,
  GlobalDragHandle.configure({ 
    dragHandleWidth: 32, // Slightly wider to be easier to grab
    scrollTreshold: 5,   // Minimal threshold for better accuracy
  }),
];
