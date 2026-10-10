import { parseAskMarkdown, type AskInline } from "@/lib/ask/markdown";

function Inline({ parts }: { parts: AskInline[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (part.kind === "link") {
          return (
            <a key={i} href={part.href} target="_blank" rel="noreferrer">
              {part.text}
            </a>
          );
        }
        if (part.kind === "strong") return <strong key={i}>{part.text}</strong>;
        if (part.kind === "em") return <em key={i}>{part.text}</em>;
        if (part.kind === "code") return <code key={i}>{part.text}</code>;
        return <span key={i}>{part.text}</span>;
      })}
    </>
  );
}

export function AskMarkdown({ text }: { text: string }) {
  const blocks = parseAskMarkdown(text);
  if (!blocks.length) return null;
  return (
    <div className="ask-md">
      {blocks.map((block, i) => {
        if (block.kind === "hr") return <hr key={i} />;
        if (block.kind === "list") {
          return (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j}>
                  <span className="ask-marker">{item.marker}</span>
                  <span>
                    <Inline parts={item.inlines} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <Inline parts={block.inlines} />
          </p>
        );
      })}
    </div>
  );
}
