// SCRIPT: Alerta de variação de gasto diário
// TIPO: Google Ads Scripts (conta única)
// FUNÇÃO: Compara o gasto de hoje com o de ontem por campanha.
//         Se o gasto aumentou mais do que o percentual configurado, envia alerta.
// COMO USAR: Preencha LISTA_DE_EMAILS e VARIACAO_MAXIMA antes de rodar
// AGENDAMENTO: Recomendado rodar algumas vezes ao dia (ex: 10h, 14h, 18h)

var LISTA_DE_EMAILS = [
  "email1@dominio.com",
  "email2@dominio.com"
];
var EMAIL_ALERTA = LISTA_DE_EMAILS.join(",");

// Percentual máximo de aumento permitido (0.25 = 25%)
var VARIACAO_MAXIMA = 0.25;

function main() {
  var alertas = [];

  var queryHoje =
    "SELECT campaign.name, metrics.cost_micros " +
    "FROM campaign " +
    "WHERE campaign.status = 'ENABLED' " +
    "AND segments.date DURING TODAY";

  var queryOntem =
    "SELECT campaign.name, metrics.cost_micros " +
    "FROM campaign " +
    "WHERE campaign.status = 'ENABLED' " +
    "AND segments.date DURING YESTERDAY";

  var gastoHoje = {};
  var gastoOntem = {};

  var rowsHoje = AdsApp.report(queryHoje).rows();
  while (rowsHoje.hasNext()) {
    var row = rowsHoje.next();
    var nome = row['campaign.name'];
    var custo = parseFloat(row['metrics.cost_micros']) / 1000000;
    gastoHoje[nome] = custo;
  }

  var rowsOntem = AdsApp.report(queryOntem).rows();
  while (rowsOntem.hasNext()) {
    var row = rowsOntem.next();
    var nome = row['campaign.name'];
    var custo = parseFloat(row['metrics.cost_micros']) / 1000000;
    gastoOntem[nome] = custo;
  }

  for (var nome in gastoHoje) {
    var hoje = gastoHoje[nome] || 0;
    var ontem = gastoOntem[nome] || 0;

    if (ontem > 0) {
      var variacao = (hoje - ontem) / ontem;

      if (variacao > VARIACAO_MAXIMA) {
        alertas.push(
          "• " + nome +
          " | Ontem: R$" + ontem.toFixed(2) +
          " | Hoje até agora: R$" + hoje.toFixed(2) +
          " | Aumento: " + (variacao * 100).toFixed(0) + "%"
        );
      }
    }
  }

  if (alertas.length > 0) {
    var assunto = "🚨 ALERTA GOOGLE ADS: Aumento de gasto detectado!";
    var corpoEmail = "Olá!\n\nAs campanhas abaixo tiveram um aumento de gasto superior a " +
                     (VARIACAO_MAXIMA * 100) + "% em relação a ontem:\n\n" +
                     alertas.join("\n") +
                     "\n\nVerifique se houve alguma alteração incorreta de orçamento.";

    MailApp.sendEmail(EMAIL_ALERTA, assunto, corpoEmail);
    Logger.log("E-mail de alerta enviado!");
  } else {
    Logger.log("Sucesso: Nenhuma variação fora do padrão detectada.");
  }
}
