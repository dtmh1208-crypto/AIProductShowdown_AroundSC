import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { resolvePage, navigateTo, shouldNavigate } from '../src/utils/navigation.js';
import { RAW_EVENTS } from '../src/data/eventsData.js';
import { VERIFIED_EVENT_RECORDS } from '../src/data/verifiedEvents.js';
import { buildShowcaseCollection } from '../src/utils/eventAdapter.js';

let server, App, FeaturedEventCard, PageLink, EventDetailModal;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
  ({ default: App } = await server.ssrLoadModule('/src/App.jsx'));
  ({ FeaturedEventCard } = await server.ssrLoadModule('/src/components/FeaturedEventCard.jsx'));
  ({ PageLink } = await server.ssrLoadModule('/src/components/PageLink.jsx'));
  ({ EventDetailModal } = await server.ssrLoadModule('/src/components/EventDetailModal.jsx'));
});
after(async () => { await server?.close(); });

const render = (path) => renderToStaticMarkup(React.createElement(App, { initialPath: path }));

test('root renders a distinct homepage, all required sections, and no discovery interface', () => {
  const html = render('/');
  assert.ok(html.includes('Your campus.'));
  assert.ok(html.includes('Your people.'));
  assert.ok(html.includes('Your next thing.'));
  for (const id of ['home-navigation', 'featured-events', 'how-it-works', 'about']) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(html.includes('href="/discover"'));
  assert.ok(html.includes('Explore Events'));
  assert.ok(html.includes('data-home-reveal'));
  assert.ok(html.includes('Skip to content'));
  assert.ok(html.includes('id="main-content"'));
  assert.ok(html.includes('Sample event'));
  assert.ok(html.includes('Public USC listing'));
  assert.ok(!/campus[\s_-]*pulse/i.test(html));
  assert.ok(!html.includes('id="ask-request"'));
  assert.ok(!html.includes('Interactive Campus Radar'));
  assert.ok(!html.includes('Showing <strong'));
  assert.ok(!html.includes('Trojans going'));
  assert.ok(!html.includes('class="pulse-view-toggle"'));
});

test('direct /discover renders the working discovery page without the marketing homepage', () => {
  const html = render('/discover');
  assert.ok(!/campus[\s_-]*pulse/i.test(html));
  assert.ok(html.includes('id="ask-request"'));
  assert.ok(html.includes('Interactive Campus Radar'));
  assert.ok(html.includes('Map View'));
  assert.ok(html.includes('List View'));
  assert.ok(html.includes('My Schedule'));
  assert.ok(html.includes('href="/"'));
  const count = buildShowcaseCollection(RAW_EVENTS, VERIFIED_EVENT_RECORDS).events.length;
  assert.ok(new RegExp(`Showing <strong[^>]*>${count}</strong>`).test(html));
  assert.equal((html.match(/class="map-event-marker cursor-pointer"/g) || []).length, count);
  for (const id of ['pulse-headline', 'featured-events', 'how-it-works', 'about']) assert.ok(!html.includes(`id="${id}"`), id);
});

test('route resolver supports both paths, trailing slash, and an explicit unknown page', () => {
  assert.equal(resolvePage('/'), 'home');
  assert.equal(resolvePage('/discover'), 'discover');
  assert.equal(resolvePage('/discover/'), 'discover');
  assert.equal(resolvePage('/something-else'), 'not-found');
  const missing = render('/something-else');
  assert.ok(missing.includes('That page isn’t around here.'));
  assert.ok(!missing.includes('id="ask-request"'));
});

test('featured card uses an actual record and opens the existing detail callback without invented attendance', () => {
  const event = buildShowcaseCollection(RAW_EVENTS, VERIFIED_EVENT_RECORDS).events.find((entry) => entry.dataset === 'verified');
  assert.ok(event);
  let selected;
  const card = FeaturedEventCard({ event, onSelectEvent: (value) => { selected = value; } });
  card.props.onClick();
  assert.equal(selected, event);
  const html = renderToStaticMarkup(card);
  assert.ok(html.includes(event.title));
  assert.ok(!html.includes('Trojans going'));
  const detail = renderToStaticMarkup(React.createElement(EventDetailModal, { event: selected, isOpen: true, conflictInfo: { hasConflict: false } }));
  assert.ok(detail.includes(event.sourceUrl));
  assert.ok(detail.includes(event.registrationUrl.replace(/&/g, '&amp;')));
  assert.ok(detail.includes(event.eligibility));
});

test('page links retain real URLs and History API navigation emits route changes', () => {
  const previous = globalThis.window;
  const history = [], dispatched = [];
  globalThis.window = { location: { href: 'http://localhost:5173/' }, history: { pushState: (...args) => history.push(args[2]) }, dispatchEvent: (event) => dispatched.push(event.type) };
  try {
    const event = { button: 0, preventDefault() { this.defaultPrevented = true; } };
    const link = PageLink({ href: '/discover?category=Arts', children: 'Explore events' });
    assert.equal(link.props.href, '/discover?category=Arts');
    link.props.onClick(event);
    assert.deepEqual(history, ['/discover?category=Arts']);
    assert.deepEqual(dispatched, ['popstate']);
    navigateTo('/');
    assert.equal(history[1], '/');
    assert.equal(shouldNavigate({ button: 0, metaKey: true }), false);
    assert.equal(shouldNavigate({ button: 0 }, '_blank'), false);
    for (const props of [
      { href: 'https://calendar.usc.edu/' }, { href: '//calendar.usc.edu/' },
      { href: '/discover', target: '_blank' }, { href: '/discover', download: 'events' },
    ]) {
      const nativeEvent = { button: 0, preventDefault() { this.defaultPrevented = true; } };
      PageLink({ ...props }).props.onClick(nativeEvent);
      assert.equal(nativeEvent.defaultPrevented, undefined);
    }
    assert.equal(history.length, 2);

  } finally {
    if (previous === undefined) delete globalThis.window; else globalThis.window = previous;
  }
});
