# Entrega 04/11/2026 — Medidor de armazenamento + correção do brasão

São DOIS destinos. Faça os dois (em qualquer ordem).

## 1) GitHub — subir a interface
- Repositório: gerenciamentodefrotagcmi-alt / Gerenciamento-de-Frota-GCMI
- Add file -> Upload files
- Arraste os 2 arquivos desta pasta: **index.html** e **app.js** (substituem os atuais)
- Mensagem de commit: "Medidor de armazenamento + correcao do brasao nos relatorios"
- Commit changes
- O GitHub Pages republica sozinho em 1-2 minutos.

## 2) Supabase — aplicar a função do medidor
- Projeto do Frota: fwqfeirshdcphuqnbwmu (conta gerenciamentodefrotagcmi)
- SQL Editor -> New query
- Abra o arquivo **supabase-005_armazenamento.sql**, cole TODO o conteúdo e clique em Run
- Deve retornar "Success. No rows returned"

## Conferir depois
- Abra o site e entre como administrador
- Fluxo do sistema: o MEDIDOR aparece com o número real; a chave ATUALIZAR relê
- Consulta -> Imprimir relatório: o BRASÃO agora aparece no cabeçalho

## Observações
- O medidor só aparece para o perfil ADMINISTRADOR (por segurança).
- Enquanto a função 005 não for aplicada no Supabase, o medidor apenas não aparece — não quebra nada.
- Nenhum dado foi alterado. Seu backup frio de 04/11 continua válido.
