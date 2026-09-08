/* ── SDEVS MESSENGER — script.js ── */
const $ = s => document.querySelector(s);
const GIPHY_KEY = ""; // <- paste your Giphy API key here
let mode = "login", me = null, pendingFile = null, socket = null;
let recentEmoji = JSON.parse(localStorage.getItem("sdevs_recent_emoji") || "[]");
let stories = JSON.parse(localStorage.getItem("sdevs_stories") || "[]");
let storyTimer = null, storyIndex = 0, storyBg = "#182532", storyType = "text", pendingStoryFile = null;

/* ── EMOJI DATA ── */
const EMOJI_CATS = {
  smileys: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","☺️","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
  people: ["👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🫀","🫁","🧠","🦷","🦴","👀","👁","👅","👄","💋","🩸","👶","👧","🧒","👦","👩","🧑","👨","👩‍🦱","🧑‍🦱","👨‍🦱","👩‍🦰","👨‍🦰","👱","👩‍🦳","👨‍🦳","👩‍🦲","👨‍🦲","🧔","👵","🧓","👴","👲","👳","🧕","🤵","👰","🤰","🤱","👼","🎅","🤶","🦸","🦹","🧙","🧝","🧛","🧟","🧞","🧜","🧚","👮","🕵","💂","🥷","👷","🫅","🤴","👸","👯","🕺","💃","🧖","🧗","🏇","🚴","🏋"],
  nature: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪲","🦟","🦗","🕷","🦂","🐢","🦎","🐍","🦕","🦖","🦑","🐙","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🦭","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐈","🐈‍⬛","🪶","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊","🌸","🌹","🌺","🌻","🌼","🌷","🌱","🌿","🍀","🍁","🍂","🍃","🌲","🌳","🌴","🌵","🎄","🌾","🌊","🌬","🌀","🌈","🌦","⛈","🌩","🌨","❄️","☃️","⛄","🌡","☀️","🌤","⛅","🌥","☁️","🌧","🌫","🌙","🌛","🌜","🌚","🌝","🌞","🪐","⭐","🌟","💫","✨","☄️","🌠"],
  food: ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🫑","🥑","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🫓","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🍲","🍛","🍜","🍝","🍠","🍢","🍣","🍤","🍙","🍚","🍘","🍥","🥮","🍡","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🧃","🥤","🧋","☕","🍵","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾"],
  travel: ["🚗","🚕","🚙","🚌","🚎","🚐","🚑","🚒","🚓","🚔","🚖","🚗","🚘","🚍","🚠","🚟","🚃","🚋","🚝","🚂","🚆","🚇","🚈","🚉","🚊","🚞","🚲","🛵","🛺","🚁","🛸","🛩","✈️","🪂","💺","🚀","🛶","⛵","🛥","🚢","🛳","⛴","🚤","🛟","⚓","🚧","🗼","🏰","🏯","🕌","🛕","⛩","🕍","⛪","🗽","🗿","🏛","🏗","🧱","🪨","🪵","🛖","🏘","🏚","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🌁","🌃","🌄","🌅","🌆","🌇","🌉","🏙","🌌","🌠","🎇","🎆","🌋","🗺","🏔","⛰","🏕","🏖","🏜","🏝","🏞","🎠","🎡","🎢"],
  activity: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🎣","🤿","🎽","🎿","🛷","🥌","🎯","🪃","🎱","🎮","🕹","🎲","♟","🧩","🪅","🪆","♠️","♥️","♦️","♣️","🃏","🀄","🎴","🎭","🎨","🖼","🎰","🚂","🎡","🎢","🎠","🎪","🎤","🎧","🎼","🎹","🪘","🥁","🎷","🎺","🎸","🪕","🎻","🪗","🎬","🎥","📽","🎞","📺","🎙","📻"],
  objects: ["💡","🔦","🕯","🪔","🧲","💰","💴","💵","💶","💷","💸","💳","🪙","💹","📈","📉","📊","📋","📌","📍","✂️","🗃","🗄","🗑","🔒","🔓","🔏","🔐","🔑","🗝","🔨","🪓","⛏","⚒","🛠","🗡","⚔️","🛡","🪚","🔧","🪛","🔩","⚙️","🗜","🪤","🪣","🧰","🧲","🔫","💣","🧨","🪬","🔮","🧿","🪩","🪄","🎩","🎪","🎭","🖼","🎨","🧵","🪡","🧶","🪢","👓","🕶","🥽","🌂","☂️","🧵","💍","💎","🔭","🔬","🩺","🩻","🩹","🩼","💊","🩱","👗","👘","🥻","🩱","👙","👚","👛","👜","👝","🎒","🧳","👒","🎓","🪖","⛑","📱","💻","⌨️","🖥","🖨","🖱","🖲","💾","💿","📀","📷","📸","📹","🎥","📞","☎️","📟","📠","📺","📻","🎙","⏱","⏲","⏰","🕰","⌛","⏳","📡","🔋","🪫","🔌","💡","🔦","🕯"],
  symbols: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🔀","🔁","🔂","▶️","⏩","⏪","🔼","🔽","⏫","⏬","⏹","⏏","🎦","🔅","🔆","📶","📳","📴","🔇","🔈","🔉","🔊","📢","📣","🔔","🔕","🎵","🎶","⁉️","🔱","📛","🔰","♻️","✅","❎","🆗","🆙","🆒","🆕","🆓","🆖","🅰️","🅱️","🆎","🆑","🆘","⛔","🚫","📵","🔞","🚳","🚭","🚯","🚱","🚷","🔕","💯","🔛","🔜","🔚","🔝","🔙","🔛","〽️","✳️","❇️","⁉️","‼️","🔟","💹","💱","©","®","™"],
  flags: ["🏳️","🏴","🚩","🎌","🏁","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️","🇺🇳","🇦🇫","🇦🇱","🇩🇿","🇦🇩","🇦🇴","🇦🇬","🇦🇷","🇦🇲","🇦🇺","🇦🇹","🇦🇿","🇧🇸","🇧🇭","🇧🇩","🇧🇧","🇧🇾","🇧🇪","🇧🇿","🇧🇯","🇧🇹","🇧🇴","🇧🇦","🇧🇼","🇧🇷","🇧🇳","🇧🇬","🇧🇫","🇧🇮","🇨🇻","🇰🇭","🇨🇲","🇨🇦","🇨🇫","🇹🇩","🇨🇱","🇨🇳","🇨🇴","🇰🇲","🇨🇩","🇨🇬","🇨🇷","🇭🇷","🇨🇺","🇨🇾","🇨🇿","🇩🇰","🇩🇯","🇩🇲","🇩🇴","🇪🇨","🇪🇬","🇸🇻","🇬🇶","🇪🇷","🇪🇪","🇸🇿","🇪🇹","🇫🇯","🇫🇮","🇫🇷","🇬🇦","🇬🇲","🇬🇪","🇩🇪","🇬🇭","🇬🇷","🇬🇩","🇬🇹","🇬🇳","🇬🇼","🇬🇾","🇭🇹","🇭🇳","🇭🇺","🇮🇸","🇮🇳","🇮🇩","🇮🇷","🇮🇶","🇮🇪","🇮🇱","🇮🇹","🇯🇲","🇯🇵","🇯🇴","🇰🇿","🇰🇪","🇰🇮","🇰🇵","🇰🇷","🇽🇰","🇰🇼","🇰🇬","🇱🇦","🇱🇻","🇱🇧","🇱🇸","🇱🇷","🇱🇾","🇱🇮","🇱🇹","🇱🇺","🇲🇬","🇲🇼","🇲🇾","🇲🇻","🇲🇱","🇲🇹","🇲🇭","🇲🇷","🇲🇺","🇲🇽","🇫🇲","🇲🇩","🇲🇨","🇲🇳","🇲🇪","🇲🇦","🇲🇿","🇲🇲","🇳🇦","🇳🇷","🇳🇵","🇳🇱","🇳🇿","🇳🇮","🇳🇪","🇳🇬","🇲🇰","🇳🇴","🇴🇲","🇵🇰","🇵🇼","🇵🇸","🇵🇦","🇵🇬","🇵🇾","🇵🇪","🇵🇭","🇵🇱","🇵🇹","🇶🇦","🇷🇴","🇷🇺","🇷🇼","🇰🇳","🇱🇨","🇻🇨","🇼🇸","🇸🇲","🇸🇹","🇸🇦","🇸🇳","🇷🇸","🇸🇨","🇸🇱","🇸🇬","🇸🇰","🇸🇮","🇸🇧","🇸🇴","🇿🇦","🇸🇸","🇪🇸","🇱🇰","🇸🇩","🇸🇷","🇸🇿","🇸🇪","🇨🇭","🇸🇾","🇹🇼","🇹🇯","🇹🇿","🇹🇭","🇹🇱","🇹🇬","🇹🇴","🇹🇹","🇹🇳","🇹🇷","🇹🇲","🇹🇻","🇺🇬","🇺🇦","🇦🇪","🇬🇧","🇺🇸","🇺🇾","🇺🇿","🇻🇺","🇻🇦","🇻🇪","🇻🇳","🇾🇪","🇿🇲","🇿🇼"]
};
let currentEmojiCat = "smileys";

/* ── AUTH ── */
document.querySelectorAll(".tab").forEach(b => b.onclick = () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  mode = b.dataset.mode;
  $("#authSubmit").textContent = mode === "login" ? "Enter SDEVS" : "Create account";
  $("#authError").textContent = "";
});
$("#authForm").onsubmit = async e => {
  e.preventDefault();
  $("#authError").textContent = "";
  try {
    const r = await fetch("/api/" + mode, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: $("#authUser").value, password: $("#authPass").value })
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    await boot();
  } catch (x) { $("#authError").textContent = x.message; }
};

async function boot() {
  const r = await fetch("/api/me");
  if (!r.ok) return;
  me = (await r.json()).user;
  $("#authView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  renderMe();
  loadMessages();
  renderStoryBar();
  socket = io();
  socket.on("message:new", addMessage);
  socket.on("message:deleted", id => document.querySelector(`[data-msg-id="${id}"]`)?.remove());
  socket.on("announcement:new", a => showAnnouncement(a.text));
  socket.on("settings:updated", s => {
    if (s.clan_name) document.title = s.clan_name;
    if (s.clan_tagline) $("#clanTagline").textContent = s.clan_tagline;
    showAnnouncement(s.announcement);
  });
}

function renderMe() {
  const n = me.username;
  $("#sideUser").textContent = n;
  $("#avatar").textContent = n[0].toUpperCase();
  $("#role").textContent = me.role === "owner" ? "Owner" : "Member";
  $("#ownerNav").classList.toggle("hidden", me.role !== "owner");
}

function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
function fmt(n) {
  if (!n) return "";
  let u = ["B", "KB", "MB", "GB"], i = 0;
  while (n >= 1024 && i < 3) { n /= 1024; i++; }
  return n.toFixed(i ? 1 : 0) + " " + u[i];
}

/* ── MESSAGES ── */
function addMessage(m) {
  if (document.querySelector(`[data-msg-id="${m.id}"]`)) return;
  const box = $("#messages"), el = document.createElement("article");
  el.className = "msg"; el.dataset.msgId = m.id;
  const initial = esc((m.username || "?")[0].toUpperCase());
  let attachment = "";
  if (m.file_url) {
    const image = /^image\//.test(m.mime_type);
    attachment = image
      ? `<a class="attachment" href="${m.file_url}" target="_blank"><img src="${m.file_url}" alt="${esc(m.file_name)}"></a>`
      : `<a class="attachment" href="${m.file_url}" target="_blank">📎 ${esc(m.file_name)} · ${fmt(m.file_size)}</a>`;
  }
  /* GIF message rendering */
  let gifEmbed = "";
  if (m.text && m.text.startsWith("__GIF__:")) {
    const url = m.text.replace("__GIF__:", "");
    gifEmbed = `<img src="${esc(url)}" class="gif-msg" alt="GIF" loading="lazy">`;
  }
  /* MUSIC message rendering */
  let musicEmbed = "";
  if (m.text && m.text.startsWith("__MUSIC__:")) {
    try {
      const data = JSON.parse(m.text.replace("__MUSIC__:", ""));
      musicEmbed = `<div class="music-card">
        <img src="${esc(data.cover)}" alt="cover">
        <div class="music-card-info">
          <b>${esc(data.title)}</b>
          <span>${esc(data.artist)}</span>
          <audio controls src="${esc(data.preview)}" style="width:100%;margin-top:6px"></audio>
        </div>
      </div>`;
    } catch {}
  }
  const isSpecial = gifEmbed || musicEmbed;
  const admin = me?.role === "owner" ? `<button class="delete-msg" data-id="${m.id}" title="Delete message">×</button>` : "";
  el.innerHTML = `
    <div class="avatar">${initial}</div>
    <div class="msg-body">
      <div class="msg-top">
        <span class="msg-name ${m.username === "OWNER" ? "owner" : ""}">${esc(m.username)}</span>
        <span class="msg-time">${new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        ${admin}
      </div>
      ${isSpecial ? (gifEmbed || musicEmbed) : `<div class="msg-text">${esc(m.text || "")}</div>`}
      ${attachment}
    </div>`;
  box.appendChild(el);
  if (admin) el.querySelector(".delete-msg").onclick = () => deleteMessage(m.id);
  box.scrollTop = box.scrollHeight;
}

async function loadMessages() {
  const r = await fetch("/api/messages");
  if (!r.ok) return;
  $("#messages").innerHTML = "";
  (await r.json()).messages.forEach(addMessage);
}

/* ── COMPOSER SUBMIT ── */
$("#composer").onsubmit = async e => {
  e.preventDefault();
  const text = $("#messageInput").value.trim();
  if (!text && !pendingFile) return;
  try {
    let file = {};
    if (pendingFile) {
      const fd = new FormData(); fd.append("file", pendingFile);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      file = d;
    }
    const r = await fetch("/api/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, file })
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    $("#messageInput").value = "";
    pendingFile = null;
    $("#uploadPreview").classList.add("hidden");
    $("#fileInput").value = "";
  } catch (x) { alert(x.message); }
};

/* ── ATTACH FILE ── */
$("#attach").onclick = () => $("#fileInput").click();
$("#fileInput").onchange = e => {
  pendingFile = e.target.files[0];
  if (pendingFile) {
    $("#uploadPreview").textContent = "📎 " + pendingFile.name + " · " + fmt(pendingFile.size);
    $("#uploadPreview").classList.remove("hidden");
  }
};

/* ── EMOJI PICKER ── */
function closeAllPanels() {
  $("#emojiPicker").classList.add("hidden");
  $("#gifPanel").classList.add("hidden");
  $("#musicPanel").classList.add("hidden");
}

function renderEmojiGrid(cat, filter = "") {
  const grid = $("#emojiGrid");
  let pool = cat === "recent" ? recentEmoji : (EMOJI_CATS[cat] || []);
  if (filter) {
    // search across all cats
    pool = Object.values(EMOJI_CATS).flat().filter((_, i, a) => a.indexOf(_) === i);
    // rough filter by unicode name — just filter visually by showing matching emojis that contain the search
    // For a real search we'd need a name map; here we show all and let them scroll
    pool = pool.filter(e => e.includes(filter));
    if (!pool.length) pool = Object.values(EMOJI_CATS).flat().slice(0, 60);
  }
  grid.innerHTML = pool.map(e => `<button class="ep-emoji" data-e="${e}">${e}</button>`).join("");
  grid.querySelectorAll(".ep-emoji").forEach(b => b.onclick = () => {
    const em = b.dataset.e;
    $("#messageInput").value += em;
    $("#messageInput").focus();
    recentEmoji = [em, ...recentEmoji.filter(x => x !== em)].slice(0, 30);
    localStorage.setItem("sdevs_recent_emoji", JSON.stringify(recentEmoji));
  });
}

$("#emoji").onclick = () => {
  const p = $("#emojiPicker");
  const wasHidden = p.classList.contains("hidden");
  closeAllPanels();
  if (wasHidden) {
    p.classList.remove("hidden");
    renderEmojiGrid(currentEmojiCat);
  }
};

document.querySelectorAll(".ep-cat").forEach(b => b.onclick = () => {
  document.querySelectorAll(".ep-cat").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  currentEmojiCat = b.dataset.cat;
  $("#emojiSearch").value = "";
  renderEmojiGrid(currentEmojiCat);
});

$("#emojiSearch").addEventListener("input", e => {
  const v = e.target.value.trim();
  renderEmojiGrid(currentEmojiCat, v);
});

/* ── GIPHY ── */
async function fetchGifs(query) {
  const grid = $("#gifGrid");
  grid.innerHTML = `<div class="gif-loading">Loading…</div>`;
  let url;
  if (GIPHY_KEY) {
    url = query
      ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=24&rating=g`;
  } else {
    // Fallback: use public Giphy explore endpoint (limited, no key needed for basic trending)
    url = `https://api.giphy.com/v1/gifs/trending?api_key=dc6zaTOxFJmzC&limit=24&rating=g`;
  }
  try {
    const r = await fetch(url);
    const d = await r.json();
    if (!d.data?.length) { grid.innerHTML = `<div class="gif-loading">No results.</div>`; return; }
    grid.innerHTML = d.data.map(g =>
      `<img src="${g.images.fixed_height_small.url}" data-full="${g.images.downsized_medium.url}" class="gif-thumb" alt="GIF" loading="lazy">`
    ).join("");
    grid.querySelectorAll(".gif-thumb").forEach(img => img.onclick = async () => {
      closeAllPanels();
      const text = "__GIF__:" + img.dataset.full;
      const r = await fetch("/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, file: {} })
      });
      if (!r.ok) alert((await r.json()).error || "Failed to send GIF");
    });
  } catch (err) {
    grid.innerHTML = `<div class="gif-loading">Failed to load GIFs.</div>`;
  }
}

$("#gif").onclick = () => {
  const p = $("#gifPanel");
  const wasHidden = p.classList.contains("hidden");
  closeAllPanels();
  if (wasHidden) {
    p.classList.remove("hidden");
    fetchGifs("");
  }
};
$("#gifClose").onclick = () => $("#gifPanel").classList.add("hidden");

let gifDebounce;
$("#gifSearch").addEventListener("input", e => {
  clearTimeout(gifDebounce);
  gifDebounce = setTimeout(() => fetchGifs(e.target.value.trim()), 500);
});

/* ── MUSIC (Deezer CORS proxy via allorigins) ── */
async function fetchMusic(query) {
  const results = $("#musicResults");
  if (!query) { results.innerHTML = `<div class="gif-loading">Type a song name to search.</div>`; return; }
  results.innerHTML = `<div class="gif-loading">Searching…</div>`;
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent("https://api.deezer.com/search?q=" + encodeURIComponent(query) + "&limit=10")}`;
    const r = await fetch(proxyUrl);
    const raw = await r.json();
    const d = JSON.parse(raw.contents);
    if (!d.data?.length) { results.innerHTML = `<div class="gif-loading">No results.</div>`; return; }
    results.innerHTML = d.data.map(t => `
      <div class="music-row" data-title="${esc(t.title)}" data-artist="${esc(t.artist.name)}" data-cover="${esc(t.album.cover_small)}" data-preview="${esc(t.preview)}">
        <img src="${esc(t.album.cover_small)}" alt="cover">
        <div class="music-row-info">
          <b>${esc(t.title)}</b>
          <span>${esc(t.artist.name)}</span>
        </div>
        <audio controls src="${esc(t.preview)}" style="flex:1;min-width:0"></audio>
        <button class="send-music-btn">Send</button>
      </div>`).join("");
    results.querySelectorAll(".send-music-btn").forEach(btn => btn.onclick = async () => {
      const row = btn.closest(".music-row");
      const payload = { title: row.dataset.title, artist: row.dataset.artist, cover: row.dataset.cover, preview: row.dataset.preview };
      const text = "__MUSIC__:" + JSON.stringify(payload);
      closeAllPanels();
      const r = await fetch("/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, file: {} })
      });
      if (!r.ok) alert("Failed to send music");
    });
  } catch {
    results.innerHTML = `<div class="gif-loading">Search failed. Try again.</div>`;
  }
}

$("#musicBtn").onclick = () => {
  const p = $("#musicPanel");
  const wasHidden = p.classList.contains("hidden");
  closeAllPanels();
  if (wasHidden) {
    p.classList.remove("hidden");
    fetchMusic($("#musicSearch").value.trim());
  }
};
$("#musicClose").onclick = () => $("#musicPanel").classList.add("hidden");

let musicDebounce;
$("#musicSearch").addEventListener("input", e => {
  clearTimeout(musicDebounce);
  musicDebounce = setTimeout(() => fetchMusic(e.target.value.trim()), 600);
});

/* ── STORIES ── */
function saveStories() { localStorage.setItem("sdevs_stories", JSON.stringify(stories)); }

function renderStoryBar() {
  const list = $("#storyList");
  const now = Date.now();
  // Expire stories older than 24h
  stories = stories.filter(s => now - s.ts < 86400000);
  saveStories();
  list.innerHTML = stories.map((s, i) => `
    <button class="story-thumb" data-i="${i}" style="background:${s.type==='image'?'#0d1319':s.bg}">
      ${s.type === 'image' ? `<img src="${s.img}" alt="story">` : `<span class="story-text-preview">${esc(s.text.slice(0,30))}</span>`}
      <span class="story-author">${esc(s.author)}</span>
    </button>`).join("");
  list.querySelectorAll(".story-thumb").forEach(b => b.onclick = () => openStoryViewer(+b.dataset.i));
}

function openStoryViewer(i) {
  storyIndex = i;
  const sv = $("#storyViewer");
  sv.classList.remove("hidden");
  showStory(storyIndex);
}

function showStory(i) {
  const s = stories[i];
  if (!s) { closeStoryViewer(); return; }
  const content = $("#storyViewContent");
  const progress = $("#storyProgress");
  content.style.background = s.type === "image" ? "#000" : s.bg;
  content.innerHTML = s.type === "image"
    ? `<img src="${s.img}" class="sv-img" alt="story"><div class="sv-author">${esc(s.author)}</div>`
    : `<div class="sv-text">${esc(s.text)}</div><div class="sv-author">${esc(s.author)}</div>`;
  progress.innerHTML = stories.map((_, j) =>
    `<div class="sv-bar ${j === i ? "active" : j < i ? "done" : ""}"></div>`).join("");
  clearTimeout(storyTimer);
  storyTimer = setTimeout(() => showStory(i + 1), 5000);
}

function closeStoryViewer() {
  clearTimeout(storyTimer);
  $("#storyViewer").classList.add("hidden");
}
$("#storyViewClose").onclick = closeStoryViewer;
$("#storyViewer").onclick = e => { if (e.target === $("#storyViewer")) closeStoryViewer(); };

/* Story creator */
$("#addStory").onclick = () => {
  if (!me) return;
  $("#storyCreator").classList.remove("hidden");
  $("#storyText").value = "";
  storyBg = "#182532";
  storyType = "text";
  pendingStoryFile = null;
  $("#storyImagePreview").innerHTML = "<span>Click to choose image</span>";
  document.querySelectorAll(".bg-opt").forEach((b, i) => b.classList.toggle("active", i === 0));
  document.querySelectorAll(".story-type").forEach(b => b.classList.toggle("active", b.dataset.type === "text"));
  $("#storyTextInput").classList.remove("hidden");
  $("#storyImageInput").classList.add("hidden");
};
$("#closeStoryCreator").onclick = () => $("#storyCreator").classList.add("hidden");

document.querySelectorAll(".story-type").forEach(b => b.onclick = () => {
  storyType = b.dataset.type;
  document.querySelectorAll(".story-type").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  $("#storyTextInput").classList.toggle("hidden", storyType !== "text");
  $("#storyImageInput").classList.toggle("hidden", storyType !== "image");
});

document.querySelectorAll(".bg-opt").forEach(b => b.onclick = () => {
  storyBg = b.dataset.bg;
  document.querySelectorAll(".bg-opt").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
});

$("#storyFileInput").onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  pendingStoryFile = f;
  const reader = new FileReader();
  reader.onload = r => { $("#storyImagePreview").innerHTML = `<img src="${r.target.result}" alt="preview">`; };
  reader.readAsDataURL(f);
};

$("#postStory").onclick = () => {
  if (storyType === "text") {
    const text = $("#storyText").value.trim();
    if (!text) return alert("Write something first.");
    stories.unshift({ type: "text", text, bg: storyBg, author: me.username, ts: Date.now() });
    saveStories();
    renderStoryBar();
    $("#storyCreator").classList.add("hidden");
  } else {
    if (!pendingStoryFile) return alert("Choose an image first.");
    const reader = new FileReader();
    reader.onload = r => {
      stories.unshift({ type: "image", img: r.target.result, author: me.username, ts: Date.now() });
      saveStories();
      renderStoryBar();
      $("#storyCreator").classList.add("hidden");
    };
    reader.readAsDataURL(pendingStoryFile);
  }
};

/* ── MISC ── */
$("#logout").onclick = async () => { await fetch("/api/logout", { method: "POST" }); location.reload(); };
$("#changeName").onclick = () => { $("#newName").value = me.username; $("#nameError").textContent = ""; $("#modal").classList.remove("hidden"); };
$("#closeModal").onclick = () => $("#modal").classList.add("hidden");
$("#saveName").onclick = async () => {
  try {
    const r = await fetch("/api/me/username", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: $("#newName").value }) });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    me = d.user; renderMe(); $("#modal").classList.add("hidden");
  } catch (x) { $("#nameError").textContent = x.message; }
};

async function deleteMessage(id) {
  if (!confirm("Delete this message?")) return;
  const r = await fetch("/api/admin/messages/" + id, { method: "DELETE" });
  if (!r.ok) alert((await r.json()).error || "Failed");
}

$("#openAdmin").onclick = async () => {
  if (me?.role !== "owner") return;
  $("#adminModal").classList.remove("hidden");
  await loadAdmin();
};
$("#closeAdmin").onclick = () => $("#adminModal").classList.add("hidden");

async function loadAdmin() {
  const r = await fetch("/api/admin/overview");
  if (!r.ok) return alert("Owner access required.");
  const d = await r.json();
  $("#adminStats").innerHTML = `<div><b>${d.stats.users}</b><span>Total users</span></div><div><b>${d.stats.members}</b><span>Active members</span></div><div><b>${d.stats.messages}</b><span>Messages</span></div><div><b>${d.stats.storageFiles}</b><span>Uploaded files</span></div>`;
  $("#setClanName").value = d.settings.clan_name;
  $("#setTagline").value = d.settings.clan_tagline;
  $("#userList").innerHTML = d.users.map(u => {
    const disabled = u.role === "owner";
    const action = u.status === "banned"
      ? `<button class="small good" data-action="unban" data-id="${u.id}">Unban</button>`
      : `<button class="small" data-action="kick" data-id="${u.id}" ${disabled ? "disabled" : ""}>Kick</button><button class="small danger" data-action="ban" data-id="${u.id}" ${disabled ? "disabled" : ""}>Ban</button>`;
    return `<div class="user-row"><div><b>${esc(u.username)}</b><span>${u.role.toUpperCase()} · ${u.status}</span></div><div>${action}</div></div>`;
  }).join("");
  document.querySelectorAll("[data-action]").forEach(b => b.onclick = async () => {
    const a = b.dataset.action, id = b.dataset.id;
    if (a === "kick" && !confirm("Kick this user?")) return;
    const r = await fetch(`/api/admin/users/${id}/${a}`, { method: "POST" });
    if (!r.ok) alert((await r.json()).error || "Failed");
    else loadAdmin();
  });
  $("#announcementList").innerHTML = d.announcements.map(a =>
    `<div class="announcement-item"><span>${esc(a.text)}</span><button data-ann-id="${a.id}">×</button></div>`
  ).join("");
  document.querySelectorAll("[data-ann-id]").forEach(b => b.onclick = async () => {
    await fetch("/api/admin/announcements/" + b.dataset.annId, { method: "DELETE" });
    loadAdmin();
  });
  showAnnouncement(d.settings.announcement);
}

$("#saveSettings").onclick = async () => {
  const r = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clan_name: $("#setClanName").value, clan_tagline: $("#setTagline").value }) });
  if (!r.ok) alert("Could not save settings");
};
$("#postAnnouncement").onclick = async () => {
  const text = $("#announceText").value.trim();
  if (!text) return;
  const r = await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
  if (!r.ok) alert((await r.json()).error || "Failed");
  else { $("#announceText").value = ""; loadAdmin(); }
};

function showAnnouncement(text) {
  if (!text) { $("#announcementBar").classList.add("hidden"); return; }
  $("#announcementBar").textContent = "📢 " + text;
  $("#announcementBar").classList.remove("hidden");
}

/* Close panels on outside click */
document.addEventListener("click", e => {
  if (!e.target.closest("#emojiPicker") && !e.target.closest("#emoji")) $("#emojiPicker").classList.add("hidden");
  if (!e.target.closest("#gifPanel") && !e.target.closest("#gif")) $("#gifPanel").classList.add("hidden");
  if (!e.target.closest("#musicPanel") && !e.target.closest("#musicBtn")) $("#musicPanel").classList.add("hidden");
});

boot();
