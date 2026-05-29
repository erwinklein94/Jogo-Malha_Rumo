# Como colocar o jogo no GitHub

## Passo a passo rápido

1. Entre em https://github.com e crie um novo repositório.
2. Faça upload dos arquivos deste pacote para a raiz do repositório.
3. Confirme que o arquivo principal está com o nome `index.html`.
4. Entre em **Settings > Pages**.
5. Em **Source**, escolha **Deploy from a branch**.
6. Em **Branch**, escolha `main` e `/root`.
7. Salve.
8. Aguarde a publicação e copie o link gerado pelo GitHub Pages.

## Arquivos que devem estar no repositório

- `index.html` — o jogo.
- `.nojekyll` — evita processamento desnecessário pelo GitHub Pages.
- `README.md` — descrição do projeto.

## Comandos opcionais pelo terminal

```bash
git init
git add .
git commit -m "Adicionar jogo trilha de carreira"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
git push -u origin main
```
