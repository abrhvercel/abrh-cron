import Fastify from "fastify";
import { checkTransactions } from "./transactions.js";

const fastify = Fastify({
  logger: true,
});

fastify.get("/", async function handler(request, reply) {
  const response = await checkTransactions();

  // await client.collection("test").create({ time: new Date().toString() });

  reply.send(response);
});

fastify.listen({ port: 3001, host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

// var cron = require('node-cron');

// cron.schedule('*/10 * * * *', async () =>  {
//   const client = new PocketBase(POCKET_BASE_URL);
//   await client
//     .collection("users")
//     .authWithPassword("admin@email.com", "Q!W@e3r4");
//   await client.collection("test").create({ time: new Date().toString() });
// });
