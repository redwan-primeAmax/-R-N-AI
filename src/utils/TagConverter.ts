/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility to convert custom tags to HTML and vice versa.
 * Custom tags format: [TAG]content[/TAG] or [TAG:value]content[/TAG]
 */
export const TagConverter = {
  toHTML(text: string): string {
    if (!text) return "";

    let html = text;

    // Basic formatting
    html = html.replace(/\[B\]([\s\S]*?)\[\/B\]/gi, '<b>$1</b>');
    html = html.replace(/\[I\]([\s\S]*?)\[\/I\]/gi, '<i>$1</i>');
    html = html.replace(/\[U\]([\s\S]*?)\[\/U\]/gi, '<u>$1</u>');

    // Headings (Note: H6 is largest in this app's logic, but let's stick to standard mapping or keep user's H1-H6 logic)
    // The user's system prompt said H6 is biggest. Let's respect that in the conversion if needed, 
    // but usually H1 is biggest. I'll just pass them through.
    html = html.replace(/\[H([1-6])\]([\s\S]*?)\[\/H\1\]/gi, '<h$1>$2</h$1>');

    // Colors and Highlights
    html = html.replace(/\[COLOR:([^\]]+)\]([\s\S]*?)\[\/COLOR\]/gi, '<span style="color: $1">$2</span>');
    html = html.replace(/\[BG:([^\]]+)\]([\s\S]*?)\[\/BG\]/gi, '<mark style="background-color: $1">$2</mark>');

    // Alignment and Fonts
    html = html.replace(/\[ALIGN:([^\]]+)\]([\s\S]*?)\[\/ALIGN\]/gi, '<p style="text-align: $1">$2</p>');
    html = html.replace(/\[FONT:([^\]]+)\]([\s\S]*?)\[\/FONT\]/gi, (match, font, content) => {
      const fontMap: Record<string, string> = {
        'Default': 'Inter, sans-serif',
        'Serif': 'Georgia, serif',
        'Mono': 'JetBrains Mono, monospace',
        'Cursive': 'cursive'
      };
      const fontFamily = fontMap[font] || font;
      return `<span style="font-family: ${fontFamily}">${content}</span>`;
    });

    // Lists
    html = html.replace(/\[LIST\]([\s\S]*?)\[\/LIST\]/gi, '<ul>$1</ul>');
    html = html.replace(/\[ORDERED\]([\s\S]*?)\[\/ORDERED\]/gi, '<ol>$1</ol>');
    html = html.replace(/\[ITEM\]([\s\S]*?)\[\/ITEM\]/gi, '<li>$1</li>');

    // Tasks
    html = html.replace(/\[CHECK:([^\]]+)\]([\s\S]*?)\[\/CHECK\]/gi, (match, checked, content) => {
      return `<ul data-type="taskList"><li data-checked="${checked}">${content}</li></ul>`;
    });

    // Code
    html = html.replace(/\[CODE\]([\s\S]*?)\[\/CODE\]/gi, '<code>$1</code>');
    html = html.replace(/\[BLOCK\]([\s\S]*?)\[\/BLOCK\]/gi, '<pre style="background: #f4f4f4; padding: 1rem; border-radius: 0.5rem; font-family: monospace; border: 1px solid #ddd;"><code>$1</code></pre>');

    return html;
  },

  fromHTML(html: string): string {
    if (!html) return "";

    let text = html;

    // Basic formatting
    text = text.replace(/<b>([\s\S]*?)<\/b>/gi, '[B]$1[/B]');
    text = text.replace(/<i>([\s\S]*?)<\/i>/gi, '[I]$1[/I]');
    text = text.replace(/<u>([\s\S]*?)<\/u>/gi, '[U]$1[/U]');

    // Headings
    text = text.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/gi, '[H$1]$2[/H$1]');

    // Colors and Highlights
    text = text.replace(/<span style="color: ([^"]+)">([\s\S]*?)<\/span>/gi, '[COLOR:$1]$2[/COLOR]');
    text = text.replace(/<mark style="background-color: ([^"]+)">([\s\S]*?)<\/mark>/gi, '[BG:$1]$2[/BG]');

    // Alignment and Fonts
    text = text.replace(/<p style="text-align: ([^"]+)">([\s\S]*?)<\/p>/gi, '[ALIGN:$1]$2[/ALIGN]');
    text = text.replace(/<span style="font-family: ([^"]+)">([\s\S]*?)<\/span>/gi, (match, font, content) => {
      return `[FONT:${font}]${content}[/FONT]`;
    });

    // Lists
    text = text.replace(/<ul>([\s\S]*?)<\/ul>/gi, '[LIST]$1[/LIST]');
    text = text.replace(/<ol>([\s\S]*?)<\/ol>/gi, '[ORDERED]$1[/ORDERED]');
    text = text.replace(/<li>([\s\S]*?)<\/li>/gi, '[ITEM]$1[/ITEM]');

    // Tasks
    text = text.replace(/<ul data-type="taskList"><li data-checked="([^"]+)">([\s\S]*?)<\/li><\/ul>/gi, '[CHECK:$1]$2[/CHECK]');

    // Code
    text = text.replace(/<code>([\s\S]*?)<\/code>/gi, '[CODE]$1[/CODE]');
    text = text.replace(/<pre style="[^"]+"><code>([\s\S]*?)<\/code><\/pre>/gi, '[BLOCK]$1[/BLOCK]');

    // Clean up remaining HTML tags
    text = text.replace(/<[^>]*>/g, '');

    return text;
  },

  // Helper to clean tags for chat display if we don't want to render them all
  previewClean(text: string): string {
    return text.replace(/\[\/?[A-Z0-9]+(?::[^\]]+)?\]/gi, '');
  }
};
