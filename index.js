const express=require('express');
const fs=require('fs');
const app=express();
const PORT=process.env.PORT||3000;
let qr=null,status="Se incarca...",sock=null;

async function start(){
 if(!fs.existsSync('./auth')) fs.mkdirSync('./auth',{recursive:true});

 const {default:makeWASocket,useMultiFileAuthState,DisconnectReason}=require('@whiskeysockets/baileys');
 const pino=require('pino');
 const {state,saveCreds}=await useMultiFileAuthState('./auth');

 sock=makeWASocket({
   auth:state,
   logger:pino({level:'silent'}),
   browser:["MORTEX","Chrome","1.0.0"]
 });

 sock.ev.on('creds.update',saveCreds);
 sock.ev.on('connection.update',u=>{
  if(u.qr){qr=u.qr;status="Scaneaza QR";}
  if(u.connection==='open'){status="✅ ONLINE";qr=null;console.log("CONECTAT");}
  if(u.connection==='close'){
   const c=u.lastDisconnect?.error?.output?.statusCode;
   if(c!==DisconnectReason.loggedOut) setTimeout(start,3000);
  }
 });

 sock.ev.on('messages.upsert',async({messages})=>{
  const m=messages[0];if(!m.message)return;
  const jid=m.key.remoteJid;
  const raw=(m.message.conversation||m.message.extendedTextMessage?.text||"").trim();
  if(!raw.startsWith('.'))return;
  const cmd=raw.slice(1).split(" ")[0].toLowerCase();
  const q=raw.slice(1).split(" ").slice(1).join(" ");
  const reply=async t=>{await sock.sendMessage(jid,{text:t},{quoted:m});};

  if(cmd==="meniu") return reply("🤖 MENIU\n.meniu\n.ping\n.compat @1 @2\n.tagall\n.play");
  if(cmd==="ping") return reply("⚡ MORTEX ONLINE - doar QR, fara SESSION_ID!");

  if(cmd==="compat"||cmd==="compatibilitate"){
   const mentions=m.message.extendedTextMessage?.contextInfo?.mentionedJid||[];
   if(mentions.length<2) return reply(".compat @Andrei @Maria");
   const proc=Math.floor(Math.random()*101);
   await sock.sendMessage(jid,{text:`💘 @${mentions[0].split('@')[0]} + @${mentions[1].split('@')[0]} = ${proc}% ${proc>70?'❤️ Se iubesc!':'💔 Nu prea'}`,mentions},{quoted:m});
  }
 });
}

app.get('/',async(req,res)=>{
 let img="";if(qr){const QRCode=require('qrcode');img=await QRCode.toDataURL(qr);}
 res.send(`<body style="background:#000;color:#fff;text-align:center"><h2>👑 MORTEX - FARA SESSION_ID</h2><h3>${status}</h3>${img?`<img src="${img}" width="300">`:`<p>${status}</p>`}</body>`);
});

app.listen(PORT,()=>{start();});
