-- Atualização aditiva. Preserva estado, comprovantes, contas e auditoria existentes.
begin;
alter table gcm.anexos add column if not exists data_original text;
create table if not exists gcm.restauracoes (
 id uuid primary key default gen_random_uuid(), usuario uuid not null references auth.users(id),
 criado_em timestamptz not null default now(), motivo text not null,
 token text not null, dados jsonb not null, quantidade integer not null check(quantidade between 0 and 10000),
 concluido_em timestamptz, revisao_final bigint, anterior jsonb, anexos_anteriores jsonb
);
create table if not exists gcm.restauracao_anexos (
 lote uuid not null references gcm.restauracoes(id), ordem integer not null,
 vinculo text not null, registro bigint not null, nome text not null, mime text not null,
 conteudo bytea not null, hash text not null, data_original text,
 primary key(lote,ordem), unique(lote,vinculo,registro,hash)
);
alter table gcm.restauracoes enable row level security;
alter table gcm.restauracao_anexos enable row level security;
revoke all on gcm.restauracoes,gcm.restauracao_anexos from public,anon,authenticated;

create or replace function gcm.token_backup() returns text language sql set search_path='' as $$
 select encode(sha256(convert_to((select revisao::text||dados::text from gcm.estado where id=1)||
 coalesce((select jsonb_agg(jsonb_build_array(id,vinculo,registro,nome,hash,excluido_em) order by id)::text from gcm.anexos),''),'UTF8')),'hex');
$$;
create or replace function public.gcm_backup_info() returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin
 perform gcm.perfil();
 perform 1 from gcm.estado where id=1 for update;
 select jsonb_build_object('dados',dados,'revisao',revisao,'token',gcm.token_backup(),
 'anexos',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'vinculo',vinculo,'registro',registro,'nome',nome,'tipo',mime,
 'tamanho',octet_length(conteudo),'sha256',hash,'data',coalesce(data_original,criado_em::text)) order by id),'[]') from gcm.anexos where excluido_em is null)) into r from gcm.estado where id=1;
 return r;
end; $$;
-- Arquivar e anexar também usam o bloqueio do estado, permitindo conferir um backup consistente.
create or replace function public.gcm_arquivar_anexo(p_id bigint,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
begin
 if gcm.perfil()<>'administrador' then raise exception 'Exclusão restrita à administração' using errcode='42501'; end if;
 if p_motivo is null or length(trim(p_motivo)) not between 10 and 1000 then raise exception 'Informe uma justificativa de 10 a 1000 caracteres'; end if;
 perform 1 from gcm.estado where id=1 for update;
 update gcm.anexos set excluido_em=now() where id=p_id and excluido_em is null;
 if not found then raise exception 'Comprovante indisponível'; end if;
 perform gcm.evento('arquivar_anexo',jsonb_build_object('id',p_id,'motivo',p_motivo));
end; $$;
create or replace function public.gcm_restaurar_iniciar(p_dados jsonb,p_quantidade integer,p_token text,p_motivo text) returns uuid
language plpgsql security definer set search_path='' as $$
declare lote uuid;
begin
 if gcm.perfil()<>'administrador' then raise exception 'Restauração restrita à administração' using errcode='42501'; end if;
 if p_motivo is null or length(trim(p_motivo)) not between 10 and 1000 then raise exception 'Informe uma justificativa de 10 a 1000 caracteres'; end if;
 perform gcm.validar(p_dados);
 perform 1 from gcm.estado where id=1 for update;
 if p_token is distinct from gcm.token_backup() then raise exception 'A base mudou. Exporte e confira novamente antes de importar.' using errcode='40001'; end if;
 insert into gcm.restauracoes(usuario,motivo,token,dados,quantidade) values(auth.uid(),trim(p_motivo),p_token,p_dados,p_quantidade) returning id into lote;
 perform gcm.evento('restauracao_preparada',jsonb_build_object('lote',lote,'motivo',p_motivo,'comprovantes',p_quantidade));
 return lote;
end; $$;
create or replace function public.gcm_restaurar_anexo(p_lote uuid,p_ordem integer,p_vinculo text,p_registro bigint,p_nome text,p_base64 text,p_sha256 text,p_tamanho integer,p_data text default '') returns void
language plpgsql security definer set search_path='' as $$
declare r gcm.restauracoes; bytes bytea; h text; mime text;
begin
 if gcm.perfil()<>'administrador' then raise exception 'Restauração restrita à administração' using errcode='42501'; end if;
 select * into r from gcm.restauracoes where id=p_lote and usuario=auth.uid() and concluido_em is null and criado_em>now()-interval '8 hours' for update;
 if not found then raise exception 'Importação indisponível ou encerrada'; end if;
 if p_ordem is null or p_ordem<0 or p_ordem>=r.quantidade or p_vinculo is null or p_vinculo not in ('abastecimentos','trocasOleo')
 or p_nome is null or length(p_nome) not between 1 and 255 or p_nome ~ '[<>"]' or p_base64 is null or length(p_base64)>28000000 then raise exception 'Comprovante inválido'; end if;
 if not exists(select 1 from jsonb_array_elements(r.dados->p_vinculo) x where (x->>'id')::bigint=p_registro) then raise exception 'Vínculo do comprovante inexistente'; end if;
 bytes:=decode(p_base64,'base64'); h:=encode(sha256(bytes),'hex');
 if octet_length(bytes) not between 1 and 20971520 or octet_length(bytes) is distinct from p_tamanho or h is distinct from p_sha256 then raise exception 'Conteúdo ou tamanho do comprovante divergente'; end if;
 mime:=case when substring(bytes from 1 for 3)=decode('ffd8ff','hex') then 'image/jpeg'
 when substring(bytes from 1 for 8)=decode('89504e470d0a1a0a','hex') then 'image/png'
 when substring(bytes from 1 for 5)=convert_to('%PDF-','UTF8') then 'application/pdf' end;
 if mime is null then raise exception 'Use comprovante PNG, JPEG ou PDF'; end if;
 if coalesce((select sum(octet_length(conteudo)) from gcm.restauracao_anexos where lote=p_lote and ordem<>p_ordem),0)+octet_length(bytes)>524288000 then raise exception 'Backup acima de 500 MB de anexos'; end if;
 insert into gcm.restauracao_anexos values(p_lote,p_ordem,p_vinculo,p_registro,p_nome,mime,bytes,h,left(p_data,100))
 on conflict(lote,ordem) do update set vinculo=excluded.vinculo,registro=excluded.registro,nome=excluded.nome,mime=excluded.mime,conteudo=excluded.conteudo,hash=excluded.hash,data_original=excluded.data_original;
end; $$;
create or replace function public.gcm_restaurar_concluir(p_lote uuid) returns bigint language plpgsql security definer set search_path='' as $$
declare r gcm.restauracoes; rev bigint;
begin
 if gcm.perfil()<>'administrador' then raise exception 'Restauração restrita à administração' using errcode='42501'; end if;
 select * into r from gcm.restauracoes where id=p_lote and usuario=auth.uid() for update;
 if not found then raise exception 'Importação inexistente'; end if;
 if r.concluido_em is not null then return r.revisao_final; end if;
 if r.criado_em<now()-interval '8 hours' then raise exception 'Importação expirada'; end if;
 perform 1 from gcm.estado where id=1 for update;
 if r.token is distinct from gcm.token_backup() then raise exception 'Outro usuário alterou a base durante o envio. Nenhum registro foi substituído.' using errcode='40001'; end if;
 if (select count(*) from gcm.restauracao_anexos where lote=p_lote)<>r.quantidade then raise exception 'Envio incompleto. Nenhum registro foi substituído.'; end if;
 perform gcm.validar(r.dados);
 update gcm.restauracoes set anterior=(select dados from gcm.estado where id=1),
 anexos_anteriores=(select coalesce(jsonb_agg(to_jsonb(a)-'conteudo'),'[]') from gcm.anexos a where excluido_em is null) where id=p_lote;
 update gcm.anexos set excluido_em=now() where excluido_em is null;
 insert into gcm.anexos(vinculo,registro,nome,mime,conteudo,hash,criado_por,data_original)
 select vinculo,registro,nome,mime,conteudo,hash,auth.uid(),data_original from gcm.restauracao_anexos where lote=p_lote
 on conflict(vinculo,registro,hash) do update set excluido_em=null,nome=excluded.nome,mime=excluded.mime,data_original=excluded.data_original;
 update gcm.estado set dados=r.dados,revisao=revisao+1 where id=1 returning revisao into rev;
 update gcm.restauracoes set concluido_em=now(),revisao_final=rev where id=p_lote;
 perform gcm.evento('restauracao_concluida',jsonb_build_object('lote',p_lote,'motivo',r.motivo,'revisao',rev,'comprovantes',r.quantidade));
 return rev;
end; $$;
create or replace function public.gcm_encerrar_minhas_sessoes() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Autenticação necessária' using errcode='42501'; end if;
 update gcm.sessoes set revogada=true where usuario=auth.uid();
 perform gcm.evento('sessoes_encerradas_pelo_titular');
end; $$;
revoke all on function public.gcm_encerrar_minhas_sessoes() from public,anon,authenticated;
grant execute on function public.gcm_encerrar_minhas_sessoes() to authenticated;
revoke all on function gcm.token_backup() from public,anon,authenticated;
revoke all on function public.gcm_backup_info(),public.gcm_restaurar_iniciar(jsonb,integer,text,text),public.gcm_restaurar_anexo(uuid,integer,text,bigint,text,text,text,integer,text),public.gcm_restaurar_concluir(uuid) from public,anon,authenticated;
grant execute on function public.gcm_backup_info(),public.gcm_restaurar_iniciar(jsonb,integer,text,text),public.gcm_restaurar_anexo(uuid,integer,text,bigint,text,text,text,integer,text),public.gcm_restaurar_concluir(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
