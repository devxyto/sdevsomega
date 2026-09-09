require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString("hex");
const MAX_UPLOAD_MB = Math.max(100, Number(process.env.MAX_UPLOAD_MB || 500));
const GIPHY_API_KEY = String(process.env.GIPHY_API_KEY || "").trim();
const dataDir = path.join(__dirname, "data");
const uploadDir = path.join(dataDir, "uploads");
const storyDir = path.join(dataDir, "stories");
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(storyDir, { recursive: true });
const db = new Database(path.join(dataDir, "sdevs.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'member',
 status TEXT NOT NULL DEFAULT 'active',
 session_version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 username TEXT NOT NULL,
 text TEXT DEFAULT '',
 file_url TEXT DEFAULT '',
 file_name TEXT DEFAULT '',
 file_size INTEGER DEFAULT 0,
 mime_type TEXT DEFAULT '',
 message_type TEXT NOT NULL DEFAULT 'text',
 music_json TEXT DEFAULT '',
 gif_url TEXT DEFAULT '',
 gif_title TEXT DEFAULT '',
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS announcements (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 text TEXT NOT NULL,
 author TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS stories (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 username TEXT NOT NULL,
 text TEXT DEFAULT '',
 file_url TEXT DEFAULT '',
 file_name TEXT DEFAULT '',
 mime_type TEXT DEFAULT '',
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);
// Migrations for older SDEVS databases.
for (const sql of [
  "ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text'",
  "ALTER TABLE messages ADD COLUMN music_json TEXT DEFAULT ''",
  "ALTER TABLE messages ADD COLUMN gif_url TEXT DEFAULT ''",
  "ALTER TABLE messages ADD COLUMN gif_title TEXT DEFAULT ''",
  "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'",
  "ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1"
]) { try { db.exec(sql); } catch {} }

const ownerUsername = process.env.OWNER_USERNAME || "OWNER";
const ownerPassword = process.env.OWNER_PASSWORD || "kenjibns";
const existingOwner = db.prepare("SELECT * FROM users WHERE username=?").get(ownerUsername);
if (!existingOwner) {
  db.prepare("INSERT INTO users(username,password_hash,role,status,session_version,created_at) VALUES(?,?,?,?,?,?)")
    .run(ownerUsername, bcrypt.hashSync(ownerPassword, 12), "owner", "active", 1, Date.now());
} else {
  db.prepare("UPDATE users SET role='owner',status='active' WHERE id=?").run(existingOwner.id);
}
for (const [key, value] of Object.entries({ clan_name:"SDEVS MESSENGER", clan_tagline:"Private clan communication hub.", announcement:"" })) {
  db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)").run(key,value);
}

app.use(express.json({ limit:"2mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,"public")));
app.use("/uploads", express.static(uploadDir));
app.use("/stories", express.static(storyDir));
const authLimiter = rateLimit({ windowMs:15*60*1000, max:120, standardHeaders:true });
const uploadLimiter = rateLimit({ windowMs:15*60*1000, max:80, standardHeaders:true });
function sign(user) { return jwt.sign({id:user.id,username:user.username,role:user.role,sv:user.session_version}, JWT_SECRET, {expiresIn:"7d"}); }
function setAuthCookie(res,user) { res.cookie("sdevs_token", sign(user), {httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:7*86400000}); }
function auth(req,res,next) {
  try {
    const token=req.cookies.sdevs_token || (req.headers.authorization||"").replace(/^Bearer\s+/i,"");
    if(!token) return res.status(401).json({error:"Not authenticated"});
    const payload=jwt.verify(token,JWT_SECRET);
    const user=db.prepare("SELECT id,username,role,status,session_version FROM users WHERE id=?").get(payload.id);
    if(!user || user.status!=="active" || user.session_version!==payload.sv) return res.status(401).json({error:"Session ended or account unavailable."});
    req.user=user; next();
  } catch { res.status(401).json({error:"Invalid or expired session"}); }
}
function ownerOnly(req,res,next){ if(req.user?.role!=="owner") return res.status(403).json({error:"Owner access required."}); next(); }
function publicUser(u){ return {id:u.id,username:u.username,role:u.role,status:u.status}; }
function setting(key){ return db.prepare("SELECT value FROM settings WHERE key=?").get(key)?.value || ""; }
function cleanExpiredStories(){
  const old=db.prepare("SELECT file_url FROM stories WHERE expires_at<=?").all(Date.now());
  db.prepare("DELETE FROM stories WHERE expires_at<=?").run(Date.now());
  for(const s of old){ if(s.file_url){ const p=path.join(storyDir,path.basename(s.file_url)); try{if(fs.existsSync(p))fs.unlinkSync(p)}catch{} } }
}

app.post("/api/register",authLimiter,(req,res)=>{
  const username=String(req.body.username||"").trim(), password=String(req.body.password||"");
  if(!/^[A-Za-z0-9_]{3,24}$/.test(username)) return res.status(400).json({error:"Username must be 3-24 letters, numbers, or underscores."});
  if(password.length<6||password.length>128) return res.status(400).json({error:"Password must be 6-128 characters."});
  try {
    const info=db.prepare("INSERT INTO users(username,password_hash,role,status,session_version,created_at) VALUES(?,?,?,?,?,?)").run(username,bcrypt.hashSync(password,12),"member","active",1,Date.now());
    const user=db.prepare("SELECT * FROM users WHERE id=?").get(info.lastInsertRowid); setAuthCookie(res,user); res.json({user:publicUser(user)});
  } catch { res.status(409).json({error:"Username is already taken."}); }
});
app.post("/api/login",authLimiter,(req,res)=>{
  const username=String(req.body.username||"").trim(), password=String(req.body.password||"");
  const user=db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if(!user || !bcrypt.compareSync(password,user.password_hash)) return res.status(401).json({error:"Invalid username or password."});
  if(user.status!=="active") return res.status(403).json({error:user.status==="banned"?"This account is banned.":"This account is temporarily unavailable."});
  setAuthCookie(res,user); res.json({user:publicUser(user)});
});
app.post("/api/logout",(req,res)=>{res.clearCookie("sdevs_token");res.json({ok:true})});
app.get("/api/me",auth,(req,res)=>res.json({user:publicUser(req.user)}));
app.patch("/api/me/username",auth,(req,res)=>{
  const username=String(req.body.username||"").trim();
  if(!/^[A-Za-z0-9_]{3,24}$/.test(username)) return res.status(400).json({error:"Invalid username."});
  try { db.prepare("UPDATE users SET username=? WHERE id=?").run(username,req.user.id); db.prepare("UPDATE messages SET username=? WHERE user_id=?").run(username,req.user.id); db.prepare("UPDATE stories SET username=? WHERE user_id=?").run(username,req.user.id); const user=db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id); setAuthCookie(res,user); res.json({user:publicUser(user)}); }
  catch { res.status(409).json({error:"Username is already taken."}); }
});

app.get("/api/messages",auth,(req,res)=>{
  const rows=db.prepare("SELECT * FROM messages ORDER BY id DESC LIMIT 150").all().reverse();
  res.json({messages:rows.map(m=>({...m,music:m.music_json?JSON.parse(m.music_json):null}))});
});
const storage=multer.diskStorage({destination:(_,__,cb)=>cb(null,uploadDir),filename:(_,file,cb)=>cb(null,Date.now()+"-"+crypto.randomBytes(8).toString("hex")+path.extname(file.originalname))});
const storyStorage=multer.diskStorage({destination:(_,__,cb)=>cb(null,storyDir),filename:(_,file,cb)=>cb(null,Date.now()+"-"+crypto.randomBytes(8).toString("hex")+path.extname(file.originalname))});
const upload=multer({storage,limits:{fileSize:MAX_UPLOAD_MB*1024*1024}});
const storyUpload=multer({storage:storyStorage,limits:{fileSize:25*1024*1024}});
app.post("/api/upload",auth,uploadLimiter,(req,res,next)=>upload.single("file")(req,res,err=>{if(err)return res.status(400).json({error:err.code==="LIMIT_FILE_SIZE"?`File exceeds ${MAX_UPLOAD_MB}MB.`:err.message});next();}),(req,res)=>{if(!req.file)return res.status(400).json({error:"No file uploaded."});res.json({url:"/uploads/"+req.file.filename,name:req.file.originalname,size:req.file.size,mime:req.file.mimetype});});
app.post("/api/messages",auth,(req,res)=>{
  const text=String(req.body.text||"").trim(); const file=req.body.file||{}; const type=String(req.body.messageType||"text");
  const gifUrl=String(req.body.gifUrl||""); const gifTitle=String(req.body.gifTitle||""); const music=req.body.music&&typeof req.body.music==="object"?req.body.music:null;
  if(!text&&!file.url&&!gifUrl&&!music) return res.status(400).json({error:"Empty message."});
  const safeType=["text","gif","music","file"].includes(type)?type:"text";
  const info=db.prepare(`INSERT INTO messages(user_id,username,text,file_url,file_name,file_size,mime_type,message_type,music_json,gif_url,gif_title,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(req.user.id,req.user.username,text,String(file.url||""),String(file.name||""),Number(file.size||0),String(file.mime||""),safeType,music?JSON.stringify(music):"",gifUrl,gifTitle,Date.now());
  const msg=db.prepare("SELECT * FROM messages WHERE id=?").get(info.lastInsertRowid); msg.music=music; io.emit("message:new",msg); res.json({message:msg});
});

// GIPHY search stays server-side so the API key never reaches the browser.
app.get("/api/giphy/search",auth,async(req,res)=>{
  if(!GIPHY_API_KEY) return res.status(503).json({error:"GIPHY_API_KEY is not configured on Railway."});
  const q=String(req.query.q||"").trim()||"trending"; const limit=Math.min(24,Math.max(1,Number(req.query.limit||18)));
  try {
    const endpoint=`https://api.giphy.com/v1/gifs/${q==="trending"?"trending":"search"}?api_key=${encodeURIComponent(GIPHY_API_KEY)}&limit=${limit}&rating=pg-13${q!=="trending"?`&q=${encodeURIComponent(q)}`:""}`;
    const r=await fetch(endpoint); const d=await r.json(); if(!r.ok) return res.status(r.status).json({error:d?.message||"GIPHY request failed."});
    res.json({gifs:(d.data||[]).map(g=>({id:g.id,title:g.title,url:g.images?.original?.url||g.images?.fixed_height?.url,preview:g.images?.fixed_height_small?.url||g.images?.original?.url}))});
  } catch { res.status(502).json({error:"Could not reach GIPHY."}); }
});

// Music is sourced from Apple's public iTunes Search API; users don't upload music files.
app.get("/api/music/search",auth,async(req,res)=>{
  const term=String(req.query.q||"").trim(); if(!term) return res.json({tracks:[]});
  try {
    const url=`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=20`;
    const r=await fetch(url); const d=await r.json(); if(!r.ok) return res.status(502).json({error:"Music search failed."});
    res.json({tracks:(d.results||[]).map(t=>({trackId:t.trackId,title:t.trackName,artist:t.artistName,album:t.collectionName,artwork:t.artworkUrl100?.replace("100x100","300x300"),previewUrl:t.previewUrl,storeUrl:t.trackViewUrl})).filter(t=>t.previewUrl)});
  } catch { res.status(502).json({error:"Could not reach the music service."}); }
});

// Stories expire after 24 hours. Images are optional; text-only stories work too.
app.get("/api/stories",auth,(req,res)=>{cleanExpiredStories();res.json({stories:db.prepare("SELECT * FROM stories ORDER BY id DESC").all()});});
app.post("/api/stories",auth,uploadLimiter,(req,res,next)=>storyUpload.single("file")(req,res,err=>{if(err)return res.status(400).json({error:err.code==="LIMIT_FILE_SIZE"?"Story image is limited to 25MB.":err.message});next();}),(req,res)=>{
  const text=String(req.body.text||"").trim(); if(!text&&!req.file)return res.status(400).json({error:"Add text or an image to your story."});
  const now=Date.now(), url=req.file?"/stories/"+req.file.filename:"";
  const info=db.prepare("INSERT INTO stories(user_id,username,text,file_url,file_name,mime_type,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)").run(req.user.id,req.user.username,text,url,req.file?.originalname||"",req.file?.mimetype||"",now,now+24*60*60*1000);
  const story=db.prepare("SELECT * FROM stories WHERE id=?").get(info.lastInsertRowid); io.emit("story:new",story); res.json({story});
});
app.delete("/api/stories/:id",auth,(req,res)=>{const s=db.prepare("SELECT * FROM stories WHERE id=?").get(Number(req.params.id));if(!s)return res.status(404).json({error:"Story not found."});if(s.user_id!==req.user.id&&req.user.role!=="owner")return res.status(403).json({error:"Not allowed."});db.prepare("DELETE FROM stories WHERE id=?").run(s.id);if(s.file_url){const p=path.join(storyDir,path.basename(s.file_url));try{if(fs.existsSync(p))fs.unlinkSync(p)}catch{}}io.emit("story:deleted",s.id);res.json({ok:true})});

// Owner dashboard APIs.
app.get("/api/admin/overview",auth,ownerOnly,(req,res)=>{
  cleanExpiredStories();
  const users=db.prepare("SELECT id,username,role,status,created_at FROM users ORDER BY id DESC").all();
  const messages=db.prepare("SELECT COUNT(*) count FROM messages").get().count;
  const announcements=db.prepare("SELECT * FROM announcements ORDER BY id DESC LIMIT 10").all();
  const stories=db.prepare("SELECT COUNT(*) count FROM stories").get().count;
  res.json({stats:{users:users.length,members:users.filter(u=>u.role!=="owner"&&u.status==="active").length,messages,storageFiles:fs.existsSync(uploadDir)?fs.readdirSync(uploadDir).length:0,stories},users,announcements,settings:{clan_name:setting("clan_name"),clan_tagline:setting("clan_tagline"),announcement:setting("announcement")}});
});
app.post("/api/admin/users/:id/kick",auth,ownerOnly,(req,res)=>{const id=Number(req.params.id),u=db.prepare("SELECT * FROM users WHERE id=?").get(id);if(!u||u.role==="owner")return res.status(400).json({error:"Cannot kick the owner."});db.prepare("UPDATE users SET session_version=session_version+1 WHERE id=?").run(id);res.json({ok:true})});
app.post("/api/admin/users/:id/ban",auth,ownerOnly,(req,res)=>{const id=Number(req.params.id),u=db.prepare("SELECT * FROM users WHERE id=?").get(id);if(!u||u.role==="owner")return res.status(400).json({error:"Cannot ban the owner."});db.prepare("UPDATE users SET status='banned',session_version=session_version+1 WHERE id=?").run(id);res.json({ok:true})});
app.post("/api/admin/users/:id/unban",auth,ownerOnly,(req,res)=>{const id=Number(req.params.id),u=db.prepare("SELECT * FROM users WHERE id=?").get(id);if(!u)return res.status(404).json({error:"User not found."});db.prepare("UPDATE users SET status='active',session_version=session_version+1 WHERE id=?").run(id);res.json({ok:true})});
app.delete("/api/admin/messages/:id",auth,ownerOnly,(req,res)=>{const id=Number(req.params.id),m=db.prepare("SELECT file_url FROM messages WHERE id=?").get(id);if(!m)return res.status(404).json({error:"Message not found."});db.prepare("DELETE FROM messages WHERE id=?").run(id);if(m.file_url){const p=path.join(uploadDir,path.basename(m.file_url));try{if(fs.existsSync(p))fs.unlinkSync(p)}catch{}}io.emit("message:deleted",id);res.json({ok:true})});
app.post("/api/admin/announcements",auth,ownerOnly,(req,res)=>{const text=String(req.body.text||"").trim();if(!text||text.length>500)return res.status(400).json({error:"Announcement must be 1-500 characters."});const info=db.prepare("INSERT INTO announcements(text,author,created_at) VALUES(?,?,?)").run(text,req.user.username,Date.now());const a=db.prepare("SELECT * FROM announcements WHERE id=?").get(info.lastInsertRowid);io.emit("announcement:new",a);res.json({announcement:a})});
app.delete("/api/admin/announcements/:id",auth,ownerOnly,(req,res)=>{db.prepare("DELETE FROM announcements WHERE id=?").run(Number(req.params.id));res.json({ok:true})});
app.patch("/api/admin/settings",auth,ownerOnly,(req,res)=>{for(const key of ["clan_name","clan_tagline","announcement"]){if(req.body[key]!==undefined){const value=String(req.body[key]).trim().slice(0,key==="announcement"?500:100);db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key,value)}}const s={clan_name:setting("clan_name"),clan_tagline:setting("clan_tagline"),announcement:setting("announcement")};io.emit("settings:updated",s);res.json({settings:s})});

io.use((socket,next)=>{try{const token=socket.handshake.auth?.token||socket.handshake.headers.cookie?.match(/sdevs_token=([^;]+)/)?.[1];if(!token)return next(new Error("Unauthorized"));const p=jwt.verify(token,JWT_SECRET),u=db.prepare("SELECT id,username,role,status,session_version FROM users WHERE id=?").get(p.id);if(!u||u.status!=="active"||u.session_version!==p.sv)return next(new Error("Unauthorized"));socket.user=u;next()}catch{next(new Error("Unauthorized"))}});
io.on("connection",socket=>socket.emit("ready",{user:socket.user}));

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
server.listen(PORT,()=>console.log(`SDEVS MESSENGER running on http://localhost:${PORT}`));
