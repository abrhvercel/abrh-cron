import { runEmitirNotas } from "./emitir-notas.cron.js";
import { runVerificarStatusNotas } from "./verificar-status-notas.cron.js";

export const runNotas = async () => {
  const response = {}
  response.verificarStatusNotas = await runVerificarStatusNotas()
  response.emitirNotas = await runEmitirNotas()
  return response
};
