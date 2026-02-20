// ═══════════════════════════════════════════════════════
//  FUSION ESPORTS — CONFIG SYSTEM (Discord Bot Managed)
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
    ["navDiscordBtn","mobileDiscordBtn","heroDiscordBtn","tournamentDiscordBtn","ctaDiscordBtn","footerDiscordBtn"]
        .forEach(id => { const el = document.getElementById(id); if (el) el.href = cfg.discordUrl || "#"; });

    const membersEl = document.getElementById("members");
    if (membersEl) membersEl.textContent = cfg.memberCount || "—";

    if (!cfg.onlineCount || cfg.onlineCount === "auto") {
        fetchDiscordOnline(cfg.discordServerId);
    } else {
        const el = document.getElementById("online");
        if (el) el.textContent = cfg.onlineCount;
    }

    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const tag = document.getElementById("tournamentTag");
    if (tag) tag.textContent = `Every ${days[cfg.tournament.dayOfWeek] || "Saturday"}`;

    renderSocials(cfg.socials);
    startCountdown(cfg.tournament);
    buildCalendar(cfg.tournament);
}

// ── Discord widget ───────────────────────────────────────
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
//  TOURNAMENT — TIME UTILITIES
//  All times are stored/configured as UK time (Europe/London).
//  getNextTournamentUTC returns a real UTC Date object.
// ═══════════════════════════════════════════════════════

/**
 * Returns the next tournament occurrence as a true UTC Date.
 * cfg.hour / cfg.minute are in UK local time (handles BST/GMT automatically).
 */
function getNextTournamentUTC(cfg) {
    const targetDay = cfg.dayOfWeek ?? 6;
    const targetHour = cfg.hour ?? 18;
    const targetMinute = cfg.minute ?? 0;

    // Find today's date in UK timezone
    const nowUTC = new Date();

    // We'll search day by day (max 8) to find the next occurrence
    for (let offset = 0; offset <= 8; offset++) {
        const candidate = new Date(nowUTC.getTime() + offset * 86400000);
        // What day of week is this in UK time?
        const ukDateStr = candidate.toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "short" });
        const ukDayIndex = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(
            candidate.toLocaleDateString("en-US", { timeZone: "Europe/London", weekday: "short" }).slice(0,3)
        );

        if (ukDayIndex === targetDay) {
            // Build the tournament datetime string in UK timezone
            // Get the UK date parts for this candidate
            const ukParts = new Intl.DateTimeFormat("en-GB", {
                timeZone: "Europe/London",
                year: "numeric", month: "2-digit", day: "2-digit"
            }).formatToParts(candidate);
            const ukYear  = ukParts.find(p => p.type === "year").value;
            const ukMonth = ukParts.find(p => p.type === "month").value;
            const ukDay   = ukParts.find(p => p.type === "day").value;

            // Create a Date by parsing the UK local time as if it were UTC,
            // then adjust for the timezone offset at that moment.
            // Easiest: use the trick of creating a date string and letting
            // the browser interpret it in the London timezone.
            const isoStr = `${ukYear}-${ukMonth}-${ukDay}T${String(targetHour).padStart(2,"0")}:${String(targetMinute).padStart(2,"0")}:00`;

            // Get the UTC equivalent by using Intl to find the offset
            // We do this by checking what UTC time corresponds to midnight London on that date
            const approx = new Date(`${ukYear}-${ukMonth}-${ukDay}T12:00:00Z`);
            const londonMidStr = new Intl.DateTimeFormat("en-US", {
                timeZone: "Europe/London",
                hour: "2-digit", minute: "2-digit", hour12: false
            }).format(approx);
            // Offset = 12 - london hour at noon UTC
            const londonNoonHour = parseInt(londonMidStr.split(":")[0]);
            const offsetHours = 12 - londonNoonHour; // e.g. GMT=0 gives 0, BST=-1 gives +1

            // Tournament UTC = target UK hour - offset
            const tournUTC = new Date(Date.UTC(
                parseInt(ukYear), parseInt(ukMonth) - 1, parseInt(ukDay),
                targetHour - offsetHours, targetMinute, 0
            ));

            if (tournUTC > nowUTC) return tournUTC;
        }
    }

    // Fallback: 7 days from now
    return new Date(nowUTC.getTime() + 7 * 86400000);
}

// ── Countdown ────────────────────────────────────────────
function startCountdown(cfg) {
    const statusEl   = document.getElementById("tournamentStatus");
    const statusTxt  = document.getElementById("statusText");
    const labelEl    = document.getElementById("countdownLabel");
    const dEl        = document.getElementById("cdDays");
    const hEl        = document.getElementById("cdHours");
    const mEl        = document.getElementById("cdMins");
    const sEl        = document.getElementById("cdSecs");
    const metaEl     = document.getElementById("countdownMeta");

    function tick() {
        const now  = new Date();
        const next = getNextTournamentUTC(cfg);
        const diff = next - now;

        if (diff <= 0) {
            if (statusEl)  statusEl.innerHTML = '<span class="status-dot status-live"></span><span>LIVE NOW</span>';
            if (statusTxt) statusTxt.textContent = "LIVE NOW";
            if (labelEl)   labelEl.textContent = "Tournament in progress!";
            if (dEl) dEl.textContent = "00";
            if (hEl) hEl.textContent = "00";
            if (mEl) mEl.textContent = "00";
            if (sEl) sEl.textContent = "00";
            return;
        }

        const totalSecs = Math.floor(diff / 1000);
        const days = Math.floor(totalSecs / 86400);
        const hrs  = Math.floor((totalSecs % 86400) / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;

        if (dEl) dEl.textContent = String(days).padStart(2, "0");
        if (hEl) hEl.textContent = String(hrs).padStart(2, "0");
        if (mEl) mEl.textContent = String(mins).padStart(2, "0");
        if (sEl) sEl.textContent = String(secs).padStart(2, "0");

        if (days > 1) {
            if (statusEl)  statusEl.innerHTML = '<span class="status-dot status-upcoming"></span><span>Upcoming</span>';
            if (statusTxt) statusTxt.textContent = "Upcoming";
        } else if (days === 1) {
            if (statusEl)  statusEl.innerHTML = '<span class="status-dot status-tomorrow"></span><span>Tomorrow!</span>';
            if (statusTxt) statusTxt.textContent = "Tomorrow!";
        } else if (hrs < 6) {
            if (statusEl)  statusEl.innerHTML = '<span class="status-dot status-soon"></span><span>Starting Soon</span>';
            if (statusTxt) statusTxt.textContent = "Starting Soon";
        } else {
            if (statusEl)  statusEl.innerHTML = '<span class="status-dot status-today"></span><span>Today!</span>';
            if (statusTxt) statusTxt.textContent = "Today!";
        }

        if (metaEl) {
            // Show UK time and user's local time
            const ukTime    = next.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
            const ukDate    = next.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" });
            const localTime = next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            // Check if local time differs from UK time
            const ukOffset    = getUKOffsetLabel(next);
            const localOffset = getLocalOffsetLabel();
            const showLocal   = ukOffset !== localOffset;

            metaEl.innerHTML = `${ukDate} &nbsp;·&nbsp; <strong>${ukTime} UK Time</strong>`
                + (showLocal ? `<br><span style="font-size:0.85em;opacity:0.7">Your local time: ${localTime}</span>` : "");
        }
    }

    if (window._countdownInterval) clearInterval(window._countdownInterval);
    tick();
    window._countdownInterval = setInterval(tick, 1000);
}

function getUKOffsetLabel(date) {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", timeZoneName: "short" })
        .formatToParts(date).find(p => p.type === "timeZoneName")?.value || "";
}
function getLocalOffsetLabel() {
    return new Intl.DateTimeFormat("en-GB", { timeZoneName: "short" })
        .formatToParts(new Date()).find(p => p.type === "timeZoneName")?.value || "";
}

// ── Calendar ─────────────────────────────────────────────
function buildCalendar(cfg) {
    // Support both id names for backwards compatibility
    const container = document.getElementById("calendarList") || document.getElementById("upcomingList");
    if (!container) return;
    container.innerHTML = "";

    const tzEl = document.getElementById("calendarTz");
    if (tzEl) tzEl.textContent = "UK Time";

    const count = cfg.upcomingCount || 5;
    let next = getNextTournamentUTC(cfg);

    for (let i = 0; i < count; i++) {
        const li = document.createElement("li");
        li.className = "upcoming-item";

        const ukDate = next.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });
        const ukTime = next.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
        const localTime = next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const ukOffset    = getUKOffsetLabel(next);
        const localOffset = getLocalOffsetLabel();
        const showLocal   = ukOffset !== localOffset;

        li.innerHTML = `
            <span class="upcoming-date">${ukDate}</span>
            <span class="upcoming-time">
                ${ukTime} UK${showLocal ? `<br><small style="opacity:0.6">${localTime} local</small>` : ""}
            </span>`;
        container.appendChild(li);

        // Add exactly 7 days (in UTC) for next week
        next = new Date(next.getTime() + 7 * 86400 * 1000);
    }
}

// ═══════════════════════════════════════════════════════
//  CONTACT FORM  —  Web3Forms (no email app, fully in-browser)
// ═══════════════════════════════════════════════════════
function initContactForm() {
    const form    = document.getElementById("contactForm");
    const btn     = document.getElementById("contactBtn");
    const btnText = document.getElementById("contactBtnText");
    const errEl   = document.getElementById("contactError");
    if (!form) return;

    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        // Loading state
        btn.disabled = true;
        btnText.textContent = "Sending...";
        errEl.classList.add("hidden");

        try {
            const formData = new FormData(form);
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                form.classList.add("hidden");
                document.getElementById("contactSuccess")?.classList.remove("hidden");
            } else {
                throw new Error(data.message || "Something went wrong. Please try again.");
            }
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove("hidden");
            btn.disabled = false;
            btnText.textContent = "Send Message";
        }
    });
}

function resetContactForm() {
    const form = document.getElementById("contactForm");
    const success = document.getElementById("contactSuccess");
    if (form)    { form.reset(); form.classList.remove("hidden"); }
    if (success) success.classList.add("hidden");
    const btn     = document.getElementById("contactBtn");
    const btnText = document.getElementById("contactBtnText");
    if (btn)     btn.disabled = false;
    if (btnText) btnText.textContent = "Send Message";
}

// ═══════════════════════════════════════════════════════
//  ADMIN PANEL  (Ctrl+Shift+A)
// ═══════════════════════════════════════════════════════
document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.shiftKey && e.key === "A") openAdmin();
});

function openAdmin() {
    const stored = localStorage.getItem("adminPass") || "fusion";
    document.getElementById("adminLogin")?.classList.remove("hidden");
}

function checkLogin() {
    const stored = localStorage.getItem("adminPass") || "fusion";
    const input  = document.getElementById("loginInput")?.value;
    if (input === stored) {
        document.getElementById("adminLogin")?.classList.add("hidden");
        document.getElementById("adminOverlay")?.classList.remove("hidden");
        loadAdminPanel();
    } else {
        const errEl = document.getElementById("loginError");
        if (errEl) errEl.textContent = "Incorrect password.";
    }
}

function closeAdmin() { document.getElementById("adminOverlay")?.classList.add("hidden"); }

function switchTab(tab) {
    document.querySelectorAll(".admin-body").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".admin-tab").forEach(el => el.classList.remove("active"));
    document.getElementById(`tab-${tab}`)?.classList.remove("hidden");
    document.querySelectorAll(".admin-tab").forEach(el => { if (el.textContent.toLowerCase().includes(tab)) el.classList.add("active"); });
}

function loadAdminPanel() {
    const cfg = mergeWithDefaults(getCachedConfig() || {});
    const t = cfg.tournament;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ""; };
    set("cfg-discordUrl",  cfg.discordUrl);
    set("cfg-memberCount", cfg.memberCount);
    set("cfg-onlineCount", cfg.onlineCount === "auto" ? "" : cfg.onlineCount);
    set("cfg-tournDay",    t.dayOfWeek);
    set("cfg-tournHour",   t.hour);
    set("cfg-tournMinute", t.minute);
    set("cfg-tournName",   t.name);
    set("cfg-tournCount",  t.upcomingCount);

    renderSocialsEditor(cfg.socials);
}

function saveConfig() {
    const get = id => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
    const newCfg = {
        discordUrl:  get("cfg-discordUrl")  || DEFAULT_CONFIG.discordUrl,
        memberCount: get("cfg-memberCount") || DEFAULT_CONFIG.memberCount,
        onlineCount: get("cfg-onlineCount") || "auto",
        discordServerId: DEFAULT_CONFIG.discordServerId,
        tournament: {
            dayOfWeek:     parseInt(get("cfg-tournDay"))    || 6,
            hour:          parseInt(get("cfg-tournHour"))   || 18,
            minute:        parseInt(get("cfg-tournMinute")) || 0,
            name:          get("cfg-tournName")             || "Fusion Weekly",
            upcomingCount: parseInt(get("cfg-tournCount"))  || 5,
        },
        socials: readSocialsEditor(),
    };
    setCachedConfig(newCfg);
    applyConfig(newCfg);
    closeAdmin();
}

function resetToDefaults() {
    if (!confirm("Reset all settings to defaults?")) return;
    localStorage.removeItem("fusionConfigCache");
    applyConfig(DEFAULT_CONFIG);
    closeAdmin();
}

function savePassword() {
    const np = document.getElementById("cfg-newPass")?.value;
    const cp = document.getElementById("cfg-confirmPass")?.value;
    const msg = document.getElementById("passMsg");
    if (!np || np.length < 4) { if (msg) msg.textContent = "Password must be at least 4 characters."; return; }
    if (np !== cp) { if (msg) msg.textContent = "Passwords do not match."; return; }
    localStorage.setItem("adminPass", np);
    if (msg) msg.textContent = "Password updated!";
}

// ── Socials editor ───────────────────────────────────────
function renderSocialsEditor(socials) {
    const editor = document.getElementById("socialsEditor");
    if (!editor) return;
    editor.innerHTML = "";
    (socials || []).forEach((s, i) => {
        const row = document.createElement("div");
        row.className = "social-editor-row";
        row.dataset.index = i;
        row.innerHTML = `
            <select class="se-platform">
                ${["youtube","tiktok","twitter","twitch","instagram","website"].map(p =>
                    `<option value="${p}" ${s.platform===p?"selected":""}>${p}</option>`).join("")}
            </select>
            <input class="se-name" type="text" placeholder="Name" value="${escHtml(s.name)}">
            <input class="se-desc" type="text" placeholder="Description" value="${escHtml(s.desc)}">
            <input class="se-url"  type="text" placeholder="URL" value="${escHtml(s.url)}">
            <button onclick="this.closest('.social-editor-row').remove()" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:1.1rem;">✕</button>
        `;
        editor.appendChild(row);
    });
}

function addSocialRow() {
    const editor = document.getElementById("socialsEditor");
    if (!editor) return;
    const row = document.createElement("div");
    row.className = "social-editor-row";
    row.innerHTML = `
        <select class="se-platform">
            ${["youtube","tiktok","twitter","twitch","instagram","website"].map(p =>
                `<option value="${p}">${p}</option>`).join("")}
        </select>
        <input class="se-name" type="text" placeholder="Name">
        <input class="se-desc" type="text" placeholder="Description">
        <input class="se-url"  type="text" placeholder="URL">
        <button onclick="this.closest('.social-editor-row').remove()" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:1.1rem;">✕</button>
    `;
    editor.appendChild(row);
}

function readSocialsEditor() {
    const rows = document.querySelectorAll(".social-editor-row");
    return Array.from(rows).map(row => ({
        platform: row.querySelector(".se-platform")?.value || "website",
        name:     row.querySelector(".se-name")?.value.trim() || "",
        desc:     row.querySelector(".se-desc")?.value.trim() || "",
        url:      row.querySelector(".se-url")?.value.trim()  || "",
    })).filter(s => s.name);
}

// ═══════════════════════════════════════════════════════
//  NAV & UI
// ═══════════════════════════════════════════════════════
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => { navbar.classList.toggle("scrolled", window.scrollY > 40); }, { passive: true });

const hamburger  = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");
hamburger?.addEventListener("click", () => {
    mobileMenu.style.display = mobileMenu.style.display === "flex" ? "none" : "flex";
});
function closeMobile() { if (mobileMenu) mobileMenu.style.display = "none"; }

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = "fadeUp 0.6s ease both";
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });
document.querySelectorAll(".feature-card, .stat-card").forEach(el => { el.style.opacity = "0"; observer.observe(el); });

// ── BOOT ────────────────────────────────────────────────
bootConfig();
initContactForm();
