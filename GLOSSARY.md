# aroundSC

A campus discovery and scheduling web application that visualizes real-time and upcoming University of Southern California (USC) events on an interactive map and list, detecting calendar conflicts and enabling frictionless RSVP.

## Language

**Event**:
A scheduled campus happening with a defined start time, end time, location, category, and RSVP link.
_Avoid_: Activity, post, session

**Campus Location**:
A designated building, plaza, or outdoor facility at USC with geo-coordinates (latitude and longitude).
_Avoid_: Venue spot, place

**Live Event**:
An event currently in progress based on the current wall-clock time relative to its start and end times.
_Avoid_: Ongoing session, real-time activity

**Upcoming Event**:
An event scheduled to start at a future date or time.
_Avoid_: Future listing, scheduled post

**Schedule Block**:
A predefined, recurring time block representing a student's class or existing academic commitment.
_Avoid_: Class slot, timetable item

**Calendar Conflict**:
A temporal overlap between an event's time interval and any schedule block on the student's personal calendar.
_Avoid_: Schedule collision, double booking

**Calendar Conflict Modal**:
A modal confirmation dialog alerting the student of a schedule overlap before confirming an RSVP.
_Avoid_: Warning popup, overlap alert

**RSVP**:
A student's recorded action registering intent to attend an event, toggling attendance state and syncing to calendar.
_Avoid_: Sign-up, enrollment, booking

**Free Food Flag**:
An attribute indicating the event offers complimentary food or refreshments to attendees.
_Avoid_: Meal perk, free snack tag

**Map View**:
An interactive, geospatial view presenting campus buildings and event pins with clustering and status indicators.
_Avoid_: 3D tour, satellite view

**List View**:
A structured, chronological card layout of events alternative to the map view.
_Avoid_: Feed, table
