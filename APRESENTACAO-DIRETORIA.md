# Dashboard de Efetividade — Roteiro de Apresentação à Diretoria

> Documento de apoio para apresentar o sistema tela a tela, explicando cada
> indicador, cada cálculo e respondendo às dúvidas mais prováveis sobre
> funcionamento, dados, segurança e atualização.
>
> **Como usar:** o texto em destaque (“💬 Fala”) é o que você pode dizer em voz
> alta. Os blocos técnicos abaixo de cada fala servem para você responder com
> segurança se alguém aprofundar.

---

## 1. Abertura — o que é o sistema

💬 **Fala:**
“Este é o **Dashboard de Efetividade da Força de Vendas**. Ele transforma os
dados brutos de visitação, segmentação, amostras e produtividade dos nossos
representantes em **indicadores de gestão prontos para decisão**. Em vez de
planilhas dispersas, a liderança passa a ter, em um único lugar, uma visão
consolidada — do Brasil inteiro até o setor de um representante específico — e
sempre com a possibilidade de filtrar por distrito, setor, ciclo, produto e
classificação do médico.”

**Pontos de valor para reforçar:**
- **Uma fonte única de verdade** — todos olham o mesmo número, calculado da mesma forma.
- **Da visão macro à micro** — o mesmo indicador pode ser visto no nível Brasil, Distrito ou Setor.
- **Foco em ação** — o sistema não só mostra o que aconteceu, mas aponta *onde agir* (ex.: médicos de alto potencial sem visita).

**O sistema tem 4 telas:**
| # | Tela | Pergunta de negócio que responde |
|---|------|----------------------------------|
| 1 | **Cobertura e MDV** | Estamos visitando o suficiente? Com que intensidade? |
| 2 | **Visitação x Segmentação** | Estamos visitando os médicos *certos* (os prioritários)? |
| 3 | **Entrega de Amostras** | Estamos distribuindo amostras de forma alinhada à prioridade? |
| 4 | **Médicos não Visitados** | Quem está ficando descoberto e deveria ser visitado? |

---

## 2. Como o sistema funciona (visão de arquitetura)

💬 **Fala:**
“O sistema é uma aplicação web moderna. O usuário acessa pelo navegador, faz
login, e tudo roda de forma segura na nuvem. Os dados ficam em um banco de dados
profissional, e a aplicação apenas *lê* esses dados para calcular os
indicadores na hora.”

**Stack técnica (para quem perguntar):**
- **Aplicação web:** Next.js 15 + React 19 (TypeScript). Interface responsiva (funciona em desktop e celular).
- **Gráficos:** biblioteca Recharts.
- **Banco de dados:** **PostgreSQL** gerenciado pelo **Supabase** (plataforma de banco de dados na nuvem, baseada em Postgres).
- **Autenticação:** Supabase Auth (login por e-mail e senha).
- **Cálculos pesados:** feitos no próprio banco de dados, via *funções SQL* e *Server Actions* — ou seja, o número chega pronto ao navegador, sem expor a base.

**Fluxo dos dados, em uma frase:**
> Dados de origem → carregados nas tabelas do banco (Supabase) → a aplicação consulta e calcula os KPIs → exibe em cards e gráficos no navegador.

**Modelo de dados (organização em “dimensões” e “fatos”):**

*Tabelas de dimensão (o “cadastro”):*
- `dim_medicos` — cadastro de médicos: CRM, nome, classificação, especialidade, **score**, **potencial** (1 a 5) e status (ativo/inativo).
- `dim_hierarquia` — estrutura comercial: setor → representante → distrito → gerente.
- `dim_produtos` — produtos e a qual marca pertencem.
- `dim_calendario` — relação entre datas e ciclos.

*Tabelas de fato (os “acontecimentos”):*
- `fato_visitas` — cada visita registrada (médico, setor, ciclo, data).
- `fato_segmentacao` — a segmentação de cada médico por marca (PROTEGER, CONQUISTAR, MANTER, OBSERVAR).
- `fato_amostras` — amostras entregues (vinculadas à visita e ao produto).
- `fato_abonos` — horas abonadas por representante e motivo.
- `metas_ciclo` — por setor/ciclo: tamanho do painel, dias trabalhados e se aquele setor deve ser considerado no cálculo.

💬 **Fala simplificada:**
“Pense em duas categorias: o **cadastro** (quem são os médicos, qual a estrutura
de vendas, quais os produtos) e os **acontecimentos** (quais visitas ocorreram,
quais amostras foram entregues). O dashboard cruza essas duas categorias para
gerar os indicadores.”

---

## 3. Conceitos que aparecem em todas as telas

Vale alinhar **antes** de entrar nas telas, para não repetir:

- **Ciclo:** período de trabalho da força de vendas (ex.: `202604` = 4º ciclo de 2026). Quase todos os indicadores podem ser vistos por um ou vários ciclos.
- **Painel:** conjunto de médicos-alvo de um setor (vem de `metas_ciclo.tamanho_painel`).
- **Segmentação (prioridade do médico):** **PROTEGER** (máxima prioridade) › **CONQUISTAR** › **MANTER** › **OBSERVAR**. Cada médico tem uma segmentação **por marca**.
- **Potencial:** escala de **1 a 5**, onde **1 = maior potencial** de prescrição e **5 = menor**.
- **Filtros globais (topo da tela):** Estrutura (Brasil/Distrito/Setor), Distrito, Setor, Ciclo, Produto e Classificação — conforme a tela. É possível **selecionar vários ciclos** ao mesmo tempo (Ctrl+clique).

---

## 4. TELA 1 — Cobertura e MDV (Visão Executiva)

**Rota:** `/visao-executiva` · **Pergunta:** “Estamos visitando o suficiente e com que intensidade?”

💬 **Fala:**
“Esta é a tela de abertura, a visão executiva. No topo temos quatro indicadores
de performance, e abaixo a evolução deles ao longo dos ciclos, mais a análise de
abonos por representante.”

### 4.1 Os 4 cards de KPI

**① Cobertura de Visitação**
- **O que é:** o quanto do painel foi coberto pela visitação.
- **Cálculo:** `total de visitas ÷ tamanho do painel × 100`.
- Mostra também a **Média Brasil** (para comparar o recorte filtrado com o país) e a **variação vs. ciclo anterior** (em *pontos percentuais*).
- **Meta de referência: 90%** (aparece como linha tracejada no gráfico).

**② Média Diária de Visitas (MDV)**
- **O que é:** intensidade de visitação — quantas visitas, em média, por dia útil trabalhado.
- **Cálculo:** `total de visitas ÷ total de dias trabalhados`.
- Também traz Média Brasil e variação vs. ciclo anterior. **Meta de referência: 10,8.**

**③ Visitas Totais**
- **O que é:** o volume absoluto de visitas no período.
- **Cálculo:** contagem de todas as visitas (`fato_visitas`) no recorte selecionado.

**④ Visitas Únicas**
- **O que é:** quantos **médicos distintos** foram visitados (evita contar o mesmo médico duas vezes).
- **Cálculo:** contagem de CRMs distintos com visita no período.

> **Sobre as setas de tendência (verde/vermelho):** comparam o valor atual com o
> **ciclo imediatamente anterior**. Se você seleciona o primeiro ciclo da base
> (sem anterior para comparar), a seta some — proposital, para não exibir
> comparação inválida.

**Detalhe técnico (se perguntarem sobre a Média Brasil):** o “Brasil” é
recalculado para a **mesma janela de ciclos** selecionada, para a comparação ser
justa (mesma régua de tempo no recorte e no país).

### 4.2 Gráficos de evolução — Cobertura e MDV por estrutura

💬 **Fala:**
“Aqui vemos a *evolução*. Cada linha é um distrito (ou setor, se eu detalhar um
distrito). A linha vermelha tracejada é a meta. Assim enxergamos tendência: quem
está subindo, quem está caindo, quem está acima ou abaixo da meta.”

- **Cobertura por Distrito/Setor:** uma linha por distrito (ou setor), ciclo a ciclo. Meta 90%.
- **MDV por Distrito/Setor:** mesma lógica para a média diária. Meta 10,8.
- **Comportamento inteligente:** se houver **um único ciclo** selecionado, o gráfico vira **barras** (linha com um ponto só não faria sentido).
- Há um botão **“Rótulos”** para exibir/ocultar os valores sobre cada ponto.

### 4.3 Seção de Abonos (rosca + tabela, sincronizadas)

💬 **Fala:**
“Por fim, a análise de abonos — as ausências justificadas. À esquerda, os
motivos mais frequentes; à direita, o detalhamento por representante. Os dois
respeitam o mesmo filtro de ciclo.”

**Gráfico de rosca — Motivos de Abono:**
- Agrupa as horas abonadas por **motivo** e mostra os **6 principais**.
- **Conversão:** os abonos são registrados em **horas**; o sistema converte para **dias** dividindo por 8 (`horas ÷ 8`). O número no centro é o **total de dias** abonados.

**Tabela — Detalhamento por Representante:**
- Para cada representante: **dias trabalhados** (soma das metas ativas do período) e **dias abonados** (horas ÷ 8).
- Representantes sem meta ativa no período são marcados como desconsiderados.
- Tem paginação (12 por página).

---

## 5. TELA 2 — Visitação x Segmentação

**Rota:** `/visitacao-x-segmentacao` · **Pergunta:** “Estamos visitando os médicos *certos*?”

💬 **Fala:**
“Cobertura alta é bom, mas não basta visitar muito — temos que visitar os
médicos **prioritários**. Esta tela cruza a visitação com a segmentação, por
produto.”

### 5.1 Os 5 cards de Potencial

- Cinco cards, um para cada nível de **potencial (1 a 5)**.
- Cada card mostra o **% de médicos do painel** naquele nível (e o número absoluto no canto).
- **Cálculo:** `médicos no nível N ÷ total de médicos do painel × 100`.
- Respeita os filtros de **território e classificação**. Como potencial é uma característica fixa do médico, **não depende do ciclo**.

💬 **Fala:** “Isso mostra a *qualidade do nosso painel*: quanto dele é de alto potencial.”

### 5.2 As 6 tabelas por produto

Uma tabela para cada marca: **Família Regenesis, Slinda, Gynotran, Gynpro, Hemolip e Vizuria**.

Cada tabela quebra os médicos por segmentação (PROTEGER, CONQUISTAR, MANTER, OBSERVAR, SEM SEGMENTAÇÃO) e mostra:
- **Visitados:** quantos médicos daquela segmentação foram visitados no ciclo (número e % sobre o total).
- **Não Visitados:** o complemento.
- **Total Geral** no rodapé.

💬 **Fala:**
“O que eu quero ver aqui é a coluna *Visitados* alta nas linhas **PROTEGER** e
**CONQUISTAR** — são os médicos que mais importam para aquela marca. Se a
cobertura dos PROTEGER está baixa, é um alerta de direcionamento.”

---

## 6. TELA 3 — Entrega de Amostras

**Rota:** `/alocacao-de-recursos` · **Pergunta:** “As amostras estão indo para quem tem prioridade?”

💬 **Fala:**
“Amostra é investimento. Esta tela mostra para onde esse investimento está indo
— por segmentação e por classificação do médico.”

### 6.1 Os 3 cards de KPI

**① Total de Médicos** — médicos únicos ativos no painel (respeita o território filtrado).

**② Média Geral de Amostras**
- **Cálculo:** `total de amostras entregues ÷ total de médicos do painel`.
- Usa o painel como denominador para não distorcer (um médico que aparece em várias marcas é contado uma vez só).

**③ Total de Amostras Entregues** — soma de todas as unidades de amostra entregues (`fato_amostras.quantidade`) no período.

### 6.2 Os 2 gráficos (barras + linha)

Ambos combinam **barras** (nº de médicos) com uma **linha** (média de amostras por médico):

- **Por Segmentação:** distribui médicos e amostras entre PROTEGER/CONQUISTAR/MANTER/OBSERVAR. A segmentação é determinada pela **marca do produto efetivamente entregue**.
- **Por Classificação Médica:** mesma análise, mas quebrada pela classificação do médico.

💬 **Fala:**
“Quero ver a **linha de média de amostras mais alta nos segmentos
prioritários**. Se estamos entregando muita amostra em OBSERVAR e pouca em
PROTEGER, há um desalinhamento entre o investimento e a estratégia.”

---

## 7. TELA 4 — Médicos não Visitados (Target List)

**Rota:** `/target-list` · **Pergunta:** “Quem está descoberto e precisa de ação?”

💬 **Fala:**
“Esta é a tela mais acionável. Ela lista os médicos **ativos que ficaram sem
visita nos últimos 3 ciclos** — a nossa lista de recuperação.”

**Definição de “não visitado” (critério do sistema):**
- Médico **ativo**;
- **sem nenhuma visita** nos **3 ciclos mais recentes**;
- e que **não** tenha sido **incluído** no painel nesses últimos 3 ciclos (para não penalizar médicos recém-cadastrados).

### 7.1 Os 4 cards de KPI

**① Total sem Visita** — quantidade de médicos na lista.

**② Médicos não Visitados (Taxa de Abandono)**
- **Cálculo:** `não visitados ÷ total de médicos ativos do território × 100`.
- Mostra também os números absolutos (“X de Y médicos no painel”).

**③ Alto Potencial Não Visitado** — médicos da lista com **potencial 1 ou 2**. São a prioridade de recuperação.

**④ Multi-marca Não Visitado** — médicos da lista com segmentação ativa em **3 ou mais marcas**. Alvos estratégicos de portfólio.

### 7.2 A tabela e a exportação

- Lista cada médico com **CRM, especialidade, a segmentação em cada uma das 6 marcas, Score Exeltis e Potencial**.
- **Ordenável** por qualquer coluna, com **busca** por nome/CRM.
- **Botão “Exportar”**: gera um arquivo **Excel (.xlsx)** com a lista filtrada — pronto para distribuir aos representantes como plano de ação.

💬 **Fala:**
“Na prática, o gestor filtra o distrito dele, ordena por potencial, exporta o
Excel e manda para a equipe. Vira plano de visita imediato.”

---

## 8. Perguntas prováveis da diretoria (Q&A preparado)

### Sobre os DADOS

**“De onde vêm os dados?”**
Dos sistemas de origem da força de vendas (registros de visita, segmentação,
amostras, metas e produtividade). Esses dados são carregados nas tabelas do
banco de dados na nuvem (Supabase/PostgreSQL), e o dashboard os consome para
calcular os indicadores.

**“Com que frequência os dados são atualizados?”**
O dashboard sempre exibe **o que está no banco no momento do acesso** — não há
defasagem entre o banco e a tela. A **carga** dos dados é feita a cada **3
semanas**, acompanhando o ciclo da força de vendas, garantindo que cada ciclo
fechado esteja refletido no painel.
> 🚀 *Roadmap:* a atualização é hoje conduzida manualmente pela área responsável.
> Está prevista a construção de um **script de ETL** para automatizar essa carga,
> reduzindo esforço operacional e o risco de erro manual.

**“Os números são confiáveis? Como sei que o cálculo está certo?”**
Cada indicador tem uma **fórmula única e centralizada** — o mesmo cálculo vale
para todas as telas e todos os usuários. As regras estão descritas neste
documento e implementadas em funções no banco de dados, o que elimina
divergência de planilhas. Cada card tem ainda um **ícone de ajuda (?)** que
explica sua fórmula na própria tela.

**“Posso confiar no histórico? O dado de um ciclo passado muda?”**
Os ciclos fechados refletem o que foi registrado. Indicadores como potencial e
segmentação refletem o **cadastro atual** do médico (são características vigentes,
não “fotografias” do passado) — vale deixar isso claro ao analisar séries longas.

### Sobre SEGURANÇA

**“Quem pode acessar o sistema?”**
Apenas usuários **com login e senha** criados por nós. Não há cadastro aberto: as
contas são provisionadas manualmente pela administração do sistema.

**“Como funciona o login?”**
Autenticação via **Supabase Auth**, padrão de mercado. As senhas **não são
armazenadas em texto** — ficam criptografadas (hash) na plataforma. A sessão do
usuário é protegida por token.

**“Os dados trafegam de forma segura?”**
Sim. Toda a comunicação é via **HTTPS** (criptografada em trânsito). O banco fica
na infraestrutura gerenciada do Supabase, que oferece criptografia e backups.

**“Um representante consegue ver os dados de outro distrito?”**
Sim — e isso é **intencional**. A liderança definiu que a visão deve ser
**transparente e compartilhada**: todos os usuários autorizados enxergam todos os
territórios. Isso favorece o *benchmarking* entre distritos e uma cultura de
comparação saudável. O controle de acesso é por **login** (só entra quem é
autorizado), mas, uma vez dentro, a base é visível por completo.
> *Caso no futuro se queira segmentar o acesso por território, a arquitetura
> permite (perfis de acesso / RLS) — mas hoje, por decisão de negócio, o acesso é
> amplo.*

**“E se um funcionário sair?”**
A conta é **desativada/removida** em segundos no painel administrativo, cortando
o acesso imediatamente.

### Sobre FUNCIONAMENTO e MANUTENÇÃO

**“Onde isso roda? Precisa instalar algo?”**
Não. É **100% web** — basta o navegador e o login. Roda na nuvem; não há
instalação na máquina do usuário.

**“E se cair? Tem backup?”**
O banco fica em uma plataforma gerenciada (Supabase) com **backups automáticos**.
A aplicação é hospedada em infraestrutura de nuvem escalável.

**“Quanto custa manter?”**
Os custos são de **infraestrutura de nuvem** (banco/hospedagem) e do serviço de
e-mail transacional para o login — todos com planos previsíveis e escaláveis
conforme o uso.

**“Dá para adicionar novas telas / indicadores?”**
Sim. A arquitetura é modular: novos indicadores, filtros e telas podem ser
adicionados sem refazer o que existe. Distritos, setores, produtos e ciclos
novos aparecem **automaticamente** nos filtros assim que entram na base.

**“Funciona no celular?”**
Sim, a interface é responsiva e se adapta a telas menores.

### Sobre EVOLUÇÃO (mostrar visão de futuro)

Possíveis próximos passos que você pode antecipar como roadmap:
- **Script de ETL** para automatizar a carga de dados (hoje feita manualmente a cada 3 semanas).
- **Autoatendimento de senha** (recuperação por e-mail) e/ou login corporativo único (SSO).
- Novos indicadores conforme a necessidade da diretoria.

---

## 9. Roteiro rápido (colar “na ponta da língua”)

1. **Abertura:** “Fonte única de verdade para a efetividade da força de vendas, do Brasil ao setor.”
2. **Tela 1 – Cobertura e MDV:** estamos visitando o suficiente (cobertura, meta 90%) e com que intensidade (MDV, meta 10,8); evolução por ciclo; abonos.
3. **Tela 2 – Visitação x Segmentação:** estamos visitando os médicos certos? Qualidade do painel (potencial) + cobertura por prioridade, produto a produto.
4. **Tela 3 – Entrega de Amostras:** o investimento em amostra está alinhado à prioridade?
5. **Tela 4 – Médicos não Visitados:** lista acionável de recuperação, exportável em Excel.
6. **Fechamento:** “Dados seguros na nuvem, login controlado, cálculos centralizados e auditáveis, e arquitetura pronta para evoluir.”

---

### Anexo — Tabela-resumo dos cálculos

| Indicador | Tela | Fórmula |
|-----------|------|---------|
| Cobertura de Visitação | 1 | total de visitas ÷ tamanho do painel × 100 (meta 90%) |
| MDV | 1 | total de visitas ÷ dias trabalhados (meta 10,8) |
| Visitas Totais | 1 | contagem de todas as visitas no período |
| Visitas Únicas | 1 | contagem de médicos (CRM) distintos visitados |
| Dias Abonados | 1 | horas abonadas ÷ 8 |
| % por Potencial | 2 | médicos no nível N ÷ total do painel × 100 |
| % Visitados (segmentação) | 2 | médicos visitados ÷ total da segmentação × 100 |
| Média Geral de Amostras | 3 | total de amostras ÷ total de médicos do painel |
| Total de Amostras | 3 | soma das quantidades entregues |
| Taxa de Abandono | 4 | não visitados (3 ciclos) ÷ ativos do território × 100 |
| Alto Potencial Não Visitado | 4 | nº de não visitados com potencial 1 ou 2 |
| Multi-marca Não Visitado | 4 | nº de não visitados com segmentação em 3+ marcas |
