document.addEventListener("DOMContentLoaded", () => {
  const authZone = document.getElementById("auth-zone");
  const token = localStorage.getItem("token");
  const userName = localStorage.getItem("userName");

  if (token && userName) {
    // Якщо користувач увійшов, міняємо кнопку "Увійти" на його ім'я та кнопку виходу
    authZone.innerHTML = `
      <span class="text-gray-700 font-medium">Привіт, <b class="text-indigo-600">${userName}</b></span>
      <button id="btn-logout" class="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-300 transition">Вийти</button>
    `;

    // Логіка кнопки виходу
    document.getElementById("btn-logout").addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("userName");
      window.location.reload(); // Перезавантажуємо сторінку
    });
  }
});