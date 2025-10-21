import Fastify from "fastify";
import { checkTransactions } from "./transactions.js";
import { runNotas } from "./cron/notas/index.js";
import { nfeMonitor } from "./utils/nfe-monitor.js";
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

fastify.get("/transactions", async function handler(request, reply) {
  const response = await checkTransactions();
  reply.send(response);
});

// Endpoint para monitoramento de NFe
fastify.get("/nfe/report", async function handler(request, reply) {
  const report = await nfeMonitor.generateReport();
  reply.send(report);
});

// Endpoint para exportar relatório
fastify.get("/nfe/export", async function handler(request, reply) {
  const filename = await nfeMonitor.exportReport();
  reply.send({ filename, message: "Relatório exportado com sucesso" });
});

// Endpoint para estatísticas de duplicidade
fastify.get("/nfe/stats", async function handler(request, reply) {
  const stats = await nfeMonitor.generateReport();
  reply.send(stats?.summary || { message: "Erro ao gerar estatísticas" });
});

fastify.listen({ port: 3001, host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

// TODO DIA A CADA 5 MINUTOS
cron.schedule('*/15 * * * *', async () => {
  const response = await runNotas();
  console.log(response);
});


// TODO DIA as 08h e 16h
// cron.schedule('0 8,16 * * *', async () =>  {
//   const response = await runNotas();
//   console.log(response)
// });
