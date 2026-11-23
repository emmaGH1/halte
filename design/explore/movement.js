const NS="http://www.w3.org/2000/svg";
const RED="#D52B1E";
const P=(r,a)=>[r*Math.cos(a),r*Math.sin(a)];
const deg=d=>(d-90)*Math.PI/180; // 0deg = 12 o'clock
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);parent&&parent.appendChild(e);return e}
/* ---------- movement sketch (technical line drawing) ---------- */
function gear(cx,cy,r,teeth,depth=4){let d="";for(let i=0;i<teeth*2;i++){const a=i*Math.PI/teeth;const rr=i%2?r:r+depth;const a2=(i+1)*Math.PI/teeth;const [x1,y1]=P(rr,a),[x2,y2]=P(rr,a2);d+=(i?"L":"M")+(cx+x1).toFixed(1)+" "+(cy+y1).toFixed(1)+"L"+(cx+x2).toFixed(1)+" "+(cy+y2).toFixed(1)}return d+"Z"}
function spiral(cx,cy,r0,r1,turns){let d="";const n=turns*60;for(let i=0;i<=n;i++){const t=i/n;const a=t*turns*2*Math.PI;const r=r0+(r1-r0)*t;d+=(i?"L":"M")+(cx+r*Math.cos(a)).toFixed(1)+" "+(cy+r*Math.sin(a)).toFixed(1)}return d}
function screw(p,cx,cy,r,rot,ink){el("circle",{cx,cy,r,fill:"none",stroke:ink,"stroke-width":1.2},p);el("circle",{cx,cy,r:r*0.62,fill:"none",stroke:ink,"stroke-width":.6},p);const [x,y]=P(r*0.85,rot*Math.PI/180);el("line",{x1:cx-x,y1:cy-y,x2:cx+x,y2:cy+y,stroke:ink,"stroke-width":1.6},p)}
function jewel(p,cx,cy,ink,accent){el("circle",{cx,cy,r:6,fill:"none",stroke:ink,"stroke-width":1},p);el("circle",{cx,cy,r:2.6,fill:accent,opacity:.85},p)}

function movement(svg,{cx,cy,R,ink="#1b1b1b",faint="#9a958a",accent=RED,labels=true,labelColor="#121212",scale=1,dark=false,bg="#F3F0E8"}){
  const g=el("g",{},svg);
  const sw=w=>w*scale;
  // construction lines
  el("line",{x1:cx-R-60,y1:cy,x2:cx+R+60,y2:cy,stroke:faint,"stroke-width":sw(.6),"stroke-dasharray":"10 4 2 4"},g);
  el("line",{x1:cx,y1:cy-R-60,x2:cx,y2:cy+R+60,stroke:faint,"stroke-width":sw(.6),"stroke-dasharray":"10 4 2 4"},g);
  [R*1.08,R*0.55].forEach(r=>el("circle",{cx,cy,r,fill:"none",stroke:faint,"stroke-width":sw(.5),"stroke-dasharray":"3 5"},g));
  // case + lugs + crown
  el("circle",{cx,cy,r:R,fill:"none",stroke:ink,"stroke-width":sw(2.2)},g);
  el("circle",{cx,cy,r:R-10,fill:"none",stroke:ink,"stroke-width":sw(.8)},g);
  el("circle",{cx,cy,r:R-26,fill:"none",stroke:ink,"stroke-width":sw(1.4)},g);
  // crown at 3 o'clock (pulled out: hacking engaged)
  el("rect",{x:cx+R,y:cy-14,width:16,height:28,fill:"none",stroke:ink,"stroke-width":sw(1.4)},g);
  el("rect",{x:cx+R+22,y:cy-20,width:22,height:40,rx:3,fill:"none",stroke:ink,"stroke-width":sw(1.6)},g);
  for(let i=0;i<7;i++)el("line",{x1:cx+R+25+i*3,y1:cy-20,x2:cx+R+25+i*3,y2:cy+20,stroke:ink,"stroke-width":sw(.5)},g);
  // lugs
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{const x=cx+sx*R*0.52,y=cy+sy*R*0.86;el("path",{d:`M${x-sx*24} ${y} L${x+sx*6} ${y+sy*R*0.22} L${x+sx*40} ${y+sy*R*0.22} L${x+sx*34} ${y-sy*8}`,fill:"none",stroke:ink,"stroke-width":sw(1.4)},g)});
  // bridges (Côtes de Genève stripes as fine parallel lines clipped)
  const id="clip"+Math.random().toString(36).slice(2,7);
  const defs=el("defs",{},svg);
  const clip=el("clipPath",{id},defs);
  const bridgeD=`M${cx-R*0.78} ${cy-R*0.2} C ${cx-R*0.7} ${cy-R*0.75}, ${cx-R*0.05} ${cy-R*0.82}, ${cx+R*0.32} ${cy-R*0.55} L ${cx+R*0.05} ${cy-R*0.05} C ${cx-R*0.2} ${cy+R*0.12}, ${cx-R*0.55} ${cy+R*0.1}, ${cx-R*0.78} ${cy-R*0.2} Z`;
  el("path",{d:bridgeD},clip);
  const stripes=el("g",{"clip-path":`url(#${id})`},g);
  for(let i=-30;i<30;i++)el("line",{x1:cx-R+i*9,y1:cy-R,x2:cx-R+i*9+R*0.9,y2:cy+R,stroke:faint,"stroke-width":sw(.5)},stripes);
  el("path",{d:bridgeD,fill:"none",stroke:ink,"stroke-width":sw(1.5)},g);
  const bridge2=`M${cx+R*0.12} ${cy+R*0.08} L ${cx+R*0.62} ${cy-R*0.18} C ${cx+R*0.78} ${cy+R*0.05}, ${cx+R*0.7} ${cy+R*0.45}, ${cx+R*0.45} ${cy+R*0.5} L ${cx+R*0.1} ${cy+R*0.35} Z`;
  el("path",{d:bridge2,fill:"none",stroke:ink,"stroke-width":sw(1.5)},g);
  // barrel (mainspring) upper-left
  const bx=cx-R*0.42,by=cy-R*0.36,br=R*0.26;
  el("path",{d:gear(bx,by,br,72,3.2),fill:"none",stroke:ink,"stroke-width":sw(1)},g);
  el("circle",{cx:bx,cy:by,r:br*0.78,fill:"none",stroke:ink,"stroke-width":sw(.8)},g);
  el("path",{d:spiral(bx,by,br*0.16,br*0.72,6),fill:"none",stroke:faint,"stroke-width":sw(.7)},g);
  el("path",{d:gear(bx,by,br*0.3,18,4),fill:"none",stroke:ink,"stroke-width":sw(1.1)},g); // ratchet
  screw(g,bx,by,8,30,ink);
  // train wheels
  const wheels=[[cx,cy,R*0.2,60],[cx+R*0.3,cy-R*0.12,R*0.13,48],[cx+R*0.18,cy+R*0.22,R*0.11,42]];
  wheels.forEach(([x,y,r,n],i)=>{el("path",{d:gear(x,y,r,n,2.6),fill:"none",stroke:ink,"stroke-width":sw(.9)},g);
    for(let k=0;k<5;k++){const [a,b]=P(r*0.82,k*2*Math.PI/5+i);el("line",{x1:x,y1:y,x2:x+a,y2:y+b,stroke:ink,"stroke-width":sw(.7)},g)}
    el("circle",{cx:x,cy:y,r:r*0.82,fill:"none",stroke:ink,"stroke-width":sw(.6)},g);jewel(g,x,y,ink,accent)});
  // escape wheel
  const ex=cx+R*0.06,ey=cy+R*0.46;
  let ed="";for(let i=0;i<20;i++){const a=i*2*Math.PI/20;const [x1,y1]=P(R*0.075,a),[x2,y2]=P(R*0.11,a+0.12),[x3,y3]=P(R*0.075,a+0.3);ed+=`M${ex+x1} ${ey+y1} L${ex+x2} ${ey+y2} L${ex+x3} ${ey+y3}`}
  el("path",{d:ed,fill:"none",stroke:ink,"stroke-width":sw(.9)},g);jewel(g,ex,ey,ink,accent);
  // pallet fork
  el("path",{d:`M${ex+R*0.06} ${ey-R*0.1} L${ex+R*0.2} ${ey+R*0.02} L${ex+R*0.06} ${ey+R*0.14} M${ex+R*0.2} ${ey+R*0.02} L${ex+R*0.36} ${ey+R*0.08}`,fill:"none",stroke:ink,"stroke-width":sw(1.5)},g);
  // balance wheel lower-left with hairspring
  const lx=cx-R*0.36,ly=cy+R*0.42,lr=R*0.22;
  el("circle",{cx:lx,cy:ly,r:lr,fill:"none",stroke:ink,"stroke-width":sw(2.2)},g);
  el("circle",{cx:lx,cy:ly,r:lr-5,fill:"none",stroke:ink,"stroke-width":sw(.6)},g);
  for(let k=0;k<3;k++){const [a,b]=P(lr-4,k*2*Math.PI/3+0.4);el("line",{x1:lx,y1:ly,x2:lx+a,y2:ly+b,stroke:ink,"stroke-width":sw(1.3)},g)}
  for(let k=0;k<12;k++){const [a,b]=P(lr+2,k*Math.PI/6);el("circle",{cx:lx+a,cy:ly+b,r:2.4,fill:"none",stroke:ink,"stroke-width":sw(.8)},g)}
  el("path",{d:spiral(lx,ly,lr*0.12,lr*0.62,7),fill:"none",stroke:ink,"stroke-width":sw(.55)},g);
  jewel(g,lx,ly,ink,accent);
  // balance cock
  el("path",{d:`M${lx-lr*0.3} ${ly-lr*0.2} L${lx-lr*1.6} ${ly+lr*0.9} L${lx-lr*1.2} ${ly+lr*1.25} L${lx+lr*0.1} ${ly+lr*0.15} Z`,fill:"none",stroke:ink,"stroke-width":sw(1.3)},g);
  screw(g,lx-lr*1.32,ly+lr*0.98,7,-20,ink);
  // screws on bridges
  [[cx-R*0.62,cy-R*0.5,10],[cx+R*0.12,cy-R*0.6,60],[cx-R*0.12,cy-R*0.02,-30],[cx+R*0.55,cy+R*0.3,80],[cx+R*0.52,cy-R*0.08,15]].forEach(([x,y,r])=>screw(g,x,y,8,r,ink));
  // THE STOP LEVER (red): from crown keyless works to balance rim
  const tipX=lx+lr*0.72,tipY=ly-lr*0.72;
  const pivX=cx+R*0.38,pivY=cy+R*0.7;
  el("path",{d:`M${cx+R*0.86} ${cy+R*0.08} L${cx+R*0.64} ${cy+R*0.5} L${pivX} ${pivY} L${tipX+10} ${tipY+16} L${tipX} ${tipY}`,fill:"none",stroke:accent,"stroke-width":sw(4),"stroke-linejoin":"round","stroke-linecap":"round"},g);
  el("circle",{cx:pivX,cy:pivY,r:6,fill:bg,stroke:accent,"stroke-width":sw(2.5)},g);
  el("circle",{cx:tipX,cy:tipY,r:4.5,fill:accent},g);
  // contact flash
  [[-1,-.4],[-.2,-1],[.6,-.9]].forEach(([a,b])=>el("line",{x1:tipX+a*10,y1:tipY+b*10,x2:tipX+a*20,y2:tipY+b*20,stroke:accent,"stroke-width":sw(1.6)},g));
  if(!labels)return;
  // callouts
  const font='font-family:'+(window.MONO||'monospace')+';font-size:11px;letter-spacing:.08em';
  const call=(px,py,tx,ty,num,title,sub,color=labelColor,lineColor=ink)=>{
    el("circle",{cx:px,cy:py,r:2.5,fill:lineColor},g);
    const anchorLeft= tx<cx;
    el("path",{d:`M${px} ${py} L${tx} ${ty} L${tx+(anchorLeft?-30:30)} ${ty}`,fill:"none",stroke:lineColor,"stroke-width":.8},g);
    const t=el("text",{x:tx+(anchorLeft?-36:36),y:ty-6,"text-anchor":anchorLeft?"end":"start",style:font+";font-weight:500",fill:color},g);t.textContent=num+"  "+title;
    const s=el("text",{x:tx+(anchorLeft?-36:36),y:ty+10,"text-anchor":anchorLeft?"end":"start",style:font.replace("11px","10px"),fill:color,opacity:.62},g);s.textContent=sub;
  };
  call(bx-br*0.6,by-br*0.5,cx-R-30,cy-R*0.82,"01","BARREL","the energy: your ownership");
  call(cx+R*0.3,cy-R*0.12-R*0.13,cx+R+12,cy-R*0.7,"02","GOING TRAIN","the passport, ticking along");
  call(ex+R*0.2,ey+R*0.02,cx+R+12,cy+R*0.55,"03","ESCAPEMENT","each sale, one beat at a time");
  call(lx-lr*0.7,ly+lr*0.6,cx-R-30,cy+R*0.78,"04","BALANCE","the heart of the watch");
  call(pivX,pivY,cx+R+12,cy+R*0.92,"05","STOP LEVER · HALTE","one signed report stops the heart",accent,accent);
  // dimension line
  el("line",{x1:cx-R,y1:cy+R+40,x2:cx+R,y2:cy+R+40,stroke:faint,"stroke-width":.7},g);
  [cx-R,cx+R].forEach(x=>el("line",{x1:x,y1:cy+R+32,x2:x,y2:cy+R+48,stroke:faint,"stroke-width":.7},g));
  const dt=el("text",{x:cx,y:cy+R+34,"text-anchor":"middle",style:font,fill:faint},g);dt.textContent="Ø 40.0 MM · CAL. H-01";
}
