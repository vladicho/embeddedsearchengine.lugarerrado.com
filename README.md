# embeddedsearchengine.lugarerrado.com

## Descrição
Mecanismo de Busca Embarcado — Motor de busca integrado para o ecossistema lugarerrado.

## Stack
HTML, Google CSE e Cloudflare Workers com Static Assets.

## Arquitetura
O Worker publica a interface no domínio `embeddedsearchengine.lugarerrado.com`.
O histórico de pesquisas é armazenado pela API de
`documentation.lugarerrado.com` em um banco Cloudflare D1.

## Desenvolvimento

```bash
pnpm install
pnpm run dev
```

## Publicação

```bash
pnpm run deploy
```

---

*Parte do [lugarerrado.com](https://lugarerrado.com)*
