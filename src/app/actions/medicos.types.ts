// Tipos compartilhados do domínio "Médicos não Visitados".
// Mantidos fora do arquivo `'use server'` para evitar restrições do Next
// (Server Action files devem exportar apenas funções async).

export interface MedicoNaoVisitado {
  crmuf:         string;
  nome_medico:   string;
  classificacao: string | null;
  score:         number | null;
  potencial:     number | null;
  slinda:      string | null;
  regenesis:   string | null;
  gynpro:      string | null;
  gynotran:    string | null;
  hemolip:     string | null;
  vizuria:     string | null;
  especialidade: string | null;
  nome_setor:    string | null;
  nome_distrito: string | null;
}
