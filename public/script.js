const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let mode = 'login', me = null, pendingFile = null, socket = null, gifTimer = null, musicTimer = null;

const emojiSets = {
  "😀 Faces":   "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾".split(" "),
  "❤️ Symbols": "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ✨ ⭐ 🌟 💫 🔥 ⚡ 💥 💯 ✅ ❌ ❗ ❓ ❕ ❔ ⚠️ 🚫 ⛔".split(" "),
  "🎮 Gaming":  "🎮 🕹️ 👾 🏆 🥇 🥈 🥉 ⚔️ 🛡️ 🗡️ 🏹 🎯 🔫 🚀 🧩 🎲 ♟️ 👑 💎 🧙 🧟 🧛 🧝 🥷 🤺".split(" "),
  "🙌 Hands":   "👋 🤚 🖐️ ✋ 🖖 👌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤲 🙏 💪 🫶 👏 🙌 👐 🤝 🫡".split(" ")
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
$$('.tab').forEach(b => b.onclick = () => {
  $$('.tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  mode = b.dataset.mode;
  $('#authSubmit').textContent = mode === 'login' ? 'Enter SDEVS' : 'Create account';
  $('#authError').textContent = '';
});

$('#authForm').onsubmit = async e => {
  e.preventDefault();
  $('#authError').textContent = '';
  $('#authSubmit').disabled = true;
  try {
    const r = await fetch('/api/' + mode, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $('#authUser').value, password: $('#authPass').value })
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    await boot();
  } catch (x) {
    $('#authError').textContent = x.message;
  } finally {
    $('#authSubmit').disabled = false;
  }
};

// ─── BOOT ─────────────────────────────────────────────────────────────────────
async function boot() {
  const r = await fetch('/api/me');
  if (!r.ok) return;
  me = (await r.json()).user;
  $('#authView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
  renderMe();
  loadMessages();
  loadStories();
  loadSettings();
  socket = io();
  socket.on('message:new', addMessage);
  socket.on('message:deleted', id => document.querySelector(`[data-msg-id="${id}"]`)?.remove());
  socket.on('story:new', s => renderStories([s], true));
  socket.on('story:deleted', id => document.querySelector(`[data-story-id="${id}"]`)?.remove());
  socket.on('announcement:new', a => showAnnouncement(a.text));
  socket.on('settings:updated', s => applySettings(s));
}

// ─── SIDEBAR TOGGLE (mobile) ──────────────────────────────────────────────────
const sidebar        = $('#sidebar');
const sidebarOverlay = $('#sidebarOverlay');
const hamburger      = $('#hamburger');
const closeSidebar   = $('#closeSidebar');

function openSidebar()  { sidebar.classList.add('open'); sidebarOverlay.classList.add('open'); }
function closeSidebarFn(){ sidebar.classList.remove('open'); sidebarOverlay.classList.remove('open'); }

hamburger.onclick    = openSidebar;
closeSidebar.onclick = closeSidebarFn;
sidebarOverlay.onclick = closeSidebarFn;

// close sidebar when a nav item is clicked on mobile
$$('.channel, #changeName, #openAdmin').forEach(el => {
  el.addEventListener('click', () => { if (window.innerWidth <= 720) closeSidebarFn(); });
});

// ─── RENDER ME ────────────────────────────────────────────────────────────────
function renderMe() {
  const n = me.username;
  $('#sideUser').textContent   = n;
  $('#avatar').textContent     = n[0].toUpperCase();
  $('#role').textContent       = me.role === 'owner' ? 'Owner' : 'Member';
  $('#ownerNav').classList.toggle('hidden', me.role !== 'owner');
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function fmt(n) {
  if (!n) return '';
  let u = ['B','KB','MB','GB'], i = 0;
  while (n >= 1024 && i < 3) { n /= 1024; i++; }
  return n.toFixed(i ? 1 : 0) + ' ' + u[i];
}

// ─── MESSAGES ────────────────────────────────────────────────────────────────
function addMessage(m) {
  if (document.querySelector(`[data-msg-id="${m.id}"]`)) return;
  const box = $('#messages');
  const el  = document.createElement('article');
  el.className = 'msg';
  el.dataset.msgId = m.id;
  const initial = esc((m.username || '?')[0].toUpperCase());
  let content = '';

  if (m.gif_url)
    content = `<a class="gif-card" href="${esc(m.gif_url)}" target="_blank" rel="noopener">
      <img src="${esc(m.gif_url)}" alt="${esc(m.gif_title||'GIF')}">
      <span>GIF · ${esc(m.gif_title||'GIPHY')}</span></a>`;
  else if (m.music)
    content = `<div class="music-card">
      <img src="${esc(m.music.artwork||'')}" alt="">
      <div class="music-info">
        <b>${esc(m.music.title)}</b>
        <span>${esc(m.music.artist)} · ${esc(m.music.album||'')}</span>
        <audio controls preload="none" src="${esc(m.music.previewUrl)}"></audio>
        <a href="${esc(m.music.storeUrl||'#')}" target="_blank" rel="noopener">Open in Music Store</a>
      </div></div>`;
  else if (m.file_url) {
    const isImage = /^image\//.test(m.mime_type);
    content = isImage
      ? `<a class="attachment image-attachment" href="${esc(m.file_url)}" target="_blank"><img src="${esc(m.file_url)}" alt="${esc(m.file_name)}"></a>`
      : `<a class="attachment" href="${esc(m.file_url)}" target="_blank">📎 ${esc(m.file_name)} · ${fmt(m.file_size)}</a>`;
  }

  const isOwner  = m.username === 'OWNER' || (m.role === 'owner');
  const canDelete = me?.role === 'owner';
  const deleteBtn = canDelete ? `<button class="delete-msg" data-id="${m.id}" title="Delete">×</button>` : '';
  const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  el.innerHTML = `
    <div class="avatar">${initial}</div>
    <div class="msg-body">
      <div class="msg-top">
        <span class="msg-name${isOwner ? ' owner-name' : ''}">${esc(m.username)}</span>
        <span class="msg-time">${time}</span>
        ${deleteBtn}
      </div>
      ${m.text ? `<div class="msg-text">${esc(m.text)}</div>` : ''}
      ${content}
    </div>`;

  box.appendChild(el);
  if (canDelete) el.querySelector('.delete-msg').onclick = () => deleteMessage(m.id);

  // auto scroll if near bottom
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  if (nearBottom) box.scrollTop = box.scrollHeight;
}

async function loadMessages() {
  const r = await fetch('/api/messages');
  if (r.ok) {
    $('#messages').innerHTML = '';
    (await r.json()).messages.forEach(addMessage);
    const box = $('#messages');
    box.scrollTop = box.scrollHeight;
  }
}

// ─── COMPOSER ────────────────────────────────────────────────────────────────
$('#composer').onsubmit = async e => {
  e.preventDefault();
  const text = $('#messageInput').value.trim();
  if (!text && !pendingFile) return;
  try {
    let file = {};
    if (pendingFile) {
      const fd = new FormData();
      fd.append('file', pendingFile);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      file = d;
    }
    const r = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, file, messageType: file.url ? 'file' : 'text' })
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    $('#messageInput').value = '';
    pendingFile = null;
    $('#uploadPreview').classList.add('hidden');
    $('#fileInput').value = '';
  } catch (x) { alert(x.message); }
};

$('#attach').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = e => {
  pendingFile = e.target.files[0];
  if (pendingFile) {
    $('#uploadPreview').innerHTML = `📎 ${pendingFile.name} &nbsp;·&nbsp; ${fmt(pendingFile.size)}`;
    $('#uploadPreview').classList.remove('hidden');
  }
};

// ─── PICKERS ─────────────────────────────────────────────────────────────────
function closePickers() {
  $$('.picker').forEach(x => x.classList.add('hidden'));
  $('#pickerBackdrop').classList.add('hidden');
}
function openPicker(id) {
  closePickers();
  $('#' + id).classList.remove('hidden');
  $('#pickerBackdrop').classList.remove('hidden');
}
$('#pickerBackdrop').onclick = closePickers;
$$('.close-picker').forEach(b => b.onclick = closePickers);

// emoji
function buildEmoji() {
  const tabs = $('#emojiTabs'), grid = $('#emojiGrid');
  tabs.innerHTML = '';
  Object.entries(emojiSets).forEach(([name, list], i) => {
    const b = document.createElement('button');
    b.textContent = name.split(' ')[0];
    b.title = name;
    b.onclick = () => {
      grid.innerHTML = '';
      list.forEach(x => {
        const e = document.createElement('button');
        e.textContent = x;
        e.onclick = () => { $('#messageInput').value += x; $('#messageInput').focus(); };
        grid.appendChild(e);
      });
    };
    tabs.appendChild(b);
    if (i === 0) b.click();
  });
}
buildEmoji();
$('#emoji').onclick = () => openPicker('emojiPicker');

// gif
async function loadGifs(q = 'trending') {
  const grid = $('#gifGrid');
  grid.innerHTML = '<div class="picker-loading">Loading…</div>';
  const r = await fetch('/api/giphy/search?q=' + encodeURIComponent(q));
  const d = await r.json();
  if (!r.ok) { grid.innerHTML = `<div class="picker-error">${esc(d.error||'GIPHY unavailable')}</div>`; return; }
  grid.innerHTML = '';
  d.gifs.forEach(g => {
    const b = document.createElement('button');
    b.className = 'gif-result';
    b.innerHTML = `<img src="${esc(g.preview)}" alt="${esc(g.title)}">`;
    b.onclick = () => sendGif(g);
    grid.appendChild(b);
  });
}
async function sendGif(g) {
  closePickers();
  const r = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageType: 'gif', gifUrl: g.url, gifTitle: g.title })
  });
  if (!r.ok) alert((await r.json()).error || 'Could not send GIF');
}
$('#gif').onclick = () => { openPicker('gifPicker'); loadGifs(); };
$('#gifSearch').oninput = e => {
  clearTimeout(gifTimer);
  gifTimer = setTimeout(() => loadGifs(e.target.value.trim() || 'trending'), 350);
};

// music
async function loadMusic(q) {
  const grid = $('#musicGrid');
  if (!q) { grid.innerHTML = '<div class="picker-loading">Search for a song or artist.</div>'; return; }
  grid.innerHTML = '<div class="picker-loading">Searching…</div>';
  const r = await fetch('/api/music/search?q=' + encodeURIComponent(q));
  const d = await r.json();
  if (!r.ok) { grid.innerHTML = `<div class="picker-error">${esc(d.error||'Music unavailable')}</div>`; return; }
  grid.innerHTML = '';
  d.tracks.forEach(t => {
    const b = document.createElement('button');
    b.className = 'track-result';
    b.innerHTML = `<img src="${esc(t.artwork||'')}" alt=""><span><b>${esc(t.title)}</b><small>${esc(t.artist)} · ${esc(t.album||'')}</small></span><strong>＋</strong>`;
    b.onclick = () => sendMusic(t);
    grid.appendChild(b);
  });
}
async function sendMusic(t) {
  closePickers();
  const r = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageType: 'music', music: t })
  });
  if (!r.ok) alert((await r.json()).error || 'Could not share track');
}
$('#music').onclick = () => { openPicker('musicPicker'); $('#musicSearch').focus(); };
$('#musicSearch').oninput = e => {
  clearTimeout(musicTimer);
  musicTimer = setTimeout(() => loadMusic(e.target.value.trim()), 350);
};

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
$('#logout').onclick = async () => { await fetch('/api/logout', { method: 'POST' }); location.reload(); };

// ─── USERNAME CHANGE ──────────────────────────────────────────────────────────
$('#changeName').onclick = () => { $('#newName').value = me.username; $('#nameError').textContent = ''; $('#modal').classList.remove('hidden'); };
$('#closeModal').onclick  = () => $('#modal').classList.add('hidden');
$('#saveName').onclick    = async () => {
  try {
    const r = await fetch('/api/me/username', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $('#newName').value })
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    me = d.user;
    renderMe();
    $('#modal').classList.add('hidden');
  } catch (x) { $('#nameError').textContent = x.message; }
};

// ─── STORIES ─────────────────────────────────────────────────────────────────
$('#storyBtn').onclick = () => { $('#storyError').textContent = ''; $('#storyText').value = ''; $('#storyFile').value = ''; $('#storyModal').classList.remove('hidden'); };

$$('[data-close]').forEach(b => b.onclick = () => $('#' + b.dataset.close).classList.add('hidden'));

$('#postStory').onclick = async () => {
  try {
    const fd = new FormData();
    fd.append('text', $('#storyText').value.trim());
    if ($('#storyFile').files[0]) fd.append('file', $('#storyFile').files[0]);
    const r = await fetch('/api/stories', { method: 'POST', body: fd });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    $('#storyModal').classList.add('hidden');
  } catch (x) { $('#storyError').textContent = x.message; }
};

async function loadStories() {
  const r = await fetch('/api/stories');
  if (r.ok) renderStories((await r.json()).stories);
}

function renderStories(stories, append = false) {
  const box = $('#stories');
  if (!append) box.innerHTML = '';
  stories.forEach(s => {
    if (document.querySelector(`[data-story-id="${s.id}"]`)) return;
    const el = document.createElement('button');
    el.className = 'story';
    el.dataset.storyId = s.id;
    const image = s.file_url ? `<img src="${esc(s.file_url)}" alt="">` : `<div class="story-text">${esc((s.text||'S')[0])}</div>`;
    el.innerHTML = `${image}<span>${esc(s.username)}</span>`;
    el.onclick = () => showStory(s);
    box.appendChild(el);
  });
}

function showStory(s) {
  const image  = s.file_url ? `<img class="story-view-img" src="${esc(s.file_url)}" alt="">` : '';
  const canDel = s.user_id === me.id || me.role === 'owner';
  const w = document.createElement('div');
  w.className = 'story-overlay';
  w.innerHTML = `<div class="story-view">
    <button class="close">×</button>
    ${image}
    <h3>${esc(s.username)}</h3>
    <p>${esc(s.text||'')}</p>
    <small>Expires ${new Date(s.expires_at).toLocaleString()}</small>
    ${canDel ? '<button class="delete-story">Delete story</button>' : ''}
  </div>`;
  document.body.appendChild(w);
  w.querySelector('.close').onclick = () => w.remove();
  const del = w.querySelector('.delete-story');
  if (del) del.onclick = async () => {
    await fetch('/api/stories/' + s.id, { method: 'DELETE' });
    w.remove();
    loadStories();
  };
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function applySettings(s) {
  if (s.clan_name) { document.title = s.clan_name + ' · SDEVS'; $('#clanNameSide').textContent = s.clan_name; }
  if (s.clan_tagline) $('#clanTagline').textContent = s.clan_tagline;
  showAnnouncement(s.announcement);
}
async function loadSettings() {
  const r = await fetch('/api/admin/overview');
  if (r.ok) applySettings((await r.json()).settings);
  else showAnnouncement('');
}
function showAnnouncement(text) {
  if (!text) { $('#announcementBar').classList.add('hidden'); return; }
  $('#announcementBar').innerHTML = '📢 ' + esc(text);
  $('#announcementBar').classList.remove('hidden');
}

// ─── DELETE MESSAGE ───────────────────────────────────────────────────────────
async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  const r = await fetch('/api/admin/messages/' + id, { method: 'DELETE' });
  if (!r.ok) alert((await r.json()).error || 'Failed');
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
$('#openAdmin').onclick   = async () => { if (me?.role !== 'owner') return; $('#adminModal').classList.remove('hidden'); await loadAdmin(); };
$('#closeAdmin').onclick  = () => $('#adminModal').classList.add('hidden');

async function loadAdmin() {
  const r = await fetch('/api/admin/overview');
  if (!r.ok) return alert('Owner access required.');
  const d = await r.json();
  $('#adminStats').innerHTML = `
    <div><b>${d.stats.users}</b><span>Total users</span></div>
    <div><b>${d.stats.members}</b><span>Active members</span></div>
    <div><b>${d.stats.messages}</b><span>Messages</span></div>
    <div><b>${d.stats.storageFiles}</b><span>Files</span></div>
    <div><b>${d.stats.stories}</b><span>Stories</span></div>`;
  $('#setClanName').value = d.settings.clan_name;
  $('#setTagline').value  = d.settings.clan_tagline;
  $('#userList').innerHTML = d.users.map(u => {
    const disabled = u.role === 'owner';
    const action = u.status === 'banned'
      ? `<button class="small good" data-action="unban" data-id="${u.id}">Unban</button>`
      : `<button class="small" data-action="kick" data-id="${u.id}" ${disabled ? 'disabled' : ''}>Kick</button>
         <button class="small danger" data-action="ban" data-id="${u.id}" ${disabled ? 'disabled' : ''}>Ban</button>`;
    return `<div class="user-row"><div><b>${esc(u.username)}</b><span>${u.role.toUpperCase()} · ${u.status}</span></div><div style="display:flex;gap:5px">${action}</div></div>`;
  }).join('');

  $$('[data-action]').forEach(b => b.onclick = async () => {
    const a = b.dataset.action, id = b.dataset.id;
    if (a === 'kick' && !confirm('Kick this user?')) return;
    const r = await fetch(`/api/admin/users/${id}/${a}`, { method: 'POST' });
    if (!r.ok) alert((await r.json()).error || 'Failed');
    else loadAdmin();
  });

  $('#announcementList').innerHTML = d.announcements.map(a =>
    `<div class="announcement-item"><span>${esc(a.text)}</span><button data-ann-id="${a.id}">×</button></div>`
  ).join('');
  $$('[data-ann-id]').forEach(b => b.onclick = async () => {
    await fetch('/api/admin/announcements/' + b.dataset.annId, { method: 'DELETE' });
    loadAdmin();
  });
  showAnnouncement(d.settings.announcement);
}

$('#saveSettings').onclick = async () => {
  const r = await fetch('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clan_name: $('#setClanName').value, clan_tagline: $('#setTagline').value })
  });
  if (!r.ok) alert('Could not save settings');
  else loadAdmin();
};

$('#postAnnouncement').onclick = async () => {
  const text = $('#announceText').value.trim();
  if (!text) return;
  const r = await fetch('/api/admin/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!r.ok) alert((await r.json()).error || 'Failed');
  else { $('#announceText').value = ''; loadAdmin(); }
};

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closePickers();
    $$('.modal:not(.hidden)').forEach(m => m.classList.add('hidden'));
    $$('.story-overlay').forEach(o => o.remove());
    closeSidebarFn();
  }
});

boot();
