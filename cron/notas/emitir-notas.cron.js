import { notaFiscalSettingsItemDefault } from "../../constants/notafiscal.js";
import pocketbaseClient from "../../db/pocketbase.js";
import notafiscalService from "../../services/notafiscal.js";
import { LOG } from "../../utils/log.js";
import { sleep } from "../../utils/sleep.js";

export const runEmitirNotas = async () => {
  const dbClient = await pocketbaseClient.getClient();

  const logs = [];

  const settings = await dbClient.collection("settings").getFullList();
  let notaFiscalSettings =
    settings
      .find((s) => s.field === "NOTA_FISCAL_EVENT_SETTINGS")
      ?.value?.parseJSON() || {};

  const resultList = await dbClient
    .collection("data")
    .getFullList({ filter: "nfseCronStatus = 'WAITING_CRON'" });

  logs.push(LOG(`Nº de processos: ${resultList.length}`));

  for (let i = 0; i < resultList.length; i++) {
    const item = resultList[i];
    // await dbClient.collection("data").update(item.id, {
    //   nfseCronStatus: "",
    // });
    const settings =
      notaFiscalSettings[item.event] || notaFiscalSettingsItemDefault;
    logs.push(LOG(`Nota ${i + 1} / ${resultList.length}`));
    logs.push(LOG(`Gerando NFSe para o processo: ${item.process}`));
    if (item.nfseId) {
      logs.push(LOG(`Nota já gerada para o processo: ${item.process}`));
    } else {
      const nfse = await notafiscalService.postNFSe(item, settings);
      await sleep(1000);
      if (nfse) {
        logs.push(LOG(`Nota gerada: ${nfse.id}`));
        await dbClient.collection("data").update(item.id, {
          nfseId: nfse.id,
          nfseStatus: nfse.status,
          nfseCronStatus: "PROCESSED_CRON",
        });
      } else {
        logs.push(LOG(`Erro ao gerar nota para o processo: ${item.process}`));
      }
    }
  }

  return logs;
};
