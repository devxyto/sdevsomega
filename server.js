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

const dataDir = path.join(__dirname, "data");
const uploadDir = path.join(dataDir, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const db = new Database(path.join(dataDir, "sdevs.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
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
  created_at INTEGER NOT NULL
);
`);

const ownerUsername = process.env.OWNER_USERNAME || "OWNER";
const ownerPassword = process.env.OWNER_PASSWORD || "kenjibns";
if (!db.prepare("SELECT id FROM users WHERE username = ?").get(ownerUsername)) {
  db.prepare("INSERT INTO users(username,password_hash,role,created_at) VALUES(?,?,?,?)")
    .run(ownerUsername, bcrypt.hashSync(ownerPassword, 12), "owner", Date.now());
}

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadDir));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true });
const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true });

function sign(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}
function auth(req, res, next) {
  try {
    const token = req.cookies.sdevs_token || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: "Invalid or expired session" }); }
}
function publicUser(u) { return { id: u.id, username: u.username, role: u.role }; }

app.post("/api/register", authLimiter, (req,res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) return res.status(400).json({error:"Username must be 3-24 letters, numbers, or underscores."});
  if (password.length < 6 || password.length > 128) return res.status(400).json({error:"Password must be 6-128 characters."});
  try {
    const hash = bcrypt.hashSync(password, 12);
    const info = db.prepare("INSERT INTO users(username,password_hash,role,created_at) VALUES(?,?,?,?)").run(username, hash, "member", Date.now());
    const user = db.prepare("SELECT * FROM users WHERE id=?").get(info.lastInsertRowid);
    res.cookie("sdevs_token", sign(user), {httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production", maxAge:7*86400000});
    res.json({user: publicUser(user)});
  } catch { res.status(409).json({error:"Username is already taken."}); }
});

app.post("/api/login", authLimiter, (req,res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({error:"Invalid username or password."});
  res.cookie("sdevs_token", sign(user), {httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production", maxAge:7*86400000});
  res.json({user: publicUser(user)});
});
app.post("/api/logout", (req,res)=>{ res.clearCookie("sdevs_token"); res.json({ok:true}); });
app.get("/api/me", auth, (req,res)=>{
  const user=db.prepare("SELECT id,username,role FROM users WHERE id=?").get(req.user.id);
  res.json({user});
});
app.patch("/api/me/username", auth, (req,res)=>{
  const username=String(req.body.username||"").trim();
  if(!/^[A-Za-z0-9_]{3,24}$/.test(username)) return res.status(400).json({error:"Invalid username."});
  try {
    db.prepare("UPDATE users SET username=? WHERE id=?").run(username, req.user.id);
    const user=db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
    db.prepare("UPDATE messages SET username=? WHERE user_id=?").run(username, req.user.id);
    res.cookie("sdevs_token", sign(user), {httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:7*86400000});
    res.json({user:publicUser(user)});
  } catch { res.status(409).json({error:"Username is already taken."}); }
});

app.get("/api/messages", auth, (req,res)=>{
  const rows=db.prepare("SELECT * FROM messages ORDER BY id DESC LIMIT 100").all().reverse();
  res.json({messages:rows});
});

const storage=multer.diskStorage({
  destination: (_,__,cb)=>cb(null,uploadDir),
  filename: (_,file,cb)=>cb(null,Date.now()+"-"+crypto.randomBytes(8).toString("hex")+path.extname(file.originalname))
});
const upload=multer({
  storage,
  limits:{fileSize:MAX_UPLOAD_MB*1024*1024}
});

app.post("/api/upload", auth, uploadLimiter, upload.single("file"), (req,res)=>{
  if(!req.file) return res.status(400).json({error:"No file uploaded."});
  const url="/uploads/"+req.file.filename;
  res.json({url,name:req.file.originalname,size:req.file.size,mime:req.file.mimetype});
});
app.post("/api/messages", auth, (req,res)=>{
  const text=String(req.body.text||"").trim();
  const file=req.body.file || {};
  if(!text && !file.url) return res.status(400).json({error:"Empty message."});
  const user=db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  const info=db.prepare(`INSERT INTO messages(user_id,username,text,file_url,file_name,file_size,mime_type,created_at)
    VALUES(?,?,?,?,?,?,?,?)`).run(user.id,user.username,text,String(file.url||""),String(file.name||""),Number(file.size||0),String(file.mime||""),Date.now());
  const msg=db.prepare("SELECT * FROM messages WHERE id=?").get(info.lastInsertRowid);
  io.emit("message:new",msg);
  res.json({message:msg});
});

io.use((socket,next)=>{
  try {
    const token=socket.handshake.auth?.token || socket.handshake.headers.cookie?.match(/sdevs_token=([^;]+)/)?.[1];
    socket.user=jwt.verify(token,JWT_SECRET); next();
  } catch { next(new Error("Unauthorized")); }
});
io.on("connection", socket=>{ socket.emit("ready",{user:socket.user}); });

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
server.listen(PORT,()=>console.log(`SDEVS MESSENGER running on http://localhost:${PORT}`));
