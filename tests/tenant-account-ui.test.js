const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/ui/license-status.js'),'utf8').replace(/initialize\(\);\s*$/,'');
const registry=require('../src/engine/language-registry');
(async()=>{
 for(const locale of registry.supported('ui').map(l=>l.locale)){
  const elements={};const sent=[];
  const get=id=>elements[id] ||= {value:'tenant',textContent:'',addEventListener(event,fn){this[event]=fn;}};
  const sandbox={document:{getElementById:get},URLSearchParams,location:{search:''},Date,Intl,
    T9LanguageRegistry:registry,T9UiI18n:{DEFAULT_LOCALE:locale,translate:()=> 'Consultant'},
    chrome:{runtime:{sendMessage(message,cb){sent.push(message.type);cb({ok:true,configured:true,signedIn:false});}}}};
  vm.createContext(sandbox);
  vm.runInContext(source+`\nfunction setup(active,signedIn) {licenses=[{tenantId:'tenant',allowed:active,expiresAt:Date.now()+10000}]; accountStatus={configured:true,signedIn,license:{status:'expired'}};renderAccountStatus();}`,sandbox);
  sandbox.setup(true,false);
  assert.equal(get('consultantTitle').textContent,registry.translate('Microsoft account',locale,'Microsoft-konto'));
  assert.equal(get('tenantAccountHelp').hidden,false);
  assert.ok(get('tenantAccountHelp').textContent.length>30);
  await get('consultantSignIn').click();assert.equal(sent[0],'T9_MICROSOFT_SIGN_IN');
  sandbox.setup(true,true);
  assert.equal(get('consultantStatus').textContent,registry.translate('Microsoft sign-in is complete.',locale,'Microsoft-inloggningen är klar.'));
  sandbox.setup(false,false);sent.length=0;
  assert.equal(get('tenantAccountHelp').hidden,true);
  await get('consultantSignIn').click();assert.equal(sent[0],'T9_CONSULTANT_LICENSE_SIGN_IN');
 }
 console.log('Active tenant uses account sign-in without consultant registration in all eight languages.');
})().catch(error=>{console.error(error);process.exitCode=1;});
