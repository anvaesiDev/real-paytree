// /api/create-payment.js для Paytree/Payforest (убрано поле description)

export default async function handler(request, response) {
  // Настройка CORS
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }

  try {
    const { amount, currency, customer, address } = request.body; // Убрали description отсюда
    const PAYTREE_API_KEY = process.env.PAYTREE_API_KEY;

    if (!PAYTREE_API_KEY) {
      throw new Error("API ключ Paytree не настроен на сервере.");
    }

    const ip =
      request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    const userAgent = request.headers["user-agent"];

    // --- ИЗМЕНЕНИЕ ЗДЕСЬ: Убираем поле description из тела запроса ---
    const bodyForApi = {
      transaction_ref: `order_${Date.now()}`,
      client_ref: `user_${Date.now()}`,
      amount_currency: {
        amount: amount,
        currency: currency,
      },
      // description: description, // <-- УБИРАЕМ ЭТО ПОЛЕ
      customer: customer,
      address: address,
      session: {
        ip: ip,
        user_agent: userAgent,
      },
      callback: `https://your-site.com/callback?id={payment_intent_id}`,
    };
    // --------------------------------------------------------------------

    const PAYTREE_API_URL =
      "https://api.payforest.xyz/v1/transaction/payment_intent/";

    const paytreeResponse = await fetch(PAYTREE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${PAYTREE_API_KEY}`,
      },
      body: JSON.stringify(bodyForApi),
    });

    const paytreeData = await paytreeResponse.json();
    if (!paytreeResponse.ok) {
      console.error(
        "Ошибка от API Paytree:",
        JSON.stringify(paytreeData, null, 2)
      );
      throw new Error(
        paytreeData.message ||
          paytreeData.detail ||
          "Ошибка от платежной системы Paytree"
      );
    }

    const paymentLink = paytreeData.payment_link;
    if (!paymentLink) {
      throw new Error("Не удалось получить payment_link от Paytree");
    }

    return response.status(200).json({ payment_link: paymentLink });
  } catch (error) {
    console.error("[PAYTREE_ERROR]", error.message);
    return response.status(500).json({ message: error.message });
  }
}
