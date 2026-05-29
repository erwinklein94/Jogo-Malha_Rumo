# Jogo Trilha de Carreira Rumo

Jogo em HTML, CSS e JavaScript para perguntas e respostas sobre as áreas de qualidade presentes no banco de dados anexado.

O usuário começa como **Trocador de dormente** e sobe de nível a cada acerto até chegar a **Vice-presidente** e **Presidente da empresa**.

## Como abrir localmente

1. Baixe ou clone este repositório.
2. Abra o arquivo `index.html` no navegador.

Não precisa instalar nada. O jogo roda 100% no navegador.

## Como publicar no GitHub Pages

### Opção 1: Pelo site do GitHub

1. Crie um novo repositório no GitHub.
2. Envie os arquivos deste pacote para a raiz do repositório:
   - `index.html`
   - `.nojekyll`
   - `README.md`
3. No repositório, entre em **Settings**.
4. Vá em **Pages**.
5. Em **Build and deployment**, escolha **Deploy from a branch**.
6. Em **Branch**, selecione:
   - Branch: `main`
   - Folder: `/root`
7. Clique em **Save**.
8. Depois que o GitHub publicar, o link aparecerá na própria tela de **Pages**.

### Opção 2: Pelo terminal

```bash
git init
git add .
git commit -m "Adicionar jogo trilha de carreira"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
git push -u origin main
```

Depois configure o GitHub Pages em **Settings > Pages**, usando `main` e `/root`.

## Estrutura

```text
.
├── index.html
├── .nojekyll
└── README.md
```

## Observações

- O arquivo principal precisa se chamar `index.html` para abrir automaticamente no GitHub Pages.
- O arquivo `.nojekyll` evita que o GitHub tente processar o projeto como um site Jekyll.
- Todo o conteúdo do jogo está dentro de `index.html`, então é fácil publicar e compartilhar.
