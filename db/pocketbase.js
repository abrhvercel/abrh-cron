import PocketBase from "pocketbase";

const getClient = async () => {
  try {
    const client = new PocketBase(process.env.POCKETBASE_URL);
    await client
      .collection("users")
      .authWithPassword(
        process.env.POCKETBASE_USER,
        process.env.POCKETBASE_PASSWORD
      );
    return client;
  } catch (error) {
    console.error(error.response);
    return false;
  }
};

const pocketbaseClient = {
  getClient,
};

export default pocketbaseClient;
