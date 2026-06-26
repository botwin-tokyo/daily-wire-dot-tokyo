/**
 * Render a plain-text article body as newspaper paragraphs.
 */
export function ArticleBody({
  content,
  className = "",
  maxParagraphs,
}: {
  content: string | undefined;
  className?: string;
  maxParagraphs?: number;
}) {
  const text = (content ?? "").trim();
  if (!text) return null;

  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0);
  const visible = maxParagraphs ? paragraphs.slice(0, maxParagraphs) : paragraphs;

  return (
    <div className={`space-y-4 font-serif text-[16px] leading-relaxed ${className}`}>
      {visible.map((paragraph, i) => (
        <p key={i}>{paragraph.trim()}</p>
      ))}
    </div>
  );
}
