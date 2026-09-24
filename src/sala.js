// Sala de aula: regionalização a partir das respostas de um Google Forms.
// O professor cola o link da planilha de respostas (compartilhada como
// "qualquer pessoa com o link"). A sala tem seis regiões, três fileiras
// (frente, centro, fundo) por dois lados (esquerda, direita), e cada
// região é uma linha da tabela, como um país: quantos alunos sentam nela
// e, para cada pergunta numérica do formulário, o total e a média das
// respostas desses alunos. O mapa é o desenho da sala (src/assets/svg/
// sala.svg) com um retângulo por região acrescentado por cima.
//
// Para reaproveitar a tabela, os blocos e o mapa dos continentes, cada
// região usa a chave 'País' como nome ("Frente esquerda"), e o "código
// ISO" dela é o id do retângulo no SVG (frente-esquerda...).

// Nome da região na chave 'País' (veja o comentário do topo)
export const CHAVE_NOME = 'País';
export const COLUNA_QUANTIDADE = 'Quantidade de alunos';

// Colunas do formulário que ficam de fora: data/hora da resposta e o que
// identifica o aluno (a regionalização é anônima)
const COLUNA_OCULTA = /carimbo|timestamp|data\/hora|e-?mail|^nome|^seu nome|^name/;

// Fileiras (da lousa para o fundo) e lados. Os termos reconhecem as
// respostas mais comuns ("Na frente", "Meio", "Atrás"...), sem acento e
// sem diferenciar maiúsculas
const FILEIRAS = [
    { id: 'frente', nome: 'Frente', termos: ['frente'] },
    { id: 'centro', nome: 'Centro', termos: ['centro', 'central', 'meio'] },
    { id: 'fundo', nome: 'Fundo', termos: ['fundo', 'tras'] }
];
const LADOS = [
    { id: 'esquerda', nome: 'esquerda', termos: ['esquerd'] },
    { id: 'direita', nome: 'direita', termos: ['direit'] }
];

// As seis regiões, na ordem da tabela e do laço (fileira por fileira)
export const REGIOES_SALA = FILEIRAS.flatMap(fileira => LADOS.map(lado => ({
    id: `${fileira.id}-${lado.id}`,
    nome: `${fileira.nome} ${lado.nome}`,
    fileira,
    lado
})));

function normalizar(texto) {
    return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const acharTermo = (lista, texto) => lista.find(item => item.termos.some(t => texto.includes(t))) || null;

// Nome da região -> id do retângulo dela no mapa (o "código ISO")
export function isoDasRegioes() {
    return Object.fromEntries(REGIOES_SALA.map(r => [r.nome, r.id]));
}

// Endereços CSV de uma planilha do Google, a tentar em ordem. Aceita o
// link de edição/compartilhamento (/spreadsheets/d/<id>/edit#gid=...)
// e o de "Publicar na Web" (/spreadsheets/d/e/<id>/pub...). O export dá
// os valores como aparecem na planilha; o gviz é a reserva (converte
// tipos por coluna e pode perder respostas de tipo misturado).
export function enderecosCsv(link) {
    const texto = String(link || '').trim();
    const gid = (texto.match(/[#?&]gid=(\d+)/) || [])[1];
    const publicada = texto.match(/\/spreadsheets\/d\/e\/([\w-]+)/);
    if (publicada) {
        return [`https://docs.google.com/spreadsheets/d/e/${publicada[1]}/pub?output=csv${gid ? `&gid=${gid}` : ''}`];
    }
    const id = (texto.match(/\/spreadsheets\/d\/([\w-]+)/) || [])[1];
    if (!id) return [];
    const aba = gid ? `&gid=${gid}` : '';
    return [
        `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${aba}`,
        `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${aba}`
    ];
}

// Baixa o CSV da planilha (sem cache: "Atualizar respostas" precisa das
// respostas novas). Lança Error com uma mensagem para o professor.
export async function baixarCsvDaPlanilha(link) {
    const enderecos = enderecosCsv(link);
    if (!enderecos.length) {
        throw new Error('Este link não parece ser de uma planilha do Google. Copie o endereço da planilha de respostas (docs.google.com/spreadsheets/...).');
    }
    for (const endereco of enderecos) {
        try {
            const resposta = await fetch(endereco, { cache: 'no-store' });
            if (!resposta.ok) continue;
            const texto = await resposta.text();
            // Planilha privada: o Google devolve a página de login
            if (/^\s*<(!doctype|html)/i.test(texto)) continue;
            return texto;
        } catch (erro) {
            // Planilha privada costuma dar erro de CORS: tenta o próximo
        }
    }
    throw new Error('Não foi possível ler a planilha. Confira o link e se ela está compartilhada como "Qualquer pessoa com o link".');
}

// CSV -> linhas (listas de células). Aceita aspas (com vírgulas, quebras
// de linha e "" dentro) e detecta o separador: vírgula (Google) ou
// ponto e vírgula (Excel em português).
export function lerCsv(texto) {
    texto = String(texto).replace(/^﻿/, '');
    const primeiraLinha = texto.split(/\r?\n/, 1)[0];
    const contar = (c) => primeiraLinha.replace(/"[^"]*"/g, '').split(c).length;
    const separador = contar(';') > contar(',') ? ';' : ',';

    const linhas = [];
    let linha = [], celula = '', entreAspas = false;
    for (let i = 0; i < texto.length; i++) {
        const c = texto[i];
        if (entreAspas) {
            if (c === '"' && texto[i + 1] === '"') { celula += '"'; i++; }
            else if (c === '"') entreAspas = false;
            else celula += c;
        } else if (c === '"') {
            entreAspas = true;
        } else if (c === separador) {
            linha.push(celula); celula = '';
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && texto[i + 1] === '\n') i++;
            linha.push(celula); linhas.push(linha);
            linha = []; celula = '';
        } else {
            celula += c;
        }
    }
    if (celula || linha.length) { linha.push(celula); linhas.push(linha); }
    // Linhas totalmente vazias (fim do arquivo, linhas apagadas)
    return linhas.filter(l => l.some(c => c.trim()));
}

// Linhas do CSV -> {cabecalho, respostas}, sem as colunas ocultas (data,
// nome, e-mail). É o que a sala guarda (e o projeto baixado leva), então
// nada que identifique o aluno sai daqui.
export function limparRespostas(linhas) {
    const [cabecalho = [], ...respostas] = linhas;
    const manter = cabecalho
        .map((nome, i) => ({ nome: nome.trim(), i }))
        .filter(c => c.nome && !COLUNA_OCULTA.test(normalizar(c.nome)));
    return {
        cabecalho: manter.map(c => c.nome),
        respostas: respostas.map(r => manter.map(c => (r[c.i] ?? '').trim()))
    };
}

// Texto -> número, ou null se não for número. Formato brasileiro
// ("2.780.400", "0,788") e também "3.5" (ponto decimal)
function paraNumero(texto) {
    const t = texto.trim();
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
    if (/^-?\d+(,\d+)?$/.test(t)) return Number(t.replace(',', '.'));
    if (/^-?\d*\.\d+$/.test(t)) return Number(t);
    return null;
}

// Perguntas que podem dizer onde o aluno senta: as de grade (o Forms grava
// uma coluna por linha da grade, "Pergunta [Linha]") e as colunas simples
// de texto. Cada uma: {nome, colunas: [{indice, rotulo}]}; nas simples o
// rótulo é vazio.
export function perguntasDaTabela({ cabecalho }) {
    const perguntas = [];
    cabecalho.forEach((titulo, indice) => {
        const grade = titulo.match(/^(.*\S)\s*\[(.+)\]$/);
        const nome = grade ? grade[1] : titulo;
        let pergunta = perguntas.find(p => p.nome === nome && grade && p.grade);
        if (!pergunta) {
            pergunta = { nome, grade: !!grade, colunas: [] };
            perguntas.push(pergunta);
        }
        pergunta.colunas.push({ indice, rotulo: grade ? grade[2] : '' });
    });
    return perguntas;
}

// Posição de uma resposta numa pergunta: {regiao, varias} ou null.
// Grade: a linha marcada dá a fileira e o valor dela dá o lado. Coluna
// simples: fileira e lado vêm do texto ("Frente esquerda"). Se o aluno
// marcou mais de um lugar vale o primeiro, e varias fica true.
function posicaoDaResposta(resposta, pergunta) {
    const marcadas = [];
    for (const { indice, rotulo } of pergunta.colunas) {
        const valor = resposta[indice] || '';
        if (!valor) continue;
        // Grade de caixas de seleção: "Esquerda;Direita" ou "Esquerda, Direita".
        // Na coluna simples o texto vai inteiro ("Frente, esquerda")
        const partes = rotulo ? valor.split(/[;,]/) : [valor];
        for (const parte of partes.map(normalizar).filter(Boolean)) {
            const texto = `${normalizar(rotulo)} ${parte}`;
            const fileira = acharTermo(FILEIRAS, texto);
            const lado = acharTermo(LADOS, texto);
            if (fileira && lado) marcadas.push(REGIOES_SALA.find(r => r.fileira === fileira && r.lado === lado));
        }
    }
    if (!marcadas.length) return null;
    return { regiao: marcadas[0], varias: new Set(marcadas).size > 1 };
}

// Pergunta com a posição na sala: a que mais respostas conseguem ser
// lidas como uma região; no empate, a que fala de sentar/posição.
// null se nenhuma chega a metade das respostas.
export function detectarPerguntaPosicao(tabela) {
    let melhor = null, melhorPontos = 0;
    for (const pergunta of perguntasDaTabela(tabela)) {
        const lidas = tabela.respostas.filter(r => posicaoDaResposta(r, pergunta)).length;
        const fracao = tabela.respostas.length ? lidas / tabela.respostas.length : 0;
        const pontos = fracao + (/sentad|posicao|lugar|onde/.test(normalizar(pergunta.nome)) ? 0.01 : 0);
        if (fracao >= 0.5 && pontos > melhorPontos) {
            melhor = pergunta.nome;
            melhorPontos = pontos;
        }
    }
    return melhor;
}

// Tabela das regiões: uma linha por região (todas as seis, mesmo vazias)
// com a quantidade de alunos e, para cada pergunta numérica (todas as
// respostas preenchidas são números), o total e a média. Devolve também
// os avisos para a configuração: quantos marcaram mais de um lugar e
// quantos não têm posição (esses ficam fora das regiões).
export function montarRegioes(tabela, nomePergunta) {
    const perguntas = perguntasDaTabela(tabela);
    const pergunta = perguntas.find(p => p.nome === nomePergunta) || null;

    const numericas = perguntas.filter(p => p !== pergunta && !p.grade).filter(p => {
        const valores = tabela.respostas.map(r => r[p.colunas[0].indice]).filter(Boolean);
        return valores.length && valores.every(v => paraNumero(v) !== null);
    });

    const alunosPorRegiao = new Map(REGIOES_SALA.map(r => [r, []]));
    let varias = 0, semPosicao = 0;
    for (const resposta of tabela.respostas) {
        const posicao = pergunta && posicaoDaResposta(resposta, pergunta);
        if (!posicao) { semPosicao++; continue; }
        if (posicao.varias) varias++;
        alunosPorRegiao.get(posicao.regiao).push(resposta);
    }

    const regioes = REGIOES_SALA.map(regiao => {
        const alunos = alunosPorRegiao.get(regiao);
        const linha = { [CHAVE_NOME]: regiao.nome, [COLUNA_QUANTIDADE]: alunos.length };
        for (const p of numericas) {
            const valores = alunos.map(r => paraNumero(r[p.colunas[0].indice] || '')).filter(v => v !== null);
            const total = valores.reduce((a, b) => a + b, 0);
            linha[`${p.nome} (total)`] = total;
            // Média com uma casa; sem respostas, fica vazia (-)
            linha[`${p.nome} (média)`] = valores.length ? Math.round(total / valores.length * 10) / 10 : null;
        }
        return linha;
    });
    const medias = numericas.map(p => `${p.nome} (média)`);
    return { regioes, medias, avisos: { varias, semPosicao } };
}

// Retângulos das regiões sobre o desenho da sala (src/assets/svg/sala.svg,
// em mm: 6 fileiras x 6 colunas de carteiras). Cada região cobre duas
// fileiras e três colunas, com uma folga em volta das carteiras (da mesa
// até a cadeira). Coordenadas medidas no desenho.
const COLUNAS_REGIAO = { esquerda: [16, 103.6], direita: [106.4, 194] };
const FILEIRAS_REGIAO = { frente: [93.3, 147.9], centro: [151.9, 206.5], fundo: [210.5, 265.1] };
const ARREDONDAMENTO = 4;
const COR_REGIAO = '#d9d9d9';

// Cinza claro das regiões ainda não pintadas: as carteiras (traço preto)
// continuam visíveis por cima
export const COR_PADRAO_SALA = COR_REGIAO;

// Acrescenta as seis regiões ao desenho da sala (prepararMapa da sala em
// src/continentes.js): retângulos de borda arredondada ATRÁS do desenho,
// para as carteiras aparecerem por cima da cor, e o nome de cada região
// por cima de tudo. O id do retângulo é o "código ISO" da região: o
// MapaPanel pinta como pinta os países. O desenho não recebe o mouse,
// então o tooltip e o clique pegam a região embaixo.
export function adicionarRegioesSala(svg) {
    if (svg.querySelector('.sala-regiao')) return;
    const NS = 'http://www.w3.org/2000/svg';
    for (const filho of svg.children) filho.style.pointerEvents = 'none';

    const regioes = document.createElementNS(NS, 'g');
    const nomes = document.createElementNS(NS, 'g');
    nomes.setAttribute('pointer-events', 'none');
    for (const regiao of REGIOES_SALA) {
        const [x1, x2] = COLUNAS_REGIAO[regiao.lado.id];
        const [y1, y2] = FILEIRAS_REGIAO[regiao.fileira.id];
        const rect = document.createElementNS(NS, 'rect');
        Object.entries({
            id: regiao.id, class: 'sala-regiao', x: x1, y: y1, width: x2 - x1, height: y2 - y1,
            rx: ARREDONDAMENTO, ry: ARREDONDAMENTO, fill: COR_REGIAO, stroke: 'none'
        }).forEach(([k, v]) => rect.setAttribute(k, v));
        regioes.appendChild(rect);

        // Contorno branco no texto: legível sobre as carteiras e qualquer cor
        const texto = document.createElementNS(NS, 'text');
        Object.entries({
            x: (x1 + x2) / 2, y: (y1 + y2) / 2 + 2.5, 'text-anchor': 'middle',
            'font-size': 7, 'font-weight': 700, 'font-family': 'sans-serif',
            fill: '#2C2C2C', stroke: '#ffffff', 'stroke-width': 1.6, 'paint-order': 'stroke'
        }).forEach(([k, v]) => texto.setAttribute(k, v));
        texto.textContent = regiao.nome;
        nomes.appendChild(texto);
    }
    svg.insertBefore(regioes, svg.firstChild);
    svg.appendChild(nomes);
}
