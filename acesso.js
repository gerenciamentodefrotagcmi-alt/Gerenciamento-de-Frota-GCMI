'use strict';
window.Cloud = (()=>{
  let client=null,perfil=null,ready=false,lastActivity=Date.now(),lastPing=0,busy=0,closing=false;
  const q=s=>document.querySelector(s);
  const status=t=>q('#acessoStatus').textContent=t;
  const memory=new Map();
  const allowedHandler=/^(?:(?:abrirModalComprovantes|abrirModalTrocaOleo|abrirSubGraficoPizzaVtr|excluirComprovante|excluirComprovanteConsulta|excluirComprovanteModal|imprimirComprovanteAbastecimento|moverTipo|removerTipo|toggleTodosVtr|toggleVtr|visualizarComprovante|visualizarComprovanteAbastecimento|visualizarComprovanteModal)\((?:-?\d+(?:,-?\d+)*)?\)|fecharSplashCard\(\);abrirModalAbastecimento\(\d+\)|fecharModalAlertasVencidos\(\);setScreen\('trocaOleo'\))$/;
  // Os templates antigos usam alguns eventos inline numéricos. Só esses comandos
  // conhecidos são conservados; textos de cadastros não podem criar código executável.
  DOMPurify.addHook('uponSanitizeAttribute',(_node,data)=>{
    if(data.attrName.startsWith('on')) data.keepAttr=data.attrName==='onclick'&&allowedHandler.test(data.attrValue);
  });
  function sanitize(html){return DOMPurify.sanitize(String(html),{ADD_ATTR:['onclick'],WHOLE_DOCUMENT:false});}
  const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  Object.defineProperty(Element.prototype,'innerHTML',{...descriptor,set(value){
    const tag=this.tagName.toLowerCase();
    if(['tbody','thead','tfoot','tr'].includes(tag)){
      const wrap=tag==='tr'?'<table><tbody><tr>'+value+'</tr></tbody></table>':'<table><'+tag+'>'+value+'</'+tag+'></table>';
      const doc=new DOMParser().parseFromString(sanitize(wrap),'text/html');
      descriptor.set.call(this,doc.querySelector(tag)?.innerHTML||'');
    }else descriptor.set.call(this,sanitize(value));
  }});
  const insert=Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML=function(pos,html){return insert.call(this,pos,sanitize(html));};
  function writeDocument(win,html){win.document.write(DOMPurify.sanitize(String(html),{WHOLE_DOCUMENT:true}));}
  async function rpc(name,args={}){
    if(!ready && name!=='gcm_entrar') throw new Error('Entre com sua conta autorizada.');
    const writing=/^gcm_(gravar|arquivar|definir)/.test(name);
    if(writing){busy++;q('#gravandoNuvem').hidden=false;}
    try{
      const {data,error}=await client.rpc(name,args);
      if(error){if(error.code==='42501' && !closing) await logout('Sua sessão ou permissão não é mais válida.');throw new Error(error.message||'Operação não concluída.');}
      return data;
    }finally{if(writing){busy--;const el=q('#gravandoNuvem');if(el)el.hidden=busy>0;}}
  }
  function fail(error){
    if(closing)return;
    q('#falhaMensagem').textContent='A operação não foi confirmada pelo servidor. '+(error?.message||'Verifique a conexão.')+' Recarregue os dados antes de continuar.';
    q('#falhaNuvem').hidden=false;
  }
  async function logout(reason='Sessão encerrada.'){
    if(closing)return;closing=true;ready=false;perfil=null;
    document.body.classList.remove('autenticado');const access=q('#acesso');access.hidden=false;document.body.replaceChildren(access);
    await Promise.race([(async()=>{try{await client?.rpc('gcm_sair');}catch{}try{await client?.auth.signOut({scope:'local'});}catch{}})(),new Promise(resolve=>setTimeout(resolve,5000))]);
    memory.clear();sessionStorage.setItem('gcm_mensagem_saida',reason);location.reload();
  }
  async function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Falha ao carregar a aplicação'));document.body.append(s);});}
  async function login(e){
    e.preventDefault();q('#entrar').disabled=true;status('Verificando acesso…');
    try{
      const {data,error}=await client.auth.signInWithPassword({email:q('#emailAcesso').value.trim(),password:q('#senhaAcesso').value});
      q('#senhaAcesso').value='';
      if(error||!data.session)throw new Error('Não foi possível entrar. Confira suas credenciais ou procure a administração.');
      const {data:p,error:permission}=await client.rpc('gcm_entrar');
      if(permission){await client.auth.signOut({scope:'local'});throw new Error('Conta sem autorização ou sessão encerrada. Procure a administração.');}
      perfil=p;ready=true;lastActivity=Date.now();
      q('#identidadeSessao').textContent=data.user.email+' · '+perfil;
      q('#administrarAcesso').hidden=perfil!=='administrador';
      await loadScript('./db-remoto.js');await loadScript('./app.js');await loadScript('./responsaveis.js');await window.iniciarAplicacao();
      document.body.classList.add('autenticado');q('#acesso').hidden=true;
      permissions();
      client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'&&ready)void logout('Sessão encerrada.');});
    }catch(error){status(error.message);if(ready)fail(error);}
    finally{q('#entrar').disabled=false;}
  }
  function permissions(){
    // Conveniência de interface. A autorização definitiva está nas funções SQL.
    for(const id of ['btnResetDemo','btnLimparLancamentos','btnMesclar']){const el=q('#'+id);if(el)el.hidden=true;}
    const imp=q('#btnImportar');if(imp){imp.hidden=false;imp.disabled=perfil!=='administrador';imp.title=perfil==='administrador'?'Restaurar todos os registros e comprovantes':'Somente o administrador pode importar backups';}
    for(const el of document.querySelectorAll('.btn-danger'))el.hidden=perfil!=='administrador';
    if(perfil==='consulta')for(const el of document.querySelectorAll('form input,form select,form textarea,form button')){if(el.closest('#formAbastecimento,#formVeiculo,#formMotorista,#formSetor,#formCombustivel,#formTrocaOleo'))el.disabled=true;}
    if(perfil!=='administrador')for(const el of document.querySelectorAll('#cadastros form input,#cadastros form select,#cadastros form textarea,#cadastros form button'))el.disabled=true;
  }
  function mutationAllowed(admin=false){if(!ready||perfil==='consulta'||(admin&&perfil!=='administrador'))throw new Error('Seu perfil não permite esta operação.');}
  async function manage(){
    try{
      const members=await rpc('gcm_membros');q('#gestaoAcesso').hidden=false;
      q('#listaAcessos').replaceChildren();
      for(const m of members){const row=document.createElement('tr');for(const text of [m.email,m.perfil,m.ativo?'Ativo':'Bloqueado']){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}q('#listaAcessos').append(row);}
      const events=await rpc('gcm_auditoria');q('#listaAuditoria').textContent=events.map(x=>`${new Date(x.instante).toLocaleString('pt-BR')} · ${x.usuario||'sistema'} · ${x.acao}\n${JSON.stringify(x.detalhe)}`).join('\n\n');
    }catch(e){alert(e.message);}
  }
  document.addEventListener('submit',e=>{if(!ready)return;const form=e.target;if(form.closest('.app-shell')&&(perfil==='consulta'||(perfil!=='administrador'&&form.closest('#cadastros')))){e.preventDefault();e.stopImmediatePropagation();alert('Seu perfil não permite alterações nesta área.');}},true);
  for(const event of ['pointerdown','keydown','wheel'])document.addEventListener(event,e=>{if(e.isTrusted)lastActivity=Date.now();},{passive:true});
  setInterval(async()=>{
    if(!ready||closing)return;
    if(Date.now()-lastActivity>15*60*1000){await logout('Sessão encerrada após 15 minutos sem atividade.');return;}
    if(lastActivity>lastPing&&Date.now()-lastPing>60000){lastPing=Date.now();try{const p=await rpc('gcm_sessao');if(p!==perfil)await logout('Permissões alteradas. Entre novamente.');}catch(e){if(!closing)fail(e);}}
  },1000);
  window.addEventListener('unhandledrejection',e=>{e.preventDefault();fail(e.reason);});
  q('#formAcesso').addEventListener('submit',login);
  q('#sairSessao').addEventListener('click',()=>logout());
  q('#recarregarNuvem').addEventListener('click',()=>logout('Entre novamente para carregar a versão atual dos dados.'));
  q('#administrarAcesso').addEventListener('click',manage);
  q('#fecharGestao').addEventListener('click',()=>q('#gestaoAcesso').hidden=true);
  q('#formPermissao').addEventListener('submit',async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;try{await rpc('gcm_definir_membro',{p_email:q('#emailMembro').value,p_perfil:q('#perfilMembro').value,p_ativo:q('#ativoMembro').value==='true'});await manage();q('#statusPermissao').textContent='Permissão atualizada; sessões anteriores da conta foram encerradas.';}catch(err){q('#statusPermissao').textContent=err.message;}finally{btn.disabled=false;}});
  const cfg=window.GCM_CONFIG||{};
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.url)||!cfg.publishableKey){
    q('#entrar').disabled=true;status('Homologação: aguardando configuração do projeto Supabase. O acesso permanece bloqueado.');
  }else{
    client=supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,detectSessionInUrl:true,flowType:'implicit',storage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)}}});
    Recuperacao.init(client);
    status(sessionStorage.getItem('gcm_mensagem_saida')||'Use sua conta individual autorizada.');sessionStorage.removeItem('gcm_mensagem_saida');
  }
  return {rpc,fail,sanitize,writeDocument,permissions,mutationAllowed,get perfil(){return perfil;},get ready(){return ready;}};
})();
