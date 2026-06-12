document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const dropText = document.getElementById("drop-text");
  const imgPreview = document.getElementById("img-preview");
  
  const orderSize = document.getElementById("order-size");
  const priceDisplay = document.getElementById("price-display");
  const formOrder = document.getElementById("form-custom-order");
  const btnSubmit = document.getElementById("btn-submit-order");

  // Словник цін для різних розмірів полотна
  const priceList = {
    "30x40 см": 600,
    "40x60 см": 850,
    "50x70 см": 1200,
    "60x80 см": 1600
  };

  // 1. Динамічна зміна ціни на екрані
  orderSize.addEventListener("change", (e) => {
    const selectedSize = e.target.value;
    priceDisplay.innerText = priceList[selectedSize];
  });

  // 2. Логіка відкриття файлового менеджера при кліку на зону
  dropZone.addEventListener("click", () => fileInput.click());

  // Візуальні ефекти при перетягуванні файлу мишкою (Drag and Drop)
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("border-indigo-500", "bg-indigo-50/50");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("border-indigo-500", "bg-indigo-50/50");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-indigo-500", "bg-indigo-50/50");
    
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      handleFilePreview(e.dataTransfer.files[0]);
    }
  });

  // Обробка вибору файлу через стандартний клік
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFilePreview(e.target.files[0]);
    }
  });

  // Функція створення мініатюри (прев'ю) картинки
  function handleFilePreview(file) {
    if (!file.type.startsWith("image/")) {
      alert("Будь ласка, завантажте файл зображення!");
      return;
    }
    
    dropText.innerText = `Обрано файл: ${file.name}`;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      imgPreview.src = e.target.result;
      imgPreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }

  // 3. ВІДПРАВКА ФОРМИ ЗАМОВЛЕННЯ НА СЕРВЕР
  formOrder.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    // Захист: Перевіряємо токен перед замовленням
    if (!token) {
      alert("Для замовлення картини по фотографії вам необхідно авторизуватися!");
      window.location.href = "auth.html";
      return;
    }

    if (!fileInput.files[0]) {
      alert("Будь ласка, додайте фотографію для замовлення.");
      return;
    }

    // Створюємо FormData, оскільки надсилаємо файл
    const formData = new FormData();
    formData.append("orderType", "by_photo");
    formData.append("photo", fileInput.files[0]); // файл підхоплюється multer на бекенді по ключу 'photo'
    formData.append("size", orderSize.value);
    formData.append("material", document.getElementById("order-material").value);
    formData.append("comment", document.getElementById("order-comment").value);
    formData.append("totalPrice", priceList[orderSize.value]);

    try {
      btnSubmit.innerText = "Надсилання...";
      btnSubmit.disabled = true;

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
          // ПРИМІТКА: Content-Type для FormData браузер виставить автоматично разом із boundary!
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        alert("🎉 Ваша фотографія успішно надіслана художнику! Ми розрахуємо деталі й зв'яжемося з вами.");
        formOrder.reset();
        imgPreview.classList.add("hidden");
        dropText.innerText = "Перетягніть фото сюди або клацніть для вибору файлу";
      } else {
        alert(data.msg || "Сталася помилка при відправці");
      }
    } catch (err) {
      console.error(err);
      alert("Не вдалося з'єднатися з сервером.");
    } finally {
      btnSubmit.innerText = "🚀 Надіслати замовлення";
      btnSubmit.disabled = false;
    }
  });
});