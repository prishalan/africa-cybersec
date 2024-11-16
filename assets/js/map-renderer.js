window.MapRenderer = (function () {
  class MapRenderer {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.mapData = null;
      this.svg = null;
      this.mapGroup = null;
      this.tooltip = this.createTooltipElement();
      this.createModalElements();
      this.activeFilters = {
        categories: new Set(),
        tags: new Set(),
      };
    }

    // ========================================================= TOOLTIPS
    // Create tooltip DOM element
    createTooltipElement() {
      const tooltip = document.createElement("div");
      tooltip.className = "map-tooltip";
      document.body.appendChild(tooltip);
      return tooltip;
    }

    // Show tooltip with content
    showTooltip(content, event) {
      const mouseX = event.clientX;
      const mouseY = event.clientY;

      this.tooltip.innerHTML = content;
      this.tooltip.style.display = "block";

      // Position tooltip
      const tooltipRect = this.tooltip.getBoundingClientRect();
      const offset = 15; // Distance from cursor

      // Check if tooltip would go off-screen
      const rightOverflow =
        mouseX + tooltipRect.width + offset > window.innerWidth;
      const bottomOverflow =
        mouseY + tooltipRect.height + offset > window.innerHeight;

      // Position tooltip based on overflow checks
      this.tooltip.style.left = rightOverflow
        ? `${mouseX - tooltipRect.width - offset}px`
        : `${mouseX + offset}px`;

      this.tooltip.style.top = bottomOverflow
        ? `${mouseY - tooltipRect.height - offset}px`
        : `${mouseY + offset}px`;
    }

    // Hide tooltip
    hideTooltip() {
      this.tooltip.style.display = "none";
    }

    // Create tooltip content
    createTooltipContent(countryData, category) {
      const categoryLabel = this.mapData.metadata.categories[category].label;
      const tagLabels = countryData.tags
        .map((tag) => this.mapData.metadata.tags[tag])
        .join(", ");

      return `
        <h3>${countryData.name}</h3>
        <p><strong>Status:</strong> ${categoryLabel}</p>
        ${tagLabels ? `<p><strong>Strategies:</strong> ${tagLabels}</p>` : ""}
      `;
    }

    // ========================================================= MODAL
    createModalElements() {
      // Create modal container
      const modal = document.createElement("div");
      modal.className = "country-modal";

      // Create modal content
      modal.innerHTML = `
          <div class="country-modal-header">
              <h2></h2>
              <button class="country-modal-close">&times;</button>
          </div>
          <div class="country-modal-content"></div>
      `;

      // Add event listeners
      modal
        .querySelector(".country-modal-close")
        .addEventListener("click", () => this.hideModal());

      // Add keyboard event listener for Escape key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("active")) {
          this.hideModal();
        }
      });

      // Add to DOM
      document.body.appendChild(modal);

      // Store reference
      this.modal = modal;
    }

    showModal(countryData) {
      // Set header content
      const header = this.modal.querySelector(".country-modal-header h2");
      header.textContent = countryData.name;

      // Generate content from sections
      const content = this.modal.querySelector(".country-modal-content");

      content.innerHTML = countryData.sections
        .map((section) => {
          // If section has no content and no sub-sections, skip it
          if (
            !section.content &&
            (!section["sub-sections"] || section["sub-sections"].length === 0)
          ) {
            return "";
          }

          let sectionHtml = `<div class="country-modal-section">
                  <h3>${section.heading}</h3>`;

          // Add main section content if it exists
          if (section.content) {
            sectionHtml += `<p>${section.content}</p>`;
          }

          // Add sub-sections if they exist
          if (section["sub-sections"] && section["sub-sections"].length > 0) {
            sectionHtml += section["sub-sections"]
              .map(
                (subSection) => `
                          <div class="country-modal-subsection">
                              <h4>${subSection.heading}</h4>
                              ${
                                subSection.content
                                  ? `<p>${subSection.content}</p>`
                                  : ""
                              }
                              ${
                                subSection.link
                                  ? `
                                  <a href="${subSection.link}" 
                                     target="_blank" 
                                     rel="noopener noreferrer" 
                                     class="more-info-link">
                                      More Information →
                                  </a>`
                                  : ""
                              }
                          </div>
                      `
              )
              .join("");
          }

          sectionHtml += "</div>";
          return sectionHtml;
        })
        .join("");

      // Show modal with animation
      requestAnimationFrame(() => {
        this.modal.classList.add("active");
      });
    }

    hideModal() {
      this.modal.classList.remove("active");

      // Remove active states when modal is closed
      document.querySelectorAll(".country-list-item").forEach((item) => {
        item.classList.remove("active");
      });

      this.mapGroup.querySelectorAll(".country-path").forEach((path) => {
        path.classList.remove("active");
      });
    }

    // ========================================================= FILTERING
    createFilters() {
      const leftSidebar = document.querySelector("aside:first-child");
      if (!leftSidebar) return;

      // Create category filters
      const categorySection = document.createElement("div");
      categorySection.className = "filter-section";
      categorySection.innerHTML = `
          <h3>Uptake of Malabo Convention</h3>
          <div class="filter-options" id="category-filters"></div>
      `;

      // Create tag filters
      const tagSection = document.createElement("div");
      tagSection.className = "filter-section";
      tagSection.innerHTML = `
          <h3>National Strategies</h3>
          <div class="filter-options" id="tag-filters"></div>
      `;

      leftSidebar.appendChild(categorySection);
      leftSidebar.appendChild(tagSection);
    }

    populateFilters() {
      const categoryFilters = document.getElementById("category-filters");
      const tagFilters = document.getElementById("tag-filters");

      // Populate categories with initial counts
      const categoryCounts = this.calculateCategoryCounts();
      Object.entries(this.mapData.metadata.categories)
        .sort((a, b) => a[1].order - b[1].order)
        .forEach(([categoryId, category]) => {
          const count = categoryCounts[categoryId] || 0;
          const option = document.createElement("div");
          option.className = "filter-option category-filter";
          option.setAttribute("data-category", categoryId);
          option.innerHTML = `
                    <span class="category-label">${category.label}</span>
                    <span class="tag-indicator">${count}</span>
                `;

          option.addEventListener("mouseenter", () => {
            this.highlightCategory(categoryId);
          });

          option.addEventListener("mouseleave", () => {
            this.resetHighlights();
          });

          categoryFilters.appendChild(option);
        });

      // Populate tags with counts (keeps checkboxes)
      const tagCounts = this.calculateTagCounts();
      Object.entries(this.mapData.metadata.tags).forEach(([tagId, label]) => {
        const count = tagCounts[tagId] || 0;
        const option = document.createElement("div");
        option.className = "filter-option";
        option.innerHTML = `
              <input type="checkbox" id="tag-${tagId}" 
                     data-filter-type="tag" data-filter-id="${tagId}">
              <label for="tag-${tagId}">${label}</label>
              <span class="tag-indicator">${count}</span>
          `;
        tagFilters.appendChild(option);
      });

      // Add event listeners for tag checkboxes only
      document
        .querySelectorAll('.filter-option input[type="checkbox"]')
        .forEach((checkbox) => {
          checkbox.addEventListener("change", () =>
            this.handleFilterChange(checkbox)
          );
        });
    }

    calculateCategoryCounts(activeTags = new Set()) {
      const counts = {};
      Object.values(this.mapData.countries).forEach((country) => {
        // Check if country matches tag filters
        const matchesTags =
          activeTags.size === 0 ||
          country.tags.some((tag) => activeTags.has(tag));

        if (matchesTags) {
          const category = this.determineCategory(country);
          counts[category] = (counts[category] || 0) + 1;
        }
      });
      return counts;
    }

    updateCategoryCounts() {
      const categoryCounts = this.calculateCategoryCounts(
        this.activeFilters.tags
      );

      // Update each category count display
      document
        .querySelectorAll(".category-filter")
        .forEach((categoryElement) => {
          const categoryId = categoryElement.getAttribute("data-category");
          const countElement = categoryElement.querySelector(".tag-indicator");
          const count = categoryCounts[categoryId] || 0;

          // Update count with animation
          const currentCount = parseInt(countElement.textContent);
          if (currentCount !== count) {
            countElement.classList.add("updating");
            setTimeout(() => {
              countElement.textContent = count;
              countElement.classList.remove("updating");
            }, 150);
          }
        });
    }

    calculateTagCounts() {
      const counts = {};
      Object.values(this.mapData.countries).forEach((country) => {
        country.tags.forEach((tag) => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      });
      return counts;
    }

    // New method to highlight specific category
    highlightCategory(categoryId) {
      const paths = this.mapGroup.querySelectorAll(".country-path");

      paths.forEach((path) => {
        const countryCode = path.getAttribute("data-country-code");
        const countryData = this.mapData.countries[countryCode];
        const category = this.determineCategory(countryData);

        // If country matches category, show category color, otherwise grey
        if (category === categoryId) {
          path.style.fill = this.mapData.metadata.categories[category].color;
        } else {
          path.style.fill = "#cdd1d7"; // Default grey
        }
      });
    }

    // New method to reset highlights
    resetHighlights() {
      // Apply current filters (if any) or show all categories if no filters
      this.applyFilters();
    }

    handleFilterChange(checkbox) {
      const filterType =
        checkbox.dataset.filterType === "category" ? "categories" : "tags";
      const filterId = checkbox.dataset.filterId;

      if (checkbox.checked) {
        this.activeFilters[filterType].add(filterId);
      } else {
        this.activeFilters[filterType].delete(filterId);
      }

      // Update counts first, then apply filters
      if (filterType === "tags") {
        this.updateCategoryCounts();
      }
      this.applyFilters();
    }

    applyFilters() {
      const paths = this.mapGroup.querySelectorAll(".country-path");

      paths.forEach((path) => {
        const countryCode = path.getAttribute("data-country-code");
        const countryData = this.mapData.countries[countryCode];
        const category = this.determineCategory(countryData);
        const tags = countryData.tags;

        // Now only check tag filters since categories are handled by hover
        const matchesTags =
          this.activeFilters.tags.size === 0 ||
          tags.some((tag) => this.activeFilters.tags.has(tag));

        if (matchesTags) {
          path.style.fill = this.mapData.metadata.categories[category].color;
        } else {
          path.style.fill = "#E0E0E0";
        }
      });
    }

    // ========================================================= COUNTRY LIST
    createCountryList() {
      const rightSidebar = document.querySelector("aside:last-child");
      if (!rightSidebar) return;

      // Clear existing content and add list
      const list = document.createElement("ul");
      list.className = "country-list";

      // Sort countries alphabetically
      const sortedCountries = Object.entries(this.mapData.countries).sort(
        ([, a], [, b]) => a.name.localeCompare(b.name)
      );

      // Create list items
      sortedCountries.forEach(([countryCode, countryData]) => {
        const category = this.determineCategory(countryData);
        const categoryColor = this.mapData.metadata.categories[category].color;

        const listItem = document.createElement("li");
        listItem.className = "country-list-item";
        listItem.setAttribute("data-country-code", countryCode);

        listItem.innerHTML = `
              <div class="category-indicator" style="background-color: ${categoryColor}"></div>
              <span class="country-name">${countryData.name}</span>
          `;

        // Add click handler
        listItem.addEventListener("click", () => {
          this.handleCountryListItemClick(countryCode);
        });

        list.appendChild(listItem);
      });

      // Clear and add new content
      rightSidebar.appendChild(list);
    }

    handleCountryListItemClick(countryCode) {
      // Remove active class from all list items
      document.querySelectorAll(".country-list-item").forEach((item) => {
        item.classList.remove("active");
      });

      // Add active class to clicked item
      const listItem = document.querySelector(
        `.country-list-item[data-country-code="${countryCode}"]`
      );
      if (listItem) {
        listItem.classList.add("active");
      }

      // Remove active class from all paths
      this.mapGroup.querySelectorAll(".country-path").forEach((path) => {
        path.classList.remove("active");
      });

      // Add active class to corresponding path
      const path = this.mapGroup.querySelector(
        `.country-path[data-country-code="${countryCode}"]`
      );
      if (path) {
        path.classList.add("active");
      }

      // Show modal for the country
      const countryData = this.mapData.countries[countryCode];
      if (countryData) {
        this.showModal(countryData);
      }
    }

    // ========================================================= PAN & ZOOM
    initializePanZoom() {
      // Initialize svg-pan-zoom with modified touch settings
      this.panZoom = svgPanZoom(this.svg, {
        viewportSelector: ".map-group",
        panEnabled: true,
        controlIconsEnabled: true,
        zoomEnabled: true,
        dblClickZoomEnabled: false, // Disable double-click zoom for better mobile experience
        mouseWheelZoomEnabled: true,
        preventMouseEventsDefault: false, // Important: Allow events to pass through
        zoomScaleSensitivity: 0.5,
        minZoom: 1,
        maxZoom: 10,
        fit: true,
        center: true,
        // Add touch configuration
        touchEnabled: true,
        preventTouchEventsDefault: false, // Important: Allow touch events to pass through
        beforeTouch: function () {
          // Return true to prevent pan/zoom from hijacking the touch event
          return false;
        },
        beforePan: function (oldPan, newPan) {
          return newPan;
        },
      });

      // Handle window resize
      window.addEventListener("resize", () => {
        this.panZoom.resize();
        this.panZoom.fit();
        this.panZoom.center();
      });

      // Create custom control container
      //this.createZoomControls();
    }

    createZoomControls() {
      const controlsContainer = document.createElement("div");
      controlsContainer.className = "map-controls";

      const zoomIn = document.createElement("button");
      zoomIn.innerHTML = "+";
      zoomIn.className = "map-control-btn";
      zoomIn.addEventListener("click", () => this.panZoom.zoomIn());

      const zoomOut = document.createElement("button");
      zoomOut.innerHTML = "-";
      zoomOut.className = "map-control-btn";
      zoomOut.addEventListener("click", () => this.panZoom.zoomOut());

      const resetZoom = document.createElement("button");
      resetZoom.innerHTML = "⟲";
      resetZoom.className = "map-control-btn";
      resetZoom.addEventListener("click", () => {
        this.panZoom.fit();
        this.panZoom.center();
      });

      controlsContainer.appendChild(zoomIn);
      controlsContainer.appendChild(zoomOut);
      controlsContainer.appendChild(resetZoom);

      this.container.appendChild(controlsContainer);
    }

    // ========================================================= SVG CREATION
    initializeSVG() {
      this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      this.svg.setAttribute("viewBox", "0 0 239.05701 217.31789");
      this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      this.svg.setAttribute("version", "1.1");
      this.svg.setAttribute("id", "africa-map");
      this.svg.classList.add("africa-map");

      this.svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      this.svg.setAttribute("xmlns:svg", "http://www.w3.org/2000/svg");
      this.svg.setAttribute(
        "xmlns:rdf",
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
      );
      this.svg.setAttribute("xmlns:cc", "http://creativecommons.org/ns#");
      this.svg.setAttribute("xmlns:dc", "http://purl.org/dc/elements/1.1/");
      this.svg.setAttribute("xmlns:mapsvg", "http://mapsvg.com");

      this.svg.setAttribute(
        "mapsvg:geoViewBox",
        "-25.360994 37.343521 59.838547 -34.833225"
      );

      this.svg.style.width = "100%";
      this.svg.style.height = "100%";

      this.mapGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g"
      );
      this.mapGroup.classList.add("map-group");

      this.svg.appendChild(this.mapGroup);
      this.container.appendChild(this.svg);
    }

    determineCategory(countryData) {
      if (countryData.dates.ratification && countryData.dates.deposit) {
        return "RATIFIED";
      } else if (countryData.dates.signature) {
        return "SIGNED";
      }
      return "NOT_SIGNED";
    }

    createCountryPath(countryCode, countryData) {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      const category = this.determineCategory(countryData);

      path.setAttribute("d", countryData.paths);
      path.setAttribute("data-country-code", countryCode);
      path.setAttribute("data-category", category);
      path.setAttribute("data-tags", countryData.tags.join(","));
      path.setAttribute("title", countryData.name);
      path.classList.add("country-path");

      path.style.fill = this.mapData.metadata.categories[category].color;

      path.addEventListener("mouseenter", (e) => {
        path.classList.add("active");
        const content = this.createTooltipContent(countryData, category);
        this.showTooltip(content, e);
      });

      path.addEventListener("mouseleave", () => {
        path.classList.remove("active");
        this.hideTooltip();
      });

      path.addEventListener("click", () => {
        // this.showModal(countryData);
        this.handleCountryListItemClick(countryCode);
      });

      return path;
    }

    calculatePathCenter(path) {
      const bbox = path.getBBox();
      return {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2,
      };
    }

    // ========================================================= PARTICLES
    async initializeParticles() {
      try {
        // Fetch the particles configuration
        const response = await fetch("/assets/data/particlesjs-config.json");
        const particlesConfig = await response.json();

        // Initialize particles.js with the config
        particlesJS("app", particlesConfig);

        //! console.log("Particles.js initialized successfully");
      } catch (error) {
        console.error("Error initializing particles.js:", error);
      }
    }

    // ========================================================= FINAL RENDER
    async render(jsonData) {
      this.mapData = jsonData;

      if (!this.svg) {
        this.initializeSVG();
      }

      // Clear existing content
      while (this.mapGroup.firstChild) {
        this.mapGroup.removeChild(this.mapGroup.firstChild);
      }

      // Create filter UI
      this.createFilters();

      // Create country list
      this.createCountryList();

      // Render countries
      Object.entries(this.mapData.countries).forEach(
        ([countryCode, countryData]) => {
          const path = this.createCountryPath(countryCode, countryData);
          this.mapGroup.appendChild(path);
        }
      );

      // Populate filters after countries are rendered
      this.populateFilters();

      // Initialize pan-zoom functionality
      this.initializePanZoom();

      // Initialize particles.js last
      await this.initializeParticles();

      return this;
    }
  }

  return MapRenderer;
})();
