/**
 * Ribbon palette sampler — accepted v0.16 baseline, 2026-10-14.
 * Source commit: ec954318fa8cb068df7e160aadaa6a5969189eba
 * Standalone ES module, no dependencies. Browser or Node.js.
 *
 * QUICK START
 *   import { generateRibbon } from './ribbon-core-v016.mjs';
 *   const result = generateRibbon({
 *     lab: [0.60, -0.07, -0.02], count: 4, seed: 'demo'
 *   });
 *   // result.colors, result.widths, result.primaryIndex, result.profile
 *   // Empty/omitted seed generates a fresh seed, returned in result.seed.
 *
 * REPRESENTATION
 * All perceptual coordinates are OKLab / OKLCH, NOT CIE Lab / LCh.
 * L uses [0,1], hue H uses degrees. rgb() returns LINEAR sRGB components.
 * hex() returns gamma-encoded, quantized 8-bit #rrggbb.
 * toLch() parses hex and returns [OKLab L, OKLCH C, OKLCH H].
 * labPoint() returns [L,a,b].
 * Keep user-selected floating-point Lab coordinates as authoritative state.
 * Never overwrite them by parsing the derived hex preview back into Lab.
 * The sampler itself uses displayed hex colors as its selected-color state.
 *
 * ALGORITHM
 * 1. Build a uniform OKLab candidate grid: L=1/40,...,39/40;
 *    a,b=-16/40,...,16/40. Retain linear-sRGB-valid points only.
 *    The baseline has 3468 grid points, not a continuous sampler.
 * 2. Fix/sample a primary inside the requested OKLab sphere intersected with
 *    the sRGB gamut. Default radius=0. Sampling is uniform in sphere volume
 *    before rejection. Conversion to 8-bit hex adds small quantization error.
 * 3. Determine one shell probability from the ACTUAL PRIMARY's lightness:
 *      t = clamp((abs(L - 0.5) - 0.1) / 0.3, 0, 1)
 *      pShell = 0.2 + 0.5 * t*t*(3 - 2*t)
 *    L in [0.4,0.6] => 20%; L<=0.1 or L>=0.9 => 70%.
 *    This probability stays fixed for the palette; independently choose an
 *    algorithm AGAIN at every added color. It is not based on each parent L.
 * 4. CONDITIONAL branch (probability 1-pShell):
 *    For candidate c and all previously selected colors s:
 *      reliability = Cc*Cs / sqrt((Cc^2+.025^2)*(Cs^2+.025^2))
 *      affiliation = (1 + reliability*cos(Hc-Hs)) / 2
 *      pairPreference = .55*affiliation + .45*min(1,abs(Lc-Ls)/.5)
 *    dMin = min_s EuclideanOKLab(c,s)
 *    prefMin = min_s pairPreference(c,s)
 *    score = .15*min(1,dMin/.35) + .85*prefMin
 *    Reject duplicates and distance<.045 (also check the displayed hex).
 *    Uniformly sample candidates with score >= max(score)-.75*std(score).
 *    std is the population standard deviation over remaining candidates.
 *    This is our simplified Colorgorical-inspired rule, not a reproduction
 *    of its empirical preference model, naming data, or gamut filters.
 * 5. SHELL branch (probability pShell):
 *    Uniformly pick one previously selected color v as the parent.
 *    At the START of the palette, independently draw and reuse:
 *      radius R ~ Uniform(.13,.26)
 *      shell band B ~ Uniform(.025,.05)
 *    Base log-density at candidate c:
 *      -.5*((distance(c,v)-R)/B)^2
 *      -.5*((Cc-Cv)/(.03+.3*Cv))^2
 *    Multiply by a soft exclusion around EVERY selected displayed color s:
 *      product_s [1-exp(-.5*(distance(displayed(c),s)/.075)^2)]
 *    Reject any displayed distance<.045. Normalize and sample on the grid.
 *    The radial density uses grid coordinates; exclusions use quantized
 *    displayed coordinates. This distinction is intentional in this export.
 *    No spherical-Jacobian correction is applied: density is relative to
 *    the discrete uniform OKLab grid, not uniform in radial distance.
 *
 * WIDTHS / LAYOUT (independent from color generation)
 * Sample widths from Dirichlet(alpha,...,alpha), truncated so every width
 * lies in [.05,.70] and the sum is 1. Default alpha=.8, count=4 (2..7).
 * Once colors are generated, place the primary at i with probability
 * width[i]^2 / sum_j width[j]^2. Swap primary with the color at that index.
 * Parent indices and profile.steps always refer to GENERATION ORDER,
 * BEFORE this placement. generatedColors retains that order explicitly.
 *
 * NOTES
 * - This module exports only the accepted hybrid and its two components.
 * - max-distance scoring can still favor extreme lightness; no extra
 *   lightness/chroma floor, forbidden hue, or final best-of-N pass is added.
 * - hex() reduces out-of-gamut chroma by repeated multiplication by .9.
 *   It is a simple baseline gamut mapping, not a color-management standard.
 * - name/device/date fields in the original UI do not encode semantics.
 *   The accepted hybrid does not use their profile biases in its density.
 * - Primitive functions below are extracted verbatim from the baseline.
 *   The convenience generateRibbon() wrapper uses its own RNG stream, so
 *   its seed is reproducible here but is NOT the original UI's seed stream.
 */

function rng(seed) { let h=2166136261; for(const c of seed) h=Math.imul(h^c.charCodeAt(0),16777619); return ()=>{h+=0x6D2B79F5;let t=Math.imul(h^h>>>15,1|h);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;}; }

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

function toLch(hex){let [r,g,b]=hex.slice(1).match(/../g).map(s=>parseInt(s,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);let l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);let L=.2104542553*l+.793617785*m-.0040720468*s,A=1.9779984951*l-2.428592205*m+.4505937099*s,B=.0259040371*l+.7827717662*m-.808675766*s;return [L,Math.hypot(A,B),Math.atan2(B,A)*180/Math.PI];}

function rgb(L,C,H){let a=C*Math.cos(H*Math.PI/180),b=C*Math.sin(H*Math.PI/180),l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;return [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s];}

function hex(L,C,H){let v=rgb(L,C,H);for(let i=0;i<80&&v.some(x=>x<0||x>1);i++){C*=.9;v=rgb(L,C,H);}return '#'+v.map(x=>Math.round(Math.max(0,Math.min(1,x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055))*255).toString(16).padStart(2,'0')).join('');}

function labPoint(color){const [l,c,h]=toLch(color);return [l,c*Math.cos(h*Math.PI/180),c*Math.sin(h*Math.PI/180)];}

let conditionalPool;

function colorPool(){
 if(conditionalPool)return conditionalPool;
 const out=[];
 for(let li=1;li<40;li++)for(let ai=-16;ai<=16;ai++)for(let bi=-16;bi<=16;bi++){
  const L=li/40,a=ai/40,b=bi/40,C=Math.hypot(a,b),H=Math.atan2(b,a)*180/Math.PI;
  if(rgb(L,C,H).every(v=>v>=0&&v<=1))out.push({L,a,b,C,H,color:hex(L,C,H)});
 }
 conditionalPool=out;return out;
}

function pairPreference(a,b){
 // Hue affiliation fades smoothly near the neutral axis. Lightness contrast
 // remains meaningful for gray colors. No forbidden hues or chroma floor.
 const reliability=a.C*b.C/Math.sqrt((a.C*a.C+.025**2)*(b.C*b.C+.025**2));
 const affiliation=(1+reliability*Math.cos((a.H-b.H)*Math.PI/180))/2;
 return .55*affiliation+.45*Math.min(1,Math.abs(a.L-b.L)/.5);
}

function conditionalStep(remaining,chosen,colors,balance,r){
 const scored=[],displayedChosen=chosen.map(prev=>labPoint(prev.color));let sum=0,sum2=0,best=-Infinity;
 for(const c of remaining){
  let distance=Infinity,preference=Infinity;
  for(const prev of chosen){distance=Math.min(distance,Math.hypot(c.L-prev.L,c.a-prev.a,c.b-prev.b));preference=Math.min(preference,pairPreference(c,prev));}
  if(distance<.045||colors.includes(c.color))continue;
  const displayed=c.displayPoint||(c.displayPoint=labPoint(c.color));
  if(displayedChosen.some(q=>Math.hypot(displayed[0]-q[0],displayed[1]-q[1],displayed[2]-q[2])<.045))continue;
  const score=balance*Math.min(1,distance/.35)+(1-balance)*preference;
  scored.push({c,score});sum+=score;sum2+=score*score;best=Math.max(best,score);
 }
 if(!scored.length)throw new Error('Conditional color sampling exhausted');
 const mean=sum/scored.length,sd=Math.sqrt(Math.max(0,sum2/scored.length-mean*mean)),threshold=best-.75*sd,eligible=scored.filter(x=>x.score>=threshold),next=eligible[Math.floor(r()*eligible.length)].c;
 return {next,remaining:scored.map(x=>x.c),step:{eligible:eligible.length,remaining:scored.length,threshold}};
}


function sampleConditionalPalette(n,anchor,p,r){
 const [L,C,H]=toLch(anchor),chosen=[{L,C,H,a:C*Math.cos(H*Math.PI/180),b:C*Math.sin(H*Math.PI/180),color:anchor}],colors=[anchor],steps=[];
 const balance=clamp(p.distinctness??.15,0,1);let remaining=colorPool().slice();
 for(let i=1;i<n;i++){
  const result=conditionalStep(remaining,chosen,colors,balance,r);
  colors.push(result.next.color);chosen.push(result.next);remaining=result.remaining;steps.push(result.step);
 }
 return {colors,lightness:chosen.map(c=>c.L),steps,profile:{...p,generator:'conditional',distinctness:balance,minDistance:.045,poolSize:colorPool().length}};
}

function densityPick(logDensity,chosen,r){
 const pool=colorPool(),logs=pool.map((c,i)=>{
  let value=logDensity(c,i);
  const point=c.displayPoint||(c.displayPoint=labPoint(c.color));
  for(const prev of chosen){const d=Math.hypot(point[0]-prev[0],point[1]-prev[1],point[2]-prev[2]);if(d<.045)return -Infinity;value+=Math.log(-Math.expm1(-.5*(d/.075)**2));}
  return value;
 }),max=Math.max(...logs);
 if(!Number.isFinite(max))throw new Error('Geometric density has no available colors');
 const mass=logs.map(x=>Math.exp(x-max));let pick=r()*mass.reduce((a,b)=>a+b,0),index=mass.length-1;
 for(let i=0;i<mass.length;i++){pick-=mass[i];if(pick<0){index=i;break;}}
 return pool[index];
}


function shellStep(chosen,radius,band,r){
 const parent=Math.floor(r()*chosen.length),v=chosen[parent],C=Math.hypot(v[1],v[2]);
 const next=densityPick(c=>-.5*((Math.hypot(c.L-v[0],c.a-v[1],c.b-v[2])-radius)/band)**2-.5*((c.C-C)/(.03+.3*C))**2,chosen,r);
 return {next,parent};
}


function sampleShellPalette(n,anchor,p,r){
 const colors=[anchor],chosen=[labPoint(anchor)],parents=[null],radius=.13+.13*r(),band=.025+.025*r();
 for(let i=1;i<n;i++){
  const {next,parent}=shellStep(chosen,radius,band,r);colors.push(next.color);chosen.push(labPoint(next.color));parents.push(parent);
 }
 return {colors,profile:{...p,generator:'shell-growth',radius,band,parents}};
}

function lightnessShellChance(L){const t=clamp((Math.abs(L-.5)-.1)/.3,0,1);return .2+.5*t*t*(3-2*t);}

function sampleHybridPalette(n,anchor,p,r){
 const primaryL=toLch(anchor)[0],autoChance=p.hybridShellChance==null,chance=autoChance?lightnessShellChance(primaryL):clamp(p.hybridShellChance,0,1),colors=[anchor],points=[labPoint(anchor)],steps=[],radius=.13+.13*r(),band=.025+.025*r();
 for(let i=1;i<n;i++){
  let next,step;
  if(r()<chance){const result=shellStep(points,radius,band,r);next=result.next;step={sampler:'shell-growth',parent:result.parent};}
  else{
   const records=points.map((v,j)=>({L:v[0],a:v[1],b:v[2],C:Math.hypot(v[1],v[2]),H:Math.atan2(v[2],v[1])*180/Math.PI,color:colors[j]}));
   const result=conditionalStep(colorPool(),records,colors,.15,r);next=result.next;step={sampler:'conditional',...result.step};
  }
  colors.push(next.color);points.push(labPoint(next.color));steps.push(step);
 }
 return {colors,profile:{...p,generator:'step-hybrid',distinctness:.15,hybridShellChance:chance,hybridAuto:autoChance,primaryL,radius,band,steps}};
}

function widths(n,a,r){if(!Number.isInteger(n)||n<2||n>7||!Number.isFinite(a)||a<=0)throw new Error('无效采样参数。');const low=.05,high=.7,vertex=Array(n).fill(low);let rem=1-n*low;for(let i=0;i<n&&rem>0;i++){const d=Math.min(high-low,rem);vertex[i]+=d;rem-=d;}const bound=a>=1?(a-1)*n*Math.log(1/n):(a-1)*vertex.reduce((s,x)=>s+Math.log(x),0);for(let attempt=0;attempt<100000;attempt++){const x=Array.from({length:n},()=>-Math.log(Math.max(r(),1e-12))),sum=x.reduce((s,x)=>s+x,0),w=x.map(x=>low+(1-n*low)*x/sum);if(w.some(x=>x>high))continue;const d=(a-1)*w.reduce((s,x)=>s+Math.log(x),0);if(Math.log(Math.max(r(),1e-12))<=d-bound)return w;}throw new Error('Width sampling exhausted');}

function anchorInRange(anchor,radius,r){
 const fromLab=Array.isArray(anchor),center=fromLab?anchor.slice():labPoint(anchor),[l,a,b]=center;
 if(center.length!==3||!center.every(Number.isFinite)||l<0||l>1||!Number.isFinite(radius)||radius<0)throw new Error('无效 OKLab 参数。');
 const centerColor=fromLab?hex(l,Math.hypot(a,b),Math.atan2(b,a)*180/Math.PI):anchor;
 if(radius===0)return centerColor;
 for(let i=0;i<4000;i++){
  const z=2*r()-1,angle=r()*2*Math.PI,dist=Math.cbrt(r())*radius,xy=Math.sqrt(1-z*z),L=l+z*dist,A=a+Math.cos(angle)*xy*dist,B=b+Math.sin(angle)*xy*dist,C=Math.hypot(A,B),H=Math.atan2(B,A)*180/Math.PI;
  if(L>=0&&L<=1&&rgb(L,C,H).every(v=>v>=0&&v<=1))return hex(L,C,H);
 }
 if(fromLab)throw new Error('此 OKLab 球体内未找到可显示颜色，请移近色域或增大范围。');
 return centerColor;
}

function placeAnchor(colors,widths,r){const out=colors.slice();let target=r()*widths.reduce((s,w)=>s+w*w,0),index=widths.length-1;for(let i=0;i<widths.length;i++){target-=widths[i]*widths[i];if(target<0){index=i;break;}}[out[0],out[index]]=[out[index],out[0]];return out;}

/** Convenience interface; does not mutate lab or options. */
function generateRibbon({
  lab = [0.60, -0.07, -0.02],
  count = 4,
  widthAlpha = 0.8,
  rangeRadius = 0,
  seed = '',
  shellChance = null,
} = {}) {
  if (!Array.isArray(lab) || lab.length !== 3 || !lab.every(Number.isFinite)
      || lab[0] < 0 || lab[0] > 1) {
    throw new Error('lab must be a finite [L,a,b] array with 0 <= L <= 1');
  }
  if (shellChance !== null && (!Number.isFinite(shellChance)
      || shellChance < 0 || shellChance > 1)) {
    throw new Error('shellChance must be null (automatic), or a number in [0,1]');
  }
  const actualSeed = String(seed).trim() || freshSeed();
  const random = rng(actualSeed);
  const segmentWidths = widths(count, widthAlpha, random);
  const primary = anchorInRange(lab, rangeRadius, random);
  const result = sampleHybridPalette(
    count, primary, {hybridShellChance: shellChance}, random
  );
  const generatedColors = result.colors.slice();
  const colors = placeAnchor(generatedColors, segmentWidths, random);
  return {
    colors,
    widths: segmentWidths,
    primary,
    primaryIndex: colors.indexOf(primary),
    generatedColors,
    profile: result.profile,
    sourceLab: lab.slice(),
    sourceRadius: rangeRadius,
    seed: actualSeed,
  };
}

function freshSeed() {
  if (globalThis.crypto?.getRandomValues) {
    return Array.from(
      globalThis.crypto.getRandomValues(new Uint32Array(3)),
      v => v.toString(16).padStart(8, '0')
    ).join('');
  }
  return Date.now().toString(16) + Math.random().toString(16).slice(2);
}

export {
  generateRibbon,
  sampleHybridPalette,
  sampleConditionalPalette,
  sampleShellPalette,
  lightnessShellChance,
  widths,
  placeAnchor,
  anchorInRange,
  rng,
  toLch,
  labPoint,
  rgb,
  hex,
};
