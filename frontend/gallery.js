document.addEventListener("DOMContentLoaded", async () => {
  const galleryGrid = document.getElementById("gallery-grid");
  if (!galleryGrid) return;

  try {
    // Відносний шлях для завантаження списку картин
    const response = await fetch("/api/paintings");
    const paintings = await response.json();

    if (response.ok) {
      galleryGrid.innerHTML = "";
      paintings.forEach(art => {
        const card = document.createElement("div");
        card.className = "bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 flex flex-col hover:shadow-lg transition";
        card.innerHTML = `
          <img src="${art.imageUrl}" alt="${art.title}" class="w-full h-64 object-cover">
          <div class="p-6 flex-grow flex flex-col justify-between">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-indigo-500">${art.category}</span>
              <h3 class="text-xl font-bold mt-1 text-gray-900">${art.title}</h3>
              <p class="text-sm text-gray-500 mt-2 line-clamp-3">${art.description}</p>
              <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
                <div><strong>Техніка:</strong> ${art.technique}</div>
                <div><strong>Розмір:</strong> ${art.size}</div>
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
    galleryGrid.innerHTML = `<p class="text-center text-red-500 py-12">Не вдалося завантажити каталог картин.</p>`;
  }
});

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

    const data = await response.ok ? await response.json() : null;
    if (data) alert(`🎉 ${data.msg}\nВи замовили картину "${title}".`);
  } catch (err) {
    alert("Помилка оформлення замовлення.");
  }
}
