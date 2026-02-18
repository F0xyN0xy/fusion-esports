// ═══════════════════════════════════════════════════════
//  FUSION ESPORTS — CONFIG SYSTEM (Discord Bot Managed)
//  Config is updated via Discord bot slash commands
//  Website fetches config from /api/get-config
// ═══════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
    discordUrl: "https://discord.gg/Nsng7acTP7",
    memberCount: "50+",
    onlineCount: "auto",
    discordServerId: "1303027633679896608",
    tournament: {
        dayOfWeek: 6,
        hour: 18,
        minute: 0,
        name: "Fusion Weekly",
        upcomingCount: 5,
    },
    socials: [
        { platform: "youtube", name: "Team Fusion",  desc: "Main channel — highlights, montages & more", url: "https://www.youtube.com/@CjThe13" },
        { platform: "youtube", name: "Our Editor",   desc: "Editing wizard behind the scenes",           url: "https://www.youtube.com/@mutxhirr" },
        { platform: "youtube", name: "Hypn0tic RL",  desc: "Content creator & community pillar",         url: "https://www.youtube.com/@Hypn0tic_RL" },
        { platform: "website", name: "FoxyNoxy",     desc: "Website designer & developer",               url: "https://foxynoxy-socials.netlify.app" },
    ],
};

// ── Local cache helpers ──────────────────────────────────
function getCachedConfig() {
    try {
        const raw = localStorage.getItem("fusionConfigCache");
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}
function setCachedConfig(cfg) {
    try { localStorage.setItem("fusionConfigCache", JSON.stringify(cfg)); } catch {}
}
function mergeWithDefaults(cfg) {
    return {
        ...DEFAULT_CONFIG,
        ...cfg,
        tournament: { ...DEFAULT_CONFIG.tournament, ...(cfg.tournament || {}) },
        socials: cfg.socials ?? DEFAULT_CONFIG.socials,
    };
}

// ── Fetch config from API ────────────────────────────────
async function fetchRemoteConfig() {
    try {
        const res = await fetch("/api/get-config");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data || null;
    } catch (err) {
        console.warn("Could not fetch remote config:", err.message);
        return null;
    }
}

// ── Boot: render from cache immediately, then update from API
async function bootConfig() {
    const cached = getCachedConfig();
    const initial = mergeWithDefaults(cached || {});
    applyConfig(initial);

    const remote = await fetchRemoteConfig();
    if (remote) {
        const live = mergeWithDefaults(remote);
        setCachedConfig(live);
        applyConfig(live);
    }
}

// ═══════════════════════════════════════════════════════
//  APPLY CONFIG TO THE PAGE
// ═══════════════════════════════════════════════════════
function applyConfig(cfg) {
    // Discord links
    ["navDiscordBtn","mobileDiscordBtn","heroDiscordBtn","tournamentDiscordBtn","ctaDiscordBtn","footerDiscordBtn"]
        .forEach(id => { const el = document.getElementById(id); if (el) el.href = cfg.discordUrl || "#"; });

    // Member count
    const membersEl = document.getElementById("members");
    if (membersEl) membersEl.textContent = cfg.memberCount || "—";

    // Online count
    if (!cfg.onlineCount || cfg.onlineCount === "auto") {
        fetchDiscordOnline(cfg.discordServerId);
    } else {
        const el = document.getElementById("online");
        if (el) el.textContent = cfg.onlineCount;
    }

    // Tournament tag
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const tag = document.getElementById("tournamentTag");
    if (tag) tag.textContent = `Every ${days[cfg.tournament.dayOfWeek] || "Saturday"}`;

    // Socials
    renderSocials(cfg.socials);

    // Countdown & calendar
    startCountdown(cfg.tournament);
    buildCalendar(cfg.tournament);
}

// ── Discord widget (online only) ─────────────────────────
function fetchDiscordOnline(serverId) {
    if (!serverId) return;
    fetch(`https://discord.com/api/guilds/${serverId}/widget.json`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(data => { const el = document.getElementById("online"); if (el) el.textContent = data.presence_count ?? "—"; })
        .catch(() => { const el = document.getElementById("online"); if (el) el.textContent = "—"; });
}

// ═══════════════════════════════════════════════════════
//  SOCIALS RENDERER
// ═══════════════════════════════════════════════════════
const PLATFORM_META = {
    youtube:   { label: "YouTube",     color: "rgba(255,0,0,0.12)",     border: "rgba(255,0,0,0.2)",     text: "#f87171", svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>` },
    tiktok:    { label: "TikTok",      color: "rgba(255,0,80,0.12)",    border: "rgba(255,0,80,0.2)",    text: "#ff6b9d", svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>` },
    twitter:   { label: "X / Twitter", color: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.15)",text: "#e2e8f0", svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>` },
    twitch:    { label: "Twitch",      color: "rgba(145,71,255,0.12)",  border: "rgba(145,71,255,0.25)", text: "#a78bfa", svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>` },
    instagram: { label: "Instagram",   color: "rgba(228,64,95,0.12)",   border: "rgba(228,64,95,0.25)",  text: "#f472b6", svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>` },
    website:   { label: "Website",     color: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.2)",  text: "#60a5fa", svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>` },
};

function renderSocials(socials) {
    const container = document.getElementById("socialsGrid");
    if (!container) return;
    container.innerHTML = "";
    (socials || []).forEach(s => {
        const meta = PLATFORM_META[s.platform] || PLATFORM_META.website;
        const card = document.createElement("a");
        card.className = "social-card";
        card.href = s.url || "#";
        card.target = "_blank";
        card.rel = "noopener noreferrer";
        card.style.setProperty("--social-bg", meta.color);
        card.style.setProperty("--social-border", meta.border);
        card.style.setProperty("--social-text", meta.text);
        card.innerHTML = `
            <div class="social-header">
                <div class="social-icon">${meta.svg}</div>
                <span class="social-badge">${meta.label}</span>
            </div>
            <h3 class="social-name">${escHtml(s.name)}</h3>
            <p class="social-desc">${escHtml(s.desc)}</p>
            <div class="social-arrow">→</div>
        `;
        container.appendChild(card);
    });
}

function escHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}

// ═══════════════════════════════════════════════════════
//  COUNTDOWN & CALENDAR
// ═══════════════════════════════════════════════════════
function startCountdown(cfg) {
    const statusEl = document.getElementById("tournamentStatus");
    const statusTextEl = document.getElementById("statusText");
    const labelEl = document.getElementById("countdownLabel");
    const dEl = document.getElementById("cdDays");
    const hEl = document.getElementById("cdHours");
    const mEl = document.getElementById("cdMins");
    const sEl = document.getElementById("cdSecs");
    const metaEl = document.getElementById("countdownMeta");

    function tick() {
        const now = new Date();
        const next = getNextTournamentDate(cfg);
        const diff = next - now;

        if (diff < 0) {
            if (statusEl) statusEl.innerHTML = '<span class="status-dot status-live"></span><span>LIVE NOW</span>';
            if (statusTextEl) statusTextEl.textContent = "LIVE NOW";
            if (labelEl) labelEl.textContent = "Tournament in progress!";
            if (dEl) dEl.textContent = "00";
            if (hEl) hEl.textContent = "00";
            if (mEl) mEl.textContent = "00";
            if (sEl) sEl.textContent = "00";
            return;
        }

        const days = Math.floor(diff / 864e5);
        const hrs = Math.floor((diff % 864e5) / 36e5);
        const mins = Math.floor((diff % 36e5) / 6e4);
        const secs = Math.floor((diff % 6e4) / 1e3);

        if (dEl) dEl.textContent = String(days).padStart(2, "0");
        if (hEl) hEl.textContent = String(hrs).padStart(2, "0");
        if (mEl) mEl.textContent = String(mins).padStart(2, "0");
        if (sEl) sEl.textContent = String(secs).padStart(2, "0");

        if (days > 1) {
            if (statusEl) statusEl.innerHTML = '<span class="status-dot status-upcoming"></span><span>Upcoming</span>';
            if (statusTextEl) statusTextEl.textContent = "Upcoming";
        } else if (days === 1) {
            if (statusEl) statusEl.innerHTML = '<span class="status-dot status-tomorrow"></span><span>Tomorrow!</span>';
            if (statusTextEl) statusTextEl.textContent = "Tomorrow!";
        } else if (hrs < 6) {
            if (statusEl) statusEl.innerHTML = '<span class="status-dot status-soon"></span><span>Starting Soon</span>';
            if (statusTextEl) statusTextEl.textContent = "Starting Soon";
        } else {
            if (statusEl) statusEl.innerHTML = '<span class="status-dot status-today"></span><span>Today!</span>';
            if (statusTextEl) statusTextEl.textContent = "Today!";
        }

        if (metaEl) {
            const dateStr = next.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
            const timeStr = next.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
            metaEl.textContent = `${dateStr} at ${timeStr} UK Time`;
        }
    }

    tick();
    setInterval(tick, 1000);
}

function getNextTournamentDate(cfg) {
    const now = new Date();
    const ukNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
    const target = new Date(ukNow);
    target.setHours(cfg.hour || 18, cfg.minute || 0, 0, 0);
    const targetDay = cfg.dayOfWeek ?? 6;
    const currentDay = target.getDay();
    let daysToAdd = (targetDay - currentDay + 7) % 7;
    if (daysToAdd === 0 && ukNow >= target) daysToAdd = 7;
    target.setDate(target.getDate() + daysToAdd);
    return new Date(target.toLocaleString("en-US", { timeZone: "Europe/London" }));
}

function buildCalendar(cfg) {
    const container = document.getElementById("upcomingList");
    if (!container) return;
    container.innerHTML = "";
    const count = cfg.upcomingCount || 5;
    const now = new Date();
    let next = getNextTournamentDate(cfg);
    for (let i = 0; i < count; i++) {
        const li = document.createElement("li");
        li.className = "upcoming-item";
        const dateStr = next.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
        const timeStr = next.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
        li.innerHTML = `<span class="upcoming-date">${dateStr}</span><span class="upcoming-time">${timeStr} UK</span>`;
        container.appendChild(li);
        next = new Date(next.getTime() + 7 * 864e5);
    }
}

// ═══════════════════════════════════════════════════════
//  NAV & UI
// ═══════════════════════════════════════════════════════
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => { navbar.classList.toggle("scrolled", window.scrollY > 40); }, { passive: true });

const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");
hamburger?.addEventListener("click", () => { mobileMenu.style.display = mobileMenu.style.display === "flex" ? "none" : "flex"; });
function closeMobile() { if (mobileMenu) mobileMenu.style.display = "none"; }

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.style.animation = "fadeUp 0.6s ease both"; observer.unobserve(entry.target); } });
}, { threshold: 0.1 });
document.querySelectorAll(".feature-card, .stat-card").forEach(el => { el.style.opacity = "0"; observer.observe(el); });

// ── BOOT ────────────────────────────────────────────────
bootConfig();
