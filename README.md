# embeddedsearchengine.lugarerrado.com

## Descrição
Mecanismo de Busca Embarcado — Motor de busca integrado para o ecossistema lugarerrado.

## Stack
HTML, Cloudflare Workers, SearXNG e Docker no Render.

## Arquitetura
O Worker publica a interface no domínio `embeddedsearchengine.lugarerrado.com`
e encaminha as pesquisas para uma instância dedicada do SearXNG. Ela reúne
resultados de Bing e Wikipédia sem tirar o
visitante da página.

O SearXNG é construído pelo Render a partir de `render.yaml` e
`searxng/Dockerfile`. O plano gratuito pode adormecer após um período sem uso;
a primeira pesquisa depois disso pode levar cerca de um minuto.

O histórico de pesquisas é armazenado pela API de
`documentation.lugarerrado.com` em um banco Cloudflare D1.

## Desenvolvimento

```bash
pnpm install
pnpm run dev
```

## Publicação

Primeiro, crie o Blueprint no Render usando o `render.yaml`. Depois publique o
Worker:

```bash
pnpm run deploy
```

---

*Parte do [lugarerrado.com](https://lugarerrado.com)*
