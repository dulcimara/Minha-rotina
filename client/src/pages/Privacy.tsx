import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

/**
 * Política de privacidade (versão de testes).
 * Texto em linguagem simples, com os pontos da LGPD. Antes do lançamento
 * público, deve ser revisado por um advogado.
 */
export default function Privacy() {
  const updated = "4 de novembro de 2026";
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Card className="p-5 bg-hero border-0 flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-mic text-white flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Minha Rotina</p>
            <h1 className="text-2xl font-display font-semibold">Política de privacidade</h1>
            <p className="text-sm text-muted-foreground">Atualizada em {updated} · versão de testes</p>
          </div>
        </Card>

        <article className="space-y-5 text-[15px] leading-relaxed [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
          <section>
            <h2>Em poucas palavras</h2>
            <p>
              O Minha Rotina guarda o que você cadastra para organizar o seu dia. Seus dados são seus: só você vê, não vendemos
              nada para ninguém e você pode baixar ou apagar tudo quando quiser, em <strong>Configurações → Seus dados</strong>.
            </p>
          </section>

          <section>
            <h2>Quais dados guardamos</h2>
            <ul>
              <li>Conta: nome, como quer ser chamada, data de nascimento, e-mail e senha (a senha é guardada de forma cifrada).</li>
              <li>Opcional, para estimar calorias: sexo e peso.</li>
              <li>O que você cadastra: compromissos, lembretes, exercícios, endereços e telefones, listas, compras, aniversários e ideias de presente, filmes e séries, perfis dos filhos.</li>
              <li>
                <strong>Dados sensíveis de saúde</strong>, só se você usar: ciclo menstrual, sintomas e humor, e remédios. Pedimos
                o seu consentimento específico antes do primeiro registro do ciclo.
              </li>
              <li>Configurações: cores, tipo de aviso, horário do resumo da manhã.</li>
              <li>Para os avisos com o app fechado: um identificador do aparelho para notificações e o fuso horário.</li>
            </ul>
          </section>

          <section>
            <h2>Para que usamos</h2>
            <ul>
              <li>Mostrar sua agenda, listas e informações no app.</li>
              <li>Enviar os avisos que você ligou (compromissos, remédios, aniversários, resumo da manhã, ciclo).</li>
              <li>Nada de propaganda e nada de vender ou repassar seus dados.</li>
            </ul>
          </section>

          <section>
            <h2>Comandos de voz</h2>
            <p>
              Quando você toca no microfone, o próprio navegador do celular transforma a fala em texto (no Chrome, pelo serviço
              do Google; no Safari, pela Apple). O app recebe só o texto, que é interpretado no seu aparelho. O áudio não é
              guardado pelo Minha Rotina.
            </p>
          </section>

          <section>
            <h2>Estatísticas de uso</h2>
            <p>
              Para saber quantas pessoas usam o app, guardamos o dia em que cada conta abriu o app (só a data, sem o que foi
              feito). A responsável pelo app vê apenas totais e a lista de contas (nome, e-mail, data de cadastro e do último
              acesso); nunca o conteúdo do que você cadastra.
            </p>
            <p>
              Se você ligar "Ajudar a melhorar o app" (desligado até você escolher), o app envia ao Google Analytics estatísticas
              anônimas de uso: telas abertas e recursos usados, tipo de aparelho e cidade aproximada. Nunca enviamos nome, e-mail,
              o que você cadastra ou dados de saúde (ciclo, remédios, filhos). O Google atua como operador; dá para desligar a
              qualquer momento em Configurações → Estatísticas de uso.
            </p>
          </section>

          <section>
            <h2>Entrar com Google</h2>
            <p>
              Se você escolher "Entrar com Google", o Google nos informa apenas seu nome, e-mail e foto de perfil, e confirma
              que o e-mail é seu. Não usamos a foto e não temos acesso à sua senha do Google, aos seus e-mails nem a outros
              dados da sua conta Google. Na primeira entrada pedimos a data de nascimento e o aceite desta política.
            </p>
          </section>

          <section>
            <h2>Trava com Face ID, digital ou PIN</h2>
            <p>
              Se você ligar a trava, quem confere o seu rosto, digital ou PIN é o próprio celular. O app recebe só a resposta
              "confirmado" ou "não confirmado" e não vê nem guarda nenhum dado biométrico.
            </p>
          </section>

          <section>
            <h2>Versículo do dia</h2>
            <p>
              Se a opção estiver ligada, o app busca uma vez por dia um versículo de Provérbios no serviço gratuito bible-api.com.
              Nenhum dado seu é enviado; o serviço vê apenas o pedido do versículo. Dá para desligar em Configurações.
            </p>
          </section>

          <section>
            <h2>Onde ficam os dados</h2>
            <p>
              Os dados ficam no Supabase (banco de dados na nuvem), protegidos por regras que fazem cada conta enxergar apenas
              os próprios registros. O app é publicado pelo Netlify. Esses serviços atuam como operadores e podem guardar dados
              fora do Brasil, com as proteções da LGPD.
            </p>
          </section>

          <section>
            <h2>Seus direitos (LGPD)</h2>
            <ul>
              <li>Ver e baixar seus dados: Configurações → Seus dados → Baixar meus dados.</li>
              <li>Corrigir: edite qualquer registro no próprio app.</li>
              <li>Apagar tudo: Configurações → Seus dados → Apagar minha conta. A exclusão é imediata e definitiva.</li>
              <li>Retirar consentimentos: apague os registros do ciclo ou a conta, e desligue os avisos nas configurações.</li>
            </ul>
          </section>

          <section>
            <h2>Crianças</h2>
            <p>
              O app é para pessoas adultas. Os perfis dos filhos são criados e controlados pela mãe, pai ou responsável, que
              decide quais informações registrar.
            </p>
          </section>

          <section>
            <h2>Contato</h2>
            <p>Dúvidas sobre privacidade: fale com a responsável pelo app pelo canal informado no convite de teste.</p>
          </section>
        </article>

        <p className="text-xs text-muted-foreground">
          Este texto é da fase de testes e será revisado por profissional jurídico antes do lançamento público.
        </p>
        <a href="/" className="inline-block text-sm text-primary underline-offset-4 hover:underline">
          ← Voltar para o app
        </a>
      </div>
    </div>
  );
}
