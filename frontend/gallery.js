document.addEventListener("DOMContentLoaded", async () => {
  const galleryGrid = document.getElementById("gallery-grid");
  if (!galleryGrid) return;

  try {
    // Запит до нашого оновленого сервера на Railway
    const response = await fetch("/api/paintings");
    const paintings = await response.json();

    if (response.ok) {
      galleryGrid.innerHTML = ""; // Очищаємо завантажувальний текст
      
      if (paintings.length === 0) {
        galleryGrid.innerHTML = `<p class="text-center text-gray-500 py-12 col-span-full">Каталог порожній. Додайте картини через адмінку!</p>`;
        return;
      }

      paintings.forEach(art => {
        // РОЗУМНА ПЕРЕВІРКА URL: якщо це пряме посилання з інтернету (http/https), 
        // залишаємо його як є. Якщо локальний шлях (/uploads/...) — сервер сам його віддасть.
        const finalImageUrl = art.imageUrl.startsWith('http') ? art.imageUrl : art.imageUrl;

        const card = document.createElement("div");
        card.className = "bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 flex flex-col hover:shadow-lg transition";
        card.innerHTML = `
          <img src="${finalImageUrl}" alt="${art.title}" class="w-full h-64 object-cover" onerror="this.src='https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=500'">
          <div class="p-6 flex-grow flex flex-col justify-between">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-indigo-500">${art.category || 'Картина'}</span>
              <h3 class="text-xl font-bold mt-1 text-gray-900">${art.title}</h3>
              <p class="text-sm text-gray-500 mt-2 line-clamp-3">${art.description || 'Без опису'}</p>
              <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
                <div><strong>Техніка:</strong> ${art.technique || 'Не вказано'}</div>
                <div><strong>Розмір:</strong> ${art.size || 'Власний'}</div>
              </div>
            </div>
            <div class="mt-6 flex justify-between items-center pt-4 border-t border-gray-100">
              <span class="text-2xl font-black text-indigo-600">${art.price} грн</span>
              <button onclick="orderPainting('${art._id}', '${art.title}', ${art.price})" class="bg-indigo-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition">Замовити</button>
            </div>
          </div>
        `;
        galleryGrid.appendChild(card);
      });
    }
  } catch (err) {
    console.error("Помилка завантаження галереї:", err);
    galleryGrid.innerHTML = `<p class="text-center text-red-500 py-12 col-span-full">Не вдалося завантажити каталог картин. Перевірте консоль (F12).</p>`;
  }
});

// Функція замовлення картини
async function orderPainting(id, title, price) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("🔒 Щоб зробити замовлення, потрібно авторизуватися!");
    window.location.href = "auth.html";
    return;
  }

  try {
    const response = await fetch("/api/paintings/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        orderType: "catalog",
        totalPrice: price,
        items: JSON.stringify([{ id, title, price }])
      })
    });

    const data = await response.json();
    if (response.ok) {
      alert(`🎉 ${data.msg}\nВи успішно замовили картину "${title}".`);
    } else {
      alert(data.msg || "Помилка оформлення.");
    }
  } catch (err) {
    alert("Помилка зв'язку з сервером.");
  }
}
