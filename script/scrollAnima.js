function initAnimacaoScroll() {
  const sections = document.querySelectorAll(".js-scroll > div");
  if (sections.length) {
    const windowFadeIn = window.innerHeight * 0.6;
    const windowFadeOut = window.innerHeight * 0.03;
    // console.log(windowMetade);

    function animaScroll() {
      sections.forEach((section) => {
        const sectionTop = section.getBoundingClientRect().top;
        // console.log(sectionTop);

        if (sectionTop - windowFadeIn < 0) {
          section.classList.add("ativo");
        }
        if (sectionTop < -windowFadeOut) {
          section.classList.remove("ativo");
        }
      });
    }
    animaScroll();

    window.addEventListener("scroll", animaScroll);
  }
}
