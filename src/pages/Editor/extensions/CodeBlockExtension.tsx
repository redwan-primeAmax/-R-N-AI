import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import React from 'react';
import { Copy, Check } from 'lucide-react';

const CodeBlockComponent = (props: any) => {
  const { node, updateAttributes, extension } = props;
  const language = node.attrs.language || 'auto';
  const [copied, setCopied] = React.useState(false);
  const languages = extension.options.lowlight.listLanguages();

  const copyToClipboard = () => {
    const text = node.textContent;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NodeViewWrapper className="relative group my-6 border border-white/5 rounded-2xl overflow-hidden bg-[#0a0a0a] shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/5">
        <select
          contentEditable={false}
          className="bg-transparent text-[10px] font-black uppercase tracking-widest text-white/40 focus:outline-none cursor-pointer hover:text-white transition-colors"
          value={language || 'auto'}
          onChange={e => updateAttributes({ language: e.target.value })}
        >
          <option value="auto">Auto</option>
          {languages.map((lang: string) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
        <button
          contentEditable={false}
          onClick={copyToClipboard}
          className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-white/20 hover:text-white"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="p-5 font-mono text-sm leading-relaxed overflow-x-auto">
        <NodeViewContent as="code" className={`language-${language || 'auto'}`} />
      </pre>
    </NodeViewWrapper>
  );
};

export const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
});
