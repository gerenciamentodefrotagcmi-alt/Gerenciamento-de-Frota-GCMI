# Histórico de versões — Gerenciamento de Frota (GCMI)

Formato da régua: `XX.X` (minor de .1 a .9; depois incrementa o número cheio).
A régua foi retomada do ponto em que havia parado (22.15); a publicação de
set/2026, que saiu com rótulo de data `2026.09.09.1`, foi reencaixada como 22.16.

## 22.18 — 04/11/2026
- Correção do **botão Imprimir** do relatório: o `onclick` inline era removido pelo DOMPurify (`writeDocument`); agora o clique é ligado a partir da janela-mãe pelo `id`, e a impressão funciona.
- **Tela inicial** reorganizada em **abas** ("Últimos abastecimentos" e "Consumo por placa e período"), com a área da tabela limitada à altura da tela (rolagem interna) — a página deixa de rolar e a tela fica menos carregada.
- **Relatório** com **numeração sequencial** (coluna Nº) e **ordem crescente pela data de abastecimento** — o item 01 é o do primeiro dia do período filtrado.
- **Molduras delimitam a rolagem**: no desktop cada tela rola por dentro da sua moldura e a página em si não rola mais (acabamento mais refinado).
- **Abastecimentos** dividido em abas (Novo abastecimento · Registros) — elimina os dois rolamentos e o excesso visual da lista de registros.
- **Moldura** com fio dourado interno simétrico contornando toda a página (acabamento).
- Removido o subtítulo "Centro institucional de gestão operacional" da barra lateral.

## 22.17 — 04/11/2026
- Medidor de armazenamento no Fluxo do sistema, com uso real do banco via Supabase
  (função `gcm_uso_armazenamento()`), restrito ao administrador.
- Correção do brasão nos relatórios (imagem embarcada como data URI — sempre exibida).
- Relatório de abastecimento enxugado: removidas as colunas **ID, Lançamento, Setor e Gerente**.
- Consulta e relatório fixados na **data de abastecimento** (removida a opção de filtrar por data de lançamento).
- Impressão do relatório abre direto no formulário, sem o diálogo automático do navegador
  (botão "Imprimir" na própria página, que some na impressão).
- Cartões de comprovantes do medidor clicáveis (ativos → relação na tela Consulta;
  arquivados → aviso de exclusão lógica retida no servidor).
- Versão passou a ser exibida no topo (ao lado do perfil); botão de tela cheia removido.
- Inclusão do painel "Histórico de versões" dentro do Fluxo do sistema.

## 22.16 — 09/09/2026
- Migração da base real para o Supabase (nuvem), com acesso individual autenticado.
- Publicação do sistema em GitHub Pages.
- Aplicativo instalável no celular (PWA: manifest, service worker e ícones).
- Observação: publicada à época com o rótulo de data `2026.09.09.1`.

## até 22.15 — 2026 (linhagem anterior)
- Évolução da régua 22.x a partir dos protótipos de maio–julho/2026:
  perfis de acesso e login, revisão GitHub/Supabase, importação segura,
  gráficos locais, relatórios operacionais e refinamentos de interface.
