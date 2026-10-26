(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const records = [];

  // The older ribbon-cutting background receives its own independent control.
  document.querySelectorAll('video.lazy-video').forEach(video => {
    const source = video.querySelector('source[data-src]');
    if (!source) return;
    video.dataset.videoSrc = source.dataset.src;
    video.dataset.background = 'true';
    if (!video.id) video.id = 'background-film';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'film__toggle media-background-toggle';
    button.dataset.videoToggle = video.id;
    button.setAttribute('aria-controls', video.id);
    button.textContent = 'Play background video';
    video.closest('section').append(button);
  });

  document.querySelectorAll('video[data-video-src]').forEach(video => {
    const id = video.id;
    const button = document.querySelector(`[data-video-start="${id}"]`);
    const toggle = document.querySelector(`[data-video-toggle="${id}"]`);
    const status = document.getElementById(id + '-status');
    const rec = { video, button, toggle, status, visible: false, desired: false, suspended: false, attempted: false, loaded: false };
    records.push(rec);
    const update = () => {
      if (toggle) {
        toggle.textContent = video.paused ? (video.dataset.background ? 'Play background video' : 'Play preview') : (video.dataset.background ? 'Pause background video' : 'Pause preview');
        toggle.setAttribute('aria-label', toggle.textContent);
      }
    };
    const play = async () => {
      rec.attempted = true;
      if (!rec.loaded) {
        video.src = video.dataset.videoSrc;
        video.controls = !video.dataset.background;
        video.load();
        rec.loaded = true;
      }
      if (status) status.textContent = '';
      try { await video.play(); }
      catch (_) {
        rec.desired = false;
        if (button) button.hidden = false;
        if (status) status.textContent = video.error ? 'The video could not be loaded. You can open the MP4 below.' : 'Select Play to start the video.';
        update();
      }
    };
    rec.play = play;
    if (button) button.addEventListener('click', () => { rec.desired = true; rec.suspended = false; play(); });
    if (toggle) toggle.addEventListener('click', () => {
      rec.suspended = false;
      rec.attempted = true;
      rec.desired = video.paused;
      if (rec.desired) play(); else video.pause();
    });
    video.addEventListener('play', () => {
      rec.desired = true;
      if (button) button.hidden = true;
      records.forEach(other => { if (other !== rec) { other.desired = false; other.video.pause(); } });
      // Also pause pre-existing paper videos when a demo starts.
      document.querySelectorAll('video').forEach(other => { if (other !== video && !other.dataset.videoSrc) other.pause(); });
      update();
    });
    video.addEventListener('pause', () => { if (!rec.suspended) rec.desired = false; update(); });
    video.addEventListener('ended', () => { rec.desired = false; if (button) button.hidden = false; update(); });
    video.addEventListener('error', () => {
      rec.desired = false;
      if (button) button.hidden = false;
      if (status) status.textContent = 'The video could not be loaded. You can open the MP4 below.';
      update();
    });
  });

  const suspend = rec => { rec.suspended = true; rec.video.pause(); };
  const sync = rec => {
    if (!rec.visible || document.hidden) { suspend(rec); return; }
    rec.suspended = false;
    if (!rec.attempted && rec.video.dataset.preview === 'auto' && !reduced.matches && !saveData) {
      rec.desired = true;
    }
    if (rec.desired) rec.play();
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { const rec = records.find(r => r.video === entry.target); rec.visible = entry.isIntersecting && entry.intersectionRatio >= .3; sync(rec); });
    }, { threshold: .3 });
    records.forEach(rec => observer.observe(rec.video));
  } else {
    records.forEach(rec => { rec.visible = true; });
  }
  document.addEventListener('visibilitychange', () => records.forEach(sync));
  reduced.addEventListener('change', () => {
    if (reduced.matches) records.forEach(rec => { rec.desired = false; rec.attempted = true; rec.video.pause(); });
  });
  document.querySelectorAll('video:not([data-video-src])').forEach(video => video.addEventListener('play', () => records.forEach(rec => { rec.desired = false; rec.video.pause(); })));
})();
