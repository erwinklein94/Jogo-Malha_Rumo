# Ferrovia Manager

Jogo simples em **HTML, CSS e JavaScript puro**, pronto para publicar no GitHub Pages.

## Como jogar

- A linha ferroviária liga o ponto **A** ao ponto **B**.
- Quando a linha está operacional, a locomotiva puxa vagões até o ponto B.
- Ao chegar no ponto B, o jogador recebe dinheiro pelo valor da carga.
- De tempos em tempos, um trecho da ferrovia quebra.
- Quando há qualquer trecho quebrado ou em obra, o trem fica parado.
- O jogador deve gastar dinheiro para contratar uma equipe terceirizada.
- Cada reparo leva **30 segundos**.
- O dinheiro também pode ser usado para melhorar:
  - velocidade da locomotiva;
  - valor da carga transportada.

## Arquivos

- `index.html`: jogo completo, incluindo HTML, CSS e JavaScript.
- `README.md`: instruções do projeto.

## Como rodar localmente

Abra o arquivo `index.html` no navegador.

Também dá para usar um servidor local simples:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie os arquivos `index.html` e `README.md` para a branch principal.
3. No GitHub, vá em **Settings → Pages**.
4. Em **Build and deployment**, selecione:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Salve e aguarde o link do GitHub Pages ser gerado.

## Observações técnicas

- Não usa bibliotecas externas.
- Funciona offline depois de baixado.
- Salva o progresso automaticamente no `localStorage` do navegador.
