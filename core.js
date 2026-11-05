/* ===== core.js — shared framework. Reads window.APP (config) + window.PAGES (per-page init). ===== */
'use strict';
const $=id=>document.getElementById(id);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch=matchMedia('(hover:none)').matches;
function esc(s){return(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
function dl(name,mime,data){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:mime}));a.download=name;a.click();}
function copyText(t,msg){if(navigator.clipboard)navigator.clipboard.writeText(t).then(()=>toast(msg||'Copied'),()=>toast('Copy failed'));else toast('Clipboard unavailable');}
const BASEICON={
 home:'M3 11l9-8 9 8M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10',
 menu:'M3 6h18M3 12h18M3 18h18',
 sun:'M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
 moon:'M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z',
 close:'M6 6l12 12M18 6L6 18',chevron:'M9 6l6 6-6 6',more:'M5 12h.01M12 12h.01M19 12h.01',
 copy:'M9 9h10a1 1 0 011 1v10a1 1 0 01-1 1H9a1 1 0 01-1-1V10a1 1 0 011-1zM5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1',
 download:'M12 4v12M7 11l5 5 5-5M4 20h16',upload:'M12 16V4M7 9l5-5 5 5M4 20h16',
 trash:'M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13',check:'M5 13l4 4L19 7',plus:'M12 5v14M5 12h14',
 search:'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3',bolt:'M13 2L4 14h7l-1 8 9-12h-7z',
 settings:'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
 key:'M15 7a4 4 0 100 8 4 4 0 000-8zM11.5 11H3v3M7 11v3',refresh:'M4 12a8 8 0 0114-5.3L20 8M20 4v4h-4M20 12a8 8 0 01-14 5.3L4 16M4 20v-4h4',
 star:'M12 3l2.6 5.6L21 9.3l-4.5 4.2L17.6 20 12 16.8 6.4 20l1.1-6.5L3 9.3l6.4-.7z',edit:'M4 20h4L19 9l-4-4L4 16zM14 6l4 4'
};
function icon(n,sz){sz=sz||16;const p=(APP.icons&&APP.icons[n])||BASEICON[n]||'';const round=(n==='more')?' stroke-width="2.6" stroke-linecap="round"':' stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';return '<svg class="ic ic-'+n+'" width="'+sz+'" height="'+sz+'" viewBox="0 0 24 24" fill="none" stroke="currentColor"'+round+' aria-hidden="true"><path d="'+p+'"/></svg>';}
/* theme store (core-owned, keyed by app id) */
function tkey(k){return APP.id+'_'+k;}
function theme(){return localStorage.getItem(tkey('theme'))||'dark';}
function accentIdx(){return +(localStorage.getItem(tkey('acc'))||0);}
function applyTheme(){document.documentElement.setAttribute('data-theme',theme());const a=APP.accents[accentIdx()]||APP.accents[0];document.documentElement.style.setProperty('--acc',a[0]);document.documentElement.style.setProperty('--acc2',a[1]);if(a[2])document.documentElement.style.setProperty('--amb',a[2]);const b=$('themeBtn');if(b)b.innerHTML=icon(theme()==='dark'?'sun':'moon');}
function toggleTheme(){localStorage.setItem(tkey('theme'),theme()==='dark'?'light':'dark');applyTheme();}
function setAccent(i){localStorage.setItem(tkey('acc'),i);applyTheme();document.querySelectorAll('.ad').forEach((x,j)=>x.classList.toggle('on',j===i));}
/* chrome */
function buildChrome(){
  const here=(location.pathname.split('/').pop()||'index.html')||'index.html';
  const bar=$('topbar');
  if(bar){bar.className='bar';bar.innerHTML='<div class="in">'+
    '<a class="logo" href="index.html" data-mag>'+(APP.logo||'')+APP.name+'</a>'+
    '<button class="iconbtn navtoggle" id="navToggle" data-press aria-label="Menu">'+icon('menu')+'</button>'+
    '<nav class="nav" id="nav">'+APP.nav.map(([h,ic,label])=>'<a href="'+h+'" class="'+(h===here?'on':'')+'">'+label+'</a>').join('')+'</nav>'+
    '<div class="spacer"></div>'+
    '<div class="accents" id="accents">'+APP.accents.map((a,i)=>'<button class="ad'+(i===accentIdx()?' on':'')+'" data-i="'+i+'" data-press style="background:linear-gradient(135deg,'+a[0]+','+a[1]+')" aria-label="Accent"></button>').join('')+'</div>'+
    '<button class="iconbtn" id="themeBtn" data-press title="Theme (T)" aria-label="Theme"></button>'+
    (APP.cta?'<a class="pill primary" href="'+APP.cta[0]+'" data-press>'+icon(APP.cta[1],14)+' '+APP.cta[2]+'</a>':'')+
    '</div>';
    $('themeBtn').onclick=toggleTheme;
    document.querySelectorAll('#accents .ad').forEach(b=>b.onclick=()=>setAccent(+b.dataset.i));
    $('navToggle').onclick=()=>$('nav').classList.toggle('open');
  }
  if(!$('toast'))document.body.insertAdjacentHTML('beforeend','<div class="toast" id="toast"></div>');
  if(!document.getElementById('bg3d')){const c=document.createElement('canvas');c.id='bg3d';document.body.prepend(c);}
  if(!document.querySelector('.vig'))document.body.insertAdjacentHTML('afterbegin','<div class="vig"></div><div class="grain"></div>');
  if(!document.querySelector('.cur-ring'))document.body.insertAdjacentHTML('beforeend','<div class="cur-ring"></div><div class="cur-dot"></div>');
  applyTheme();initCursor();initAmbient();
  addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;if(e.key==='t'||e.key==='T')toggleTheme();});
}
let tt;function toast(m){const t=$('toast');if(!t)return;t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),1900);}
function closeAll(){document.querySelectorAll('.scrim').forEach(s=>s.classList.remove('on'));document.querySelectorAll('.menupop').forEach(m=>m.remove());}
addEventListener('pointerdown',e=>{const t=e.target.closest('[data-press]');if(t)t.classList.add('press');});
['pointerup','pointercancel','pointerleave'].forEach(ev=>addEventListener(ev,()=>document.querySelectorAll('.press').forEach(e=>e.classList.remove('press'))));
/* cursor + physics */
function initCursor(){if(reduce||touch)return;document.body.classList.add('cur');const ring=document.querySelector('.cur-ring'),dot=document.querySelector('.cur-dot');if(!ring)return;let mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my;
  addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px';const tText=e.target.closest('input[type=text],input:not([type]),textarea,input[type=password],input[type=number]');const tHov=e.target.closest('button,a,.fcell,.chip,.ad,.toggle,.listrow,.seg button,label,[data-press]');ring.classList.toggle('txt',!!tText);ring.classList.toggle('hov',!!tHov&&!tText);},{passive:true});
  addEventListener('pointerdown',()=>ring.classList.add('down'));addEventListener('pointerup',()=>ring.classList.remove('down'));
  (function loop(){rx+=(mx-rx)*.2;ry+=(my-ry)*.2;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(loop);})();
  addEventListener('pointermove',e=>{document.querySelectorAll('[data-mag],.pill.primary,.btn-xl').forEach(el=>{const r=el.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,d=Math.hypot(dx,dy);if(d<70)el.style.transform='translate('+dx*.16+'px,'+dy*.24+'px)';else el.style.transform='';});},{passive:true});
}
/* 2D ambient background (tinted accent blobs, cursor parallax) */
function initAmbient(){const cv=$('bg3d');if(!cv)return;if(reduce){cv.style.display='none';return;}const ctx=cv.getContext('2d');let W,H,DPR=Math.min(2,devicePixelRatio||1);let mx=.6,my=.3;
  function hx(h){h=(h||'').trim().replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return[parseInt(h.slice(0,2),16)||90,parseInt(h.slice(2,4),16)||120,parseInt(h.slice(4,6),16)||200];}
  function sz(){W=cv.width=innerWidth*DPR;H=cv.height=innerHeight*DPR;}sz();addEventListener('resize',sz);
  addEventListener('pointermove',e=>{mx=e.clientX/innerWidth;my=e.clientY/innerHeight;},{passive:true});
  const blobs=[{x:.8,y:.1,r:.5,a:0,s:.25,k:0},{x:.15,y:.5,r:.42,a:2,s:.18,k:1},{x:.55,y:.95,r:.38,a:4,s:.14,k:0}];let t=0;
  function frame(){t+=.004;ctx.clearRect(0,0,W,H);ctx.globalCompositeOperation='lighter';const light=document.documentElement.getAttribute('data-theme')==='light';
    const a1=hx(getComputedStyle(document.documentElement).getPropertyValue('--acc'));const a2=hx(getComputedStyle(document.documentElement).getPropertyValue('--acc2'));
    blobs.forEach((b,i)=>{b.a+=b.s*.01;const c=b.k?a2:a1;let px=(b.x+Math.cos(b.a)*.07+(i===0?(mx-.5)*.05:0))*W,py=(b.y+Math.sin(b.a*1.2)*.07+(i===0?(my-.5)*.05:0))*H;const rr=b.r*Math.min(W,H);const g=ctx.createRadialGradient(px,py,0,px,py,rr);g.addColorStop(0,'rgba('+c[0]+','+c[1]+','+c[2]+','+(light?.08:.11)+')');g.addColorStop(1,'rgba('+c[0]+','+c[1]+','+c[2]+',0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rr,0,6.29);ctx.fill();});
    ctx.globalCompositeOperation='source-over';requestAnimationFrame(frame);}
  frame();
}
/* ===== Three.js 3D hero ===== */
function colFromVar(v,fb){const c=new THREE.Color();try{c.set(getComputedStyle(document.documentElement).getPropertyValue(v).trim()||fb);}catch(e){c.set(fb);}return c;}
function mountHero3D(canvasId,kind){if(reduce||typeof THREE==='undefined')return;const cv=document.getElementById(canvasId);if(!cv)return;
  const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});const rect=cv.getBoundingClientRect();let w=rect.width||480,h=rect.height||480;r.setPixelRatio(Math.min(2,devicePixelRatio));r.setSize(w,h,false);
  const sc=new THREE.Scene();const cam=new THREE.PerspectiveCamera(55,w/h,.1,100);cam.position.z=5;
  const acc=colFromVar('--acc','#6cf'),acc2=colFromVar('--acc2','#a9f'),amb=colFromVar('--amb','#fc8');
  const grp=new THREE.Group();sc.add(grp);let anims=[];
  function lineMat(c,o){return new THREE.LineBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending});}
  function ptMat(c,s,o){return new THREE.PointsMaterial({color:c,size:s,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false});}
  if(kind==='terrain'){
    const N=40,SZ=7;const geo=new THREE.PlaneGeometry(SZ,SZ,N,N);const pos=geo.attributes.position;const base=pos.array.slice();
    const mesh=new THREE.LineSegments(new THREE.WireframeGeometry(geo),lineMat(acc,.5));mesh.rotation.x=-1.05;grp.add(mesh);
    const pts=new THREE.Points(geo,ptMat(acc2,.07,.9));pts.rotation.x=-1.05;grp.add(pts);
    anims.push((t)=>{for(let i=0;i<pos.count;i++){const x=base[i*3],y=base[i*3+1];pos.setZ(i,Math.sin(x*.9+t*1.3)*.5+Math.cos(y*.8+t*1.1)*.5);}pos.needsUpdate=true;mesh.geometry.dispose();mesh.geometry=new THREE.WireframeGeometry(geo);grp.position.y=-0.4;});
  } else if(kind==='graph'){
    const n=46,R=2.3,nodes=[];const pg=new THREE.BufferGeometry();const parr=[];
    for(let i=0;i<n;i++){const ph=Math.acos(1-2*(i+.5)/n),th=Math.PI*(1+Math.sqrt(5))*i;const v=new THREE.Vector3(Math.sin(ph)*Math.cos(th),Math.sin(ph)*Math.sin(th),Math.cos(ph)).multiplyScalar(R);nodes.push(v);parr.push(v.x,v.y,v.z);}
    pg.setAttribute('position',new THREE.Float32BufferAttribute(parr,3));grp.add(new THREE.Points(pg,ptMat(acc,.16,1)));
    const larr=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){if(nodes[i].distanceTo(nodes[j])<1.7){larr.push(nodes[i].x,nodes[i].y,nodes[i].z,nodes[j].x,nodes[j].y,nodes[j].z);}}
    const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(larr,3));grp.add(new THREE.LineSegments(lg,lineMat(acc2,.28)));
    anims.push((t)=>{grp.rotation.y=t*.25;grp.rotation.x=Math.sin(t*.3)*.2;});
  } else if(kind==='lens'){
    for(let k=0;k<5;k++){const ring=new THREE.Mesh(new THREE.TorusGeometry(2.2-k*.34,.012+ k*.004,8,80),new THREE.MeshBasicMaterial({color:k%2?acc2:acc,transparent:true,opacity:.6,blending:THREE.AdditiveBlending}));ring.userData.sp=(k%2?1:-1)*(.3+k*.12);grp.add(ring);anims.push((t)=>{ring.rotation.z=t*ring.userData.sp;ring.rotation.x=Math.sin(t*.4+k)*.5;});}
    const parr=[];for(let i=0;i<500;i++){const a=Math.random()*6.28,rr=Math.random()*2.0;parr.push(Math.cos(a)*rr,Math.sin(a)*rr,(Math.random()-.5)*.6);}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(parr,3));const pts=new THREE.Points(pg,ptMat(acc,.05,.8));grp.add(pts);anims.push((t)=>{pts.rotation.z=-t*.1;});
  } else if(kind==='gears'){
    function gear(rad,teeth,c,th){const g=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(rad,.06,8,60),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.7,blending:THREE.AdditiveBlending}));g.add(ring);for(let i=0;i<teeth;i++){const a=i/teeth*6.28;const t2=new THREE.Mesh(new THREE.BoxGeometry(.12,.18,.08),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.7,blending:THREE.AdditiveBlending}));t2.position.set(Math.cos(a)*rad,Math.sin(a)*rad,0);t2.rotation.z=a;g.add(t2);}g.userData.th=th;return g;}
    const g1=gear(1.3,12,acc,.5);g1.position.x=-.9;grp.add(g1);const g2=gear(.9,9,acc2,-.72);g2.position.set(1.2,.5,0);grp.add(g2);const g3=gear(.7,7,amb,.9);g3.position.set(.6,-1.3,0);grp.add(g3);
    const knot=new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.TorusKnotGeometry(.5,.16,60,8)),lineMat(acc,.3));knot.position.set(0,0,-1);grp.add(knot);
    anims.push((t)=>{g1.rotation.z=t*.5;g2.rotation.z=t*-.72;g3.rotation.z=t*.9;knot.rotation.x=t*.4;knot.rotation.y=t*.3;});
  } else { /* crystal default */
    const ico=new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2,1)),lineMat(acc,.5));grp.add(ico);
    const pg=new THREE.IcosahedronGeometry(2.4,2);grp.add(new THREE.Points(pg,ptMat(acc2,.05,.8)));
    anims.push((t)=>{grp.rotation.y=t*.3;grp.rotation.x=t*.15;});
  }
  let tx=0,ty=0,mX=0,mY=0;cv.addEventListener('pointermove',e=>{const b=cv.getBoundingClientRect();mX=((e.clientX-b.left)/b.width-.5);mY=((e.clientY-b.top)/b.height-.5);});
  addEventListener('resize',()=>{const b=cv.getBoundingClientRect();w=b.width;h=b.height;cam.aspect=w/h;cam.updateProjectionMatrix();r.setSize(w,h,false);});
  const t0=performance.now();
  (function loop(now){const t=(now-t0)/1000;tx+=((mX*.6)-tx)*.06;ty+=((mY*.5)-ty)*.06;grp.rotation.y+=0;anims.forEach(f=>f(t));grp.rotation.z=0;
    grp.rotation.x+= (kind==='terrain'? 0 : 0);cam.position.x=tx*2;cam.position.y=-ty*2;cam.lookAt(0,0,0);
    r.render(sc,cam);requestAnimationFrame(loop);})(t0);
}
function initReveals(){const els=document.querySelectorAll('.reveal');if(!els.length)return;if(!('IntersectionObserver'in window)||reduce){els.forEach(e=>e.classList.add('in'));return;}const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}}),{threshold:.12});els.forEach(e=>io.observe(e));}
/* boot */
function boot(){if(APP.ensureSeed)APP.ensureSeed();buildChrome();const page=((location.pathname.split('/').pop()||'index.html').replace('.html','')||'index');if(window.PAGES&&window.PAGES[page])window.PAGES[page]();initReveals();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
