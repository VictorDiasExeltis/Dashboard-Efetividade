# Melhorias e mudanças pendentes

Backlog do Dashboard de Efetividade. Itens levantados pelo Victor, para
trabalhar depois. Nada aqui foi implementado.

---

## 1. Filtro de período na tela de Médicos não Visitados

**Tela:** Target List (`/target-list`)

Hoje a lista tem uma janela **fixa**: entra o médico ativo que não recebeu
nenhuma visita nos **3 ciclos mais recentes** e que já estava no painel antes
desses 3 ciclos. Não há como o usuário mudar esse recorte.

A ideia é permitir escolher o período — por exemplo, olhar quem está sem visita
há 1 ciclo (alerta precoce) ou há 6 ciclos (abandono real).

**A decidir quando formos implementar:**
- O filtro escolhe uma quantidade de ciclos (1, 2, 3, 6...) ou um intervalo de datas?
- A regra que exclui médicos recém-incluídos acompanha a janela escolhida?
  (Hoje ela usa a mesma janela de 3 ciclos. Se o usuário pedir 6, a exclusão
  deve olhar 6 também, senão médico novo aparece como "abandonado".)
- Entra no filtro global do topo ou é um filtro só desta tela?

---

## 2. Botão de exportação de dados

**Telas:** Alocação de Recursos (amostras) e Visitação × Segmentação

Permitir baixar os dados que estão na tela. Hoje não há exportação em nenhuma
das duas.

**A decidir quando formos implementar:**
- Formato: Excel (.xlsx) ou CSV? A tela de Insights já usa a biblioteca `xlsx`,
  então dá para reaproveitar.
- Exporta o que está visível (já filtrado e agregado) ou o detalhe por médico?
- Se for detalhe por médico, o arquivo carrega **nome e CRM** — é dado pessoal.
  Vale definir quem pode exportar, já que hoje qualquer usuário logado enxerga
  o painel inteiro.

---

---

# Pendências técnicas

Levantadas durante o trabalho de 14 a 18/08/2026. Não são pedidos novos — são
coisas que já existem e ficaram em aberto. Ordenadas por risco.

## Dados de segmentação

- **LIBRENE não tem nenhuma segmentação.** Zero linhas em `fato_segmentacao`.
  Se a marca estiver selecionável, o gráfico dela aparece 100% "SEM
  SEGMENTAÇÃO". Confirmar se é falha de carga ou se a marca não é segmentada.
- **EXELRING com 1,1%** — 177 médicos de 15.627. Mesma dúvida: carga parcial ou
  recorte proposital de painel-alvo?
- **424 médicos ativos sem segmentação em nenhuma marca.** Lista pronta em
  `medicos_sem_segmentacao_424_2026-08-14.csv` (fora do repo, contém dado
  pessoal).
- **`fato_segmentacao` não tem coluna de ciclo.** Toda carga nova reescreve
  retroativamente os relatórios de todos os ciclos já fechados. Dar
  historicidade exige mudança de modelagem.

## Cargas

- **Central de Cargas não grava.** Baixa modelo, valida arquivo e mostra
  histórico, mas o commit não existe (previsto para "Fase 2/3"). Hoje toda carga
  é feita por script.
- **Tipo de carga incompatível com ciclo aberto.** As cargas de visitas, metas e
  amostras são `adiciona_ciclo`, que bloqueia ciclo já carregado. Para recarga
  diária precisa ser "substitui o ciclo".
- **`fato_abonos` não está configurada** na Central de Cargas.
- **`fato_abonos` não tem chave única** — recarregar o mesmo arquivo duplicaria
  os registros sem aviso.

## Análise de Ciclo

- **Coluna "Indicativo" oculta** (18/08) — regra de classificação em validação.
  Está comentada no código, com a lógica intacta no servidor.
- **`considerar = false` temporário.** GO_GOIANIA_2 e CE_FORTALEZA_1 foram
  marcados direto no banco e **voltam para `true` na próxima carga** do
  relatório resumido. Para valer de forma duradoura, precisa sair do arquivo de
  origem.
- **Assimetria do dia corrente.** O dia de hoje conta em `dias_trabalhados`
  (vem das visitas) mas não em `dias_decorridos` (que para em ontem). Isso infla
  levemente a projeção de quem já lançou visita no dia.

## Segurança

- **Qualquer usuário logado lê o painel inteiro** — 24.289 médicos com nome, CRM
  e endereço. Risco **aceito** enquanto são 10 a 15 usuários criados
  manualmente. Revisitar antes de abrir para a força de vendas: exigiria
  política por território.
- **Proteção de senha vazada desligada** no Supabase Auth. Só pode ser ligada no
  dashboard, não por código.
- **Relatório da colega é público.** `public/relatorio-colega/` é servido sem
  autenticação e o `tela-4.html` tem a senha `Exeltis2026` em texto claro no
  código-fonte. Decisão de manter assim por ora, por não ser possível mexer nos
  arquivos.

## Relatório da colega

- **Telas com períodos diferentes.** O `tela-3` (Ranking) foi atualizado até
  **Jul/26**; `tela-1`, `tela-2` e `tela-4` param em **Jun/26**. Comparar número
  entre abas pode confundir.
- **`tela-1` com textos desatualizados.** O cabeçalho diz "ações: Mar/26 a
  Ago/26", mas existem 3.362 ações de Out/25 (45% do total). O rodapé afirma que
  a base vai "até Mai/26" quando vai até Jun/26.
- **`tela-1` com 1 médico sem região/setor** (`PA0006176`) — entra nos totais e
  some de qualquer recorte geográfico.
- **`tela-4` é o único não autocontido** — carrega Chart.js de CDN. Se a rede
  bloquear, os 12 gráficos não renderizam.

## Código e modelagem

- **Código órfão:** o componente `InsightsResumoCards` e a action
  `getInsightsResumo` ficaram sem uso quando o card de resumo saiu da tela.
- **Sem histórico de painel.** `dim_medicos` só tem data de inclusão, não de
  inativação. Não dá para reconstruir quem estava no painel num ciclo passado.
- **Insights lê o ciclo mais recente da tabela crua** de visitas. Funciona hoje
  porque não há ciclo aberto lá, mas voltaria a pegar parcial se alguém
  carregasse visitas do ciclo em andamento.

---

# Notas de atualização

**Prática combinada em 18/08/2026:** toda vez que algo for atualizado no
sistema, escrever uma **nota de atualização** para enviar por e-mail aos
usuários, em linguagem de negócio — o que mudou na tela, o que a pessoa vai
notar de diferente e, quando for o caso, o que ela precisa fazer.

As notas ficam em `NOTAS-DE-ATUALIZACAO.md`.

<!--
Para acrescentar um item, copie o bloco abaixo:

## N. Título curto

**Tela:** nome da tela (`/rota`)

O que é e por quê.

**A decidir quando formos implementar:**
- ...
-->
