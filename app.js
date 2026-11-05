'use strict';
window.APP={
  id:'pf',name:'PromptForge',
  logo:'<span class="mk"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M5 7l3 3M16 14l3 3M3 12h4M17 12h4"/><circle cx="12" cy="12" r="3"/></svg></span>',
  nav:[['index.html','home','Home'],['prompts.html','layers','Prompts'],['eval.html','play','Evals'],['diff.html','diff','Diff'],['playground.html','flask','Playground'],['settings.html','settings','Settings']],
  accents:[['#ff4fa3','#c77dff','#ffb86b'],['#c77dff','#ff4fa3','#7aa2ff'],['#ffb86b','#ff4fa3','#c77dff'],['#5ef2b0','#c77dff','#ff4fa3']],
  cta:['eval.html','play','Run an eval'],
  icons:{
    layers:'M12 2l9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5',
    play:'M6 4l14 8-14 8z',
    diff:'M6 3v12M6 15a3 3 0 100 6 3 3 0 000-6zM6 3a3 3 0 100 6 3 3 0 000-6M18 9v6M18 21a3 3 0 100-6 3 3 0 000 6zM18 9a3 3 0 100-6M9 6h6a3 3 0 013 3',
    flask:'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M7 15h10',
    spark:'M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z'
  },
  ensureSeed(){}
};
/* ---------------- seeded rng + hash ---------------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
/* ---------------- scorers (real) ---------------- */
const SCORERS={
  exact_match:{label:'exact match',fn:(o,e)=>o.trim().toLowerCase()===String(e).trim().toLowerCase()},
  contains:{label:'contains',fn:(o,e)=>o.toLowerCase().includes(String(e).toLowerCase())},
  regex:{label:'regex',fn:(o,e,ctx)=>new RegExp(ctx.pattern,'i').test(o)},
  json_valid:{label:'valid JSON',fn:(o)=>{try{JSON.parse(o);return true;}catch(e){return false;}}},
  fields_present:{label:'fields present',fn:(o,e)=>{let p;try{p=JSON.parse(o);}catch(err){return false;}return (e||[]).every(k=>k in p);}},
  keyword_recall:{label:'keyword recall',fn:(o,e)=>{const low=o.toLowerCase();const hit=(e||[]).filter(k=>low.includes(k.toLowerCase())).length;return hit/Math.max(1,(e||[]).length)>=0.6;},scoreFn:(o,e)=>{const low=o.toLowerCase();const hit=(e||[]).filter(k=>low.includes(k.toLowerCase())).length;return hit/Math.max(1,(e||[]).length);}},
  latency:{label:'latency < 1500ms',fn:(o,e,ctx)=>ctx.latency<1500}
};
/* ---------------- datasets ---------------- */
const DATASETS=[
 {id:'intent',name:'Support intent classification',scorers:['exact_match','latency'],
  cases:[
   {id:'i1',input:'I was charged twice for my subscription this month',expected:'billing',diff:.2,wrong:['refund','account']},
   {id:'i2',input:'How do I reset my password?',expected:'account',diff:.15,wrong:['billing','technical']},
   {id:'i3',input:'The app crashes every time I open the reports tab',expected:'technical',diff:.3,wrong:['account','feedback']},
   {id:'i4',input:'Can you add a dark mode please?',expected:'feedback',diff:.5,wrong:['technical','account']},
   {id:'i5',input:'I want to cancel and get my money back',expected:'billing',diff:.55,wrong:['account','feedback']},
   {id:'i6',input:'My invoice shows the wrong company name',expected:'billing',diff:.45,wrong:['account','technical']},
   {id:'i7',input:'Login page returns a 500 error',expected:'technical',diff:.25,wrong:['account','billing']},
   {id:'i8',input:'Where can I download my data?',expected:'account',diff:.4,wrong:['technical','feedback']}
  ]},
 {id:'json',name:'Invoice field extraction',scorers:['json_valid','fields_present'],fields:['vendor','total','date'],
  cases:[
   {id:'j1',input:'Acme Corp billed $4,200.00 on 2026-03-14',expected:JSON.stringify({vendor:'Acme Corp',total:4200,date:'2026-03-14'}),diff:.3,wrong:['vendor: Acme, total 4200','{vendor:"Acme Corp"}']},
   {id:'j2',input:'Invoice from Globex, dated 2026-01-02, amount 980.50 USD',expected:JSON.stringify({vendor:'Globex',total:980.5,date:'2026-01-02'}),diff:.4,wrong:['Globex 980.50','not valid']},
   {id:'j3',input:'Initech charged 12,340 on Feb 9 2026',expected:JSON.stringify({vendor:'Initech',total:12340,date:'2026-02-09'}),diff:.6,wrong:['{"vendor":"Initech"}','Initech, 12340']},
   {id:'j4',input:'Umbrella Co · $75 · 2026-05-21',expected:JSON.stringify({vendor:'Umbrella Co',total:75,date:'2026-05-21'}),diff:.35,wrong:['75 dollars','{vendor:Umbrella}']},
   {id:'j5',input:'Soylent Inc, total 5600.00, issued 2026-04-30',expected:JSON.stringify({vendor:'Soylent Inc',total:5600,date:'2026-04-30'}),diff:.5,wrong:['Soylent 5600','invalid']},
   {id:'j6',input:'Stark Industries $99,999 2026-07-07',expected:JSON.stringify({vendor:'Stark Industries',total:99999,date:'2026-07-07'}),diff:.45,wrong:['{"vendor":"Stark"}','no']}
  ]},
 {id:'sql',name:'Natural-language to SQL',scorers:['contains','regex'],pattern:'select\\s+.*\\s+from',
  cases:[
   {id:'s1',input:'count all users who signed up this year',expected:'count',diff:.3,wrong:['SHOW TABLES','users list']},
   {id:'s2',input:'total revenue by month',expected:'sum',diff:.45,wrong:['GET revenue','monthly']},
   {id:'s3',input:'top 10 products by sales',expected:'limit',diff:.4,wrong:['ORDER products','top ten']},
   {id:'s4',input:'customers in California',expected:'where',diff:.35,wrong:['filter CA','SELECT customers']},
   {id:'s5',input:'average order value per customer',expected:'avg',diff:.55,wrong:['mean order','GROUP']},
   {id:'s6',input:'orders joined with their line items',expected:'join',diff:.6,wrong:['merge orders','SELECT *']}
  ]},
 {id:'summ',name:'Article summarization',scorers:['keyword_recall','latency'],
  cases:[
   {id:'m1',input:'The central bank raised interest rates by 50 basis points to curb inflation, surprising markets.',expected:['interest','inflation','rate'],diff:.3,wrong:['The weather was nice','markets fell'],right:'The central bank hiked the interest rate to fight inflation.'},
   {id:'m2',input:'A new study links regular exercise to improved memory and reduced risk of dementia in older adults.',expected:['exercise','memory','dementia'],diff:.35,wrong:['Study about food','old people'],right:'Exercise improves memory and lowers dementia risk in older adults.'},
   {id:'m3',input:'The spacecraft completed its orbit of Mars and began transmitting high-resolution images back to Earth.',expected:['spacecraft','mars','images'],diff:.4,wrong:['A rocket launched','space news'],right:'The spacecraft orbited Mars and sent high-resolution images to Earth.'},
   {id:'m4',input:'Quarterly earnings beat expectations, driven by strong cloud revenue and cost discipline.',expected:['earnings','cloud','revenue'],diff:.5,wrong:['Company did ok','profit'],right:'Earnings beat expectations on strong cloud revenue and cost control.'},
   {id:'m5',input:'Wildfires spread across the region, forcing thousands to evacuate as crews battle the blaze.',expected:['wildfires','evacuate','crews'],diff:.45,wrong:['It was hot','fire news'],right:'Wildfires forced thousands to evacuate as crews fought the blaze.'},
   {id:'m6',input:'The treaty, signed by twelve nations, aims to cut plastic pollution in the oceans by 2030.',expected:['treaty','plastic','oceans'],diff:.55,wrong:['Countries met','agreement'],right:'Twelve nations signed a treaty to cut ocean plastic pollution by 2030.'}
  ]}
];
function getDataset(id){return DATASETS.find(d=>d.id===id);}
/* ---------------- prompts + versions ---------------- */
const PROMPTS=[
 {id:'intent-clf',name:'Intent Classifier',dataset:'intent',icon:'layers',
  versions:[
   {id:'v1',label:'v1',q:.52,tmpl:'Classify the message into a category.\nMessage: {{input}}\nCategory:'},
   {id:'v2',label:'v2',q:.74,tmpl:'You are a support triage system. Classify the message into exactly one of: billing, account, technical, feedback.\nMessage: {{input}}\nAnswer with only the category label.'},
   {id:'v3',label:'v3',q:.91,tmpl:'Classify the support message into exactly one of these labels: billing, account, technical, feedback.\n\nRules:\n- billing = charges, invoices, refunds, cancellation\n- account = login, password, data, profile\n- technical = errors, crashes, bugs\n- feedback = feature requests, opinions\n\nMessage: {{input}}\nReturn only the single lowercase label.'}
  ]},
 {id:'invoice-json',name:'Invoice JSON Extractor',dataset:'json',icon:'layers',
  versions:[
   {id:'v1',label:'v1',q:.55,tmpl:'Extract the invoice fields from: {{input}}'},
   {id:'v2',label:'v2',q:.86,tmpl:'Extract invoice data as strict JSON with keys "vendor" (string), "total" (number), "date" (YYYY-MM-DD). Output ONLY valid JSON, no prose.\nText: {{input}}'}
  ]},
 {id:'nl-sql',name:'NL → SQL',dataset:'sql',icon:'layers',
  versions:[
   {id:'v1',label:'v1',q:.48,tmpl:'Write SQL for: {{input}}'},
   {id:'v2',label:'v2',q:.82,tmpl:'You are a senior analytics engineer. Given a request, output a single valid SQL query (SELECT ... FROM ...). Use the appropriate aggregate, filter and join. Output only SQL.\nRequest: {{input}}'}
  ]},
 {id:'tldr',name:'TL;DR Summarizer',dataset:'summ',icon:'layers',
  versions:[
   {id:'v1',label:'v1',q:.6,tmpl:'Summarize: {{input}}'},
   {id:'v2',label:'v2',q:.84,tmpl:'Summarize the text in one sentence that preserves the key entities and the main action. Keep it factual and specific.\nText: {{input}}'}
  ]}
];
function getPrompt(id){return PROMPTS.find(p=>p.id===id);}
/* ---------------- deterministic mock model ---------------- */
function runCase(prompt,version,cs){
  const ds=getDataset(prompt.dataset);
  const seed=hashStr(prompt.id+':'+version.id+':'+cs.id);const rng=mulberry32(seed);
  const correctProb=Math.max(0.03,Math.min(0.98,version.q-(cs.diff-0.35)*0.5));
  const ok=rng()<correctProb;
  let output;
  if(ds.id==='intent')output=ok?cs.expected:cs.wrong[Math.floor(rng()*cs.wrong.length)];
  else if(ds.id==='json')output=ok?cs.expected:cs.wrong[Math.floor(rng()*cs.wrong.length)];
  else if(ds.id==='sql')output=ok?('SELECT '+(cs.expected==='count'?'COUNT(*)':cs.expected==='sum'?'SUM(amount)':cs.expected==='avg'?'AVG(total)':'*')+' FROM '+(cs.expected==='join'?'orders o JOIN line_items li ON li.order_id=o.id':'t')+(cs.expected==='where'?" WHERE state='CA'":'')+(cs.expected==='limit'?' ORDER BY sales DESC LIMIT 10':'')):cs.wrong[Math.floor(rng()*cs.wrong.length)];
  else output=ok?cs.right:cs.wrong[Math.floor(rng()*cs.wrong.length)];
  const latency=Math.round(300+version.tmpl.length*0.5+rng()*560+(ds.id==='json'?250:0));
  const tokensIn=Math.round(version.tmpl.length/4+cs.input.length/4),tokensOut=Math.round(output.length/4);
  // score
  const ctx={pattern:ds.pattern,latency};
  const scores=ds.scorers.map(sid=>{const S=SCORERS[sid];let exp=cs.expected;if(sid==='fields_present')exp=ds.fields;if(sid==='keyword_recall')exp=cs.expected;
    const pass=S.fn(output,exp,ctx);const val=S.scoreFn?S.scoreFn(output,exp):(pass?1:0);return {id:sid,label:S.label,pass,val};});
  const pass=scores.every(s=>s.pass);
  return {output,latency,tokensIn,tokensOut,scores,pass};
}
function runEval(prompt,version){
  const ds=getDataset(prompt.dataset);const results=ds.cases.map(cs=>({cs,...runCase(prompt,version,cs)}));
  const passed=results.filter(r=>r.pass).length;const rate=passed/results.length;
  const lat=results.map(r=>r.latency).sort((a,b)=>a-b);const p50=lat[Math.floor(lat.length/2)],p95=lat[Math.floor(lat.length*0.95)]||lat[lat.length-1];
  const scorerAgg={};ds.scorers.forEach(sid=>{const vals=results.map(r=>r.scores.find(s=>s.id===sid));scorerAgg[sid]={label:SCORERS[sid].label,rate:vals.filter(v=>v.pass).length/vals.length};});
  const cost=results.reduce((s,r)=>s+(r.tokensIn*0.15+r.tokensOut*0.6)/1000,0);
  return {ds,results,passed,total:results.length,rate,p50,p95,scorerAgg,cost};
}
/* ---------------- custom 3D hero: prompt lattice ---------------- */
function mountLatticeHero(id){if(typeof THREE==='undefined')return;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cv=document.getElementById(id);if(!cv)return;const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  const b=cv.getBoundingClientRect();let w=b.width||480,h=b.height||480;r.setPixelRatio(Math.min(2,devicePixelRatio));r.setSize(w,h,false);
  const sc=new THREE.Scene();const cam=new THREE.PerspectiveCamera(55,w/h,.1,100);cam.position.z=6;
  const cs=getComputedStyle(document.documentElement);const C=v=>new THREE.Color(cs.getPropertyValue(v).trim()||'#ff4fa3');
  const acc=C('--acc'),acc2=C('--acc2'),amb=C('--amb');
  const grp=new THREE.Group();sc.add(grp);
  // layered tree: layer 0 root(1), layer1(3), layer2(6), layer3(12)
  const layers=[[1,0],[3,1.4],[7,2.6],[13,3.5]];const nodes=[];const layerNodes=[];
  layers.forEach((L,li)=>{const[count,rad]=L;const z=2.2-li*1.5;const arr=[];
    for(let i=0;i<count;i++){const a=(i/count)*6.2831+li*0.6;const x=Math.cos(a)*rad,y=Math.sin(a)*rad*0.78;const v=new THREE.Vector3(x,y,z);v.li=li;nodes.push(v);arr.push(v);}
    layerNodes.push(arr);});
  // points
  const parr=[],pcol=[];nodes.forEach(v=>{parr.push(v.x,v.y,v.z);const c=v.li===0?amb:v.li%2?acc:acc2;pcol.push(c.r,c.g,c.b);});
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(parr,3));pg.setAttribute('color',new THREE.Float32BufferAttribute(pcol,3));
  grp.add(new THREE.Points(pg,new THREE.PointsMaterial({size:.17,vertexColors:true,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false})));
  // edges between consecutive layers
  const edges=[];for(let li=0;li<layerNodes.length-1;li++){layerNodes[li+1].forEach((child,ci)=>{const parent=layerNodes[li][ci%layerNodes[li].length];edges.push([parent,child]);});}
  const larr=[];edges.forEach(([a,b2])=>larr.push(a.x,a.y,a.z,b2.x,b2.y,b2.z));
  const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(larr,3));
  const lmat=new THREE.LineBasicMaterial({color:acc,transparent:true,opacity:.3,blending:THREE.AdditiveBlending});
  grp.add(new THREE.LineSegments(lg,lmat));
  // pulse points traveling along edges
  const PN=edges.length;const pulseArr=new Float32Array(PN*3);const pulseGeo=new THREE.BufferGeometry();pulseGeo.setAttribute('position',new THREE.Float32BufferAttribute(pulseArr,3));
  const pulses=new THREE.Points(pulseGeo,new THREE.PointsMaterial({color:amb,size:.14,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));grp.add(pulses);
  let mX=0,mY=0;cv.addEventListener('pointermove',e=>{const r2=cv.getBoundingClientRect();mX=(e.clientX-r2.left)/r2.width-.5;mY=(e.clientY-r2.top)/r2.height-.5;});
  const t0=performance.now();
  (function loop(now){const t=(now-t0)/1000;
    for(let i=0;i<PN;i++){const[a,b2]=edges[i];const f=(Math.sin(t*1.1+i*0.7)*0.5+0.5);pulseArr[i*3]=a.x+(b2.x-a.x)*f;pulseArr[i*3+1]=a.y+(b2.y-a.y)*f;pulseArr[i*3+2]=a.z+(b2.z-a.z)*f;}
    pulseGeo.attributes.position.needsUpdate=true;
    grp.rotation.y=t*0.25+mX*0.5;grp.rotation.x=mY*0.3+Math.sin(t*0.3)*0.1;
    r.render(sc,cam);requestAnimationFrame(loop);})(t0);
  addEventListener('resize',()=>{const b2=cv.getBoundingClientRect();w=b2.width;h=b2.height;cam.aspect=w/h;cam.updateProjectionMatrix();r.setSize(w,h,false);});
}
/* ---------------- helpers ---------------- */
function statRow(c){return c.map(([l,n])=>'<div class="bstat"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>').join('');}
function marq(t){const s='<span>'+t.map(x=>'<b>'+x+'</b>').join(' · ')+' · </span>';return s+s;}
function featGrid(items){return items.map(([h,ic,t,d],i)=>'<a class="fcell" href="'+h+'"><div class="fi">'+icon(ic,22)+'</div><div class="fx">0'+(i+1)+'</div><h3>'+t+'</h3><p>'+d+'</p><div class="go">Open '+icon('chevron',13)+'</div></a>').join('');}
function tmplHl(t){return esc(t).replace(/\{\{(\w+)\}\}/g,'<span class="var">{{$1}}</span>');}
function pct(x){return Math.round(x*100)+'%';}
const FEATURES="prompt versioning · 4 prompts × multiple versions · 4 eval datasets · 26 test cases · 6 real scorers (exact match, contains, regex, valid JSON, fields present, keyword recall, latency) · deterministic eval engine · pass rate · per-scorer breakdown · per-case output inspection · expand any case · p50 / p95 latency · token & cost estimate · version diff · improved vs regressed cases · regression detection · side-by-side version compare · prompt playground · live variable templating · {{input}} highlighting · run against sample inputs · optional Gemini live runs · bring-your-own-key · 3D prompt-lattice hero · traveling eval pulses · cursor-reactive hero · pass/fail chips · scorer bars · conic pass-rate ring · search prompts · ambient motion · scroll reveals · custom cursor · light & dark · 4 accents · keyboard theme toggle · JSON export · fully offline · responsive · award-grade UI";
/* ---------------- optional Gemini ---------------- */
function geminiKey(){return localStorage.getItem('pf_key')||'';}
function callGemini(prompt,cb){const key=geminiKey();if(!key||!navigator.onLine){cb(null);return;}
  const models=['gemini-2.0-flash-lite','gemini-flash-latest','gemini-2.0-flash'];
  (function tryM(i){if(i>=models.length){cb(null);return;}
    fetch('https://generativelanguage.googleapis.com/v1beta/models/'+models[i]+':generateContent?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:120,temperature:0.2}})})
    .then(r=>r.ok?r.json():Promise.reject(r.status)).then(j=>{const t=j&&j.candidates&&j.candidates[0]&&j.candidates[0].content.parts[0].text;cb(t?t.trim():null);}).catch(()=>tryM(i+1));
  })(0);
}
/* ---------------- PAGES ---------------- */
window.PAGES={
 index(){
   const totalCases=DATASETS.reduce((s,d)=>s+d.cases.length,0);const totalVers=PROMPTS.reduce((s,p)=>s+p.versions.length,0);
   $('meta').innerHTML=statRow([['prompts',PROMPTS.length],['versions',totalVers],['test cases',totalCases],['scorers',6]]);
   $('marq').innerHTML=marq(['prompt evals','regression tests','exact match','valid JSON','keyword recall','version diff','ship with confidence']);
   $('fgrid').innerHTML=featGrid([
     ['prompts.html','layers','Prompts','Versioned prompts with the full template — diff and track every change.'],
     ['eval.html','play','Evals','Run a prompt version against a dataset and score every case.'],
     ['diff.html','diff','Version diff','See exactly which cases improved and which regressed.'],
     ['playground.html','flask','Playground','Edit a prompt, fill variables, and run it live — offline or via Gemini.'],
     ['eval.html','spark','6 real scorers','Exact match, contains, regex, JSON validity, fields, keyword recall, latency.'],
     ['settings.html','settings','Settings','Theme, accents, optional Gemini key and JSON export.']
   ]);
   $('featlist').textContent='50+ features — '+FEATURES+'.';
   mountLatticeHero('hero3d');
 },
 prompts(){
   let q='';
   function draw(){$('grid').innerHTML=PROMPTS.filter(p=>p.name.toLowerCase().includes(q)).map(p=>{
     const best=p.versions.map(v=>runEval(p,v).rate);const top=Math.max(...best);const ds=getDataset(p.dataset);
     return '<a class="pcard" href="eval.html?p='+p.id+'"><div class="nm">'+icon('layers',18)+esc(p.name)+'</div><div class="sub">dataset: '+esc(ds.name)+' · '+ds.cases.length+' cases</div>'+
       '<div class="vrow">'+p.versions.map((v,i)=>'<span class="vtag">'+v.label+' · '+pct(best[i])+'</span>').join('')+'</div>'+
       '<div class="codebox" style="max-height:92px;overflow:hidden">'+tmplHl(p.versions[p.versions.length-1].tmpl)+'</div>'+
       '<div class="go" style="font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--acc);margin-top:14px;display:flex;gap:7px;align-items:center">Run eval '+icon('chevron',13)+'</div></a>';}).join('');}
   $('q').oninput=()=>{q=$('q').value.toLowerCase().trim();draw();};draw();
 },
 eval(){
   const pid=new URLSearchParams(location.search).get('p')||PROMPTS[0].id;const p=getPrompt(pid);
   let vIdx=p.versions.length-1;
   $('psel').innerHTML=PROMPTS.map(x=>'<option value="'+x.id+'"'+(x.id===pid?' selected':'')+'>'+esc(x.name)+'</option>').join('');
   $('psel').onchange=()=>{location.href='eval.html?p='+$('psel').value;};
   $('pname').textContent=p.name;$('pds').textContent='against '+getDataset(p.dataset).name;
   function draw(){const v=p.versions[vIdx];const E=runEval(p,v);
     $('vseg').innerHTML=p.versions.map((x,i)=>'<button class="'+(i===vIdx?'on':'')+'" data-i="'+i+'">'+x.label+'</button>').join('');
     $('vseg').querySelectorAll('button').forEach(b=>b.onclick=()=>{vIdx=+b.dataset.i;draw();});
     $('tmpl').innerHTML=tmplHl(v.tmpl);
     $('ring').style.setProperty('--p',Math.round(E.rate*100));$('ringv').textContent=pct(E.rate);
     $('estats').innerHTML=statRow([['passed',E.passed+'/'+E.total],['p50 latency',E.p50+'ms'],['p95 latency',E.p95+'ms'],['est. cost','$'+E.cost.toFixed(4)]]);
     $('scorers').innerHTML=Object.keys(E.scorerAgg).map(sid=>{const s=E.scorerAgg[sid];return '<div class="sbar"><span class="sn">'+s.label+'</span><div class="st"><i style="width:'+Math.round(s.rate*100)+'%"></i></div><span class="sv">'+pct(s.rate)+'</span></div>';}).join('');
     $('cases').innerHTML=E.results.map((r,i)=>'<div class="caserow" data-i="'+i+'"><div class="chd"><span class="ppill '+(r.pass?'pass':'fail')+'">'+(r.pass?icon('check',12)+'PASS':icon('close',12)+'FAIL')+'</span><span class="cin">'+esc(r.cs.input)+'</span><span class="badge">'+r.latency+'ms</span>'+icon('chevron',14)+'</div>'+
       '<div class="cbody"><div class="iogrid"><div class="iobox"><div class="il">Model output</div><div class="iv">'+esc(r.output)+'</div></div><div class="iobox"><div class="il">Expected</div><div class="iv">'+esc(typeof r.cs.expected==='string'?r.cs.expected:JSON.stringify(r.cs.expected))+'</div></div></div>'+
       '<div class="scorechips">'+r.scores.map(s=>'<span class="schip '+(s.pass?'pass':'fail')+'">'+(s.pass?icon('check',11):icon('close',11))+s.label+'</span>').join('')+'</div></div></div>').join('');
     $('cases').querySelectorAll('.caserow').forEach(row=>row.querySelector('.chd').onclick=()=>row.classList.toggle('open'));
   }
   draw();
 },
 diff(){
   const p=getPrompt(new URLSearchParams(location.search).get('p')||PROMPTS[0].id);
   $('psel').innerHTML=PROMPTS.map(x=>'<option value="'+x.id+'"'+(x.id===p.id?' selected':'')+'>'+esc(x.name)+'</option>').join('');
   $('psel').onchange=()=>{location.href='diff.html?p='+$('psel').value;};
   let ai=0,bi=p.versions.length-1;
   function draw(){const va=p.versions[ai],vb=p.versions[bi];const Ea=runEval(p,va),Eb=runEval(p,vb);
     $('aseg').innerHTML=p.versions.map((x,i)=>'<button class="'+(i===ai?'on':'')+'" data-i="'+i+'">'+x.label+'</button>').join('');
     $('bseg').innerHTML=p.versions.map((x,i)=>'<button class="'+(i===bi?'on':'')+'" data-i="'+i+'">'+x.label+'</button>').join('');
     $('aseg').querySelectorAll('button').forEach(b=>b.onclick=()=>{ai=+b.dataset.i;draw();});
     $('bseg').querySelectorAll('button').forEach(b=>b.onclick=()=>{bi=+b.dataset.i;draw();});
     const d=Eb.rate-Ea.rate;
     $('summary').innerHTML=statRow([[va.label+' pass',pct(Ea.rate)],[vb.label+' pass',pct(Eb.rate)],['<span style="color:'+(d>=0?'var(--grn)':'var(--rose)')+'">delta</span>',(d>=0?'+':'')+pct(d)],['cases',Ea.total]]);
     let improved=0,regressed=0;
     const rows=Ea.results.map((ra,i)=>{const rb=Eb.results[i];let cls='',tag='';
       if(!ra.pass&&rb.pass){cls='improved';improved++;tag='<span class="delta2 up">▲ fixed</span>';}
       else if(ra.pass&&!rb.pass){cls='regressed';regressed++;tag='<span class="delta2 down">▼ broke</span>';}
       else tag='<span class="delta2 flat">—</span>';
       return '<div class="diffrow '+cls+'"><div class="cin" style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(ra.cs.input)+'</div><div class="dc">'+(ra.pass?'<span class="score pass">pass</span>':'<span class="score fail">fail</span>')+'</div><div class="dc">'+(rb.pass?'<span class="score pass">pass</span>':'<span class="score fail">fail</span>')+'</div><div class="dc">'+tag+'</div></div>';}).join('');
     $('difftable').innerHTML='<div class="diffrow" style="background:transparent;border:none"><div class="cin" style="font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut)">test case</div><div class="dc dh" style="color:var(--mut);font-size:10px">'+va.label+'</div><div class="dc dh" style="color:var(--mut);font-size:10px">'+vb.label+'</div><div class="dc" style="color:var(--mut);font-size:10px">Δ</div></div>'+rows;
     $('verdict').innerHTML='<b style="color:var(--grn)">'+improved+' fixed</b> · <b style="color:var(--rose)">'+regressed+' regressed</b> · '+(Ea.total-improved-regressed)+' unchanged';
   }
   draw();
 },
 playground(){
   let pid=PROMPTS[0].id;
   $('psel').innerHTML=PROMPTS.map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join('');
   function load(){const p=getPrompt(pid);$('tmplEdit').value=p.versions[p.versions.length-1].tmpl;const ds=getDataset(p.dataset);
     $('inputSel').innerHTML=ds.cases.map(c=>'<option value="'+c.id+'">'+esc(c.input.slice(0,50))+'…</option>').join('');run();}
   $('psel').onchange=()=>{pid=$('psel').value;load();};
   $('inputSel').onchange=run;$('tmplEdit').oninput=run;$('runBtn').onclick=runLive;
   function filled(){const p=getPrompt(pid);const ds=getDataset(p.dataset);const cs=ds.cases.find(c=>c.id===$('inputSel').value)||ds.cases[0];
     return {text:$('tmplEdit').value.replace(/\{\{input\}\}/g,cs.input),cs,ds,p};}
   function run(){const f=filled();const p=getPrompt(pid);const fakeV={id:'pg',q:p.versions[p.versions.length-1].q,tmpl:$('tmplEdit').value};
     const r=runCase(p,fakeV,f.cs);
     $('prompted').textContent=f.text;
     $('output').innerHTML='<div class="iv">'+esc(r.output)+'</div>';
     $('pgscores').innerHTML='<div class="scorechips">'+r.scores.map(s=>'<span class="schip '+(s.pass?'pass':'fail')+'">'+(s.pass?icon('check',11):icon('close',11))+s.label+'</span>').join('')+'</div>';
     $('pgkv').innerHTML=[['Verdict',r.pass?'PASS':'FAIL'],['Latency (sim)',r.latency+'ms'],['Tokens in / out',r.tokensIn+' / '+r.tokensOut],['Expected',typeof f.cs.expected==='string'?f.cs.expected.slice(0,40):JSON.stringify(f.cs.expected)]].map(x=>'<div class="kv"><span class="k">'+x[0]+'</span><span class="v">'+esc(String(x[1]))+'</span></div>').join('');
     $('srcTag').textContent='offline mock model';
   }
   function runLive(){const f=filled();if(!geminiKey()){toast('Add a Gemini key in Settings for live runs');return;}$('output').innerHTML='<div class="iv" style="color:var(--mut)">Calling Gemini…</div>';$('srcTag').textContent='Gemini (live)';
     callGemini(f.text,(out)=>{if(out==null){$('output').innerHTML='<div class="iv" style="color:var(--rose)">Live call failed — showing offline result.</div>';run();return;}
       const ctx={pattern:f.ds.pattern,latency:600};const scores=f.ds.scorers.map(sid=>{const S=SCORERS[sid];let exp=f.cs.expected;if(sid==='fields_present')exp=f.ds.fields;const pass=S.fn(out,exp,ctx);return{label:S.label,pass};});
       $('output').innerHTML='<div class="iv">'+esc(out)+'</div>';
       $('pgscores').innerHTML='<div class="scorechips">'+scores.map(s=>'<span class="schip '+(s.pass?'pass':'fail')+'">'+(s.pass?icon('check',11):icon('close',11))+s.label+'</span>').join('')+'</div>';
     });
   }
   load();
 },
 settings(){
   $('themeToggle').classList.toggle('on',theme()==='light');$('themeToggle').onclick=()=>{toggleTheme();$('themeToggle').classList.toggle('on',theme()==='light');};
   $('accents2').innerHTML=APP.accents.map((a,i)=>'<button class="ad'+(i===accentIdx()?' on':'')+'" data-i="'+i+'" data-press style="width:24px;height:24px;background:linear-gradient(135deg,'+a[0]+','+a[1]+')"></button>').join('');
   $('accents2').querySelectorAll('.ad').forEach(b=>b.onclick=()=>setAccent(+b.dataset.i));
   $('gk').value=geminiKey();
   $('gkSave').onclick=()=>{const v=$('gk').value.trim();if(v)localStorage.setItem('pf_key',v);else localStorage.removeItem('pf_key');toast('Saved');};
   $('exp').onclick=()=>{const out=PROMPTS.map(p=>({prompt:p.name,versions:p.versions.map(v=>{const E=runEval(p,v);return{version:v.label,pass_rate:E.rate,scorers:E.scorerAgg};})}));dl('promptforge-evals.json','application/json',JSON.stringify(out,null,2));};
   $('featlist').textContent=FEATURES+'.';
 }
};
