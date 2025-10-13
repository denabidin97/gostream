// ===================================
// 🔴 GOSTREAM FINAL JS (v2.2)
// Jadwal otomatis + LIVE badge berkedip + Adsterra popup
// ===================================

// --- Iklan Adsterra aktif saat klik pertama ---
document.addEventListener("click", function adsterraOnce() {
  const adScript = document.createElement("script");
  adScript.src = "//pl27844430.effectivegatecpm.com/8d/71/09/8d71097ce94b5dcce652f5da31899578.js";
  adScript.async = true;
  document.body.appendChild(adScript);
  console.log("✅ Adsterra aktif");
  document.removeEventListener("click", adsterraOnce);
});

// --- Tambahkan CSS untuk efek LIVE berkedip ---
const style = document.createElement("style");
style.textContent = `
.live-label {
  color: #ff0033;
  font-weight: bold;
  animation: blinkLive 1s infinite;
  font-size: 13px;
  margin-left: 8px;
}
@keyframes blinkLive {
  0%, 50%, 100% { opacity: 1; }
  25%, 75% { opacity: 0; }
}
`;
document.head.appendChild(style);

// --- Ambil data channel ---
async function loadChannels() {
  const container = document.querySelector("#live-tv #content");
  if (!container) return;
  container.innerHTML = "<p>Loading channels...</p>";
  try {
    const res = await fetch("https://govoet.pages.dev/channels.json");
    const channels = await res.json();
    container.innerHTML = "";
    channels.forEach(ch => {
      const div = document.createElement("div");
      div.className = "channel-container";
      div.innerHTML = `
        <div class='logo-container'><img src='${ch.logo}' class='logo'></div>
        <div class='info-container'><h3>${ch.name}</h3><p>${ch.status}</p></div>
      `;
      div.addEventListener("click", () => loadVideo(ch.url));
      container.appendChild(div);
    });
  } catch (e) {
    container.innerHTML = "<p>⚠️ Gagal memuat channels.</p>";
  }
}

// --- Ambil jadwal pertandingan dari JSON lama ---
async function loadEvents() {
  const container = document.querySelector("#live-event #content");
  if (!container) return;
  container.innerHTML = "<p>Loading events...</p>";
  try {
    const res = await fetch("https://weekendsch.pages.dev/sch/schedulegvt.json");
    const events = await res.json();
    container.innerHTML = "";

    const now = new Date();

    // Urutkan jadwal dari yang terdekat
    events.sort((a, b) =>
      new Date(a.match_date + " " + a.match_time) - new Date(b.match_date + " " + b.match_time)
    );

    events.forEach(event => {
      const matchTime = new Date(`${event.match_date}T${event.match_time}:00+07:00`);
      const diff = now - matchTime;
      const isLive = diff >= 0 && diff < (4 * 60 * 60 * 1000); // Durasi live max 4 jam

      // Ambil server pertama
      const url = event.servers?.[0]?.url || "";

      // Buat elemen event
      const div = document.createElement("div");
      div.className = "event-container";
      div.innerHTML = `
        <div class="event-header">
          <strong>${event.league}</strong>
          ${isLive ? `<span class="live-label">LIVE 🔴</span>` : ""}
        </div>
        <div class="event-details">
          <span>${event.team1.name}</span> vs <span>${event.team2.name}</span>
          <div>${event.kickoff_date} ${event.kickoff_time}</div>
        </div>
      `;
      div.addEventListener("click", () => loadVideo(url));
      container.appendChild(div);
    });

    if (!events.length) container.innerHTML = "<p>No schedule available.</p>";
  } catch (err) {
    console.error("❌ Error load jadwal:", err);
    container.innerHTML = "<p>⚠️ Gagal memuat jadwal.</p>";
  }
}

// --- Fungsi muat video di iframe ---
function loadVideo(url) {
  const iframe = document.getElementById("video-iframe");
  const placeholder = document.getElementById("video-placeholder");
  const countdown = document.getElementById("video-countdown");

  if (!iframe) return;

  if (url && url !== "about:blank") {
    iframe.src = url;
    iframe.style.display = "block";
    placeholder?.style && (placeholder.style.display = "none");
    countdown?.style && (countdown.style.display = "none");
  } else {
    iframe.src = "about:blank";
    iframe.style.display = "none";
    placeholder?.style && (placeholder.style.display = "block");
    countdown?.style && (countdown.style.display = "block");
  }
}

// --- Ganti tab (Events / Channels / Livescore) ---
function switchContent(id) {
  document.querySelectorAll(".sidebar-content").forEach(div => div.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");
}

// --- Refresh jadwal tiap 10 menit ---
setInterval(loadEvents, 10 * 60 * 1000);

// --- Jalankan saat halaman dimuat ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 GOSTREAM v2.2 aktif (LIVE badge berkedip)");
  loadEvents();
  loadChannels();
});
