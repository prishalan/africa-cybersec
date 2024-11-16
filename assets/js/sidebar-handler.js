// Make the initialization function available globally
window.initializeSidebars = function () {
  const leftToggle = document.getElementById("leftToggle");
  const rightToggle = document.getElementById("rightToggle");
  const contentWrapper = document.getElementById("content-wrapper");
  const overlay = document.getElementById("overlay");

  // Check if all required elements exist
  if (!leftToggle || !rightToggle || !contentWrapper || !overlay) {
    console.error("Some sidebar elements are missing from the DOM");
    return; // Exit if elements are missing
  }

  function closeAllSidebars() {
    contentWrapper.classList.remove("show-left-sidebar", "show-right-sidebar");
  }

  leftToggle.addEventListener("click", () => {
    contentWrapper.classList.toggle("show-left-sidebar");
    contentWrapper.classList.remove("show-right-sidebar");
  });

  rightToggle.addEventListener("click", () => {
    contentWrapper.classList.toggle("show-right-sidebar");
    contentWrapper.classList.remove("show-left-sidebar");
  });

  overlay.addEventListener("click", closeAllSidebars);

  // Close sidebars when screen size changes to desktop
  const mediaQuery = window.matchMedia("(min-width: 769px)");
  mediaQuery.addEventListener("change", (e) => {
    if (e.matches) {
      closeAllSidebars();
    }
  });
};
