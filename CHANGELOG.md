# Histórico de versões — Gerenciamento de Frota (GCMI)

Formato da régua: `XX.X` (minor de .1 a .9; depois incrementa o número cheio).
A régua foi retomada do ponto em que havia parado (22.15); a publicação de
set/2026, que saiu com rótulo de data `2026.09.09.1`, foi reencaixada como 22.16.

## 22.23 — 05/11/2026
- **Troca de óleo em abas**: dividida em 3 abas (Registrar troca · Status por veículo · Histórico). Cada grupo cabe numa tela, sem rolagem de página — só o conteúdo da aba ativa rola dentro do quadro.
- **Status por veículo** agora em grade que se ajusta à largura da tela (sem rolagem lateral de cartões).

## 22.22 — 05/11/2026
- **Barra lateral** ocupando toda a altura da esquerda (não mais compacta), como quadro fechado.
- **Molduras** como quadros fechados com cantos arredondados — tudo dentro do quadro.
- **Cadastros em abas**: dividido em 6 abas (Veículos · Motoristas · Setores · Combustíveis · Inspetores · Gerentes). Cada uma cabe numa tela, sem rolagem de página — só a tabela rola na sua caixa.

## 22.21 — 05/11/2026
- **Barra lateral compacta**: a moldura da esquerda encolhe ao conteúdo (brasão + botões) e não estica junto com a lista da direita.
- **Tela travada** (a página não rola); só a lista da direita rola dentro da moldura.
- **Máximo aproveitamento da tela**: dashboard e Abastecimentos — a lista preenche toda a altura disponível da moldura, sem sobrar vazio.

## 22.20 — 05/11/2026
- **Moldura única**: um só fio dourado contorna a tela inteira, com um divisor entre a barra lateral (brasão + botões — estática, não rola) e o conteúdo à direita (a lista, que rola).
- **Brasão** da barra lateral ajustado para **4 cm**.

## 22.19 — 05/11/2026
- **Consulta reorganizada**: o painel de filtros virou recolhível e as duas listas (Resultados e Comprovantes) viraram abas. Só a lista da aba ativa rola, dentro da moldura — um único rolamento, sem a página rolar. Resolve o acúmulo de rolamentos e o excesso visual.
- **Service worker (sw.js)**: passou a buscar sempre a versão mais nova da rede (no-store). Assim, cada publicação aparece automaticamente, sem precisar limpar o cache do navegador.

## 22.18 — 04/11/2026
- Correção do **botão Imprimir** do relatório: o `onclick` inline era removido pelo DOMPurify (`writeDocument`); agora o clique é ligado a partir da janela-mãe pelo `id`, e a impressão funciona.
- **Tela inicial** reorganizada em **abas** ("Últimos abastecimentos" e "Consumo por placa e período"), com a área da tabela limitada à altura da tela (rolagem interna) — a página deixa de rolar e a tela fica menos carregada.
- **Relatório** com **numeração sequencial** (coluna Nº) e **ordem crescente pela data de abastecimento** — o item 01 é o do primeiro dia do período filtrado.
- **Molduras delimitam a rolagem**: no desktop cada tela rola por dentro da sua moldura e a página em si não rola mais (acabamento mais refinado).
- **Abastecimentos** dividido em abas (Novo abastecimento · Registros) — elimina os dois rolamentos e o excesso visual da lista de registros.
- **Molduras separadas e simétricas**: barra lateral e conteúdo viraram dois painéis com borda dourada completa e respiro entre eles (antes ficavam colados). Consulta passou a ter rolamento único (sem rolamentos internos aninhados).
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
