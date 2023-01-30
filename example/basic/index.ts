const box = document.querySelector("[data-box-trigger]");
if (box) {
  box.addEventListener("click", (_: MouseEvent) => {
    box.classList.add("animate-swing");
  });
  box.addEventListener("animationend", () => {
    box.classList.remove("animate-swing");
  });
}
