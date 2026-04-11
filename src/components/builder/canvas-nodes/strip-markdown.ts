/** Strip markdown syntax and return plain text for canvas preview. */
export function stripMarkdown(md: string | undefined | null): string {
  if (!md) return ''
  return md
    .replace(/^#{1,6}\s+/gm, '')  // headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1')     // italic
    .replace(/__(.+?)__/g, '$1')     // bold alt
    .replace(/_(.+?)_/g, '$1')       // italic alt
    .replace(/~~(.+?)~~/g, '$1')     // strikethrough
    .replace(/`(.+?)`/g, '$1')       // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/!\[.*?\]\(.+?\)/g, '')    // images
    .replace(/^[-*>]\s+/gm, '')        // list items, blockquotes
    .replace(/\n+/g, ' ')             // newlines to spaces
    .replace(/\s+/g, ' ')             // collapse whitespace
    .trim()
}
