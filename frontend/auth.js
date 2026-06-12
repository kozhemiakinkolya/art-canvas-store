document.addEventListener("DOMContentLoaded", () => {
  // Елементи перемикання форм (Вхід / Реєстрація)
  const loginBox = document.getElementById("login-box");
  const registerBox = document.getElementById("register-box");
  const toRegisterBtn = document.getElementById("to-register");
  const toLoginBtn = document.getElementById("to-login");

  // Форми та їхні поля
  const formLogin = document.getElementById("form-login");
  const formRegister = document.getElementById("form-register");

  // ==========================================
  // 1. ЛОГІКА ПЕРЕМИКАННЯ ЕКРАНІВ
  // ==========================================
  if (toRegisterBtn && toLoginBtn) {
    toRegisterBtn.addEventListener("click", () => {
      loginBox.classList.add("hidden");
      registerBox.classList.remove("hidden");
    });

    toLoginBtn.addEventListener("click", () => {
      registerBox.classList.add("hidden");
      loginBox.classList.remove("hidden");
    });
  }

  // ==========================================
  // 2. ОБРОБКА РЕЄСТРАЦІЇ КОРИСТУВАЧА
  // ==========================================
  if (formRegister) {
    formRegister.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("register-name").value.trim();
      const email = document.getElementById("register-email").value.trim();
      const password = document.getElementById("register-password").value;

      if (password.length < 6) {
        alert("Пароль має бути не менше 6 символів!");
        return;
      }

      try {
        // Використовуємо відносний шлях для автоматичного підлаштування під Railway
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
          // Зберігаємо отримані дані в локальне сховище браузера
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));

          alert(`🎉 Реєстрація успішна! Вітаємо, ${data.user.name}.`);
          // Перенаправляємо на головну сторінку
          window.location.href = "index.html";
        } else {
          // Виводимо повідомлення про помилку від сервера (наприклад, "Email вже існує")
          alert(data.msg || "Сталася помилка під час реєстрації");
        }
      } catch (err) {
        console.error("Помилка реєстрації:", err);
        alert("Не вдалося з'єднатися з сервером. Перевірте, чи запущений ваш бекенд на Railway.");
      }
    });
  }

  // ==========================================
  // 3. ЛОГІКА ВХОДУ (ЛОГІНУ)
  // ==========================================
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));

          alert(`👋 З поверненням, ${data.user.name}!`);
          window.location.href = "index.html";
        } else {
          alert(data.msg || "Неправильний Email або пароль");
        }
      } catch (err) {
        console.error("Помилка входу:", err);
        alert("Не вдалося з'єднатися з сервером.");
      }
    });
  }
});
