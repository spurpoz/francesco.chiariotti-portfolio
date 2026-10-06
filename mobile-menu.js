(() => {
    const button = document.querySelector(".mobile-menu-toggle");
    const menu = document.querySelector(".mobile-menu");
    const mobile = window.matchMedia("(max-width: 700px)");

    if (!button || !menu) return;

    let open = false;
    let savedInert = [];

    function setOpen(value, restoreFocus = true) {
        open = value;

        if (open) {
            // Disattiva i contenuti dietro al menu.
            const background = [
                ...document.querySelectorAll(
                    "main, .home-corners, .corners"
                )
            ];

            savedInert = background.map((element) => [
                element,
                element.inert
            ]);

            background.forEach((element) => {
                element.inert = true;
            });
        } else {
            savedInert.forEach(([element, wasInert]) => {
                element.inert = wasInert;
            });

            savedInert = [];
        }

        menu.inert = !open;
        document.body.classList.toggle("mobile-menu-open", open);

        button.setAttribute("aria-expanded", String(open));
        button.setAttribute(
            "aria-label",
            open ? "Chiudi menu" : "Apri menu"
        );

        if (open) {
            menu.querySelector("a").focus({ preventScroll: true });
        } else if (restoreFocus) {
            button.focus({ preventScroll: true });
        }
    }

    button.addEventListener("click", () => {
        setOpen(!open);
    });

    menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            setOpen(false, false);
        });
    });

    document.addEventListener("keydown", (event) => {
        if (!open) return;

        if (event.key === "Escape") {
            setOpen(false);
            return;
        }

        if (event.key === "Tab") {
            const controls = [
                button,
                ...menu.querySelectorAll("a")
            ];

            const current = controls.indexOf(document.activeElement);
            const direction = event.shiftKey ? -1 : 1;
            const next = (
                current + direction + controls.length
            ) % controls.length;

            event.preventDefault();
            controls[next].focus();
        }
    });

    mobile.addEventListener("change", () => {
        if (!mobile.matches && open) {
            setOpen(false, false);
        }
    });

    window.addEventListener("pagehide", () => {
        if (open) setOpen(false, false);
    });
})();