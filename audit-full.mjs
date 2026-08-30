import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT='/tmp/audit'; fs.mkdirSync(OUT,{recursive:true});
function lum(rgb){const[r,g,b]=rgb.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*r+0.7152*g+0.0722*b;}
function parse(c){const m=String(c).match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(s=>parseFloat(s.trim()));return{rgb:p.slice(0,3),a:p[3]===undefined?1:p[3]};}
function ratio(f_,b_){const f=parse(f_),b=parse(b_);if(!f||!b)return null;const fr=f.rgb.map((v,i)=>v*f.a+b.rgb[i]*(1-f.a));const l1=lum(fr),l2=lum(b.rgb);const[hi,lo]=l1>l2?[l1,l2]:[l2,l1];return +(((hi+0.05)/(lo+0.05)).toFixed(2));}
const PROBE=()=>{
  function effBg(el){let n=el;while(n){const bg=getComputedStyle(n).backgroundColor;const m=bg.match(/rgba?\(([^)]+)\)/);if(m){const p=m[1].split(',').map(s=>parseFloat(s.trim()));if((p[3]===undefined?1:p[3])>0.99)return bg;}n=n.parentElement;}return getComputedStyle(document.body).backgroundColor;}
  const de=document.documentElement,checks=[],seen=new Set();
  for(const el of document.querySelectorAll('p,span,div,h1,h2,h3,dt,dd,li,a,button,label,time,pre')){
    const txt=(el.textContent||'').trim(); if(!txt||txt.length<2)continue;
    if(el.children.length>0&&![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
    const cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)<0.6)continue;
    const r=el.getBoundingClientRect(); if(r.width<2||r.height<2)continue;
    const k=cs.color+'|'+cs.fontSize+'|'+cs.fontWeight+'|'+effBg(el); if(seen.has(k))continue; seen.add(k);
    checks.push({color:cs.color,bg:effBg(el),size:cs.fontSize,weight:cs.fontWeight,cls:(el.className?.toString?.()||'').slice(0,44),sample:txt.slice(0,24)});
  }
  const over=[]; const tiny=[];
  for(const el of document.querySelectorAll('*')){const r=el.getBoundingClientRect();
    if(r.width>0&&r.right>de.clientWidth+2)over.push({tag:el.tagName.toLowerCase(),cls:(el.className?.toString?.()||'').slice(0,46),right:Math.round(r.right)});}
  for(const el of document.querySelectorAll('a,button,[role=button],input,select,textarea')){
    const r=el.getBoundingClientRect(); const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||r.width<1)continue;
    if(r.height>0&&r.height<40)tiny.push({tag:el.tagName.toLowerCase(),cls:(el.className?.toString?.()||'').slice(0,40),h:Math.round(r.height),txt:(el.textContent||'').trim().slice(0,18)});}
  return {scrollW:de.scrollWidth,clientW:de.clientWidth,checks,over:over.slice(0,5),tiny:tiny.slice(0,8),h1:document.querySelectorAll('h1').length};
};
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:1440,height:900}});
const page=await ctx.newPage();
const errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,150));});
page.on('pageerror',e=>errors.push('PAGEERROR '+String(e).slice(0,150)));
const user='ui'+Date.now().toString(36);
await page.goto('http://127.0.0.1:8080/login',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1200);
await page.click('text=/Need an account|नया अकाउंट/');
await page.fill('#username',user); await page.fill('#password','auditpass1234');
await page.click('button[type=submit]');
await page.waitForURL(u=>!u.pathname.includes('/login'),{timeout:25000}).catch(()=>{});
await page.goto('http://127.0.0.1:8080/',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2000);
const seed=page.locator('button',{hasText:/Load a sample chamber|Load sample|नमूना चैंबर/}).first();
if(await seed.count()){await seed.click();await page.waitForTimeout(4000);}
// discover a matter id
await page.goto('http://127.0.0.1:8080/matters',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2500);
const matterHref=await page.evaluate(()=>{const a=document.querySelector('a[href*="/matters/"]');return a?a.getAttribute('href'):null;});
console.log('matter detail ->',matterHref);
const routes=[['today','/'],['diary','/diary'],['matters','/matters'],['matter-detail',matterHref||'/matters'],['research','/research'],['inbox','/inbox'],['billing','/billing'],['story','/story']];
const rows=[];
for(const langMode of ['en','hi']){
  for(const [name,path] of routes){
    for(const [vp,w,h] of [['desktop',1440,900],['mobile',390,844]]){
      await page.setViewportSize({width:w,height:h});
      const url='http://127.0.0.1:8080'+path+(name==='story'&&langMode==='hi'?'?lang=hi':'');
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(1800);
      if(name!=='story'){ // set chamber language via shell toggle
        const btn=page.locator('.seg-btn',{hasText:langMode==='hi'?'हि':'EN'}).first();
        if(await btn.count()){await btn.click().catch(()=>{});await page.waitForTimeout(700);}
      }
      const r=await page.evaluate(PROBE);
      const fails=r.checks.map(c=>({...c,ratio:ratio(c.color,c.bg)})).filter(c=>{const px=parseFloat(c.size);const large=px>=24||(px>=18.66&&+c.weight>=700);return c.ratio!==null&&c.ratio<(large?3:4.5);});
      rows.push({langMode,name,vp,overflow:r.scrollW-r.clientW,over:r.over,h1:r.h1,fails,tiny:r.tiny});
      await page.screenshot({path:`${OUT}/${langMode}-${name}-${vp}.png`,fullPage:vp==='desktop'});
    }
  }
}
console.log('\n=== RESULTS (overflow / h1 / contrast / small targets) ===');
let bad=0;
for(const r of rows){
  const issues=[];
  if(r.overflow>0){issues.push(`OVERFLOW ${r.overflow}px`);bad++;}
  if(r.h1!==1)issues.push(`h1=${r.h1}`);
  if(r.fails.length){issues.push(`contrast x${r.fails.length}`);bad++;}
  if(r.tiny.length)issues.push(`targets<40px x${r.tiny.length}`);
  console.log(`${(issues.length?'ISSUE ':'ok    ')} ${r.langMode} ${r.name.padEnd(13)} ${r.vp.padEnd(8)} ${issues.join(' | ')||''}`);
  for(const o of r.over)console.log(`        ↳ over: ${o.tag}.${o.cls} right=${o.right}`);
  for(const f of r.fails)console.log(`        ↳ contrast ${f.ratio} ${f.size} w${f.weight} "${f.cls}" ${f.color} on ${f.bg} | ${f.sample}`);
  for(const t of r.tiny.slice(0,3))console.log(`        ↳ target ${t.h}px ${t.tag}.${t.cls} "${t.txt}"`);
}
console.log('\nblocking issues:',bad);
console.log('console errors:',[...new Set(errors)].slice(0,6).join(' || ')||'none');
await browser.close();
