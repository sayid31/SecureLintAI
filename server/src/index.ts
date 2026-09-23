// Muat .env (PORT, CLIENT_ORIGIN, DATABASE_URL, API key AI) SEBELUM app.
import "dotenv/config";

import app from "./app";

const PORT = Number(process.env.PORT ?? 4000);

app.listen(PORT, () => {
  console.log(` SecureLint AI API listening on http://localhost:${PORT}`);
});
