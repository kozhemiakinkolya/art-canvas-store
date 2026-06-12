document.addEventListener("DOMContentLoaded", () => {
  const formCustom = document.getElementById("form-custom-order");
  if (!formCustom) return;

  formCustom.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("🔒 Будь ласка, увійдіть у свій акаунт, щоб надіслати заявку!");
      window.location.href = "auth.html";
      return;
    }

    const size = document.getElementById("canvas-size").value;
    const material = document.getElementById("canvas-material").value;
    const comment = document.getElementById("order-comment").value.trim();
    const fileInput = document.getElementById("photo-file");

    if (!fileInput.files[0]) {
      alert("Будь ласка, завантажте зображення!");
      return;
    }

    // Створюємо FormData для відправки файлу на бекенд
    const formData = new FormData();
    formData.append("orderType", "by_photo");
    formData.append("size", size);
    formData.append("material", material);
    formData.append("comment", comment);
    formData.append("photo", fileInput.files[0]);
    formData.append("totalPrice", 1500); // Базова ціна під розрахунок

    try {
      const response = await fetch("/api/paintings/order", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        alert("🎉 Заявку успішно надіслано! Ми зв'яжемося з вами.");
        formCustom.reset();
      } else {
        alert(data.msg || "Помилка відправки.");
      }
    } catch (err) {
      console.error(err);
      alert("Не вдалося з'єднатися з сервером.");
    }
  });
});
