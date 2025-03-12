import Fastify from "fastify";
import { checkTransactions } from "./transactions.js";
import { runNotas } from "./cron/notas/index.js";
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

String.prototype.parseJSON = function () {
  try {
    return JSON.parse(this);
  } catch (error) {
    throw new Error("Invalid JSON string");
  }
};

const fastify = Fastify({
  logger: true,
});

fastify.get("/", async function handler(request, reply) {
  const response = await runNotas();
  reply.send(response);
});

fastify.listen({ port: 3001, host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

// TODO DIA as 08h e 16h
// cron.schedule('0 8,16 * * *', async () =>  {
//   const response = await runNotas();
//   console.log(response)
// });
