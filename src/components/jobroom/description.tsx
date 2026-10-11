import type { ReactNode } from "react";
import { cleanJobText } from "@/lib/jobroom/model";

function decode(raw: string): string {
  return cleanJobText(raw).replace(/\r\n/g, "\n");
}

function inline(text: string, key: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return parts.filter(Boolean).map((part, index) => {
    const id = `${key}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={id} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={id}>{part.slice(1, -1)}</em>;
    }
    return <span key={id}>{part}</span>;
  });
}

export function JobDescription({ text }: { text: string }) {
  const clean = decode(text).replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) {
    return <p className="text-muted">Description non publiée dans cette langue.</p>;
  }
  const blocks = clean.split(/\n\n+/);
  return (
    <div className="space-y-3 text-base leading-relaxed">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const list = lines.length > 0 && lines.every((line) => /^[-•–]\s+/.test(line));
        if (list) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1 pl-5">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{inline(line.replace(/^[-•–]\s+/, ""), `${blockIndex}-${lineIndex}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <div key={blockIndex} className="space-y-2">
            {lines.map((line, lineIndex) => {
              const heading = /^(#{1,3})\s+/.exec(line);
              if (heading) {
                return (
                  <h3 key={lineIndex} className="font-display text-lg font-medium tracking-tight">
                    {inline(line.replace(/^#{1,3}\s+/, ""), `${blockIndex}-h-${lineIndex}`)}
                  </h3>
                );
              }
              if (/^[-•–]\s+/.test(line)) {
                return (
                  <p key={lineIndex} className="pl-4">
                    {inline(line.replace(/^[-•–]\s+/, ""), `${blockIndex}-b-${lineIndex}`)}
                  </p>
                );
              }
              return <p key={lineIndex}>{inline(line, `${blockIndex}-p-${lineIndex}`)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}
