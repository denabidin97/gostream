// Global object to store countdown intervals
let countdownIntervals = {};
let activeEventId = null;

// Load channels
async function loadChannels() {
  try {
    const response = await fetch('https://govoet.pages.dev/channels.json');
    const channels = await response.json();
    const liveTvContent = document.querySelector("#live-tv #content");
    if (!liveTvContent) throw new Error("Live TV content element not found");
    liveTvContent.innerHTML = '';

    channels.forEach(channel => {
      const html = `
        <div class="channel-container" data-id="${channel.id}" data-url="${channel.url}">
          <div class="logo-container">
            <img src="${channel.logo}" alt="Channel Logo" class="logo">
          </div>
          <div class="info-container">
            <h3 class="channel-name">${channel.name}</h3>
            <p class="status">${channel.status}</p>
          </div>
        </div>
      `;
      liveTvContent.insertAdjacentHTML('beforeend', html);
    });

    liveTvContent.insertAdjacentHTML('beforeend', '<div class="spacer"></div>');
    setupChannels();
  } catch (error) {
    console.error("Error loading channels:", error);
  }
}

// Utility: parse date & time
function parseEventDateTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00+07:00`);
}

// Check if event ended
function isEventEnded(event) {
  const start = parseEventDateTime(event.match_date, event.match_time);
  const duration = parseFloat(event.duration) || 3.5;
  const end = new Date(start.getTime() + duration * 3600000);
  return new Date() >= end;
}

// Load events
async function loadEvents() {
  try {
    const res = await fetch('https://weekendsch.pages.dev/sch/schedulegvt.json');
    const events = await res.json();
    const content = document.querySelector("#live-event #content");
    if (!content) throw new Error("Live event content not found");
    content.innerHTML = '';

    const valid = events.filter(e => !isEventEnded(e) && e.match_date !== 'live');
    if (valid.length === 0) {
      content.innerHTML = `<div class="no-events-message">
          <h3>No Schedule Available</h3>
          <button id="refresh-button" class="refresh-button">Refresh</button>
        </div>`;
      document.getElementById('refresh-button')?.addEventListener('click', () => location.reload());
      return;
    }

    valid.forEach(event => {
      const servers = event.servers.filter(s => s.url && s.label);
      const defaultServer = servers[0]?.url || '';
      const serverList = encodeURIComponent(JSON.stringify(servers));

      const html = `
        <div class="event-container" data-id="${event.id}" data-url="${defaultServer}" data-servers="${serverList}" data-duration="${event.duration}">
          <div class="event-header">
            <div class="league-info">
              <img src="${event.icon}" class="sport-icon" alt="icon">
              <span>${event.league}</span>
            </div>
          </div>
          <div class="event-details">
            <div class="team-left">
              <img src="${event.team1.logo}" class="team-logo" alt="${event.team1.name}">
              <span>${event.team1.name}</span>
            </div>
            <div class="match-info">
              <div class="match-date">${event.match_date}</div>
              <div class="match-time">${event.match_time}</div>
            </div>
            <div class="team-right">
              <img src="${event.team2.logo}" class="team-logo" alt="${event.team2.name}">
              <span>${event.team2.name}</span>
            </div>
          </div>
          <div class="server-buttons" style="display:none;">
            <div class="buttons-container"></div>
          </div>
        </div>`;
      content.insertAdjacentHTML('beforeend', html);

      const container = content.querySelector(`.event-container[data-id="${event.id}"]`);
      const buttons = container.querySelector('.buttons-container');
      servers.forEach((s, i) => {
        const btn = document.createElement('div');
        btn.className = 'server-button';
        if (i === 0) btn.classList.add('active');
        btn.textContent = s.label;
        btn.dataset.url = s.url;
        btn.addEventListener('click', e => {
          e.stopPropagation();
          selectServerButton(btn);
          loadEventVideo(container, s.url);
        });
        buttons.appendChild(btn);
      });
    });

    setupEvents();
  } catch (e) {
    console.error("Error loading events:", e);
  }
}

// Setup channels
function setupChannels() {
  const containers = document.querySelectorAll('.channel-container');
  containers.forEach(c => {
    c.addEventListener('click', () => {
      containers.forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      sessionStorage.setItem('activeChannelId', c.dataset.id);
      loadEventVideo(c);
    });
  });
}

// Clean video loader (no popunder, no ads)
function loadEventVideo(container, url = null) {
  const id = container.dataset.id;
  const videoUrl = url || container.dataset.url;
  const isChannel = container.classList.contains('channel-container');
  const iframe = document.getElementById('video-iframe');
  const placeholder = document.getElementById('video-placeholder');
  const countdown = document.getElementById('video-countdown');

  if (!iframe || !placeholder) return;

  // prevent unknown redirects or ad URLs
  if (!videoUrl || videoUrl.includes('oyo4d') || videoUrl.includes('blogspot.com')) {
    console.warn(`Blocked unsafe video URL: ${videoUrl}`);
    iframe.src = 'about:blank';
    return;
  }

  iframe.src = videoUrl;
  iframe.style.display = 'block';
  placeholder.style.display = 'none';
  if (countdown) countdown.style.display = 'none';
}

// Select server button
function selectServerButton(button) {
  const container = button.closest('.event-container');
  container.querySelectorAll('.server-button').forEach(b => b.classList.remove('active'));
  button.classList.add('active');
  sessionStorage.setItem(`activeServerUrl_${container.dataset.id}`, button.dataset.url);
}

// Setup events
function setupEvents() {
  document.querySelectorAll('.event-container').forEach(container => {
    container.addEventListener('click', () => {
      const buttons = container.querySelector('.server-buttons');
      buttons.style.display = buttons.style.display === 'none' ? 'flex' : 'none';
      loadEventVideo(container);
    });
  });
}

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
  await loadEvents();
  await loadChannels();
});
