import pocketbaseClient from "./pocketbase.js";

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

      console.log(response);

      return "";
    } else {
      return "Erro ao enviar mensagens via whatsapp";
    }
  } catch (error) {
    console.log(error);
    return "Erro ao enviar mensagens via whatsapp";
  }
};
