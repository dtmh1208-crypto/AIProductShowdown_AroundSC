// Calendar conflict calculation and calendar export utilities

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Converts a HH:MM 24-hr string to minutes from midnight
 */
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Checks whether an event overlaps temporally with any class in the student's mock schedule
 */
export const checkCalendarConflict = (event, schedule) => {
  if (!event || !event.startTime || !schedule || !schedule.length) {
    return { hasConflict: false, conflictingClass: null };
  }

  const evStart = new Date(event.startTime);
  const evEnd = new Date(event.endTime);
  const evDayName = DAY_NAMES[evStart.getDay()];

  const evStartMins = evStart.getHours() * 60 + evStart.getMinutes();
  const evEndMins = evEnd.getHours() * 60 + evEnd.getMinutes();

  for (const block of schedule) {
    // Check if the class meets on this day of the week
    if (block.days.includes(evDayName)) {
      const blockStartMins = timeToMinutes(block.startTime);
      const blockEndMins = timeToMinutes(block.endTime);

      // Overlap condition: (StartA < EndB) and (EndA > StartB)
      if (evStartMins < blockEndMins && evEndMins > blockStartMins) {
        return {
          hasConflict: true,
          conflictingClass: block,
          details: `${block.code}: ${block.title} (${block.startTime} - ${block.endTime}) at ${block.location}`
        };
      }
    }
  }

  return { hasConflict: false, conflictingClass: null };
};

/**
 * Checks if an event is currently happening right now
 */
export const isEventLive = (startTime, endTime) => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  return now >= start && now <= end;
};

/**
 * Checks if an event is happening today
 */
export const isEventToday = (startTime) => {
  const now = new Date();
  const start = new Date(startTime);
  return (
    now.getFullYear() === start.getFullYear() &&
    now.getMonth() === start.getMonth() &&
    now.getDate() === start.getDate()
  );
};

/**
 * Formats ISO dates into human readable range e.g. "Today, 2:00 PM – 3:30 PM"
 */
export const formatEventDateTime = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  const isToday = isEventToday(startTime);

  // Tomorrow check
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    tomorrow.getFullYear() === start.getFullYear() &&
    tomorrow.getMonth() === start.getMonth() &&
    tomorrow.getDate() === start.getDate();

  let datePrefix = '';
  if (isToday) {
    datePrefix = 'Today';
  } else if (isTomorrow) {
    datePrefix = 'Tomorrow';
  } else {
    datePrefix = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const formatTime = (d) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return `${datePrefix} • ${formatTime(start)} – ${formatTime(end)}`;
};

/**
 * Generates an instant Google Calendar event template URL
 */
export const getGoogleCalendarUrl = (event) => {
  const formatGCalDate = (isoStr) => {
    return new Date(isoStr)
      .toISOString()
      .replace(/-|:|\.\d\d\d/g, '');
  };

  const startGCal = formatGCalDate(event.startTime);
  const endGCal = formatGCalDate(event.endTime);

  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(
    `${event.description}\n\nOrganizer: ${event.organizer}\nRSVP via aroundSC`
  );
  const location = encodeURIComponent(`${event.room}, ${event.location.name}, USC UPC`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startGCal}/${endGCal}&details=${details}&location=${location}`;
};

/**
 * Generates and downloads a standard .ics file
 */
export const downloadIcsFile = (event) => {
  const formatIcsDate = (isoStr) => {
    return new Date(isoStr)
      .toISOString()
      .replace(/-|:|\.\d\d\d/g, '');
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//aroundSC//USC Campus Events//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}-${Date.now()}@aroundsc.usc.edu`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${formatIcsDate(event.startTime)}`,
    `DTEND:${formatIcsDate(event.endTime)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.room}, ${event.location.name}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.id}-aroundSC.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
