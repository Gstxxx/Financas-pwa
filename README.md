# Dashboard Financeiro · PWA

App pessoal de finanças, instalável no celular, funciona offline e salva os dados localmente (`localStorage`).

## Arquivos

```
financas/
├── index.html          ← App (HTML + CSS + JS embutidos)
├── manifest.json       ← Config do PWA
├── service-worker.js   ← Cache offline
└── icon.svg            ← Ícone do app
```

## Como publicar (3 opções rápidas)

> Importante: PWA exige **HTTPS**. Localhost também funciona pra teste.

### 1. Vercel (mais fácil — 30 segundos)
1. Crie conta em [vercel.com](https://vercel.com)
2. Arraste a pasta `financas` no painel "New Project"
3. Pronto. Você recebe uma URL tipo `seu-app.vercel.app`

### 2. Netlify Drop (sem cadastro)
1. Acesse [app.netlify.com/drop](https://app.netlify.com/drop)
2. Arraste a pasta `financas`
3. Pronto

### 3. GitHub Pages
1. Crie um repositório no GitHub
2. Suba os 4 arquivos
3. Em Settings → Pages → habilite "Deploy from branch"

## Como instalar no celular

Depois de publicado, abra a URL no celular:

- **Android (Chrome)**: aparece um banner "Instalar app". Ou menu ⋮ → "Instalar aplicativo"
- **iPhone (Safari)**: botão Compartilhar → "Adicionar à Tela de Início"

O app vira um ícone na home do celular e abre em tela cheia, sem barras do navegador.

## Funcionalidades

- ✓ Saldo do ciclo (entradas − saídas) calculado automaticamente
- ✓ Status automático: Atrasado / Vence em breve / Em dia
- ✓ Filtros por status
- ✓ Adicionar, ver detalhes e excluir contas
- ✓ Tags coloridas (Pai, Amor, Fixo, Parcelado, Serviços, Outros)
- ✓ Barra de progresso para parcelados
- ✓ Funciona offline depois da primeira visita
- ✓ Dados ficam no celular (`localStorage`)

## Personalizar

Tudo está em **um único arquivo** `index.html`. Para ajustar:

- **Cores**: bloco `:root` no `<style>` (variáveis `--bg`, `--accent`, etc.)
- **Categorias**: variável `TAG_LABELS` no `<script>`
- **Dados iniciais**: variável `SEED` no `<script>` (será usado se o `localStorage` estiver vazio)

## Limpar dados

Botão de seta circular no canto superior direito → restaura os dados de exemplo.

Para limpar tudo manualmente: nas DevTools do navegador → Application → Local Storage → limpar.
