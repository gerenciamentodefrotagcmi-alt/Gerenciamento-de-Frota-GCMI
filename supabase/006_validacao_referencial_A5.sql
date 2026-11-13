-- 006 — Validação referencial A5 (aplicada em produção em 06/11/2026).
-- gcm.validar passa a recusar setorId e combustivelId inexistentes.
-- Conteúdo extraído do banco de produção em 13/11/2026 (pg_get_functiondef), para o repositório refletir o servidor.
-- Reversão: reaplicar a definição de gcm.validar da migração 001.
CREATE OR REPLACE FUNCTION gcm.validar(d jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
   if col='abastecimentos' and coalesce(item->>'setorId','')<>''
      and not exists(select 1 from jsonb_array_elements(d->'setores') s where s->>'id'=item->>'setorId')
      then raise exception 'Setor inexistente'; end if;
  end loop;
 end loop;
 if exists(select 1 from jsonb_array_elements(d->'veiculos') v
           where coalesce(v->>'combustivelId','')<>''
             and not exists(select 1 from jsonb_array_elements(d->'combustiveis') c where c->>'id'=v->>'combustivelId'))
    then raise exception 'Combustível inexistente'; end if;
 if d ? '_comprovantes' then raise exception 'Anexos devem ser gravados separadamente'; end if;
end; $function$;
