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

// Mapeamento reverso: Nome Legível -> Chave (para evidências vindas do banco, caso precise)
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

// (mantive como estava: último ano)
// se quiser ano atual como padrão, me avise que ajusto
filtroAno.value = anosUnicos[anosUnicos.length - 1];

// 2. Popula Filtro ETAPA
Object.keys(etapasMap).forEach(key => {
  filtroEtapa.appendChild(new Option(etapasMap[key], key));
});

// 3. Popula Filtro PARTICIPANTES
const participantesSet = new Set();
dados.forEach(d => {
  if (d.aulas && d.aulas.length > 0) {
    d.aulas.forEach(aula => {
      (aula.participantes || []).forEach(p => participantesSet.add(p.nome));
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
      // Grid = 1 linha por dia. Se houver filtro de etapa, o dia precisa conter essa etapa.
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

        // ===== MARCAÇÕES VISUAIS =====
        // Linha de dia NÃO ÚTIL (FERIADO/RECESSO/OFF etc.) -> tom avermelhado
        if (d.diaUtil === false) tr.classList.add("row-nao-util");

        // Sábado/Domingo -> marcador escuro na coluna de etapa
        const diaTxt = String(d.dia || "").toLowerCase();
        if (
          diaTxt.includes("sáb") || diaTxt.includes("sab") || diaTxt.includes("sábado") ||
          diaTxt.includes("dom") || diaTxt.includes("domingo")
        ) {
          tr.classList.add("row-fds");
        }

        // Etapa exibida: exatamente como vem do calendário (melhor cenário)
        const etapaTextoRaw =
          (typeof d.etapaTexto === "string" && d.etapaTexto.trim() !== "") ? d.etapaTexto.trim() :
          (typeof d.etapa_processo === "string" && d.etapa_processo.trim() !== "") ? d.etapa_processo.trim() :
          (etapasArr.length > 0) ? etapasArr.map(k => etapasMap[k] || k).join(" / ") :
          "";

        const etapaTexto = etapaTextoRaw !== "" ? etapaTextoRaw : "—";

        // Classe visual (mantém CSS existente): usa a primeira etapa normalizada, se existir
        // Se não houver, coloca uma classe fallback
        const etapaCssKey = (etapasArr.length > 0) ? etapasArr[0] : "nao_mapeado";

        // ✅ CLASSES para não ficar "branco" quando não há etapa mapeada/texto vazio
        if (etapasArr.length === 0) tr.classList.add("row-nao-mapeado");
        if (etapaTexto === "—") tr.classList.add("row-sem-etapa");

        // ✅ Status: agora depende de flag do banco (recomendado) OU fica vazio
        // (d.evidencias não é mais usado no calendário)
        const temEvidencia = !!d.temEvidencia;

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

// ================= FUNÇÃO DE CÁLCULO DE KPI =================
function atualizarKPIs(lista) {
  let totalAgendados = 0;
  let totalRealizados = 0;
  let somaPercentuais = 0;
  let contagemComPercentual = 0;
  let totalAlertas = 0;

  lista.forEach(item => {
    const { d, isAlerta } = item;

    if (d.agendados > 0) {
      totalAgendados += d.agendados;
      totalRealizados += d.realizados;

      const pct = (d.realizados / d.agendados) * 100;
      somaPercentuais += pct;
      contagemComPercentual++;
    }

    if (isAlerta) totalAlertas++;
  });

  const mediaAderencia = contagemComPercentual > 0
    ? Math.round(somaPercentuais / contagemComPercentual)
    : 0;

  document.getElementById("kpiVolume").textContent = `${totalRealizados} / ${totalAgendados}`;

  const elAderencia = document.getElementById("kpiAderencia");
  elAderencia.textContent = `${mediaAderencia}%`;
  elAderencia.style.color = mediaAderencia < 80 ? "#dc2626" : "#111";

  const elAlertas = document.getElementById("kpiAlertas");
  elAlertas.textContent = totalAlertas;
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

    // limpa/volta detalhe
    preencherEvidencias([]);
  } else {
    // SELECT
    trClicada.classList.add('selected');
    carregarDetalhesFocados(dadosDia, etapaKey);

    // ✅ busca evidências do banco pelo dia clicado
    carregarEvidenciasDoDia(dadosDia);
  }
}

// ================= ESTADOS DE EXIBIÇÃO =================

// ESTADO 1: FOCADO (Linha selecionada)
function carregarDetalhesFocados(d, etapaFocada) {
  let aulasParaExibir = (d.aulas || []);

  if (filtroParticipante.value !== "") {
    aulasParaExibir = aulasParaExibir.filter(a =>
      a.participantes && a.participantes.some(p => p.nome === filtroParticipante.value)
    );
  }

  const aulasComData = aulasParaExibir.map(a => ({ ...a, data: d.data }));
  preencherListaAulas(aulasComData);

  // ✅ Evidências agora vêm do banco (RPC) no clique (carregarEvidenciasDoDia)
}

// ESTADO 2: VISÃO GERAL (Nenhuma linha selecionada)
function carregarVisaoGeral(listaDadosVisiveis) {
  participantesDiv.innerHTML = "<div style='padding:12px; color:#9ca3af; text-align:center; font-style:italic;'>Selecione um curso acima para ver participantes</div>";

  let todasAulas = [];
  const partSel = filtroParticipante.value;

  listaDadosVisiveis.forEach(item => {
    const { d } = item;

    // Acumula Aulas
    if (d.aulas && d.aulas.length > 0) {
      d.aulas.forEach(aula => {
        if (partSel !== "") {
          const hasP = (aula.participantes || []).some(p => p.nome === partSel);
          if (!hasP) return;
        }
        todasAulas.push({ ...aula, data: d.data });
      });
    }
  });

  // Ordena
  todasAulas.sort((a, b) => {
    const dataA = a.data.split('/').reverse().join('');
    const dataB = b.data.split('/').reverse().join('');
    return dataA.localeCompare(dataB);
  });

  preencherListaAulas(todasAulas);

  // ✅ detalhe de evidências na visão geral fica vazio (carrega sob demanda no clique)
  preencherEvidencias([]);
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

  const participantesOrdenados = [...(aula.participantes || [])].sort((a, b) => a.nome.localeCompare(b.nome));

  participantesOrdenados.forEach(p => {
    const isFilteredPerson = filtroParticipante.value === p.nome;
    const highlightStyle = isFilteredPerson ? "background: #fef9c3; font-weight:bold;" : "";

    const div = document.createElement("div");
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

// ✅ Preenche tabela de evidências (retorno do RPC monitoramento_detalhe)
function preencherEvidencias(lista) {
  const tbody = document.getElementById("evidencias");
  if (!tbody) return;

  if (!Array.isArray(lista) || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="padding:16px; color:#6b7280;">
          Nenhuma evidência encontrada.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(ev => `
    <tr>
      <td>${ev.origem ?? ""}</td>
      <td>${ev.data ?? ""}</td>
      <td>${ev.etapa ?? ""}</td>
      <td>${ev.evidencia ?? ""}</td>
      <td class="text-center">
        ${ev.url ? `<a href="${ev.url}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-link"></i></a>` : ""}
      </td>
    </tr>
  `).join("");
}

async function carregarEvidenciasDoDia(dadosDia) {
  try {
    const [dd, mm, yyyy] = String(dadosDia.data).split("/");
    const dataISO = `${yyyy}-${mm}-${dd}`;

    const tbody = document.getElementById("evidencias");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center" style="padding:16px; color:#6b7280;">
            Carregando evidências...
          </td>
        </tr>
      `;
    }

    const lista = await window.DBHandler.carregarDetalheMonitoramento(dataISO);
    preencherEvidencias(lista);
  } catch (err) {
    console.error("Erro ao carregar evidências do dia:", err);
    const tbody = document.getElementById("evidencias");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center" style="padding:16px; color:#dc2626;">
            Erro ao carregar evidências. Verifique o console.
          </td>
        </tr>
      `;
    }
  }
}


function openEvidenciaModal(payload) {
  const overlay = document.getElementById("evidenciaModalOverlay");
  if (!overlay) return;

  // Preenche campos
  const dataISO = payload?.data_calendario ?? "";
  const dataBR = dataISO ? dataISO.split("-").reverse().join("/") : (payload?.data ?? "");

  document.getElementById("ev_data").textContent = dataBR || "—";
  document.getElementById("ev_dia").textContent = payload?.dia_semana ?? "—";
  document.getElementById("ev_tipo").textContent = payload?.tipo_dia ?? "—";
  document.getElementById("ev_etapa").textContent = payload?.etapa_processo ?? "—";

  const avaliacao = payload?.avaliacao_monitoria ?? "Sem dados de monitoria para exibir.";
  document.getElementById("ev_avaliacao").textContent = avaliacao;

  const log = payload?.log_autenticacao_automatica ?? "Sem log automático.";
  document.getElementById("ev_log").textContent = log;

  const sub = `Data de referência: ${dataBR || "—"} • Origem: Edesoft Academy • Registro: Automático`;
  const subEl = document.getElementById("evidenciaSubTitle");
  if (subEl) subEl.textContent = sub;

  // Abre
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");

  // trava scroll do fundo
  document.documentElement.style.overflow = "hidden";
}

function closeEvidenciaModal() {
  const overlay = document.getElementById("evidenciaModalOverlay");
  if (!overlay) return;
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  document.documentElement.style.overflow = "";
}

function bindEvidenciaModalEvents() {
  const overlay = document.getElementById("evidenciaModalOverlay");
  const btnClose = document.getElementById("btnEvidenciaFechar");
  const btnPrint = document.getElementById("btnEvidenciaImprimir");

  if (btnClose) btnClose.onclick = closeEvidenciaModal;
  if (btnPrint) btnPrint.onclick = () => window.print();

  // Clique fora fecha
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeEvidenciaModal();
    });
  }

  // ESC fecha
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeEvidenciaModal();
  });
}

// Chame uma vez na inicialização
bindEvidenciaModalEvents();





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

