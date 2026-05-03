// SCRIPT: Alerta de campanhas com baixo gasto diário
// TIPO: Google Ads Scripts (MCC)
// FUNÇÃO: Verifica diariamente se alguma campanha está gastando abaixo do percentual
//         mínimo configurado e envia um e-mail de alerta para a lista definida
// COMO USAR: Preencha LISTA_DE_EMAILS, CONTAS_ALVO e GASTO_MINIMO antes de rodar
// AGENDAMENTO: Recomendado rodar 1x por dia (ex: às 14h)

// === CONFIGURAÇÕES DO ALERTA ===
// E-mails que receberão o alerta
var LISTA_DE_EMAILS = [
  "email1@dominio.com",
  "email2@dominio.com"
];
var EMAIL_ALERTA = LISTA_DE_EMAILS.join(",");

// Percentual mínimo de gasto (0.30 = 30% do orçamento diário)
var GASTO_MINIMO = 0.30;

// IDs das contas a monitorar
var CONTAS_ALVO = ['ID_CONTA_1', 'ID_CONTA_2', 'ID_CONTA_3', 'ID_CONTA_4'];

function main() {
  var accountSelector = AdsManagerApp.accounts().withIds(CONTAS_ALVO);
  accountSelector.executeInParallel('verificarGastosConta', 'enviarEmailFinal');
}

function verificarGastosConta() {
  var alertasConta = [];
  var contaAtual = AdsApp.currentAccount().getName();
  
  var query = "SELECT campaign.name, campaign_budget.amount_micros, metrics.cost_micros " +
              "FROM campaign " +
              "WHERE campaign.status = 'ENABLED' " +
              "AND campaign_budget.status = 'ENABLED' " +
              "AND campaign.serving_status = 'SERVING' " +
              "AND segments.date DURING TODAY";
              
  var report = AdsApp.report(query);
  var rows = report.rows();
  
  while (rows.hasNext()) {
    var row = rows.next();
    var nomeCampanha = row['campaign.name'];
    var orcamento = parseFloat(row['campaign_budget.amount_micros']) / 1000000;
    
    var custoMicros = row['metrics.cost_micros'];
    var custoHoje = custoMicros ? (parseFloat(custoMicros) / 1000000) : 0;
    
    if (orcamento > 0) {
      var percentualGasto = custoHoje / orcamento;
      if (percentualGasto < GASTO_MINIMO) {
        alertasConta.push("• [" + contaAtual + "] " + nomeCampanha + 
          " (Orçamento: R$" + orcamento.toFixed(2) + 
          " | Gasto hoje: R$" + custoHoje.toFixed(2) + ")");
      }
    }
  }
  
  return aler
