import katex from 'katex';
import 'katex/dist/katex.min.css';

/** A formula written by the application (never user input), rendered with KaTeX. */
export function Tex({ math, display = false }: { math: string; display?: boolean }) {
  const html = katex.renderToString(math, { displayMode: display, throwOnError: false });
  return (
    <span
      // Long formulas scroll inside their own box instead of widening the page.
      className={display ? 'block max-w-full overflow-x-auto overflow-y-hidden' : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
