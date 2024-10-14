export const LOG = (data, showDate = true) => {
  if (showDate) {
    console.log(`${new Date().toISOString()}`);
  }

  console.log(`${data}`);
};
