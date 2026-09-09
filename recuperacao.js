'use strict';
window.Recuperacao=(()=>{
 const q=s=>document.querySelector(s),dialog=q('#recuperarSenha');
 let client=null,recovery=false,sentAt=0;
 const fragment=new URLSearchParams(location.hash.slice(1));
 const requestedRecovery=fragment.get('type')==='recovery';
 function status(text){q('#statusRecuperar').textContent=text;}
 function show(){if(!dialog.open)dialog.showModal();}
 function mode(value){recovery=value;q('#formRecuperar').hidden=value;q('#formNovaSenha').hidden=!value;show();}
 q('#esqueciSenha').addEventListener('click',()=>{q('#emailRecuperar').value=q('#emailAcesso').value;status('Use o e-mail cadastrado. Se o link expirar, solicite outro.');mode(false);});
 async function leave(){
  q('#novaSenha').value='';q('#confirmarSenha').value='';
  if(recovery){await client?.auth.signOut({scope:'local'});recovery=false;}
  dialog.close();
 }
 q('#fecharRecuperar').addEventListener('click',()=>void leave());
 dialog.addEventListener('cancel',e=>{e.preventDefault();void leave();});
 q('#formRecuperar').addEventListener('submit',async e=>{
  e.preventDefault();if(!client){status('Conexão ainda indisponível. Procure o administrador.');return;}
  if(Date.now()-sentAt<60000){status('Aguarde um minuto antes de solicitar outro link.');return;}
  q('#enviarRecuperacao').disabled=true;
  try{
   const redirectTo=new URL('./',location.href).href;
   const {error}=await client.auth.resetPasswordForEmail(q('#emailRecuperar').value.trim(),{redirectTo});
   if(error)throw error;
   sentAt=Date.now();status('Solicitação recebida. Se o e-mail estiver cadastrado e o envio disponível, você receberá o link. Confira a caixa de entrada e o spam. Abra o link mais recente no computador onde este sistema está disponível.');
  }catch{status('Não foi possível solicitar o link agora. Aguarde e tente novamente. Se persistir, procure o administrador para verificar o serviço de e-mail.');}
  finally{q('#enviarRecuperacao').disabled=false;}
 });
 q('#formNovaSenha').addEventListener('submit',async e=>{
  e.preventDefault();if(!client||!recovery){status('Solicite um novo link de recuperação.');return;}
  const password=q('#novaSenha').value;
  if(password.length<12||password!==q('#confirmarSenha').value){status('As senhas devem ser iguais e ter pelo menos 12 caracteres.');return;}
  q('#salvarNovaSenha').disabled=true;
  let changed=false;
  try{
   const {error}=await client.auth.updateUser({password});if(error)throw error;changed=true;
   const {error:sessionError}=await client.rpc('gcm_encerrar_minhas_sessoes');
   const {error:logoutError}=await client.auth.signOut({scope:'global'});
   q('#novaSenha').value='';q('#confirmarSenha').value='';recovery=false;
   q('#formNovaSenha').hidden=true;
   status(sessionError||logoutError?'Senha alterada. Entre com a nova senha. Não foi possível confirmar o encerramento de todas as sessões; procure a administração.':'Senha alterada e sessões anteriores encerradas. Volte à entrada e use a nova senha.');
  }catch{status(changed?'Senha alterada. Volte à entrada e use a nova senha.':'Não foi possível alterar a senha. O link pode ter expirado ou a senha não atende à política da conta. Solicite outro link ou procure o administrador.');}
  finally{q('#salvarNovaSenha').disabled=false;}
 });
 function init(c){
  client=c;
  client.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'&&session){mode(true);status('Link confirmado. Defina sua nova senha.');}});
  if(fragment.has('error')){history.replaceState(null,'',location.pathname+location.search);mode(false);status('O link não é válido ou expirou. Solicite outro link de recuperação.');}
  if(requestedRecovery){
   status('Conferindo o link de recuperação…');show();
   client.auth.getSession().then(({data,error})=>{if(!error&&data.session){mode(true);status('Link confirmado. Defina sua nova senha.');}else{mode(false);status('O link não é válido ou expirou. Solicite outro.');}});
  }
 }
 return {init};
})();
