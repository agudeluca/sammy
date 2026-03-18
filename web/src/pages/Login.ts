import { login } from "../api";
import { setToken } from "../auth";

export function LoginPage(container: HTMLElement) {
  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f5f5;";

  const card = document.createElement("div");
  card.style.cssText =
    "background:#fff;padding:40px;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,.08);width:100%;max-width:360px;";

  const title = document.createElement("h1");
  title.textContent = "Sammy";
  title.style.cssText = "font-size:24px;margin-bottom:8px;";

  const subtitle = document.createElement("p");
  subtitle.textContent = "Document chatbot";
  subtitle.style.cssText = "color:#666;font-size:14px;margin-bottom:28px;";

  const usernameInput = document.createElement("input");
  usernameInput.type = "text";
  usernameInput.placeholder = "Usuario";
  usernameInput.style.cssText = fieldStyle();

  const passwordInput = document.createElement("input");
  passwordInput.type = "password";
  passwordInput.placeholder = "Contraseña";
  passwordInput.style.cssText = fieldStyle();

  const errorMsg = document.createElement("p");
  errorMsg.style.cssText = "color:#ef4444;font-size:13px;margin-bottom:8px;display:none;";

  const btn = document.createElement("button");
  btn.textContent = "Ingresar";
  btn.style.cssText =
    "width:100%;padding:12px;background:#1a1a1a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:15px;margin-top:4px;";

  card.append(title, subtitle, usernameInput, passwordInput, errorMsg, btn);
  wrapper.appendChild(card);
  container.appendChild(wrapper);

  usernameInput.focus();

  async function submit() {
    errorMsg.style.display = "none";
    btn.disabled = true;
    btn.textContent = "…";
    try {
      const { token } = await login(
        usernameInput.value.trim(),
        passwordInput.value
      );
      setToken(token);
      window.location.href = "/admin";
    } catch {
      errorMsg.textContent = "Usuario o contraseña incorrectos.";
      errorMsg.style.display = "block";
    } finally {
      btn.disabled = false;
      btn.textContent = "Ingresar";
    }
  }

  btn.addEventListener("click", submit);
  [usernameInput, passwordInput].forEach((el) =>
    el.addEventListener("keydown", (e) => e.key === "Enter" && submit())
  );
}

function fieldStyle() {
  return "width:100%;padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px;font-family:inherit;";
}
