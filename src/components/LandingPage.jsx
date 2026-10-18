import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X, Search, MapPin, CalendarCheck } from 'lucide-react';
import { AroundSCHero } from './AroundSCHero';
import { FeaturedEventCard } from './FeaturedEventCard';
import { PageLink } from './PageLink';

export function LandingPage({ events, onSelectEvent }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const contentRef = useRef(null);
  const menuButtonRef = useRef(null);
  const featured = [...new Map([...events.filter((event) => event.dataset === 'verified'), ...events.filter((event) => event.featured), ...events].map((event) => [event.id, event])).values()].slice(0, 4);
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    contentRef.current?.querySelectorAll('[data-home-reveal]').forEach((element) => { element.classList.add('reveal-ready'); observer.observe(element); });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButtonRef.current?.focus(); }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);
  return <div ref={contentRef} className="home-page">
    <header className="pulse-header home-header">
      <PageLink href="/" className="pulse-wordmark" aria-label="AroundSC home"><span className="pulse-brand-icon" aria-hidden="true"><i /><i /><i /><i /></span>around<span>SC</span>.</PageLink>
      <button ref={menuButtonRef} type="button" className="home-menu-toggle" aria-expanded={menuOpen} aria-controls="home-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <nav id="home-navigation" className={`home-navigation${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation"><PageLink href="/discover" onClick={() => setMenuOpen(false)}>Discover</PageLink><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#about" onClick={() => setMenuOpen(false)}>About</a><PageLink href="/discover" className="pulse-button pulse-button-gold" onClick={() => setMenuOpen(false)}>Explore Events <ArrowUpRight size={16} /></PageLink></nav>
    </header>
    <main id="main-content" tabIndex={-1}>
      <AroundSCHero events={events} onSelectEvent={onSelectEvent} />
      <section id="featured-events" className="home-featured home-section">
        <div className="pulse-section-intro" data-home-reveal><div><span className="pulse-section-kicker">01 / THE DISCOVERY EDIT</span><h2>Good plans.<br /><em>Great company.</em></h2></div><div className="home-section-aside"><p>A few places to start. Follow your curiosity from here.</p><span className="home-showcase-note">Showcase selection · sample events & public USC listings</span><PageLink href="/discover">Explore all events <ArrowUpRight size={17} /></PageLink></div></div>
        <div className="home-featured-grid">{featured.map((event, index) => <div key={event.id} data-home-reveal style={{ '--reveal-delay': `${index * 70}ms` }}><FeaturedEventCard event={event} index={index} onSelectEvent={onSelectEvent} /></div>)}</div>
      </section>
      <section id="how-it-works" className="home-how">
        <div className="home-section"><div className="pulse-section-intro" data-home-reveal><div><span className="pulse-section-kicker">02 / FROM CURIOUS TO COUNT ME IN</span><h2>A good plan.<br /><em>Three small steps.</em></h2></div><p>Your free hour deserves something better than another scroll.</p></div>
          <div className="home-steps">{[
            { icon: Search, title: 'Tell us your thing.', copy: 'Use Ask AroundSC to describe your interests, free time, and campus location.', tag: '01 / SEARCH' },
            { icon: MapPin, title: 'Find your scene.', copy: 'Explore matching events on the campus map or browse the list. Narrow it down with filters.', tag: '02 / DISCOVER' },
            { icon: CalendarCheck, title: 'Make room for it.', copy: 'Open the details, check mock-schedule conflicts, save a local RSVP, or use an organizer’s registration link.', tag: '03 / SHOW UP' },
          ].map(({ icon: Icon, title, copy, tag }) => <article key={tag} data-home-reveal><span className="home-step-tag">{tag}</span><div className="home-step-icon"><Icon size={34} strokeWidth={1.5} /></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
        </div>
      </section>
      <section id="about" className="home-about home-section" data-home-reveal><span className="home-about-star" aria-hidden="true">✳</span><div><span className="pulse-section-kicker">BUILT AROUND THE IN-BETWEEN</span><h2>There’s more to campus<br />than your next class.</h2><p>AroundSC is an independent student prototype for finding connection in the everyday. The showcase combines sample events and manually curated public USC listings. It isn’t an official USC service or a live event feed.</p></div></section>
      <section className="home-final-cta"><div data-home-reveal><span className="pulse-eyebrow">YOUR NEXT THING IS OUT THERE.</span><h2>Go find <em>your people.</em></h2><PageLink href="/discover" className="pulse-button pulse-button-gold">Explore Events <ArrowUpRight size={20} /></PageLink></div><span className="home-cta-orbit" aria-hidden="true">↗</span></section>
    </main>
  </div>;
}
