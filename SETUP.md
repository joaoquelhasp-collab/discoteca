# Discoteca — Guia de Setup 🎵

Vais pôr a tua app online em ~20 minutos. Não precisas de saber programar.

> Conta com **três coisas grátis**: GitHub (guardar o código), Vercel (alojar a app online) e Spotify Developer (dar à app permissão para falar com o Spotify).

---

## ✅ Antes de começares

Precisas de:
- Conta **Spotify Premium** (já tens)
- Um **computador** (Windows ou Mac, com browser)
- Cerca de **20 minutos**

Não precisas de instalar nada no computador — vamos fazer tudo pelo browser.

---

## Passo 1 — Criar conta no GitHub (2 min)

O GitHub é onde o código da app vai viver.

1. Vai a **https://github.com/signup**
2. Cria uma conta gratuita (basta email + password)
3. Confirma o email

---

## Passo 2 — Criar um repositório novo no GitHub (3 min)

Um "repositório" é uma pasta online com o código.

1. Já com login feito, clica em **"+"** no canto superior direito → **"New repository"**
2. Em **"Repository name"** escreve: `discoteca`
3. Deixa marcado como **Public** (privado também funciona se preferires)
4. **Marca a caixa** "Add a README file"
5. Clica em **"Create repository"**

---

## Passo 3 — Carregar os ficheiros da app (5 min)

1. Descarrega o ficheiro **`discoteca-setup.zip`** que te enviei
2. **Descomprime-o** no teu computador (faz duplo-clique no ZIP). Vais ter uma pasta chamada `discoteca-setup` com vários ficheiros lá dentro.
3. Volta ao GitHub, ao teu repositório
4. Clica em **"Add file"** → **"Upload files"**
5. **Abre** a pasta `discoteca-setup` no teu computador
6. **Seleciona tudo o que está lá dentro** (Ctrl+A no Windows / Cmd+A no Mac) e **arrasta** para a página do GitHub
   - ⚠️ **Importante**: arrasta o **conteúdo** da pasta, não a pasta inteira. Tens de ver os ficheiros `package.json`, `index.html`, a pasta `src`, etc. na lista de uploads.
7. Espera que faça o upload (vês os ficheiros listados)
8. Em baixo, clica em **"Commit changes"**

---

## Passo 4 — Criar a app Spotify Developer (4 min)

Esta app não é nada visível para o utilizador — é só uma "chave" para o teu código poder falar com o Spotify.

1. Vai a **https://developer.spotify.com/dashboard**
2. Faz login com a tua conta Spotify (a mesma que tem o Premium)
3. Clica em **"Create app"**
4. Preenche:
   - **App name**: `Discoteca` (ou o que quiseres)
   - **App description**: `App pessoal para jogar Hitster caseiro`
   - **Redirect URI**: deixa em branco **por agora** (vamos voltar a este passo)
   - **Which API/SDKs are you planning to use?**: marca **"Web API"**
   - Aceita os termos
5. Clica em **"Save"**

Vais ver a página da tua app. **Não fechas esta janela** — vamos voltar.

---

## Passo 5 — Pôr a app online no Vercel (5 min)

O Vercel pega no teu código no GitHub e cria um site público.

1. Vai a **https://vercel.com/signup**
2. Clica em **"Continue with GitHub"** (cria conta usando o teu GitHub)
3. Autoriza o Vercel a aceder ao teu GitHub
4. No dashboard do Vercel, clica em **"Add New..."** → **"Project"**
5. Vais ver os teus repositórios do GitHub. Encontra **`discoteca`** e clica em **"Import"**
6. Na página de configuração:
   - **Framework Preset**: deve detetar automaticamente "Vite". Se não, escolhe **Vite** manualmente.
   - **Root Directory**: deixa como está (`/`)
   - **Build Command**, **Output Directory**: deixa os valores por defeito
7. Clica em **"Deploy"**
8. Espera ~1 minuto enquanto faz o build

Quando acabar, vais ver **"🎉 Congratulations!"** e um link tipo `https://discoteca-abcd.vercel.app`. **Copia esse link** — é o URL da tua app!

---

## Passo 6 — Ligar a app Spotify ao Vercel (2 min)

Agora voltamos ao Spotify Developer para meter o URL.

1. Volta à tab do **Spotify Developer Dashboard**
2. Na tua app "Discoteca", clica em **"Settings"** (canto superior direito)
3. Em **"Redirect URIs"**, cola o URL que o Vercel te deu, mas **sem barra no fim**
   - Exemplo: `https://discoteca-abcd.vercel.app` (✅)
   - **NÃO**: `https://discoteca-abcd.vercel.app/` (❌ com barra no fim falha)
4. Clica em **"Add"**
5. Clica em **"Save"** lá em baixo
6. Ainda nesta página, **copia o "Client ID"** (é uma string longa de letras e números). Vais precisar dele a seguir.

---

## Passo 7 — Primeira utilização (1 min)

1. Abre o URL do Vercel no browser (do teu iPhone, computador, onde quiseres)
2. Aparece um aviso amarelo a dizer "Configuração necessária" → clica em **"Configurar agora"**
3. Cola o **Client ID** que copiaste do Spotify
4. Clica em **"Guardar"**
5. Volta atrás, clica em **"Entrar com Spotify"**
6. Autoriza a app
7. Pronto! Estás dentro 🎉

---

## 🎮 Como jogar

1. **No iPhone**: abre o Spotify app. Liga-te a uma coluna por Bluetooth (opcional, fica melhor). Toca qualquer música por 1 segundo só para "ativar" o dispositivo.
2. **No browser do iPhone** (Safari, Chrome): abre a Discoteca
3. Vai a **"Tocar / Escanear"**
4. Na lista de dispositivos, escolhe o teu **iPhone** (ou outro dispositivo)
5. Clica em **"Escanear QR"** e aponta para uma carta
6. A música começa a tocar no Spotify, e o ecrã mostra disco a girar
7. Quando todos quiserem, clica em **"Revelar resposta"** para ver título/artista/ano

### Gerar cartas

1. Cria uma playlist no Spotify (ou usa uma existente)
2. **Copia o link** dessa playlist (botão "..." na playlist → "Share" → "Copy link")
3. Na Discoteca → **"Gerar cartas"**
4. Cola o link → "Carregar"
5. Quando aparecerem as músicas → **"Descarregar PDF"**
6. Imprime o PDF, corta as cartas, e está pronto a jogar!

---

## 🐛 Problemas comuns

**"Nenhum dispositivo encontrado"**
→ Abre o Spotify e toca qualquer música. Volta à Discoteca e clica em "🔄 Atualizar".

**"Precisas de Spotify Premium"**
→ Esta app só funciona com Premium (limitação da Spotify, não da app).

**"INVALID_CLIENT: Invalid redirect URI"**
→ O Redirect URI no Spotify Dashboard não bate certo com o URL da Vercel. Confirma que copiaste exatamente o URL **sem barra no fim**.

**A música começa, mas não toca som**
→ Verifica que o volume do Spotify está alto e que escolheste o dispositivo certo na lista da Discoteca.

**Quero usar a app noutro telemóvel/computador**
→ Funciona em qualquer dispositivo, basta abrir o URL e fazer login. A configuração Client ID guarda-se por browser, por isso da primeira vez em cada dispositivo terás de a configurar (Definições → cola o mesmo Client ID).

---

## 💡 Notas finais

- A app é **só tua** — nenhum dado sai para servidores externos. Tudo corre entre o teu browser e o Spotify.
- Podes atualizar a app no futuro: basta editar os ficheiros no GitHub e a Vercel reconstrói automaticamente.
- Os QR codes que gerares servem para sempre — só deixam de funcionar se o Spotify remover a música do catálogo.

Bom jogo! 🎵
