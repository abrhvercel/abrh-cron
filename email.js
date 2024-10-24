import pocketbaseClient from "./pocketbase.js";
import nodemailer from "nodemailer";

export const sendEmailMessage = (messages) => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = await pocketbaseClient.getClient(
        "admin@email.com",
        "Q!W@e3r4"
      );

      const settings = await client.collection("settings").getFullList();

      const EMAIL_URL = settings.find((s) => s.field === "EMAIL_URL");
      const EMAIL_PORT = settings.find((s) => s.field === "EMAIL_PORT");
      const EMAIL_USER = settings.find((s) => s.field === "EMAIL_USER");
      const EMAIL_PASSWORD = settings.find((s) => s.field === "EMAIL_PASSWORD");

      const transporterConfig = {
        auth: {
          user: EMAIL_USER.value,
          pass: EMAIL_PASSWORD.value,
        },
        port: Number(EMAIL_PORT.value),
        host: EMAIL_URL.value,
        secure: false,
      };

      const messagesToSend = messages.map((m) => {
        const mailOptions = {
          from: EMAIL_USER.value,
          to: m.emailList,
          subject: m.subject,
          html: m.text,
          reply_to: {
            email: "john@mailersend.com",
            name: "MailerSend",
          },
        };
        return sendEmail(transporterConfig, mailOptions);
      });

      if (messagesToSend.length) {
        const response = await Promise.all(messagesToSend);
      }

      resolve("");
    } catch (error) {
      reject(error);
    }
  });
};

const sendEmail = async (transporterConfig, mailOptions) => {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport(transporterConfig);
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error);
      } else {
        resolve("Email sent: " + info.response);
      }
    });
  });
};
