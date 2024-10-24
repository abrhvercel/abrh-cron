import { LOG } from "./log.js";
import { sleep } from "./sleep.js";

const NEXT_PAGARME_API_URL = "https://api.pagar.me/1";
const NEXT_PAGARME_API_KEY = "ak_live_jXyd81J9kmLMPZhVJuZN6lo7RZrKa3";

const getTransactions = async (extra) => {
  try {
    const config = {
      method: "GET",
    };
    const url = `${NEXT_PAGARME_API_URL}/transactions?api_key=${NEXT_PAGARME_API_KEY}${extra}`;
    LOG(`BUSCANDO TRANSAÇÕES: ${url}`);
    const response = await fetch(url, config);
    const transactionList = await response.json();
    return transactionList;
  } catch (error) {
    return [];
  }
};

const getCustomers = async (name) => {
  try {
    const config = {
      method: "GET",
    };
    const url = `${NEXT_PAGARME_API_URL}/customers?api_key=${NEXT_PAGARME_API_KEY}&name=${name}`;
    LOG(`BUSCANDO CLIENTE: ${url}`);
    const response = await fetch(url, config);
    const customers = await response.json();
    return customers;
  } catch (error) {
    return [];
  }
};

function differenceInDays(data1, data2) {
  // Converte as datas para objetos Date
  const primeiraData = new Date(data1);
  const segundaData = new Date(data2);

  // Calcula a diferença em milissegundos
  const diferencaMilissegundos = Math.abs(segundaData - primeiraData);

  // Converte milissegundos em dias (1 dia = 24 horas * 60 minutos * 60 segundos * 1000 milissegundos)
  const diferencaDias = Math.ceil(
    diferencaMilissegundos / (1000 * 60 * 60 * 24)
  );

  return diferencaDias;
}

const checkPayment = async (data) => {
  const success = (message, notify = false, cancel = false) => ({
    error: false,
    message,
    notify,
    cancel,
  });

  const error = (message) => ({
    error: true,
    message,
  });

  if (data.empenho === "S") {
    return error(`[${data.process}]: O processo é do tipo Empenho`);
  }

  if (data.paymentStatus.toUpperCase() !== "PENDENTE") {
    return error(`[${data.process}]: O pagamento não está pendente`);
  }

  if (!data.buyDate) {
    return error(`[${data.process}]: O processo não possui data de compra`);
  }

  const now = new Date();
  const buyData = new Date(data.buyDate);

  if (buyData.toString() === "Invalid Date") {
    return error(`[${data.process}]: O processo possui uma data de compra inválida`);
  }

  const difference = Math.abs(differenceInDays(buyData, now));

  if (difference > 3) {
    if (difference < 10 && data.paymentAlertSent) {
      return success(`[${data.process}]: Alerta de pagamento já enviado`);
    }

    if (difference > 10 && data.paymentCancelled) {
      return success(`[${data.process}]: Pagamento cancelado`);
    }

    // BUSCANDO CLIENTE
    const customers = await getCustomers(data.client);

    if (customers.length === 0 || !customers) {
      return error(`[${data.process}]: Cliente não encontrado -> ${data.client}`);
    }

    const customer = customers.find((c) =>
      c.external_id.includes(data.process)
    );

    if (!customer) {
      return error(
        `[${data.process}]: Não consta esse processo para o cliente ${data.client}`
      );
    }

    const transactionList = await getTransactions(
      `&customer[id]=${customer.id}`
    );
    const transaction = transactionList.find(
      (d) => d.customer.external_id.split("|")[0] === data.process
    );

    if (transaction) {
      if (transaction.status === "waiting_payment") {
        if (difference < 10) {
          // Verificando se a transação possui boleto
          if (transaction.boleto_url) {
            data.boleto = transaction.boleto_url;
          }

          // Enviar notificação com mensagem de cobrança
          return success(`[${data.process}]: Enviar notificação com mensagem de cobrança`, true);
        } else {
          // Cancelar transação e enviar mensagem
          return success(`[${data.process}]: Cancelar transação e enviar mensagem`, false, true);
        }
      } else {
        return error(
          `[${data.process}]: Transação não está pendente, status: ${transaction.status}`
        );
      }
    } else {
      return error(`[${data.process}]: Transação não encontrada`);
    }
  } else {
    return success(`[${data.process}]: Pagamento dentro do prazo`);
  }
};

const checkPayments = async (list) => {
  let ret = {
    error: false,
    message: [],
    notify: [],
    cancel: [],
  };

  for (let i = 0; i < list.length; i++) {
    const data = list[i];
    try {
      const payment = await checkPayment(data);

      ret.message.push(payment.message);

      if (payment.error) {
        ret.error = true;
      }

      if (payment.notify) {
        ret.notify.push(data);
      }

      if (payment.cancel) {
        ret.cancel.push(data);
      }
    } catch (error) {
      LOG(error);
    }
    await sleep(2000);
  }

  return ret;
};

const pagarmeService = {
  checkPayments,
};

export default pagarmeService;
