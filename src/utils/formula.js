// Colunas calculadas: colunas novas criadas na tabela completa a partir
// das colunas numéricas (ex.: Densidade = População ÷ Área).
//
// Uma coluna calculada é { nome, formula }, em que formula alterna
// operandos e operações: [operando, op, operando, op, operando, ...]
//   operando: { coluna: 'Área (km²)' } ou { numero: 1000000 }
//   op: '+', '−', '×' ou '÷'
// A conta segue a ordem da matemática: × e ÷ antes de + e −.
//
// Colunas com unidade em milhões ou bilhões no nome entram na conta pelo
// valor inteiro: "População (Milhões)" 215,3 vira 215.300.000 habitantes
// e "PIB (Bilhões de Dolares)" vira dólares. Assim População ÷ Área já
// dá habitantes por km² e PIB ÷ População dá dólares por pessoa, sem o
// aluno precisar converter.

export const OPERACOES = ['+', '−', '×', '÷'];

// Fator de escala de uma coluna pela unidade no nome (1 se não houver)
export function fatorDaColuna(coluna) {
    if (/\(\s*bilh(õ|o)es/i.test(coluna)) return 1e9;
    if (/\(\s*milh(õ|o)es/i.test(coluna)) return 1e6;
    return 1;
}

// Valor de um operando para um país; null se faltar o dado
function valorDe(operando, pais) {
    if ('numero' in operando) return operando.numero;
    const v = pais[operando.coluna];
    return typeof v === 'number' ? v * fatorDaColuna(operando.coluna) : null;
}

// Arredonda como o resto da tabela: 1 casa decimal, e o que não é zero
// mas arredondaria para 0,0 fica 0,1 (ou −0,1)
export function arredondar(v) {
    const r = Math.round(v * 10) / 10;
    if (r === 0 && v !== 0) return v > 0 ? 0.1 : -0.1;
    return r === 0 ? 0 : r; // sem -0
}

// Resultado da fórmula para um país: número (já arredondado) ou null
// quando falta algum dado ou há divisão por zero
export function calcular(formula, pais) {
    // Primeiro × e ÷, juntando em parcelas; depois soma/subtrai as parcelas
    let parcelas = [];
    let sinais = ['+'];
    let atual = valorDe(formula[0], pais);
    for (let i = 1; i < formula.length; i += 2) {
        const op = formula[i];
        const v = valorDe(formula[i + 1], pais);
        if (op === '×' || op === '÷') {
            if (atual === null || v === null) { atual = null; continue; }
            if (op === '÷' && v === 0) { atual = null; continue; }
            atual = op === '×' ? atual * v : atual / v;
        } else {
            parcelas.push(atual);
            sinais.push(op);
            atual = v;
        }
    }
    parcelas.push(atual);
    if (parcelas.some(p => p === null || !Number.isFinite(p))) return null;
    const total = parcelas.reduce((soma, p, i) => sinais[i] === '−' ? soma - p : soma + p, 0);
    return Number.isFinite(total) ? arredondar(total) : null;
}

// Países com as colunas calculadas acrescentadas (na ordem em que foram
// criadas: uma coluna pode usar as anteriores). Devolve objetos novos.
export function aplicarColunas(paises, colunas) {
    if (!colunas.length) return paises;
    return paises.map(pais => {
        const novo = { ...pais };
        for (const { nome, formula } of colunas) {
            novo[nome] = calcular(formula, novo);
        }
        return novo;
    });
}

// Texto da fórmula, para mostrar ao aluno: "População × 1.000.000 ÷ Área"
export function descreverFormula(formula) {
    return formula.map((parte, i) => {
        if (i % 2) return parte;
        return 'numero' in parte ? parte.numero.toLocaleString('pt-BR') : parte.coluna;
    }).join(' ');
}

// Confere uma coluna vinda de um projeto salvo (arquivo do aluno)
export function colunaValida(c) {
    if (!c || typeof c.nome !== 'string' || !c.nome.trim()) return false;
    const f = c.formula;
    if (!Array.isArray(f) || f.length % 2 === 0) return false;
    return f.every((parte, i) => i % 2
        ? OPERACOES.includes(parte)
        : parte && (typeof parte.coluna === 'string' || (typeof parte.numero === 'number' && Number.isFinite(parte.numero))));
}
