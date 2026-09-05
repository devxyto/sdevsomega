const $=s=>document.querySelector(s);
let mode="login", me=null, pendingFile=null, socket=null;
const authForm=$("#authForm"), authSubmit=$("#authSubmit");
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");mode=b.dataset.mode;authSubmit.textContent=mode==="login"?"Enter SDEVS":"Create account";$("#authError").textContent=""});
authForm.onsubmit=async e=>{e.preventDefault();$("#authError").textContent="";const body={username:$("#authUser").value,password:$("#authPass").value};try{const r=await fetch("/api/"+mode,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);await boot()}catch(x){$("#authError").textContent=x.message}};
async function boot(){const r=await fetch("/api/me");if(!r.ok)return;me=(await r.json()).user;$("#authView").classList.add("hidden");$("#appView").classList.remove("hidden");renderMe();loadMessages();socket=io({auth:{}});socket.on("message:new",m=>addMessage(m));}
function renderMe(){const n=me.username;$("#sideUser").textContent=n;$("#avatar").textContent=n[0].toUpperCase();$("#role").textContent=me.role==="owner"?"Owner":"Member"}
function esc(s){const d=document.createElement("div");d.textContent=s;return d.innerHTML}
function addMessage(m){const box=$("#messages");const el=document.createElement("article");el.className="msg";const initial=esc((m.username||"?")[0].toUpperCase());let attachment="";if(m.file_url){const image=/^image\//.test(m.mime_type);attachment=image?`<a class="attachment" href="${m.file_url}" target="_blank"><img src="${m.file_url}" alt="${esc(m.file_name)}"></a>`:`<a class="attachment" href="${m.file_url}" target="_blank">📎 ${esc(m.file_name)} · ${fmt(m.file_size)}</a>`}el.innerHTML=`<div class="avatar">${initial}</div><div class="msg-body"><div class="msg-top"><span class="msg-name ${m.username==="OWNER"?"owner":""}">${esc(m.username)}</span><span class="msg-time">${new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span></div><div class="msg-text">${esc(m.text||"")}</div>${attachment}</div>`;box.appendChild(el);box.scrollTop=box.scrollHeight}
function fmt(n){if(!n)return"";let u=["B","KB","MB","GB"],i=0;while(n>=1024&&i<3){n/=1024;i++}return n.toFixed(i?1:0)+" "+u[i]}
async function loadMessages(){const r=await fetch("/api/messages");if(!r.ok)return;$("#messages").innerHTML="";(await r.json()).messages.forEach(addMessage)}
$("#composer").onsubmit=async e=>{e.preventDefault();const text=$("#messageInput").value.trim();if(!text&&!pendingFile)return;try{let file={};if(pendingFile){const fd=new FormData();fd.append("file",pendingFile);const r=await fetch("/api/upload",{method:"POST",body:fd});const d=await r.json();if(!r.ok)throw Error(d.error);file=d}const r=await fetch("/api/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,file})});const d=await r.json();if(!r.ok)throw Error(d.error);$("#messageInput").value="";pendingFile=null;$("#uploadPreview").classList.add("hidden")}catch(x){alert(x.message)}};
$("#attach").onclick=()=>$("#fileInput").click();
$("#fileInput").onchange=e=>{pendingFile=e.target.files[0];if(pendingFile){$("#uploadPreview").textContent="📎 "+pendingFile.name+" · "+fmt(pendingFile.size);$("#uploadPreview").classList.remove("hidden")}};
$("#emoji").onclick=()=>$("#emojiTray").classList.toggle("hidden");
$("#emojiTray").onclick=e=>{if(e.target!==e.currentTarget){$("#messageInput").value+=e.target.textContent;$("#messageInput").focus()}};
$("#gif").onclick=()=>{$("#messageInput").value+=" [GIF] ";$("#messageInput").focus()};
$("#logout").onclick=async()=>{await fetch("/api/logout",{method:"POST"});location.reload()};
$("#changeName").onclick=()=>{$("#newName").value=me.username;$("#nameError").textContent="";$("#modal").classList.remove("hidden")};
$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
$("#saveName").onclick=async()=>{try{const r=await fetch("/api/me/username",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:$("#newName").value})});const d=await r.json();if(!r.ok)throw Error(d.error);me=d.user;renderMe();$("#modal").classList.add("hidden")}catch(x){$("#nameError").textContent=x.message}};
boot();
