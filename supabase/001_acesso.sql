-- Aplicar uma vez, em projeto de homologação vazio. Nenhuma chave secreta necessária no site.
begin;
create schema gcm;
revoke all on schema gcm from public, anon, authenticated;
create table gcm.membros (
 id uuid primary key references auth.users(id),
 perfil text not null check(perfil in ('administrador','operador','consulta')),
 ativo boolean not null default true
);
create table gcm.sessoes (
 id uuid primary key, usuario uuid not null references auth.users(id),
 inicio timestamptz not null default now(), atividade timestamptz not null default now(),
 revogada boolean not null default false
);
create table gcm.estado (
 id integer primary key check(id=1), revisao bigint not null default 0,
 dados jsonb not null
);
create table gcm.anexos (
 id bigint generated always as identity primary key,
 vinculo text not null check(vinculo in ('abastecimentos','trocasOleo')),
 registro bigint not null check(registro>0), nome text not null, mime text not null,
 conteudo bytea not null check(octet_length(conteudo) between 1 and 20971520),
 hash text not null, criado_em timestamptz not null default now(),
 criado_por uuid not null references auth.users(id),
 excluido_em timestamptz,
 unique(vinculo,registro,hash)
);
create table gcm.auditoria (
 id bigint generated always as identity primary key, instante timestamptz not null default now(),
 usuario uuid, acao text not null, detalhe jsonb not null default '{}'
);
alter table gcm.membros enable row level security;
alter table gcm.sessoes enable row level security;
alter table gcm.estado enable row level security;
alter table gcm.anexos enable row level security;
alter table gcm.auditoria enable row level security;
-- Nenhum acesso direto. Funções verificam usuário, sessão e perfil em toda operação.
create function gcm.evento(acao text, detalhe jsonb default '{}') returns void
language sql security definer set search_path='' as $$
 insert into gcm.auditoria(usuario,acao,detalhe) values(auth.uid(),acao,detalhe);
$$;
create function gcm.perfil() returns text language plpgsql security definer set search_path='' as $$
declare p text; sid uuid := (auth.jwt()->>'session_id')::uuid;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária' using errcode='42501'; end if;
 select perfil into p from gcm.membros where id=auth.uid() and ativo;
 if p is null then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 update gcm.sessoes set atividade=now() where id=sid and usuario=auth.uid() and not revogada
  and inicio>now()-interval '8 hours' and atividade>now()-interval '15 minutes';
 if not found then raise exception 'Sessão encerrada. Entre novamente.' using errcode='42501'; end if;
 return p;
end; $$;
create function public.gcm_entrar() returns text language plpgsql security definer set search_path='' as $$
declare p text; sid uuid := (auth.jwt()->>'session_id')::uuid;
begin
 select perfil into p from gcm.membros where id=auth.uid() and ativo;
 if p is null or sid is null then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 insert into gcm.sessoes(id,usuario) values(sid,auth.uid()) on conflict do nothing;
 p:=gcm.perfil(); perform gcm.evento('entrada'); return p;
end; $$;
create function public.gcm_sair() returns void language plpgsql security definer set search_path='' as $$
begin
 update gcm.sessoes set revogada=true where id=(auth.jwt()->>'session_id')::uuid and usuario=auth.uid();
 if found then perform gcm.evento('saida'); end if;
end; $$;
create function public.gcm_sessao() returns text language sql security definer set search_path='' as $$ select gcm.perfil(); $$;
create function public.gcm_ler_estado() returns jsonb language plpgsql security definer set search_path='' as $$
declare resultado jsonb;
begin
 perform gcm.perfil();
 select jsonb_build_object('revisao',revisao,'dados',dados) into resultado from gcm.estado where id=1;
 return resultado;
end; $$;
create function gcm.validar_textos(d jsonb) returns void language plpgsql set search_path='' as $$
declare valor jsonb;
begin
 if jsonb_typeof(d)='string' and (d#>>'{}') ~ '[<>"]' then raise exception 'Não use marcação HTML ou aspas duplas nos campos de cadastro e lançamento'; end if;
 if jsonb_typeof(d)='array' then for valor in select * from jsonb_array_elements(d) loop perform gcm.validar_textos(valor); end loop;
 elsif jsonb_typeof(d)='object' then for valor in select value from jsonb_each(d) loop perform gcm.validar_textos(valor); end loop; end if;
end; $$;
create function gcm.validar(d jsonb) returns void language plpgsql set search_path='' as $$
declare col text; item jsonb;
begin
 if jsonb_typeof(d) <> 'object' or octet_length(d::text)>10000000 then raise exception 'Base inválida ou acima do limite'; end if;
 perform gcm.validar_textos(d);
 foreach col in array array['motoristas','veiculos','abastecimentos','trocasOleo','setores','combustiveis','perfis','usuarios','tiposPrefixo'] loop
  if jsonb_typeof(d->col) is distinct from 'array' then raise exception 'Coleção inválida: %',col; end if;
  if col='tiposPrefixo' then continue; end if;
  if exists(select 1 from jsonb_array_elements(d->col) x where jsonb_typeof(x->'id') is distinct from 'number' or (x->>'id') !~ '^[1-9][0-9]*$') then raise exception 'Identificador inválido: %',col; end if;
  if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(d->col) x) then raise exception 'Identificador repetido: %',col; end if;
 end loop;
 foreach col in array array['abastecimentos','trocasOleo'] loop
  for item in select * from jsonb_array_elements(d->col) loop
   if not exists(select 1 from jsonb_array_elements(d->'veiculos') v where v->>'id'=item->>'veiculoId') then raise exception 'Veículo inexistente'; end if;
   if col='abastecimentos' and not exists(select 1 from jsonb_array_elements(d->'motoristas') m where m->>'id'=item->>'motoristaId') then raise exception 'Motorista inexistente'; end if;
  end loop;
 end loop;
 if d ? '_comprovantes' then raise exception 'Anexos devem ser gravados separadamente'; end if;
end; $$;
create function public.gcm_gravar_estado(p_revisao bigint,p_dados jsonb) returns bigint
language plpgsql security definer set search_path='' as $$
declare p text:=gcm.perfil(); anterior jsonb; rev bigint; col text; alterados jsonb:='{}';
begin
 if p='consulta' then raise exception 'Perfil de consulta não pode gravar' using errcode='42501'; end if;
 perform gcm.validar(p_dados);
 select dados,revisao into anterior,rev from gcm.estado where id=1 for update;
 if rev is distinct from p_revisao then raise exception 'Outro usuário alterou a base. Recarregue antes de gravar.' using errcode='40001'; end if;
 if anterior=p_dados then return rev; end if;
 if p='operador' then
  if (anterior-'abastecimentos'-'trocasOleo'-'veiculos')<>(p_dados-'abastecimentos'-'trocasOleo'-'veiculos') then raise exception 'Cadastros restritos à administração' using errcode='42501'; end if;
  if (select jsonb_agg(v-'kmAtual' order by (v->>'id')::bigint) from jsonb_array_elements(anterior->'veiculos') v)
   is distinct from (select jsonb_agg(v-'kmAtual' order by (v->>'id')::bigint) from jsonb_array_elements(p_dados->'veiculos') v) then raise exception 'Cadastros restritos à administração' using errcode='42501'; end if;
  foreach col in array array['abastecimentos','trocasOleo'] loop
   if exists(select 1 from jsonb_array_elements(anterior->col) a where not exists(select 1 from jsonb_array_elements(p_dados->col) b where a->>'id'=b->>'id')) then raise exception 'Exclusão restrita à administração' using errcode='42501'; end if;
  end loop;
 end if;
 foreach col in array array['motoristas','veiculos','abastecimentos','trocasOleo','setores','combustiveis','perfis','usuarios'] loop
  alterados:=alterados||jsonb_build_object(col,(select coalesce(jsonb_agg(coalesce(a->>'id',b->>'id')),'[]') from jsonb_array_elements(anterior->col) a full join jsonb_array_elements(p_dados->col) b on a->>'id'=b->>'id' where a is distinct from b));
 end loop;
 -- Impede apagar um lançamento sem antes arquivar seus comprovantes com justificativa.
 if exists(select 1 from gcm.anexos a where excluido_em is null and not exists(select 1 from jsonb_array_elements(p_dados->a.vinculo) x where (x->>'id')::bigint=a.registro)) then raise exception 'Arquive os comprovantes antes de excluir o lançamento'; end if;
 update gcm.estado set dados=p_dados,revisao=rev+1 where id=1;
 perform gcm.evento('gravar_base',jsonb_build_object('revisao',rev+1,'registros',alterados));
 return rev+1;
end; $$;
create function public.gcm_listar_anexos() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform gcm.perfil();
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'vinculo',vinculo,'registro',registro,'nome',nome,'tipo',mime,'tamanho',octet_length(conteudo),'criadoEm',criado_em) order by id),'[]') from gcm.anexos where excluido_em is null);
end; $$;
create function public.gcm_ler_anexo(p_id bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin
 perform gcm.perfil();
 select jsonb_build_object('base64',encode(conteudo,'base64'),'tipo',mime) into r from gcm.anexos where id=p_id and excluido_em is null;
 if r is null then raise exception 'Comprovante indisponível'; end if;
 perform gcm.evento('ler_anexo',jsonb_build_object('id',p_id)); return r;
end; $$;
create function public.gcm_gravar_anexo(p_vinculo text,p_registro bigint,p_nome text,p_base64 text) returns bigint
language plpgsql security definer set search_path='' as $$
declare p text:=gcm.perfil(); bytes bytea; h text; mime text; resultado bigint; removido timestamptz;
begin
 if p='consulta' then raise exception 'Sem permissão de anexação' using errcode='42501'; end if;
 if p_vinculo not in ('abastecimentos','trocasOleo') or length(p_nome) not between 1 and 255 or p_nome ~ '[<>"]' or length(p_base64)>28000000 then raise exception 'Arquivo inválido'; end if;
 perform 1 from gcm.estado where id=1 for update;
 if not exists(select 1 from gcm.estado e,jsonb_array_elements(e.dados->p_vinculo) a where (a->>'id')::bigint=p_registro) then raise exception 'Lançamento inexistente'; end if;
 bytes:=decode(p_base64,'base64'); h:=encode(sha256(bytes),'hex');
 mime:=case when substring(bytes from 1 for 3)=decode('ffd8ff','hex') then 'image/jpeg'
 when substring(bytes from 1 for 8)=decode('89504e470d0a1a0a','hex') then 'image/png'
 when substring(bytes from 1 for 5)=convert_to('%PDF-','UTF8') then 'application/pdf' end;
 if mime is null then raise exception 'Use comprovante PNG, JPEG ou PDF'; end if;
 insert into gcm.anexos(vinculo,registro,nome,mime,conteudo,hash,criado_por)
 values(p_vinculo,p_registro,p_nome,mime,bytes,h,auth.uid()) on conflict(vinculo,registro,hash) do nothing returning id into resultado;
 if resultado is null then
  select id,excluido_em into resultado,removido from gcm.anexos where vinculo=p_vinculo and registro=p_registro and hash=h;
  if removido is not null then raise exception 'Este comprovante está arquivado; consulte a administração'; end if;
  perform gcm.evento('anexo_reutilizado',jsonb_build_object('id',resultado));
 else perform gcm.evento('anexar',jsonb_build_object('id',resultado,'registro',p_registro)); end if;
 return resultado;
end; $$;
create function public.gcm_arquivar_anexo(p_id bigint,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
begin
 if gcm.perfil()<>'administrador' then raise exception 'Exclusão restrita à administração' using errcode='42501'; end if;
 if length(trim(p_motivo))<10 or length(p_motivo)>1000 then raise exception 'Informe uma justificativa de 10 a 1000 caracteres'; end if;
 update gcm.anexos set excluido_em=now() where id=p_id and excluido_em is null;
 if not found then raise exception 'Comprovante indisponível'; end if;
 perform gcm.evento('arquivar_anexo',jsonb_build_object('id',p_id,'motivo',p_motivo));
end; $$;
create function public.gcm_auditoria(p_antes bigint default 9223372036854775807) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if gcm.perfil()<>'administrador' then raise exception 'Acesso restrito à administração' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from (select * from gcm.auditoria where id<p_antes order by id desc limit 100) t);
end; $$;
create function public.gcm_membros() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if gcm.perfil()<>'administrador' then raise exception 'Acesso restrito à administração' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'email',u.email,'perfil',m.perfil,'ativo',m.ativo)),'[]') from gcm.membros m join auth.users u on m.id=u.id);
end; $$;
create function public.gcm_definir_membro(p_email text,p_perfil text,p_ativo boolean) returns void language plpgsql security definer set search_path='' as $$
declare alvo uuid;
begin
 if gcm.perfil()<>'administrador' then raise exception 'Acesso restrito à administração' using errcode='42501'; end if;
 select id into alvo from auth.users where lower(email)=lower(trim(p_email));
 if alvo is null then raise exception 'Conta não cadastrada no serviço de autenticação'; end if;
 if alvo=auth.uid() then raise exception 'Sua própria permissão deve ser alterada por outro administrador'; end if;
 insert into gcm.membros(id,perfil,ativo) values(alvo,p_perfil,p_ativo) on conflict(id) do update set perfil=excluded.perfil,ativo=excluded.ativo;
 update gcm.sessoes set revogada=true where usuario=alvo;
 perform gcm.evento('alterar_acesso',jsonb_build_object('usuario',alvo,'perfil',p_perfil,'ativo',p_ativo));
end; $$;
revoke all on all tables in schema gcm from public,anon,authenticated;
revoke all on all functions in schema gcm from public,anon,authenticated;
-- Restringe somente as funções deste módulo, preservando funções de outros sistemas.
do $$ declare f record; begin
 for f in select p.oid::regprocedure assinatura from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'gcm\_%' escape '\' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.assinatura);
  execute format('grant execute on function %s to authenticated',f.assinatura);
 end loop;
end; $$;
commit;
