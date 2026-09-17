# Notas de atualização

Registro do que muda no dashboard, em linguagem de negócio, para envio aos
usuários. Mais recente no topo.

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
