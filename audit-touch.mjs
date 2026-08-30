import { chromium } from 'playwright';
const b = await chromium.launch();
// emulate a touch device so pointer:coarse applies
const ctx = await b.newContext({ viewport:{width:390,height:844}, hasTouch:true, isMobile:true });
const p = await ctx.newPage();
const errs=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,140));});
p.on('pageerror',e=>errs.push('PAGEERROR '+String(e).slice(0,140)));
const user='t'+Date.now().toString(36);
await p.goto('http://127.0.0.1:8080/login',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(1200);
await p.click('text=/Need an account|नया अकाउंट/');
await p.fill('#username',user); await p.fill('#password','auditpass1234');
await p.click('button[type=submit]');
await p.waitForURL(u=>!u.pathname.includes('/login'),{timeout:25000}).catch(()=>{});
for (const [name,path] of [['today','/'],['diary','/diary'],['research','/research'],['story','/story']]) {
  await p.goto('http://127.0.0.1:8080'+path,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2000);
  const r = await p.evaluate(()=>{
    const small=[];
    for(const el of document.querySelectorAll('a,button,[role=button],input,select,textarea')){
      const rect=el.getBoundingClientRect(); const cs=getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden'||rect.width<1)continue;
      if(rect.height>0&&rect.height<44&&!el.classList.contains('sr-only'))small.push({tag:el.tagName.toLowerCase(),cls:(el.className?.toString?.()||'').slice(0,34),h:+rect.height.toFixed(0),txt:(el.textContent||'').trim().slice(0,16)});
    }
    const de=document.documentElement;
    return {small, overflow: de.scrollWidth-de.clientWidth, coarse: matchMedia('(pointer: coarse)').matches};
  });
  console.log(`${name.padEnd(9)} coarse=${r.coarse} overflow=${r.overflow}px  under44=${r.small.length}`);
  for(const s of r.small.slice(0,6)) console.log(`   ${s.h}px ${s.tag}.${s.cls} "${s.txt}"`);
}
console.log('\nconsole errors:', [...new Set(errs)].join(' || ')||'none');
await b.close();
