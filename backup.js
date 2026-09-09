'use strict';
window.FleetBackup=(()=>{
 let busy=false;
 const q=s=>document.querySelector(s);
 function progress(text){q('#backupProgresso').textContent=text;setImportStatus(text,'info');}
 function lock(value){busy=value;q('#backupEmCurso').hidden=!value;}
 async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function decode(d){
  if(!d||typeof d.b64!=='string'||!d.b64.length)throw Error('Comprovante sem conteúdo.');
  const b64=d.b64.replace(/\s/g,'');
  if(b64.length>28000000||b64.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(b64))throw Error('Conteúdo inválido: '+d.nome);
  const bin=atob(b64),bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  if(bytes.length<1||bytes.length>20*1024*1024||Number(d.tamanho)!==bytes.length)throw Error('Tamanho divergente: '+d.nome);
  return bytes;
 }
 async function validate(raw){
  validateImportedState(raw);
  if(!Array.isArray(raw._comprovantes))throw Error('Este arquivo não é um backup completo: falta a coleção de comprovantes.');
  if(raw._meta?.totalComprovantes!=null&&Number(raw._meta.totalComprovantes)!==raw._comprovantes.length)throw Error('Quantidade de comprovantes divergente.');
  const data=Object.fromEntries(Object.entries(raw).filter(([k])=>!k.startsWith('_')));
  if(data.trocasOleo==null)data.trocasOleo=[];
  if(data.tiposPrefixo==null)data.tiposPrefixo=['Vtr','MP'];
  const cols=['perfis','usuarios','combustiveis','setores','motoristas','veiculos','abastecimentos','trocasOleo'];
  const ids={};
  for(const k of cols){
   if(!Array.isArray(data[k]))throw Error('Coleção inválida: '+k);
   ids[k]=new Set();
   for(const x of data[k]){if(!x||!Number.isSafeInteger(x.id)||x.id<=0||ids[k].has(x.id))throw Error('Identificador inválido ou repetido em '+k);ids[k].add(x.id);}
  }
  for(const k of ['abastecimentos','trocasOleo'])for(const x of data[k]){
   if(!ids.veiculos.has(Number(x.veiculoId))||(k==='abastecimentos'&&!ids.motoristas.has(Number(x.motoristaId))))throw Error('Referência inexistente no lançamento '+x.id);
  }
  const docs=[],seen=new Set();let total=0;
  for(let i=0;i<raw._comprovantes.length;i++){
   const d=raw._comprovantes[i];progress('Conferindo comprovante '+(i+1)+' de '+raw._comprovantes.length+'…');
   const hasA=Number(d.abastecimentoId)>0,hasO=Number(d.trocaOleoId)>0;
   if(hasA===hasO)throw Error('Comprovante sem vínculo único: '+d.nome);
   const vinculo=hasA?'abastecimentos':'trocasOleo',registro=Number(hasA?d.abastecimentoId:d.trocaOleoId);
   if(!ids[vinculo].has(registro))throw Error('Lançamento do comprovante não encontrado: '+d.nome);
   const bytes=decode(d);total+=bytes.length;
   if(total>500*1024*1024)throw Error('Backup acima de 500 MB de anexos.');
   const tipo=bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':
    [137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x)?'image/png':
    String.fromCharCode(...bytes.slice(0,5))==='%PDF-'?'application/pdf':null;
   if(!tipo)throw Error('Formato de comprovante não suportado: '+d.nome);
   const sha256=await digest(bytes);
   if(d.sha256&&d.sha256!==sha256)throw Error('Integridade divergente: '+d.nome);
   const key=vinculo+':'+registro+':'+sha256;
   if(seen.has(key))throw Error('Comprovante duplicado no mesmo lançamento: '+d.nome+'. Utilize o backup saneado.');
   seen.add(key);docs.push({...d,vinculo,registro,sha256,tipo});
  }
  return {data,docs,total};
 }
 async function build(info){
  const list=info.anexos;
  const blob=await buildBackupBlob(info.dados,list,async d=>{
   progress('Exportando comprovante '+(list.indexOf(d)+1)+' de '+list.length+'…');
   const r=await Cloud.rpc('gcm_ler_anexo',{p_id:d.id});
   const doc={...d,b64:r.base64,abastecimentoId:d.vinculo==='abastecimentos'?d.registro:null,trocaOleoId:d.vinculo==='trocasOleo'?d.registro:null};
   const bytes=decode(doc);if(await digest(bytes)!==d.sha256)throw Error('O comprovante mudou durante a exportação. Tente novamente.');
   return {...doc,blob:new Blob([bytes],{type:d.tipo})};
  });
  const end=await Cloud.rpc('gcm_backup_info');
  if(end.token!==info.token)throw Error('A base mudou durante a exportação. Repita para obter uma cópia consistente.');
  return blob;
 }
 function counts(d,n){return d.abastecimentos.length+' abastecimentos · '+d.trocasOleo.length+' trocas de óleo · '+d.motoristas.length+' motoristas · '+d.veiculos.length+' veículos · '+n+' comprovantes';}
 function canonical(x){return JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}
 async function exportAll(){
  if(busy)return;lock(true);
  try{
   progress('Conferindo todos os registros no servidor…');await _saveQueue;
   const info=await Cloud.rpc('gcm_backup_info');
   const blob=await build(info);
   downloadBlob(blob,'frota-backup-completo-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
   setImportStatus('Backup completo gerado. '+counts(info.dados,info.anexos.length)+'. Confira o arquivo na pasta de downloads.','success');
  }catch(e){setImportStatus('Exportação não concluída: '+e.message,'error');}
  finally{lock(false);}
 }
 function review(payload,name){
  q('#resumoRestauracao').textContent=name+'\n'+counts(payload.data,payload.docs.length)+'\nComprovantes: '+(payload.total/1024/1024).toFixed(1)+' MB';
  q('#motivoRestauracao').value='';q('#confirmoRestauracao').checked=false;
  const dialog=q('#revisarRestauracao');dialog.showModal();
  return new Promise(resolve=>{
   const form=q('#formRestauracao');
   const done=value=>{dialog.close();form.removeEventListener('submit',submit);q('#cancelarRestauracao').removeEventListener('click',cancel);dialog.removeEventListener('cancel',cancel);resolve(value);};
   const cancel=e=>{e.preventDefault();done(null);};
   const submit=e=>{e.preventDefault();const motivo=q('#motivoRestauracao').value.trim();if(motivo.length<10){q('#motivoRestauracao').setCustomValidity('Descreva o motivo com pelo menos 10 caracteres.');q('#motivoRestauracao').reportValidity();return;}done(motivo);};
   q('#motivoRestauracao').oninput=()=>q('#motivoRestauracao').setCustomValidity('');
   form.addEventListener('submit',submit);q('#cancelarRestauracao').addEventListener('click',cancel);dialog.addEventListener('cancel',cancel);
  });
 }
 async function importFile(event){
  const file=event.target.files?.[0];if(!file||busy)return;
  let attemptedCommit=false;
  lock(true);
  try{
   Cloud.mutationAllowed(true);
   if(file.size>720*1024*1024)throw Error('Arquivo acima de 720 MB.');
   progress('Lendo e validando o backup…');
   const parsed=JSON.parse(await file.text()),payload=await validate(parsed);
   // O nome do arquivo e a prévia usam textContent, nunca HTML.
   q('#backupEmCurso').hidden=true;
   const motivo=await review(payload,file.name);
   if(!motivo){setImportStatus('Importação cancelada. Nenhum registro foi alterado.','warning');return;}
   q('#backupEmCurso').hidden=false;await _saveQueue;
   progress('Guardando uma cópia da base atual antes de restaurar…');
   const before=await Cloud.rpc('gcm_backup_info');
   const previous=await build(before);
   downloadBlob(previous,'frota-antes-da-importacao-'+Date.now()+'.json');
   const lote=await Cloud.rpc('gcm_restaurar_iniciar',{p_dados:payload.data,p_quantidade:payload.docs.length,p_token:before.token,p_motivo:motivo});
   for(let i=0;i<payload.docs.length;i++){
    const d=payload.docs[i];progress('Enviando comprovante '+(i+1)+' de '+payload.docs.length+'… A base atual permanece preservada.');
    await Cloud.rpc('gcm_restaurar_anexo',{p_lote:lote,p_ordem:i,p_vinculo:d.vinculo,p_registro:d.registro,p_nome:d.nome,p_base64:d.b64,p_sha256:d.sha256,p_tamanho:Number(d.tamanho),p_data:d.data||''});
   }
   progress('Conferindo e confirmando a restauração completa…');attemptedCommit=true;
   await Cloud.rpc('gcm_restaurar_concluir',{p_lote:lote});
   state=migrateState(await dbLoadState());remoteSnapshot=JSON.stringify(state);
   syncSelects();renderAll();Cloud.permissions();setScreen('config');
   const after=await Cloud.rpc('gcm_backup_info');
   if(canonical(after.dados)!==canonical(payload.data)||after.anexos.length!==payload.docs.length)throw Error('A confirmação requer nova conferência dos dados.');
   setImportStatus('Importação concluída e conferida. '+counts(after.dados,after.anexos.length)+'. Base anterior preservada com autoria e justificativa.','success');
  }catch(e){
   setImportStatus((attemptedCommit?'Não foi possível confirmar o resultado. Entre novamente e confira antes de repetir. ':'Importação não concluída; a base atual foi preservada. ')+e.message,'error');
   if(attemptedCommit)Cloud.fail(e);
  }finally{event.target.value='';lock(false);}
 }
 window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
 return {exportAll,importFile,validate,build};
})();
