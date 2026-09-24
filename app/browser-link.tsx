import type { ComponentProps } from 'react';

// Cross-page links use native navigation because the current production Vinext
// client router can fail while initializing its RSC navigation handler.
export function BrowserLink({ children, ...props }: ComponentProps<'a'>) {
  return <a {...props}>{children}</a>;
}

// For real <a href> links that the public app handles client-side: modified
// clicks (new tab/window) keep native behaviour.
export function clientNav(e: React.MouseEvent, action: () => void) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  action();
}
