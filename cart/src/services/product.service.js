async function checkAvailability() {
  return { available: true };
}

async function reserveSoftStock() {
  return { reserved: true };
}

module.exports = {
  checkAvailability,
  reserveSoftStock,
};
