const button = document.querySelector("button");
const heading = document.querySelector("h1");
if (button) {
  button.addEventListener("click", (_: MouseEvent) => {
    (heading?.classList.contains("pressed"))
      ? heading?.classList.remove("pressed")
      : heading?.classList.add("pressed");
  });
}
