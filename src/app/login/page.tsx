"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { getSupabaseClient } from "@/src/lib/supabase/client";

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex space-x-4">
          <div className="h-3 w-3 bg-slate-400 rounded-full"></div>
          <div className="h-3 w-3 bg-slate-400 rounded-full"></div>
          <div className="h-3 w-3 bg-slate-400 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-slate-100">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Acesso ao Sistema</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Insira seu e-mail corporativo e sua senha para acessar
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
      </div>
    </div>
  );
}
