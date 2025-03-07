import { runEmitirNotas } from "./emitir-notas.cron.js";

export const runNotas = async () => {
  const response = {}
  response.emitirNotas = await runEmitirNotas()
  return response
};
