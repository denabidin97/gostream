// ======================================================
//  GOVOET / GOSTREAM — Versi Aman + Adsterra + Auto Reload
//  Full JS script (gabungan dari versi lama + perbaikan)
//  by denabidin97
// ======================================================

// Global object to store countdown intervals
let countdownIntervals = {};
// Tracks the currently active event ID
let activeEventId = null;

// ======================================================
// 🔹 Load Channel Data
// ======================================================
async function loadChannels() {
    try {
        const response = await fetch('https://govoet.pages.dev/channels.json'); // tetap pakai JSON lama
        const channels = await response.json();
        const liveTvContent = document.querySelector("#live-tv #content");
        if (!liveTvContent) throw new Error("Live TV content element not found");
        liveTvContent.innerHTML = '';
        channels.forEach(channel => {
            const channelHtml = `
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
            liveTvContent.insertAdjacentHTML('beforeend', channelHtml);
        });
        liveTvContent.insertAdjacentHTML('beforeend', '<div class="spacer"></div>');
        setupChannels();
    } catch (error) {
        console.error("Error loading channels:", error);
    }
}

// ======================================================
// 🔹 Load Event Data (jadwal pertandingan)
// ======================================================
async function loadEvents() {
    try {
        const response = await fetch('https://weekendsch.pages.dev/sch/schedulegvt.json'); // JSON lama
        const events = await response.json();
        const liveEventContent = document.querySelector("#live-event #content");
        if (!liveEventContent) throw new Error("Live event content element not found");
        liveEventContent.innerHTML = '';

        const validEvents = events.filter(event => {
            const isInvalid = event.kickoff_date === 'live' ||
                              event.kickoff_time === 'live' ||
                              event.match_date === 'live' ||
                              event.match_time === 'live' ||
                              event.duration === 'live';
            return !isInvalid;
        });

        if (validEvents.length === 0) {
            liveEventContent.innerHTML = `<div class="no-events-message"><h3>No Schedule Available</h3></div>`;
            return;
        }

        validEvents.forEach(event => {
            const validServers = event.servers.filter(s => s.url && s.label);
            const defaultServerUrl = validServers[0]?.url || '';
            const serverListJson = encodeURIComponent(JSON.stringify(validServers));

            const eventHtml = `
                <div class="event-container" data-id="${event.id}" data-url="${defaultServerUrl}" data-servers="${serverListJson}" data-duration="${event.duration}">
                    <div class="event-header">
                        <div class="league-info">
                            <img src="${event.icon}" class="sport-icon">
                            <span class="league-name">${event.league}</span>
                        </div>
                        <button class="copy-url-button" data-id="${event.id}" title="Copy event URL">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    </div>
                    <div class="event-details">
                        <div class="team-left">
                            <img src="${event.team1.logo}" class="team-logo" alt="${event.team1.name}">
                            <span class="team-name">${event.team1.name}</span>
                        </div>
                        <div class="match-info">
                            <div class="kickoff-match-date">${event.kickoff_date}</div>
                            <div class="kickoff-match-time">${event.kickoff_time}</div>
                            <div class="live-label" style="display:none;">Live</div>
                            <div class="match-date" data-original-date="${event.match_date}" style="display:none;">${event.match_date}</div>
                            <div class="match-time" data-original-time="${event.match_time}" style="display:none;">${event.match_time}</div>
                        </div>
                        <div class="team-right">
                            <img src="${event.team2.logo}" class="team-logo" alt="${event.team2.name}">
                            <span class="team-name">${event.team2.name}</span>
                        </div>
                    </div>
                    <div class="server-buttons" style="display:none;">
                        <div class="buttons-container"></div>
                    </div>
                </div>
            `;
            liveEventContent.insertAdjacentHTML('beforeend', eventHtml);
        });

        setupEvents();
        setupCopyButtons();

    } catch (error) {
        console.error("Error loading events:", error);
    }
}

// ======================================================
// 🔹 Setup copy buttons, events, channels, dan server
// ======================================================
function setupCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-url-button');
    copyButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const eventId = button.getAttribute('data-id');
            const eventUrl = `${window.location.origin}/${eventId}`;
            navigator.clipboard.writeText(eventUrl);
            const icon = button.querySelector('i');
            icon.classList.replace('fa-copy', 'fa-check');
            setTimeout(() => icon.classList.replace('fa-check', 'fa-copy'), 2000);
        });
    });
}

function setupChannels() {
    const channels = document.querySelectorAll('.channel-container');
    channels.forEach(c => {
        c.addEventListener('click', () => {
            channels.forEach(cc => cc.classList.remove('selected'));
            c.classList.add('selected');
            loadEventVideo(c);
        });
    });
}

function setupEvents() {
    const events = document.querySelectorAll('.event-container');
    events.forEach(e => {
        e.addEventListener('click', () => loadEventVideo(e));
    });
}

function loadEventVideo(container, serverUrl = null) {
    const videoIframe = document.getElementById('video-iframe');
    const videoPlaceholder = document.getElementById('video-placeholder');
    const videoCountdown = document.getElementById('video-countdown');
    if (!videoIframe) return;

    const url = serverUrl || container.getAttribute('data-url');
    videoIframe.src = url;
    videoIframe.style.display = 'block';
    videoPlaceholder.style.display = 'none';
    videoCountdown.style.display = 'none';
}

// ======================================================
// 🔹 Periksa & sembunyikan event yang sudah berakhir
// ======================================================
function checkAndHandleEndedEvents() {
    const now = new Date();
    document.querySelectorAll('.event-container').forEach(c => {
        const date = c.querySelector('.match-date')?.getAttribute('data-original-date');
        const time = c.querySelector('.match-time')?.getAttribute('data-original-time');
        const dur = parseFloat(c.getAttribute('data-duration')) || 3.5;
        if (!date || !time) return;
        const start = new Date(`${date}T${time}:00+07:00`);
        const end = new Date(start.getTime() + dur * 60 * 60 * 1000);
        if (now >= end) c.style.display = 'none';
    });
}

// ======================================================
// ✅ Inisialisasi Script Gostream
// ======================================================
window.addEventListener('DOMContentLoaded', async () => {
    console.log("✅ Gostream script aktif");
    await loadEvents();
    await loadChannels();

    // ✅ Cek event berakhir tiap 1 menit
    setInterval(checkAndHandleEndedEvents, 60000);

    // 🔁 Auto reload jadwal tiap 10 menit
    setInterval(async () => {
        console.log("🔁 Jadwal diperbarui otomatis (10 menit)...");
        await loadEvents();
    }, 10 * 60 * 1000);

    console.log("⏱️ Jadwal akan reload otomatis setiap 10 menit.");
});

// ======================================================
// 💰 Integrasi Adsterra Popunder (klik pertama)
// ======================================================
(function() {
    const adsterraScript = "https://pl27844430.effectivegatecpm.com/8d/71/09/8d71097ce94b5dcce652f5da31899578.js";
    let adLoaded = false;
    function loadAd() {
        if (adLoaded) return;
        try {
            const s = document.createElement('script');
            s.src = adsterraScript;
            s.type = 'text/javascript';
            s.async = true;
            document.body.appendChild(s);
            adLoaded = true;
            console.log("✅ Adsterra aktif setelah klik pertama.");
        } catch (e) {
            console.error("❌ Gagal memuat script Adsterra:", e);
        }
    }
    document.addEventListener("click", function handleClick() {
        loadAd();
        document.removeEventListener("click", handleClick);
    });
})();
