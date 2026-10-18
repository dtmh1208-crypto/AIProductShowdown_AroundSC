import React from 'react';
import { navigateTo, shouldNavigate } from '../utils/navigation';

// Actual hrefs also support refresh, open-in-new-tab and navigation without JS interception.
export function PageLink({ href, children, onClick, ...props }) {
  return <a {...props} href={href} onClick={(event) => {
    onClick?.(event);
    if (href.startsWith('/') && !href.startsWith('//') && !props.download && shouldNavigate(event, props.target)) {
      event.preventDefault();
      navigateTo(href);
    }
  }}>{children}</a>;
}
