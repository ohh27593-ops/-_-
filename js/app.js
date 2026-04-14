const USE_MOCK = true;
const API_BASE = "https://YOUR_SERVER";
const WINDOW_MAIN = 6;
const WINDOW_DETAIL = 6;
const SWIPE_THRESHOLD = 40;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setBadge(text) {
  $("#netBadge").textContent = text;
}

const LS_SESSION = "tommy_session_v1";
const Session = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(LS_SESSION) || "null");
    } catch {
      return null;
    }
  },
  set(v) {
    localStorage.setItem(LS_SESSION, JSON.stringify(v));
  },
  clear() {
    localStorage.removeItem(LS_SESSION);
  }
};

const modalBackdrop = $("#modalBackdrop");
$("#btnClose").addEventListener("click", () => {
  modalBackdrop.style.display = "none";
});

const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE";
let gsiRendered = false;

function openAuthModal() {
  modalBackdrop.style.display = "flex";
  initGoogleButton();
}

function decodeJwtPayload(credential) {
  const base64Url = credential.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  );
  return JSON.parse(json);
}

function onGoogleCredential(response) {
  const payload = decodeJwtPayload(response.credential);
  Session.set({
    email: payload.email,
    name: payload.name,
    picture: payload.picture
  });
  modalBackdrop.style.display = "none";
  alert("로그인 완료!");
}

function initGoogleButton() {
  if (gsiRendered) return;
  if (!window.google?.accounts?.id) return;

  const wrap = $("#gsiBtn");
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID_HERE")) {
    wrap.innerHTML = `<div style="font-size:12px;color:#c00;line-height:1.4;">
      GOOGLE_CLIENT_ID를 설정해 주세요.<br>(코드 상단의 GOOGLE_CLIENT_ID)
    </div>`;
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: onGoogleCredential
  });

  google.accounts.id.renderButton(wrap, {
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "pill",
    width: 320
  });

  gsiRendered = true;
}

const fsBackdrop = $("#fsBackdrop");
const fsMedia = $("#fsMedia");
const fsMeta = $("#fsMeta");

$("#fsClose").addEventListener("click", () => {
  fsBackdrop.style.display = "none";
});

fsBackdrop.addEventListener("click", (e) => {
  if (e.target === fsBackdrop) fsBackdrop.style.display = "none";
});

function renderMediaInto(el, media) {
  el.innerHTML = "";

  if (!media?.url) {
    el.textContent = "MEDIA";
    return;
  }

  if (media.type === "video") {
    const v = document.createElement("video");
    v.src = media.url;
    v.controls = true;
    v.playsInline = true;
    v.preload = "metadata";
    el.appendChild(v);
  } else {
    const img = document.createElement("img");
    img.alt = "";
    img.src = media.url;
    el.appendChild(img);
  }
}

function openFullscreen({ title, subtitle, media }) {
  renderMediaInto(fsMedia, media);
  fsMeta.textContent = [title, subtitle].filter(Boolean).join(" · ");
  fsBackdrop.style.display = "flex";
}

async function apiFetchJson(url, { signal } = {}) {
  const res = await fetch(url, {
    method: "GET",
    signal,
    headers: { Accept: "application/json" }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return await res.json();
}

const MockDB = (() => {
  const nbs = ["복현동", "동성로", "산격동", "수성못", "교동", "칠성시장"];
  const tags = ["분위기", "사진맛집", "혼자", "데이트", "야경", "조용함", "힙함", "산책", "커피"];

  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const pickTags = (k = 3) =>
    Array.from({ length: k }, () => pick(tags)).filter((v, i, arr) => arr.indexOf(v) === i);

  const mainAll = Array.from({ length: 80 }, (_, i) => {
    const id = i + 1;
    const nb = pick(nbs);

    return {
      id,
      neighborhood: nb,
      address: `대구광역시 (예시) ${nb} ${String(id).padStart(2, "0")}길`,
      lat: 35.86 + Math.random() * 0.06,
      lng: 128.58 + Math.random() * 0.05,
      placeName: `${nb} 추천 장소 #${id}`,
      title: `${nb}에서 이거 해보세요`,
      tags: pickTags(3),
      media: { type: "image", url: `https://picsum.photos/seed/to_${id}/900/1200` },
      instagramHandle: `@to_${id}`,
      instagramUrl: "https://www.instagram.com/",
      friendPostsAtLocation:
        Math.random() < 0.5
          ? []
          : [{ name: "민지", instagramUrl: "https://www.instagram.com/" }]
    };
  });

  const detailMap = new Map(
    mainAll.map((p) => {
      const cnt = 6 + Math.floor(Math.random() * 6);
      const list = Array.from({ length: cnt }, (_, j) => {
        const did = `${p.id}_${j + 1}`;
        return {
          id: did,
          title: `${p.placeName} - 콘텐츠 ${j + 1}`,
          sub: j === 0 ? "대표" : "최근",
          url: "https://www.instagram.com/",
          media: {
            type: "image",
            url: `https://picsum.photos/seed/detail_${did}/900/1200`
          }
        };
      });
      return [String(p.id), list];
    })
  );

  function page(list, cursor, limit) {
    const start = cursor ? parseInt(cursor, 10) : 0;
    const items = list.slice(start, start + limit);
    const next = start + items.length;

    return {
      items,
      nextCursor: next < list.length ? String(next) : "",
      hasMore: next < list.length
    };
  }

  return {
    main(cursor = "", limit = 6) {
      return page(mainAll, cursor, limit);
    },
    detail(postId, cursor = "", limit = 6) {
      return page(detailMap.get(String(postId)) || [], cursor, limit);
    }
  };
})();

async function fetchMain({ cursor = "", limit = 6, signal } = {}) {
  if (USE_MOCK) {
    setBadge("mock");
    await new Promise((r) => setTimeout(r, 120));
    return MockDB.main(cursor, limit);
  }

  setBadge("net");
  const qs = new URLSearchParams({
    cursor,
    limit: String(limit)
  }).toString();

  return apiFetchJson(`${API_BASE}/feed/main?${qs}`, { signal });
}

async function fetchDetail({ postId, cursor = "", limit = 6, signal } = {}) {
  if (USE_MOCK) {
    setBadge("mock");
    await new Promise((r) => setTimeout(r, 120));
    return MockDB.detail(postId, cursor, limit);
  }

  setBadge("net");
  const qs = new URLSearchParams({
    cursor,
    limit: String(limit)
  }).toString();

  return apiFetchJson(
    `${API_BASE}/feed/detail/${encodeURIComponent(postId)}?${qs}`,
    { signal }
  );
}

const Store = (() => {
  const main = {
    items: [],
    nextCursor: "",
    hasMore: true,
    inflight: null
  };

  const detail = new Map();

  const getDetail = (postId) => {
    const k = String(postId);
    if (!detail.has(k)) {
      detail.set(k, {
        items: [],
        nextCursor: "",
        hasMore: true,
        inflight: null
      });
    }
    return detail.get(k);
  };

  return { main, getDetail };
})();

function needMore(len, index, windowSize) {
  return len < index + 1 + windowSize;
}

async function ensurePrefetch({ state, fetchFn, cursorKey, windowSize, currentIndex }) {
  if (!state.hasMore) return;
  if (!needMore(state.items.length, currentIndex, windowSize)) return;
  if (state.inflight) return;

  const ac = new AbortController();
  state.inflight = ac;

  try {
    const data = await fetchFn({
      cursor: state[cursorKey],
      limit: windowSize,
      signal: ac.signal
    });

    state.items.push(...(data.items || []));
    state[cursorKey] = data.nextCursor || "";
    state.hasMore = Boolean(data.hasMore);
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("prefetch error:", err);
    }
  } finally {
    state.inflight = null;
  }
}

const mainEl = $("#main");
const vtrack = $("#vtrack");
let vIndex = 0;

function makeMapUrl(post) {
  if (typeof post.lat === "number" && typeof post.lng === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      post.lat + "," + post.lng
    )}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    post.address || post.neighborhood || ""
  )}`;
}

function friendBlock(post) {
  const arr = post.friendPostsAtLocation || [];
  if (!arr.length) return "";

  const links = arr
    .map(
      (fp) =>
        `<a class="btn" href="${fp.instagramUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(fp.name)}</a>`
    )
    .join(" ");

  return `<div class="box"><div class="list">${links} <span>님이 이 위치에 게시물을 올렸습니다.</span></div></div>`;
}

function pageHtml(post) {
  const tagsHtml = (post.tags || [])
    .map((t) => `<span class="chip">${escapeHtml(t)}</span>`)
    .join("");

  const mapUrl = makeMapUrl(post);

  return `
    <div class="hwrap">
      <div class="htrack" data-hindex="0">
        <div class="hpanel">
          <div class="media" data-fs="1"
               data-fs-title="${escapeHtml(post.title || post.placeName)}"
               data-fs-sub="${escapeHtml(post.neighborhood)}">
            <div class="mediaOverlay">MEDIA</div>
          </div>

          <div class="metaRow">
            <div>
              <div class="title">${escapeHtml(post.placeName)}</div>
              <div class="sub">${escapeHtml(post.neighborhood)}</div>
              <div class="chips">${tagsHtml}</div>
            </div>

            <div class="actions">
              <a class="btn" href="${post.instagramUrl || "#"}" target="_blank" rel="noopener noreferrer">
                ${escapeHtml(post.instagramHandle || "Instagram")}
              </a>
              <button class="btn" type="button" data-detail="open">상세</button>
            </div>
          </div>
        </div>

        <div class="hpanel" data-detail-panel="1">
          <div class="detailMiniHeader">상세: 정확한 위치</div>

          <div class="detailMeta">
            <div class="box">
              <div class="list">
                <div><b>위치</b>: ${escapeHtml(post.address || post.neighborhood)}</div>
              </div>
              <div class="actions" style="margin-top:10px;">
                <a class="btn" href="${mapUrl}" target="_blank" rel="noopener noreferrer">지도에서 보기</a>
              </div>
            </div>
            ${friendBlock(post)}
          </div>

          <div class="locationFeedWrap">
            <div class="lvtrack" data-lindex="0"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function makeVPage(post) {
  const sec = document.createElement("section");
  sec.className = "vpage";
  sec.dataset.postId = post.id;
  sec.innerHTML = pageHtml(post);

  renderMediaInto($(".media", sec), post.media);
  return sec;
}

function makeLPage(item, post) {
  const sec = document.createElement("section");
  sec.className = "lpage";
  sec.dataset.lid = item.id;

  sec.innerHTML = `
    <div class="lmedia" data-fs="1"
         data-fs-title="${escapeHtml(item.title)}"
         data-fs-sub="${escapeHtml(post.placeName || "")}">
      <div class="mediaOverlay">CONTENT</div>
    </div>
    <div class="title">${escapeHtml(item.title)}</div>
    <div class="sub">${escapeHtml(item.sub)}</div>
    <div class="actions">
      <a class="btn" href="${item.url || "#"}" target="_blank" rel="noopener noreferrer">열기</a>
    </div>
  `;

  renderMediaInto($(".lmedia", sec), item.media);
  return sec;
}

function setHIndex(htrack, idx) {
  htrack.dataset.hindex = String(idx);
  htrack.style.transform = `translateX(${-50 * idx}%)`;
}

function setVIndex(idx, animate = true) {
  const pageCount = vtrack.children.length;
  const max = Math.max(0, pageCount - 1);
  vIndex = Math.max(0, Math.min(max, idx));

  vtrack.style.transition = animate ? "transform 260ms ease" : "none";
  const pageH = vtrack.querySelector(".vpage")?.offsetHeight ?? mainEl.clientHeight;
  vtrack.style.transform = `translateY(${-pageH * vIndex}px)`;

  $$(".htrack").forEach((ht) => setHIndex(ht, 0));

  ensurePrefetch({
    state: Store.main,
    fetchFn: ({ cursor, limit, signal }) => fetchMain({ cursor, limit, signal }),
    cursorKey: "nextCursor",
    windowSize: WINDOW_MAIN,
    currentIndex: vIndex
  }).then(incrementalRenderMain);
}

function incrementalRenderMain() {
  const cache = Store.main.items;
  for (let i = vtrack.children.length; i < cache.length; i += 1) {
    vtrack.appendChild(makeVPage(cache[i]));
  }
}

function setLIndex(lvtrack, idx, animate = true) {
  const max = Math.max(0, lvtrack.children.length - 1);
  const lIndex = Math.max(0, Math.min(max, idx));
  lvtrack.dataset.lindex = String(lIndex);

  lvtrack.style.transition = animate ? "transform 260ms ease" : "none";
  const wrap = lvtrack.closest(".locationFeedWrap");
  const pageH = wrap ? wrap.clientHeight : 200;
  lvtrack.style.transform = `translateY(${-pageH * lIndex}px)`;

  const meta = lvtrack.closest(".hpanel")?.querySelector(".detailMeta");
  if (meta && lIndex > 0) {
    meta.classList.add("collapsed");
  }
}

async function renderDetail({ postId, panelEl }) {
  const post = Store.main.items.find((p) => String(p.id) === String(postId));
  if (!post) return;

  const st = Store.getDetail(postId);

  await ensurePrefetch({
    state: st,
    fetchFn: ({ cursor, limit, signal }) =>
      fetchDetail({ postId, cursor, limit, signal }),
    cursorKey: "nextCursor",
    windowSize: WINDOW_DETAIL,
    currentIndex: 0
  });

  const lvtrack = $(".lvtrack", panelEl);
  lvtrack.innerHTML = "";
  st.items.forEach((item) => lvtrack.appendChild(makeLPage(item, post)));
  setLIndex(lvtrack, 0, false);

  $(".detailMeta", panelEl)?.classList.remove("collapsed");
}

function incrementalRenderDetail(postId, lvtrack) {
  const st = Store.getDetail(postId);
  const post =
    Store.main.items.find((p) => String(p.id) === String(postId)) || {
      placeName: ""
    };

  for (let i = lvtrack.children.length; i < st.items.length; i += 1) {
    lvtrack.appendChild(makeLPage(st.items[i], post));
  }
}

let wheelLock = false;
mainEl.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (wheelLock) return;
    wheelLock = true;

    if (e.deltaY > 0) setVIndex(vIndex + 1, true);
    else if (e.deltaY < 0) setVIndex(vIndex - 1, true);

    setTimeout(() => {
      wheelLock = false;
    }, 300);
  },
  { passive: false }
);

vtrack.addEventListener("click", async (e) => {
  const openBtn = e.target.closest("button[data-detail='open']");
  if (openBtn) {
    const htrack = openBtn.closest(".htrack");
    setHIndex(htrack, 1);

    const vpage = htrack.closest(".vpage");
    const postId = vpage?.dataset.postId;
    const panel = $(".hpanel[data-detail-panel='1']", htrack);

    if (postId && panel) {
      await renderDetail({ postId, panelEl: panel });
    }
    return;
  }

  const fsEl = e.target.closest("[data-fs='1']");
  if (fsEl) {
    const vpage = fsEl.closest(".vpage");
    const postId = vpage?.dataset.postId ?? "";
    let media = null;

    if (fsEl.classList.contains("media")) {
      media = Store.main.items.find((p) => String(p.id) === String(postId))?.media ?? null;
    } else if (fsEl.classList.contains("lmedia")) {
      const st = Store.getDetail(postId);
      const lid = fsEl.closest(".lpage")?.dataset.lid ?? "";
      media = st.items.find((x) => String(x.id) === String(lid))?.media ?? null;
    }

    openFullscreen({
      title: fsEl.dataset.fsTitle || "",
      subtitle: fsEl.dataset.fsSub || "",
      media
    });
  }
});

let hTouch = null;
vtrack.addEventListener(
  "touchstart",
  (e) => {
    const ht = e.target.closest(".htrack");
    if (!ht) return;

    const t = e.touches[0];
    hTouch = {
      x: t.clientX,
      y: t.clientY,
      htrack: ht,
      lockedDir: null
    };
  },
  { passive: true }
);

vtrack.addEventListener(
  "touchmove",
  (e) => {
    if (!hTouch) return;

    const t = e.touches[0];
    const dx = t.clientX - hTouch.x;
    const dy = t.clientY - hTouch.y;

    if (!hTouch.lockedDir) {
      if (Math.abs(dx) > Math.abs(dy) + 8) hTouch.lockedDir = "x";
      else if (Math.abs(dy) > Math.abs(dx) + 8) hTouch.lockedDir = "y";
    }

    if (hTouch.lockedDir === "x") {
      e.preventDefault();
    }
  },
  { passive: false }
);

vtrack.addEventListener(
  "touchend",
  async (e) => {
    if (!hTouch) return;

    const dx = e.changedTouches[0].clientX - hTouch.x;

    if (hTouch.lockedDir === "x") {
      const cur = Number(hTouch.htrack.dataset.hindex || "0");

      if (dx < -SWIPE_THRESHOLD) {
        setHIndex(hTouch.htrack, 1);

        const vpage = hTouch.htrack.closest(".vpage");
        const postId = vpage?.dataset.postId;
        const panel = $(".hpanel[data-detail-panel='1']", hTouch.htrack);

        if (postId && panel) {
          await renderDetail({ postId, panelEl: panel });
        }
      } else if (dx > SWIPE_THRESHOLD) {
        setHIndex(hTouch.htrack, 0);
      } else {
        setHIndex(hTouch.htrack, cur);
      }
    }

    hTouch = null;
  },
  { passive: true }
);

let vTouch = null;
mainEl.addEventListener(
  "touchstart",
  (e) => {
    const t = e.touches[0];
    const htrack = e.target.closest(".htrack");
    const detailOpen = htrack && Number(htrack.dataset.hindex || "0") === 1;

    const wrap = e.target.closest(".locationFeedWrap");
    const lvtrack = wrap ? $(".lvtrack", wrap) : null;
    const postId = e.target.closest(".vpage")?.dataset.postId ?? "";

    vTouch = {
      x: t.clientX,
      y: t.clientY,
      lockedDir: null,
      mode: detailOpen && lvtrack ? "detail" : "main",
      lvtrack,
      postId
    };
  },
  { passive: true }
);

mainEl.addEventListener(
  "touchmove",
  (e) => {
    if (!vTouch) return;

    const t = e.touches[0];
    const dx = t.clientX - vTouch.x;
    const dy = t.clientY - vTouch.y;

    if (!vTouch.lockedDir) {
      if (Math.abs(dy) > Math.abs(dx) + 8) vTouch.lockedDir = "y";
      else if (Math.abs(dx) > Math.abs(dy) + 8) vTouch.lockedDir = "x";
    }

    if (vTouch.lockedDir === "y") {
      e.preventDefault();
    }
  },
  { passive: false }
);

mainEl.addEventListener(
  "touchend",
  (e) => {
    if (!vTouch) return;

    const dy = e.changedTouches[0].clientY - vTouch.y;

    if (vTouch.lockedDir === "y") {
      if (vTouch.mode === "detail" && vTouch.lvtrack) {
        const cur = Number(vTouch.lvtrack.dataset.lindex || "0");
        const meta = vTouch.lvtrack.closest(".hpanel")?.querySelector(".detailMeta");
        const isCollapsed = meta?.classList.contains("collapsed");

        if (dy < -SWIPE_THRESHOLD) {
          if (cur === 0 && meta && !isCollapsed) {
            meta.classList.add("collapsed");
            vTouch = null;
            return;
          }

          setLIndex(vTouch.lvtrack, cur + 1, true);

          const st = Store.getDetail(vTouch.postId);
          ensurePrefetch({
            state: st,
            fetchFn: ({ cursor, limit, signal }) =>
              fetchDetail({
                postId: vTouch.postId,
                cursor,
                limit,
                signal
              }),
            cursorKey: "nextCursor",
            windowSize: WINDOW_DETAIL,
            currentIndex: cur + 1
          }).then(() => incrementalRenderDetail(vTouch.postId, vTouch.lvtrack));
        } else if (dy > SWIPE_THRESHOLD) {
          if (cur === 0 && meta && isCollapsed) {
            meta.classList.remove("collapsed");
            vTouch = null;
            return;
          }

          setLIndex(vTouch.lvtrack, cur - 1, true);
        } else {
          setLIndex(vTouch.lvtrack, cur, true);
        }
      } else {
        if (dy < -SWIPE_THRESHOLD) setVIndex(vIndex + 1, true);
        else if (dy > SWIPE_THRESHOLD) setVIndex(vIndex - 1, true);
        else setVIndex(vIndex, true);
      }
    }

    vTouch = null;
  },
  { passive: true }
);

window.addEventListener("resize", () => {
  setVIndex(vIndex, false);
  $$(".lvtrack").forEach((lt) => {
    setLIndex(lt, Number(lt.dataset.lindex || "0"), false);
  });
});

const searchForm = $("#searchForm");
const searchInput = $("#searchInput");
const norm = (s) => String(s || "").trim().toLowerCase();

function filterPosts(keyword) {
  const q = norm(keyword);
  if (!q) return Store.main.items;

  return Store.main.items.filter((p) => {
    const hay = [p.neighborhood, p.address, p.placeName, p.title, ...(p.tags || [])]
      .map(norm)
      .join(" ");
    return hay.includes(q);
  });
}

function renderList(list) {
  vtrack.innerHTML = "";
  list.forEach((p) => vtrack.appendChild(makeVPage(p)));
  setVIndex(0, false);
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  renderList(filterPosts(searchInput.value));
});

searchInput.addEventListener("input", () => {
  if (!searchInput.value.trim()) {
    renderList(Store.main.items);
  }
});

$("#tabbar").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-tab]");
  if (!btn) return;

  $$("nav button").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  const tab = btn.dataset.tab;

  if (tab === "home") {
    renderList(Store.main.items);
    return;
  }

  if (tab === "friends") {
    if (!Session.get()) {
      openAuthModal();
      return;
    }
    alert("친구 탭(MVP): 추후 SNS 친구 목록/친구 피드로 확장");
    return;
  }

  if (tab === "me") {
    const sess = Session.get();
    if (!sess) {
      openAuthModal();
      return;
    }
    alert(`로그인 상태입니다: ${sess.name} (${sess.email})`);
    return;
  }

  alert("MVP에서는 이 탭을 아직 비워뒀습니다.");
});

async function boot() {
  setBadge(USE_MOCK ? "mock" : "net");

  await ensurePrefetch({
    state: Store.main,
    fetchFn: ({ cursor, limit, signal }) => fetchMain({ cursor, limit, signal }),
    cursorKey: "nextCursor",
    windowSize: WINDOW_MAIN,
    currentIndex: 0
  });

  renderList(Store.main.items);

  queueMicrotask(async () => {
    await ensurePrefetch({
      state: Store.main,
      fetchFn: ({ cursor, limit, signal }) => fetchMain({ cursor, limit, signal }),
      cursorKey: "nextCursor",
      windowSize: WINDOW_MAIN,
      currentIndex: 0
    });
    incrementalRenderMain();
  });
}

boot();
