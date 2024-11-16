// Constants
const CONFIG = {
  scripts: {
    particles: "/assets/js/vendors/particles.min.js",
    popper: "/assets/js/vendors/popper.min.js",
    tippy: "/assets/js/vendors/tippy-bundle.umd.min.js",
    svgPanZoom: "/assets/js/vendors/svg-pan-zoom.min.js",
    mapRenderer: "/assets/js/map-renderer.min.js",
    sidebarHandler: "/assets/js/sidebar-handler.min.js",
  },
  dataUrl: "/assets/data/country-data.json",
};

// Helper function to load scripts
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// Function to show content and hide splash screen
function showContent() {
  const splash = document.getElementById("splash");
  const app = document.getElementById("app");
  app.style.opacity = "1";
  splash.style.opacity = "0";
  setTimeout(() => {
    splash.style.display = "none";
  }, 500);
}

// Initialize map function
async function initializeMap(data) {
  const mapRenderer = new MapRenderer("mapContainer");
  await mapRenderer.render(data);
}

// Load and initialize core functionality
async function loadCore() {
  try {
    // Load required scripts first
    await Promise.all([
      loadScript(CONFIG.scripts.mapRenderer),
      loadScript(CONFIG.scripts.sidebarHandler),
    ]);

    // Initialize sidebar functionality
    initializeSidebars();
  } catch (error) {
    console.error("Error loading core scripts:", error);
    throw error;
  }
}

// Load enhancement scripts after map is rendered
async function loadEnhancements() {
  try {
    await Promise.all([
      loadScript(CONFIG.scripts.particles),
      loadScript(CONFIG.scripts.popper),
      loadScript(CONFIG.scripts.tippy),
      loadScript(CONFIG.scripts.svgPanZoom),
    ]);
    // Initialize enhancements here
    console.log("Enhancement scripts loaded");
  } catch (error) {
    console.error("Error loading enhancement scripts:", error);
    throw error;
  }
}

// Main application loading sequence
async function loadApp() {
  try {
    // First, load core functionality
    await loadCore();

    // Then fetch the country data
    const countryData = await fetch(CONFIG.dataUrl).then((resp) => resp.json());

    // Load all enhancement scripts and initialize them
    await loadEnhancements();

    // Initialize map with country data
    await initializeMap(countryData);

    // Only show content after everything is ready
    showContent();
  } catch (error) {
    console.error("Error loading application:", error);
    const splash = document.getElementById("splash");
    splash.innerHTML = `
          <div class="error-message">
              <h2>Error Loading Application</h2>
              <p>Please refresh the page to try again.</p>
          </div>
      `;
  }
}
