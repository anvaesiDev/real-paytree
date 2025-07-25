// /api/create-payment.js --- ИСПРАВЛЕННАЯ ВЕРСИЯ ---

import { randomUUID } from "crypto"; // Импортируем модуль для генерации уникальных ID

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

  // Проверяем, что это POST-запрос
  if (request.method !== "POST") {
    return response.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const PAYTREE_API_KEY = process.env.PAYTREE_API_KEY;
    if (!PAYTREE_API_KEY) {
      // Это серверная ошибка, поэтому статус 500
      console.error("API ключ Paytree не настроен на сервере.");
      return response
        .status(500)
        .json({ message: "Внутренняя ошибка конфигурации сервера." });
    }

    // 1. Получаем данные с фронтенда
    const { amount, currency, description, customer, address } = request.body;

    // Проверяем, что все базовые данные пришли
    if (!amount || !currency || !customer) {
      return response.status(400).json({
        message:
          "Недостаточно данных в запросе: требуются amount, currency и customer.",
      });
    }

    // 2. Формируем ПОЛНЫЙ объект для отправки в Paytree API
    const payloadForPaytree = {
      // Уникальные идентификаторы транзакции
      transaction_ref: `TX-${randomUUID()}`,
      client_ref: `CL-${randomUUID()}`,

      // Информация о платеже из запроса
      amount: amount,
      amount_currency: currency, // API требует поле amount_currency
      description: description,

      // Данные клиента из запроса
      customer: customer,

      // Адрес из запроса
      address: address,

      // Ссылки для редиректа пользователя после оплаты
      session: {
        // !!! ВАЖНО: Замените на ваши реальные URL
        success_url: "https://your-site.com/payment-success",
        cancel_url: "https://your-site.com/payment-cancelled",
      },

      // URL для получения вебхука (уведомления) от Paytree
      callback: {
        // !!! ВАЖНО: Замените на ваш реальный URL для вебхуков
        callback_url: "https://your-backend.vercel.app/api/payment-webhook",
      },
    };

    // 3. Отправляем запрос в Paytree
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
      // Если API Paytree вернуло ошибку, логируем и отправляем ее на фронтенд
      console.error("Ошибка от API Paytree:", responseData);
      throw new Error(
        `API Error ${paytreeResponse.status}: ${JSON.stringify(responseData)}`
      );
    }

    // 4. Возвращаем ссылку на оплату на фронтенд
    return response
      .status(200)
      .json({ payment_link: responseData.payment_link });
  } catch (error) {
    console.error("[BACKEND_ERROR]", error.message);
    // Возвращаем статус 500 для внутренних ошибок сервера
    return response.status(500).json({ message: error.message });
  }
}
