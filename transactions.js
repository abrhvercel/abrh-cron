import pocketbaseClient from "./db/pocketbase.js";
import pagarme from "./pagarme.js";
import { sendWhatsappMessage } from "./whatsapp.js";
import { sendEmailMessage } from "./email.js";
import { LOG } from "./utils/log.js";
import { sleep } from "./utils/sleep.js";
import {
  getEmailCancelMessage,
  getEmailNotifyMessage,
  getWhatsappCancelMessage,
  getWhatsappNotifyMessage,
} from "./message.js";

const sendNotification = async (
  phones,
  phoneMessages,
  emails,
  emailMessages
) => {
  // LOG("ENVIANDO NOTIFICAÇÕES VIA WHATSAPP");

  // const whatsappData = phones.map((item, index) => ({
  //   number: '+55048991691208', //`+55${item.phone.replace(/\D/g, "")}`,
  //   text: phoneMessages[index],
  // }));

  // await sendWhatsappMessage(whatsappData);

  LOG("ENVIANDO NOTIFICAÇÕES VIA EMAIL");

  const emailData = emails.map((item, index) => ({
    emailList: ['pedro.phdois@gmail.com'], // [item.customerEmail],
    subject: emailMessages[index].subject,
    text: emailMessages[index].text,
  }));

  if (emailData.length) {
    await sendEmailMessage(emailData);
  }

  return;
};

export const checkTransactions = async () => {
  LOG("----------------------------------------", false);
  LOG("----------------------------------------", false);
  LOG("----------------------------------------", false);
  LOG("INICIANDO PROCESSO");
  LOG("----------------------------------------", false);
  try {
    const client = await pocketbaseClient.getClient(
      "admin@email.com",
      "Q!W@e3r4"
    );

    const list = await client.collection("data").getFullList({
      filter: `(paymentStatus = 'PENDENTE' || paymentStatus = 'Pendente' || paymentStatus = 'pendente') && client != "" && empenho != "S"`,
    });

    LOG(`Nº DE PROCESSOS PARA VERIFICAR: ${list.length}`);

    const data = await pagarme.checkPayments(list);

    if (data.notify.length) {
      let phones = data.notify.filter((item) => !!item.phone);
      let emails = data.notify.filter((item) => !!item.customerEmail);

      LOG("ENVIANDO NOTIFICAÇÕES DE ALERTA DE PAGAMENTO");

      await sendNotification(
        phones,
        phones.map((p) => getWhatsappNotifyMessage(p)),
        emails,
        emails.map((p) => ({
          subject: "Lembrete de Pagamento - Inscrição para o Evento",
          text: getEmailNotifyMessage(p),
        }))
      );

      // await Promise.all(
      //   data.notify.map((item) =>
      //     client.collection("data").update(item.id, { paymentAlertSent: true })
      //   )
      // );
    }

    await sleep(2000);

    if (data.cancel.length) {
      const phones = data.cancel.filter((item) => !!item.phone);
      const emails = data.cancel.filter((item) => !!item.customerEmail);

      LOG("ENVIANDO NOTIFICAÇÕES DE CANCELAMENTO DE PAGAMENTO");

      await sendNotification(
        phones,
        phones.map((p) => getWhatsappCancelMessage(p)),
        emails,
        emails.map((p) => ({
          subject: "Cancelamento da Inscrição",
          text: getEmailCancelMessage(p),
        }))
      );

      // await Promise.all(
      //   data.cancel.map((item) =>
      //     client.collection("data").update(item.id, { paymentCancelled: true })
      //   )
      // );
    }

    LOG("----------------------------------------", false);
    LOG("----------------------------------------", false);
    LOG("----------------------------------------", false);
    LOG("ENCERRANDO PROCESSO");
    LOG("----------------------------------------", false);
    return data;
  } catch (error) {
    LOG(error);
    LOG("----------------------------------------", false);
    LOG("----------------------------------------", false);
    LOG("----------------------------------------", false);
    LOG("ENCERRANDO PROCESSO");
    LOG("----------------------------------------", false);
    return { error };
  }
};
