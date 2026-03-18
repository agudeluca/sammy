import { getCommunities, createCommunity, Community } from "../api";

export function CommunitySelector(
  container: HTMLElement,
  onChange: (community: Community) => void
) {
  let communities: Community[] = [];
  let selected: Community | null = null;

  const root = document.createElement("div");
  root.style.cssText = "display:flex;gap:8px;align-items:center;margin-bottom:16px;";

  const select = document.createElement("select");
  select.style.cssText =
    "padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;flex:1;";

  const btn = document.createElement("button");
  btn.textContent = "+ Nueva";
  btn.style.cssText =
    "padding:8px 14px;background:#1a1a1a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;white-space:nowrap;";

  root.append(select, btn);
  container.appendChild(root);

  async function load() {
    communities = await getCommunities();
    select.innerHTML = '<option value="">Seleccionar comunidad…</option>';
    for (const c of communities) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    }
    if (selected) select.value = selected.id;
  }

  select.addEventListener("change", () => {
    const c = communities.find((x) => x.id === select.value);
    if (c) {
      selected = c;
      onChange(c);
    }
  });

  btn.addEventListener("click", async () => {
    const name = prompt("Nombre de la comunidad:");
    if (!name?.trim()) return;
    const c = await createCommunity(name.trim());
    communities.push(c);
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
    select.value = c.id;
    selected = c;
    onChange(c);
  });

  load();
  return { reload: load };
}
