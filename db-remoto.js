'use strict';
let remoteRevision=0,remoteSnapshot='';
async function dbLoadState(){const r=await Cloud.rpc('gcm_ler_estado');if(!r)throw new Error('Base de homologação não inicializada.');remoteRevision=r.revisao;remoteSnapshot=JSON.stringify(r.dados);return r.dados;}
async function dbSaveState(obj){const raw=JSON.stringify(obj);if(raw===remoteSnapshot)return;Cloud.mutationAllowed();remoteRevision=await Cloud.rpc('gcm_gravar_estado',{p_revisao:remoteRevision,p_dados:obj});remoteSnapshot=raw;}
async function metadata(){const list=await Cloud.rpc('gcm_listar_anexos');return list.map(d=>({...d,[d.vinculo==='abastecimentos'?'abastecimentoId':'trocaOleoId']:d.registro}));}
async function withBlob(d){const r=await Cloud.rpc('gcm_ler_anexo',{p_id:d.id});const bytes=Uint8Array.from(atob(r.base64.replace(/\s/g,'')),c=>c.charCodeAt(0));return {...d,blob:new Blob([bytes],{type:r.tipo})};}
async function idbGetAll(store){if(store!=='comprovantes')throw new Error('Coleção inválida');return metadata();}
async function idbGetAllKeys(store){return (await idbGetAll(store)).map(x=>x.id);}
async function idbGet(store,id){const d=(await idbGetAll(store)).find(x=>Number(x.id)===Number(id));return d?withBlob(d):null;}
async function dbGetComprovantes(id){const rows=(await metadata()).filter(x=>Number(x.abastecimentoId)===Number(id));return Promise.all(rows.map(withBlob));}
async function dbGetComprovantesOleo(id){const rows=(await metadata()).filter(x=>Number(x.trocaOleoId)===Number(id));return Promise.all(rows.map(withBlob));}
async function dbSalvarComprovante(doc){
 Cloud.mutationAllowed();await _saveQueue;
 if(doc.abastecimentoId&&doc.trocaOleoId)throw new Error('Comprovante deve ter um único vínculo.');
 const blob=doc.blob instanceof Blob?doc.blob:new Blob([doc.blob]);if(!blob.size||blob.size>20*1024*1024)throw new Error('Arquivo vazio ou acima de 20 MB.');
 const bytes=new Uint8Array(await blob.arrayBuffer());let b64='';for(let i=0;i<bytes.length;i+=24576)b64+=btoa(String.fromCharCode(...bytes.subarray(i,i+24576)));
 return Cloud.rpc('gcm_gravar_anexo',{p_vinculo:doc.abastecimentoId?'abastecimentos':'trocasOleo',p_registro:Number(doc.abastecimentoId||doc.trocaOleoId),p_nome:doc.nome,p_base64:b64});
}
async function dbExcluirComprovante(id){Cloud.mutationAllowed(true);const reason=prompt('Justifique o arquivamento do comprovante (mínimo 10 caracteres). O arquivo será preservado no histórico.');if(reason===null)return;await Cloud.rpc('gcm_arquivar_anexo',{p_id:Number(id),p_motivo:reason});}
async function dbExcluirComprovantesAbast(){/* O servidor exige arquivamento justificado antes de excluir o vínculo. */}
function dbComprovantUrl(blob){const url=URL.createObjectURL(blob);setTimeout(()=>URL.revokeObjectURL(url),5*60*1000);return url;}
async function dbUsageInfo(){return {used:'servidor',quota:'acesso autenticado',pct:'—'};}
async function dbRestoreBackup(){throw new Error('A migração da base será realizada separadamente, após homologar o acesso.');}
