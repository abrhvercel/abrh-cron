export const LOG = (data, showDate = true) => {
  let msg = '';
  if (showDate) {
    msg += `[${new Date().toISOString()}]: `
  }

  msg += `${data}`;

  console.log(msg)

  return msg
};
