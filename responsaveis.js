'use strict';
// Coleções opcionais: abrir uma base antiga não modifica seu conteúdo.
const responsibleRoles = [
  {key:'inspetoresCoordenacao', field:'inspetorCoordenacao', title:'Inspetores em coordenação'},
  {key:'gerentesAbastecimento', field:'gerenteAbastecimento', title:'Gerentes de Abastecimento'}
];
function syncResponsaveis(record) {
  for (const role of responsibleRoles) {
    const select = document.getElementById(role.field);
    const editing = record || state.abastecimentos.find(r=>String(r.id)===qs('#abastecimentoId').value);
    const previous = record ? record[role.field] || '' : select.value;
    const names = [...new Set((state[role.key] || []).filter(r=>r.ativo!==false).map(r=>r.nome))];
    if (editing?.[role.field] && !names.includes(editing[role.field])) names.push(editing[role.field]);
    select.replaceChildren(new Option(names.length ? 'Selecione' : 'Cadastre em Cadastros', ''));
    for (const name of names.sort((a,b)=>a.localeCompare(b,'pt-BR'))) select.add(new Option(name,name));
    select.value=names.includes(previous)?previous:'';
  }
}
function renderResponsaveis() {
  for (const role of responsibleRoles) {
    const body=document.getElementById(role.key+'Tabela');
    body.replaceChildren();
    for (const person of state[role.key] || []) {
      const row=body.insertRow();
      for (const value of [person.nome,person.matricula||'—',person.ativo===false?'Inativo':'Ativo']) row.insertCell().textContent=value;
      const button=document.createElement('button');
      button.type='button';button.className='btn btn-secondary';button.textContent='Editar';
      button.onclick=()=>{
        try { Cloud.mutationAllowed(true); } catch(e) { alert(e.message);return; }
        const form=document.getElementById(role.key+'Form');
        form.elements.id.value=person.id;form.elements.nome.value=person.nome;
        form.elements.matricula.value=person.matricula||'';form.elements.ativo.value=String(person.ativo!==false);
        form.elements.nome.focus();
      };
      row.insertCell().append(button);
    }
  }
}
for (const role of responsibleRoles) {
  const form=document.getElementById(role.key+'Form');
  form.addEventListener('reset',()=>{form.elements.id.value='';});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const submit=form.querySelector('[type=submit]');
    if(submit.disabled)return;
    let original;
    try {
      Cloud.mutationAllowed(true);
      const nome=form.elements.nome.value.trim().toUpperCase();
      const matricula=form.elements.matricula.value.trim();
      const id=Number(form.elements.id.value);
      const list=state[role.key]||[];
      if(!nome)throw Error('Informe o nome.');
      if(list.some(p=>p.id!==id&&(p.nome.toUpperCase()===nome||(matricula&&p.matricula===matricula))))throw Error('Nome ou matrícula já cadastrado nesta função.');
      original=state[role.key];
      const person={id:id||Math.max(0,...list.map(p=>p.id))+1,nome,matricula,ativo:form.elements.ativo.value==='true'};
      state[role.key]=id?list.map(p=>p.id===id?person:p):[...list,person];
      submit.disabled=true;
      await saveStateSync();
      form.reset();syncResponsaveis();renderResponsaveis();
      document.getElementById(role.key+'Status').textContent='Cadastro salvo.';
    } catch(e) {
      if(submit.disabled){if(original===undefined)delete state[role.key];else state[role.key]=original;}
      document.getElementById(role.key+'Status').textContent=e.message;
    } finally { submit.disabled=false; }
  });
}
const originalSyncSelects=syncSelects;
syncSelects=function(){originalSyncSelects();syncResponsaveis();};
const originalRenderCadastros=renderCadastros;
renderCadastros=function(){originalRenderCadastros();renderResponsaveis();};
const originalEditAbastecimento=editAbastecimento;
editAbastecimento=function(id){syncResponsaveis(findById('abastecimentos',id));originalEditAbastecimento(id);};
const originalClearAbastecimento=clearAbastecimentoForm;
clearAbastecimentoForm=function(){originalClearAbastecimento();syncResponsaveis();};
