/* Dates include Berlin's UTC offset; status stays correct in every visitor timezone. */
(() => {
  function updateEventStatus() {
    const now = Date.now();
    document.querySelectorAll('[data-news-event]').forEach(event => {
      const start = Date.parse(event.dataset.start);
      const end = Date.parse(event.dataset.end);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return;
      const past = now >= end;
      event.querySelectorAll('[data-event-status]').forEach(badge => {
        badge.textContent = past ? 'Past event' : now >= start ? 'Event underway' : 'Upcoming';
        badge.hidden = past && !badge.hasAttribute('data-show-past');
        badge.classList.toggle('news-status--past', past);
      });
      event.querySelectorAll('[data-event-registration]').forEach(link => { link.hidden = past; });
      event.querySelectorAll('[data-event-ended]').forEach(note => { note.hidden = !past; });
    });
  }
  updateEventStatus();
  window.addEventListener('pageshow', updateEventStatus);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateEventStatus();
  });
  setInterval(updateEventStatus, 60000);
})();
