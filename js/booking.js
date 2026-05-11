/**
 * Booking modal — Massagesalon Aphrodite
 *
 * Architecture (per /skills/booking-system/SKILL.md):
 *   1. On open: fetch /api/event-types, build slug → ID map
 *   2. Step "service":   user picks one of 6 massage types or intake
 *   3. Step "duration":  60 vs 90 min (skipped for fixed-duration services)
 *   4. Step "date":      a one-week date strip
 *   5. Step "time":      fetch /api/slots, render SHOP_HOURS grid with availability
 *   6. Step "details":   name, email, phone, optional notes — POST /api/bookings
 *   7. Step "confirm":   summary + .ics download
 *
 * Any element with [data-book] opens the modal. Optional [data-service]
 * pre-selects a service (used by per-massage "Boek deze" buttons).
 */

(function () {
  'use strict';

  // ─── Configuration ────────────────────────────────────────────────
  const SHOP_HOURS = {
    // 0=Sun … 6=Sat. null = closed. Slots are quoted in local Europe/Amsterdam time.
    // Aphrodite: zeven dagen open, middag tot late avond (typische centrum-salon hours)
    0: { start: '12:00', end: '22:00' },
    1: { start: '11:00', end: '23:00' },
    2: { start: '11:00', end: '23:00' },
    3: { start: '11:00', end: '23:00' },
    4: { start: '11:00', end: '23:00' },
    5: { start: '11:00', end: '23:00' },
    6: { start: '12:00', end: '23:00' },
  };

  // Each service has up to two durations. The slug is what gets created
  // as an Event Type in Cal.com. Update if the client renames things.
  const SERVICES = [
    { key: 'klassiek',   title: 'Klassieke massage',     desc: 'Ontspanning en doorbloeding, hele lichaam',   durations: [60, 90] },
    { key: 'ontspanning',title: 'Ontspanningsmassage',   desc: 'Zachte halen, etherische oliën, diepe rust',  durations: [60, 90] },
    { key: 'sensueel',   title: 'Sensuele massage',      desc: 'Aandacht en zinnelijkheid in één sessie',     durations: [60, 90] },
    { key: 'duo',        title: 'Duomassage',            desc: 'Twee bedden, één ervaring — voor stellen',    durations: [60, 90] },
    { key: 'hotstone',   title: 'Hot Stone massage',     desc: 'Warme basaltstenen, diepe spier­ontspanning', durations: [60, 90] },
    { key: 'thai',       title: 'Thaise massage',        desc: 'Strekkingen, drukpunten, hele lichaam',       durations: [60, 90] },
  ];

  const PRICE = { 60: '€85', 90: '€115' };
  const FREE_KEYS = new Set();

  // Slugs are computed as `${service.key}-${duration}`, e.g. "intuitief-60".
  const slugFor = (key, dur) => `${key}-${dur}`;

  // ─── Helpers ──────────────────────────────────────────────────────
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const fmtDateNL = (d) => d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtShortNL = (d) => d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtTimeNL = (d) => d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', hour12: false });

  const isoLocalToUTC = (yyyyMmDd, hhmm) => {
    // Treat the input as Europe/Amsterdam wall clock.
    // We rely on the user's local TZ here since the slots payload uses UTC strings
    // and we'll match by ISO start. For grid building we convert local hh:mm into
    // a Date constructed from the date string + local time, which is implicitly Amsterdam
    // when the user's browser is in NL. Cal.com receives timeZone explicitly.
    return new Date(`${yyyyMmDd}T${hhmm}:00`);
  };

  const escapeICS = (s) => String(s || '').replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n');

  const buildICS = ({ summary, description, location, start, durationMin }) => {
    const dt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(start.getTime() + durationMin * 60_000);
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//massagesalonaphrodite.nl//Booking//NL',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@massagesalonaphrodite.nl`,
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(start)}`,
      `DTEND:${dt(end)}`,
      `SUMMARY:${escapeICS(summary)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      `LOCATION:${escapeICS(location)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return lines.join('\r\n');
  };

  // ─── State ────────────────────────────────────────────────────────
  const state = {
    step: 'service',
    serviceKey: null,
    duration: null,
    date: null,        // yyyy-mm-dd string in Europe/Amsterdam
    slotISO: null,     // ISO UTC start
    eventTypeMap: null,// { "intuitief-60": 123, … }
    submitting: false,
    booking: null,
  };

  // ─── Modal mount ──────────────────────────────────────────────────
  function ensureModal() {
    let modal = $('#book-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'book-modal';
    modal.className = 'fixed inset-0 z-[100] hidden';
    modal.innerHTML = `
      <div class="book-overlay absolute inset-0 backdrop-blur-sm" style="background: rgba(42,38,32,0.45)" data-close></div>
      <div class="relative w-full h-full overflow-y-auto flex items-start sm:items-center justify-center p-3 sm:p-6">
        <div class="book-panel relative bg-bg-surface border border-border-subtle rounded-[24px] shadow-2xl w-full max-w-2xl my-6">
          <button class="book-x absolute top-4 right-4 w-9 h-9 rounded-full border border-border-subtle text-ink-muted hover:text-gold hover:border-gold transition-colors flex items-center justify-center" aria-label="Sluiten" data-close>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
          <div class="book-stepper px-6 pt-6 sm:px-9 sm:pt-8 mb-2 flex items-center gap-2 text-[10px] uppercase tracking-kicker text-ink-faint" data-stepper></div>
          <div class="book-body px-6 pb-8 sm:px-9 sm:pb-10" data-body></div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target.matches('[data-close]')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });
    return modal;
  }

  function openModal(preselectKey) {
    const modal = ensureModal();
    state.step = 'service';
    state.serviceKey = null;
    state.duration = null;
    state.date = null;
    state.slotISO = null;
    state.booking = null;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    render();

    // Preselect: jump straight into duration or date if applicable.
    if (preselectKey) {
      const svc = SERVICES.find(s => s.key === preselectKey);
      if (svc) {
        state.serviceKey = preselectKey;
        if (svc.fixed) {
          state.duration = svc.durations[0];
          state.step = 'date';
        } else {
          state.step = 'duration';
        }
        render();
      }
    }

    // Warm the event-type cache in the background.
    if (!state.eventTypeMap) loadEventTypes().then(render).catch(() => {});
  }

  function closeModal() {
    const modal = $('#book-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ─── Network ──────────────────────────────────────────────────────
  async function loadEventTypes() {
    try {
      const res = await fetch('/api/event-types');
      if (!res.ok) throw new Error('event-types HTTP ' + res.status);
      const data = await res.json();
      const map = {};
      (data.eventTypes || []).forEach(et => { map[et.slug] = et.id; });
      state.eventTypeMap = map;
      return map;
    } catch (e) {
      state.eventTypeMap = {}; // empty map = "API not yet wired" — UI degrades gracefully
      console.warn('[booking] event-types unavailable:', e.message);
      return state.eventTypeMap;
    }
  }

  async function loadSlots(eventTypeId, dateStr) {
    const start = new Date(`${dateStr}T00:00:00`);
    const end = new Date(`${dateStr}T23:59:59.999`);
    const qs = new URLSearchParams({
      eventTypeId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      timeZone: 'Europe/Amsterdam',
    });
    const res = await fetch(`/api/slots?${qs}`);
    if (!res.ok) throw new Error('slots HTTP ' + res.status);
    const data = await res.json();
    return data.slots || [];
  }

  async function postBooking(payload) {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Boeking mislukt');
    return data;
  }

  // ─── Renderers ────────────────────────────────────────────────────
  function render() {
    const modal = ensureModal();
    const stepper = modal.querySelector('[data-stepper]');
    const body = modal.querySelector('[data-body]');

    const steps = ['service', 'duration', 'date', 'time', 'details', 'confirm'];
    const visibleSteps = state.serviceKey && SERVICES.find(s => s.key === state.serviceKey)?.fixed
      ? steps.filter(s => s !== 'duration')
      : steps;
    const idx = Math.max(0, visibleSteps.indexOf(state.step));
    stepper.innerHTML = visibleSteps.map((s, i) => {
      const done = i < idx;
      const active = i === idx;
      const color = active ? 'text-gold' : done ? 'text-ink-muted' : 'text-ink-faint';
      return `<span class="${color}">${s === 'service' ? '1 Massage' : s === 'duration' ? '2 Duur' : s === 'date' ? (visibleSteps.includes('duration') ? '3' : '2') + ' Datum' : s === 'time' ? (visibleSteps.includes('duration') ? '4' : '3') + ' Tijd' : s === 'details' ? (visibleSteps.includes('duration') ? '5' : '4') + ' Gegevens' : (visibleSteps.includes('duration') ? '6' : '5') + ' Klaar'}</span>${i < visibleSteps.length - 1 ? '<span class="text-ink-faint">·</span>' : ''}`;
    }).join('');

    if (state.step === 'service')  body.innerHTML = viewService();
    if (state.step === 'duration') body.innerHTML = viewDuration();
    if (state.step === 'date')     body.innerHTML = viewDate();
    if (state.step === 'time')     body.innerHTML = viewTime();
    if (state.step === 'details')  body.innerHTML = viewDetails();
    if (state.step === 'confirm')  body.innerHTML = viewConfirm();

    // Wire post-render handlers per step
    if (state.step === 'service') wireService(body);
    if (state.step === 'duration') wireDuration(body);
    if (state.step === 'date') wireDate(body);
    if (state.step === 'time') wireTime(body);
    if (state.step === 'details') wireDetails(body);
    if (state.step === 'confirm') wireConfirm(body);
  }

  // ── View: pick service ────────────────────────────────────────────
  function viewService() {
    const cards = SERVICES.map(s => {
      const priceLine = FREE_KEYS.has(s.key) ? 'gratis' : s.fixed ? PRICE[s.durations[0]] : `${PRICE[60]} — ${PRICE[90]}`;
      return `
        <button class="text-left bg-bg-deep border border-border-subtle rounded-[16px] p-5 hover:border-gold/60 hover:bg-bg-elevated transition-all" data-pick="${s.key}">
          <p class="font-display text-xl leading-tight mb-1">${s.title}</p>
          <p class="text-xs text-ink-muted leading-snug mb-3">${s.desc}</p>
          <p class="text-[11px] tracking-kicker uppercase text-gold font-semibold">${priceLine}</p>
        </button>`;
    }).join('');
    return `
      <h2 class="font-display text-2xl sm:text-3xl leading-tight mb-2">Welke massage zoek je?</h2>
      <p class="text-sm text-ink-muted mb-6">Kies een vorm — daarna kies je de duur en het tijdstip.</p>
      <div class="grid sm:grid-cols-2 gap-3">${cards}</div>
    `;
  }
  function wireService(root) {
    $$('[data-pick]', root).forEach(btn => btn.addEventListener('click', () => {
      const key = btn.dataset.pick;
      const svc = SERVICES.find(s => s.key === key);
      state.serviceKey = key;
      if (svc.fixed) {
        state.duration = svc.durations[0];
        state.step = 'date';
      } else {
        state.step = 'duration';
      }
      render();
    }));
  }

  // ── View: pick duration ──────────────────────────────────────────
  function viewDuration() {
    const svc = SERVICES.find(s => s.key === state.serviceKey);
    return `
      <h2 class="font-display text-2xl sm:text-3xl leading-tight mb-2">Hoe lang?</h2>
      <p class="text-sm text-ink-muted mb-6">${svc.title}</p>
      <div class="grid sm:grid-cols-2 gap-3">
        ${svc.durations.map(d => `
          <button class="text-left bg-bg-deep border border-border-subtle rounded-[16px] p-6 hover:border-gold/60 hover:bg-bg-elevated transition-all" data-dur="${d}">
            <p class="font-display text-3xl leading-none mb-2">${d}<span class="text-base"> min</span></p>
            <p class="text-[11px] tracking-kicker uppercase text-gold font-semibold">${PRICE[d]}</p>
          </button>
        `).join('')}
      </div>
      <button class="mt-6 text-sm text-ink-muted hover:text-gold transition-colors" data-back>← Andere massage kiezen</button>
    `;
  }
  function wireDuration(root) {
    $$('[data-dur]', root).forEach(btn => btn.addEventListener('click', () => {
      state.duration = Number(btn.dataset.dur);
      state.step = 'date';
      render();
    }));
    root.querySelector('[data-back]')?.addEventListener('click', () => {
      state.step = 'service';
      render();
    });
  }

  // ── View: pick date ──────────────────────────────────────────────
  function viewDate() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      const yyyyMmDd = d.toISOString().slice(0, 10);
      const isOpen = !!SHOP_HOURS[d.getDay()];
      days.push({ d, yyyyMmDd, isOpen });
    }
    const grid = days.map(({ d, yyyyMmDd, isOpen }) => {
      const disabled = !isOpen;
      const cls = disabled
        ? 'opacity-30 cursor-not-allowed'
        : 'hover:border-gold/60 hover:bg-bg-elevated cursor-pointer';
      return `
        <button ${disabled ? 'disabled' : ''} class="text-center bg-bg-deep border border-border-subtle rounded-[14px] p-3 transition-all ${cls}" data-date="${yyyyMmDd}">
          <p class="text-[10px] tracking-kicker uppercase text-ink-muted">${d.toLocaleDateString('nl-NL', { weekday: 'short' })}</p>
          <p class="font-display text-2xl leading-tight mt-1">${d.getDate()}</p>
          <p class="text-[10px] text-ink-muted">${d.toLocaleDateString('nl-NL', { month: 'short' })}</p>
        </button>`;
    }).join('');
    return `
      <h2 class="font-display text-2xl sm:text-3xl leading-tight mb-2">Kies een dag</h2>
      <p class="text-sm text-ink-muted mb-6">Ma t/m Zo · 11:00 — 23:00 (zo vanaf 12:00). Ook in het weekend.</p>
      <div class="grid grid-cols-4 sm:grid-cols-7 gap-2">${grid}</div>
      <button class="mt-6 text-sm text-ink-muted hover:text-gold transition-colors" data-back>← Terug</button>
    `;
  }
  function wireDate(root) {
    $$('[data-date]', root).forEach(btn => btn.addEventListener('click', () => {
      state.date = btn.dataset.date;
      state.step = 'time';
      render();
    }));
    root.querySelector('[data-back]')?.addEventListener('click', () => {
      const svc = SERVICES.find(s => s.key === state.serviceKey);
      state.step = svc?.fixed ? 'service' : 'duration';
      render();
    });
  }

  // ── View: pick time ──────────────────────────────────────────────
  function viewTime() {
    const dayOfWeek = new Date(`${state.date}T00:00:00`).getDay();
    const hours = SHOP_HOURS[dayOfWeek];
    if (!hours) {
      return `<p class="text-ink-muted">Geen openingstijden op deze dag.</p>`;
    }
    // Build slot grid in 30-min steps.
    const slots = [];
    let [h, m] = hours.start.split(':').map(Number);
    const [eh, em] = hours.end.split(':').map(Number);
    while (h * 60 + m + (state.duration || 60) <= eh * 60 + em) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      m += 30; if (m >= 60) { h += 1; m -= 60; }
    }

    const dateLabel = fmtDateNL(new Date(`${state.date}T00:00:00`));
    const grid = slots.map(hhmm => {
      return `<button class="slot-btn bg-bg-deep border border-border-subtle rounded-[12px] py-2.5 px-3 text-sm hover:border-gold/60 hover:bg-bg-elevated transition-all" data-time="${hhmm}">${hhmm}</button>`;
    }).join('');

    return `
      <h2 class="font-display text-2xl sm:text-3xl leading-tight mb-2">Kies een tijd</h2>
      <p class="text-sm text-ink-muted mb-2">${dateLabel}</p>
      <p class="text-xs text-ink-faint mb-5" data-status>Beschikbaarheid wordt opgehaald…</p>
      <div class="grid grid-cols-3 sm:grid-cols-4 gap-2" data-grid>${grid}</div>
      <button class="mt-6 text-sm text-ink-muted hover:text-gold transition-colors" data-back>← Andere dag</button>
    `;
  }
  async function wireTime(root) {
    root.querySelector('[data-back]')?.addEventListener('click', () => {
      state.step = 'date';
      render();
    });
    const status = root.querySelector('[data-status]');
    const grid = root.querySelector('[data-grid]');

    const slug = slugFor(state.serviceKey, state.duration);
    const eventTypeId = state.eventTypeMap?.[slug];

    if (!eventTypeId) {
      status.textContent = 'Online boeken nog niet geactiveerd voor deze massage — bel of WhatsApp 06 5276 6898.';
      // Disable all slot buttons.
      $$('.slot-btn', grid).forEach(b => { b.disabled = true; b.classList.add('opacity-30', 'cursor-not-allowed'); });
      return;
    }

    try {
      const slotsAvailable = await loadSlots(eventTypeId, state.date);
      const available = new Set();
      slotsAvailable.forEach(iso => {
        // Compare to local hh:mm by converting ISO → local
        const d = new Date(iso);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        available.add(`${hh}:${mm}|${d.toISOString()}`);
      });
      const isoByHHMM = {};
      [...available].forEach(entry => {
        const [hhmm, iso] = entry.split('|');
        isoByHHMM[hhmm] = iso;
      });

      status.textContent = available.size
        ? `${available.size} ${available.size === 1 ? 'beschikbaar moment' : 'beschikbare momenten'}`
        : 'Geen beschikbare tijden op deze dag — probeer een andere dag.';

      $$('.slot-btn', grid).forEach(btn => {
        const hhmm = btn.dataset.time;
        if (isoByHHMM[hhmm]) {
          btn.addEventListener('click', () => {
            state.slotISO = isoByHHMM[hhmm];
            state.step = 'details';
            render();
          });
        } else {
          btn.disabled = true;
          btn.classList.add('opacity-25', 'cursor-not-allowed', 'line-through');
        }
      });
    } catch (e) {
      status.textContent = 'Kon beschikbaarheid niet ophalen. Probeer opnieuw of bel 06 5276 6898.';
      console.warn(e);
    }
  }

  // ── View: contact details ────────────────────────────────────────
  function viewDetails() {
    const svc = SERVICES.find(s => s.key === state.serviceKey);
    const startD = new Date(state.slotISO);
    return `
      <h2 class="font-display text-2xl sm:text-3xl leading-tight mb-2">Bijna geboekt</h2>
      <p class="text-sm text-ink-muted mb-5">${svc.title} · ${state.duration} min · ${fmtDateNL(startD)} om ${fmtTimeNL(startD)}</p>
      <form class="space-y-3" data-form>
        <div>
          <label class="text-xs text-ink-muted block mb-1.5">Naam</label>
          <input required name="name" class="w-full bg-bg-deep border border-border-subtle rounded-[12px] px-4 py-3 text-ink-primary placeholder:text-ink-faint focus:outline-none focus:border-gold transition-colors" />
        </div>
        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-ink-muted block mb-1.5">E-mail</label>
            <input required type="email" name="email" class="w-full bg-bg-deep border border-border-subtle rounded-[12px] px-4 py-3 text-ink-primary placeholder:text-ink-faint focus:outline-none focus:border-gold transition-colors" />
          </div>
          <div>
            <label class="text-xs text-ink-muted block mb-1.5">Telefoon</label>
            <input name="phone" type="tel" class="w-full bg-bg-deep border border-border-subtle rounded-[12px] px-4 py-3 text-ink-primary placeholder:text-ink-faint focus:outline-none focus:border-gold transition-colors" />
          </div>
        </div>
        <div>
          <label class="text-xs text-ink-muted block mb-1.5">Korte toelichting <span class="text-ink-faint">(optioneel)</span></label>
          <textarea name="notes" rows="3" class="w-full bg-bg-deep border border-border-subtle rounded-[12px] px-4 py-3 text-ink-primary placeholder:text-ink-faint focus:outline-none focus:border-gold transition-colors" placeholder="Wat speelt er? Eerste keer bij ons? Vraag voor de intake?"></textarea>
        </div>
        <div class="pt-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <button type="submit" class="cta-gold inline-flex items-center justify-center gap-2 bg-gold text-white px-6 py-3.5 rounded-full text-sm font-semibold tracking-wide hover:bg-gold-soft transition-colors" data-submit>
            <span>Bevestig boeking</span>
          </button>
          <button type="button" class="text-sm text-ink-muted hover:text-gold transition-colors" data-back>← Ander tijdstip</button>
        </div>
        <p class="text-xs text-ink-faint pt-2">Door te bevestigen ga je akkoord met de annuleringsvoorwaarden — kosteloos annuleren tot 24 uur voor je afspraak.</p>
        <p class="text-xs hidden" data-error></p>
      </form>
    `;
  }
  function wireDetails(root) {
    root.querySelector('[data-back]')?.addEventListener('click', () => {
      state.step = 'time';
      render();
    });
    const form = root.querySelector('[data-form]');
    const errEl = root.querySelector('[data-error]');
    const submitBtn = root.querySelector('[data-submit]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (state.submitting) return;
      state.submitting = true;
      submitBtn.disabled = true;
      submitBtn.querySelector('span').textContent = 'Bezig…';
      errEl.classList.add('hidden');

      const fd = new FormData(form);
      const responses = {
        name: fd.get('name')?.trim(),
        email: fd.get('email')?.trim(),
        phone: fd.get('phone')?.trim(),
        notes: fd.get('notes')?.trim(),
      };
      const slug = slugFor(state.serviceKey, state.duration);
      const eventTypeId = state.eventTypeMap?.[slug];
      const svc = SERVICES.find(s => s.key === state.serviceKey);

      try {
        const data = await postBooking({
          start: state.slotISO,
          eventTypeId,
          responses,
          metadata: {
            source: 'website',
            service: svc.title,
            duration: state.duration,
          },
          timeZone: 'Europe/Amsterdam',
          language: 'nl',
        });
        state.booking = { ...data.booking, _responses: responses };
        state.step = 'confirm';
        render();
      } catch (err) {
        errEl.textContent = err.message || 'Kon de boeking niet vastleggen. Probeer opnieuw of bel 06 5276 6898.';
        errEl.classList.remove('hidden');
        errEl.classList.remove('text-ink-faint');
        errEl.classList.add('text-[#B8654B]');
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = 'Bevestig boeking';
      } finally {
        state.submitting = false;
      }
    });
  }

  // ── View: confirmation ───────────────────────────────────────────
  function viewConfirm() {
    const svc = SERVICES.find(s => s.key === state.serviceKey);
    const startD = new Date(state.slotISO);
    return `
      <div class="text-center py-2">
        <div class="w-14 h-14 mx-auto mb-5 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h2 class="font-display text-3xl sm:text-4xl leading-tight mb-3">Afspraak vastgelegd</h2>
        <p class="text-ink-muted mb-7 max-w-md mx-auto">Je krijgt een bevestiging in je inbox. Tot ziens bij de praktijk aan de Hertogstraat 67.</p>
        <div class="bg-bg-deep border border-border-subtle rounded-[16px] p-5 sm:p-6 text-left max-w-md mx-auto mb-7">
          <p class="text-[11px] tracking-kicker uppercase text-gold font-semibold mb-3">Jouw afspraak</p>
          <p class="font-display text-xl mb-1">${svc.title}</p>
          <p class="text-sm text-ink-muted">${state.duration} minuten</p>
          <p class="text-sm text-ink-muted mt-2">${fmtDateNL(startD)}</p>
          <p class="text-sm text-ink-primary">${fmtTimeNL(startD)}</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button class="cta-gold inline-flex items-center justify-center gap-2 bg-gold text-white px-6 py-3.5 rounded-full text-sm font-semibold tracking-wide hover:bg-gold-soft transition-colors" data-ics>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            <span>Voeg toe aan agenda</span>
          </button>
          <button class="inline-flex items-center justify-center gap-2 border border-border-subtle text-ink-primary px-6 py-3.5 rounded-full text-sm font-semibold hover:border-gold hover:text-gold transition-colors" data-close>Sluiten</button>
        </div>
      </div>
    `;
  }
  function wireConfirm(root) {
    root.querySelector('[data-ics]')?.addEventListener('click', () => {
      const svc = SERVICES.find(s => s.key === state.serviceKey);
      const ics = buildICS({
        summary: `${svc.title} — Massagesalon Aphrodite`,
        description: `Afspraak van ${state.duration} minuten bij Massagesalon Aphrodite.`,
        location: 'Hertogstraat 67, Nijmegen-Centrum',
        start: new Date(state.slotISO),
        durationMin: state.duration,
      });
      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'massagesalon-aphrodite.ics';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-book]');
    if (!trigger) return;
    // Don't intercept tel:/mailto: clicks that the user explicitly wants.
    e.preventDefault();
    openModal(trigger.dataset.service || null);
  });

  // Expose for debugging
  window.GJM_Booking = { open: openModal, close: closeModal };
})();
