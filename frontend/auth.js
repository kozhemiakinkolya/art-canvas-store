const API_URL = "http://localhost:5000/api/auth";

// Перемикання вкладок Вхід / Реєстрація
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const formLogin = document.getElementById("form-login");
const formRegister = document.getElementById("form-register");

tabLogin.addEventListener("click", () => {
  tabLogin.className = "text-xl font-bold text-indigo-600 border-b-2 border-indigo-600 pb-2 focus:outline-none";
  tabRegister.className = "text-xl font-bold text-gray-400 hover:text-indigo-600 pb-2 focus:outline-none";
  formLogin.classList.remove("hidden");
  formRegister.classList.add("hidden");
});

tabRegister.addEventListener("click", () => {
  tabRegister.className = "text-xl font-bold text-indigo-600 border-b-2 border-indigo-600 pb-2 focus:outline-none";
  tabLogin.className = "text-xl font-bold text-gray-400 hover:text-indigo-600 pb-2 focus:outline-none";
  formRegister.classList.remove("hidden");
  formLogin.classList.add("hidden");
});

// ОБРОБКА ВХОДУ (LOGIN)
formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userName", data.user.name);
      window.location.href = "index.html"; // Повертаємо на головну сторінку
    } else {
      alert(data.msg || "Помилка входу");
    }
  } catch (err) {
    console.error(err);
    alert("Не вдалося з'єднатися з сервером");
  }
});

// ОБРОБКА РЕЄСТРАЦІЇ (REGISTER)
formRegister.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("reg-name").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userName", data.user.name);
      window.location.href = "index.html";
    } else {
      alert(data.msg || "Помилка реєстрації");
    }
  } catch (err) {
    console.error(err);
    alert("Не вдалося з'єднатися з сервером");
  }
});