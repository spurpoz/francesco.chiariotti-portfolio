(() => {


        const scroller = document.querySelector(".work-slides");
        const slides = [...document.querySelectorAll(".work-slide")];

        let activeSlide = null;

        function loadVideo(video) {
            if (!video || video.dataset.loaded === "true") return;

            const source = video.querySelector("source[data-src]");
            if (!source || (source.media && !matchMedia(source.media).matches)) return;

            source.src = source.dataset.src;
            video.dataset.loaded = "true";
            video.preload = "auto";
            video.load();
        }

        function updatePlayback() {
            slides.forEach(slide => {
                const video = slide.querySelector("video");
                if (!video) return;

                if (slide === activeSlide && !document.hidden) {
                    loadVideo(video);
                    video.play().catch(() => {});
                } else {
                    video.pause();
                }
            });
        }

        function activateSlide(slide) {
            if (activeSlide === slide) return;

            activeSlide = slide;

            slides.forEach(item => {
                item.classList.toggle("is-active", item === slide);
            });

            updatePlayback();
        }

        /* Precarica i video vicini alla schermata */

        const preloadObserver = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;

                    const video = entry.target.querySelector("video");

                    loadVideo(video);
                    preloadObserver.unobserve(entry.target);
                });
            },
            {
                root: scroller,
                rootMargin: "150px 0px",
                threshold: 0
            }
        );

        /* Riproduce un solo video alla volta */

        const activeObserver = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.target === activeSlide && !entry.isIntersecting) {
                        activateSlide(null);
                    }
                    if (
                        entry.isIntersecting &&
                        entry.intersectionRatio >= 0.55
                    ) {
                        activateSlide(entry.target);
                    }
                });
            },
            {
                root: scroller,
                threshold: [0, 0.55, 1]
            }
        );

        slides.forEach(slide => {
            preloadObserver.observe(slide);
            activeObserver.observe(slide);
        });

        document.addEventListener(
            "visibilitychange",
            updatePlayback
        );

        // Keep the original playback observers, including when returning to the intro/footer.
        const introObserver = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .55)) {
                activateSlide(null);
            }
        }, { root: scroller, threshold: [0, .55, 1] });
        document.querySelectorAll('.home-intro, .about-section, .contacts-section').forEach(section => introObserver.observe(section));


        activateSlide(null);
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
        function navigateTo(hash, updateHistory = true, smooth = true) {
            const target = document.getElementById(hash.slice(1));
            if (!target || !scroller.contains(target)) return;
            const top = target.getBoundingClientRect().top
                - scroller.getBoundingClientRect().top + scroller.scrollTop;
            scroller.scrollTo({ top, behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant' });
            if (updateHistory && location.hash !== hash) history.pushState(null, '', hash);
            if (target.hasAttribute('tabindex') === false) target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
        }
        document.addEventListener('click', event => {
            const link = event.target.closest('a[href^="#"]');
            if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const hash = link.getAttribute('href');
            if (!['#top', '#about', '#projects', '#contacts'].includes(hash)) return;
            event.preventDefault();
            requestAnimationFrame(() => navigateTo(hash));
        });
        window.addEventListener('popstate', () => navigateTo(location.hash || '#top', false));
        window.addEventListener('load', () => {
            if (location.hash) navigateTo(location.hash, false, false);
        });
        // The optional lens splash can finish after the document has loaded.
        window.addEventListener('portfolio:splash-failed', () => {
            if (location.hash) requestAnimationFrame(() => navigateTo(location.hash, false, false));
        });

})();
