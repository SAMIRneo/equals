(() => {
  const source = document.getElementById("source-content");
  const documentRoot = document.getElementById("document");
  documentRoot.innerHTML = source.innerHTML;

  const slugify = (value) => value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const sections = [];
  let current = null;

  Array.from(documentRoot.children).forEach((node) => {
    if (node.tagName === "H2") {
      const section = document.createElement("section");
      section.className = "doc-section";
      const id = slugify(node.textContent);
      section.id = id;
      node.id = id + "-heading";

      const head = document.createElement("div");
      head.className = "section-head";
      head.appendChild(node);
      const tools = document.createElement("div");
      tools.className = "section-tools";

      const toggle = document.createElement("button");
      toggle.className = "section-tool toggle-section";
      toggle.type = "button";
      toggle.setAttribute("aria-label", "Replier cette section");
      toggle.setAttribute("aria-expanded", "true");
      toggle.textContent = "⌄";
      toggle.addEventListener("click", () => setCollapsed(section, !section.classList.contains("is-collapsed")));

      const copy = document.createElement("button");
      copy.className = "section-tool copy-section";
      copy.type = "button";
      copy.setAttribute("aria-label", "Copier le lien vers cette section");
      copy.title = "Copier le lien vers cette section";
      copy.textContent = "↗";
      copy.addEventListener("click", () => copySectionLink(id));
      tools.append(toggle, copy);
      head.appendChild(tools);

      const body = document.createElement("div");
      body.className = "section-body";
      section.append(head, body);
      documentRoot.appendChild(section);
      current = { element: section, heading: node, body, title: node.textContent.trim() };
      sections.push(current);
    } else if (current) {
      current.body.appendChild(node);
    } else {
      documentRoot.appendChild(node);
    }
  });

  function setCollapsed(section, collapsed) {
    section.classList.toggle("is-collapsed", collapsed);
    const button = section.querySelector(".toggle-section");
    if (button) {
      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute("aria-label", collapsed ? "Déplier cette section" : "Replier cette section");
    }
  }

  function copySectionLink(id) {
    const link = window.location.origin + window.location.pathname + "#" + id;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => showToast("Lien copié")).catch(() => showToast(link));
    } else {
      showToast(link);
    }
  }

  const contents = document.getElementById("contents-list");
  sections.forEach((section, index) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#" + section.element.id;
    const number = document.createElement("span");
    number.className = "nav-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const label = document.createElement("span");
    label.className = "nav-label";
    label.textContent = section.title.replace(/^#+\s*/, "");
    link.append(number, label);
    link.addEventListener("click", () => setCollapsed(section.element, false));
    item.appendChild(link);
    contents.appendChild(item);
    section.link = link;
  });
  document.getElementById("chapter-total").textContent = String(sections.length).padStart(2, "0");
  document.getElementById("stat-chapters").textContent = String(sections.length).padStart(2, "0");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          sections.forEach((section) => section.link.classList.toggle("active", section.element === entry.target));
        }
      });
    }, { rootMargin: "-12% 0px -72% 0px" });
    sections.forEach((section) => observer.observe(section.element));
  }

  const search = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  search.addEventListener("input", () => {
    const query = search.value.trim().toLocaleLowerCase("fr");
    results.replaceChildren();
    if (!query) {
      results.hidden = true;
      return;
    }
    const matches = sections.map((section) => {
      const text = section.body.textContent.replace(/\s+/g, " ").trim();
      const full = (section.title + " " + text).toLocaleLowerCase("fr");
      const index = full.indexOf(query);
      if (index < 0) return null;
      const start = Math.max(0, index - 42);
      const end = Math.min(full.length, index + query.length + 70);
      const snippet = text ? text.slice(Math.max(0, index - section.title.length - 42), Math.max(0, index - section.title.length - 42) + 115) : section.title;
      return { section, snippet: (start > 0 ? "…" : "") + (snippet.trim() || section.title) + (end < full.length ? "…" : "") };
    }).filter(Boolean).slice(0, 8);
    results.hidden = false;
    if (matches.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Aucun chapitre ne contient « " + search.value.trim() + "».";
      results.appendChild(empty);
      return;
    }
    matches.forEach(({ section, snippet }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result-button";
      const title = document.createElement("span");
      title.className = "result-title";
      title.textContent = section.title;
      const excerpt = document.createElement("span");
      excerpt.className = "result-snippet";
      excerpt.textContent = snippet;
      button.append(title, excerpt);
      button.addEventListener("click", () => {
        setCollapsed(section.element, false);
        section.element.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#" + section.element.id);
        search.blur();
      });
      results.appendChild(button);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      search.focus();
    }
    if (event.key === "Escape" && document.activeElement === search) {
      search.value = "";
      search.dispatchEvent(new Event("input"));
      search.blur();
    }
  });

  document.getElementById("expand-all").addEventListener("click", () => sections.forEach((section) => setCollapsed(section.element, false)));
  document.getElementById("collapse-all").addEventListener("click", () => sections.forEach((section) => setCollapsed(section.element, true)));
  document.getElementById("print-page").addEventListener("click", () => window.print());

  const dialog = document.getElementById("artwork-dialog");
  document.getElementById("open-artwork").addEventListener("click", () => dialog.showModal());
  document.getElementById("close-artwork").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  let toastTimer;
  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 1800);
  }

  const progressBar = document.getElementById("progress-bar");
  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
    progressBar.style.width = percent + "%";
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  source.remove();
})();
