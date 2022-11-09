function initAnimacaoScroll() {
  const sections = document.querySelectorAll(".js-scroll > div");
  const media = matchMedia("min-width: 760px").matches;
  if (sections.length) {
    const FadeIn = window.innerHeight * 0.6;
    const FadeOut = window.innerHeight * 0.03;

    const FadeInMobile = window.innerHeight * 0.8;
    const FadeOutMobile = window.innerHeight * 0.03;

    function animaScroll() {
      sections.forEach((section) => {
        const sectionTop = section.getBoundingClientRect().top;
        if (media) {
          if (sectionTop - FadeIn < 0) {
            section.classList.add("ativo");
          }
          if (sectionTop < -FadeOut) {
            section.classList.remove("ativo");
          }
        } else {
          if (sectionTop - FadeInMobile < 0) {
            section.classList.add("ativo");
          }
          if (sectionTop < -FadeOutMobile) {
            section.classList.remove("ativo");
          }
        }
      });
    }
    animaScroll();

    window.addEventListener("scroll", animaScroll);
  }
}
