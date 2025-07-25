// /api/create-payment.js для Paytree/Payforest

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

  if (request.method !== "POST") {
    return response.status(405).json({ message: "Only POST requests allowed" });
  }

  try {
    const { amount, currency, description } = request.body;
    const PAYTREE_API_KEY = process.env.PAYTREE_API_KEY; // Ключ из Vercel

    if (!PAYTREE_API_KEY) {
      throw new Error("API ключ Paytree не настроен на сервере.");
    }

    // --- Получаем IP и User Agent из заголовков запроса ---
    const ip =
      request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    const userAgent = request.headers["user-agent"];
    // ---------------------------------------------------

    // Формируем тело запроса согласно документации Paytree
    const bodyForApi = {
      amount: amount,
      currency: currency,
      description: description,
      transaction_ref: `order_${Date.now()}`,
      client: {
        ref: `user_${Date.now()}`,
        ip: ip,
        user_agent: userAgent,
      },
      notification_url: `https://your-site.com/webhooks/paytree?id={payment_intent_id}`,
    };

    const PAYTREE_API_URL =
      "https://api.payforest.xyz/v1/transaction/payment_intent/";

    const paytreeResponse = await fetch(PAYTREE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PAYTREE_API_KEY}`, // Аутентификация
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
        paytreeData.detail || "Ошибка от платежной системы Paytree"
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
