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
    <div className={`space-y-4 ${className}`}>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="leading-relaxed">
          {paragraph.trim()}
        </p>
      ))}
    </div>
  );
}
