document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("paintings-grid");
  const btnApply = document.getElementById("btn-apply-filters");
  
  const filterCategory = document.getElementById("filter-category");
  const filterTechnique = document.getElementById("filter-technique");
  const filterPrice = document.getElementById("filter-price");
  const priceVal = document.getElementById("price-val");

  // Модальне вікно
  const modal = document.getElementById("purchase-modal");
  const modalClose = document.getElementById("modal-close");
  const modalCancel = document.getElementById("modal-cancel");
  const modalConfirm = document.getElementById("modal-confirm");
  const modalPaintingName = document.getElementById("modal-painting-name");

  let selectedPaintingId = null;
  let selectedPaintingPrice = 0;

  // Оновлення тексту ціни під час руху повзунка
  filterPrice.addEventListener("input", (e) => {
    priceVal.innerText = e.target.value;
  });

  // ==========================================
  // ФУНКЦІЯ ЗАВАНТАЖЕННЯ КАРТИН З СЕРВЕРА
  // ==========================================
  async function loadPaintings() {
    grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500 animate-pulse">Оновлення галереї...</div>`;
    
    const category = filterCategory.value;
    const technique = filterTechnique.value;
    const priceMax = filterPrice.value;

    // Формуємо URL-параметри для фільтрації
    let url = `http://localhost:5000/api/paintings?`;
    if (category) url += `category=${category}&`;
    if (technique) url += `technique=${technique}&`;
    if (priceMax) url += `priceMax=${priceMax}`;

    try {
      const response = await fetch(url);
      const paintings = await response.json();

      if (paintings.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500 font-medium">Карт за такими критеріями не знайдено 😔</div>`;
        return;
      }

      grid.innerHTML = ""; // Очищаємо заглушку завантаження

      // Генеруємо картку для кожної картини
      paintings.forEach(art => {
        const card = document.createElement("div");
        card.className = "bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:shadow-xl transition duration-300 flex flex-col";
        
        // На бекенді шлях збережений як /uploads/імя.jpg. Додаємо до хосту сервера.
        const fullImageUrl = `http://localhost:5000${art.imageUrl}`;

        card.innerHTML = `
          <div class="h-56 bg-gray-200 overflow-hidden relative">
            <img src="${fullImageUrl}" alt="${art.title}" class="w-full h-full object-cover hover:scale-105 transition duration-500">
            <span class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-xs font-bold px-3 py-1 rounded-full text-gray-700 shadow-sm">
              ${art.size}
            </span>
          </div>
          <div class="p-5 flex-grow flex flex-col justify-between">
            <div>
              <div class="flex gap-2 mb-1.5">
                <span class="text-[10px] uppercase font-extrabold tracking-wider bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">${art.category}</span>
                <span class="text-[10px] uppercase font-extrabold tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded">${art.technique}</span>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-1">${art.title}</h3>
              <p class="text-sm text-gray-500 line-clamp-2 mb-4">${art.description || 'Без опису.'}</p>
            </div>
            <div class="flex justify-between items-center pt-3 border-t border-gray-50">
              <span class="text-xl font-black text-gray-900">${art.price} <small class="text-xs font-medium text-gray-500">грн</small></span>
              <button class="btn-buy bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition" 
                      data-id="${art._id}" data-title="${art.title}" data-price="${art.price}">
                Купити
              </button>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });

      // Навішуємо кліки на всі згенеровані кнопки "Купити"
      document.querySelectorAll(".btn-buy").forEach(button => {
        button.addEventListener("click", (e) => {
          openModal(e.target.dataset.id, e.target.dataset.title, e.target.dataset.price);
        });
      });

    } catch (err) {
      console.error(err);
      grid.innerHTML = `<div class="col-span-full text-center py-12 text-red-500">Помилка з'єднання з сервером галереї.</div>`;
    }
  }

  // ==========================================
  // РОБОТА З МОДАЛЬНИМ ВІКНОМ ПОКУПКИ
  // ==========================================
  function openModal(id, title, price) {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Щоб купити картину, вам необхідно авторизуватися!");
      window.location.href = "auth.html";
      return;
    }
    selectedPaintingId = id;
    selectedPaintingPrice = Number(price);
    modalPaintingName.innerText = `"${title}"`;
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
    selectedPaintingId = null;
  }

  modalClose.addEventListener("click", closeModal);
  modalCancel.addEventListener("click", closeModal);

  // ПІДТВЕРДЖЕННЯ ПОКУПКИ (НАДСИЛАННЯ ЗАМОВЛЕННЯ)
  modalConfirm.addEventListener("click", async () => {
    const token = localStorage.getItem("token");
    if (!selectedPaintingId || !token) return;

    const orderData = {
      orderType: "catalog",
      items: JSON.stringify([selectedPaintingId]), // Сервер очікує масив ID у форматі JSON-рядка
      totalPrice: selectedPaintingPrice
    };

    try {
      modalConfirm.innerText = "Обробка...";
      modalConfirm.disabled = true;

      const response = await fetch("http://localhost:5000/api/paintings/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (response.ok) {
        alert("🎉 Дякуємо за покупку! Картину успішно заброньовано за вами. Автор зв'яжеться для уточнення доставки.");
        closeModal();
        loadPaintings(); // Перезавантажуємо галерею (куплена картина зникне, бо змінить статус isAvailable)
      } else {
        alert(data.msg || "Не вдалося оформити замовлення");
      }
    } catch (err) {
      console.error(err);
      alert("Помилка зв'язку з сервером.");
    } finally {
      modalConfirm.innerText = "Купити";
      modalConfirm.disabled = false;
    }
  });

  // Перший запуск завантаження картинок при відкритті сторінки
  btnApply.addEventListener("click", loadPaintings);
  loadPaintings();
});