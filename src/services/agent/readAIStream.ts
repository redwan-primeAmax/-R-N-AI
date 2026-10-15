/** Decode SSE incrementally, including split Unicode and an unterminated last event. */
export async function readAIStream(response: Response, provider: string, onToken?: (text: string) => void): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No stream reader');
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let ended = false;
  const consume = (line: string) => {
    if (ended || !line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data) return;
    if (data === '[DONE]') { ended = true; return; }
    let parsed: any;
    try { parsed = JSON.parse(data); } catch { return; }
    if (parsed.error) throw new Error(parsed.error.message || 'AI stream failed');
    const token = provider === 'gemini'
      ? parsed.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('')
      : parsed.choices?.[0]?.delta?.content;
    if (typeof token === 'string' && token) {
      text += token;
      if (text.length > 1_000_000) throw new Error('AI response is too large');
      onToken?.(text);
    }
  };
  try {
    while (!ended) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (buffer.length > 1_000_000) throw new Error('AI stream event is too large');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(consume);
      if (done) { consume(buffer); break; }
    }
    if (!text.trim()) throw new Error('AI returned an empty response');
    return text;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
