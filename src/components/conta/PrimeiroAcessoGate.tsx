'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, Check, X } from 'lucide-react';
import { getSupabaseClient } from '@/src/lib/supabase/client';

// Marca gravada no perfil do usuário no Supabase. Enquanto não existir, a tela
// de definição de senha aparece a cada login.
const MARCA = 'senha_alterada';

// Exigências da senha, mostradas em lista viva enquanto a pessoa digita — é mais
// claro do que recusar no fim e obrigar a adivinhar o que faltou.
//
// As faixas acentuadas (À-Ö, Ø-Þ, ø-ÿ) existem para tratar letra como letra:
// sem elas "Ção" contaria o "Ç" como caractere especial e "ção" passaria como
// se tivesse maiúscula. Especial é o que sobra: nem letra, nem número.
const REGRAS: { texto: string; ok: (s: string) => boolean }[] = [
  { texto: 'No mínimo 8 caracteres',              ok: (s) => s.length >= 8 },
  { texto: 'Ao menos 1 letra maiúscula',          ok: (s) => /[A-ZÀ-ÖØ-Þ]/.test(s) },
  { texto: 'Ao menos 1 número',                   ok: (s) => /[0-9]/.test(s) },
  { texto: 'Ao menos 1 símbolo (! @ # $ % & ...)', ok: (s) => /[^A-Za-z0-9À-ÖØ-öø-ÿ]/.test(s) },
];

// Primeiro acesso: obriga a definir uma senha própria antes de usar o sistema.
// Todos os usuários são criados com a mesma senha inicial; esta tela garante
// que ninguém continue com ela. Aparece sobreposta a qualquer tela após o
// login e some assim que a senha é definida — a marca fica no perfil do
// usuário, então não volta em outro dispositivo nem depois de sair e entrar.
export function PrimeiroAcessoGate() {
  const [precisa, setPrecisa] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const avaliar = (user: { user_metadata?: Record<string, unknown> } | null | undefined) => {
      // Sem sessão (ex.: tela de login) a barreira não aparece.
      if (!user) { setPrecisa(false); return; }
      setPrecisa(user.user_metadata?.[MARCA] !== true);
    };

    supabase.auth.getSession().then(({ data }) => avaliar(data.session?.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      avaliar(sessao?.user);
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const atendidas = REGRAS.map((r) => r.ok(senha));
  const completa = atendidas.every(Boolean);

  if (!precisa) return null;

  async function definir(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!completa) {
      setErro('A senha ainda não atende a todas as exigências abaixo.');
      return;
    }
    if (senha !== confirmacao) {
      setErro('As duas senhas não são iguais.');
      return;
    }

    setSalvando(true);
    // Grava senha e marca na mesma chamada: se falhar, nada é aplicado pela
    // metade e a tela reaparece no próximo acesso.
    const { error } = await getSupabaseClient().auth.updateUser({
      password: senha,
      data: { [MARCA]: true },
    });
    setSalvando(false);

    if (error) {
      // O Supabase também valida do lado dele. As mensagens vêm em inglês, então
      // traduzimos os casos que a pessoa consegue resolver sozinha. A ordem
      // importa: a recusa por composição também traz "weak" no texto, e sem o
      // teste de "should contain" antes ela cairia na mensagem de vazamento.
      const m = error.message.toLowerCase();
      if (m.includes('should be different') || m.includes('same as the old')) {
        setErro('A nova senha precisa ser diferente da senha inicial.');
      } else if (m.includes('should contain') || m.includes('should be at least')) {
        setErro('A senha não atende às exigências acima. Revise a lista e tente de novo.');
      } else if (m.includes('pwned') || m.includes('compromised') || m.includes('weak')) {
        setErro('Essa senha é muito comum e apareceu em vazamentos conhecidos. Escolha outra.');
      } else if (m.includes('reauthentication') || m.includes('nonce')) {
        setErro('Sua sessão expirou. Saia, entre de novo e refaça este passo.');
      } else {
        setErro('Não foi possível salvar a senha. Tente novamente.');
      }
      return;
    }

    setPrecisa(false);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-7 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Defina sua senha</h2>
            <p className="text-xs text-slate-500">Primeiro acesso ao sistema</p>
          </div>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-slate-600">
          Você entrou com a senha inicial, que é a mesma para todos. Escolha uma
          senha pessoal para continuar — ela será pedida nos próximos acessos.
        </p>

        <form onSubmit={definir}>
          <label className="mb-1 block text-xs font-medium text-slate-700">Sua nova senha</label>
          <div className="relative mb-3">
            <input
              type={mostrar ? 'text' : 'password'}
              value={senha}
              onChange={(ev) => setSenha(ev.target.value)}
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Digite a nova senha"
            />
            <button
              type="button"
              onClick={() => setMostrar((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
              aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Lista viva: cada item fica verde assim que a regra passa. */}
          <ul className="mb-4 space-y-1">
            {REGRAS.map((r, i) => (
              <li
                key={r.texto}
                className={`flex items-center gap-1.5 text-xs ${
                  atendidas[i] ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                {atendidas[i] ? (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <X className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                )}
                {r.texto}
              </li>
            ))}
          </ul>

          <label className="mb-1 block text-xs font-medium text-slate-700">Repita a nova senha</label>
          <input
            type={mostrar ? 'text' : 'password'}
            value={confirmacao}
            onChange={(ev) => setConfirmacao(ev.target.value)}
            className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Digite de novo"
          />

          {erro && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {salvando ? 'Salvando...' : 'Salvar e continuar'}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Guarde sua senha. Se esquecer, será preciso pedir a redefinição ao suporte.
        </p>
      </div>
    </div>
  );
}
