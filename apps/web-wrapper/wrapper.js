const gameFrame = document.getElementById("game-frame");
const offlinePlaceholder = document.getElementById("offline-placeholder");

async function showGameExportWhenAvailable() {
  const response = await fetch("./game/index.html", {
    method: "HEAD",
    cache: "no-store",
  });

  if (!response.ok) {
    return;
  }

  gameFrame.classList.add("is-available");
  offlinePlaceholder.hidden = true;
}

showGameExportWhenAvailable().catch(() => {
  offlinePlaceholder.hidden = false;
});
