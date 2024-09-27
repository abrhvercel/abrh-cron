import pocketbaseClient from "./pocketbase.js";
import pagarme from "./pagarme.js";
import { sendWhatsappMessage } from "./whatsapp.js";
import { sendEmailMessage } from "./email.js";
import { LOG } from "./log.js";

export const checkTransactions = async () => {
  try {
    const client = await pocketbaseClient.getClient(
      "admin@email.com",
      "Q!W@e3r4"
    );

    const list = await client.collection("data").getFullList({
      filter: `(paymentStatus = 'PENDENTE' || paymentStatus = 'Pendente' || paymentStatus = 'pendente') && client != ""`,
    });

    // return list;

    const data = await pagarme.checkPayments(list);

    if (data.notify.length) {
      LOG("ENVIANDO NOTIFICAÇÕES VIA WHATSAPP");

      const whatsappData = data.notify
        .filter((item) => !!item.phone)
        .map((item) => ({
          number: `+55${item.phone.replace(/\D/g, "")}`,
          text: "Você possui um pagamento pendente!",
        }));

      LOG(`WHATSAPP -> ${JSON.stringify(whatsappData)}`);
      await sendWhatsappMessage(whatsappData);

      LOG("ENVIANDO NOTIFICAÇÕES VIA EMAIL");

      const emailData = data.notify
        .filter((item) => !!item.customerEmail)
        .map((item) => ({
          emailList: [item.customerEmail],
          subject: "Atenção",
          text: "Você possui um pagamento pendente!",
        }));

      LOG(`EMAIL -> ${JSON.stringify(emailData)}`);
      if (emailData.length) {
        await sendEmailMessage(emailData);
      }

      //   await Promise.all(
      //     data.notify.map((item) =>
      //       client.collection("data").update(item.id, { paymentAlertSent: true })
      //     )
      //   );
    }

    return data;
  } catch (error) {
    LOG(error);
    return { error };
  }
};
