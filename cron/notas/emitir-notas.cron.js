import { notaFiscalSettingsItemDefault } from "../../constants/notafiscal.js";
import pocketbaseClient from "../../db/pocketbase.js";
import notafiscalService from "../../services/notafiscal.js";
import { LOG } from "../../utils/log.js";
import { sleep } from "../../utils/sleep.js";
import { nfeDuplicateController } from "../../utils/nfe-duplicate-control.js";

function normalizarTexto(texto) {
  return texto
    ?.normalize("NFD")             // Remove acentos
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Lock para evitar execuções simultâneas
let isProcessing = false;

export const runEmitirNotas = async () => {
  // Verificar se já está processando
  if (isProcessing) {
    return [LOG("Processo de emissão já em andamento - ignorando execução")];
  }

  isProcessing = true;
  const dbClient = await pocketbaseClient.getClient();
  const logs = [];

  // Limpar locks antigos
  nfeDuplicateController.cleanupOldLocks();

  try {
    const settings = await dbClient.collection("settings").getFullList();
    let notaFiscalSettings =
      settings
        .find((s) => s.field === "NOTA_FISCAL_EVENT_SETTINGS")
        ?.value?.parseJSON() || {};

    const resultList = await dbClient
      .collection("data")
      .getFullList({ filter: `nfseCronStatus = 'WAITING_CRON' && nfseCronAttempts < ${process.env.SPEDY_MAX_ATTEMPTS}` });

    logs.push(LOG(`Nº de processos: ${resultList.length}`));

    for (let i = 0; i < resultList.length; i++) {
      const item = resultList[i];

      const eventoNormalizado = normalizarTexto(item.event);
      const keys = Object.keys(notaFiscalSettings);
      const matchedKey = keys.find((key) => normalizarTexto(key) === eventoNormalizado);
      const settings = matchedKey
        ? notaFiscalSettings[matchedKey]
        : notaFiscalSettingsItemDefault;
      
      logs.push(LOG(`Nota ${i + 1} / ${resultList.length}`));
      logs.push(LOG(`Processando: ${item.process}`));

      // Verificação robusta de duplicidade usando o controlador
      const duplicateCheck = await nfeDuplicateController.checkDuplicateNFe(item.process, item.nfseId);
      
      if (duplicateCheck.isDuplicate && duplicateCheck.shouldBlock) {
        logs.push(LOG(`NFe ${duplicateCheck.existingNFe?.nfseId || 'N/A'} - ${duplicateCheck.reason} para o processo: ${item.process} - ignorada para reemissão`));
        continue;
      }

      // Verificar se já está sendo processado por outro processo
      if (!nfeDuplicateController.getProcessingLock(item.process)) {
        logs.push(LOG(`Processo ${item.process} já está sendo processado por outra instância - ignorando`));
        continue;
      }

      // Marcar como processando para evitar duplicidade
      await dbClient.collection("data").update(item.id, {
        nfseCronStatus: "PROCESSING",
        nfseLastAttempt: new Date().toISOString(),
        nfseProcessedBy: "CRON_SYSTEM"
      });

      try {
        const response = await notafiscalService.postNFSe(item, settings);
        await sleep(1000);
        
        if (!response.error) {
          const nfse = response.data;
          logs.push(LOG(`NFe ${nfse.id} - gerada com sucesso para o processo: ${item.process}`));
          
          await dbClient.collection("data").update(item.id, {
            nfseId: nfse.id,
            nfseStatus: nfse.status,
            nfseCronStatus: "PROCESSED_CRON",
            nfseCronAttempts: 0,
            nfseCronError: "",
            nfseProcessedAt: new Date().toISOString()
          });

          // Registrar log de sucesso
          await nfeDuplicateController.logNFeAttempt(item.process, nfse.id, "SUCCESS");
        } else {
          logs.push(LOG(`Erro ao gerar NFe para o processo: ${item.process} - ${JSON.stringify(response.error)}`));
          
          await dbClient.collection("data").update(item.id, {
            nfseCronStatus: "ERROR",
            nfseCronAttempts: (item.nfseCronAttempts || 0) + 1,
            nfseCronError: JSON.stringify(response.error),
            nfseLastError: new Date().toISOString()
          });

          // Registrar log de erro
          await nfeDuplicateController.logNFeAttempt(item.process, null, "ERROR", response.error);
        }
      } finally {
        // Sempre liberar o lock
        nfeDuplicateController.releaseProcessingLock(item.process);
      }
    }
  } catch (error) {
    logs.push(LOG(`Erro no processo de emissão: ${error.message}`));
  } finally {
    isProcessing = false;
  }

  return logs;
};
