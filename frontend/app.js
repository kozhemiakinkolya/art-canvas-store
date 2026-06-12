document.addEventListener("DOMContentLoaded", () => {
  const authZone = document.getElementById("auth-zone");
  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");

  if (authZone) {
    if (token && userRaw) {
      const user = JSON.parse(userRaw);
      authZone.innerHTML = `
        <div class="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-200 shadow-sm">
          <span class="text-sm font-semibold text-gray-700">👤 ${user.name}</span>
          <button id="btn-logout" class="text-xs text-red-500 hover:text-red-700 font-bold uppercase tracking-wider transition ml-2">Вийти</button>
        </div>
      `;

      document.getElementById("btn-logout").addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        alert("👋 Ви вийшли з акаунту");
        window.location.href = "index.html";
      });
    } else {
      authZone.innerHTML = `
        <a href="auth.html" class="bg-indigo-600 text-white px-5 py-2 rounded-full hover:bg-indigo-700 transition shadow">Увійти</a>
      `;
    }
  }
});
