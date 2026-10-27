# I Can Do — versão web de teste

Copiloto de decisões para líderes. O ciclo é Capture → Clarify → Decide → Learn, sustentado pela espinha dorsal metodológica, e cada análise considera as quatro camadas de contexto: **quem sou, onde estou, o que faço e quem está ao meu redor**.

## O que tem nesta versão

- Login por e-mail, sem senha (link mágico).
- Primeiro acesso em etapas (uma pergunta por tela), montando as 4 camadas de contexto, com resumo no final.
- Tela inicial com o anel de luz animado (fios em longa exposição, névoa e poeira) e o anel "toque para conversar": você fala, a transcrição aparece ao vivo e, ao terminar a fala, o chat abre sozinho. O campo de digitar continua disponível, e as decisões recentes aparecem em cartões.
- A conversa começa pela situação: a IA cruza a fala com o cérebro do usuário (decisões em andamento, impactadas, conflitos e aprendizados), identifica quem decide (RAPID) e quem é afetado, e só então define a decisão que cabe ao usuário.
- Decisão guiada: relato → perguntas que mudam a análise → caminhos com recomendação → registro (confiança, sinal de sucesso, data de revisão) → próximos passos com responsável e prazo.
- Entrada por voz no navegador (Chrome, Edge e Safari). No Firefox, o botão do microfone não aparece.
- Histórico, próximos passos na tela inicial, revisão com aprendizado e calibração.
- Perfil com o contexto guardado nas 4 camadas (cores por camada), editável por cartão.
- My Mind: galáxia das decisões, pessoas e contexto, com conexões; o brilho mostra a relevância, que cai com o tempo, e as decisões revisadas ganham brilho de aprendizado.
- Triagem que comanda a profundidade (fluxo curto para decisões simples e reversíveis; completo, com teste de premissa e pre-mortem, para as complexas ou irreversíveis) e nota de Decision Quality (6 elementos, 0 a 100) em cada decisão e no relatório pessoal.
- Análise com método: cada pergunta e cada recomendação mostram o método da espinha dorsal que as sustenta (Decision Quality, 5 Porquês, Pre-mortem…). A decisão é sempre do usuário, e a ética vem acima de qualquer método, com alerta quando a situação toca em lei, ética ou direitos de pessoas.
- Relatório pessoal (como decido: acerto, calibração, qualidade do processo, forças) e relatório de valor (o que as decisões entregaram: resultado por área, casos, operação sem centralizar, time, confiança), com análise da IA que só cita valores financeiros quando o usuário os registrou.
- Frase do dia: na primeira abertura de cada dia, uma frase de incentivo sobre liderança gerada pela IA a partir do cérebro do usuário (sem repetir as recentes).
- Vídeo "Como funciona o I Can Do" no perfil.
- Funciona como app no celular ("Adicionar à tela de início").

**IA:** com `ANTHROPIC_API_KEY`, o app usa o Claude. Sem ela e com `OPENAI_API_KEY`, usa a OpenAI (modelo em `OPENAI_MODEL`, padrão `gpt-5.5`, com troca automática para `chat-latest` se o modelo não estiver disponível). Ao colocar a chave da Anthropic, ela passa a valer sozinha. Sem nenhuma das duas, o app roda em **modo demonstração**, com respostas simuladas. Sem o Supabase, roda em **modo local**: sem login, e os dados ficam só no navegador.

## Publicar (cerca de 15 minutos)

### 1. Supabase (banco e login)
1. Crie um projeto em [supabase.com](https://supabase.com). Na região, escolha São Paulo.
2. Em **SQL Editor → New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
4. (Opcional, exige SMTP próprio) Para personalizar o e-mail de login, configure um SMTP em **Authentication → SMTP Settings** e edite o template **Magic Link**. Sem isso, o e-mail padrão com o link "Sign in" funciona normalmente.
5. Depois do passo 2 da Vercel, volte em **Authentication → URL Configuration**. Em **Site URL**, coloque o endereço da Vercel (ex.: `https://icando-app.vercel.app`). Em **Redirect URLs**, adicione o mesmo endereço.

### 2. Vercel (hospedagem)
1. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e importe o repositório `icando-app`.
2. Em **Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon public |
| `ANTHROPIC_API_KEY` | chave criada em [console.anthropic.com](https://console.anthropic.com) |
| `ALLOWED_EMAILS` | e-mails liberados para usar a IA, separados por vírgula |

3. Clique em **Deploy**. A cada novo envio para o GitHub, a Vercel publica a versão nova sozinha.

### 3. Convidar testadores
Pelo app: no seu perfil, em **Convites**, digite o e-mail e toque em **Liberar**. Vale na hora, sem Redeploy. (Precisa ter rodado a parte "Convites" do `supabase/schema.sql`; o administrador é definido na função `is_admin()`.)
Alternativa: coloque o e-mail em `ALLOWED_EMAILS` na Vercel e faça **Redeploy**. Cada pessoa vê apenas as próprias decisões.

**Limite de e-mails:** o envio de e-mails padrão do Supabase permite poucos e-mails por hora. Para mais testadores, configure um SMTP próprio (Resend, por exemplo) em **Authentication → SMTP Settings**.

## Rodar no computador
```
npm install
cp .env.example .env.local   # preencha ou deixe vazio para modo local + demonstração
npm run dev
```

## Estrutura
- `lib/app.js`: o app (telas, motor de conversa, voz, armazenamento).
- `lib/ai.js`: prompts, respostas de demonstração e leitura do JSON (roda só no servidor).
- `app/api/ai/route.js`: endpoint da IA. Confere o login e a lista de e-mails, e a chave da Anthropic nunca vai para o navegador.
- `supabase/schema.sql`: tabelas e regras de acesso, em que cada pessoa só acessa os próprios dados.
