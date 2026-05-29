"use strict";

    /* ============================ Constantes ============================ */
    const STORAGE_KEY = "ferrovia-manager-save-v2";

    function safeGetStorage(key) {
      try { return window.localStorage?.getItem(key); } catch (e) { return null; }
    }
    function safeSetStorage(key, value) {
      try { window.localStorage?.setItem(key, value); } catch (e) {}
    }
    function safeRemoveStorage(key) {
      try { window.localStorage?.removeItem(key); } catch (e) {}
    }
    const PAID_REPAIR_TIME = 18;          // segundos (equipe terceirizada, rápida)
    const CREW_MAX_LEVEL = 8;             // mais etapas de evolução para manutenção própria
    const PREVENT_MAX_LEVEL = 8;          // mais etapas para manutenção preventiva
    const MAX_WAGON_EXTRA = 12;           // até 2 (base) + 12 = 14 vagões
    const BASE_WAGONS = 2;
    const WAGON_BONUS = 180;              // cada vagão aumenta o valor de cada entrega
    const STOP_FINE_RATE = 0.02;          // multa por segundo parado: 2% da entrega atual

    const CREW_TIME = [Infinity, 34, 30, 26, 22, 19, 16, 13, 11];       // segundos por nível
    const CREW_CAPACITY = [0, 1, 1, 2, 2, 3, 3, 4, 5];                 // trechos simultâneos
    const CREW_SHIFT = [
      null,
      { on: 38, off: 32 },
      { on: 46, off: 29 },
      { on: 56, off: 25 },
      { on: 68, off: 22 },
      { on: 82, off: 18 },
      { on: 100, off: 15 },
      { on: 125, off: 12 },
      { on: 999, off: 1 }
    ];

    // Tipos de carga reais da operação ferroviária (multiplicam o valor base)
    const CARGOS = [
      { id: "graos",       nome: "Grãos",       emoji: "🌾", mult: 1.00, cor: "#E3B23C", tipo: "hopper"    },
      { id: "fertilizante",nome: "Fertilizante",emoji: "🧪", mult: 1.10, cor: "#7FE06C", tipo: "gondola"   },
      { id: "acucar",      nome: "Açúcar",      emoji: "🍬", mult: 1.18, cor: "#EEF2F4", tipo: "covered"   },
      { id: "celulose",    nome: "Celulose",    emoji: "📦", mult: 1.28, cor: "#CDB892", tipo: "boxcar"    },
      { id: "combustivel", nome: "Combustível", emoji: "⛽", mult: 1.40, cor: "#AEB9C2", tipo: "tank"      },
      { id: "conteiner",   nome: "Contêineres", emoji: "🚢", mult: 1.55, cor: "#1E9F7F", tipo: "container" }
    ];
    const cargoById = (id) => CARGOS.find(c => c.id === id) || CARGOS[0];

    // Eventos operacionais aleatórios
    const EVENTS = [
      { id: "chuva",    nome: "Chuva forte na via",     emoji: "🌧️", desc: "Aderência reduzida: locomotiva mais lenta.", dur: 14, speed: 0.70 },
      { id: "vento",    nome: "Vento de cauda",         emoji: "🌬️", desc: "Empurrãozinho: composição mais veloz.",      dur: 12, speed: 1.28 },
      { id: "demanda",  nome: "Demanda aquecida",       emoji: "🔥", desc: "Mercado pagando mais por carga entregue.",   dur: 18, value: 1.40 },
      { id: "inspecao", nome: "Via inspecionada",       emoji: "🛡️", desc: "Trechos reforçados: sem novas falhas agora.", dur: 16, suppress: true },
      { id: "desgaste", nome: "Desgaste acelerado",     emoji: "⚠️", desc: "Trilhos castigados: falhas chegam mais cedo.", dur: 14, wear: 1.7 }
    ];


    const VIA_COST_EVENTS = [
      {
        id: "trilho_empenado_calor",
        nome: "Trilho empenado por calor",
        emoji: "🌡️",
        desc: "Calor deformou o trilho: correção emergencial e trem mais lento.",
        dur: 18, speed: 0.62, block: true, deliveryPct: 0.18, perSpeedLevel: 32,
        weight: 9
      },
      {
        id: "lastro_encharcado",
        nome: "Lastro encharcado",
        emoji: "🌧️",
        desc: "Base da via instável: operação lenta e drenagem emergencial.",
        dur: 24, speed: 0.55, recurringDeliveryPct: 0.006, fixed: 120, preventRelief: true,
        weight: 10
      },
      {
        id: "dormentes_danificados",
        nome: "Dormentes danificados",
        emoji: "🪵",
        desc: "Dormentes precisam de troca antes da composição seguir.",
        dur: 20, block: true, deliveryPct: 0.20, perWagon: 25, preventRelief: true,
        weight: 9
      },
      {
        id: "furto_cabos_sinalizacao",
        nome: "Furto de cabos de sinalização",
        emoji: "⚡",
        desc: "Sinalização degradada: reposição imediata e velocidade reduzida.",
        dur: 32, speed: 0.50, deliveryPct: 0.16, fixed: 180, recurringFixed: 9,
        weight: 8
      },
      {
        id: "queda_barreira",
        nome: "Queda de barreira na via",
        emoji: "🪨",
        desc: "Material sobre a linha: remoção obrigatória e trecho bloqueado.",
        dur: 26, block: true, deliveryPct: 0.30, fixed: 220,
        weight: 7
      },
      {
        id: "vegetacao_faixa_dominio",
        nome: "Vegetação na faixa de domínio",
        emoji: "🌿",
        desc: "Limpeza emergencial para manter gabarito e visibilidade.",
        dur: 16, speed: 0.78, deliveryPct: 0.10, fixed: 90,
        weight: 11
      },
      {
        id: "alagamento_trecho",
        nome: "Alagamento no trecho",
        emoji: "🌊",
        desc: "Água no leito da via: inspeção, atraso e bombeamento.",
        dur: 28, block: true, deliveryPct: 0.22, recurringDeliveryPct: 0.004,
        weight: 7
      },
      {
        id: "falha_chave_amv",
        nome: "Falha em chave / AMV",
        emoji: "🔀",
        desc: "Aparelho de mudança de via travou: manutenção especializada.",
        dur: 30, block: true, deliveryPct: 0.34, fixed: 280, perContract: 25,
        weight: 6
      },
      {
        id: "passagem_nivel_bloqueada",
        nome: "Passagem de nível bloqueada",
        emoji: "🚧",
        desc: "Interferência externa segura a composição no trecho.",
        dur: 15, block: true, deliveryPct: 0.08, fixed: 70,
        weight: 11
      },
      {
        id: "animal_na_via",
        nome: "Animal na via",
        emoji: "🐄",
        desc: "Parada de segurança até liberação da linha.",
        dur: 10, block: true, deliveryPct: 0.06,
        weight: 12
      },
      {
        id: "obstrucao_veiculo",
        nome: "Veículo obstruindo a linha",
        emoji: "🚗",
        desc: "Obstrução por terceiro gera espera e custo operacional.",
        dur: 18, block: true, deliveryPct: 0.13, fixed: 110,
        weight: 8
      },
      {
        id: "sinal_vermelho_indevido",
        nome: "Sinal vermelho indevido",
        emoji: "🚦",
        desc: "Falha segura a composição e reduz eficiência da viagem.",
        dur: 14, speed: 0.35, deliveryPct: 0.07, recurringFixed: 6,
        weight: 10
      },
      {
        id: "inspecao_obrigatoria_surpresa",
        nome: "Inspeção obrigatória surpresa",
        emoji: "🔎",
        desc: "Parada regulatória para checagem do trecho.",
        dur: 16, block: true, deliveryPct: 0.12, fixed: 130,
        weight: 7
      },
      {
        id: "fiscalizacao_nao_conformidade",
        nome: "Fiscalização com não conformidade",
        emoji: "📋",
        desc: "Irregularidade detectada: multa administrativa imediata.",
        dur: 8, deliveryPct: 0.25, fixed: 180, preventPenalty: true,
        weight: 7
      },
      {
        id: "restricao_temporaria_velocidade",
        nome: "Restrição temporária de velocidade",
        emoji: "🐢",
        desc: "Limite operacional reduz a velocidade e aumenta o custo do trajeto.",
        dur: 26, speed: 0.48, recurringDeliveryPct: 0.005, deliveryPct: 0.05,
        weight: 10
      },
      {
        id: "erosao_trecho",
        nome: "Erosão no trecho",
        emoji: "⛰️",
        desc: "Talude comprometido: intervenção pesada obrigatória.",
        dur: 34, block: true, deliveryPct: 0.42, fixed: 340, preventRelief: true,
        weight: 5
      },
      {
        id: "ponte_limite_carga",
        nome: "Ponte com limite de carga",
        emoji: "🌉",
        desc: "Carga acima do ideal exige travessia lenta e custo por vagão.",
        dur: 24, speed: 0.42, deliveryPct: 0.08, perWagon: 95, minWagons: 6,
        weight: 8
      },
      {
        id: "desalinhamento_geometrico",
        nome: "Desalinhamento geométrico da via",
        emoji: "📐",
        desc: "Via fora de geometria: nivelamento emergencial antes de seguir.",
        dur: 22, block: true, deliveryPct: 0.24, perSpeedLevel: 22, preventRelief: true,
        weight: 8
      },
      {
        id: "contaminacao_leito",
        nome: "Contaminação no leito da via",
        emoji: "☣️",
        desc: "Limpeza ambiental e multa por contaminação do trecho.",
        dur: 20, block: true, deliveryPct: 0.38, fixed: 360,
        weight: 4
      },
      {
        id: "pane_detector_roda_quente",
        nome: "Pane no detector de roda quente",
        emoji: "🔥",
        desc: "Segurança exige inspeção manual da composição.",
        dur: 18, block: true, deliveryPct: 0.14, perWagon: 35,
        weight: 8
      },
      {
        id: "interferencia_eletrica",
        nome: "Interferência elétrica na sinalização",
        emoji: "📡",
        desc: "Oscilação causa pequenas perdas e lentidão temporária.",
        dur: 22, speed: 0.68, recurringFixed: 8, deliveryPct: 0.06,
        weight: 11
      },
      {
        id: "baixa_aderencia",
        nome: "Baixa aderência no trilho",
        emoji: "🛞",
        desc: "Patinação aumenta consumo e reduz velocidade.",
        dur: 20, speed: 0.58, recurringPerWagon: 5, deliveryPct: 0.05,
        weight: 10
      },
      {
        id: "descarrilamento_leve_vagao_vazio",
        nome: "Descarrilamento leve de vagão vazio",
        emoji: "🚃",
        desc: "Evento raro e caro: recolocação do vagão e trecho bloqueado.",
        dur: 42, block: true, deliveryPct: 0.55, fixed: 500, perWagon: 70, rare: true,
        weight: 2
      },
      {
        id: "cruzamento_outra_composicao",
        nome: "Cruzamento com outra composição atrasada",
        emoji: "🚆",
        desc: "Via ocupada por outro trem: espera obrigatória.",
        dur: 17, block: true, deliveryPct: 0.09,
        weight: 12
      },
      {
        id: "licenca_operacional_vencida_trecho",
        nome: "Licença operacional vencida do trecho",
        emoji: "🧾",
        desc: "Pendência administrativa gera taxa e liberação emergencial.",
        dur: 10, deliveryPct: 0.21, fixed: 250, cashPct: 0.015,
        weight: 5
      }
    ];


    const INVESTMENT_CATEGORIES = [
      { id: "todos", label: "Todos" },
      { id: "via", label: "Via" },
      { id: "carga", label: "Carga" },
      { id: "risco", label: "Risco financeiro" },
      { id: "velocidade", label: "Velocidade" },
      { id: "vagoes", label: "Vagões" },
      { id: "previsibilidade", label: "Previsibilidade" }
    ];

    const EVENT_TAGS = {
      trilho_empenado_calor: ["calor", "trilho", "geometria"],
      lastro_encharcado: ["agua", "lastro", "clima"],
      dormentes_danificados: ["dormentes", "trilho"],
      furto_cabos_sinalizacao: ["sinalizacao", "furto"],
      queda_barreira: ["talude", "obstrucao"],
      vegetacao_faixa_dominio: ["vegetacao", "obstrucao"],
      alagamento_trecho: ["agua", "clima"],
      falha_chave_amv: ["amv", "sinalizacao"],
      passagem_nivel_bloqueada: ["obstrucao", "terceiros"],
      animal_na_via: ["animal", "obstrucao"],
      obstrucao_veiculo: ["obstrucao", "terceiros"],
      sinal_vermelho_indevido: ["sinalizacao", "operacao"],
      inspecao_obrigatoria_surpresa: ["regulatorio", "inspecao"],
      fiscalizacao_nao_conformidade: ["regulatorio", "multa"],
      restricao_temporaria_velocidade: ["velocidade", "operacao"],
      erosao_trecho: ["erosao", "talude", "agua"],
      ponte_limite_carga: ["ponte", "peso", "vagoes"],
      desalinhamento_geometrico: ["geometria", "trilho"],
      contaminacao_leito: ["ambiental", "multa"],
      pane_detector_roda_quente: ["roda_quente", "vagoes", "seguranca"],
      interferencia_eletrica: ["eletrica", "sinalizacao"],
      baixa_aderencia: ["aderencia", "clima", "trilho"],
      descarrilamento_leve_vagao_vazio: ["descarrilamento", "vagoes", "seguranca"],
      cruzamento_outra_composicao: ["trafego", "operacao"],
      licenca_operacional_vencida_trecho: ["licenca", "regulatorio"]
    };

    const INVESTMENT_UPGRADES = [
      // Via / manutenção corretiva
      { id:"manutencao_preditiva_avancada", cat:"via", emoji:"🧠", nome:"Manutenção preditiva avançada", max:8, base:1800, growth:1.45, desc:"Reduz a chance geral de eventos de via.", effect:"Menos corretiva geral", generalChance:0.055 },
      { id:"ultrassom_trilhos", cat:"via", emoji:"📡", nome:"Ultrassom de trilhos", max:6, base:1600, growth:1.42, desc:"Detecta trincas e defeitos internos no trilho.", effect:"Protege trilho e geometria", tagsChance:{trilho:0.085, geometria:0.055}, tagsCost:{trilho:0.035} },
      { id:"carro_inspecao_geometrica", cat:"via", emoji:"📐", nome:"Carro de inspeção geométrica", max:6, base:1900, growth:1.44, desc:"Mapeia desalinhamentos antes de virarem falha.", effect:"Menos desalinhamento e restrição", tagsChance:{geometria:0.09, velocidade:0.05}, tagsDuration:{geometria:0.04} },
      { id:"sensores_vibracao_via", cat:"via", emoji:"📳", nome:"Sensores de vibração na via", max:6, base:1700, growth:1.42, desc:"Antecipam desgaste e anomalias de rolamento.", effect:"Reduz falhas graves", tagsChance:{trilho:0.045, descarrilamento:0.07, seguranca:0.05}, generalChance:0.015 },
      { id:"monitoramento_termico_trilhos", cat:"via", emoji:"🌡️", nome:"Monitoramento térmico dos trilhos", max:5, base:1400, growth:1.38, desc:"Evita empenamento em dias de calor.", effect:"Combate calor", tagsChance:{calor:0.13}, tagsCost:{calor:0.06} },
      { id:"drones_inspecao_faixa", cat:"via", emoji:"🛩️", nome:"Drones de inspeção da faixa de domínio", max:6, base:1550, growth:1.40, desc:"Vigiam taludes, vegetação e obstruções.", effect:"Menos barreiras e obstruções", tagsChance:{talude:0.07, vegetacao:0.12, obstrucao:0.045}, tagsDuration:{obstrucao:0.03} },
      { id:"sistema_alerta_erosao", cat:"via", emoji:"⛰️", nome:"Sistema de alerta de erosão", max:5, base:1650, growth:1.44, desc:"Monitora taludes e pontos de erosão.", effect:"Reduz erosão", tagsChance:{erosao:0.12, talude:0.06}, tagsCost:{erosao:0.06} },
      { id:"drenagem_reforcada", cat:"via", emoji:"💧", nome:"Drenagem reforçada", max:6, base:1500, growth:1.42, desc:"Reduz eventos de água: alagamento, erosão e lastro encharcado.", effect:"Proteção contra água", tagsChance:{agua:0.105, lastro:0.08}, tagsCost:{agua:0.06}, tagsDuration:{agua:0.04} },
      { id:"renovacao_dormentes", cat:"via", emoji:"🪵", nome:"Renovação de dormentes", max:6, base:1750, growth:1.43, desc:"Troca gradual de dormentes críticos.", effect:"Menos dormentes danificados", tagsChance:{dormentes:0.13, aderencia:0.035}, tagsCost:{dormentes:0.055} },
      { id:"reforco_lastro", cat:"via", emoji:"🪨", nome:"Reforço de lastro", max:6, base:1800, growth:1.44, desc:"Aumenta estabilidade da via e reduz baixa aderência.", effect:"Estabiliza a base da via", tagsChance:{lastro:0.10, aderencia:0.055, geometria:0.035}, speedBonus:0.006 },
      { id:"lubrificacao_automatica_amvs", cat:"via", emoji:"🔀", nome:"Lubrificação automática de AMVs", max:5, base:1450, growth:1.39, desc:"Evita travamento em chaves e AMVs.", effect:"Menos falhas de AMV", tagsChance:{amv:0.13}, tagsCost:{amv:0.06}, tagsDuration:{amv:0.05} },
      { id:"estoque_estrategico_pecas", cat:"via", emoji:"📦", nome:"Estoque estratégico de peças", max:6, base:1550, growth:1.41, desc:"Peças críticas disponíveis reduzem custo e tempo de reparo.", effect:"Reparo mais barato", repairCost:0.045, repairTime:0.04, generalCost:0.015 },
      { id:"contrato_premium_terceirizada", cat:"via", emoji:"🤝", nome:"Contrato premium com terceirizada", max:6, base:2100, growth:1.48, desc:"Terceirizada responde mais rápido e cobra menos.", effect:"Terceirizada melhor", paidRepairCost:0.055, paidRepairTime:0.055 },
      { id:"oficina_movel_via", cat:"via", emoji:"🛠️", nome:"Oficina móvel de via", max:6, base:2200, growth:1.47, desc:"Reduz duração de manutenção corretiva no trecho.", effect:"Menos tempo parado", generalDuration:0.035, repairTime:0.05 },
      { id:"equipe_prontidao_24h", cat:"via", emoji:"👷", nome:"Equipe de prontidão 24h", max:5, base:2400, growth:1.52, desc:"Diminui impacto de falha fora do turno da equipe própria.", effect:"Cobre fora de turno", offshiftCost:0.07, offshiftTime:0.06 },
      { id:"centro_controle_preditivo", cat:"via", emoji:"🖥️", nome:"Centro de controle preditivo", max:8, base:2600, growth:1.47, desc:"Centraliza dados da via e reduz risco operacional.", effect:"Reduz risco geral", generalChance:0.035, generalDuration:0.02 },

      // Carga / receita
      { id:"terminal_graneleiro_modernizado", cat:"carga", emoji:"🌾", nome:"Terminal graneleiro modernizado", max:6, base:1700, growth:1.42, desc:"Melhora valor e produtividade de grãos.", effect:"Grãos pagam mais", cargoBonus:{graos:0.075}, deliveryBonus:0.006 },
      { id:"patio_conteineres_refrigerados", cat:"carga", emoji:"🧊", nome:"Pátio de contêineres refrigerados", max:6, base:2300, growth:1.48, desc:"Aumenta valor de cargas refrigeradas e contêineres.", effect:"Contêineres pagam mais", cargoBonus:{conteiner:0.10}, unlockCargoBonus:0.012 },
      { id:"contrato_exportador_premium", cat:"carga", emoji:"🌎", nome:"Contrato com exportador premium", max:7, base:2200, growth:1.46, desc:"Clientes premium pagam melhor por todas as cargas.", effect:"Todas as entregas pagam mais", deliveryBonus:0.035, contractBonus:0.025 },
      { id:"rastreabilidade_carga", cat:"carga", emoji:"📍", nome:"Sistema de rastreabilidade da carga", max:6, base:1600, growth:1.42, desc:"Aumenta confiança, valor e reduz penalidade por atraso.", effect:"Mais valor, menos penalidade", deliveryBonus:0.025, penaltyReduction:0.05 },
      { id:"certificacao_operacional_premium", cat:"carga", emoji:"⭐", nome:"Certificação operacional premium", max:7, base:1900, growth:1.44, desc:"Melhora reputação e pagamento em contratos expressos.", effect:"Contratos pagam mais", deliveryBonus:0.018, contractBonus:0.06 },
      { id:"seguro_carga_avancado", cat:"carga", emoji:"🛡️", nome:"Seguro de carga avançado", max:5, base:1800, growth:1.50, desc:"Reduz perdas financeiras em eventos e atrasos.", effect:"Menos impacto financeiro", generalCost:0.035, penaltyReduction:0.04 },
      { id:"armazem_alfandegado", cat:"carga", emoji:"🏬", nome:"Armazém alfandegado", max:6, base:2400, growth:1.50, desc:"Aumenta valor de cargas internacionais.", effect:"Bônus em carga premium", cargoBonus:{conteiner:0.075, celulose:0.035}, deliveryBonus:0.01 },
      { id:"terminal_intermodal", cat:"carga", emoji:"🚢", nome:"Terminal intermodal", max:7, base:2600, growth:1.50, desc:"Integra ferrovia, porto e rodovia para maior valor.", effect:"Contêineres e contratos melhores", cargoBonus:{conteiner:0.12}, contractBonus:0.025 },
      { id:"balanca_ferroviaria_automatizada", cat:"carga", emoji:"⚖️", nome:"Balança ferroviária automatizada", max:5, base:1450, growth:1.37, desc:"Reduz erro operacional e melhora receita líquida.", effect:"Receita líquida maior", deliveryBonus:0.02, tagsChance:{peso:0.035} },
      { id:"carregamento_rapido_automatizado", cat:"carga", emoji:"⏱️", nome:"Carregamento rápido automatizado", max:6, base:1850, growth:1.43, desc:"Reduz ciclo operacional e aumenta receita por minuto.", effect:"Mais velocidade de entrega", speedBonus:0.025, deliveryBonus:0.01 },
      { id:"contrato_carga_perigosa", cat:"carga", emoji:"☢️", nome:"Contrato de carga perigosa", max:5, base:2500, growth:1.55, desc:"Desbloqueia prêmio alto para cargas sensíveis, com gestão de risco.", effect:"Alto valor com mais exigência", deliveryBonus:0.05, generalCost:-0.01, tagsCost:{ambiental:-0.02} },
      { id:"carga_refrigerada", cat:"carga", emoji:"❄️", nome:"Carga refrigerada", max:5, base:2300, growth:1.52, desc:"Nova categoria comercial de maior valor.", effect:"Aumenta valor médio", deliveryBonus:0.045, cargoBonus:{conteiner:0.05} },
      { id:"carga_expressa_prioritaria", cat:"carga", emoji:"🚀", nome:"Carga expressa prioritária", max:6, base:2100, growth:1.48, desc:"Clientes pagam mais por entregas rápidas.", effect:"Mais valor e contrato", deliveryBonus:0.035, contractBonus:0.04, penaltyReduction:-0.01 },
      { id:"carga_industrial_pesada", cat:"carga", emoji:"🏭", nome:"Carga industrial pesada", max:5, base:2600, growth:1.55, desc:"Aumenta receita, mas exige boa via e pontes fortes.", effect:"Mais receita por peso", deliveryBonus:0.05, tagsChance:{peso:-0.015, ponte:-0.01} },
      { id:"carga_agricola_sazonal", cat:"carga", emoji:"🌽", nome:"Carga agrícola sazonal", max:5, base:1500, growth:1.38, desc:"Aproveita safras para melhorar valor de grãos e açúcar.", effect:"Bônus agrícola", cargoBonus:{graos:0.06, acucar:0.055}, contractBonus:0.015 },

      // Risco financeiro / multas
      { id:"departamento_regulatorio", cat:"risco", emoji:"🏛️", nome:"Departamento regulatório", max:6, base:1700, growth:1.42, desc:"Reduz multas de fiscalização e inspeções.", effect:"Menos multa regulatória", tagsCost:{regulatorio:0.09, multa:0.055}, tagsChance:{regulatorio:0.035} },
      { id:"sistema_gestao_documental", cat:"risco", emoji:"🗂️", nome:"Sistema de gestão documental", max:5, base:1350, growth:1.36, desc:"Evita pendências de licença e documentação.", effect:"Menos licença vencida", tagsChance:{licenca:0.14}, tagsCost:{licenca:0.10} },
      { id:"auditoria_preventiva_seguranca", cat:"risco", emoji:"✅", nome:"Auditoria preventiva de segurança", max:6, base:1650, growth:1.41, desc:"Reduz não conformidade e eventos de segurança.", effect:"Menos fiscalização ruim", tagsChance:{inspecao:0.06, seguranca:0.05, multa:0.05}, tagsCost:{multa:0.04} },
      { id:"plano_contingencia_operacional", cat:"risco", emoji:"📘", nome:"Plano de contingência operacional", max:6, base:1800, growth:1.43, desc:"Reduz multa por via parada e duração de resposta.", effect:"Menos multa de parada", stopFineReduction:0.055, generalDuration:0.015 },
      { id:"seguro_interrupcao_operacional", cat:"risco", emoji:"🧯", nome:"Seguro contra interrupção operacional", max:5, base:2200, growth:1.54, desc:"Cobre parte dos custos quando a operação para.", effect:"Cobre eventos negativos", generalCost:0.055, stopFineReduction:0.035 },
      { id:"compliance_ferroviario", cat:"risco", emoji:"📜", nome:"Compliance ferroviário", max:6, base:1750, growth:1.43, desc:"Reduz penalidades administrativas e regulatórias.", effect:"Menos penalidades", tagsCost:{regulatorio:0.07, licenca:0.05, multa:0.05}, penaltyReduction:0.035 },
      { id:"treinamento_resposta_emergencial", cat:"risco", emoji:"🚨", nome:"Treinamento de resposta emergencial", max:6, base:1600, growth:1.42, desc:"Reduz custo e tempo de eventos graves.", effect:"Resposta mais barata", tagsCost:{descarrilamento:0.06, ambiental:0.05, talude:0.035}, tagsDuration:{descarrilamento:0.06, talude:0.04}, generalDuration:0.01 },
      { id:"gestao_ambiental_preventiva", cat:"risco", emoji:"🌱", nome:"Gestão ambiental preventiva", max:5, base:1700, growth:1.43, desc:"Reduz contaminação, erosão e multas ambientais.", effect:"Menos risco ambiental", tagsChance:{ambiental:0.08, erosao:0.04}, tagsCost:{ambiental:0.11, erosao:0.035} },
      { id:"acordo_orgaos_reguladores", cat:"risco", emoji:"🤲", nome:"Acordo com órgãos reguladores", max:5, base:2100, growth:1.50, desc:"Diminui impacto de inspeções obrigatórias.", effect:"Inspeções menos caras", tagsCost:{inspecao:0.09, regulatorio:0.05}, tagsDuration:{inspecao:0.04} },
      { id:"renovacao_automatica_licencas", cat:"risco", emoji:"🔁", nome:"Sistema automático de renovação de licenças", max:5, base:1850, growth:1.45, desc:"Evita eventos de licença operacional vencida.", effect:"Licenças em dia", tagsChance:{licenca:0.16}, tagsCost:{licenca:0.06} },
      { id:"seguro_operacional", cat:"risco", emoji:"🛡️", nome:"Seguro operacional", max:5, base:2000, growth:1.55, desc:"Reduz parte dos custos de eventos negativos.", effect:"Menos custo em evento", generalCost:0.065 },

      // Velocidade / operação
      { id:"sinalizacao_automatica_moderna", cat:"velocidade", emoji:"🚦", nome:"Sinalização automática moderna", max:6, base:2100, growth:1.45, desc:"Aumenta velocidade e reduz sinal vermelho indevido.", effect:"Sinalização e velocidade", speedBonus:0.025, tagsChance:{sinalizacao:0.075}, tagsCost:{sinalizacao:0.035} },
      { id:"ctc_controle_trafego", cat:"velocidade", emoji:"🎛️", nome:"CTC — Controle de Tráfego Centralizado", max:6, base:2600, growth:1.50, desc:"Reduz cruzamento com outra composição atrasada.", effect:"Menos via ocupada", speedBonus:0.018, tagsChance:{trafego:0.13, operacao:0.035}, tagsDuration:{trafego:0.05} },
      { id:"radio_digital", cat:"velocidade", emoji:"📻", nome:"Comunicação via rádio digital", max:5, base:1450, growth:1.38, desc:"Reduz atrasos por falha operacional.", effect:"Operação mais fluida", speedBonus:0.015, tagsChance:{operacao:0.05, sinalizacao:0.025} },
      { id:"piloto_automatico_ferroviario", cat:"velocidade", emoji:"🤖", nome:"Piloto automático ferroviário", max:6, base:2400, growth:1.50, desc:"Aumenta velocidade média com menor risco.", effect:"Velocidade com controle", speedBonus:0.035, generalChance:0.012 },
      { id:"melhoria_curvas_criticas", cat:"velocidade", emoji:"〰️", nome:"Melhoria de curvas críticas", max:6, base:1900, growth:1.44, desc:"Aumenta velocidade em trecho sinuoso e reduz geometria ruim.", effect:"Curvas mais rápidas", speedBonus:0.025, tagsChance:{geometria:0.035} },
      { id:"retificacao_tracado", cat:"velocidade", emoji:"📏", nome:"Retificação de traçado", max:5, base:3000, growth:1.58, desc:"Obra estrutural que aumenta velocidade geral.", effect:"Velocidade geral", speedBonus:0.045, tagsChance:{geometria:0.02} },
      { id:"amvs_alta_performance", cat:"velocidade", emoji:"🔀", nome:"AMVs de alta performance", max:5, base:2300, growth:1.48, desc:"Aumenta fluidez e reduz falhas de chave.", effect:"AMV mais confiável", speedBonus:0.018, tagsChance:{amv:0.10}, tagsDuration:{amv:0.04} },
      { id:"patio_cruzamento_ampliado", cat:"velocidade", emoji:"🛤️", nome:"Pátio de cruzamento ampliado", max:5, base:2200, growth:1.47, desc:"Reduz espera por outra composição.", effect:"Menos cruzamento atrasado", tagsChance:{trafego:0.12}, tagsDuration:{trafego:0.06} },
      { id:"despacho_inteligente", cat:"velocidade", emoji:"🧭", nome:"Sistema de despacho inteligente", max:6, base:2050, growth:1.45, desc:"Reduz intervalos e melhora sequência operacional.", effect:"Mais velocidade e contratos", speedBonus:0.025, contractBonus:0.018, tagsChance:{operacao:0.035} },
      { id:"prioridade_operacional_contratos", cat:"velocidade", emoji:"🏁", nome:"Prioridade operacional em contratos", max:5, base:1750, growth:1.42, desc:"Melhora velocidade quando há contrato ativo.", effect:"Contratos mais fortes", contractBonus:0.035, speedBonus:0.012, penaltyReduction:0.03 },

      // Vagões / peso
      { id:"reforco_pontes", cat:"vagoes", emoji:"🌉", nome:"Reforço de pontes", max:6, base:2200, growth:1.50, desc:"Reduz risco de ponte com limite de carga.", effect:"Mais vagões com segurança", tagsChance:{ponte:0.13, peso:0.04}, tagsCost:{ponte:0.09}, safeWagons:1 },
      { id:"classificacao_via_superior", cat:"vagoes", emoji:"🏅", nome:"Classificação de via superior", max:6, base:2600, growth:1.52, desc:"Permite mais vagões com menor risco de via.", effect:"Via suporta mais carga", tagsChance:{peso:0.09, ponte:0.05, geometria:0.03}, deliveryBonus:0.01, safeWagons:1 },
      { id:"locomotiva_auxiliar", cat:"vagoes", emoji:"🚂", nome:"Locomotiva auxiliar", max:5, base:2800, growth:1.55, desc:"Permite composições maiores e mais rápidas.", effect:"Trem longo mais viável", speedBonus:0.025, deliveryBonus:0.018, tagsChance:{peso:0.035} },
      { id:"freio_eletronico_distribuido", cat:"vagoes", emoji:"🛑", nome:"Freio eletrônico distribuído", max:5, base:2300, growth:1.50, desc:"Reduz risco operacional em trem longo.", effect:"Segurança em vagões", tagsChance:{vagoes:0.08, descarrilamento:0.08, seguranca:0.04}, tagsCost:{descarrilamento:0.045} },
      { id:"engates_reforcados", cat:"vagoes", emoji:"🔗", nome:"Engates reforçados", max:5, base:1700, growth:1.42, desc:"Reduz risco e custo em composições longas.", effect:"Composição mais robusta", tagsChance:{vagoes:0.06, peso:0.035}, perWagonBonus:0.004 },
      { id:"monitoramento_roda_quente", cat:"vagoes", emoji:"🔥", nome:"Monitoramento de roda quente", max:5, base:1600, growth:1.41, desc:"Reduz pane no detector e risco de parada.", effect:"Menos roda quente", tagsChance:{roda_quente:0.14}, tagsCost:{roda_quente:0.08} },
      { id:"detector_carga_desalinhada", cat:"vagoes", emoji:"📷", nome:"Detector de carga desalinhada", max:5, base:1750, growth:1.43, desc:"Evita problemas em vagões e peso mal distribuído.", effect:"Carga alinhada", tagsChance:{peso:0.08, vagoes:0.05, descarrilamento:0.035}, deliveryBonus:0.008 },
      { id:"balanceamento_automatico_carga", cat:"vagoes", emoji:"⚖️", nome:"Balanceamento automático de carga", max:6, base:1900, growth:1.45, desc:"Aumenta valor e reduz risco por peso.", effect:"Peso equilibrado", tagsChance:{peso:0.08, ponte:0.035}, deliveryBonus:0.018 },
      { id:"patio_formacao_ampliado", cat:"vagoes", emoji:"🚉", nome:"Pátio de formação ampliado", max:6, base:2100, growth:1.48, desc:"Permite formar composições longas com menos gargalo.", effect:"Mais vagões eficientes", speedBonus:0.012, deliveryBonus:0.012, safeWagons:1 },
      { id:"inspecao_vagoes_camera", cat:"vagoes", emoji:"🎥", nome:"Sistema de inspeção de vagões por câmera", max:5, base:1650, growth:1.41, desc:"Reduz falhas ligadas à composição.", effect:"Menos falha de vagão", tagsChance:{vagoes:0.075, roda_quente:0.035, seguranca:0.025} },

      // Previsibilidade
      { id:"sala_crise_operacional", cat:"previsibilidade", emoji:"🚒", nome:"Sala de crise operacional", max:5, base:1850, growth:1.44, desc:"Reduz duração de eventos graves.", effect:"Eventos graves duram menos", generalDuration:0.035, tagsDuration:{descarrilamento:0.05, ambiental:0.04, talude:0.035} },
      { id:"painel_preditivo_falhas", cat:"previsibilidade", emoji:"📊", nome:"Painel preditivo de falhas", max:6, base:1750, growth:1.42, desc:"Mostra sinais antes da falha virar corretiva.", effect:"Menos evento inesperado", generalChance:0.025, tagsChance:{trilho:0.025, sinalizacao:0.02} },
      { id:"mapa_risco_via", cat:"previsibilidade", emoji:"🗺️", nome:"Mapa de risco da via", max:6, base:1600, growth:1.40, desc:"Identifica trechos críticos e reduz eventos neles.", effect:"Risco mapeado", generalChance:0.02, tagsCost:{talude:0.035, agua:0.025, geometria:0.025} },
      { id:"historico_inteligente_falhas", cat:"previsibilidade", emoji:"🧾", nome:"Histórico inteligente de falhas", max:5, base:1450, growth:1.38, desc:"Aprende com ocorrências e melhora preventiva.", effect:"Preventiva mais eficaz", generalChance:0.018, generalCost:0.015 },
      { id:"ia_manutencao_preditiva", cat:"previsibilidade", emoji:"🤖", nome:"IA de manutenção preditiva", max:8, base:2800, growth:1.52, desc:"Reduz chance geral de manutenção corretiva.", effect:"IA contra corretiva", generalChance:0.04, generalDuration:0.02 },
      { id:"simulador_operacao", cat:"previsibilidade", emoji:"🎮", nome:"Simulador de operação", max:5, base:1700, growth:1.42, desc:"Melhora contratos e reduz atrasos operacionais.", effect:"Contratos mais previsíveis", contractBonus:0.025, penaltyReduction:0.035, tagsChance:{operacao:0.035} },
      { id:"janelas_manutencao_dinamicas", cat:"previsibilidade", emoji:"🗓️", nome:"Planejamento dinâmico de janelas de manutenção", max:6, base:1800, growth:1.43, desc:"Reduz custo de manutenção própria e corretiva.", effect:"Manutenção planejada", repairCost:0.035, repairTime:0.025, stopFineReduction:0.02 },
      { id:"sistema_prioridade_carga", cat:"previsibilidade", emoji:"📦", nome:"Sistema de prioridade por carga", max:5, base:1600, growth:1.40, desc:"Aumenta valor em cargas urgentes e reduz perda por atraso.", effect:"Carga certa primeiro", deliveryBonus:0.02, penaltyReduction:0.03 },
      { id:"previsao_climatica_integrada", cat:"previsibilidade", emoji:"🌦️", nome:"Previsão climática integrada", max:6, base:1500, growth:1.40, desc:"Reduz impacto de chuva, alagamento e calor.", effect:"Menos clima ruim", tagsChance:{clima:0.08, agua:0.045, calor:0.05}, tagsCost:{clima:0.035, agua:0.03} },
      { id:"gestao_risco_operacional", cat:"previsibilidade", emoji:"📉", nome:"Gestão de risco operacional", max:6, base:1900, growth:1.44, desc:"Reduz impacto financeiro de eventos aleatórios.", effect:"Menor impacto financeiro", generalCost:0.035, penaltyReduction:0.025, stopFineReduction:0.02 },

      // Extras citados nas recomendações
      { id:"sistema_antifurto_cabos", cat:"risco", emoji:"🔐", nome:"Sistema antifurto de cabos", max:5, base:1550, growth:1.42, desc:"Reduz chance e custo de furto de cabos de sinalização.", effect:"Protege cabos", tagsChance:{furto:0.16}, tagsCost:{furto:0.09} }
    ];

    const ACHIEVEMENTS = {
      first_delivery: { emoji: "🚂", label: "Primeira entrega", desc: "A operação começou a girar!" },
      deliveries_5:   { emoji: "📦", label: "Pegando ritmo", desc: "5 entregas concluídas." },
      deliveries_25:  { emoji: "🏗️", label: "Malha em movimento", desc: "25 entregas concluídas." },
      deliveries_100: { emoji: "🌎", label: "Brasil em movimento", desc: "100 entregas concluídas!" },
      earned_5k:      { emoji: "💵", label: "Caixa saudável", desc: "R$ 5.000 acumulados em receita." },
      earned_25k:     { emoji: "💰", label: "Grande operadora", desc: "R$ 25.000 acumulados em receita." },
      combo_5:        { emoji: "✨", label: "Sequência x5", desc: "5 entregas seguidas sem quebra." },
      combo_10:       { emoji: "🌟", label: "Operação impecável", desc: "10 entregas seguidas sem quebra." },
      wagon_first:    { emoji: "🚃", label: "Composição maior", desc: "Primeiro vagão extra acoplado." },
      contract_first: { emoji: "📋", label: "Contrato fechado", desc: "Primeiro contrato expresso cumprido." },
      crew_hired:     { emoji: "👷", label: "Time de casa", desc: "Equipe própria contratada." },
      storm_survivor: { emoji: "🌦️", label: "Sob chuva", desc: "Operou durante uma tempestade." }
    };

    const SEGMENTS = [
      { id: 0, name: "Trecho 1", x: 25, y: 38 },
      { id: 1, name: "Trecho 2", x: 63, y: 37 },
      { id: 2, name: "Trecho 3", x: 87, y: 50 },
      { id: 3, name: "Trecho 4", x: 49, y: 56 },
      { id: 4, name: "Trecho 5", x: 58, y: 73 }
    ];

    const defaultState = {
      money: 1200,
      worksSpent: 0,
      totalEarned: 0,
      deliveries: 0,
      contractsDone: 0,
      speedLevel: 1,
      cargoLevel: 1,
      cargoValue: 350,
      wagonExtra: 0,
      crewLevel: 0,
      preventLevel: 0,
      trainProgress: 0,
      loanDebt: 0,
      maintenanceFines: 0,
      incidentCosts: 0,
      elapsedMs: 0,
      preventRoundsLeft: 0,
      combo: 0,
      bestCombo: 0,
      currentCargoId: "graos",
      segments: SEGMENTS.map(s => ({ id: s.id, status: "ok", repairLeft: 0, repairTotal: PAID_REPAIR_TIME, by: "paid" })),
      nextBreakAt: 16,
      uptimeMs: 0,
      achievements: {},
      investments: {},
      soundOn: true,
      lastSavedAt: Date.now()
    };

    /* ============================ Estado ============================ */
    let state = loadState();
    let lastTick = performance.now();
    let logItems = [];

    // runtime (não persiste)
    let activeEvent = null;          // {def, left}
    let eventCooldown = 12;          // s até o 1º evento
    let contract = null;             // {target, startDeliveries, left, reward}
    let contractCooldown = 25;
    let markerSig = "";              // assinatura do estado dos trechos (rebuild só quando muda)
    let markerRefs = {};             // id -> {root, small, prog, btn, mode}
    let segMid = {};                 // id -> {leftPct, topPct}
    let railLen = 0;
    let audioCtx = null;
    let maintenanceFineNotice = 0;

    const $ = (sel) => document.querySelector(sel);
    const moneyEl = $("#money");
    const speedInfoEl = $("#speedInfo");
    const cargoInfoEl = $("#cargoInfo");
    const comboInfoEl = $("#comboInfo");
    const statusDotEl = $("#statusDot");
    const statusTextEl = $("#statusText");
    const nextBreakInfoEl = $("#nextBreakInfo");
    const repairsInfoEl = $("#repairsInfo");
    const railAreaEl = $("#railArea");
    const railPathEl = $("#railBase");
    const trackDecorEl = $("#trackDecor");
    const trainLayerEl = $("#trainLayer");
    const logEl = $("#log");
    const toastWrapEl = $("#toastWrap");

    const cargoEmojiEl = $("#cargoEmoji");
    const cargoNameEl = $("#cargoName");
    const cargoMultEl = $("#cargoMult");

    const speedUpgradeBtn = $("#speedUpgrade");
    const cargoUpgradeBtn = $("#cargoUpgrade");
    const wagonUpgradeBtn = $("#wagonUpgrade");
    const crewUpgradeBtn = $("#crewUpgrade");
    const preventUpgradeBtn = $("#preventUpgrade");
    const loanButton = $("#loanButton");
    const saveButton = $("#saveButton");
    const resetButton = $("#resetButton");
    const soundToggle = $("#soundToggle");

    const speedLvlEl = $("#speedLvl");
    const cargoLvlEl = $("#cargoLvl");
    const wagonLvlEl = $("#wagonLvl");
    const crewLvlEl = $("#crewLvl");
    const preventLvlEl = $("#preventLvl");

    const eventBannerEl = $("#eventBanner");
    const evEmojiEl = $("#evEmoji");
    const evTitleEl = $("#evTitle");
    const evDescEl = $("#evDesc");
    const evTimerEl = $("#evTimer");

    const contractBoxEl = $("#contractBox");
    const ctTitleEl = $("#ctTitle");
    const ctDescEl = $("#ctDesc");
    const ctTimerEl = $("#ctTimer");

    const stDeliveries = $("#stDeliveries");
    const stEarned = $("#stEarned");
    const stBestCombo = $("#stBestCombo");
    const stContracts = $("#stContracts");
    const stWorks = $("#stWorks");
    const stUptime = $("#stUptime");

    const costWorksEl = $("#costWorks");
    const costOperationalEl = $("#costOperational");
    const costMaintenanceEl = $("#costMaintenance");
    const costCrewEl = $("#costCrew");
    const costLoanEl = $("#costLoan");
    const costTotalEl = $("#costTotal");

    const advancedInvestBtn = $("#advancedInvestBtn");
    const investmentModalEl = $("#investmentModal");
    const closeInvestmentsBtn = $("#closeInvestmentsBtn");
    const investmentListEl = $("#investmentList");
    const investmentTabsEl = $("#investmentTabs");
    const investmentSummaryEl = $("#investmentSummary");
    let activeInvestmentCategory = "todos";
    let investmentRenderSig = "";

    /* ============================ Utilidades ============================ */
    function formatCurrency(value) {
      return Math.round(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
    }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function loadState() {
      try {
        const saved = JSON.parse(safeGetStorage(STORAGE_KEY));
        if (!saved) return structuredClone(defaultState);
        const merged = {
          ...structuredClone(defaultState),
          ...saved,
          achievements: { ...(saved.achievements || {}) },
          investments: { ...(saved.investments || {}) },
          segments: SEGMENTS.map(s => {
            const old = saved.segments?.find(x => x.id === s.id);
            return {
              id: s.id,
              status: old?.status || "ok",
              repairLeft: old?.repairLeft || 0,
              repairTotal: old?.repairTotal || PAID_REPAIR_TIME,
              by: old?.by || "paid",
              incidentLabel: old?.incidentLabel || "",
              incidentEmoji: old?.incidentEmoji || ""
            };
          })
        };
        if (!cargoById(merged.currentCargoId)) merged.currentCargoId = "graos";
        merged.maintenanceFines = Number(merged.maintenanceFines || 0);
        merged.incidentCosts = Number(merged.incidentCosts || 0);
        merged.elapsedMs = Number(merged.elapsedMs || 0);
        merged.preventRoundsLeft = Number(merged.preventRoundsLeft || 0);
        return merged;
      } catch (error) {
        return structuredClone(defaultState);
      }
    }

    function saveState(showLog = true) {
      state.lastSavedAt = Date.now();
      try { safeSetStorage(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
      if (showLog) addLog("Jogo salvo no navegador.", "good");
    }

    function resetGame() {
      if (!confirm("Tem certeza que deseja reiniciar o jogo?")) return;
      try { safeRemoveStorage(STORAGE_KEY); } catch (e) {}
      state = structuredClone(defaultState);
      state.currentCargoId = pickCargo().id;
      logItems = [];
      activeEvent = null; eventCooldown = 12;
      contract = null; contractCooldown = 25;
      buildTrain();
      addLog("Novo ciclo iniciado. Boa gestão!", "good");
      render();
    }

    /* ============================ Economia ============================ */
    function repairCost(segmentId) {
      const source = state.segments?.find(s => s.id === segmentId)?.by || "manual";
      const base = 160 + state.speedLevel * 28 + state.cargoLevel * 22 + segmentId * 30 + state.deliveries * 6;
      return Math.round(base * repairCostMult(source));
    }
    function speedUpgradeCost() { return Math.round(520 * Math.pow(1.55, state.speedLevel - 1)); }
    function cargoUpgradeCost() { return Math.round(680 * Math.pow(1.65, state.cargoLevel - 1)); }
    function wagonUpgradeCost() { return Math.round(900 * Math.pow(1.45, state.wagonExtra)); }
    function crewUpgradeCost() { return state.crewLevel >= CREW_MAX_LEVEL ? Infinity : Math.round(1500 * Math.pow(1.42, state.crewLevel)); }
    function preventUpgradeCost() { return state.preventLevel >= PREVENT_MAX_LEVEL ? Infinity : Math.round(1300 * Math.pow(1.38, state.preventLevel)); }
    function preventiveRoundsForLevel(level) { return 2 + Math.ceil(level * 1.5); }
    function loanOfferAmount() {
      const progress = state.deliveries * 170 + state.totalEarned * 0.08 + state.cargoLevel * 230 + state.wagonExtra * 260 + state.bestCombo * 120;
      return Math.round(Math.max(500, 500 + progress) / 50) * 50;
    }
    function loanPaybackAmount(amount) { return Math.round(amount * 1.30); }

    // Indicadores dos cards de custos exibidos abaixo da dinâmica do trem.
    function operatingCostEstimate() {
      return Math.round(state.deliveries * (70 + wagonCount() * 22) + (state.uptimeMs / 1000) * (0.8 + state.speedLevel * 0.18));
    }
    function addIncidentCost(amount, reason = "", silent = false) {
      amount = Math.max(0, Math.round(amount || 0));
      if (!amount) return 0;
      state.money -= amount;
      state.incidentCosts = (state.incidentCosts || 0) + amount;
      state.maintenanceFines = (state.maintenanceFines || 0) + amount;
      if (!silent && reason) addLog(`${reason}: custo de ${formatCurrency(amount)}.`, "bad");
      return amount;
    }

    function incidentBaseCost(def) {
      const delivery = deliveryValue();
      let cost = Number(def.fixed || 0);
      cost += delivery * Number(def.deliveryPct || 0);
      cost += wagonCount() * Number(def.perWagon || 0);
      cost += state.speedLevel * Number(def.perSpeedLevel || 0);
      cost += state.cargoLevel * Number(def.perCargoLevel || 0);
      cost += state.deliveries * Number(def.perDelivery || 0);
      cost += state.contractsDone * Number(def.perContract || 0);
      cost += state.bestCombo * Number(def.perBestCombo || 0);
      cost += Math.max(0, state.money) * Number(def.cashPct || 0);

      if (def.preventPenalty) {
        const lack = Math.max(0, 4 - state.preventLevel);
        cost += delivery * lack * 0.045;
      }

      if (def.preventRelief && state.preventLevel > 0) {
        cost *= Math.max(0.55, 1 - state.preventLevel * 0.055);
      }

      const effect = investmentEffectForEvent(def);
      if (def.id === "ponte_limite_carga") {
        const safeExtra = investmentScalar("safeWagons");
        cost *= Math.max(0.45, 1 - safeExtra * 0.035);
      }
      return Math.round(Math.max(0, cost * effect.cost));
    }

    function recurringIncidentCost(def, dt) {
      if (!def) return 0;
      let cost = 0;
      cost += deliveryValue() * Number(def.recurringDeliveryPct || 0) * dt;
      cost += wagonCount() * Number(def.recurringPerWagon || 0) * dt;
      cost += Number(def.recurringFixed || 0) * dt;
      cost += state.speedLevel * Number(def.recurringPerSpeedLevel || 0) * dt;
      return cost * investmentEffectForEvent(def).cost;
    }

    function eligibleViaCostEvents() {
      return VIA_COST_EVENTS
        .filter(def => {
          if (def.minWagons && wagonCount() < def.minWagons) return false;
          if (def.rare && Math.random() > 0.35) return false;
          return true;
        })
        .map(def => ({ ...def, effectiveWeight: Math.max(0.05, Number(def.weight || 1) * investmentEffectForEvent(def).chance) }));
    }

    function weightedPick(items) {
      const total = items.reduce((sum, item) => sum + Number(item.effectiveWeight || item.weight || 1), 0);
      let pick = Math.random() * total;
      for (const item of items) {
        pick -= Number(item.effectiveWeight || item.weight || 1);
        if (pick <= 0) return item;
      }
      return items[items.length - 1];
    }

    function maintenanceCostEstimate() {
      const preventiveInvestment = state.preventLevel === 0 ? 0 : Math.round(1300 * (Math.pow(1.38, state.preventLevel) - 1) / 0.38);
      return Math.round(preventiveInvestment + state.deliveries * 30 + repairingCount() * 90 + (state.maintenanceFines || 0));
    }
    function crewCostEstimate() {
      const crewInvestment = state.crewLevel === 0 ? 0 : Math.round(1500 * (Math.pow(1.42, state.crewLevel) - 1) / 0.42);
      return Math.round(crewInvestment + (state.elapsedMs / 60000) * state.crewLevel * 18);
    }
    function loanInterestEstimate() {
      return state.loanDebt > 0 ? Math.min(999999999, Math.round(state.loanDebt * 0.23)) : 0;
    }
    function totalCostEstimate() {
      return state.worksSpent + operatingCostEstimate() + maintenanceCostEstimate() + crewCostEstimate() + loanInterestEstimate();
    }

    function currentSpeed() {
      const base = 1 + (state.speedLevel - 1) * 0.22;
      const evMult = activeEvent?.def.speed || 1;
      const incidentDrag = activeEvent?.def.operationalDrag ? Math.max(0.35, 1 - activeEvent.def.operationalDrag) : 1;
      const investBoost = 1 + investmentScalar("speedBonus");
      return Number((base * evMult * incidentDrag * investBoost).toFixed(2));
    }
    function comboMult() { return 1 + Math.min(state.combo, 10) * 0.08; }
    function valueMult() { return activeEvent?.def.value || 1; }
    function wagonCount() { return BASE_WAGONS + state.wagonExtra; }

    function deliveryValue() {
      const cargo = cargoById(state.currentCargoId);
      const base = state.cargoValue + state.wagonExtra * WAGON_BONUS;
      return Math.round(base * cargo.mult * comboMult() * valueMult() * (1 + cargoInvestmentBonus(cargo.id)));
    }

    function hasBrokenLine() { return state.segments.some(s => s.status === "broken"); }
    function hasAnyProblem() { return state.segments.some(s => s.status !== "ok"); }
    function repairingCount() { return state.segments.filter(s => s.status === "repairing").length; }
    function crewBusy() { return state.segments.filter(s => s.status === "repairing" && s.by === "crew").length; }

    function crewShiftInfo() {
      if (state.crewLevel <= 0) return { active: false, label: "sem equipe", left: 0 };
      const shift = CREW_SHIFT[state.crewLevel] || CREW_SHIFT[CREW_SHIFT.length - 1];
      const cycle = shift.on + shift.off;
      const t = ((state.elapsedMs || 0) / 1000) % cycle;
      const active = t < shift.on;
      return {
        active,
        label: active ? "turno ativo" : "fora do turno",
        left: Math.ceil(active ? shift.on - t : cycle - t),
        on: shift.on,
        off: shift.off
      };
    }
    function isCrewOnShift() { return crewShiftInfo().active; }

    function pickCargo() {
      // sorteio com leve viés para cargas mais comuns no início
      return CARGOS[Math.floor(Math.random() * CARGOS.length)];
    }

    /* ============================ Investimentos avançados ============================ */
    function invLevel(id) {
      return Number(state.investments?.[id] || 0);
    }

    function investmentCost(def) {
      const level = invLevel(def.id);
      if (level >= def.max) return Infinity;
      return Math.round(def.base * Math.pow(def.growth, level));
    }

    function totalInvestmentLevels() {
      return Object.values(state.investments || {}).reduce((sum, level) => sum + Number(level || 0), 0);
    }

    function investmentMatchesEvent(def, inv) {
      const tags = EVENT_TAGS[def.id] || [];
      if (inv.idsChance && inv.idsChance[def.id]) return true;
      if (inv.idsCost && inv.idsCost[def.id]) return true;
      if (inv.idsDuration && inv.idsDuration[def.id]) return true;
      const maps = [inv.tagsChance, inv.tagsCost, inv.tagsDuration];
      return maps.some(map => map && Object.keys(map).some(tag => tags.includes(tag)));
    }

    function multFromRate(rate, level, floor = 0.20) {
      return Math.max(floor, 1 - Number(rate || 0) * level);
    }

    function investmentEffectForEvent(def) {
      const tags = EVENT_TAGS[def.id] || [];
      let chance = 1, cost = 1, duration = 1;
      for (const inv of INVESTMENT_UPGRADES) {
        const level = invLevel(inv.id);
        if (!level) continue;

        if (inv.generalChance) chance *= multFromRate(inv.generalChance, level, 0.25);
        if (inv.generalCost) cost *= Math.max(0.25, 1 - inv.generalCost * level);
        if (inv.generalDuration) duration *= multFromRate(inv.generalDuration, level, 0.35);

        if (inv.idsChance?.[def.id]) chance *= multFromRate(inv.idsChance[def.id], level, 0.15);
        if (inv.idsCost?.[def.id]) cost *= Math.max(0.15, 1 - inv.idsCost[def.id] * level);
        if (inv.idsDuration?.[def.id]) duration *= multFromRate(inv.idsDuration[def.id], level, 0.20);

        if (inv.tagsChance) tags.forEach(tag => { if (inv.tagsChance[tag]) chance *= multFromRate(inv.tagsChance[tag], level, 0.15); });
        if (inv.tagsCost) tags.forEach(tag => { if (inv.tagsCost[tag]) cost *= Math.max(0.15, 1 - inv.tagsCost[tag] * level); });
        if (inv.tagsDuration) tags.forEach(tag => { if (inv.tagsDuration[tag]) duration *= multFromRate(inv.tagsDuration[tag], level, 0.20); });
      }
      return { chance, cost, duration };
    }

    function investmentScalar(key) {
      let value = 0;
      for (const inv of INVESTMENT_UPGRADES) {
        const level = invLevel(inv.id);
        if (level && inv[key]) value += inv[key] * level;
      }
      return value;
    }

    function cargoInvestmentBonus(cargoId) {
      let bonus = 0;
      for (const inv of INVESTMENT_UPGRADES) {
        const level = invLevel(inv.id);
        if (!level) continue;
        if (inv.deliveryBonus) bonus += inv.deliveryBonus * level;
        if (inv.cargoBonus?.[cargoId]) bonus += inv.cargoBonus[cargoId] * level;
        if (inv.perWagonBonus) bonus += inv.perWagonBonus * level * Math.max(0, wagonCount() - BASE_WAGONS);
      }
      return bonus;
    }

    function contractInvestmentBonus() {
      return investmentScalar("contractBonus");
    }

    function penaltyReductionMult() {
      return Math.max(0.25, 1 - investmentScalar("penaltyReduction"));
    }

    function stopFineMult() {
      return Math.max(0.25, 1 - investmentScalar("stopFineReduction"));
    }

    function repairCostMult(source = "manual") {
      let reduction = investmentScalar("repairCost");
      if (source === "outsourced" || source === "paid") reduction += investmentScalar("paidRepairCost");
      if (source === "outsourced") reduction += investmentScalar("offshiftCost");
      return Math.max(0.30, 1 - reduction);
    }

    function repairTimeMult(source = "manual") {
      let reduction = investmentScalar("repairTime");
      if (source === "outsourced" || source === "paid") reduction += investmentScalar("paidRepairTime");
      if (source === "outsourced") reduction += investmentScalar("offshiftTime");
      return Math.max(0.35, 1 - reduction);
    }

    function buyAdvancedInvestment(id) {
      const def = INVESTMENT_UPGRADES.find(item => item.id === id);
      if (!def) return;
      const level = invLevel(id);
      if (level >= def.max) return;
      const cost = investmentCost(def);
      if (state.money < cost) {
        addLog(`Caixa insuficiente para ${def.nome}.`, "bad");
        return;
      }
      state.money -= cost;
      state.investments[id] = level + 1;
      addLog(`${def.emoji} ${def.nome} evoluído para nível ${level + 1}. ${def.effect}.`, "good");
      sfx("buy");
      investmentRenderSig = "";
      render();
    }

    function openInvestmentModal() {
      if (!investmentModalEl) return;
      investmentModalEl.hidden = false;
      investmentModalEl.setAttribute("aria-hidden", "false");
      investmentRenderSig = "";
      renderAdvancedInvestments(true);
    }

    function closeInvestmentModal() {
      if (!investmentModalEl) return;
      investmentModalEl.hidden = true;
      investmentModalEl.setAttribute("aria-hidden", "true");
    }

    function renderInvestmentTabs() {
      if (!investmentTabsEl) return;
      investmentTabsEl.innerHTML = INVESTMENT_CATEGORIES.map(cat => `
        <button class="investment-tab ${cat.id === activeInvestmentCategory ? "active" : ""}" type="button" data-invest-cat="${cat.id}">
          ${cat.label}
        </button>
      `).join("");
    }

    function renderAdvancedInvestments(force = false) {
      if (!investmentModalEl || investmentModalEl.hidden || !investmentListEl) return;
      const levelSig = INVESTMENT_UPGRADES.map(def => `${def.id}:${invLevel(def.id)}`).join("|");
      const moneyBucket = Math.floor(state.money / 50);
      const sig = `${activeInvestmentCategory}|${moneyBucket}|${levelSig}`;
      if (!force && sig === investmentRenderSig) return;
      investmentRenderSig = sig;

      renderInvestmentTabs();

      const bought = totalInvestmentLevels();
      const activeCount = Object.values(state.investments || {}).filter(v => Number(v || 0) > 0).length;
      investmentSummaryEl.textContent = bought
        ? `${bought} nível(is) comprados em ${activeCount} investimento(s). Bônus de valor: +${Math.round(investmentScalar("deliveryBonus") * 100)}%, velocidade: +${Math.round(investmentScalar("speedBonus") * 100)}%, redução de multas de parada: ${Math.round((1 - stopFineMult()) * 100)}%.`
        : "Nenhum investimento avançado comprado ainda.";

      const items = INVESTMENT_UPGRADES.filter(def => activeInvestmentCategory === "todos" || def.cat === activeInvestmentCategory);
      investmentListEl.innerHTML = items.map(def => {
        const level = invLevel(def.id);
        const maxed = level >= def.max;
        const cost = investmentCost(def);
        return `
          <article class="investment-card ${maxed ? "maxed" : ""}">
            <div class="investment-card__head">
              <span class="investment-card__emoji">${def.emoji}</span>
              <div><h3>${def.nome}</h3><div class="effect">${def.effect}</div></div>
              <span class="level">nível ${level}/${def.max}</span>
            </div>
            <p>${def.desc}</p>
            <button class="action ${def.cat === "risco" || def.cat === "via" ? "secondary" : ""}" type="button" data-buy-investment="${def.id}" ${maxed || state.money < cost ? "disabled" : ""}>
              ${maxed ? "Máximo" : `Comprar por ${formatCurrency(cost)}`}
            </button>
          </article>
        `;
      }).join("");
    }

    /* ============================ Log e Toasts ============================ */
    function addLog(message, type = "") {
      const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      logItems.unshift({ message, type, time });
      logItems = logItems.slice(0, 30);
      renderLog();
    }

    function renderLog() {
      logEl.innerHTML = logItems.map(item => `
        <div class="log-item ${item.type}">
          <strong>${item.time}</strong> — ${item.message}
        </div>
      `).join("");
    }

    function showToast(emoji, title, desc) {
      const el = document.createElement("div");
      el.className = "toast";
      el.innerHTML = `<span class="t-emoji">${emoji}</span><div class="t-body"><strong>${title}</strong><span>${desc}</span></div>`;
      toastWrapEl.appendChild(el);
      requestAnimationFrame(() => el.classList.add("show"));
      setTimeout(() => {
        el.classList.remove("show");
        setTimeout(() => el.remove(), 400);
      }, 4200);
    }

    function unlock(id) {
      if (state.achievements[id]) return;
      const a = ACHIEVEMENTS[id];
      if (!a) return;
      state.achievements[id] = true;
      showToast(a.emoji, "Conquista: " + a.label, a.desc);
      sfx("achv");
    }

    function checkAchievements() {
      if (state.deliveries >= 1) unlock("first_delivery");
      if (state.deliveries >= 5) unlock("deliveries_5");
      if (state.deliveries >= 25) unlock("deliveries_25");
      if (state.deliveries >= 100) unlock("deliveries_100");
      if (state.totalEarned >= 5000) unlock("earned_5k");
      if (state.totalEarned >= 25000) unlock("earned_25k");
      if (state.combo >= 5) unlock("combo_5");
      if (state.combo >= 10) unlock("combo_10");
      if (state.wagonExtra >= 1) unlock("wagon_first");
      if (state.crewLevel >= 1) unlock("crew_hired");
    }

    /* ============================ Áudio (sintetizado) ============================ */
    function ensureAudio() {
      if (audioCtx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { audioCtx = new AC(); } catch (e) { audioCtx = null; }
    }
    function tone(freq, dur, type = "sine", vol = 0.06, when = 0) {
      if (!state.soundOn || !audioCtx) return;
      const t0 = audioCtx.currentTime + when;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }
    function sfx(kind) {
      if (!state.soundOn) return;
      ensureAudio();
      if (!audioCtx) return;
      if (audioCtx.state === "suspended") audioCtx.resume();
      switch (kind) {
        case "delivery": tone(660, .12, "triangle", .07); tone(880, .16, "triangle", .07, .1); break;
        case "break":    tone(190, .28, "sawtooth", .05); tone(140, .32, "square", .04, .06); break;
        case "repaired": tone(520, .1, "sine", .06); tone(720, .14, "sine", .06, .08); break;
        case "buy":      tone(440, .08, "square", .05); tone(620, .1, "square", .05, .06); break;
        case "contract": tone(784, .12, "triangle", .07); tone(1046, .16, "triangle", .06, .1); break;
        case "achv":     tone(659, .1, "triangle", .06); tone(880, .1, "triangle", .06, .08); tone(1175, .18, "triangle", .06, .16); break;
        case "click":    tone(360, .05, "square", .04); break;
      }
    }
    function updateSoundButton() {
      soundToggle.textContent = state.soundOn ? "🔊 Som" : "🔇 Som";
      soundToggle.setAttribute("aria-pressed", String(state.soundOn));
    }

    /* ============================ Desenho do trilho ============================ */
    function buildTrackDecor() {
      if (!railPathEl.getTotalLength) return;
      let L = 0;
      try { L = railPathEl.getTotalLength(); } catch (e) { return; }
      if (!L || !isFinite(L)) return;
      railLen = L;

      const GAUGE = 7;     // meia-distância entre os dois trilhos (unidades de viewBox)
      const TIE_STEP = 15; // espaçamento dos dormentes
      const TIE_HALF = 11; // meio comprimento do dormente

      let ties = "";
      let left = [], right = [];
      for (let d = 4; d <= L - 2; d += 2) {
        const p = railPathEl.getPointAtLength(d);
        const p2 = railPathEl.getPointAtLength(Math.min(d + 2, L));
        let nx = -(p2.y - p.y), ny = (p2.x - p.x);
        const len = Math.hypot(nx, ny) || 1;
        nx /= len; ny /= len;
        left.push([p.x + nx * GAUGE, p.y + ny * GAUGE]);
        right.push([p.x - nx * GAUGE, p.y - ny * GAUGE]);
      }
      for (let d = 6; d <= L - 6; d += TIE_STEP) {
        const p = railPathEl.getPointAtLength(d);
        const p2 = railPathEl.getPointAtLength(Math.min(d + 2, L));
        let nx = -(p2.y - p.y), ny = (p2.x - p.x);
        const len = Math.hypot(nx, ny) || 1;
        nx /= len; ny /= len;
        ties += `<line class="tie" x1="${(p.x + nx * TIE_HALF).toFixed(1)}" y1="${(p.y + ny * TIE_HALF).toFixed(1)}" x2="${(p.x - nx * TIE_HALF).toFixed(1)}" y2="${(p.y - ny * TIE_HALF).toFixed(1)}" />`;
      }
      const toPath = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      trackDecorEl.innerHTML =
        ties +
        `<path class="steel-rail" d="${toPath(left)}" />` +
        `<path class="steel-rail" d="${toPath(right)}" />` +
        `<path class="steel-rail hl" d="${toPath(left)}" />` +
        `<path class="steel-rail hl" d="${toPath(right)}" />`;
    }

    function computeSegmentMidpoints() {
      SEGMENTS.forEach(info => {
        const path = document.getElementById(`seg-${info.id}`);
        let placed = false;
        if (path && path.getTotalLength) {
          try {
            const L = path.getTotalLength();
            if (L && isFinite(L)) {
              const p = path.getPointAtLength(L / 2);
              segMid[info.id] = { leftPct: (p.x / 1000) * 100, topPct: (p.y / 500) * 100 };
              placed = true;
            }
          } catch (e) {}
        }
        if (!placed) segMid[info.id] = { leftPct: info.x, topPct: info.y };
      });
    }

    /* ============================ Desenho do trem (SVG por vagão) ============================ */
    function engineSVG() {
      const W = 60, H = 26;
      return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="engBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#0a4d80"/><stop offset="1" stop-color="#003865"/>
          </linearGradient>
        </defs>
        <!-- passadiços -->
        <rect x="6" y="2.5" width="46" height="3" rx="1.5" fill="#cfd9df"/>
        <rect x="6" y="20.5" width="46" height="3" rx="1.5" fill="#cfd9df"/>
        <!-- corpo com nariz chanfrado à direita -->
        <path d="M6 4 H49 L57 9 V17 L49 22 H6 A3 3 0 0 1 3 19 V7 A3 3 0 0 1 6 4 Z" fill="url(#engBody)" stroke="#fff" stroke-width="1.4"/>
        <!-- faixa verde Rumo -->
        <rect x="6" y="11.5" width="44" height="3" rx="1.5" fill="#1E9F7F"/>
        <!-- cabine -->
        <rect x="9" y="7" width="13" height="12" rx="2.5" fill="#32A6E6" stroke="#fff" stroke-width="1"/>
        <!-- faróis -->
        <circle class="headlight" cx="54" cy="10.5" r="1.8" fill="#FBD300"/>
        <circle class="headlight" cx="54" cy="15.5" r="1.8" fill="#FBD300"/>
        <!-- rodas -->
        <g fill="#0a2438">
          <rect x="13" y="-1.5" width="7" height="4" rx="1.6"/><rect x="26" y="-1.5" width="7" height="4" rx="1.6"/><rect x="39" y="-1.5" width="7" height="4" rx="1.6"/>
          <rect x="13" y="23.5" width="7" height="4" rx="1.6"/><rect x="26" y="23.5" width="7" height="4" rx="1.6"/><rect x="39" y="23.5" width="7" height="4" rx="1.6"/>
        </g>
        <!-- engate -->
        <rect x="0.5" y="11.5" width="4" height="3" rx="1" fill="#54707f"/>
      </svg>`;
    }

    function wagonSVG(cargo) {
      const W = 48, H = 24;
      const c = cargo.cor;
      const wheels = `<g fill="#0a2438">
          <rect x="9" y="-1.5" width="7" height="4" rx="1.6"/><rect x="32" y="-1.5" width="7" height="4" rx="1.6"/>
          <rect x="9" y="21.5" width="7" height="4" rx="1.6"/><rect x="32" y="21.5" width="7" height="4" rx="1.6"/>
        </g>`;
      const couplers = `<rect x="0.5" y="10.5" width="4" height="3" rx="1" fill="#54707f"/><rect x="43.5" y="10.5" width="4" height="3" rx="1" fill="#54707f"/>`;
      let body = "";
      switch (cargo.tipo) {
        case "container":
          body = `<rect x="4" y="6.5" width="40" height="11" rx="1.5" fill="#445b6b"/>
            <rect x="5.5" y="3.5" width="17.5" height="17" rx="2" fill="${c}" stroke="#0c3a2e" stroke-width="1"/>
            <rect x="25" y="3.5" width="17.5" height="17" rx="2" fill="#32A6E6" stroke="#0a3a5c" stroke-width="1"/>
            <g stroke="rgba(0,0,0,.18)" stroke-width="1">
              <line x1="9" y1="4" x2="9" y2="20"/><line x1="13" y1="4" x2="13" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/>
              <line x1="29" y1="4" x2="29" y2="20"/><line x1="33" y1="4" x2="33" y2="20"/><line x1="37" y1="4" x2="37" y2="20"/>
            </g>`;
          break;
        case "tank":
          body = `<rect x="5" y="6.5" width="38" height="11" rx="5.5" fill="${c}" stroke="#5a6670" stroke-width="1.2"/>
            <rect x="5" y="10" width="38" height="2.4" fill="rgba(255,255,255,.6)"/>
            <rect x="20" y="5.5" width="8" height="3" rx="1.4" fill="#7b8893"/>
            <rect x="9" y="6.5" width="3" height="11" fill="#FBD300" opacity=".85"/>
            <rect x="36" y="6.5" width="3" height="11" fill="#FBD300" opacity=".85"/>`;
          break;
        case "hopper":
          body = `<path d="M4 6 H44 V13 L36 20 H12 L4 13 Z" fill="${c}" stroke="#7a5a1e" stroke-width="1.1"/>
            <rect x="4" y="5" width="40" height="3" rx="1.4" fill="#a87f2c"/>
            <g stroke="rgba(0,0,0,.15)" stroke-width="1"><line x1="16" y1="6" x2="16" y2="18"/><line x1="24" y1="6" x2="24" y2="19"/><line x1="32" y1="6" x2="32" y2="18"/></g>`;
          break;
        case "covered":
          body = `<rect x="4" y="6.5" width="40" height="12" rx="2" fill="${c}" stroke="#b9c4cb" stroke-width="1.2"/>
            <path d="M4 6.5 Q24 1.5 44 6.5" fill="none" stroke="#c9d3da" stroke-width="2.4"/>
            <g stroke="rgba(0,0,0,.12)" stroke-width="1"><line x1="14" y1="7" x2="14" y2="18"/><line x1="24" y1="7" x2="24" y2="18"/><line x1="34" y1="7" x2="34" y2="18"/></g>`;
          break;
        case "gondola":
          body = `<rect x="4" y="9" width="40" height="9" rx="1.5" fill="#3a4b57" stroke="#243038" stroke-width="1"/>
            <path d="M6 9 Q14 5 24 6 Q34 7 42 9 Z" fill="${c}"/>`;
          break;
        case "boxcar":
        default:
          body = `<rect x="4" y="6" width="40" height="12.5" rx="2" fill="${c}" stroke="#9a7f55" stroke-width="1.2"/>
            <rect x="20" y="6.5" width="2" height="11.5" fill="rgba(0,0,0,.2)"/>
            <rect x="22" y="6.5" width="2" height="11.5" fill="rgba(0,0,0,.12)"/>`;
          break;
      }
      return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${couplers}${body}${wheels}</svg>`;
    }

    // Comprimentos em unidades de viewBox (para articular sobre a curva)
    const ENGINE_LEN = 70;
    const WAGON_LEN = 56;
    const GAP = 8;

    function buildTrain() {
      const cargo = cargoById(state.currentCargoId);
      const cars = [];
      cars.push({ kind: "engine", html: engineSVG() });
      for (let i = 0; i < wagonCount(); i++) cars.push({ kind: "wagon", html: wagonSVG(cargo) });

      trainLayerEl.innerHTML = "";
      let offset = 0;
      trainLayerEl._cars = cars.map((car, idx) => {
        if (idx === 0) { car.center = ENGINE_LEN / 2; offset = ENGINE_LEN; }
        else { car.center = offset + GAP + WAGON_LEN / 2; offset += GAP + WAGON_LEN; }
        const div = document.createElement("div");
        div.className = "train-car " + car.kind;
        div.innerHTML = car.html;
        trainLayerEl.appendChild(div);
        return { el: div, center: car.center };
      });
      trainLayerEl._trainLen = offset;
    }

    function updateTrain() {
      const cars = trainLayerEl._cars;
      if (!cars || !railPathEl.getPointAtLength) return;
      let L = railLen;
      if (!L) { try { L = railPathEl.getTotalLength(); railLen = L; } catch (e) { return; } }
      if (!L || !isFinite(L)) return;

      const W = railAreaEl.clientWidth || 1000;
      const H = railAreaEl.clientHeight || 500;
      const sx = W / 1000, sy = H / 500;

      const trainLen = trainLayerEl._trainLen || ENGINE_LEN;
      const headMin = ENGINE_LEN / 2;
      const headMax = L - 2;
      const headDist = headMin + (clamp(state.trainProgress, 0, 100) / 100) * (headMax - headMin);

      cars.forEach(car => {
        const d = clamp(headDist - car.center, 1, L - 1);
        const p = railPathEl.getPointAtLength(d);
        const p2 = railPathEl.getPointAtLength(clamp(d + 1.5, 0, L));
        const ang = Math.atan2((p2.y - p.y) * sy, (p2.x - p.x) * sx) * 180 / Math.PI;
        car.el.style.left = (p.x / 1000 * 100) + "%";
        car.el.style.top = (p.y / 500 * 100) + "%";
        car.el.style.transform = `translate(-50%, -50%) rotate(${ang.toFixed(1)}deg)`;
      });

      trainLayerEl.classList.toggle("broken-dim", hasBrokenLine());
    }

    /* ============================ Marcadores de falha ============================ */
    function segmentSignature() {
      return state.segments.map(s => `${s.id}:${s.status}:${s.by}:${s.incidentLabel || ""}`).join("|");
    }

    function rebuildMarkers() {
      document.querySelectorAll(".break-marker").forEach(el => el.remove());
      markerRefs = {};
      SEGMENTS.forEach(info => {
        const seg = state.segments.find(s => s.id === info.id);
        if (seg.status === "ok") return;
        const pos = segMid[info.id] || { leftPct: info.x, topPct: info.y };
        const marker = document.createElement("div");
        marker.className = "break-marker" + (seg.status === "repairing" ? " repairing" : "");
        marker.style.left = pos.leftPct + "%";
        marker.style.top = pos.topPct + "%";

        if (seg.status === "broken") {
          const cost = repairCost(info.id);
          marker.innerHTML = `
            <strong>⚠️ ${info.name} quebrado</strong>
            <small>Conserto pago: <span data-cost>${formatCurrency(cost)}</span></small>
            <button data-repair="${info.id}">Contratar equipe</button>`;
          markerRefs[info.id] = { mode: "broken", btn: marker.querySelector("button"), cost: marker.querySelector("[data-cost]") };
        } else {
          const label = seg.by === "crew"
            ? "👷 " + info.name + " (equipe própria)"
            : (seg.by === "outsourced"
              ? "🏗️ " + info.name + " (terceirizada)"
              : (seg.by === "incident" || seg.by === "hold"
                ? `${seg.incidentEmoji || "⚠️"} ${seg.incidentLabel || info.name}`
                : "👷 " + info.name + " em obra"));
          marker.innerHTML = `
            <strong>${label}</strong>
            <small data-left>${Math.ceil(seg.repairLeft)}s restantes</small>
            <div class="progress-bar"><span data-prog></span></div>`;
          markerRefs[info.id] = { mode: "repairing", small: marker.querySelector("[data-left]"), prog: marker.querySelector("[data-prog]") };
        }
        railAreaEl.appendChild(marker);
      });
    }

    function updateMarkersDynamic() {
      SEGMENTS.forEach(info => {
        const ref = markerRefs[info.id];
        if (!ref) return;
        const seg = state.segments.find(s => s.id === info.id);
        if (ref.mode === "broken" && ref.btn) {
          const cost = repairCost(info.id);
          ref.btn.disabled = state.money < cost;
        } else if (ref.mode === "repairing") {
          if (ref.small) ref.small.textContent = `${Math.ceil(seg.repairLeft)}s restantes`;
          if (ref.prog) {
            const done = clamp(((seg.repairTotal - seg.repairLeft) / seg.repairTotal) * 100, 0, 100);
            ref.prog.style.width = done + "%";
          }
        }
      });
    }

    function syncMarkers() {
      const sig = segmentSignature();
      if (sig !== markerSig) { markerSig = sig; rebuildMarkers(); }
      updateMarkersDynamic();
    }

    /* ============================ Ações do jogador ============================ */
    function startPaidRepair(segment, source = "manual", force = false) {
      if (!segment || segment.status !== "broken") return false;
      const originalBy = segment.by;
      segment.by = source === "outsourced" ? "outsourced" : "paid";
      const cost = repairCost(segment.id);
      segment.by = originalBy;
      if (!force && state.money < cost) {
        addLog(`Caixa insuficiente para reparar o ${SEGMENTS[segment.id].name}.`, "bad");
        return false;
      }
      state.money -= cost;
      state.worksSpent += cost;
      segment.status = "repairing";
      segment.by = source === "outsourced" ? "outsourced" : "paid";
      segment.repairTotal = Math.max(3, PAID_REPAIR_TIME * repairTimeMult(segment.by));
      segment.repairLeft = segment.repairTotal;
      const origem = source === "outsourced" ? "terceirizada fora do turno" : "terceirizada";
      addLog(`Equipe ${origem} enviada ao ${SEGMENTS[segment.id].name} por ${formatCurrency(cost)}.`, "work");
      sfx("buy");
      return true;
    }

    function dispatchRepair(segmentId) {
      const segment = state.segments.find(s => s.id === segmentId);
      if (startPaidRepair(segment, "manual", false)) render();
    }

    function buySpeedUpgrade() {
      const cost = speedUpgradeCost();
      if (state.money < cost) return;
      state.money -= cost; state.speedLevel += 1;
      addLog(`Velocidade aumentada para ${(1 + (state.speedLevel - 1) * 0.22).toFixed(2)}x.`, "good");
      sfx("buy"); render();
    }
    function buyCargoUpgrade() {
      const cost = cargoUpgradeCost();
      if (state.money < cost) return;
      state.money -= cost; state.cargoLevel += 1;
      state.cargoValue += 180 + state.cargoLevel * 40;
      addLog(`Valor base da carga elevado para ${formatCurrency(state.cargoValue)}.`, "good");
      sfx("buy"); render();
    }
    function buyWagonUpgrade() {
      if (state.wagonExtra >= MAX_WAGON_EXTRA) return;
      const cost = wagonUpgradeCost();
      if (state.money < cost) return;
      state.money -= cost; state.wagonExtra += 1;
      addLog(`Vagão extra acoplado. A composição agora tem ${wagonCount()} vagões e cada entrega ganha +${formatCurrency(WAGON_BONUS)} de base.`, "good");
      buildTrain(); checkAchievements(); sfx("buy"); render();
    }
    function buyCrewUpgrade() {
      if (state.crewLevel >= CREW_MAX_LEVEL) return;
      const cost = crewUpgradeCost();
      if (state.money < cost) return;
      state.money -= cost; state.crewLevel += 1;
      const shift = CREW_SHIFT[state.crewLevel];
      addLog(`Equipe própria nível ${state.crewLevel}: repara em até ${CREW_TIME[state.crewLevel]}s, capacidade ${CREW_CAPACITY[state.crewLevel]} trecho(s), turno ${shift.on}s/${shift.off}s.`, "good");
      checkAchievements(); sfx("buy"); render();
    }
    function buyPreventUpgrade() {
      if (state.preventLevel >= PREVENT_MAX_LEVEL) return;
      const cost = preventUpgradeCost();
      if (state.money < cost) return;
      state.money -= cost; state.preventLevel += 1;
      const rounds = preventiveRoundsForLevel(state.preventLevel);
      state.preventRoundsLeft += rounds;
      addLog(`Manutenção preventiva nível ${state.preventLevel}: +${rounds} rodada(s) de proteção. Total protegido: ${state.preventRoundsLeft}.`, "good");
      sfx("buy"); render();
    }
    function takeLoan() {
      if (state.loanDebt > 0) return;
      const amount = loanOfferAmount();
      const payback = loanPaybackAmount(amount);
      state.money += amount;
      state.loanDebt = payback;
      addLog(`Empréstimo emergencial de ${formatCurrency(amount)} recebido. Dívida: ${formatCurrency(payback)}.`, "work");
      sfx("buy"); render();
    }

    /* ============================ Falhas / equipe própria ============================ */
    function createBreak() {
      if (state.preventRoundsLeft > 0) {
        state.preventRoundsLeft -= 1;
        addLog(`🛡️ Manutenção preventiva absorveu uma falha. Rodadas protegidas restantes: ${state.preventRoundsLeft}.`, "good");
        return;
      }
      const candidates = state.segments.filter(s => s.status === "ok");
      if (!candidates.length) return;
      const segment = candidates[Math.floor(Math.random() * candidates.length)];
      segment.status = "broken";
      segment.repairLeft = 0;
      segment.incidentLabel = "";
      segment.incidentEmoji = "";
      addLog(`${SEGMENTS[segment.id].name} quebrou. O trem fica parado até a via ser liberada. Multa: 2% da entrega atual por segundo parado.`, "bad");
      if (state.combo > 0) addLog(`Sequência de ${state.combo}x perdida pela quebra.`, "bad");
      state.combo = 0;
      sfx("break");
    }

    function scheduleNextBreak() {
      const base = 18 + Math.random() * 14;
      const difficulty = Math.max(0, (state.speedLevel + state.cargoLevel - 2) * 0.9);
      const prevention = state.preventLevel * 5 + state.preventRoundsLeft * 0.8;
      state.nextBreakAt = Math.max(8, base - difficulty + prevention);
    }

    function autoCrew() {
      const broken = state.segments.filter(s => s.status === "broken");
      if (!broken.length) return;

      if (state.crewLevel <= 0) return;

      const shift = crewShiftInfo();
      if (!shift.active) {
        broken.forEach(seg => startPaidRepair(seg, "outsourced", true));
        return;
      }

      const capacity = CREW_CAPACITY[state.crewLevel];
      let busy = crewBusy();
      for (const seg of broken) {
        if (busy >= capacity) break;
        seg.status = "repairing";
        seg.by = "crew";
        seg.repairTotal = CREW_TIME[state.crewLevel];
        seg.repairLeft = CREW_TIME[state.crewLevel];
        busy++;
        addLog(`Equipe própria começou a reparar o ${SEGMENTS[seg.id].name} durante o turno ativo (sem custo direto).`, "work");
      }
    }

    function applyMaintenanceFine(dt) {
      if (!hasAnyProblem()) {
        maintenanceFineNotice = 0;
        return;
      }
      const fine = deliveryValue() * STOP_FINE_RATE * stopFineMult() * dt;
      addIncidentCost(fine, "", true);
      maintenanceFineNotice += dt;
      if (maintenanceFineNotice >= 5) {
        maintenanceFineNotice = 0;
        addLog(`Multa por parada: ${formatCurrency(deliveryValue() * STOP_FINE_RATE * stopFineMult())} por segundo até a via liberar.`, "bad");
      }
    }

    /* ============================ Eventos e contratos ============================ */
    function blockSegmentForIncident(def) {
      const candidates = state.segments.filter(s => s.status === "ok");
      if (!candidates.length) return false;
      const segment = candidates[Math.floor(Math.random() * candidates.length)];
      segment.status = "repairing";
      segment.by = def.id === "cruzamento_outra_composicao" ? "hold" : "incident";
      segment.repairTotal = Math.max(3, Number(def.blockDur || def.dur || 12) * investmentEffectForEvent(def).duration);
      segment.repairLeft = segment.repairTotal;
      segment.incidentLabel = def.nome;
      segment.incidentEmoji = def.emoji;
      return true;
    }

    function startViaCostEvent(def) {
      const upfront = incidentBaseCost(def);
      const cost = addIncidentCost(upfront, `${def.emoji} ${def.nome}`, false);
      let blocked = false;

      if (def.block) blocked = blockSegmentForIncident(def);

      if (def.block && state.combo > 0) {
        addLog(`Sequência de ${state.combo}x perdida por ocorrência de via.`, "bad");
        state.combo = 0;
      }

      activeEvent = { def, left: Number(def.dur || 8), paid: cost, runningCost: 0, costNotice: 0 };
      const impact = [
        cost ? `custo inicial ${formatCurrency(cost)}` : "",
        def.block && blocked ? "trecho bloqueado" : "",
        def.speed ? `velocidade ${Math.round(def.speed * 100)}%` : "",
        def.recurringDeliveryPct || def.recurringFixed || def.recurringPerWagon ? "custo recorrente ativo" : ""
      ].filter(Boolean).join(" · ");

      addLog(`${def.emoji} ${def.nome}: ${def.desc}${impact ? " — " + impact : ""}.`, "bad");
      showToast(def.emoji, def.nome, impact || def.desc);
      sfx(def.block ? "break" : "buy");
    }

    function maybeStartEvent(dt) {
      if (activeEvent || hasAnyProblem()) return;
      eventCooldown -= dt;
      if (eventCooldown > 0) return;

      // A maior parte dos eventos agora é custo de via; os eventos originais continuam
      // existindo para variar ritmo, clima e mercado.
      const useCostEvent = Math.random() < Math.max(0.25, 0.78 * (1 - Math.min(0.50, investmentScalar("generalChance"))));
      if (useCostEvent) {
        const pool = eligibleViaCostEvents();
        if (pool.length) {
          startViaCostEvent(weightedPick(pool));
          return;
        }
      }

      const def = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      activeEvent = { def, left: def.dur, paid: 0, runningCost: 0, costNotice: 0 };
      addLog(`${def.emoji} ${def.nome}: ${def.desc}`, "event");
      showToast(def.emoji, def.nome, def.desc);
    }

    function tickEvent(dt) {
      if (!activeEvent) return;

      const recurring = recurringIncidentCost(activeEvent.def, dt);
      if (recurring > 0) {
        const paid = addIncidentCost(recurring, "", true);
        activeEvent.runningCost = (activeEvent.runningCost || 0) + paid;
        activeEvent.costNotice = (activeEvent.costNotice || 0) + dt;
        if (activeEvent.costNotice >= 6) {
          activeEvent.costNotice = 0;
          addLog(`${activeEvent.def.emoji} ${activeEvent.def.nome}: custo recorrente acumulado ${formatCurrency(activeEvent.runningCost)}.`, "bad");
        }
      }

      activeEvent.left -= dt;
      if (activeEvent.left <= 0) {
        if (activeEvent.def.id === "chuva") unlock("storm_survivor");
        if (activeEvent.runningCost > 0) {
          addLog(`Fim do evento: ${activeEvent.def.nome}. Custo recorrente total: ${formatCurrency(activeEvent.runningCost)}.`, "bad");
        } else {
          addLog(`Fim do evento: ${activeEvent.def.nome}.`, activeEvent.def.deliveryPct || activeEvent.def.block ? "bad" : "event");
        }
        activeEvent = null;
        eventCooldown = 12 + Math.random() * 18;
      }
    }

    function maybeStartContract(dt) {
      if (contract) return;
      contractCooldown -= dt;
      if (contractCooldown > 0) return;
      const target = 2 + Math.floor(Math.random() * 3); // 2..4
      const time = target * 30 + 16;
      const reward = Math.round((state.cargoValue + state.wagonExtra * WAGON_BONUS) * target * 0.85 * (1 + contractInvestmentBonus()));
      contract = { target, startDeliveries: state.deliveries, left: time, reward };
      addLog(`📋 Contrato expresso: entregue ${target} cargas em ${Math.round(time)}s por ${formatCurrency(reward)}.`, "event");
      showToast("📋", "Novo contrato expresso", `${target} entregas em ${Math.round(time)}s → ${formatCurrency(reward)}`);
      sfx("contract");
    }
    function tickContract(dt) {
      if (!contract) return;
      contract.left -= dt;
      const done = state.deliveries - contract.startDeliveries;
      if (done >= contract.target) {
        state.money += contract.reward;
        state.totalEarned += contract.reward;
        state.contractsDone += 1;
        addLog(`✅ Contrato cumprido! Bônus de ${formatCurrency(contract.reward)} recebido.`, "good");
        showToast("✅", "Contrato cumprido!", `Bônus de ${formatCurrency(contract.reward)}`);
        unlock("contract_first");
        sfx("contract");
        contract = null;
        contractCooldown = 18 + Math.random() * 16;
      } else if (contract.left <= 0) {
        const penalty = Math.round(contract.reward * 0.35 * penaltyReductionMult());
        addIncidentCost(penalty, "⌛ Penalidade por atraso no contrato expresso", false);
        addLog(`Contrato expresso expirou. Penalidade aplicada: ${formatCurrency(penalty)}.`, "bad");
        contract = null;
        contractCooldown = 16 + Math.random() * 14;
      }
    }

    /* ============================ Entrega ============================ */
    function completeDelivery() {
      const cargo = cargoById(state.currentCargoId);
      let earned = deliveryValue();
      state.totalEarned += earned;
      state.deliveries += 1;
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);

      if (state.loanDebt > 0) {
        const payment = Math.min(state.loanDebt, Math.round(earned * 0.45));
        state.loanDebt -= payment;
        earned -= payment;
        addLog(`Entrega de ${cargo.nome} concluída: ${formatCurrency(earned)} no caixa e ${formatCurrency(payment)} para a dívida.`, "good");
      } else {
        const bonusTxt = state.combo > 1 ? ` (sequência ${state.combo}x · ${comboMult().toFixed(2)})` : "";
        addLog(`Entrega de ${cargo.nome} concluída no ponto B. Receita: ${formatCurrency(earned)}${bonusTxt}.`, "good");
      }
      state.money += earned;
      state.trainProgress = 0;

      // próxima viagem leva uma nova carga
      const novo = pickCargo();
      state.currentCargoId = novo.id;
      buildTrain();

      checkAchievements();
      sfx("delivery");
    }

    /* ============================ Render ============================ */
    function render() {
      const speed = currentSpeed();
      const speedCost = speedUpgradeCost();
      const cargoCost = cargoUpgradeCost();
      const lineBroken = hasBrokenLine();
      const problem = hasAnyProblem();
      const repairTeams = repairingCount();
      const cargo = cargoById(state.currentCargoId);

      moneyEl.textContent = formatCurrency(state.money);
      speedInfoEl.textContent = `${speed.toFixed(2)}x · nível ${state.speedLevel}`;
      cargoInfoEl.textContent = `${formatCurrency(state.cargoValue)} · nível ${state.cargoLevel}`;
      comboInfoEl.textContent = `${state.combo}x · ${comboMult().toFixed(2)}`;
      const shift = crewShiftInfo();
      repairsInfoEl.textContent = state.crewLevel > 0
        ? `${repairTeams} equipe(s) · ${shift.label} (${shift.left}s)`
        : `${repairTeams} equipe(s) em campo`;

      // carga atual
      cargoEmojiEl.textContent = cargo.emoji;
      cargoNameEl.textContent = cargo.nome;
      cargoMultEl.textContent = "×" + cargo.mult.toFixed(2) + " → " + formatCurrency(deliveryValue());

      // status
      if (lineBroken) { statusDotEl.className = "dot bad"; statusTextEl.textContent = "Linha quebrada"; }
      else if (repairTeams > 0) { statusDotEl.className = "dot work"; statusTextEl.textContent = "Obras em andamento"; }
      else { statusDotEl.className = "dot"; statusTextEl.textContent = "Linha operacional"; }

      nextBreakInfoEl.textContent = problem
        ? `Parado: multa de ${formatCurrency(deliveryValue() * STOP_FINE_RATE * stopFineMult())}/s até liberar a via.`
        : (activeEvent?.def.suppress
          ? "Via reforçada: sem novas falhas no momento."
          : `Próxima falha estimada em ${Math.ceil(state.nextBreakAt)}s · preventiva: ${state.preventRoundsLeft || 0} rodada(s)`);

      // upgrades
      speedUpgradeBtn.textContent = `Comprar por ${formatCurrency(speedCost)}`;
      speedUpgradeBtn.disabled = state.money < speedCost;
      speedLvlEl.textContent = `nível ${state.speedLevel}`;

      cargoUpgradeBtn.textContent = `Comprar por ${formatCurrency(cargoCost)}`;
      cargoUpgradeBtn.disabled = state.money < cargoCost;
      cargoLvlEl.textContent = `nível ${state.cargoLevel}`;

      wagonLvlEl.textContent = `${wagonCount()} vagões · +${formatCurrency(state.wagonExtra * WAGON_BONUS)}/entrega`;
      if (state.wagonExtra >= MAX_WAGON_EXTRA) {
        wagonUpgradeBtn.textContent = "Máximo acoplado";
        wagonUpgradeBtn.disabled = true;
      } else {
        const wc = wagonUpgradeCost();
        wagonUpgradeBtn.textContent = `Comprar por ${formatCurrency(wc)}`;
        wagonUpgradeBtn.disabled = state.money < wc;
      }

      crewLvlEl.textContent = state.crewLevel === 0 ? "sem equipe" : `nível ${state.crewLevel} · ${shift.label}`;
      if (state.crewLevel >= CREW_MAX_LEVEL) { crewUpgradeBtn.textContent = "Equipe no máximo"; crewUpgradeBtn.disabled = true; }
      else { const cc = crewUpgradeCost(); crewUpgradeBtn.textContent = `Comprar por ${formatCurrency(cc)}`; crewUpgradeBtn.disabled = state.money < cc; }

      preventLvlEl.textContent = `nível ${state.preventLevel} · ${state.preventRoundsLeft || 0} rodadas`;
      if (state.preventLevel >= PREVENT_MAX_LEVEL) { preventUpgradeBtn.textContent = "Preventiva no máximo"; preventUpgradeBtn.disabled = true; }
      else { const pc = preventUpgradeCost(); preventUpgradeBtn.textContent = `Comprar por ${formatCurrency(pc)}`; preventUpgradeBtn.disabled = state.money < pc; }

      const loanOffer = loanOfferAmount();
      loanButton.textContent = state.loanDebt > 0 ? `Dívida ativa: ${formatCurrency(state.loanDebt)}` : `Pegar ${formatCurrency(loanOffer)}`;
      loanButton.disabled = state.loanDebt > 0;

      // banner de evento
      if (activeEvent) {
        eventBannerEl.classList.add("show");
        evEmojiEl.textContent = activeEvent.def.emoji;
        evTitleEl.textContent = activeEvent.def.nome;
        evDescEl.textContent = activeEvent.def.desc + (
          activeEvent.paid || activeEvent.runningCost
            ? ` · custo: ${formatCurrency((activeEvent.paid || 0) + (activeEvent.runningCost || 0))}`
            : ""
        );
        evTimerEl.textContent = Math.ceil(activeEvent.left) + "s";
      } else {
        eventBannerEl.classList.remove("show");
      }

      // contrato
      if (contract) {
        const done = state.deliveries - contract.startDeliveries;
        contractBoxEl.classList.remove("idle");
        ctTitleEl.textContent = `Contrato expresso: ${done}/${contract.target} entregas`;
        ctDescEl.textContent = `Bônus de ${formatCurrency(contract.reward)} ao concluir.`;
        ctTimerEl.style.display = "";
        ctTimerEl.textContent = Math.ceil(contract.left) + "s";
      } else {
        contractBoxEl.classList.add("idle");
        ctTitleEl.textContent = "Nenhum contrato ativo";
        ctDescEl.textContent = "Aguardando novo contrato expresso...";
        ctTimerEl.style.display = "none";
      }

      // estatísticas
      stDeliveries.textContent = state.deliveries;
      stEarned.textContent = formatCurrency(state.totalEarned);
      stBestCombo.textContent = state.bestCombo + "x";
      stContracts.textContent = state.contractsDone;
      stWorks.textContent = formatCurrency(state.worksSpent);
      const totalSec = Math.floor(state.uptimeMs / 1000);
      stUptime.textContent = Math.floor(totalSec / 60) + ":" + String(totalSec % 60).padStart(2, "0");

      // cards de custos abaixo da tela da dinâmica do trem
      costWorksEl.textContent = formatCurrency(state.worksSpent);
      costOperationalEl.textContent = formatCurrency(operatingCostEstimate());
      costMaintenanceEl.textContent = formatCurrency(maintenanceCostEstimate());
      costCrewEl.textContent = formatCurrency(crewCostEstimate());
      costLoanEl.textContent = formatCurrency(loanInterestEstimate());
      costTotalEl.textContent = formatCurrency(totalCostEstimate());

      updateTrain();
      syncMarkers();
      renderAdvancedInvestments();
    }

    /* ============================ Loop ============================ */
    function tick(now) {
      const dt = Math.min(0.25, (now - lastTick) / 1000);
      lastTick = now;
      state.elapsedMs = (state.elapsedMs || 0) + dt * 1000;

      // progresso de reparos
      state.segments.forEach(segment => {
        if (segment.status === "repairing") {
          segment.repairLeft -= dt;
          if (segment.repairLeft <= 0) {
            segment.status = "ok";
            segment.repairLeft = 0;
            const incidentName = segment.incidentLabel;
            segment.by = "paid";
            segment.incidentLabel = "";
            segment.incidentEmoji = "";
            addLog(incidentName ? `${incidentName} resolvido no ${SEGMENTS[segment.id].name}.` : `${SEGMENTS[segment.id].name} reparado e liberado.`, "good");
            sfx("repaired");
          }
        }
      });

      // equipe própria entra em ação em trechos quebrados
      autoCrew();

      applyMaintenanceFine(dt);

      // eventos e contratos correm sempre
      maybeStartEvent(dt);
      tickEvent(dt);
      maybeStartContract(dt);
      tickContract(dt);

      // falhas só surgem com a linha operacional (e fora de inspeção)
      if (!hasAnyProblem()) {
        if (!activeEvent?.def.suppress) {
          const wear = activeEvent?.def.wear || 1;
          state.nextBreakAt -= dt * wear;
          if (state.nextBreakAt <= 0) { createBreak(); scheduleNextBreak(); }
        }
      }

      // o trem anda com a linha liberada
      if (!hasAnyProblem()) {
        state.uptimeMs += dt * 1000;
        state.trainProgress += dt * 5.8 * currentSpeed();
        if (state.trainProgress >= 100) completeDelivery();
      }

      render();
      requestAnimationFrame(tick);
    }

    /* ============================ Eventos de UI ============================ */
    advancedInvestBtn?.addEventListener("click", openInvestmentModal);
    closeInvestmentsBtn?.addEventListener("click", closeInvestmentModal);
    investmentModalEl?.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-investments]")) closeInvestmentModal();
      const tab = event.target.closest("[data-invest-cat]");
      if (tab) {
        activeInvestmentCategory = tab.dataset.investCat;
        investmentRenderSig = "";
        renderAdvancedInvestments(true);
      }
      const buy = event.target.closest("[data-buy-investment]");
      if (buy) buyAdvancedInvestment(buy.dataset.buyInvestment);
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && investmentModalEl && !investmentModalEl.hidden) closeInvestmentModal();
    });


    speedUpgradeBtn.addEventListener("click", buySpeedUpgrade);
    cargoUpgradeBtn.addEventListener("click", buyCargoUpgrade);
    wagonUpgradeBtn.addEventListener("click", buyWagonUpgrade);
    crewUpgradeBtn.addEventListener("click", buyCrewUpgrade);
    preventUpgradeBtn.addEventListener("click", buyPreventUpgrade);
    loanButton.addEventListener("click", takeLoan);
    saveButton.addEventListener("click", () => saveState(true));
    resetButton.addEventListener("click", resetGame);

    soundToggle.addEventListener("click", () => {
      state.soundOn = !state.soundOn;
      updateSoundButton();
      if (state.soundOn) { ensureAudio(); if (audioCtx?.state === "suspended") audioCtx.resume(); sfx("click"); }
      saveState(false);
    });

    // botão "Contratar equipe": delegação por clique (agora confiável, pois o
    // marcador não é mais recriado a cada frame).
    railAreaEl.addEventListener("click", (event) => {
      const repairButton = event.target.closest("[data-repair]");
      if (!repairButton || repairButton.disabled) return;
      event.preventDefault();
      ensureAudio();
      dispatchRepair(Number(repairButton.dataset.repair));
    });

    // clicar no próprio trecho quebrado também aciona o conserto pago
    document.querySelectorAll(".segment").forEach(path => {
      path.addEventListener("click", () => {
        const id = Number(path.id.replace("seg-", ""));
        const segment = state.segments.find(s => s.id === id);
        if (segment?.status === "broken") { ensureAudio(); dispatchRepair(id); }
      });
    });

    // primeira interação destrava o áudio em navegadores que exigem gesto
    window.addEventListener("pointerdown", () => ensureAudio(), { once: true });
    window.addEventListener("resize", () => { railLen = 0; computeSegmentMidpoints(); });

    setInterval(() => saveState(false), 10000);

    /* ============================ Inicialização ============================ */
    function init() {
      updateSoundButton();
      buildTrackDecor();
      computeSegmentMidpoints();
      if (!cargoById(state.currentCargoId)) state.currentCargoId = pickCargo().id;
      buildTrain();
      addLog("Operação iniciada. Mantenha o caixa para garantir o fluxo da linha.", "good");
      scheduleNextBreak();
      render();
      requestAnimationFrame(tick);
    }
    init();
