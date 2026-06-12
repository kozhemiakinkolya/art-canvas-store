document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("paint-canvas");
  const ctx = canvas.getContext("2d");
  
  const colorPicker = document.getElementById("color-picker");
  const brushSizeInput = document.getElementById("brush-size");
  const brushSizeVal = document.getElementById("brush-size-val");
  
  const btnBrush = document.getElementById("btn-brush");
  const btnEraser = document.getElementById("btn-eraser");
  const btnClear = document.getElementById("btn-clear");
  const btnOrder = document.getElementById("btn-order-canvas");

  // Початкові налаштування Canvas
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height); // робимо фон білим, а не прозорим
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let isDrawing = false;
  let currentColor = "#000000";
  let currentWidth = 5;
  let isEraser = false;

  // Слідкуємо за налаштуваннями
  colorPicker.addEventListener("input", (e) => {
    currentColor = e.target.value;
    if (!isEraser) ctx.strokeStyle = currentColor;
  });

  brushSizeInput.addEventListener("input", (e) => {
    currentWidth = e.target.value;
    brushSizeVal.innerText = currentWidth;
    ctx.lineWidth = currentWidth;
  });

  // Режими: Пензель / Ластик
  btnBrush.addEventListener("click", () => {
    isEraser = false;
    ctx.strokeStyle = currentColor;
    btnBrush.className = "w-full bg-indigo-600 text-white py-2 px-3 rounded-lg font-medium text-sm transition";
    btnEraser.className = "w-full bg-white text-gray-700 border border-gray-300 py-2 px-3 rounded-lg font-medium text-sm hover:bg-gray-100 transition";
  });

  btnEraser.addEventListener("click", () => {
    isEraser = true;
    ctx.strokeStyle = "#FFFFFF"; // стирання — це просто малювання білим кольором
    btnEraser.className = "w-full bg-indigo-600 text-white py-2 px-3 rounded-lg font-medium text-sm transition";
    btnBrush.className = "w-full bg-white text-gray-700 border border-gray-300 py-2 px-3 rounded-lg font-medium text-sm hover:bg-gray-100 transition";
  });

  // Очищення екрану
  btnClear.addEventListener("click", () => {
    if(confirm("Очистити все полотно? Намальоване буде втрачено.")) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  });

  // Логіка малювання (Події миші)
  function startDrawing(e) {
    isDrawing = true;
    draw(e);
  }

  function stopDrawing() {
    isDrawing = false;
    ctx.beginPath(); // скидаємо лінію, щоб не тягнулася за мишкою при новому кліку
  }

  function draw(e) {
    if (!isDrawing) return;

    // Отримуємо правильні координати курсора відносно Canvas
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = currentWidth;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing);

  // ==========================================
  // ВІДПРАВКА НАМАЛЬОВАНОГО НА БЕКЕНД
  // ==========================================
  btnOrder.addEventListener("click", async () => {
    const token = localStorage.getItem("token");

    // Захист: Перевіряємо авторизацію перед замовленням
    if (!token) {
      alert("Для замовлення картини вам необхідно авторизуватися на сайті!");
      window.location.href = "auth.html";
      return;
    }

    // Перетворюємо малюнок з Canvas в base64 рядок зображення
    const canvasDataUrl = canvas.toDataURL("image/png");

    const orderData = {
      orderType: "canvas_editor",
      canvasImage: canvasDataUrl,
      size: "40x60 см",
      material: "Полотно преміум",
      comment: "Створено користувачем в онлайн-редакторі",
      totalPrice: 450
    };

    try {
      btnOrder.innerText = "Оформлення...";
      btnOrder.disabled = true;

      const response = await fetch("http://localhost:5000/api/paintings/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // передаємо токен авторизації
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (response.ok) {
        alert("🎉 Вітаємо! Ваше замовлення успішно прийнято. Ми зв'яжемося з вами для підтвердження.");
        // Очищаємо після замовлення
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        alert(data.msg || "Помилка при оформленні замовлення");
      }
    } catch (err) {
      console.error(err);
      alert("Помилка з'єднання з сервером.");
    } finally {
      btnOrder.innerText = "🚀 Замовити друк полотна";
      btnOrder.disabled = false;
    }
  });
});