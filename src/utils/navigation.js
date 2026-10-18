export function resolvePage(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/' ? 'home' : path === '/discover' ? 'discover' : 'not-found';
}

export function navigateTo(href) {
  const destination = new URL(href, window.location.href);
  window.history.pushState({}, '', destination.pathname + destination.search + destination.hash);
  window.dispatchEvent(new Event('popstate'));
}

export function shouldNavigate(event, target) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey
    && !event.shiftKey && !event.altKey && (!target || target === '_self');
}
