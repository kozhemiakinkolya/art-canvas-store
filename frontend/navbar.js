document.addEventListener("DOMContentLoaded", () => {
  // 1. Оновлюємо посилання, щоб вони підсвічували поточну сторінку (active state)
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll("nav a");
  
  navLinks.forEach(link => {
    const linkPath = link.getAttribute("href");
    if (linkPath === currentPath) {
      link.className = "text-indigo-600 font-bold border-b-2 border-indigo-600 pb-1";
    } else {
      link.className = "text-gray-600 hover:text-indigo-600 transition";
    }
  });

  // 2. Шукаємо зону авторизації у шапці
  const authZone = document.getElementById("auth-zone");
  if (!authZone) return; // Якщо на сторінці немає блоку auth-zone, зупиняємо скрипт

  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");

  // 3. Якщо користувач увійшов, міняємо кнопку "Увійти" на його ім'я та кнопку "Вийти"
  if (token && userRaw) {
    try {
      const user = JSON.parse(userRaw);
      authZone.innerHTML = `
        <div class="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-200 shadow-sm">
          <span class="text-sm font-semibold text-gray-700 flex items-center gap-1">
            👤 ${user.name}
          </span>
          <button id="btn-global-logout" class="text-xs text-red-500 hover:text-red-700 font-black transition ml-1 uppercase tracking-wider">
            Вийти
          </button>
        </div>
      `;

      // Логіка кнопкі "Вийти"
      document.getElementById("btn-global-logout").addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        alert("👋 Ви вийшли з акаунта.");
        window.location.href = "index.html"; // Повертаємо на головну
      });
    } catch (e) {
      console.error("Помилка парсингу користувача з localStorage", e);
    }
  }
});
