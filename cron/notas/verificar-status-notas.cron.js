import { notaFiscalSettingsItemDefault } from "../../constants/notafiscal.js";
import pocketbaseClient from "../../db/pocketbase.js";
import notafiscalService from "../../services/notafiscal.js";
import { LOG } from "../../utils/log.js";
import { sleep } from "../../utils/sleep.js";

export const runVerificarStatusNotas = async () => {
  const dbClient = await pocketbaseClient.getClient();

  const logs = [];

  const settings = await dbClient.collection("settings").getFullList();
  let notaFiscalSettings =
    settings
      .find((s) => s.field === "NOTA_FISCAL_EVENT_SETTINGS")
      ?.value?.parseJSON() || {};

  const resultList = await dbClient.collection("data").getFullList({
    filter: `
      nfseId != null && nfseCronAttempts < ${process.env.SPEDY_MAX_ATTEMPTS}
      && (nfseStatus = 'created' || nfseStatus = 'enqueued' || nfseStatus = 'received')
    `,
  });

  logs.push(LOG(`Nº de processos para atualizar: ${resultList.length}`));

  for (let i = 0; i < resultList.length; i++) {
    const item = resultList[i];

    logs.push(
      LOG(`Consultando nota (${i + 1}/${resultList.length}): ${item.process}`)
    );
    const nfse = await notafiscalService.getNFSe(item.nfseId);

    if (nfse) {
      logs.push(LOG(`Status da nota: ${nfse.status}`));
      await dbClient.collection("data").update(item.id, {
        nfseStatus: nfse.status,
      });
    } else {
      logs.push(LOG(`Erro ao buscar status da nota: ${item.process}`));
      await dbClient.collection("data").update(item.id, {
        nfseCronAttempts: Number(item.nfseCronAttempts) + 1,
      });
    }

    await sleep(1000);
  }

  return logs;
};
