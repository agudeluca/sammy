import { isLoggedIn } from "./auth";
import { LoginPage } from "./pages/Login";
import { AdminPage } from "./pages/Admin";
import { ChatPage } from "./pages/Chat";

const app = document.getElementById("app")!;

function route() {
  const path = window.location.pathname;

  if (path === "/login" || path === "/") {
    if (isLoggedIn()) {
      window.location.replace("/admin");
      return;
    }
    LoginPage(app);
    return;
  }

  if (!isLoggedIn()) {
    window.location.replace("/login");
    return;
  }

  if (path === "/admin") {
    AdminPage(app);
  } else if (path === "/chat") {
    ChatPage(app);
  } else {
    window.location.replace("/admin");
  }
}

window.addEventListener("popstate", route);
document.addEventListener("click", (e) => {
  const target = e.target as HTMLAnchorElement;
  if (target.tagName === "A" && target.href.startsWith(window.location.origin)) {
    e.preventDefault();
    window.history.pushState({}, "", target.href);
    route();
  }
});

route();
