document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("paint-canvas");
  const btnSave = document.getElementById("save-canvas-order");
  if (!canvas || !btnSave) return;

  const ctx = canvas.getContext("2d");
  let painting = false;

  // Базове малювання на Canvas
  canvas.width = 500;
  canvas.height = 400;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function startPosition(e) { painting = true; draw(e); }
  function finishedPosition() { painting = false; ctx.beginPath(); }
  function draw(e) {
    if (!painting) return;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#333333";

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  canvas.addEventListener("mousedown", startPosition);
  canvas.addEventListener("mouseup", finishedPosition);
  canvas.addEventListener("mousemove", draw);

  // Відправка замовлення з редактора
  btnSave.addEventListener("click", async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("🔒 Потрібно авторизуватися, щоб зберегти макет!");
      window.location.href = "auth.html";
      return;
    }

    // Перетворюємо малюнок в рядок Base64
    const base64Image = canvas.toDataURL("image/png");

    try {
      const response = await fetch("/api/paintings/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          orderType: "canvas_editor",
          canvasImage: base64Image,
          size: "Власний розмір (Редактор)",
          material: "Полотно звичайне",
          comment: "Створено через онлайн-конструктор",
          totalPrice: 1200
        })
      });

      if (response.ok) {
        alert("🎨 Ваш малюнок успішно збережено як замовлення!");
      } else {
        alert("Помилка збереження.");
      }
    } catch (err) {
      console.error(err);
      alert("Помилка зв'язку з сервером.");
    }
  });
});
