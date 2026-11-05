# Histórico de versões — Gerenciamento de Frota (GCMI)

Formato da régua: `XX.X` (minor de .1 a .9; ao chegar em .9, incrementa o número cheio — ex.: 23.9 → v24).
A régua foi retomada do ponto em que havia parado (22.15); a publicação de
set/2026, que saiu com rótulo de data `2026.09.09.1`, foi reencaixada como 22.16.
Obs.: a linha 22.x acabou passando de .9 (22.16…22.24). A régua foi **normalizada em 05/11/2026**:
a linha 22 foi encerrada e a numeração retomada em **23.1** (daqui em diante, .1 a .9 e depois o número cheio).

## 23.8 — 05/11/2026
- **Consistência das molduras (polimento final)**: a altura das molduras internas passou a ser travada pela janela (`grid-template-rows: minmax(0,1fr)`), não mais pela altura do conteúdo de cada tela. Assim, barra lateral e conteúdo têm sempre a mesma altura e terminam na mesma base, em todas as telas e em qualquer resolução — corrigido o transbordo inferior da tela Iniciar e a variação de aparência de uma tela para outra.

## 23.7 — 05/11/2026
- **Moldura externa suprimida**: as molduras internas (barra lateral, cabeçalho e conteúdo) passam a ocupar todo o perímetro da tela, com margem igual nos quatro lados — um único elemento visual, sem o vão que havia entre a moldura externa e as internas. Vale para todas as telas.
- **Simetria corrigida**: removidos os paddings e margens intermediários que recuavam o conteúdo e deixavam a base desalinhada; esquerda e direita terminam exatamente na mesma base.

## 23.6 — 05/11/2026
- **Tela Iniciar — aproveitamento do espaço**: cartões ampliados preenchendo a altura disponível (números maiores, conteúdo centralizado, sem vão interno); a tabela "Últimos abastecimentos" ganhou mais linhas visíveis.
- **Correção da tabela "Últimos abastecimentos"**: o cabeçalho passou a ser fixo e **opaco** ao rolar — resolvido o efeito "fantasma" (linhas aparecendo sobre o cabeçalho). Vale para as demais tabelas `.table-inner`.

## 23.5 — 05/11/2026
- **Linha do tempo por VTR**: as barras de viatura (abas "Comparativo entre VTRs" e "KM & eficiência") viraram **clicáveis** e abrem um painel com a **linha do tempo de abastecimentos** daquela VTR — resumo (abastecimentos, KM rodado, litros, km/L), KM entre abastecimentos e **alerta em vermelho quando o hodômetro retrocede** (apoio à auditoria).
- **Visual ampliado**: barras maiores, distribuídas por toda a altura da tela — sem espaço desperdiçado.
- **Simetria da moldura**: corrigido o desalinhamento inferior — a barra lateral agora termina exatamente na mesma base do conteúdo à direita (não transborda mais até a moldura externa).

## 23.4 — 05/11/2026
- **Relatórios — nova aba "KM & eficiência"**: quilometragem rodada por VTR no período (maior − menor hodômetro registrado) e eficiência **km/L**, ranqueando a viatura **mais utilizada** (a do topo). KM rodado e km/L também passam a constar na tabela de viaturas do **relatório impresso**.
- **Acabamento da moldura única**: cabeçalho com os quatro cantos arredondados (antes o canto superior-esquerdo era reto); cabeçalho e barra lateral alinhados ao topo; reduzido o espaço até a borda superior; corrigida a folga da barra lateral até a moldura externa (não encosta mais).

## 23.3 — 05/11/2026
- **Botão Imprimir** na tela de Relatórios (ao lado de "Período todo"): emite o **Relatório de Gestão da Frota** em A4 (brasão, período, consumo geral e as três tabelas — comparativo entre VTRs com % do total, por horário e por dia da semana), pronto para o comando.
- **Chavinha "ATUALIZAR"** do medidor de armazenamento revisada: aparência **metal/bronze** e funcionamento **momentâneo** (aciona, atualiza e retorna sozinha); corrigido o deslize indevido ao passar o mouse.

## 23.2 — 05/11/2026
- **Nova tela "Relatórios de Gestão"** (item no menu): voltada à emissão de relatórios para o comando, com objetivo de gestão e não só exibição de números.
  - **Consumo geral** do período: nº de abastecimentos, litros, valor total e preço médio do litro.
  - **Comparativo entre VTRs** (litros, com valor), ordenado do maior consumo.
  - **Por horário** (hora do dia) e **por dia da semana**, com destaque automático do pico.
  - Filtro de período (De/Até) e botão "Período todo". Barras proporcionais no padrão dourado; cabe na tela sem rolagem.

## 23.1 — 05/11/2026
- **Régua normalizada**: linha 22.x (que havia passado de .9) encerrada; numeração retomada em 23.1.
- **Moldura única (bezel)**: um fio dourado envolve toda a aplicação — barra superior, barra lateral e conteúdo — com margem igual nos quatro lados. Estética unificada e simétrica em todas as telas.
- **Formulário de abastecimento compacto**: campos reorganizados e os derivados (Placa, Combustível, Matrícula, Valor total) reunidos numa faixa automática própria. Cabe inteiro na tela, sem rolagem.
- **Tela inicial**: o card "Veículos ativos" deu lugar a um **ranking das 3 VTRs de maior consumo** (litros) no período, com destaque ouro/prata/bronze.

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
