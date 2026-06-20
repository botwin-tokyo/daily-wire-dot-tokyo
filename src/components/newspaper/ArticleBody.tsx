/**
 * Render a full plain-text article body as newspaper paragraphs.
 */
export function ArticleBody({
  content,
  className = "",
}: {
  content: string | undefined;
  className?: string;
}) {
  const text = (content ?? "").trim();
  if (!text) return null;

  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0);

  return (
    <div className={`space-y-4 font-serif text-[16px] leading-relaxed ${className}`}>
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph.trim()}</p>
      ))}
    </div>
  );
}
