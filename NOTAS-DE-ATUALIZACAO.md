# Notas de atualização

Registro do que muda no dashboard, em linguagem de negócio, para envio aos
usuários. Mais recente no topo.

---

## 24/09/2026 — painel de médicos atualizado e ciclo 11 nas bases

### O painel foi atualizado e mudou de tamanho

O cadastro de médicos estava com a posição de 1º de setembro e passou para a de
hoje. O que mudou:

- **112 médicos novos** entraram no painel.
- **63 voltaram** ao painel depois de terem saído.
- **120 saíram**, por não constarem mais como ativos no cadastro de origem.
- 34 mudaram de setor e 59 tiveram a classificação ajustada.

No total, o painel ativo passou de **15.631 para 15.686 médicos**. Como a
cobertura é calculada sobre o painel, é normal que os percentuais mudem
levemente — o número de médicos da conta mudou, não a régua.

**O histórico de visitas de quem saiu continua no sistema.** Ninguém é apagado:
quem deixou o painel só para de contar daqui para frente, e some da lista de
médicos não visitados.

### Score e potencial dos médicos novos

Os 112 médicos que entraram no painel chegaram sem score e sem potencial, porque
esses dois números vêm de uma base própria, separada do cadastro. Eles já foram
cruzados: **96 receberam score e potencial** e **16 ficaram zerados**, por não
constarem na base nacional.

Com isso, os gráficos por potencial passam a considerar esses médicos. O número
de médicos ativos sem potencial definido subiu de 445 para 461 — são os que a
base nacional não cobre, e que continuam fora dos cards de potencial.

### O ciclo 11 entrou nas telas

O ciclo 11 (31/08 a 18/09) fechou e já está completo: visitas, metas, dias
trabalhados e dias abonados. Ele passa a ser o ciclo mais recente em Cobertura e
MDV, Insights, Visitação × Segmentação e Médicos não Visitados, e já pode ser
escolhido nos filtros de ciclo.

Como fica o ciclo, comparado aos anteriores:

| Ciclo | Visitas | Cobertura | Média de visitas por dia |
|---|---:|---:|---:|
| 9 | 12.641 | 84,5% | 10,44 |
| 10 | 12.167 | 81,4% | 10,58 |
| **11** | **11.881** | **79,6%** | **10,78** |

A cobertura caiu, mas o ritmo diário subiu. Os dois andam juntos: o ciclo 11 teve
**14 dias úteis**, contra 15 do ciclo 10. Menos dias no ciclo significam menos
visitas no total, ainda que cada dia tenha rendido mais. É por isso que a meta de
cobertura também é ajustada pelo número de dias úteis do ciclo.

### A segmentação agora tem histórico

Esta é a mudança mais importante do dia, e resolve um problema antigo.

Até hoje o sistema guardava **uma única** segmentação por médico. Quando chegava
uma base nova, ela valia para tudo — inclusive para ciclos já fechados. Os
relatórios do passado mudavam de valor sozinhos, mesmo sem nenhuma visita ter
mudado. Foi por isso que, no começo de setembro, a segmentação de agosto precisou
ser desfeita: ela chegou no fim do ciclo 10 e não correspondia ao que o
representante tinha em mãos durante aquele ciclo.

Agora cada versão da segmentação vale **a partir de um ciclo**:

- **Até o ciclo 10** — segmentação de maio, que é a que a força de vendas usou.
- **Do ciclo 11 em diante** — segmentação de agosto.

Na prática: cada relatório passa a mostrar a segmentação que **valia naquele
ciclo**. O passado para de se mexer, e a próxima base nova não vai mais alterar
número de ciclo fechado.

**O que você vai notar:**

- Ao olhar o **ciclo 11 ou o 12**, a segmentação é a de agosto. Muitos médicos
  mudaram de segmento entre as duas versões, nos dois sentidos, então as fatias
  dos gráficos ficam diferentes do que você via ontem.
- Ao olhar **ciclos até o 10**, tudo volta a ser exatamente como era — inclusive
  a fatia "SEM SEGMENTAÇÃO", que naqueles ciclos era maior.
- A fatia **"SEM SEGMENTAÇÃO" cai de 1.047 para 321 médicos, mas só do ciclo 11
  em diante**. São 726 médicos que já estavam segmentados na base da área e
  nunca tinham sido carregados aqui.
- Na tela de **Médicos não Visitados**, que fala do painel de hoje, vale sempre
  a versão mais recente.

Os 321 restantes não constam na base de segmentação da área e precisam ser
segmentados na origem.

### Amostras do ciclo 11

As amostras também entraram: **91.014 unidades** entregues em 5.812 visitas, ou
seja, **49% das visitas do ciclo** tiveram entrega de amostra.

O volume ficou bem abaixo do ciclo 10, e isso não é falha de carga — é o padrão
que se repete. Os ciclos alternam entre uma rodada forte e uma mais fraca de
entrega:

| Ciclo | Unidades | Visitas com amostra |
|---|---:|---:|
| 8 | 170.403 | 65% |
| 9 | 86.775 | 49% |
| 10 | 179.195 | 64% |
| **11** | **91.014** | **49%** |

O ciclo 11 é quase idêntico ao ciclo 9, que foi a rodada equivalente.

---

## 17/09/2026 — tela de entrada

### A tela de login mudou de cara

Ao entrar no sistema você vai encontrar uma tela diferente: fundo azul da
marca, a identidade da Exeltis ao lado e o formulário à direita.

**O acesso não mudou.** Mesmo e-mail, mesma senha, mesmo caminho depois de
entrar. Não é preciso cadastrar nada de novo nem redefinir senha.

O título agora diz **"Acesso ao HUB de IM"**, no lugar de "Acesso ao Sistema",
para deixar claro logo na porta que ali dentro estão as duas coisas: o
Dashboard de Efetividade e os relatórios de demanda e prescrição.

### A aba do navegador agora identifica o sistema

Antes, quem deixava o sistema aberto em uma aba via só "SFE Dashboard" e um
ícone em branco, difícil de achar no meio de várias abas. Agora a aba mostra
**"HUB de Inteligência de Mercado"** e a borboleta da Exeltis.

Só muda o que aparece no navegador — nenhuma tela, número ou acesso foi
alterado.

---

## 17/09/2026

### Amostras: filtrar por classificação médica

No gráfico de **Amostras por Segmentação** agora existe um filtro de
**classificação** (médico de TH e pré-natal, médico que não faz TH e pré-natal,
e as demais). Dá para selecionar mais de uma ao mesmo tempo segurando **Ctrl**
enquanto clica.

O filtro vale só para esse gráfico e para o "Detalhar" dele — os outros cartões
da tela continuam mostrando o total. Isso é de propósito: o gráfico ao lado já
separa por classificação, e aplicar o filtro nele deixaria uma barra só.

### Cobertura e MDV: correção no filtro de setor

**Atenção, este número muda.** Ao escolher um setor específico no topo da
primeira tela, os gráficos de Cobertura e MDV continuavam mostrando o resultado
do distrito inteiro — o filtro de setor não estava chegando neles. Agora chega.

Se você comparar com um print antigo filtrando por setor, o valor vai estar
diferente. **O valor novo é o correto.** Os números sem filtro de setor (Brasil,
estrutura ou distrito) não mudaram.

### Gráficos ficam em barras quando a leitura é de uma estrutura só

Cobertura e MDV já viravam barras quando você olhava um ciclo único. Agora
também viram barras quando você filtra **uma estrutura única** (Brasil, um
distrito ou um setor). Uma linha sozinha não compara nada; em barra fica mais
fácil ler a evolução ciclo a ciclo.

Nos gráficos de barra os números sobre as barras ficaram **maiores e com
contorno branco**, para não sumirem em cima da cor.

### Relatórios da área (menu Relatórios)

- **Demanda e Prescrição:** o contador de médicos não auditados passou a ser
  calculado a partir dos próprios dados. Antes ele estava fixo e continuaria
  mostrando o número antigo a cada atualização de base.
- **Performance:** cartão novo de **Desempenho por Região**, com tabela
  ordenável, e dados atualizados até **Ago/26** (antes iam até Jul/26). Como a
  janela móvel andou um mês, os acumulados MAT e YTD passaram a ser de agosto.

---

## Rodada anterior (já no ar)

### "Detalhar": ver os médicos por trás de cada número

As tabelas de **Visitação x Segmentação** e de **Entrega de Amostras** ganharam
um botão **Detalhar**. Ele abre a lista dos médicos que formam aquele número,
com busca por nome ou CRM, navegação por páginas e **exportação para Excel**.

A exportação traz a tabela inteira da marca, não só a página que está na tela —
não é preciso exportar segmento por segmento.

### Excel sai identificado

Toda exportação agora vem com um cabeçalho dizendo **de qual tela saiu, quais
filtros estavam aplicados, quantos registros tem, a data da exportação e quem
exportou**. Serve para quando o arquivo circula por e-mail e alguém pergunta de
onde veio aquele recorte.

As exportações de médicos passaram a trazer também **estado, município, bairro
e CEP**.

### Médicos não Visitados: filtro de período

A tela passou a ter um filtro de período — **3 ciclos, 6 ciclos ou no ano**. A
opção de "último ciclo" foi retirada de propósito: o número saía certo, mas a
leitura não — um médico não visitado em um único ciclo não significa médico
descoberto.

### Correção: gráfico de dispersão dos Insights

Ao selecionar mais de um ciclo, o gráfico de dispersão ficava vazio. Corrigido.

---

## Sobre os dados

### Ciclo 10 carregado

Metas, visitas, amostras e abonos do ciclo 10 já estão no ar.

### A segmentação voltou a ser a de maio

Chegamos a carregar a segmentação de agosto, mas ela foi revertida para a de
maio. **Motivo:** o representante trabalhou o ciclo inteiro com a segmentação
antiga no radar de visitação. Cruzar a visitação dele com uma segmentação que
mudou praticamente no fim do ciclo avaliaria o trabalho por um alvo que ele não
tinha.

A cobertura total não muda com isso (76,8% nas duas). O que muda é a
**composição** — cerca de 12% dos médicos trocaram de grupo entre uma versão e
outra. A segmentação de agosto entra depois que o ciclo 11 fechar.
