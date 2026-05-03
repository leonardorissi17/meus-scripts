// SCRIPT: Puxa dados de campanhas do Google Ads para o Google Sheets
// TIPO: Google Ads Scripts (MCC)
// FUNÇÃO: Busca métricas do mês atual (conversões, investimento, cliques, impressões)
//         de todas as contas configuradas e cola numa planilha de destino
// COMO USAR: Preencha SPREADSHEET_URL, SHEET_NAME, ACCOUNT_IDS e MES_DE_REFERENCIA antes de rodar
// ATENÇÃO: O script tem trava de segurança — não roda se o mês já passou

// === CONFIGURAÇÃO DE SEGURANÇA ===
var MES_DE_REFERENCIA = 0; // Mês que o script pode rodar (Jan=0, Fev=1, Mar=2, Abr=3, ...)

function main() {
  Logger.log('1. Iniciando o script...');

  // --- TRAVA DE SEGURANÇA ---
  var hoje = new Date();
  if (hoje.getMonth() > MES_DE_REFERENCIA) {
    Logger.log("Mês encerrado! O script foi bloqueado automaticamente para não sobrescrever os dados antigos.");
    return; 
  }

  // === CONFIGURAÇÕES ===
  // URL da planilha de destino
  var SPREADSHEET_URL = 'URL_DA_PLANILHA_AQUI';
  // Nome da aba onde os dados serão colados
  var SHEET_NAME = 'NOME_DA_ABA_AQUI';
  // IDs das contas da MCC
  var ACCOUNT_IDS = ['ID_CONTA_1', 'ID_CONTA_2', 'ID_CONTA_3'];

  Logger.log('2. Conectando à planilha...');
  var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  // --- LIMPEZA E PREPARAÇÃO ---
  // Limpa apenas o intervalo onde os dados de mídia entram (H até M)
  // Isso garante que as fórmulas nas colunas A:G permaneçam
  sheet.getRange("H:M").clearContent();
  
  // Cria o cabeçalho na Linha 1, Coluna 8 (Coluna H)
  sheet.getRange(1, 8, 1, 6).setValues([['Campanha', 'Data', 'Conversoes', 'Investimento', 'Cliques', 'Impressoes']]);
  Logger.log('-> Colunas H:M limpas e cabeçalho criado na coluna H.');

  var today = new Date();
  var todayString = Utilities.formatDate(today, 'America/Sao_Paulo', 'yyyy-MM-dd');
  var rowsToAppend = [];

  Logger.log('3. Buscando contas na MCC...');
  var accountIterator = AdsManagerApp.accounts().withIds(ACCOUNT_IDS).get();
  Logger.log('-> Contas encontradas: ' + accountIterator.totalNumEntities());

  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    AdsManagerApp.select(account);
    Logger.log('4. Lendo dados da conta: ' + account.getName());

    // Query para trazer os dados do mês atual 
    var query =
      "SELECT campaign.name, segments.date, metrics.conversions, " +
      "metrics.cost_micros, metrics.clicks, metrics.impressions " +
      "FROM campaign " +
      "WHERE metrics.impressions > 0 " +
      "AND segments.date DURING THIS_MONTH";

    var report = AdsApp.report(query);
    var rows = report.rows();
    var count = 0;

    while (rows.hasNext()) {
      var row = rows.next();
      var dateString = row['segments.date'];

      // Trava de segurança: não puxa dados de "hoje" para evitar dados parciais
      if (dateString < todayString) {
        var dateParts = dateString.split('-');
        var formattedDate = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
        var cost = parseFloat(row['metrics.cost_micros']) / 1000000;
        var conversions = parseFloat(row['metrics.conversions']);
        var clicks = parseInt(row['metrics.clicks'], 10);
        var impressions = parseInt(row['metrics.impressions'], 10);

        rowsToAppend.push([
          row['campaign.name'], formattedDate, conversions, cost, clicks, impressions, dateString
        ]);
        count++;
      }
    }
    Logger.log('-> ' + count + ' linhas processadas para esta conta.');
  }

  // 5. Ordenação por data (mais recente primeiro)
  rowsToAppend.sort(function(a, b) {
    return b[6].localeCompare(a[6]); 
  });

  // Prepara os dados finais (remove a coluna auxiliar de data usada para ordenação)
  var finalData = rowsToAppend.map(function(row) {
    return row.slice(0, 6);
  });

  Logger.log('6. Colando dados na planilha...');
  if (finalData.length > 0) {
    var range = sheet.getRange(2, 8, finalData.length, 6);
    range.setValues(finalData);
    Logger.log('-> ' + finalData.length + ' linhas inseridas com sucesso a partir da coluna H.');
  }

  Logger.log('7. PROCESSO CONCLUÍDO!');
}
