function inline(text) {
  const pieces = [];
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^ )]+\))/g;
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > offset) pieces.push(text.slice(offset, match.index));
    const token = match[0];
    if (token.startsWith("**")) pieces.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    else {
      const [, label, url] = token.match(/^\[([^\]]+)\]\((https:\/\/[^ )]+)\)$/);
      pieces.push(<a key={match.index} href={url} target="_blank" rel="noreferrer" className="text-turf underline">{label}</a>);
    }
    offset = match.index + token.length;
  }
  pieces.push(text.slice(offset));
  return pieces;
}

export default function CareerArticle({ content }) {
  if (!content?.trim()) return <p className="text-sm text-ink-soft">No article published yet.</p>;
  return <div className="space-y-2 break-words">{content.split(/\r?\n/).filter((line) => line.trim()).map((line, index) => {
    if (line.startsWith("## ")) return <h4 key={index} className="font-display text-lg">{inline(line.slice(3))}</h4>;
    if (line.startsWith("# ")) return <h3 key={index} className="font-display text-xl">{inline(line.slice(2))}</h3>;
    if (line.startsWith("- ")) return <p key={index} className="text-sm pl-3">• {inline(line.slice(2))}</p>;
    return <p key={index} className="text-sm">{inline(line)}</p>;
  })}</div>;
}
