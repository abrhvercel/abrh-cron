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
  // const response = await checkTransactions();
  // await client.collection("test").create({ time: new Date().toString() });
  const response = await runNotas();
  reply.send(response);
});

fastify.listen({ port: 3001, host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

cron.schedule('* * * * *', async () =>  {
  console.log('TESTE CRON -> ', new Date().toISOString())
});

// cron.schedule('*/10 * * * *', async () =>  {
//   const client = new PocketBase(POCKET_BASE_URL);
//   await client
//     .collection("users")
//     .authWithPassword("admin@email.com", "Q!W@e3r4");
//   await client.collection("test").create({ time: new Date().toString() });
// });
