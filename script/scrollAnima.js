function initAnimacaoScroll() {
  const sections = document.querySelectorAll(".js-scroll > div");
  if (sections.length) {
    const windowMetade = window.innerHeight * 0.8;

    function animaScroll() {
      sections.forEach((section) => {
        const sectionTop = section.getBoundingClientRect().top;
        const isSectionVisible = sectionTop - windowMetade < 0;
        if (isSectionVisible) {
          console.log("animar");
          section.classList.add("ativo");
        } else {
          section.classList.remove("ativo");
        }
      });
    }
    animaScroll();

    window.addEventListener("scroll", animaScroll);
  }
}
