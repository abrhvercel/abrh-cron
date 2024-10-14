import pocketbaseClient from "./pocketbase.js";
import pagarme from "./pagarme.js";
import { sendWhatsappMessage } from "./whatsapp.js";
import { sendEmailMessage } from "./email.js";
import { LOG } from "./log.js";
import { sleep } from "./sleep.js";

const sendNotification = async (
  phones,
  phoneMessages,
  emails,
  emailMessages
) => {
  LOG("ENVIANDO NOTIFICAÇÕES VIA WHATSAPP");

  const whatsappData = phones.map((item, index) => ({
    number: `+55${item.phone.replace(/\D/g, "")}`,
    text: phoneMessages[index],
  }));

  LOG(`WHATSAPP -> ${JSON.stringify(whatsappData)}`);
  await sendWhatsappMessage(whatsappData);

  LOG("ENVIANDO NOTIFICAÇÕES VIA EMAIL");

  const emailData = emails.map((item, index) => ({
    emailList: [item.customerEmail],
    subject: "Atenção",
    text: emailMessages[index],
  }));

  LOG(`EMAIL -> ${JSON.stringify(emailData)}`);
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
      filter: `(paymentStatus = 'PENDENTE' || paymentStatus = 'Pendente' || paymentStatus = 'pendente') && client != ""`,
    });

    const data = await pagarme.checkPayments(list);

    if (data.notify.length) {
      const phones = data.notify.filter((item) => !!item.phone);
      const emails = data.notify.filter((item) => !!item.customerEmail);

      LOG("ENVIANDO NOTIFICAÇÕES DE ALERTA DE PAGAMENTO");

      await sendNotification(
        phones,
        phones.map((p) => "Você possui um pagamento pendente!"),
        emails,
        emails.map((p) => "Você possui um pagamento pendente!")
      );

      await Promise.all(
        data.notify.map((item) =>
          client.collection("data").update(item.id, { paymentAlertSent: true })
        )
      );
    }

    await sleep(2000);

    if (data.cancel.length) {
      const phones = data.cancel.filter((item) => !!item.phone);
      const emails = data.cancel.filter((item) => !!item.customerEmail);

      LOG("ENVIANDO NOTIFICAÇÕES DE CANCELAMENTO DE PAGAMENTO");

      await sendNotification(
        phones,
        phones.map((p) => "Seu pagamento foi cancelado!"),
        emails,
        emails.map((p) => "Seu pagamento foi cancelado!")
      );

      await Promise.all(
        data.cancel.map((item) =>
          client.collection("data").update(item.id, { paymentCancelled: true })
        )
      );
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
