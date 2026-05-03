// SCRIPT: Atualiza dashboards de mídia e leads
// TIPO: Google Apps Script (Google Sheets)
// FUNÇÃO: Puxa dados de mídia e leads de planilhas de origem e cola
//         nas abas de destino (Mês Atual, Mês Passado, Mês Retrasado, Ano Passado)
// COMO USAR: Preencha os IDs das planilhas de origem e os nomes das abas antes de rodar
// ACESSO: Menu "ATUALIZAR DADOS" → "Rodar Atualização Agora"

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('ATUALIZAR DADOS')
      .addItem('Rodar Atualização Agora', 'atualizarTodosOsDashboards')
      .addToUi();
}

// =========================================================================
// FUNÇÃO MESTRE
// =========================================================================
function atualizarTodosOsDashboards() {
  console.log("Iniciando atualização do Mês Atual...");
  puxarDadosMidiaMesAtual();
  
  console.log("Iniciando atualização do Mês Passado...");
  puxarDadosMesPassado();

  console.log("Iniciando atualização do Mês Retrasado...");
  puxarDadosMesRetrasado();
  
  console.log("Iniciando atualização do Ano Passado...");
  puxarDadosAnoPassado();
  
  console.log("Todas as bases (Mídia + Leads) foram atualizadas!");
}

// =========================================================================
// 1. MÊS ATUAL
// =========================================================================
function puxarDadosMidiaMesAtual() {
  const ssDestino = SpreadsheetApp.getActiveSpreadsheet(); 
  const nomeAbaDestino = "NOME_DA_ABA_DESTINO";
  const idPlanilhaOrigem = "ID_PLANILHA_MES_ATUAL";
  const mesReferencia = "NOME_DO_MES";

  // Abas da planilha de origem que serão processadas
  const abasOrigem = ["ABA_1", "ABA_2", "ABA_3"];
  let agrupado = {};

  try {
    const ssOrigem = SpreadsheetApp.openById(idPlanilhaOrigem);
    
    // --- PARTE A: PROCESSAMENTO DE MÍDIA (Colunas A-Q) ---
    abasOrigem.forEach(nome => {
      let sheet = ssOrigem.getSheetByName(nome);
      if (!sheet) return;

      let dados = sheet.getDataRange().getValues();
      if (dados.length <= 1) return;

      for (let i = 1; i < dados.length; i++) {
        let linha = dados[i];
        if (!linha[0] || linha[0] === "") continue;

        let colA = String(linha[0]).toLowerCase().trim();
        let colB = String(linha[1]).toLowerCase().trim();
        if (colA.includes("total") || colA.includes("geral") || colA === "source" || colA === "mídia" ||
            colB.includes("total") || colB.includes("etapa do funil")) {
          continue;
        }

        let dataBruta = linha[8]; 
        let dataFormatada = "";
        try {
          if (dataBruta instanceof Date) {
            dataFormatada = Utilities.formatDate(dataBruta, Session.getScriptTimeZone(), "dd/MM/yyyy");
          } else if (typeof dataBruta === 'string' && dataBruta.length >= 10) {
             let dataObj = new Date(dataBruta);
             if (!isNaN(dataObj.getTime())) {
               dataFormatada = Utilities.formatDate(dataObj, Session.getScriptTimeZone(), "dd/MM/yyyy");
             } else { dataFormatada = dataBruta; }
          } else { dataFormatada = String(dataBruta); }
        } catch (e) { dataFormatada = ""; }

        let dimensoesTexto = linha.slice(0, 8).map(item => item ? String(item).trim() : "");
        let chave = dimensoesTexto.join("|") + "|" + dataFormatada;
        
        if (!agrupado[chave]) {
          agrupado[chave] = [mesReferencia, ...dimensoesTexto, dataFormatada, 0, 0, 0, 0, 0, 0, 0];
        }
        
        for (let m = 0; m < 7; m++) {
          let valorBruto = linha[9 + m]; 
          let valor = 0;
          if (typeof valorBruto === 'number') { valor = valorBruto; } 
          else if (typeof valorBruto === 'string') {
            let limpo = valorBruto.replace(/\./g, "").replace(",", ".");
            valor = parseFloat(limpo);
          }
          if (isNaN(valor)) valor = 0;
          agrupado[chave][10 + m] += valor;
        }
      }
    });

    let resultadoMidia = Object.values(agrupado);
    resultadoMidia.sort((a, b) => {
      let dataA = String(a[9]).split("/").reverse().join("");
      let dataB = String(b[9]).split("/").reverse().join("");
      return dataA.localeCompare(dataB) || String(a[4]).localeCompare(String(b[4]));
    });

    const abaDestino = ssDestino.getSheetByName(nomeAbaDestino);
    if (abaDestino) {
      abaDestino.clearContents();
      
      const cabeçalhoMidia = [["Mês", "Etapa do funil", "Mídia", "Objetivo", "Lançamento", "ID", "RM", "Diretoria", "Campanha", "Data", "sum Conversoes", "sum Investimento", "sum Cliques", "sum Impressoes", "sum Pré-Leads GA4", "sum Sessões", "sum"]];
      abaDestino.getRange(1, 1, 1, cabeçalhoMidia[0].length).setValues(cabeçalhoMidia).setFontWeight("bold");
      if (resultadoMidia.length > 0) {
        abaDestino.getRange(2, 1, resultadoMidia.length, resultadoMidia[0].length).setValues(resultadoMidia);
      }

      // --- PARTE B: LEADS ATUAL (Coluna U / Índice 21) ---
      let abaLeads = ssOrigem.getSheetByName("NOME_ABA_LEADS");
      if (abaLeads) {
        let dadosLeads = abaLeads.getDataRange().getValues();
        let leadsFiltrados = [];
        if (dadosLeads.length > 0) { leadsFiltrados.push(dadosLeads[0]); }

        for(let l = 1; l < dadosLeads.length; l++) {
           let linha = dadosLeads[l];
           let dLead = linha[0];
           if (dLead && dLead !== "" && String(dLead) !== "#N/A" && String(dLead) !== "#REF!") {
             if (dLead instanceof Date) {
               linha[0] = Utilities.formatDate(dLead, Session.getScriptTimeZone(), "dd/MM/yyyy");
             }
             leadsFiltrados.push(linha);
           }
        }
        
        if (leadsFiltrados.length > 0) {
           abaDestino.getRange(1, 21, leadsFiltrados.length, leadsFiltrados[0].length).setValues(leadsFiltrados);
           abaDestino.getRange(1, 21, 1, leadsFiltrados[0].length).setFontWeight("bold");
        }
      }
      console.log("Sucesso Mês Atual (Mídia + Leads)!");
    }
  } catch (e) {
    console.log("Erro Mês Atual: " + e.message);
  }
}

// =========================================================================
// 2. MÊS PASSADO
// =========================================================================
function puxarDadosMesPassado() {
  processarHistoricoComPacing("ID_PLANILHA_MES_PASSADO", "NOME_DA_ABA_MES_PASSADO", "Mês Passado");
}

// =========================================================================
// 3. MÊS RETRASADO 
// =========================================================================
function puxarDadosMesRetrasado() {
  processarHistoricoComPacing("ID_PLANILHA_MES_RETRASADO", "NOME_DA_ABA_MES_RETRASADO", "Mês Retrasado");
}

// =========================================================================
// 4. ANO PASSADO 
// =========================================================================
function puxarDadosAnoPassado() {
  processarHistoricoComPacing("ID_PLANILHA_ANO_PASSADO", "NOME_DA_ABA_ANO_PASSADO", "Ano Passado");
}

// =========================================================================
// FUNÇÃO GENÉRICA DE HISTÓRICO
// =========================================================================
function processarHistoricoComPacing(idPlanilha, nomeAbaDestino, logNome) {
  const ssDestino = SpreadsheetApp.getActiveSpreadsheet();
  const nomeAbaOrigemMidia = "NOME_ABA_MIDIA_ORIGEM";
  const nomeAbaOrigemLeads = "NOME_ABA_LEADS_ORIGEM";

  try {
    const ssOrigem = SpreadsheetApp.openById(idPlanilha);
    const abaOrigemMidia = ssOrigem.getSheetByName(nomeAbaOrigemMidia);
    const abaOrigemLeads = ssOrigem.getSheetByName(nomeAbaOrigemLeads);

    if (!abaOrigemMidia) { console.log(`Erro: Aba Mídia não encontrada em ${logNome}`); return; }

    // --- Limite do Mês Atual ---
    let dataHoje = new Date();
    let diaLimite = 31; 

    // Ajusta o limite para o mês vigente (pega até ontem)
    if (dataHoje.getMonth() === new Date().getMonth()) { 
      let dataOntem = new Date();
      dataOntem.setDate(dataHoje.getDate() - 1);
      diaLimite = dataOntem.getDate();
    }

    // 1. MÍDIA
    let dadosMidia = abaOrigemMidia.getDataRange().getValues();
    let midiaFiltrada = [dadosMidia[0]];

    for (let i = 1; i < dadosMidia.length; i++) {
      let linha = dadosMidia[i];
      let valorData = linha[9]; 
      let dia = 0;
      if (valorData instanceof Date) dia = valorData.getDate();
      else if (typeof valorData === 'string' && valorData.includes("/")) dia = parseInt(valorData.split("/")[0], 10);
      
      if (dia > 0 && dia <= diaLimite) midiaFiltrada.push(linha);
    }

    // 2. LEADS HISTÓRICO
    let leadsFiltrados = [];
    if (abaOrigemLeads) {
      let dadosLeads = abaOrigemLeads.getDataRange().getValues();
      if (dadosLeads.length > 0) {
        leadsFiltrados.push(dadosLeads[0]);
        for (let i = 1; i < dadosLeads.length; i++) {
          let linha = dadosLeads[i];
          let valorData = linha[0]; 
          let dia = 0;
          if (valorData && valorData !== "" && String(valorData) !== "#N/A") {
            if (valorData instanceof Date) {
              dia = valorData.getDate();
              linha[0] = Utilities.formatDate(valorData, Session.getScriptTimeZone(), "dd/MM/yyyy");
            } else if (typeof valorData === 'string' && valorData.includes("/")) {
              dia = parseInt(valorData.split("/")[0], 10);
            }
            if (dia > 0 && dia <= diaLimite) leadsFiltrados.push(linha);
          }
        }
      }
    }

    const abaDestino = ssDestino.getSheetByName(nomeAbaDestino);
    if (abaDestino) {
      abaDestino.clearContents();
      if (midiaFiltrada.length > 0) {
        abaDestino.getRange(1, 1, midiaFiltrada.length, midiaFiltrada[0].length).setValues(midiaFiltrada);
        abaDestino.getRange(2, 10, midiaFiltrada.length, 1).setNumberFormat("dd/mm/yyyy"); 
      }
      if (leadsFiltrados.length > 0) {
        abaDestino.getRange(1, 19, leadsFiltrados.length, leadsFiltrados[0].length).setValues(leadsFiltrados);
        abaDestino.getRange(1, 19, 1, leadsFiltrados[0].length).setFontWeight("bold");
      }
      console.log(`Sucesso ${logNome}! Mídia e Leads filtrados até dia ${diaLimite}`);
    }
  } catch (e) {
    console.log(`Erro ${logNome}: ${e.message}`);
  }
}
