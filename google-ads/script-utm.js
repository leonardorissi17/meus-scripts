// SCRIPT: Atualiza UTMs a nível de grupo de anúncio
// TIPO: Google Ads Scripts (MCC)
// FUNÇÃO: Aplica Final URL Suffix com utm_campaign e utm_content
//         apenas em campanhas de Search que contenham os termos configurados
// COMO USAR: Preencha ACCOUNT_IDS, CIDADES_TESTE e TERMO_OUTRA_AGENCIA antes de rodar

function main() {
  // === 1. CONFIGURAÇÕES DA MCC ===
  // Substitua pelos IDs reais das contas antes de rodar
  var ACCOUNT_IDS = ['ID_CONTA_1', 'ID_CONTA_2', 'ID_CONTA_3'];

  // === 2. CONFIGURAÇÕES DO TESTE ===
  // Adicione os termos que aparecem no nome das campanhas que devem ser atualizadas
  var CIDADES_TESTE = ["termo1", "termo2"]; 
  
  // Campanhas que contiverem esse termo serão ignoradas
  var TERMO_OUTRA_AGENCIA = "TERMO_PARA_IGNORAR";

  Logger.log('--- 🚀 Iniciando Script a nível de MCC (APENAS SEARCH) ---');
  var accountIterator = AdsManagerApp.accounts().withIds(ACCOUNT_IDS).get();
  
  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    AdsManagerApp.select(account);
    Logger.log('====================================================');
    Logger.log('✅ Entrando na conta -> ' + account.getName() + ' (ID: ' + account.getCustomerId() + ')');
    
    executarAtualizacaoNasCampanhas(CIDADES_TESTE, TERMO_OUTRA_AGENCIA);
  }
  Logger.log('====================================================');
  Logger.log('--- 🏁 Processo Finalizado em TODAS as contas ---');
}

// === 3. O MOTOR DO SCRIPT (Rodando dentro da conta do cliente) ===
function executarAtualizacaoNasCampanhas(cidadesTeste, termoOutraAgencia) {
  
  function processarNivelGrupo(campanhas, sufixoFinal) {
    var encontrouAlguma = false;
    while (campanhas.hasNext()) {
      var campanha = campanhas.next();
      var nomeCampanha = campanha.getName();
      var nomeCampanhaMinusculas = nomeCampanha.toLowerCase(); 

      // Pula a campanha se pertencer à outra agência
      if (nomeCampanha.indexOf(termoOutraAgencia) !== -1) continue;

      // Verifica se a campanha possui alguma das cidades do teste
      var ehCampanhaDoTeste = cidadesTeste.some(function(cidade) {
        return nomeCampanhaMinusculas.indexOf(cidade) !== -1;
      });

      if (ehCampanhaDoTeste) {
        encontrouAlguma = true;
        var grupos = campanha.adGroups().withCondition("Status = ENABLED").get();
        
        while (grupos.hasNext()) {
          var grupo = grupos.next();
          var nomeGrupo = grupo.getName();
          
          var campEncoded = encodeURIComponent(nomeCampanha);
          var adgEncoded = encodeURIComponent(nomeGrupo);
          
          var finalSuffix = 'utm_source=google&utm_medium=cpc&utm_campaign=' + campEncoded + 
                            '&utm_content=' + adgEncoded + sufixoFinal;
          
          grupo.urls().setFinalUrlSuffix(finalSuffix);
          Logger.log('   ✅ Atualizado | Camp: ' + nomeCampanha + ' | Grupo: ' + nomeGrupo);
        }
      }
    }
    
    if (!encontrouAlguma) {
       Logger.log('   Nenhuma campanha de Search válida para o teste encontrada nesta conta.');
    }
  }

  // Executa APENAS para campanhas de Pesquisa (Search) ativas
  Logger.log('   -> Procurando campanhas de Pesquisa (Search)...');
  var campanhasPesquisa = AdsApp.campaigns()
    .withCondition("AdvertisingChannelType = 'SEARCH'")
    .withCondition("Status = ENABLED")
    .get();
    
  processarNivelGrupo(campanhasPesquisa, '&utm_term={keyword}');
}
