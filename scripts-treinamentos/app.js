const grid = document.getElementById("gridPrincipal");
const aulasDiv = document.getElementById("aulas");
const participantesDiv = document.getElementById("participantes");
const evidenciasDiv = document.getElementById("evidencias");

const filtroAno = document.getElementById("filtroAno");
const filtroEtapa = document.getElementById("filtroEtapa");
const filtroParticipante = document.getElementById("filtroParticipante");

// Mapeamento: Chave (CSS) -> Nome Legível (Tela)
const etapasMap = {
  levantar: "Levantar Necessidades",
  plano: "Plano Estratégico",
  preparar: "Preparar Treinamento",
  prover: "Prover Treinamento",
  obter: "Obter Resultado",
  monitorar: "Monitorar"
};


// Mapeamento reverso: Nome Legível -> Chave (para evidências vindas do banco)
const etapasReverseMap = Object.fromEntries(
  Object.entries(etapasMap).map(([k, v]) => [v, k])
);

function inferEtapaKeyFromNome(nomeEtapa) {
  return etapasReverseMap[nomeEtapa] || null;
}

// ================= INICIALIZAÇÃO =================

// 1. Popula Filtro ANO
const anosUnicos = [...new Set(dados.map(d => d.ano))].sort();
anosUnicos.forEach(ano => {
  filtroAno.appendChild(new Option(ano, ano));
});
filtroAno.value = anosUnicos[anosUnicos.length - 1]; // Seleciona último ano

// 2. Popula Filtro ETAPA
Object.keys(etapasMap).forEach(key => {
  filtroEtapa.appendChild(new Option(etapasMap[key], key));
});

// 3. Popula Filtro PARTICIPANTES (Novo)
const participantesSet = new Set();
dados.forEach(d => {
    if (d.aulas && d.aulas.length > 0) {
        d.aulas.forEach(aula => {
            aula.participantes.forEach(p => participantesSet.add(p.nome));
        });
    }
});
[...participantesSet].sort().forEach(nome => {
    filtroParticipante.appendChild(new Option(nome, nome));
});


// ================= RENDERIZAÇÃO =================

function renderGrid() {
  grid.innerHTML = "";

  // Captura valor dos filtros
  const anoSel = filtroAno.value;
  const etapaSel = filtroEtapa.value;          // chave: levantar/plano/preparar/prover/obter/monitorar
  const partSel = filtroParticipante.value;    // nome do participante

  // Array para acumular os dados visíveis e gerar KPIs/visão geral
  let dadosVisiveis = [];

  dados
    .filter(d => d.ano == anoSel)
    .forEach(d => {
      let mostrarLinha = true;

      const etapasArr = Array.isArray(d.etapas) ? d.etapas : [];

      // --- FILTRO POR ETAPA ---
      // Agora a grid é 1 linha por dia. Se houver filtro de etapa, o dia precisa conter essa etapa.
      if (etapaSel !== "") {
        if (!etapasArr.includes(etapaSel)) mostrarLinha = false;
      }

      // --- FILTRO POR PARTICIPANTE ---
      // Só faz sentido quando o dia tem etapa "prover" e o participante está em alguma aula do dia.
      if (partSel !== "") {
        if (!etapasArr.includes("prover")) {
          mostrarLinha = false;
        } else {
          const estaNasAulas = d.aulas && d.aulas.some(a =>
            a.participantes && a.participantes.some(p => p.nome === partSel)
          );
          if (!estaNasAulas) mostrarLinha = false;
        }
      }

      if (mostrarLinha) {
        dadosVisiveis.push({
          d,
          isAlerta: (d.agendados > 0 && (d.realizados / d.agendados) < 0.8)
        });

        const tr = document.createElement("tr");
        tr.onclick = () => alternarSelecao(tr, d, null, dadosVisiveis);

        // Etapa exibida: exatamente como vem do calendário (melhor cenário)
        const etapaTextoRaw =
          (typeof d.etapaTexto === "string" && d.etapaTexto.trim() !== "") ? d.etapaTexto.trim() :
          (typeof d.etapa_processo === "string" && d.etapa_processo.trim() !== "") ? d.etapa_processo.trim() :
          (etapasArr.length > 0) ? etapasArr.map(k => etapasMap[k] || k).join(" / ") :
          "";

        const etapaTexto = etapaTextoRaw !== "" ? etapaTextoRaw : "—";

        // Classe visual (mantém CSS existente): usa a primeira etapa normalizada, se existir
        // Se não houver, coloca uma classe fallback para não ficar "sem classe"
        const etapaCssKey = (etapasArr.length > 0) ? etapasArr[0] : "nao_mapeado";

        // ✅ CLASSES para não ficar "branco" quando não há etapa mapeada/texto vazio
        if (etapasArr.length === 0) tr.classList.add("row-nao-mapeado");
        if (etapaTexto === "—") tr.classList.add("row-sem-etapa");

        // Evidência (se houver). Quando não há etapa focada, basta indicar se existe evidência no dia
        const temEvidencia = Array.isArray(d.evidencias) && d.evidencias.length > 0;

        // Aderência
        let aderenciaHtml = "—";
        if (d.agendados > 0) {
          const pct = Math.round((d.realizados / d.agendados) * 100);
          if (pct >= 100) aderenciaHtml = `<span style="color:#16a34a; font-weight:700;">${pct}%</span>`;
          else if (pct >= 80) aderenciaHtml = `<span style="color:#d97706; font-weight:700;">${pct}%</span>`;
          else aderenciaHtml = `<span style="color:#dc2626; font-weight:700;">${pct}%</span>`;
        }

        tr.innerHTML = `
          <td>${d.data}</td>
          <td>${d.dia}</td>
          <td><span class="etapa ${etapaCssKey}">${etapaTexto}</span></td>
          <td class="text-center">${d.agendados ? d.agendados : "—"}</td>
          <td class="text-center">${d.realizados ? d.realizados : "—"}</td>
          <td class="text-center">${aderenciaHtml}</td>
          <td class="text-center">${temEvidencia ? '<i class="fa-solid fa-check" style="color:green"></i>' : ''}</td>
        `;

        grid.appendChild(tr);
      }
    });

  atualizarKPIs(dadosVisiveis);
  carregarVisaoGeral(dadosVisiveis);
}




// ================= FUNÇÃO DE CÁLCULO DE KPI (NOVA) =================
function atualizarKPIs(lista) {
    // 1. Volume (Agendados vs Realizados)
    // Somamos apenas das linhas visíveis. 
    // Nota: Se um dia tem 2 etapas, os "agendados" do dia contam 2x? 
    // Na lógica atual do data.js, agendados é por dia/registro. 
    // Para evitar duplicidade se mostrarmos várias etapas do mesmo dia, 
    // o ideal seria somar agendados apenas uma vez por 'd' único, 
    // mas como o grid mostra linhas de processo, somar o total de "esforço" (linhas) faz sentido.
    
    let totalAgendados = 0;
    let totalRealizados = 0;
    let somaPercentuais = 0;
    let contagemComPercentual = 0;
    let totalAlertas = 0;

    lista.forEach(item => {
        const { d, isAlerta } = item;
        
        // Só somamos se houver agendamento > 0 (ignora etapas puramente burocráticas sem pessoas)
        if (d.agendados > 0) {
            totalAgendados += d.agendados;
            totalRealizados += d.realizados;
            
            // Para média de aderência
            const pct = (d.realizados / d.agendados) * 100;
            somaPercentuais += pct;
            contagemComPercentual++;
        }

        if (isAlerta) {
            totalAlertas++;
        }
    });

    // 2. Aderência Média
    // Evita divisão por zero
    const mediaAderencia = contagemComPercentual > 0 
        ? Math.round(somaPercentuais / contagemComPercentual) 
        : 0;

    // --- ATUALIZAÇÃO DO DOM ---
    
    // Card 1: Volume
    document.getElementById("kpiVolume").textContent = `${totalRealizados} / ${totalAgendados}`;
    
    // Card 2: Aderência (Muda cor se for muito baixa)
    const elAderencia = document.getElementById("kpiAderencia");
    elAderencia.textContent = `${mediaAderencia}%`;
    elAderencia.style.color = mediaAderencia < 80 ? "#dc2626" : "#111"; // Vermelho se média ruim

    // Card 3: Alertas
    const elAlertas = document.getElementById("kpiAlertas");
    elAlertas.textContent = totalAlertas;
    // Se tiver alertas, destaca o número em vermelho
    elAlertas.style.color = totalAlertas > 0 ? "#dc2626" : "#111";
}



// ================= LÓGICA DE SELEÇÃO (TOGGLE) =================

function alternarSelecao(trClicada, dadosDia, etapaKey, todosDadosVisiveis) {
  const jaEstavaSelecionada = trClicada.classList.contains('selected');

  document.querySelectorAll('#gridPrincipal tr').forEach(tr => {
    tr.classList.remove('selected');
  });

  if (jaEstavaSelecionada) {
    // DESELECT
    carregarVisaoGeral(todosDadosVisiveis);
  } else {
    // SELECT
    trClicada.classList.add('selected');
    carregarDetalhesFocados(dadosDia, etapaKey);
  }
}

// ================= ESTADOS DE EXIBIÇÃO =================

// ESTADO 1: FOCADO (Linha selecionada)
function carregarDetalhesFocados(d, etapaFocada) {
  // Filtra as aulas se houver participante selecionado
  let aulasParaExibir = (d.aulas || []);

  if (filtroParticipante.value !== "") {
    aulasParaExibir = aulasParaExibir.filter(a =>
      a.participantes && a.participantes.some(p => p.nome === filtroParticipante.value)
    );
  }

  const aulasComData = aulasParaExibir.map(a => ({ ...a, data: d.data }));
  preencherListaAulas(aulasComData);

  // Evidências
  let evidencias = (d.evidencias || []);

  // Se houver filtro de etapa (ou etapa focada), filtra evidências por essa etapa
  const etapaSel = filtroEtapa.value;
  const etapaParaFiltrar = etapaFocada || (etapaSel !== "" ? etapaSel : null);

  if (etapaParaFiltrar) {
    const nomeEtapa = etapasMap[etapaParaFiltrar];
    evidencias = evidencias.filter(e => {
      if (e.etapaKey) return e.etapaKey === etapaParaFiltrar;
      if (e.etapa) return e.etapa === nomeEtapa;
      return false;
    });
  }

  const evidenciasComData = evidencias.map(e => ({
    ...e,
    data: d.data,
    etapaKey: e.etapaKey || inferEtapaKeyFromNome(e.etapa) || etapaParaFiltrar || ""
  }));

  preencherGridEvidencias(evidenciasComData);
}



// ESTADO 2: VISÃO GERAL (Nenhuma linha selecionada)
function carregarVisaoGeral(listaDadosVisiveis) {
  participantesDiv.innerHTML = "<div style='padding:12px; color:#9ca3af; text-align:center; font-style:italic;'>Selecione um curso acima para ver participantes</div>";

  let todasAulas = [];
  let todasEvidencias = [];
  const partSel = filtroParticipante.value;

  listaDadosVisiveis.forEach(item => {
    const { d, etapaKey } = item;
    
    // Acumula Aulas
    if (d.aulas && d.aulas.length > 0) {
      d.aulas.forEach(aula => {
         // SE tiver filtro de participante, só adiciona as aulas desse participante
         if (partSel !== "") {
             const hasP = aula.participantes.some(p => p.nome === partSel);
             if (!hasP) return; // Pula esta aula
         }

         todasAulas.push({ ...aula, data: d.data });
      });
    }

    // Acumula Evidências
    const nomeEtapa = etapasMap[etapaKey];
    const evsDoDia = d.evidencias.filter(e => e.etapa === nomeEtapa);
    evsDoDia.forEach(e => {
        todasEvidencias.push({ ...e, data: d.data, etapaKey: etapaKey });
    });
  });

  // Ordena
  todasAulas.sort((a, b) => {
      const dataA = a.data.split('/').reverse().join('');
      const dataB = b.data.split('/').reverse().join('');
      return dataA.localeCompare(dataB);
  });

  preencherListaAulas(todasAulas);
  preencherGridEvidencias(todasEvidencias);
}

// ================= FUNÇÕES AUXILIARES DE HTML =================

function preencherListaAulas(listaAulas) {
  aulasDiv.innerHTML = "";
  
  if (listaAulas.length === 0) {
    aulasDiv.innerHTML = "<div style='padding:10px; color:#999;'>Nenhum curso encontrado.</div>";
    return;
  }

  const nomesVistos = new Set();
  const aulasUnicas = [];
  
  listaAulas.forEach(aula => {
      const uniqueKey = `${aula.data}-${aula.nome}`;
      if (!nomesVistos.has(uniqueKey)) {
          nomesVistos.add(uniqueKey);
          aulasUnicas.push(aula);
      }
  });

  aulasUnicas.forEach(a => {
    const div = document.createElement("div");
    div.dataset.id = `${a.data}-${a.nome}`;

    div.innerHTML = `
        <span class="aula-data">${a.data}</span>
        <span class="aula-nome">${a.nome}</span>
    `;
    
    div.onclick = () => {
        Array.from(aulasDiv.children).forEach(child => child.classList.remove('selected'));
        div.classList.add('selected');
        selecionarAula(a);
    };
    
    aulasDiv.appendChild(div);
  });
}

function preencherGridEvidencias(listaEvidencias) {
  evidenciasDiv.innerHTML = "";

  if (listaEvidencias.length === 0) {
     evidenciasDiv.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#999; padding: 12px;">Nenhuma evidência encontrada.</td></tr>`;
     return;
  }

  listaEvidencias.slice(0, 100).forEach(e => {
    evidenciasDiv.innerHTML += `
        <tr>
            <td>${e.origem}</td>
            <td>${e.data}</td>
            <td><span class="etapa ${e.etapaKey}" style="font-size:10px;">${e.etapa}</span></td>
            <td>${e.descricao}</td>
            <td class="text-center"><i class="fa-solid fa-link" style="color:#2563eb; cursor:pointer;"></i></td>
        </tr>`;
  });
}

function selecionarAula(aula) {
  participantesDiv.innerHTML = "";
  
  const header = document.createElement("div");
  header.style.padding = "10px 12px";
  header.style.fontWeight = "bold";
  header.style.background = "#eff6ff";
  header.style.borderBottom = "1px solid #dbeafe";
  header.style.color = "#1E3A8A";
  header.innerHTML = `${aula.nome} <span style="font-weight:400; font-size:11px; color:#666; margin-left:8px;">(${aula.data})</span>`;
  participantesDiv.appendChild(header);

  // === ALTERAÇÃO AQUI: Ordenação Alfabética ===
  // Criamos uma cópia ([...]) para não alterar o original e ordenamos pelo nome
  const participantesOrdenados = [...aula.participantes].sort((a, b) => {
      return a.nome.localeCompare(b.nome);
  });

  participantesOrdenados.forEach(p => {
    
    // Lógica de destaque do filtro (mantida do código anterior)
    const isFilteredPerson = filtroParticipante.value === p.nome;
    const highlightStyle = isFilteredPerson ? "background: #fef9c3; font-weight:bold;" : "";

    const div = document.createElement("div");
    // Aplicamos o estilo highlightStyle se necessário
    div.style.cssText = `display:flex; justify-content:space-between; align-items:center; padding: 8px 12px; border-bottom: 1px solid #f3f4f6; ${highlightStyle}`;
    
    div.innerHTML = `
        <span style="color:${isFilteredPerson ? '#000' : '#374151'}; font-size: 12px;">${p.nome}</span>
        ${p.participou 
            ? '<i class="fa-solid fa-check" style="color:#16a34a;"></i>' 
            : '<i class="fa-solid fa-xmark" style="color:#dc2626;"></i>'}
    `;
    participantesDiv.appendChild(div);
  });
}
// ================= EVENTOS =================

document.getElementById("btnLimpar").onclick = () => {
  filtroEtapa.value = "";
  filtroParticipante.value = "";
  filtroAno.value = anosUnicos[anosUnicos.length - 1];
  renderGrid();
};

filtroAno.onchange = renderGrid;
filtroEtapa.onchange = renderGrid;
filtroParticipante.onchange = renderGrid;

// Inicializa
renderGrid();

