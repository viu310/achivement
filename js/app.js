const STORAGE_KEY = "achievement-archive-v1";
const PENDING_KEY = "achievement-archive-pending-cloud-save";
const PENDING_IMAGES_KEY = "achievement-archive-pending-images";
let games = loadGames();
let activeGameId = null;
let currentFilter = "all";
let toastTimer;
let selectedImageFile = null;
let pendingImages = (() => { try { return JSON.parse(sessionStorage.getItem(PENDING_IMAGES_KEY) || "[]"); } catch { return []; } })();
let cloudReady = false;
const API_URL = (window.ARCHIVE_API_URL || "").replace(/\/$/, "");
const $ = (id) => document.getElementById(id);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function loadGames() { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function setSyncStatus(message, state = "") { const el = $("syncStatus"); if (!el) return; el.textContent = message; el.className = state; }
function getPassword() { return sessionStorage.getItem("archive-admin-password") || ""; }
async function requestCloud(path, options = {}) {
  if (!API_URL) throw new Error("먼저 js/cloud-config.js에 Worker 주소를 설정해 주세요.");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  return fetch(`${API_URL}${path}`, { ...options, headers });
}
async function loadCloudGames() {
  const localGames = loadGames();
  const response = await requestCloud("/api/games", { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error(`GitHub 데이터 불러오기 실패 (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data.games)) throw new Error("GitHub 데이터 형식이 올바르지 않습니다.");

  if (localStorage.getItem(PENDING_KEY) === "1") {
    const retry = confirm(`이 브라우저에 GitHub 저장이 완료되지 않은 변경사항이 있습니다.
로컬 변경사항 ${localGames.length}개를 GitHub에 다시 저장할까요?

확인을 누르면 로컬 변경사항을 반영하고, 취소하면 GitHub 데이터를 사용합니다.`);
    if (retry) { games = localGames; render(); await save(); return; }
    localStorage.removeItem(PENDING_KEY);
    pendingImages = [];
    sessionStorage.removeItem(PENDING_IMAGES_KEY);
  } else if (data.games.length === 0 && localGames.length > 0) {
    if (confirm(`GitHub 저장소에 아직 게임 데이터가 없습니다.
이 브라우저에 저장된 게임 ${localGames.length}개를 GitHub로 이전할까요?`)) {
      games = localGames; render(); await save(); return;
    }
  }

  games = data.games;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  cloudReady = true;
  setSyncStatus("GITHUB SYNC 연결됨", "synced");
  render();
}
async function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  render();
  if (!API_URL) { setSyncStatus("설정 필요 · 로컬 백업 중", "error"); return; }

  let password = getPassword();
  if (!password) {
    password = prompt("개인 아카이브 관리자 비밀번호를 입력해 주세요.\n(Cloudflare Worker의 ADMIN_PASSWORD)");
    if (!password) { setSyncStatus("저장 대기 · 인증 필요", "error"); return; }
    sessionStorage.setItem("archive-admin-password", password);
  }

  localStorage.setItem(PENDING_KEY, "1");
  setSyncStatus("GitHub 저장 중…");
  try {
    const payload = { password, games: games.map(({_pendingImage, ...game}) => game), images: pendingImages };
    const response = await requestCloud("/api/save", { method: "POST", body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) { sessionStorage.removeItem("archive-admin-password"); throw new Error("관리자 비밀번호가 올바르지 않습니다."); }
    if (!response.ok) throw new Error(result.error || `GitHub 저장 실패 (${response.status})`);

    pendingImages = [];
    sessionStorage.removeItem(PENDING_IMAGES_KEY);
    localStorage.removeItem(PENDING_KEY);
    games.forEach(game => delete game._pendingImage);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    cloudReady = true;
    setSyncStatus("GITHUB 저장 완료", "synced");
  } catch (error) {
    console.error(error);
    setSyncStatus("저장 실패 · 로컬 백업 유지", "error");
    showToast(error.message || "GitHub 저장에 실패했습니다. 변경사항은 이 브라우저에 남아 있습니다.");
  }
}
function stats(game) { const total = game.achievements.length; const unlocked = game.achievements.filter(a => a.done).length; return { total, unlocked, percent: total ? Math.round(unlocked / total * 100) : 0 }; }
function overall() { const total = games.reduce((n,g) => n + g.achievements.length, 0); const unlocked = games.reduce((n,g) => n + g.achievements.filter(a => a.done).length, 0); return { total, unlocked, percent: total ? Math.round(unlocked / total * 100) : 0 }; }
function render() {
  const all = overall();
  $("overallPercent").textContent = `${all.percent}%`; $("overallFraction").textContent = `${all.unlocked} / ${all.total} ACHIEVEMENTS`; $("overallBar").style.width = `${all.percent}%`;
  $("gameCount").textContent = games.length; $("unlockedCount").textContent = all.unlocked; $("libraryCount").textContent = String(games.length).padStart(2,"0");
  const search = $("searchInput").value.trim().toLowerCase(); const sort = $("sortSelect").value;
  let visible = games.filter(g => g.name.toLowerCase().includes(search));
  visible = visible.filter(g => { const s = stats(g); if (currentFilter === "playing") return s.total > 0 && s.percent > 0 && s.percent < 100; if (currentFilter === "completed") return s.total > 0 && s.percent === 100; if (currentFilter === "notstarted") return s.unlocked === 0; return true; });
  visible.sort((a,b) => sort === "name" ? a.name.localeCompare(b.name,"ko") : sort === "progress" ? stats(b).percent - stats(a).percent : b.createdAt - a.createdAt);
  $("gameGrid").innerHTML = visible.map(g => { const s = stats(g); const image = g.image ? `<img src="${escapeHTML(g.image)}" alt="" onerror="this.remove()">` : ""; return `<article class="game-card" data-game="${escapeHTML(g.id)}" tabindex="0" role="button" aria-label="${escapeHTML(g.name)} 상세 보기"><div class="game-cover">${image}<div class="cover-placeholder">✦</div><span class="platform-tag">${escapeHTML(g.platform)}</span></div><div class="game-body"><div class="game-title-row"><span class="game-title">${escapeHTML(g.name)}</span><span class="game-percent">${s.percent}%</span></div><div class="game-meta"><span>${s.unlocked} / ${s.total} 달성</span><span>${s.total === 0 ? "과제 미등록" : s.percent === 100 ? "COMPLETE" : "IN PROGRESS"}</span></div><div class="progress-track"><div class="progress-fill" style="width:${s.percent}%"></div></div>${g.note ? `<p class="game-note">${escapeHTML(g.note)}</p>` : ""}</div></article>`; }).join("");
  $("emptyState").classList.toggle("show", visible.length === 0); $("emptyState").querySelector("h3").textContent = games.length ? "검색 결과가 없습니다" : "아직 등록된 게임이 없습니다"; $("emptyState").querySelector("p").textContent = games.length ? "검색어나 필터 조건을 변경해 보세요." : "첫 번째 게임을 추가하고 나만의 도전과제 아카이브를 만들어 보세요.";
}
function showToast(message) { $("toast").textContent = message; $("toast").classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2600); }
function openGameForm(game = null) {
  $("gameForm").reset(); selectedImageFile = null; $("imagePreview").hidden = true; $("imagePreview").removeAttribute("src");
  $("gameId").value = game?.id || ""; $("gameDialogTitle").textContent = game ? "게임 정보 수정" : "게임 추가";
  if (game) { $("gameName").value = game.name; $("gamePlatform").value = game.platform; $("gameImage").value = game.image && /^https?:/i.test(game.image) ? game.image : ""; $("gameNote").value = game.note || ""; if (game.image) { $("imagePreview").src = game.image; $("imagePreview").hidden = false; } }
  $("gameDialog").showModal();
}
function openDetails(id) { activeGameId = id; renderDetails(); $("detailDialog").showModal(); }
function renderDetails() { const game = games.find(g => g.id === activeGameId); if (!game) return; const s = stats(game); $("detailTitle").textContent = game.name; $("detailSubtitle").textContent = `${game.platform}${game.note ? " · " + game.note : ""}`; $("detailPercent").textContent = `${s.percent}%`; $("detailFraction").textContent = `${s.unlocked} / ${s.total} 달성`; $("detailBar").style.width = `${s.percent}%`; $("achievementCount").textContent = s.total; $("achievementList").innerHTML = game.achievements.length ? game.achievements.map(a => `<div class="achievement-item ${a.done ? "done" : ""}"><button class="achievement-check" data-toggle="${escapeHTML(a.id)}" aria-label="달성 여부 변경">${a.done ? "✓" : ""}</button><div class="achievement-info"><strong>${escapeHTML(a.name)}</strong>${a.description ? `<p>${escapeHTML(a.description)}</p>` : ""}</div>${a.doneAt ? `<span class="achievement-date">${escapeHTML(a.doneAt)}</span>` : ""}<div class="item-actions"><button data-edit-ach="${escapeHTML(a.id)}" aria-label="수정">수정</button><button data-delete-ach="${escapeHTML(a.id)}" aria-label="삭제">삭제</button></div></div>`).join("") : `<div class="no-achievements">등록된 도전과제가 없습니다.<br>＋ 추가 버튼으로 도전과제를 등록해 보세요.</div>`; }
function openAchievementForm(achievement = null) { $("achievementForm").reset(); $("achievementId").value = achievement?.id || ""; $("achievementDialogTitle").textContent = achievement ? "도전과제 수정" : "도전과제 추가"; if (achievement) { $("achievementName").value = achievement.name; $("achievementDescription").value = achievement.description || ""; } $("achievementDialog").showModal(); }
function slugify(text) { return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9가-힣]+/g,"-").replace(/^-|-$/g,"").slice(0,40) || "game"; }
async function compressImage(file) {
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.");
  if (file.size > 12 * 1024 * 1024) throw new Error("원본 이미지가 12MB를 초과합니다.");
  const dataUrl = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  const img = await new Promise((resolve,reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = dataUrl; });
  const scale = Math.min(1, 900 / Math.max(img.width,img.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
  const blob = await new Promise(resolve => canvas.toBlob(resolve,"image/webp",0.82)); if (!blob) throw new Error("이미지 변환에 실패했습니다.");
  if (blob.size > 900 * 1024) throw new Error("압축 후에도 이미지가 너무 큽니다. 더 작은 이미지를 선택해 주세요.");
  const base64 = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(blob); });
  return { base64, size: blob.size };
}
$("gameImageFile").addEventListener("change", async e => { const file=e.target.files[0]; selectedImageFile=file||null; if(!file)return; try { const data=await compressImage(file); const preview=URL.createObjectURL(file); $("imagePreview").src=preview; $("imagePreview").hidden=false; $("imageHelp").textContent=`업로드 준비 완료 · 압축 크기 약 ${Math.ceil(data.size/1024)}KB`; } catch(err) { selectedImageFile=null; e.target.value=""; showToast(err.message); } });
$("addGameBtn").addEventListener("click", () => openGameForm()); $("emptyAddBtn").addEventListener("click", () => openGameForm());
$("gameForm").addEventListener("submit", async e => { e.preventDefault(); const id=$("gameId").value; const data={name:$("gameName").value.trim(),platform:$("gamePlatform").value,image:$("gameImage").value.trim(),note:$("gameNote").value.trim()}; if(!data.name)return; let game;
  if(id){game=games.find(g=>g.id===id);Object.assign(game,data);} else {game={id:uid(),...data,createdAt:Date.now(),achievements:[]};games.unshift(game);}
  if(selectedImageFile){ try { const image=await compressImage(selectedImageFile); const path=`images/${slugify(game.name)}-${Date.now()}.webp`; pendingImages.push({path,base64:image.base64,mimeType:"image/webp"});
    try { sessionStorage.setItem(PENDING_IMAGES_KEY, JSON.stringify(pendingImages)); } catch {
      pendingImages.pop(); showToast("이미지 업로드 대기 공간이 부족합니다. 더 작은 이미지를 선택해 주세요."); return;
    }
    game.image=path; } catch(err) { showToast(err.message); return; } }
  $("gameDialog").close(); selectedImageFile=null; showToast(id?"게임 정보를 수정했습니다.":"게임을 추가했습니다."); await save(); });
$("gameGrid").addEventListener("click",e=>{const card=e.target.closest("[data-game]");if(card)openDetails(card.dataset.game);});
$("gameGrid").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){const card=e.target.closest("[data-game]");if(card){e.preventDefault();openDetails(card.dataset.game);}}});
$("addAchievementBtn").addEventListener("click",()=>openAchievementForm());
$("achievementForm").addEventListener("submit",async e=>{e.preventDefault();const game=games.find(g=>g.id===activeGameId);if(!game)return;const id=$("achievementId").value,data={name:$("achievementName").value.trim(),description:$("achievementDescription").value.trim()};if(id){Object.assign(game.achievements.find(a=>a.id===id),data);showToast("도전과제를 수정했습니다.");}else{game.achievements.push({id:uid(),...data,done:false,doneAt:""});showToast("도전과제를 추가했습니다.");}$("achievementDialog").close();await save();renderDetails();});
$("achievementList").addEventListener("click",async e=>{const game=games.find(g=>g.id===activeGameId);if(!game)return;const toggle=e.target.closest("[data-toggle]"),edit=e.target.closest("[data-edit-ach]"),del=e.target.closest("[data-delete-ach]");if(toggle){const a=game.achievements.find(x=>x.id===toggle.dataset.toggle);a.done=!a.done;a.doneAt=a.done?new Date().toLocaleDateString("ko-KR"):"";showToast(a.done?"도전과제를 달성했습니다!":"달성을 취소했습니다.");await save();renderDetails();}if(edit){const a=game.achievements.find(x=>x.id===edit.dataset.editAch);openAchievementForm(a);}if(del){const a=game.achievements.find(x=>x.id===del.dataset.deleteAch);if(confirm(`'${a.name}' 도전과제를 삭제할까요?`)){game.achievements=game.achievements.filter(x=>x.id!==a.id);await save();renderDetails();showToast("도전과제를 삭제했습니다.");}}});
$("deleteGameBtn").addEventListener("click",async()=>{const game=games.find(g=>g.id===activeGameId);if(game&&confirm(`'${game.name}' 게임과 도전과제를 모두 삭제할까요?`)){games=games.filter(g=>g.id!==activeGameId);$("detailDialog").close();await save();showToast("게임을 삭제했습니다.");}});
$("editGameBtn").addEventListener("click",()=>{const game=games.find(g=>g.id===activeGameId);$("detailDialog").close();openGameForm(game);});
document.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",()=>$(btn.dataset.close).close())); $("searchInput").addEventListener("input",render); $("sortSelect").addEventListener("change",render);
document.querySelectorAll(".filter-chip").forEach(btn=>btn.addEventListener("click",()=>{currentFilter=btn.dataset.filter;document.querySelectorAll(".filter-chip").forEach(b=>b.classList.toggle("active",b===btn));render();}));
$("exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(games,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="achievement-archive-backup.json";a.click();URL.revokeObjectURL(url);showToast("백업 파일을 저장했습니다.");});
$("importBtn").addEventListener("click",()=>$("importFile").click());
$("importFile").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data)||!data.every(g=>g&&typeof g.name==="string"&&Array.isArray(g.achievements)))throw Error();if(confirm("현재 데이터를 백업 파일의 내용으로 교체하고 GitHub에 저장할까요?")){games=data;await save();showToast("데이터 복원을 처리했습니다.");}}catch{alert("올바른 백업 파일이 아닙니다.");}e.target.value="";});
(async()=>{render();if(!API_URL){setSyncStatus("설정 필요 · 로컬 백업 중","error");return;}setSyncStatus("GitHub 데이터 불러오는 중…");try{await loadCloudGames();}catch(error){console.error(error);setSyncStatus("연결 실패 · 로컬 백업 표시","error");showToast(error.message);}})();
