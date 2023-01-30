const box = document.querySelector("[data-box-trigger]");
if (box) {
  box.addEventListener("click", (_: MouseEvent) => {
    box.classList.remove("animate-none");
  });
  box.addEventListener("animationend", () => {
    box.classList.add("animate-none");
  });
}
