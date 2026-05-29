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


## Eventos de custo de via

Esta versão inclui uma camada de ocorrências de via que geram custo ao jogador, como:

- trilho empenado por calor;
- lastro encharcado;
- dormentes danificados;
- furto de cabos de sinalização;
- queda de barreira;
- vegetação na faixa de domínio;
- alagamento;
- falha em chave/AMV;
- passagem de nível bloqueada;
- animal na via;
- veículo obstruindo a linha;
- sinal vermelho indevido;
- inspeção obrigatória surpresa;
- fiscalização com não conformidade;
- restrição temporária de velocidade;
- erosão;
- ponte com limite de carga;
- desalinhamento geométrico;
- contaminação no leito da via;
- pane no detector de roda quente;
- interferência elétrica;
- baixa aderência;
- descarrilamento leve;
- cruzamento com outra composição;
- licença operacional vencida.

Os eventos podem gerar custo imediato, custo recorrente por segundo, redução de velocidade, bloqueio de trecho e perda de sequência. Contratos expirados agora também geram penalidade financeira.


## Investimentos avançados

Esta versão inclui uma árvore de **73 investimentos avançados** compráveis pelo botão **Mais investimentos**.

Categorias incluídas:

- **Via:** inspeção, sensores, drenagem, dormentes, lastro, AMVs, oficina móvel, terceirizada premium e controle preditivo.
- **Carga:** terminais, rastreabilidade, certificações, cargas premium, refrigeradas, expressas, industriais e sazonais.
- **Risco financeiro:** seguros, compliance, gestão documental, contingência, gestão ambiental e renovação automática.
- **Velocidade:** sinalização moderna, CTC, rádio digital, piloto automático, curvas, traçado, pátios e despacho inteligente.
- **Vagões:** reforço de pontes, classificação de via, locomotiva auxiliar, freio eletrônico, engates, câmeras e balanceamento.
- **Previsibilidade:** sala de crise, painel preditivo, mapa de risco, histórico inteligente, IA, janelas de manutenção e previsão climática.

Os investimentos afetam diretamente:

- chance de ocorrência dos eventos negativos;
- custo imediato e custo recorrente dos eventos;
- duração dos bloqueios;
- custo e tempo de manutenção terceirizada;
- multa por parada;
- penalidade de contrato expirado;
- velocidade média;
- valor da entrega;
- bônus de contratos expressos;
- risco de operar com muitos vagões.
