import PocketBase from "pocketbase";

const POCKET_BASE_URL = 'https://pocketbaselatest.webit.work';

const getClient = async (username, password) => {
  try {
    const client = new PocketBase(POCKET_BASE_URL);
    await client
      .collection("users")
      .authWithPassword(username, password);
    return client;
  } catch (error) {
    console.error(error.response)
    return false;
  }
};

const pocketbaseClient = {
  getClient
}

export default pocketbaseClient;