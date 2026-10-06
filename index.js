const express=require('express'),fs=require('fs'),os=require('os'),path=require('path');const app=express();const PORT=process.env.PORT||3000;
let qrData=null,status="Se incarca...",sock=null;
let users={}; // XP + ECONOMIE
function random(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function getUser(id){if(!users[id])users[id]={xp:0,nivel:1,bani:1000};return users[id];}
function addXP(id, amt){const u=getUser(id);u.xp+=amt;if(u.xp>=u.nivel*100){u.nivel++;u.xp=0;return true;}return false;}

async function startBot(){
 if(!fs.existsSync('./auth'))fs.mkdirSync('./auth',{recursive:true});
 if(process.env.SESSION_ID){
   try{const sess=process.env.SESSION_ID.startsWith('{')?process.env.SESSION_ID:Buffer.from(process.env.SESSION_ID,'base64').toString();fs.writeFileSync('./auth/creds.json',sess);}catch(e){}
 }
 const {default:makeWASocket,useMultiFileAuthState,DisconnectReason}=require('@whiskeysockets/baileys');const pino=require('pino');const {state,saveCreds}=await useMultiFileAuthState('./auth');
 sock=makeWASocket({auth:state,logger:pino({level:'silent'}),browser:["MORTEX","Chrome","1.0.0"]});
 sock.ev.on('creds.update',saveCreds);
 sock.ev.on('connection.update',u=>{if(u.qr){qrData=u.qr;status="Scaneaza QR/COD";}if(u.connection==='close'){const c=u.lastDisconnect?.error?.output?.statusCode;if(c!==DisconnectReason.loggedOut)setTimeout(startBot,3000);}if(u.connection==='open'){status="✅ MORTEX ONLINE";qrData=null;}});

 sock.ev.on('messages.upsert',async({messages})=>{
  const msg=messages[0];if(!msg.message)return;const jid=msg.key.remoteJid;const userId=msg.key.participant||jid;
  const raw=(msg.message.conversation||msg.message.extendedTextMessage?.text||"").trim();if(!raw.startsWith('.'))return;
  const command=raw.slice(1).split(" ")[0].toLowerCase();const args=raw.slice(1).split(" ").slice(1);const q=args.join(" ").trim();
  const message={reply:async(t)=>{await sock.sendMessage(jid,{text:t},{quoted:msg});}};

  // XP pentru utilizare
  const levelUp=addXP(userId, random(1,5));
  if(levelUp){await message.reply("🎉 Felicitări! Ai urcat un nivel! Acum ești nivel "+getUser(userId).nivel);}

  // MENIU
  if(command==="meniu"){
   return message.reply(`
╭━━━━━━━━━━━━━━━━━━╮
       🤖 BOT MENU
╰━━━━━━━━━━━━━━━━━━╯

🧭 GENERAL
.meniu
.ping
.botinfo
.uptime
.owner

😂 FUN
.noroc
.zar
.coinflip
.8ball
.gluma
.citat
.dragoste
.compatibilitate
.horoscop
.slap
.hug
.kiss
.fact
.intrebare
.adevar
.provocare
.roast
.compliment
.cine
.alege

🎮 JOCURI
.rps
.quiz
.matematica
.ghiceste
.ghiceste-numarul
.slot
.zaruri
.anagrama
.ghicitoare
.duel

💰 ECONOMIE / RPG
.balanta
.munca
.zilnic
.magazin
.cumpara
.inventar
.top
.nivel
.profil
.transfer
.quest
.jefuieste

👥 GRUP
.tagall
.info-grup
.link-grup
.welcome
.warn
.warnings

🔧 UTIL
.calc
.reverse
.invers
.numara
.statistici
.time
.data

🎵 MEDIA
.play
.waifu
.neko
.sticker

👑 MORTEX_BOT Craiova - JSON READY
`);
  }

  if(command==="ping")return message.reply("⚡ Pong! MORTEX ONLINE 24/7 - "+Date.now()%1000+"ms");
  if(command==="botinfo")return message.reply("👑 MORTEX_BOT\n200+ comenzi\nJSON Session\nCraiova");
  if(command==="noroc")return message.reply(`🍀 Norocul tau: ${random(1,100)}%`);
  if(command==="zar")return message.reply(`🎲 Zar: ${random(1,6)}`);
  if(command==="coinflip")return message.reply(random(0,1)?"🪙 Cap":"🪙 Pajura");
  if(command==="8ball"){const r=["Da 100%","Nu","Poate","Sigur!","Intreaba mai tarziu"];return message.reply("🎱 "+r[random(0,r.length-1)]);}
  if(command==="balanta"){const u=getUser(userId);return message.reply(`💰 Balanta: ${u.bani} lei | ⭐ Nivel ${u.nivel} | XP ${u.xp}/${u.nivel*100}`);}
  if(command==="munca"){const u=getUser(userId);u.bani+=250;return message.reply(`💼 Ai muncit +250 lei! Total: ${u.bani}`);}
  if(command==="zilnic"){const u=getUser(userId);u.bani+=500;return message.reply(`🎁 Bonus zilnic +500! Total: ${u.bani}`);}
  if(command==="nivel"||command==="profil"){const u=getUser(userId);return message.reply(`👤 Profil\nNivel: ${u.nivel}\nXP: ${u.xp}\nBani: ${u.bani} lei`);}
  if(command==="calc"){try{return message.reply(`🧮 ${q} = ${eval(q)}`);}catch(e){return message.reply("Eroare calc");}}
  if(command==="reverse"||command==="invers")return message.reply(q.split("").reverse().join(""));
  if(command==="tagall"&&jid.endsWith('@g.us')){const meta=await sock.groupMetadata(jid);const mentions=meta.participants.map(p=>p.id);await sock.sendMessage(jid,{text:`📢 TAGALL\n${mentions.map(v=>'@'+v.split('@')[0]).join(' ')}`,mentions},{quoted:msg});}
  if(command==="getsession"){try{const creds=fs.readFileSync('./auth/creds.json','utf8');return message.reply(`🔑 *SESSION_ID COPIE IN RENDER:*\n\n${Buffer.from(creds).toString('base64')}`);}catch(e){return message.reply("Scaneaza QR mai intai!");}}

  // 💘 COMPATIBILITATE CU TAG - NOU
  if(command==="compatibilitate"||command==="compat"||command==="love"){
    const mentions = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let p1,p2;
    if(mentions.length>=2){p1=mentions[0];p2=mentions[1];}
    else if(mentions.length===1){p1=userId;p2=mentions[0];}
    else {
      if(jid.endsWith('@g.us')){
        const meta=await sock.groupMetadata(jid);const members=meta.participants.map(p=>p.id);
        p1=members[random(0,members.length-1)];p2=members[random(0,members.length-1)];if(p1===p2)p2=members[random(0,members.length-1)];
      }else{return message.reply("❤️ Folosire:.compatibilitate @persoana1 @persoana2\nEx:.compat @Ion @Maria");}
    }
    const procent=random(0,100);
    let textLove="";if(procent<20)textLove="💔 Deloc compatibili, mai bine prieteni!";else if(procent<40)textLove="😅 Ceva chimie, dar nu prea mult...";else if(procent<60)textLove="😊 Compatibili, merită încercat!";else if(procent<80)textLove="😍 Foarte compatibili! Se iubesc mult!";else if(procent<95)textLove="🥰 PERFECTI impreuna! Se iubesc la nebunie!";else textLove="💖 SUFLETE PERECHE! 100% iubire veșnică! 💍";
    const loveMsg=`╭━━━━━━━━━━━━━━╮\n 💘 COMPATIBILITATE\n╰━━━━━━━━━━━━━━╯\n\n👤 @${p1.split('@')[0]}\n💞 @${p2.split('@')[0]}\n\n💖 Compatibilitate: *${procent}%*\n${textLove}\n\n${procent>70?"❤️ Se iubesc enorm!":procent>40?"💛 Se iubesc un pic!":"💔 Nu prea se iubesc..."}\n\n👑 MORTEX_BOT`;
    await sock.sendMessage(jid,{text:loveMsg,mentions:[p1,p2]},{quoted:msg});
    return;
  }

  if(command==="play"){
   if(!q)return message.reply("🎵 Scrie:.play tanca");
   await message.reply(`🎵 Caut *${q}*...`);
   try{
    const yts=require('yt-search');const s=await yts(q);const v=s.videos[0];
    await sock.sendMessage(jid,{image:{url:v.thumbnail},caption:`🎵 ${v.title}\n⬇️ Descarc audio...`},{quoted:msg});
    const ytdl=require('@distube/ytdl-core');const fp=path.join(os.tmpdir(),`${Date.now()}.mp3`);const st=ytdl(v.url,{filter:'audioonly',quality:'highestaudio'});const ws=fs.createWriteStream(fp);st.pipe(ws);
    await new Promise((res,rej)=>{ws.on('finish',res);ws.on('error',rej);st.on('error',rej);setTimeout(()=>rej(new Error("timeout")),25000);});
    await sock.sendMessage(jid,{audio:{url:fp},mimetype:'audio/mpeg',fileName:`${v.title}.mp3`},{quoted:msg});if(fs.existsSync(fp))fs.unlinkSync(fp);
   }catch(e){await message.reply("Eroare play, incearca alt nume");}
  }
 });
}
app.get('/',async(req,res)=>{let qrImg="";if(qrData){const QRCode=require('qrcode');qrImg=await QRCode.toDataURL(qrData);}res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#000;color:#fff;text-align:center;font-family:Arial;padding:15px}.box{background:#111;border-radius:20px;padding:20px;max-width:400px;margin:auto}input{padding:14px;width:85%;border-radius:12px;border:none;margin:10px 0}button{padding:14px;width:90%;border-radius:12px;border:none;background:#25D366;color:#fff;font-weight:bold}</style></head><body><div class="box"><h2>👑 MORTEX JSON</h2><h3 style="color:#25D366">${status}</h3>${qrImg?`<img src="${qrImg}" width="280">`:`<p>${status}</p>`}<hr><input id="n" placeholder="407xxxxxxxx"><br><button onclick="gen()">COD 8 CIFRE</button><div id="c"></div></div><script>async function gen(){const n=document.getElementById('n').value;const r=await fetch('/code?number='+n);document.getElementById('c').innerHTML=await r.text();}setTimeout(()=>location.reload(),30000)</script></body></html>`);});
app.get('/code',async(req,res)=>{const num=req.query.number?.replace(/[^0-9]/g,'');try{const code=await sock.requestPairingCode(num);res.send(`<div style="background:#fff;color:#000;padding:12px;border-radius:12px"><h1 style="letter-spacing:5px">${code}</h1></div>`);}catch(e){res.send(e.message);}});
app.listen(PORT,()=>{console.log('MORTEX');startBot();});
