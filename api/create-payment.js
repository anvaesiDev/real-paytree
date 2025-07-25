// /api/create-payment.js --- ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ ---

import { randomUUID } from "crypto";

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
    return response.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const PAYTREE_API_KEY = process.env.PAYTREE_API_KEY;
    if (!PAYTREE_API_KEY) {
      console.error("API ключ Paytree не настроен на сервере.");
      return response
        .status(500)
        .json({ message: "Внутренняя ошибка конфигурации сервера." });
    }

    // 1. Получаем данные с фронтенда
    const { amount, currency, description, customer, address } = request.body;

    if (!amount || !currency || !customer) {
      return response.status(400).json({
        message:
          "Недостаточно данных в запросе: требуются amount, currency и customer.",
      });
    }

    // 2. *** НОВОЕ: Получаем IP и User-Agent из заголовков запроса ***
    // Vercel передает IP в заголовке 'x-forwarded-for'.
    const ipAddress = request.headers["x-forwarded-for"] || "127.0.0.1";
    const userAgent = request.headers["user-agent"] || "Unknown";

    // 3. Формируем ПОЛНЫЙ объект для отправки в Paytree API
    const payloadForPaytree = {
      transaction_ref: `TX-${randomUUID()}`,
      client_ref: `CL-${randomUUID()}`,
      amount: amount,
      amount_currency: currency,
      description: description,
      customer: customer,
      address: address,

      // Ссылки для редиректа и ДАННЫЕ СЕССИИ
      session: {
        // !!! ВАЖНО: Замените на ваши реальные URL
        success_url: "https://your-site.com/payment-success",
        cancel_url: "https://your-site.com/payment-cancelled",

        // *** ДОБАВЛЕНО: IP-адрес и User-Agent пользователя ***
        ip_address: ipAddress,
        user_agent: userAgent, // Также передаем User-Agent, как просил разработчик
      },

      // URL для получения вебхука
      callback: {
        // !!! ВАЖНО: Замените на ваш реальный URL для вебхуков
        callback_url: "https://your-backend.vercel.app/api/payment-webhook",
      },
    };

    // 4. Отправляем запрос в Paytree
    const PAYTREE_API_URL =
      "https://api.payforest.xyz/v1/transaction/payment_intent/";

    const paytreeResponse = await fetch(PAYTREE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${PAYTREE_API_KEY}`,
      },
      body: JSON.stringify(payloadForPaytree),
    });

    const responseData = await paytreeResponse.json();

    if (!paytreeResponse.ok) {
      console.error("Ошибка от API Paytree:", responseData);
      throw new Error(
        `API Error ${paytreeResponse.status}: ${JSON.stringify(responseData)}`
      );
    }

    // 5. Возвращаем ссылку на оплату на фронтенд
    return response
      .status(200)
      .json({ payment_link: responseData.payment_link });
  } catch (error) {
    console.error("[BACKEND_ERROR]", error.message);
    return response.status(500).json({ message: error.message });
  }
}
