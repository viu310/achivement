const STORAGE_KEY = "achievement-archive-v1";
let games = loadGames();
let activeGameId = null;
let currentFilter = "all";
let toastTimer;

const $ = (id) => document.getElementById(id);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function loadGames() {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(games)); render(); }
function stats(game) {
  const total = game.achievements.length;
  const unlocked = game.achievements.filter(a => a.done).length;
  return { total, unlocked, percent: total ? Math.round(unlocked / total * 100) : 0 };
}
function overall() {
  const total = games.reduce((n,g) => n + g.achievements.length, 0);
  const unlocked = games.reduce((n,g) => n + g.achievements.filter(a => a.done).length, 0);
  return { total, unlocked, percent: total ? Math.round(unlocked / total * 100) : 0 };
}
function render() {
  const all = overall();
  $("overallPercent").textContent = `${all.percent}%`;
  $("overallFraction").textContent = `${all.unlocked} / ${all.total} ACHIEVEMENTS`;
  $("overallBar").style.width = `${all.percent}%`;
  $("gameCount").textContent = games.length;
  $("unlockedCount").textContent = all.unlocked;
  $("libraryCount").textContent = String(games.length).padStart(2,"0");

  const search = $("searchInput").value.trim().toLowerCase();
  const sort = $("sortSelect").value;
  let visible = games.filter(g => g.name.toLowerCase().includes(search));
  visible = visible.filter(g => {
    const s = stats(g);
    if (currentFilter === "playing") return s.total > 0 && s.percent > 0 && s.percent < 100;
    if (currentFilter === "completed") return s.total > 0 && s.percent === 100;
    if (currentFilter === "notstarted") return s.unlocked === 0;
    return true;
  });
  visible.sort((a,b) => sort === "name" ? a.name.localeCompare(b.name,"ko") : sort === "progress" ? stats(b).percent - stats(a).percent : b.createdAt - a.createdAt);
  $("gameGrid").innerHTML = visible.map(g => {
    const s = stats(g);
    const image = g.image ? `<img src="${escapeHTML(g.image)}" alt="" onerror="this.remove()">` : "";
    return `<article class="game-card" data-game="${g.id}" tabindex="0" role="button" aria-label="${escapeHTML(g.name)} 상세 보기">
      <div class="game-cover">${image}<div class="cover-placeholder">✦</div><span class="platform-tag">${escapeHTML(g.platform)}</span></div>
      <div class="game-body"><div class="game-title-row"><span class="game-title">${escapeHTML(g.name)}</span><span class="game-percent">${s.percent}%</span></div>
      <div class="game-meta"><span>${s.unlocked} / ${s.total} 달성</span><span>${s.total === 0 ? "과제 미등록" : s.percent === 100 ? "COMPLETE" : "IN PROGRESS"}</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${s.percent}%"></div></div>
      ${g.note ? `<p class="game-note">${escapeHTML(g.note)}</p>` : ""}</div></article>`;
  }).join("");
  $("emptyState").classList.toggle("show", visible.length === 0);
  $("emptyState").querySelector("h3").textContent = games.length ? "검색 결과가 없습니다" : "아직 등록된 게임이 없습니다";
  $("emptyState").querySelector("p").textContent = games.length ? "검색어나 필터 조건을 변경해 보세요." : "첫 번째 게임을 추가하고 나만의 도전과제 아카이브를 만들어 보세요.";
}
function showToast(message) {
  $("toast").textContent = message; $("toast").classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2200);
}
function openGameForm(game = null) {
  $("gameForm").reset(); $("gameId").value = game?.id || "";
  $("gameDialogTitle").textContent = game ? "게임 정보 수정" : "게임 추가";
  if (game) { $("gameName").value = game.name; $("gamePlatform").value = game.platform; $("gameImage").value = game.image || ""; $("gameNote").value = game.note || ""; }
  $("gameDialog").showModal();
}
function openDetails(id) {
  activeGameId = id; renderDetails(); $("detailDialog").showModal();
}
function renderDetails() {
  const game = games.find(g => g.id === activeGameId); if (!game) return;
  const s = stats(game);
  $("detailTitle").textContent = game.name;
  $("detailSubtitle").textContent = `${game.platform}${game.note ? " · " + game.note : ""}`;
  $("detailPercent").textContent = `${s.percent}%`;
  $("detailFraction").textContent = `${s.unlocked} / ${s.total} 달성`;
  $("detailBar").style.width = `${s.percent}%`;
  $("achievementCount").textContent = s.total;
  $("achievementList").innerHTML = game.achievements.length ? game.achievements.map(a => `
    <div class="achievement-item ${a.done ? "done" : ""}">
      <button class="achievement-check" data-toggle="${a.id}" aria-label="달성 여부 변경">${a.done ? "✓" : ""}</button>
      <div class="achievement-info"><strong>${escapeHTML(a.name)}</strong>${a.description ? `<p>${escapeHTML(a.description)}</p>` : ""}</div>
      ${a.doneAt ? `<span class="achievement-date">${escapeHTML(a.doneAt)}</span>` : ""}
      <div class="item-actions"><button data-edit-ach="${a.id}" aria-label="수정">수정</button><button data-delete-ach="${a.id}" aria-label="삭제">삭제</button></div>
    </div>`).join("") : `<div class="no-achievements">등록된 도전과제가 없습니다.<br>＋ 추가 버튼으로 도전과제를 등록해 보세요.</div>`;
}
function openAchievementForm(achievement = null) {
  $("achievementForm").reset(); $("achievementId").value = achievement?.id || "";
  $("achievementDialogTitle").textContent = achievement ? "도전과제 수정" : "도전과제 추가";
  if (achievement) { $("achievementName").value = achievement.name; $("achievementDescription").value = achievement.description || ""; }
  $("achievementDialog").showModal();
}

$("addGameBtn").addEventListener("click", () => openGameForm());
$("emptyAddBtn").addEventListener("click", () => openGameForm());
$("gameForm").addEventListener("submit", e => {
  e.preventDefault();
  const id = $("gameId").value;
  const data = { name: $("gameName").value.trim(), platform: $("gamePlatform").value, image: $("gameImage").value.trim(), note: $("gameNote").value.trim() };
  if (!data.name) return;
  if (id) { const game = games.find(g => g.id === id); Object.assign(game,data); showToast("게임 정보를 수정했습니다."); }
  else { games.unshift({ id:uid(), ...data, createdAt:Date.now(), achievements:[] }); showToast("게임을 추가했습니다."); }
  $("gameDialog").close(); save();
});
$("gameGrid").addEventListener("click", e => { const card=e.target.closest("[data-game]"); if(card) openDetails(card.dataset.game); });
$("gameGrid").addEventListener("keydown", e => { if(e.key==="Enter"||e.key===" "){const card=e.target.closest("[data-game]");if(card){e.preventDefault();openDetails(card.dataset.game);}} });
$("addAchievementBtn").addEventListener("click", () => openAchievementForm());
$("achievementForm").addEventListener("submit", e => {
  e.preventDefault(); const game=games.find(g=>g.id===activeGameId); if(!game)return;
  const id=$("achievementId").value, data={name:$("achievementName").value.trim(),description:$("achievementDescription").value.trim()};
  if(id){Object.assign(game.achievements.find(a=>a.id===id),data);showToast("도전과제를 수정했습니다.");}
  else{game.achievements.push({id:uid(),...data,done:false,doneAt:""});showToast("도전과제를 추가했습니다.");}
  $("achievementDialog").close();save();renderDetails();
});
$("achievementList").addEventListener("click", e => {
  const game=games.find(g=>g.id===activeGameId);if(!game)return;
  const toggle=e.target.closest("[data-toggle]"); const edit=e.target.closest("[data-edit-ach]"); const del=e.target.closest("[data-delete-ach]");
  if(toggle){const a=game.achievements.find(x=>x.id===toggle.dataset.toggle);a.done=!a.done;a.doneAt=a.done?new Date().toLocaleDateString("ko-KR"): "";showToast(a.done?"도전과제를 달성했습니다!":"달성을 취소했습니다.");save();renderDetails();}
  if(edit){const a=game.achievements.find(x=>x.id===edit.dataset.editAch);openAchievementForm(a);}
  if(del){const a=game.achievements.find(x=>x.id===del.dataset.deleteAch);if(confirm(`'${a.name}' 도전과제를 삭제할까요?`)){game.achievements=game.achievements.filter(x=>x.id!==a.id);save();renderDetails();showToast("도전과제를 삭제했습니다.");}}
});
$("deleteGameBtn").addEventListener("click", () => {const game=games.find(g=>g.id===activeGameId);if(game&&confirm(`'${game.name}' 게임과 도전과제를 모두 삭제할까요?`)){games=games.filter(g=>g.id!==activeGameId);$("detailDialog").close();save();showToast("게임을 삭제했습니다.");}});
$("editGameBtn").addEventListener("click", () => {const game=games.find(g=>g.id===activeGameId);$("detailDialog").close();openGameForm(game);});
document.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",()=>$(btn.dataset.close).close()));
$("searchInput").addEventListener("input",render);$("sortSelect").addEventListener("change",render);
document.querySelectorAll(".filter-chip").forEach(btn=>btn.addEventListener("click",()=>{currentFilter=btn.dataset.filter;document.querySelectorAll(".filter-chip").forEach(b=>b.classList.toggle("active",b===btn));render();}));
$("exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(games,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="achievement-archive-backup.json";a.click();URL.revokeObjectURL(url);showToast("백업 파일을 저장했습니다.");});
$("importBtn").addEventListener("click",()=>$("importFile").click());
$("importFile").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data)||!data.every(g=>g&&typeof g.name==="string"&&Array.isArray(g.achievements)))throw Error();if(confirm("현재 데이터를 백업 파일의 내용으로 교체할까요?")){games=data;save();showToast("데이터를 복원했습니다.");}}catch{alert("올바른 백업 파일이 아닙니다.");}e.target.value="";});
render();