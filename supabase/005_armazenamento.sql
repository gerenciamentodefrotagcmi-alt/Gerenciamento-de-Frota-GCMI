-- 005 — Medidor de armazenamento (aplicada em produção em 04/11/2026).
-- Conteúdo extraído do banco de produção em 13/11/2026 (pg_get_functiondef), para o repositório refletir o servidor.
-- Somente administradores: a própria função recusa os demais perfis (42501).
CREATE OR REPLACE FUNCTION public.gcm_uso_armazenamento()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r jsonb;
begin
  if gcm.perfil() <> 'administrador' then
    raise exception 'Acesso restrito à administração' using errcode='42501';
  end if;
  select jsonb_build_object(
    'bancoBytes',             pg_database_size(current_database()),
    'limiteBytes',            524288000,
    'anexosAtivos',           (select count(*)                               from gcm.anexos where excluido_em is null),
    'anexosAtivosBytes',      (select coalesce(sum(octet_length(conteudo)),0) from gcm.anexos where excluido_em is null),
    'anexosArquivados',       (select count(*)                               from gcm.anexos where excluido_em is not null),
    'anexosArquivadosBytes',  (select coalesce(sum(octet_length(conteudo)),0) from gcm.anexos where excluido_em is not null),
    'geradoEm', now()
  ) into r;
  perform gcm.evento('consulta_armazenamento');
  return r;
end$function$;
