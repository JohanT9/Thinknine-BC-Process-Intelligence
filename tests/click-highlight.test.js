const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const source = read('src/recorder/content.js');
const helper = source.slice(source.indexOf('  // Visual feedback'), source.indexOf('  function isTopDocument()'));
const events = {};
const hosts = [];
let callback;
let frameCallback;
let cancelledFrames = 0;
const context = { recording: true, sessionId: 'recording', innerWidth: 1000, innerHeight: 800,
  location: { href: "https://example.test/process" },
  getComputedStyle: () => ({ visibility: "visible", opacity: "1" }),
  requestAnimationFrame(fn) { frameCallback = fn; return 42; },
  cancelAnimationFrame() { cancelledFrames++; },
  clearTimeout() {}, setTimeout(fn) { callback = fn; return 1; },
  window: { addEventListener(name, fn) { events[name] = fn; } },
  document: { createElement() { return { style: { getPropertyValue(k) { return this[k]; }, setProperty(k,v) { this[k]=v; } },
    setAttribute(k,v) { this[k]=v; }, attachShadow() { return {}; },
    remove() { hosts.splice(hosts.indexOf(this),1); } }; },
    documentElement: { appendChild(host) { hosts.push(host); } } }
};
vm.createContext(context); vm.runInContext(helper, context);
const target = { isConnected: true, getClientRects: () => [1], getBoundingClientRect: () => ({ left: 20, top: 30, right: 120, bottom: 70, width: 100, height: 40 }) };
context.showClickHighlight(target, { detail: 1, clientX: 45, clientY: 45 });
assert.equal(hosts.length,1);
assert.equal(hosts[0].style.left,'17px');
assert.equal(hosts[0].style['pointer-events'],'none');
assert.equal(hosts[0]['aria-hidden'],'true');
const originalRect = target.getBoundingClientRect;
target.getBoundingClientRect = () => ({left:200,top:100,right:400,bottom:160,width:200,height:60});
frameCallback();
assert.equal(hosts[0].style.left,'197px');
assert.equal(hosts[0].style.width,'206px');
target.isConnected = false;
frameCallback(); assert.equal(hosts.length,0);
assert.ok(cancelledFrames > 0);
target.isConnected = true; target.getBoundingClientRect = originalRect;
context.showClickHighlight(target,{});
context.location.href += '/next'; frameCallback(); assert.equal(hosts.length,0);
context.showClickHighlight(target,{});
target.getClientRects = () => []; frameCallback(); assert.equal(hosts.length,0);
target.getClientRects = () => [1];
context.showClickHighlight(null,{detail:1,clientX:80,clientY:60});
assert.equal(hosts.length,1); assert.equal(hosts[0].style.width,'28px');
callback(); assert.equal(hosts.length,0);
vm.runInContext('captureUiHidden = true',context);
context.showClickHighlight(target,{}); assert.equal(hosts[0].style.display,'none');
events.scroll(); assert.equal(hosts.length,0);
vm.runInContext('showClickHighlights = false',context);
context.showClickHighlight(target,{}); assert.equal(hosts.length,0);
vm.runInContext('showClickHighlights = true; recording = false',context);
context.showClickHighlight(target,{}); assert.equal(hosts.length,0);
assert.match(source,/if \(!recording\) clearClickHighlight\(\)/);
assert.match(source,/showClickHighlights = changes\.t9_settings\.newValue\.showClickHighlights !== false/);


// Overlapping captures must not reveal another capture's highlight; suspended
// animation frames in hidden iframes still get a bounded acknowledgement.
context.recordingIndicator = { host: null };
context.requestAnimationFrame = () => {};
const visibility = source.slice(source.indexOf('    if (message.type === "T9_SET_INDICATOR_CAPTURE_VISIBILITY")'),
  source.indexOf('    return false;\n  });', source.indexOf('    if (message.type === "T9_SET_INDICATOR_CAPTURE_VISIBILITY")')));
vm.runInContext('function visibility(message, sendResponse) {' + visibility + '}', context);
vm.runInContext('recording = true', context);
context.showClickHighlight(target, {});
let acknowledgements = 0;
const sendResponse = () => { acknowledgements++; };
context.visibility({type:'T9_SET_INDICATOR_CAPTURE_VISIBILITY',captureId:'a',hidden:true},sendResponse);
callback(); callback();
assert.equal(acknowledgements,1);
context.visibility({type:'T9_SET_INDICATOR_CAPTURE_VISIBILITY',captureId:'b',hidden:true},sendResponse);
context.visibility({type:'T9_SET_INDICATOR_CAPTURE_VISIBILITY',captureId:'a',hidden:false},sendResponse);
assert.equal(hosts[0].style.display,'none');
context.visibility({type:'T9_SET_INDICATOR_CAPTURE_VISIBILITY',captureId:'b',hidden:false},sendResponse);
assert.equal(hosts[0].style.display,'block');
context.clearClickHighlight();

// Capture waits for every injected frame to hide its UI, and restores on errors.
const background=read('src/recorder/background.js');
const captureSource=background.slice(background.indexOf('async function capture(tabId)'), background.indexOf('async function captureStepRepairScreenshot'));
(async()=>{
  for(const failure of [false,true]) {
    const hidden=new Set(); const restored=[];
    const sandbox={ crypto: require("node:crypto").webcrypto, screenshotStats:{errors:0}, setDebug:async()=>{}, chrome:{
      webNavigation:{getAllFrames:async()=>[{frameId:0},{frameId:5},{frameId:8}]},
      tabs:{get:async()=>({active:true,windowId:2}), sendMessage:async(id,m,{frameId})=>{
        if(frameId===8) throw Error('Frame without content script');
        if(m.hidden) { await Promise.resolve(); hidden.add(frameId); }
        else { hidden.delete(frameId); restored.push(frameId); }
      },captureVisibleTab:async()=>{
        assert.deepEqual([...hidden].sort(),[0,5]);
        if(failure) throw Error('Capture failed');
        return 'image';
      }}
    }};
    vm.runInNewContext(captureSource,sandbox);
    assert.equal(await sandbox.capture(1),failure?null:'image');
    assert.equal(hidden.size,0); assert.deepEqual(restored.sort(),[0,5]);
  }
  console.log('Click highlights: input transparency, fallback, expiry, settings and all-frame screenshot cleanup passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
