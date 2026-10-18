import React from 'react';
import { ArrowUpRight, ArrowDown, MapPin } from 'lucide-react';
import { FeaturedEventCard } from './FeaturedEventCard';
import { PageLink } from './PageLink';
import { CATEGORIES } from './FiltersBar';
import { isEventLive } from '../utils/calendar';

export function AroundSCHero({ events, onSelectEvent }) {
  const spotlight = events.find((event) => event.featured && isEventLive(event.startTime, event.endTime)) || events[0];
  const nextEvent = events.find((event) => event.id !== spotlight?.id && event.category !== spotlight?.category);
  return <>
    <section className="pulse-hero home-hero" aria-labelledby="pulse-headline">
      <div className="pulse-hero-grid" aria-hidden="true" />
      <svg className="pulse-wave" viewBox="0 0 1440 400" fill="none" aria-hidden="true"><path d="M0 230H280L330 190L365 270L415 70L470 340L525 170L570 230H890L940 190L980 260L1025 110L1070 300L1115 230H1440" /></svg>
      <div className="pulse-hero-inner">
        <div className="pulse-hero-copy">
          <div className="pulse-eyebrow pulse-enter"><span className="pulse-dot" /> AROUNDSC · LOS ANGELES</div>
          <h1 id="pulse-headline" className="pulse-enter pulse-delay-1">Your campus.<br />Your people.<br /><span>Your next thing.</span></h1>
          <p className="pulse-hero-description pulse-enter pulse-delay-2">Find the talk, the club, the creative detour. Discover what’s happening around campus—and where you fit in.</p>
          <div className="pulse-hero-actions pulse-enter pulse-delay-3"><PageLink href="/discover" className="pulse-button pulse-button-gold">Explore Events <ArrowUpRight size={19} /></PageLink><a className="pulse-text-link" href="#how-it-works">How it works <ArrowDown size={16} /></a></div>
          <div className="home-hero-caption pulse-enter pulse-delay-3"><span>LESS SEARCHING.</span><span>MORE SHOWING UP.</span></div>
        </div>
        <div className="pulse-hero-art pulse-enter pulse-delay-2">
          <div className="pulse-orbit home-orbit" aria-hidden="true"><span>GO WHERE THE GOOD STUFF IS</span></div>
          <div className="pulse-editor-note"><span>YOUR NEXT STORY STARTS HERE</span><ArrowUpRight size={22} /></div>
          {spotlight && <div className="home-hero-feature"><FeaturedEventCard event={spotlight} onSelectEvent={onSelectEvent} compact /></div>}
          {nextEvent && <button className="pulse-next-card" onClick={() => onSelectEvent(nextEvent)}><span className="pulse-next-category">ALSO ON THE RADAR / {nextEvent.category}</span><strong>{nextEvent.title}</strong><span className="pulse-next-meta"><MapPin size={13} />{nextEvent.location.code || nextEvent.location.name}<ArrowUpRight size={19} /></span></button>}
        </div>
      </div>
      <div className="pulse-hero-bottom"><span>INDEPENDENT STUDENT PROTOTYPE</span><a href="#featured-events">FIND YOUR SCENE <ArrowDown size={14} /></a><span>NO ORDINARY CAMPUS DAY.</span></div>
    </section>
    <nav className="pulse-category-ribbon" aria-label="Explore event categories"><span className="pulse-ribbon-label">FIND YOUR SCENE</span>{CATEGORIES.filter((category) => category !== 'All').map((category) => <PageLink key={category} href={`/discover?category=${encodeURIComponent(category)}`}>{category}<ArrowUpRight size={15} /></PageLink>)}</nav>
  </>;
}
