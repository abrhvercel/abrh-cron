import { LOG } from "./utils/log.js";
import pocketbaseClient from "./db/pocketbase.js";

export const sendWhatsappMessage = async (messages) => {
  try {
    const client = await pocketbaseClient.getClient(
      "admin@email.com",
      "Q!W@e3r4"
    );

    const settings = await client.collection("settings").getFullList();

    const WHATSAPP_URL = settings.find((s) => s.field === "WHATSAPP_URL");
    const WHATSAPP_TOKEN = settings.find((s) => s.field === "WHATSAPP_TOKEN");
    const WHATSAPP_INSTANCE = settings.find(
      (s) => s.field === "WHATSAPP_INSTANCE"
    );

    LOG(`WHATSAPP_URL -> ${WHATSAPP_URL.value}`);
    LOG(`WHATSAPP_TOKEN -> ${WHATSAPP_TOKEN.value}`, false);
    LOG(`WHATSAPP_INSTANCE -> ${WHATSAPP_INSTANCE.value}`, false);

    if (WHATSAPP_URL && WHATSAPP_TOKEN && WHATSAPP_INSTANCE) {
      const url = `${WHATSAPP_URL.value}/message/sendText/${WHATSAPP_INSTANCE.value}`;
      const response = await Promise.all(
        messages.map((msg) => {
          const body = {
            number: msg.number,
            options: {
              presence: "composing",
              linkPreview: false,
            },
            textMessage: {
              text: msg.text,
            },
          };

          const config = {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
              "Content-Type": "application/json",
              apikey: WHATSAPP_TOKEN.value,
            },
          };

          return fetch(url, config);
        })
      );

      LOG(JSON.stringify(response));

      return "";
    } else {
      return "Erro ao enviar mensagens via whatsapp";
    }
  } catch (error) {
    console.error(error);
    return "Erro ao enviar mensagens via whatsapp";
  }
};
