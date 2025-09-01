// Staple — Component Management Plugin for Figma
// Smart merge for multiples, single object → single component (incl. instances),
// and full state preservation (root-first copy + swap for instances).

// ---------------------------------- constants ----------------------------------
var TARGET_KEY = 'staple/target';

// Name alias helpers to tolerate tiny naming differences in strict checks
var NAME_ALIASES = [
  ["title","label","heading"],
  ["desc","subtitle","description"]
];

// Properties we copy when strict match succeeds
var COPY_SURFACE = {
  text: true,
  fills: true,
  strokes: true,
  effects: true,
  corners: true,
  layout: true,
  constraints: true,
  visibilityOpacity: true,
  rotation: true,
  blendMode: true
};

// ---------------------------------- storage ------------------------------------
async function saveTarget(obj) { try { await figma.clientStorage.setAsync(TARGET_KEY, obj ? obj : null); } catch (e) {} }
async function getTarget() { try { var v = await figma.clientStorage.getAsync(TARGET_KEY); return v ? v : null; } catch (e) { return null; } }

// ---------------------------------- utils --------------------------------------
function notifyError(e){ var m=(e && e.message)?e.message:String(e); figma.notify('Error: '+m,{error:true}); }
function note(msg){ figma.notify(msg); }

function absoluteXY(n){ var m=n.absoluteTransform; return {x:m[0][2], y:m[1][2]}; }
function resizeNode(n,w,h){ try{ if(typeof n.resize==='function') n.resize(w,h); else if(typeof n.resizeWithoutConstraints==='function') n.resizeWithoutConstraints(w,h);}catch(e){} }
function hasAncestorInstance(n){ var p=n.parent; while(p){ if(p.type==='INSTANCE') return true; p=p.parent; } return false; }

// allow INSTANCE as source; only exclude types Figma can’t convert
function isConvertible(n){
  return !['COMPONENT_SET','PAGE','SECTION','SLICE','STICKY','COMPONENT'].includes(n.type);
}

function deepClone(v){ try{ return JSON.parse(JSON.stringify(v)); }catch(e){ return v; } }

function norm(s){ return (s||'').toLowerCase().replace(/\s+/g,' ').trim(); }
function namesEquivalent(a,b){
  a = norm(a); b = norm(b);
  if (a===b) return true;
  for (var i=0;i<NAME_ALIASES.length;i++){
    var g = NAME_ALIASES[i], A=false, B=false;
    for (var j=0;j<g.length;j++){
      var v = norm(g[j]);
      if (v===a) A=true;
      if (v===b) B=true;
    }
    if (A && B) return true;
  }
  return false;
}

// base child accessor
function childList(n){ return (('children' in n) && n.children) ? n.children : []; }

// Strict structure equality (used to decide if we can safely copy subtree)
function structuresStrict(aRoot, bRoot){
  function walk(a,b){
    var ac = childList(a), bc = childList(b);
    if (ac.length !== bc.length) return false;
    for (var i=0;i<ac.length;i++){
      var an=ac[i], bn=bc[i];
      if (an.type !== bn.type) return false;
      if (!namesEquivalent(an.name||'', bn.name||'')) return false;
      if (!walk(an,bn)) return false;
    }
    return true;
  }
  return walk(aRoot,bRoot);
}

// -------------------------------- signature normalization -----------------------
var MIN_SIGNATURE_AREA = 4;   // ignore ~2x2 crumbs
var SMALL_DECOR_LIMIT  = 16;  // tiny lines

function canonicalName(s) {
  s = (s || '').toLowerCase().trim();
  for (var i = 0; i < NAME_ALIASES.length; i++) {
    var g = NAME_ALIASES[i];
    for (var j = 0; j < g.length; j++) if (s === g[j]) return g[0];
  }
  // strip “/ 01”, “copy”, trailing numerals noise
  s = s.replace(/\s*\/\s*\d+$/,'').replace(/\s+copy(\s*\d+)?$/,'').replace(/\s+\d+$/,'');
  return s;
}

function isBenignWrapper(n) {
  if ((n.type !== 'FRAME' && n.type !== 'GROUP') || !('children' in n) || n.children.length !== 1) return false;
  try {
    if (n.type === 'FRAME') {
      var hasStyle = (n.fills && n.fills.length) || (n.strokes && n.strokes.length) || (n.effects && n.effects.length) ||
                     (n.backgrounds && n.backgrounds.length) || (n.cornerRadius && n.cornerRadius !== 0) || n.clipsContent;
      if (hasStyle) return false;
      if (n.layoutMode && n.layoutMode !== 'NONE') return false; // order meaningful
    }
  } catch(e) {}
  return true;
}
function unwrapBenign(n){ var cur=n; while(isBenignWrapper(cur)) cur=cur.children[0]; return cur; }

function childListCanonical(n){
  if (!('children' in n) || !n.children) return [];
  var out=[];
  for (var i=0;i<n.children.length;i++){
    var c=n.children[i];
    if ('visible' in c && c.visible===false) continue;
    if ('opacity' in c && c.opacity===0) continue;
    var area=(c.width && c.height) ? c.width*c.height : 0;
    if (area>0 && area<MIN_SIGNATURE_AREA) continue;
    if (c.type==='LINE' && area>0 && area<SMALL_DECOR_LIMIT) continue;
    out.push(c);
  }
  return out;
}

function instanceKeyOrType(n){
  if (n.type==='INSTANCE'){
    try{
      var mc = n.mainComponent || (typeof n.getMainComponentAsync==='function' ? n.getMainComponentAsync() : null);
      if (mc && mc.key) return 'INSTANCE<' + mc.key + '>';
    }catch(e){}
    return 'INSTANCE';
  }
  return n.type;
}

function shouldSortChildren(n){
  if (n.type==='GROUP') return true;
  if (n.type==='FRAME' && n.layoutMode==='NONE') return true;
  return false;
}

// Normalized signature: wrapper/crumb aware + alias names + stable order (when order isn’t meaningful)
function signature(root){
  function nodeSig(n){
    n = unwrapBenign(n);
    var t = instanceKeyOrType(n);
    var nm = canonicalName(n.name||'');
    var kids = childListCanonical(n);
    if (shouldSortChildren(n)){
      kids = kids.slice().sort(function(a,b){
        var ta=instanceKeyOrType(a), tb=instanceKeyOrType(b);
        if (ta!==tb) return ta<tb?-1:1;
        var na=canonicalName(a.name||''), nb=canonicalName(b.name||'');
        return na<nb?-1:(na>nb?1:0);
      });
    }
    return { t:t, n:nm, k:kids.map(nodeSig) };
  }
  return JSON.stringify(nodeSig(root));
}

// ---------------------------------- overrides ----------------------------------
async function loadFontsForText(n){
  try{
    var len=n.characters ? n.characters.length : 0;
    var fns=n.getRangeAllFontNames(0,len);
    for (var i=0;i<fns.length;i++){ try{ await figma.loadFontAsync(fns[i]); }catch(e){} }
  }catch(e){}
}

async function copyTextProperties(fromNode, toNode) {
  if (fromNode.type !== 'TEXT' || toNode.type !== 'TEXT') return 0;
  try {
    const segments = fromNode.getStyledTextSegments(['fontName']);
    const uniqueFonts = new Set();
    for (const seg of segments) {
      uniqueFonts.add(JSON.stringify(seg.fontName));
    }
    for (const fontStr of uniqueFonts) {
      const font = JSON.parse(fontStr);
      await figma.loadFontAsync(font);
    }
    toNode.characters = fromNode.characters;
    const fullSegments = fromNode.getStyledTextSegments(['fontName', 'fontSize', 'textDecoration', 'textCase', 'lineHeight', 'letterSpacing', 'fills', 'textStyleId', 'hyperlink']);
    for (const seg of fullSegments) {
      const { start, end } = seg;
      if (seg.fontName) toNode.setRangeFontName(start, end, seg.fontName);
      if (seg.fontSize !== undefined) toNode.setRangeFontSize(start, end, seg.fontSize);
      if (seg.textDecoration) toNode.setRangeTextDecoration(start, end, seg.textDecoration);
      if (seg.textCase) toNode.setRangeTextCase(start, end, seg.textCase);
      if (seg.lineHeight) toNode.setRangeLineHeight(start, end, seg.lineHeight);
      if (seg.letterSpacing) toNode.setRangeLetterSpacing(start, end, seg.letterSpacing);
      if (seg.fills) toNode.setRangeFills(start, end, seg.fills);
      if (seg.textStyleId) toNode.setRangeTextStyleId(start, end, seg.textStyleId);
      if (seg.hyperlink) toNode.setRangeHyperlink(start, end, seg.hyperlink);
    }
    return 1;
  } catch(e) {
    console.log('Text copy error:', e);
    return 0;
  }
}

async function copyOverrides(fromNode, toNode){
  var touched=0;

  // TEXT content + style
  if (COPY_SURFACE.text && fromNode.type==='TEXT' && toNode.type==='TEXT'){
    touched += await copyTextProperties(fromNode, toNode);
  }

  if (COPY_SURFACE.visibilityOpacity){
    try{ if('visible'in toNode && 'visible'in fromNode){ toNode.visible=fromNode.visible; touched++; } }catch(e){}
    try{ if('opacity'in toNode && 'opacity'in fromNode){ toNode.opacity=fromNode.opacity; touched++; } }catch(e){}
  }

  if (COPY_SURFACE.fills){ try{ if('fills'in toNode && 'fills'in fromNode){ toNode.fills=deepClone(fromNode.fills); touched++; } }catch(e){} }
  if (COPY_SURFACE.strokes){
    try{ if('strokes'in toNode && 'strokes'in fromNode){ toNode.strokes=deepClone(fromNode.strokes); touched++; } }catch(e){}
    try{ if('strokeWeight'in toNode && 'strokeWeight'in fromNode){ toNode.strokeWeight=fromNode.strokeWeight; touched++; } }catch(e){}
    try{ if('strokeAlign'in toNode && 'strokeAlign'in fromNode){ toNode.strokeAlign=fromNode.strokeAlign; touched++; } }catch(e){}
  }
  if (COPY_SURFACE.effects){ try{ if('effects'in toNode && 'effects'in fromNode){ toNode.effects=deepClone(fromNode.effects); touched++; } }catch(e){} }

  if (COPY_SURFACE.corners){
    try{ if('cornerRadius'in toNode && 'cornerRadius'in fromNode){ toNode.cornerRadius=fromNode.cornerRadius; touched++; } }catch(e){}
    try{ if('cornerSmoothing'in toNode && 'cornerSmoothing'in fromNode){ toNode.cornerSmoothing=fromNode.cornerSmoothing; touched++; } }catch(e){}
  }

  if (COPY_SURFACE.constraints){ try{ if('constraints'in toNode && 'constraints'in fromNode){ toNode.constraints=deepClone(fromNode.constraints); touched++; } }catch(e){} }

  if (COPY_SURFACE.layout && toNode.type==='FRAME' && fromNode.type==='FRAME'){
    try{ toNode.layoutMode = fromNode.layoutMode; touched++; }catch(e){}
    try{ toNode.itemSpacing = fromNode.itemSpacing; touched++; }catch(e){}
    try{ toNode.paddingLeft = fromNode.paddingLeft; touched++; }catch(e){}
    try{ toNode.paddingRight = fromNode.paddingRight; touched++; }catch(e){}
    try{ toNode.paddingTop = fromNode.paddingTop; touched++; }catch(e){}
    try{ toNode.paddingBottom = fromNode.paddingBottom; touched++; }catch(e){}
    try{ toNode.primaryAxisAlignItems = fromNode.primaryAxisAlignItems; touched++; }catch(e){}
    try{ toNode.counterAxisAlignItems = fromNode.counterAxisAlignItems; touched++; }catch(e){}
  }

  if (COPY_SURFACE.rotation){ try{ if('rotation'in toNode && 'rotation'in fromNode){ toNode.rotation=fromNode.rotation; touched++; } }catch(e){} }
  if (COPY_SURFACE.blendMode){ try{ if('blendMode'in toNode && 'blendMode'in fromNode){ toNode.blendMode=fromNode.blendMode; touched++; } }catch(e){} }

  return touched;
}

// Loose copy: match children by type + canonical name
async function copyTreeLoose(fromRoot, toRoot){
  let changed = await copyOverrides(fromRoot, toRoot);
  const ac = childList(fromRoot), bc = childList(toRoot);
  const bMap = new Map();
  for (let b of bc) {
    const key = `${b.type}_${canonicalName(b.name || '')}`;
    if (!bMap.has(key)) bMap.set(key, []);
    bMap.get(key).push(b);
  }
  for (let a of ac) {
    const key = `${a.type}_${canonicalName(a.name || '')}`;
    if (bMap.has(key) && bMap.get(key).length > 0) {
      const b = bMap.get(key).shift();
      changed += await copyTreeLoose(a, b);
    }
  }
  return changed;
}

// Copy overrides for the root AND descendants (pre-order; root first)
async function copyTreeStrict(fromRoot, toRoot){
  async function walk(a,b){
    let changed = 0;
    changed += await copyOverrides(a, b);
    const ac = childList(a), bc = childList(b);
    const len = Math.min(ac.length, bc.length);
    for (let i = 0; i < len; i++){
      changed += await walk(ac[i], bc[i]);
    }
    return changed;
  }
  let changed = await walk(fromRoot, toRoot);
  if (changed === 0) {
    // Fallback: partial surface-level copy if strict subtree copy didn't touch anything
    changed += await copyOverrides(fromRoot, toRoot);
  }
  return changed;
}

// --------------------- component creation helpers (no detach/flatten) ----------
async function createSingleComponentFromFrame(frame){
  var parent=frame.parent||figma.currentPage, idx=parent.children.indexOf(frame);
  var fAbs=absoluteXY(frame);
  var comp=figma.createComponent(); comp.name=frame.name||'Component';

  var props=['fills','strokes','strokeWeight','strokeAlign','strokeCap','strokeJoin','strokeDashes','strokeGeometry','strokeMiterLimit','effects','backgrounds','cornerRadius','cornerSmoothing','paddingLeft','paddingRight','paddingTop','paddingBottom','itemSpacing','layoutMode','clipsContent','primaryAxisSizingMode','counterAxisSizingMode','primaryAxisAlignItems','counterAxisAlignItems','layoutGrids','gridStyleId'];
  for (var i=0;i<props.length;i++){ var p=props[i]; if(p in frame){ try{ var v=frame[p]; comp[p]=(Array.isArray(v)||(typeof v==='object'&&v!==null))?JSON.parse(JSON.stringify(v)):v; }catch(e){} } }

  parent.insertChild(Math.max(0,idx),comp); resizeNode(comp,frame.width,frame.height); comp.x=fAbs.x; comp.y=fAbs.y;
  var kids=frame.children.slice();
  for (var k=0;k<kids.length;k++){ var ch=kids[k]; var a=absoluteXY(ch); comp.appendChild(ch); ch.x=a.x-fAbs.x; ch.y=a.y-fAbs.y; }
  frame.remove();

  var inst=comp.createInstance(); parent.insertChild(Math.max(0,idx),inst);
  inst.x=fAbs.x; inst.y=fAbs.y; resizeNode(inst,comp.width,comp.height);
  comp.x+=40; comp.y+=40;
  figma.currentPage.selection=[inst];
  return {component: comp, instance: inst};
}

// Instance-safe creator: build a new main from the instance’s main, then copy overrides
async function createComponentFromInstanceAndReplace(instanceNode, name){
  var parent=instanceNode.parent||figma.currentPage, idx=parent.children.indexOf(instanceNode);
  var abs=absoluteXY(instanceNode);
  var w=instanceNode.width, h=instanceNode.height;

  var comp=figma.createComponent(); comp.name=name||'Component';
  parent.insertChild(Math.max(0,idx+1), comp);
  comp.x=abs.x+40; comp.y=abs.y+40; resizeNode(comp, w, h);

  let main=null; try{ main = await instanceNode.getMainComponentAsync(); }catch(e){}
  if (main){
    try{ comp.fills = deepClone(main.fills||[]); }catch(e){}
    try{ comp.strokes = deepClone(main.strokes||[]); }catch(e){}
    try{ comp.effects = deepClone(main.effects||[]); }catch(e){}
    try{ comp.cornerRadius = main.cornerRadius; }catch(e){}
    try{ comp.cornerSmoothing = main.cornerSmoothing; }catch(e){}
    try{ comp.layoutMode = main.layoutMode; }catch(e){}
    try{
      comp.paddingLeft = main.paddingLeft; comp.paddingRight = main.paddingRight;
      comp.paddingTop = main.paddingTop; comp.paddingBottom = main.paddingBottom;
      comp.itemSpacing = main.itemSpacing;
      comp.primaryAxisAlignItems = main.primaryAxisAlignItems;
      comp.counterAxisAlignItems = main.counterAxisAlignItems;
    }catch(e){}
    for (var i=0;i<main.children.length;i++){
      try{ var c = main.children[i].clone(); comp.appendChild(c); }catch(e){}
    }
  }

  var inst=comp.createInstance();
  parent.insertChild(Math.max(0,idx), inst);
  inst.x=abs.x; inst.y=abs.y; resizeNode(inst, w, h);

  try{ await copyTreeLoose(instanceNode, inst); }catch(e){ console.log('Copy loose error in create from instance:', e); }
  try{ instanceNode.remove(); }catch(e){}
  figma.currentPage.selection=[inst];

  return { component: comp, instance: inst };
}

// Non-instance creator
async function createComponentFromSingleNodeAndReplace(node, name){
  if (node.type === 'INSTANCE'){
    return await createComponentFromInstanceAndReplace(node, name);
  }
  var parent=node.parent||figma.currentPage, idx=parent.children.indexOf(node);
  var abs=absoluteXY(node);
  var comp=figma.createComponent(); comp.name=name||'Component';
  parent.insertChild(Math.max(0,idx+1),comp);
  comp.x=abs.x+40; comp.y=abs.y+40; resizeNode(comp,node.width,node.height);

  try{
    var clone=node.clone(); comp.appendChild(clone);
    clone.x=0; clone.y=0;
  }catch(e){}

  var inst=comp.createInstance();
  parent.insertChild(Math.max(0,idx),inst);
  inst.x=abs.x; inst.y=abs.y; resizeNode(inst,comp.width,comp.height);
  try{ node.remove(); }catch(e){}
  figma.currentPage.selection=[inst];
  return {component: comp, instance: inst};
}

// -------------------------- attach (preserve states) ----------------------------
function pickClosestVariantForNode(componentNode, w, h){
  if (componentNode.type==='COMPONENT') return componentNode;
  var set=componentNode, best=null, score=1e15;
  for (var i=0;i<set.children.length;i++){
    var v=set.children[i]; if(v.type!=='COMPONENT') continue;
    var s=Math.abs(v.width-w)+Math.abs(v.height-h);
    if (s<score){ score=s; best=v; }
  }
  if (best) return best;
  for (var j=0;j<set.children.length;j++){ if (set.children[j].type==='COMPONENT') return set.children[j]; }
  return null;
}

async function attachNodePreservingState(node, component){
  var parent=node.parent, idx=parent.children.indexOf(node);
  var pos=absoluteXY(node); var w=node.width, h=node.height;
  var chosen = pickClosestVariantForNode(component,w,h) || component;

  if (node.type === 'INSTANCE') {
    try {
      await node.swapComponent(chosen);
      resizeNode(node,w,h); node.x=pos.x; node.y=pos.y;
      console.log('Swap successful for instance');
      return node;
    } catch(e) { 
      console.log('Swap failed, falling back:', e);
      /* fallback below */ 
    }
  }

  var inst = chosen.createInstance();
  parent.insertChild(idx, inst);
  inst.x=pos.x; inst.y=pos.y; resizeNode(inst,w,h);

  const isStrict = structuresStrict(node, inst);
  console.log('Structures strict match:', isStrict);

  if (isStrict) {
    try{ await copyTreeStrict(node, inst); console.log('Strict copy done'); }catch(e){ console.log('Strict copy error:', e); }
  } else {
    try{ await copyTreeLoose(node, inst); console.log('Loose copy done'); }catch(e){ console.log('Loose copy error:', e); }
  }
  try{ node.remove(); }catch(e){}
  return inst;
}

// ---------- conservative similarity helpers (for second-pass merge) ------------
var COUNTED_TYPES = ["TEXT","RECTANGLE","ELLIPSE","LINE","VECTOR","STAR","POLYGON","FRAME","GROUP","COMPONENT","INSTANCE"];

function countTypes(root){
  var counts = Object.create(null);
  for (var i=0;i<COUNTED_TYPES.length;i++){ counts[COUNTED_TYPES[i]] = 0; }
  (function walk(n){
    if (counts[n.type]!==undefined) counts[n.type]++;
    var kids=childList(n); for (var k=0;k<kids.length;k++) walk(kids[k]);
  })(root);
  return counts;
}
function sumCounts(c){ var s=0; for (var k in c) s+=c[k]; return s; }
function l1Dist(a,b){ var d=0; for (var k in a) d += Math.abs((a[k]||0)-(b[k]||0)); return d; }
function aspect(n){ return (n && n.width && n.height && n.height!==0) ? (n.width/n.height) : 1; }
function leafCount(n){ var kids=childList(n); if(!kids.length) return 1; var s=0; for (var i=0;i<kids.length;i++) s+=leafCount(kids[i]); return s; }
function treeDepth(n){ var kids=childList(n); if(!kids.length) return 1; var md=0; for (var i=0;i<kids.length;i++){ var d=treeDepth(kids[i]); if (d>md) md=d; } return 1+md; }

function similarityScoreConservative(aRoot, bRoot){
  var A = countTypes(aRoot), B = countTypes(bRoot);
  var total = Math.max(1, sumCounts(A) + sumCounts(B));
  var typeSim = 1 - (l1Dist(A,B) / total);
  var ad = treeDepth(aRoot), bd = treeDepth(bRoot);
  var depthSim = 1 - (Math.abs(ad-bd)/Math.max(1, Math.max(ad,bd)));
  var al = leafCount(aRoot), bl = leafCount(bRoot);
  var leafSim = 1 - (Math.abs(al-bl)/Math.max(1, Math.max(al,bl)));
  var aspA = aspect(aRoot), aspB = aspect(bRoot);
  var aspectSim = Math.min(aspA,aspB)/Math.max(aspA,aspB);
  var score = (0.5*typeSim) + (0.25*leafSim) + (0.15*depthSim) + (0.10*aspectSim);
  if (score < 0) score = 0; if (score > 1) score = 1;
  return score;
}

// --------------------------- MERGE TO SINGLE COMPONENT --------------------------
async function mergeToSingleFromSelection(){
  var sel=figma.currentPage.selection;
  if(!sel.length){ note('Select one or more layers first.'); return; }

  // Collect convertible, non-nested items
  var items=[];
  for (var i=0;i<sel.length;i++){
    var n=sel[i];
    if (n.locked) continue;
    if (n.parent && isConvertible(n) && !hasAncestorInstance(n)) items.push(n);
  }
  if (!items.length){ note('No convertible objects in the selection.'); return; }

  // PASS 1: normalized strict buckets
  var buckets=new Map();
  for (var j=0;j<items.length;j++){
    var sig=signature(items[j]);
    if (!buckets.has(sig)) buckets.set(sig, []);
    buckets.get(sig).push(items[j]);
  }

  // PASS 2: conservative merge of buckets that are effectively the same
  var entries = [];
  for (const [sig, nodes] of buckets) entries.push({ sig, nodes });

  var parentUF = entries.map((_,idx)=>idx);
  function findUF(x){ while(parentUF[x]!==x){ parentUF[x]=parentUF[parentUF[x]]; x=parentUF[x]; } return x; }
  function unionUF(a,b){ var ra=findUF(a), rb=findUF(b); if(ra!==rb) parentUF[rb]=ra; }

  var SIM_THRESHOLD = 0.85; // Lowered for more merging if needed
  var ASPECT_TOL    = 0.15; // Slightly increased tolerance

  for (var a=0;a<entries.length;a++){
    var A = entries[a].nodes[0];
    for (var b=a+1;b<entries.length;b++){
      var B = entries[b].nodes[0];
      var aspA = aspect(A), aspB = aspect(B);
      var aspectOK = (Math.min(aspA,aspB)/Math.max(aspA,aspB)) >= (1-ASPECT_TOL);
      if (!aspectOK) continue;
      var sim = similarityScoreConservative(A, B);
      if (sim >= SIM_THRESHOLD){ unionUF(a,b); }
    }
  }

  var merged = new Map();
  for (var e=0;e<entries.length;e++){
    var root = findUF(e);
    if (!merged.has(root)) merged.set(root, []);
    merged.get(root).push(...entries[e].nodes);
  }

  // Create component per merged bucket
  var mergedGroups=0, singles=0, totalInstances=0;
  for (const [root, nodes] of merged){
    var first=nodes[0];
    var baseName=(first.name||'Component').replace(/\s+/g,' ').trim() || 'Component';
    var comp, instFirst;

    if (first.type==='FRAME'){
      var r=await createSingleComponentFromFrame(first);
      comp=r.component; instFirst=r.instance;
    } else {
      var r2=await createComponentFromSingleNodeAndReplace(first, baseName);
      comp=r2.component; instFirst=r2.instance;
    }
    totalInstances++;

    for (var k=1;k<nodes.length;k++){
      var inst=await attachNodePreservingState(nodes[k], comp);
      if (inst) totalInstances++;
    }

    if (nodes.length>1) mergedGroups++; else singles++;
    figma.currentPage.selection=[instFirst];
  }

  // Toast summary
  if (mergedGroups>0 && singles===0){
    note('Merged '+mergedGroups+' similar group'+(mergedGroups>1?'s':'')+' into '+mergedGroups+
         ' single component'+(mergedGroups>1?'s':'')+' ('+totalInstances+' instance'+(totalInstances>1?'s':'')+').');
  } else if (mergedGroups>0 && singles>0){
    note('Merged '+mergedGroups+' group'+(mergedGroups>1?'s':'')+' and created '+singles+
         ' single component'+(singles>1?'s':'')+' ('+totalInstances+' instance'+(totalInstances>1?'s':'')+').');
  } else {
    note('Created '+singles+' single component'+(singles>1?'s':'')+' ('+totalInstances+
         ' instance'+(totalInstances>1?'s':'')+').');
  }
}

// ------------------------------ pick target ------------------------------------
async function pickTargetFromSelection(sel){
  for (var i=0;i<sel.length;i++) if (sel[i].type==='COMPONENT') return sel[i];
  for (var j=0;j<sel.length;j++){ var n=sel[j]; if(n.type==='INSTANCE'){ try{ var mc=await n.getMainComponentAsync(); if(mc) return mc; }catch(e){} } }
  for (var k=0;k<sel.length;k++){ var n2=sel[k]; if(n2.type==='COMPONENT_SET'){ for (var m=0;m<n2.children.length;m++){ var c=n2.children[m]; if(c.type==='COMPONENT') return c; } } }
  return null;
}
async function pickTarget(){
  var sel=figma.currentPage.selection;
  if(!sel.length){ note('Select a component / instance to pick.'); return; }
  var comp=await pickTargetFromSelection(sel);
  if(!comp){ note('Pick a Component/Variant or an Instance of it.'); return; }
  await saveTarget({ nodeId: comp.id, key: comp.key || null, name: comp.name });
  note('Picked target: ' + comp.name);
}

// ------------------------------- link to target --------------------------------
function pickClosestVariantForLink(componentNode, w, h){
  if (componentNode.type==='COMPONENT') return componentNode;
  var set=componentNode, best=null, score=1e15;
  for (var i=0;i<set.children.length;i++){
    var v=set.children[i]; if(v.type!=='COMPONENT') continue;
    var s=Math.abs(v.width-w)+Math.abs(v.height-h);
    if (s<score){ score=s; best=v; }
  }
  if (best) return best;
  for (var j=0;j<set.children.length;j++){ if (set.children[j].type==='COMPONENT') return set.children[j]; }
  return null;
}

async function linkToTarget(){
  var sel=figma.currentPage.selection;
  var target=null;
  var saved=await getTarget(); if(saved){ try{ target=await figma.getNodeByIdAsync(saved.nodeId); }catch(e){} }
  if(!target){ target=await pickTargetFromSelection(sel); }
  if(!target){ note('Pick target first (Pick Target Component), then run Link.'); return; }

  var attached=0, preserved=0, swapped=0, skipped=0;
  var nodes=[], instances=[];
  for (var i=0;i<sel.length;i++){
    var n=sel[i];
    if (n.locked){ skipped++; continue; }
    if (n.type==='INSTANCE' && n.parent && !hasAncestorInstance(n)) instances.push(n);
    else if (n.parent && isConvertible(n) && !hasAncestorInstance(n)) nodes.push(n);
    else skipped++;
  }

  var totalToProcess = nodes.length + instances.length;

  // Convert regular nodes into instances
  for (var a=0;a<nodes.length;a++){
    var node=nodes[a];
    var parent=node.parent, idx=parent.children.indexOf(node);
    var pos=absoluteXY(node); var w=node.width, h=node.height;

    var chosen=pickClosestVariantForLink(target,w,h); if(!chosen){ skipped++; continue; }
    var compatible = structuresStrict(node, chosen);

    var inst = chosen.createInstance();
    try{
      parent.insertChild(idx, inst);
      inst.x=pos.x; inst.y=pos.y; resizeNode(inst,w,h);

      var changed = 0;
      if (compatible){
        changed = await copyTreeStrict(node, inst);
      } else {
        changed = await copyTreeLoose(node, inst);
      }
      if (changed > 0) preserved++;

      node.remove(); attached++;
    }catch(e){
      try{ if(!inst.removed) inst.remove(); }catch(e2){}
      notifyError(e); return;
    }
  }

  // Swap selected instances to target variant (Figma preserves overrides)
  for (var b=0;b<instances.length;b++){
    var it=instances[b];
    var chosen2=pickClosestVariantForLink(target,it.width,it.height); if(!chosen2){ skipped++; continue; }
    try{ await it.swapComponent(chosen2); swapped++; }catch(e){ console.log('Swap error in link:', e); }
  }

  var attachedTotal = attached + swapped;

  if (totalToProcess === 0) {
    note('No convertible objects in the selection.');
  } else if (attachedTotal === totalToProcess) {
    note('All ' + attachedTotal + ' objects attached to "' + (target.name || 'Component') + '" successfully!');
  } else {
    note(attachedTotal + ' of ' + totalToProcess + ' objects attached to "' + (target.name || 'Component') + '". ' +
         (preserved ? (preserved + ' preserved, ') : '') + skipped + ' skipped.');
  }
}

// ---------------------------------- router -------------------------------------
figma.on('run', async function(ev){
  try{
    var cmd = (ev && ev.command) ? ev.command : '';
    if (cmd==='create-component')      await mergeToSingleFromSelection();
    else if (cmd==='pick-target')      await pickTarget();
    else if (cmd==='link-to-target')   await linkToTarget();
    else note('Nothing to do.');
  } catch (e) { notifyError(e); }
  finally { setTimeout(function(){ try{ figma.closePlugin(); }catch(e){} }, 0); }
});