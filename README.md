# Ferrovia Manager

Projeto estático pronto para publicar no **GitHub Pages**.

## Estrutura

```text
.
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── app.js
│   └── img/
│       └── favicon.svg
└── .nojekyll
```

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos desta pasta para a raiz do repositório.
3. No GitHub, vá em **Settings → Pages**.
4. Em **Build and deployment**, selecione:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/root`
5. Salve e aguarde o link do GitHub Pages ser gerado.

## Rodar localmente

Você pode abrir o `index.html` direto no navegador.

Também pode usar um servidor local simples:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

## Observações

- Não usa framework.
- Não precisa de Node, build, bundler ou dependências externas.
- O progresso do jogo é salvo no `localStorage` do navegador.
- O layout está otimizado para caber em uma tela no desktop e manter responsividade em telas menores.
