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

## 3. Revisão dos ícones de ajuda ("?") nos cards

**Telas:** Visão Executiva, Alocação de Recursos, Visitação × Segmentação,
Target List e os gráficos de Cobertura/MDV.

Os cards têm um ícone de ajuda que abre um texto explicando a métrica. Revisar
esses textos: se estão corretos, se estão claros para quem não é da área e se
estão padronizados entre as telas.

Alguns exemplos do que existe hoje:

- *"Porcentagem de médicos visitados em relação ao número de médicos do painel."*
- *"Média de visitas por dia útil trabalhado no período selecionado."*
- *"Quantidade média de amostras entregues por médico (Total de Amostras / nº de
  médicos distintos que receberam amostra, conforme o filtro)."*

**Pontos de atenção já identificados:**
- O texto da Cobertura fala em "médicos visitados", mas na Visão Executiva o
  cálculo conta **visitas**, não médicos distintos. O texto descreve a régua da
  tela de Segmentação, não a da própria tela.
- "Média de visitas por dia útil trabalhado" — o divisor são os dias
  **trabalhados**, que não é o mesmo que dias úteis do ciclo.
- Uns textos citam a fórmula entre parênteses, outros não. Vale escolher um
  padrão.

Referência: a `Régua dos Indicadores` (documento de 18/08) tem a descrição
conferida de cada métrica.

---

## 4. Revisar os cálculos

Revisão geral das fórmulas por trás dos indicadores — confirmar com a área de
negócio se cada uma responde à pergunta certa.

**Já mapeado e aguardando validação:**
- **Duas réguas de cobertura.** Visão Executiva conta visitas sobre o painel do
  ciclo; Visitação × Segmentação conta médicos sobre o painel de hoje. Ciclo 09
  dá 84,5% e 80,4%. Ambas corretas, mas confirmar se as duas devem existir.
- **MDV divide por dias trabalhados**, então faltar melhora o indicador.
  Confirmar se é o comportamento desejado.
- **Regra de classificação do "Indicativo"** (manter / atenção / ação) — o corte
  é 10% acima da MDV necessária. A coluna está oculta desde 18/08 justamente
  para essa validação.
- **Meta de 90% ajustada por dias úteis** (`90% × DU ÷ 15`).
- **Painel travado em 180** quando passa de 190 — hoje nunca dispara, mas a
  regra está no código.
- **Insights ignora o ciclo 01** por ser atípico.

---

## 5. Target List não desconsidera setores "não considerar" — ✅ APLICADO 18/08

**Tela:** Médicos não Visitados (`/target-list`)

**Verificado em 18/08: ela NÃO filtra.** A consulta usa `metas_ciclo` apenas
para descobrir quais são os 3 ciclos mais recentes; não há nenhuma condição de
`considerar` no filtro. Médicos de setor marcado como não considerar entram na
lista normalmente.

**Impacto medido** (janela 202607–202609):

| | |
|---|---:|
| Médicos na lista | 457 |
| Vindos de setor "não considerar" | **179 (39%)** |

Os 5 setores envolvidos:

| Setor | Representante | Na lista | `considerar` por ciclo (07/08/09) |
|---|---|---:|---|
| RO_PORTOVELHO | Mary Anny Alexandre | 69 | sim / não / não |
| SPC_ZONALESTE | Aleksandra Furtado | 55 | não / não / sim |
| PR_CTBA_1 | Andrew Andrade Vaz | 33 | não / não / sim |
| RS_CAXIAS | Jenice Biegelmeyer | 20 | sim / não / não |
| SC_FLORIPA_BC | Raphael Carvalho | 2 | sim / sim / não |

**Decisão tomada (18/08):** passa a filtrar, pelo critério de **maioria** — o
setor sai se estiver "não considerar" na maior parte dos ciclos da janela.
Aplicado tanto na lista quanto no total de ativos exibido ao lado, para os dois
falarem da mesma base. Resultado: a lista foi de **457 para 280 médicos**,
saindo PR_CTBA_1, RO_PORTOVELHO, RS_CAXIAS e SPC_ZONALESTE. O SC_FLORIPA_BC
continua, por ter 2 ciclos "sim" contra 1 "não".

**Ainda em aberto:**
- **O `considerar` varia entre os ciclos da janela.** Nenhum dos 5 setores é
  "não considerar" nos três. Então a regra precisa definir: exclui se estiver
  fora em **algum** ciclo, na **maioria**, ou só no **mais recente**? A escolha
  muda bastante o resultado — pelo critério "algum ciclo" saem 179 médicos;
  pelo "mais recente" sairiam bem menos.
- Vale conferir também se o mesmo vale para outras telas que listam médicos.

---

## 6. Revisar as regras de negócio com a gerência

Várias regras hoje estão implementadas por decisão técnica ou por combinação
pontual, sem validação formal com a gerência. Elas mudam número em tela, então
vale uma rodada de aprovação antes de virarem referência oficial.

**Regras a validar:**

| Regra | Como está hoje | Pergunta |
|---|---|---|
| Setor "não considerar" na Target List | sai pela **maioria** dos 3 ciclos (18/08) | maioria é o corte certo, ou deveria ser o ciclo mais recente? |
| Duas réguas de cobertura | Visão Executiva por visita/painel do ciclo; Segmentação por médico/painel de hoje | as duas devem coexistir? qual é a oficial? |
| MDV | divide por dias trabalhados | faltar melhora o indicador — é o desejado? |
| Indicativo (manter/atenção/ação) | corte em 10% acima da MDV necessária | o corte é esse? a coluna está oculta desde 18/08 aguardando isso |
| Meta de cobertura | 90% ajustado por dias úteis (`90% × DU ÷ 15`) | confirmar a base de 90% e o ajuste proporcional |
| Painel ideal | reduzido na origem (~180), com teto de 190 no código | confirmar o teto e quem define o painel ideal |
| Ciclo 01 nos Insights | excluído por ser atípico | manter a exclusão? vale para o próximo ano? |
| Potencial 0 | fora dos cards de potencial (448 médicos) | manter fora, ou criar card "não classificado"? |
| Janela da Target List | 3 ciclos sem visita | 3 é o certo para caracterizar abandono? |

**Sugestão:** levar a `Régua dos Indicadores` (documento de 18/08) para a
reunião — ela tem cada fórmula descrita em linguagem de negócio, o que evita
discutir código.

---

## 7. Senha individual para cada usuário

**Tela:** Login (`/login`) e uma tela nova de conta/perfil.

Hoje todos os usuários entram com a **mesma senha** (`@Exeltis123`), definida na
liberação de 18/08. E não há como trocá-la: a tela de login está com
`showLinks={false}`, que remove "Esqueci a senha" e "Cadastre-se", e não existe
tela de perfil no sistema. Só o administrador troca, pelo painel do Supabase,
uma conta por vez.

**Consequências:**
- A senha compartilhada fica na caixa de entrada de todos, indefinidamente.
- Sem responsabilização individual: o registro de acesso não distingue quem foi.
- Quando alguém sair da empresa, é preciso trocar a senha de **todos**.
- Combina mal com o fato de qualquer usuário logado enxergar o painel completo
  de médicos (nome, CRM, endereço).

**Dois caminhos, e um é bem mais barato:**

**A) Tela de "alterar senha" para quem já está logado.** Não precisa de e-mail —
o usuário já está autenticado, então basta uma tela simples que grava a nova
senha. Resolve o essencial: cada um passa a ter a sua. O comentário no código
diz que "ambos exigiriam envio de e-mail", mas isso vale para a recuperação,
não para a troca com o usuário logado.

**B) Recuperação de senha ("Esqueci a senha").** Aí sim precisa de envio de
e-mail configurado no Supabase Auth — servidor SMTP próprio ou o serviço padrão,
que tem limite de envios. Necessário se alguém esquecer a senha e não puder
esperar o administrador.

**Sugestão:** começar pela A, que é pequena e já elimina a senha compartilhada.
A B entra quando o número de usuários crescer e o suporte manual pesar.

**A decidir:**
- Forçar troca no primeiro acesso, ou deixar opcional?
- Exigir senha forte? O Supabase tem verificação de senha vazada (hoje
  desligada — ver Pendências técnicas).

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
