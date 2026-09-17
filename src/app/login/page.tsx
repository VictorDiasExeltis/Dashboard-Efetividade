"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { getSupabaseClient } from "@/src/lib/supabase/client";

// Fundo da tela: malha de gradientes radiais nos azuis da marca. A
// irregularidade vem de sobrepor varios circulos de tamanhos, posicoes e
// opacidades diferentes — um gradiente so daria aquele degrade de template.
// Base marinho profunda com manchas de azul e ciano por cima. No escuro a
// logica inverte: as camadas CLAREIAM em vez de escurecer, entao a opacidade
// alta e o que traz cor, nao peso. O card branco vira o ponto de luz.
// Tons: #1e3a8a (brand do botao), #2d7dd2 (azul Exeltis), #4cc9f0 (ciano).
const FUNDO_AZUL = {
  backgroundColor: "#173a6d",
  backgroundImage: [
    // Pontos de luz. Vem PRIMEIRO na lista de proposito: em background-image a
    // primeira camada e pintada por cima, entao aqui eles clareiam os azuis.
    // No fim da lista ficariam embaixo e sumiriam.
    "radial-gradient(22% 18% at 16% 80%, rgba(255,255,255,0.16) 0%, transparent 70%)",
    "radial-gradient(18% 15% at 90% 58%, rgba(255,255,255,0.14) 0%, transparent 70%)",
    "radial-gradient(16% 13% at 64% 6%, rgba(255,255,255,0.12) 0%, transparent 70%)",
    "radial-gradient(12% 10% at 6% 34%, rgba(255,255,255,0.10) 0%, transparent 72%)",
    "radial-gradient(72% 62% at 8% 8%, rgba(20,45,105,0.80) 0%, transparent 60%)",
    "radial-gradient(58% 58% at 96% 22%, rgba(45,125,210,0.70) 0%, transparent 56%)",
    "radial-gradient(68% 58% at 70% 104%, rgba(76,201,240,0.45) 0%, transparent 60%)",
    "radial-gradient(42% 36% at 36% 58%, rgba(76,201,240,0.18) 0%, transparent 70%)",
  ].join(", "),
};

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    // 1. Checa se o usuário já tem uma sessão ativa ao montar a página
    const checkSession = async () => {
      const hasHashToken = window.location.hash.includes("access_token") ||
                           window.location.hash.includes("error");

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/hub");
      } else if (!hasHashToken) {
        // Só removemos o loading (exibindo o form) se não tiver token pra processar.
        // Se tiver, mantemos o loading enquanto o Supabase faz o login em background.
        setLoading(false);
      }
    };

    checkSession();

    // 2. Ouve as mudanças de estado na autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          router.push("/hub");
        }
      }
    );

    // Limpeza do listener ao desmontar o componente
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // Evita o "flash" do formulário de login caso o usuário já esteja logado
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={FUNDO_AZUL}>
        <div className="animate-pulse flex space-x-4">
          <div className="h-3 w-3 bg-slate-400 rounded-full"></div>
          <div className="h-3 w-3 bg-slate-400 rounded-full"></div>
          <div className="h-3 w-3 bg-slate-400 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={FUNDO_AZUL}>
      {/* Card retangular dividido: marca a esquerda, formulario a direita.
          No celular a coluna da imagem sai (hidden) e sobra so o formulario,
          senao a imagem em retrato empurraria os campos para fora da tela. */}
      {/* min-h so a partir de md: no celular o card e so o formulario, e
          forcar altura la deixaria um vazio embaixo dos campos. */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden md:flex md:items-stretch md:min-h-[580px]">
        {/* A moldura leva o respiro (p-3) e o miolo leva o arredondado. O
            Image usa fill, que se ancora na caixa de padding — por isso a
            imagem precisa deste div interno, senao ela cobriria o respiro. */}
        <div className="hidden md:flex md:w-1/2 p-3">
          <div className="relative w-full overflow-hidden rounded-xl bg-slate-100">
            <Image
              src="/Tela%20login%202.jpeg"
              alt="Exeltis — Rethinking healthcare"
              fill
              priority
              sizes="(max-width: 767px) 0px, 430px"
              className="object-cover"
            />
          </div>
        </div>

        <div className="p-8 md:w-1/2 md:p-10 md:flex md:flex-col md:justify-center">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Acesso ao HUB de IM</h1>
            <p className="text-slate-500 mt-2 text-sm">
              Dashboard de Efetividade e relatórios de demanda e prescrição,
              reunidos em um único acesso.
            </p>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#1e3a8a', // Tom azul escuro corporativo (blue-900 no Tailwind)
                    brandAccent: '#1e40af', // Tom ligeiramente mais claro para hover (blue-800)
                    inputBackground: '#ffffff',
                    inputText: '#0f172a',
                    inputBorder: '#cbd5e1',
                    inputBorderFocus: '#1e3a8a',
                    inputBorderHover: '#94a3b8',
                  },
                  space: {
                    inputPadding: '12px 16px',
                    buttonPadding: '12px 16px',
                  },
                  radii: {
                    borderRadiusButton: '8px',
                    buttonBorderRadius: '8px',
                    inputBorderRadius: '8px',
                  },
                },
              },
              className: {
                button: 'shadow-sm font-medium transition-colors',
                input: 'shadow-sm transition-colors',
                container: 'w-full',
                label: 'text-slate-700 font-medium mb-1',
              }
            }}
            // Define a visualização padrão como login por e-mail e senha
            view="sign_in"
            // Remove provedores OAuth para ter APENAS email
            providers={[]}
            // Remove links secundários de navegação ("Esqueci a senha", "Cadastre-se").
            // Mantemos false pois ambos exigiriam envio de e-mail.
            showLinks={false}
            localization={{
              variables: {
                sign_in: {
                  email_label: "Endereço de e-mail corporativo",
                  password_label: "Senha",
                  email_input_placeholder: "nome@empresa.com",
                  password_input_placeholder: "Sua senha",
                  button_label: "Entrar",
                  loading_button_label: "Entrando..."
                }
              }
            }}
          />

          {/* Recuperacao de senha e manual: o Supabase Auth precisaria de SMTP
              configurado para o fluxo de "esqueci a senha". Como sao poucos
              usuarios, o pedido vai direto ao suporte, que redefine a senha e
              limpa a marca de primeiro acesso para o usuario escolher outra. */}
          <p className="mt-5 text-center text-xs text-slate-500">
            Esqueceu a senha?{" "}
            <a
              href="mailto:victor.eugenio@exeltis.com?subject=Dashboard%20de%20Efetividade%20-%20recuperacao%20de%20senha&body=Ola%2C%20preciso%20redefinir%20minha%20senha%20de%20acesso%20ao%20Dashboard%20de%20Efetividade.%0A%0AMeu%20e-mail%20de%20acesso%3A%20"
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              Fale com o suporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
