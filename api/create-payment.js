// /api/create-payment.js --- ОТЛАДОЧНАЯ ВЕРСИЯ ---

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
    const PAYTREE_API_KEY = process.env.PAYTREE_API_KEY;
    if (!PAYTREE_API_KEY) {
      throw new Error("API ключ Paytree не настроен на сервере.");
    }

    const bodyForApi = request.body; // Просто пересылаем то, что пришло с фронта
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

    // --- НОВЫЙ КОД ДЛЯ ОТЛАДКИ ---
    // Получаем ответ от сервера как сырой текст, чтобы ничего не упустить
    const rawResponseText = await paytreeResponse.text();

    // Выводим в логи Vercel абсолютно всё, что получили
    console.log("--- RAW RESPONSE FROM PAYTREE API ---");
    console.log("Status:", paytreeResponse.status, paytreeResponse.statusText);
    console.log("Headers:", paytreeResponse.headers);
    console.log("Response Body (Raw Text):", rawResponseText);
    console.log("------------------------------------");

    // Пытаемся обработать ответ
    if (!paytreeResponse.ok) {
      // Отправляем на фронтенд сырой текст ошибки, чтобы увидеть его в браузере
      throw new Error(
        `API Error ${paytreeResponse.status}: ${rawResponseText}`
      );
    }

    const paytreeData = JSON.parse(rawResponseText); // Парсим текст вручную
    const paymentLink = paytreeData.payment_link;

    return response.status(200).json({ payment_link: paymentLink });
  } catch (error) {
    console.error("[BACKEND_ERROR]", error.message);
    return response.status(500).json({ message: error.message });
  }
}
