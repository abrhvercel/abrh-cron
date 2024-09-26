// Require the framework and instantiate it
const fastify = require("fastify")({ logger: true });
const PocketBase = require('pocketbase/cjs')

const POCKET_BASE_URL = 'https://pocketbaselatest.webit.work';

// Declare a route
fastify.get("/", async function handler(request, reply) {
  const client = new PocketBase(POCKET_BASE_URL);
  await client
    .collection("users")
    .authWithPassword("admin@email.com", "Q!W@e3r4");

  const data = await client.collection("data").getFullList({
    filter: `(paymentStatus = 'PENDENTE' || paymentStatus = 'Pendente' || paymentStatus = 'pendente') && client != ""`,
  });

  await client.collection("test").create({ time: new Date().toString() });

  reply.send(data);
  // reply.send({ hello: "world" });
});

// Run the server!
fastify.listen({}, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

var cron = require('node-cron');

cron.schedule('*/10 * * * *', async () =>  {
  const client = new PocketBase(POCKET_BASE_URL);
  await client
    .collection("users")
    .authWithPassword("admin@email.com", "Q!W@e3r4");
  await client.collection("test").create({ time: new Date().toString() });
});