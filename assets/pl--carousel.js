import EmblaCarousel from "./pl--vendor-embla-carousel.esm.js"

// ––––––––––––––––––––––––––––––––––––––––
// Dot Navigation
// ––––––––––––––––––––––––––––––––––––––––

const addDotBtnsAndClickHandlers = (emblaApi, dotsNode) => {
  let dotNodes = []

  const addDotBtnsWithClickHandlers = () => {
    dotsNode.innerHTML = emblaApi
      .scrollSnapList()
      .map(() => '<button class="pl--carousel__dot" type="button"></button>')
      .join("")

    const scrollTo = (index) => {
      emblaApi.scrollTo(index)
    }

    dotNodes = Array.from(dotsNode.querySelectorAll(".pl--carousel__dot"))
    dotNodes.forEach((dotNode, index) => {
      dotNode.addEventListener("click", () => scrollTo(index), false)
    })
  }

  const toggleDotBtnsActive = () => {
    const previous = emblaApi.previousScrollSnap()
    const selected = emblaApi.selectedScrollSnap()
    dotNodes[previous].classList.remove("pl--carousel__dot--selected")
    dotNodes[selected].classList.add("pl--carousel__dot--selected")
  }

  emblaApi
    .on("init", addDotBtnsWithClickHandlers)
    .on("reInit", addDotBtnsWithClickHandlers)
    .on("init", toggleDotBtnsActive)
    .on("reInit", toggleDotBtnsActive)
    .on("select", toggleDotBtnsActive)

  return () => {
    dotsNode.innerHTML = ""
  }
}

// ––––––––––––––––––––––––––––––––––––––––
// Previus & Next Buttons
// ––––––––––––––––––––––––––––––––––––––––

const addTogglePrevNextBtnsActive = (emblaApi, prevBtn, nextBtn) => {
  const togglePrevNextBtnsState = () => {
    if (emblaApi.canScrollPrev()) prevBtn.removeAttribute("disabled")
    else prevBtn.setAttribute("disabled", "disabled")

    if (emblaApi.canScrollNext()) nextBtn.removeAttribute("disabled")
    else nextBtn.setAttribute("disabled", "disabled")
  }

  emblaApi
    .on("select", togglePrevNextBtnsState)
    .on("init", togglePrevNextBtnsState)
    .on("reInit", togglePrevNextBtnsState)

  return () => {
    prevBtn.removeAttribute("disabled")
    nextBtn.removeAttribute("disabled")
  }
}

const addPrevNextBtnsClickHandlers = (emblaApi, prevBtn, nextBtn) => {
  const scrollPrev = () => {
    emblaApi.scrollPrev()
  }
  const scrollNext = () => {
    emblaApi.scrollNext()
  }
  prevBtn.addEventListener("click", scrollPrev, false)
  nextBtn.addEventListener("click", scrollNext, false)

  const removeTogglePrevNextBtnsActive = addTogglePrevNextBtnsActive(emblaApi, prevBtn, nextBtn)

  return () => {
    removeTogglePrevNextBtnsActive()
    prevBtn.removeEventListener("click", scrollPrev, false)
    nextBtn.removeEventListener("click", scrollNext, false)
  }
}

// ––––––––––––––––––––––––––––––––––––––––
// Custom Carousel Element
// ––––––––––––––––––––––––––––––––––––––––

class PlCarousel extends HTMLElement {
  #embla
  #updateEdges
  #removeDotBtnsAndClickHandlers
  #removePrevNextBtnsClickHandlers

  connectedCallback() {
    const root = this

    const viewportNode = root.querySelector(":scope > [data-embla-viewport]")
    const prevBtnNode = root.querySelector(":scope > .pl--carousel__controls [data-embla-prev]")
    const nextBtnNode = root.querySelector(":scope > .pl--carousel__controls [data-embla-next]")
    const dotNavNode = root.querySelector(":scope > .pl--carousel__controls [data-embla-dot-nav]")

    const duration = root.getAttribute("data-duration") || 25
    const durationMobile = root.getAttribute("data-duration-mobile") || 25
    const align = root.getAttribute("data-align") || "start"
    const alignMobile = root.getAttribute("data-align-mobile") || "start"
    const containScroll = root.getAttribute("data-contain-scroll") === "true" ? "trimSnaps" : false
    const containScrollMobile =
      root.getAttribute("data-contain-scroll-mobile") === "true" ? "trimSnaps" : false
    const slidesToScroll = root.getAttribute("data-slides-to-scroll") === "auto" ? "auto" : 1
    const slidesToScrollMobile =
      root.getAttribute("data-slides-to-scroll-mobile") === "auto" ? "auto" : 1
    const watchDrag = root.getAttribute("data-watch-drag") === "true"
    const watchDragMobile = root.getAttribute("data-watch-drag-mobile") === "true"

    const OPTIONS = {
      align: align,
      duration: duration,
      containScroll: containScroll,
      slidesToScroll: slidesToScroll,
      watchDrag: watchDrag,
      breakpoints: {
        "(max-width: 768px)": {
          align: alignMobile,
          duration: durationMobile,
          containScroll: containScrollMobile,
          slidesToScroll: slidesToScrollMobile,
          watchDrag: watchDragMobile,
        },
      },
    }

    this.#embla = EmblaCarousel(viewportNode, OPTIONS)

    if (dotNavNode) {
      this.#removeDotBtnsAndClickHandlers = addDotBtnsAndClickHandlers(
        this.#embla,
        dotNavNode,
        dotNavNode.className
      )
    }
    if (prevBtnNode && nextBtnNode) {
      this.#removePrevNextBtnsClickHandlers = addPrevNextBtnsClickHandlers(
        this.#embla,
        prevBtnNode,
        nextBtnNode
      )
    }

    // Add edge detection
    this.#updateEdges = () => {
      const ref = root.parentElement || root
      const rect = ref.getBoundingClientRect()
      this.style.setProperty("--rb-left", rect.left + "px")
      this.style.setProperty("--rb-right", window.innerWidth - rect.right + "px")
    }
    this.#updateEdges()
    window.addEventListener("resize", this.#updateEdges, { passive: true })
  }
  disconnectedCallback() {
    // Clean up Embla event handlers
    if (this.#removeDotBtnsAndClickHandlers) {
      this.#removeDotBtnsAndClickHandlers()
    }
    if (this.#removePrevNextBtnsClickHandlers) {
      this.#removePrevNextBtnsClickHandlers()
    }

    // Clean up resize listener
    window.removeEventListener("resize", this.#updateEdges, { passive: true })

    this.#embla?.destroy()
  }
}
if (!customElements.get("pl-carousel")) {
  customElements.define("pl-carousel", PlCarousel)
}
