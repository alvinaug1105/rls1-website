import type { ComponentProps } from 'react';

// Cross-page links use native navigation because the current production Vinext
// client router can fail while initializing its RSC navigation handler.
export function BrowserLink({ children, ...props }: ComponentProps<'a'>) {
  return <a {...props}>{children}</a>;
}
