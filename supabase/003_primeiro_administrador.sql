-- Substitua o e-mail pela conta institucional JÁ CRIADA no Supabase Auth.
-- Executar pelo SQL Editor do projeto, uma vez; não por um usuário do site.
do $$
declare conta uuid;
begin
 if exists(select 1 from gcm.membros where perfil='administrador' and ativo) then
  raise exception 'Já existe administrador. Use o painel de acessos do sistema.';
 end if;
 select id into conta from auth.users where lower(email)=lower('SUBSTITUIR_PELO_EMAIL_INSTITUCIONAL');
 if conta is null then raise exception 'Conta não encontrada no Auth. Cadastre-a e confira o e-mail.'; end if;
 insert into gcm.membros(id,perfil,ativo) values(conta,'administrador',true);
 insert into gcm.auditoria(usuario,acao,detalhe) values(conta,'primeiro_administrador','{"origem":"instalacao pelo administrador do projeto"}');
end; $$;
