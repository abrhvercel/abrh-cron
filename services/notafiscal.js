
import fetchToCurl from "fetch-to-curl";
import { LOG } from "../utils/log.js";

const notafiscalHeaders = () => {
  return {
    headers: {
      "X-Api-Key": process.env.SPEDY_API_KEY,
      "Content-Type": "application/json",
    },
  };
};

const postNFSe = async (item, settings) => {
  const body = {
    description: settings.description,
    federalServiceCode: settings.cnae,
    cityServiceCode: settings.cityServiceCode,
    cnaeCode: settings.federalServiceCode,
    receiver: {
      name: item.client,
      federalTaxNumber: item.cnpjOrCpf,
      email: item.customerEmail,
      phoneNumber: item.phone,
      address: {
        street: item.address,
        city: {
          name: item.city,
          state: item.un
        },
        number: item.number,
        country: item.country,
        district: item.neighborhood,
        postalCode: item.zipcode,
      },
    },
    total: {
      invoiceAmount: item.purchaseValue,
    },
  };
  
  const url = `${process.env.SPEDY_API_URL}/service-invoices`;
  const config = {
    ...notafiscalHeaders(),
    method: "POST",
    body: JSON.stringify(body),
  };
  
  // return ""

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return data;
  } catch (error) {
    LOG(error);
    return "";
  }
};

const getNFSe = async (id) => {
  const url = `${process.env.SPEDY_API_URL}/service-invoices/${id}`;
  const config = {
    ...notafiscalHeaders(),
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return data;
  } catch (error) {
    LOG(error);
    return "";
  }
};

const notafiscalService = {
  postNFSe,
  getNFSe,
};

export default notafiscalService;
