/* =========================
CARGA DEL HEADER (ESTABLE)
========================= */
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("header-container");
    if (!container) return;

    fetch("header.html")
        .then(res => res.text())
        .then(data => {
            container.innerHTML = data;
            initHeader();
            initSearch();
            updateCartCount();
        })
        .catch(err => console.error("Header error:", err));
});

/* =========================
HEADER
========================= */
function initHeader() {
    document.getElementById("cart-button")?.addEventListener("click", () => {
        window.location.href = "carrito.html";
    });

    document.getElementById("open-schedule")?.addEventListener("click", e => {
        e.preventDefault();
        document.getElementById("schedule-modal")?.showModal();
    });

    document.querySelector(".modal__close-button")
        ?.addEventListener("click", () =>
            document.getElementById("schedule-modal")?.close()
        );
}

/* =========================
BUSCADOR
========================= */
function initSearch() {
    const searchIcon = document.querySelector(".header__search-icon");
    const searchBar = document.querySelector(".search-bar");
    const searchInput = document.getElementById("search-input");

    if (!searchIcon || !searchBar || !searchInput) return;

    searchIcon.onclick = () => {
        searchBar.classList.toggle("search-bar--active");
        searchInput.focus();
    };

    searchInput.addEventListener("keydown", e => {
        if (e.key === "Enter" && searchInput.value.trim()) {
            window.location.href =
                `resultados.html?search=${encodeURIComponent(searchInput.value.trim())}`;
        }
    });
}

/* =========================
CARRITO
========================= */
function getCart() {
    return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const badge = document.getElementById("cart-count");
    if (!badge) return;

    const total = getCart().reduce(
        (acc, item) => acc + Number(item.quantity || 0),
        0
    );
    badge.textContent = total;
}

/* =========================
DETALLE PRODUCTO (AISLADO)
========================= */
(function () {
    if (
        typeof PRODUCTS === "undefined" ||
        !document.getElementById("product-name")
    ) return;

    const params = new URLSearchParams(window.location.search);
    const productId = params.get("id");
    if (!productId) return;

    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    document.getElementById("product-name").textContent = product.name;
    document.getElementById("product-desc").textContent = product.description;
    document.getElementById("product-img").src = product.image;

    let quantity = 1;
    let extras = 0;

    const basePrice = Number(product.price);
    const totalEl = document.getElementById("total-price");

    function updateTotal() {
        totalEl.textContent = `$${(basePrice + extras) * quantity}`;
    }

    document.getElementById("plus").onclick = () => {
        quantity++;
        document.getElementById("qty").textContent = quantity;
        updateTotal();
    };

    document.getElementById("minus").onclick = () => {
        if (quantity > 1) quantity--;
        document.getElementById("qty").textContent = quantity;
        updateTotal();
    };

    document.querySelectorAll("[data-price]").forEach(i => {
        i.addEventListener("change", () => {
            extras = [...document.querySelectorAll("[data-price]:checked")]
                .reduce((s, x) => s + Number(x.dataset.price), 0);
            updateTotal();
        });
    });

    document.querySelector(".add-button").onclick = () => {
        const cart = getCart();
        cart.push({
            id: product.id,
            name: product.name,
            quantity,
            price: basePrice + extras
        });
        saveCart(cart);
        alert("Producto agregado 🛒");
    };

    updateTotal();
})();

/* =========================
CLICK PRODUCTO → DETALLE
========================= */
document.addEventListener("click", e => {
    const card = e.target.closest(".product-row");
    if (!card?.dataset?.id) return;

    window.location.href =
        `detalleproductos.html?id=${card.dataset.id}`;
});
/* =========================
ESTADO GLOBAL
========================= */
let selectedDelivery = null; // retiro | delivery
let selectedPayment = null;  // efectivo | online

/* =========================
HELPERS
========================= */
function getCart() {
    return JSON.parse(localStorage.getItem("cart")) || [];
}

function formatPrice(n) {
    return `$${Number(n).toLocaleString("es-AR")}`;
}

/* =========================
SELECCIÓN BOTONES
========================= */
document.querySelectorAll("[data-delivery]").forEach(btn => {
    btn.addEventListener("click", () => {
        selectedDelivery = btn.dataset.delivery;

        document.querySelectorAll("[data-delivery]")
            .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");

        document.getElementById("address-box").style.display =
            selectedDelivery === "delivery" ? "block" : "none";
    });
});

document.querySelectorAll("[data-payment]").forEach(btn => {
    btn.addEventListener("click", () => {
        selectedPayment = btn.dataset.payment;

        document.querySelectorAll("[data-payment]")
            .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");

        document.getElementById("online-info").style.display =
            selectedPayment === "online" ? "block" : "none";
    });
});

/* =========================
TOTAL
========================= */
function updateTotal() {
    const cart = getCart();
    let total = 0;

    cart.forEach(i => {
        total += Number(i.price) * Number(i.quantity);
    });

    document.getElementById("total").textContent = formatPrice(total);
    return total;
}

updateTotal();

/* =========================
MAPA SIMPLE
========================= */
function updateMap(address) {
    const map = document.getElementById("map");
    map.src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}
/* ========================= 
CHECKOUT FINAL + MAPA REAL
========================= */

(function () {

    /* ================= VARIABLES ================= */
    const sendBtn = document.getElementById("send-order");
    if (!sendBtn) return;

    const deliveryButtons = document.querySelectorAll("[data-delivery]");
    const paymentButtons = document.querySelectorAll("[data-payment]");

    const addressBox = document.getElementById("address-box");
    const cashBox = document.getElementById("cash-box");
    const shippingCostEl = document.getElementById("shipping-cost");

    const totalEl = document.getElementById("total");

    const openMapBtn = document.getElementById("open-map");
    const mapModal = document.getElementById("map-modal");
    const closeMapBtn = document.getElementById("close-map");
    const confirmLocationBtn = document.getElementById("confirm-location");

    let deliveryType = null;
    let paymentType = null;
    let deliveryCost = 0;
    const DELIVERY_PRICE = 1500;


    let map;
    let marker;
    let userLat = null;
    let userLng = null;

    /* ================= CARRITO ================= */
    function getCart() {
        return JSON.parse(localStorage.getItem("cart")) || [];
    }

    function getCartTotal() {
        return getCart().reduce(
            (acc, item) => acc + item.priceUnit * item.quantity,
            0
        );
    }

    function updateTotal() {
        const subtotal = getCartTotal();
        const total = subtotal + deliveryCost;
        totalEl.textContent = `$${total}`;
    }

    /* ================= HELPERS ================= */
    function setActive(btns, current) {
        btns.forEach(b => b.classList.remove("active"));
        current.classList.add("active");
    }

    /* ================= ENTREGA ================= */
    deliveryButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            setActive(deliveryButtons, btn);
            deliveryType = btn.dataset.delivery;

            if (deliveryType === "delivery") {
            addressBox.classList.remove("hidden");
            deliveryCost = DELIVERY_PRICE;
            shippingCostEl.classList.remove("hidden");
            shippingCostEl.textContent = `$${DELIVERY_PRICE}`;
        } else {
            addressBox.classList.add("hidden");
            deliveryCost = 0;
            shippingCostEl.classList.add("hidden");
        }

            updateTotal();
        });
    });

    /* ================= PAGO ================= */
    paymentButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            setActive(paymentButtons, btn);
            paymentType = btn.dataset.payment;

            if (paymentType === "efectivo") {
                cashBox.classList.remove("hidden");
            } else {
                cashBox.classList.add("hidden");
            }
        });
    });

    /* ================= MAPA ================= */
    function initMap(lat, lng) {
        map = new google.maps.Map(document.getElementById("map"), {
            center: { lat, lng },
            zoom: 17,
        });

        marker = new google.maps.Marker({
            position: { lat, lng },
            map,
            draggable: true
        });

        userLat = lat;
        userLng = lng;

        map.addListener("click", e => {
            marker.setPosition(e.latLng);
            userLat = e.latLng.lat();
            userLng = e.latLng.lng();
        });
    }

    openMapBtn?.addEventListener("click", () => {
        mapModal.classList.remove("hidden");

        navigator.geolocation.getCurrentPosition(
            pos => initMap(pos.coords.latitude, pos.coords.longitude),
            () => alert("No se pudo obtener tu ubicación"),
            { enableHighAccuracy: true }
        );
    });

    closeMapBtn?.addEventListener("click", () => {
        mapModal.classList.add("hidden");
    });

    confirmLocationBtn?.addEventListener("click", () => {
        if (!userLat || !userLng) {
            alert("Marcá una ubicación en el mapa");
            return;
        }

        mapModal.classList.add("hidden");
        updateTotal();
    });

    /* ================= ENVIAR WHATSAPP ================= */
    sendBtn.addEventListener("click", () => {

        const name = document.getElementById("full-name").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const cash = document.getElementById("cash-amount")?.value.trim();
        const address = document.getElementById("address").value.trim();
        const reference = document.getElementById("reference").value.trim();
        const obs = document.getElementById("observations").value.trim();

        if (!name || !phone || !deliveryType || !paymentType) {
            alert("Completá todos los datos obligatorios");
            return;
        }

        if (paymentType === "efectivo" && (!cash || Number(cash) <= 0)) {
            alert("Indicá con cuánto pagás");
            return;
        }

        if (deliveryType === "delivery" && (!userLat || !userLng)) {
            alert("Marcá tu ubicación en el mapa");
            return;
        }

        const cart = getCart();
        if (!cart.length) {
            alert("El carrito está vacío");
            return;
        }

        const fecha = new Date();
        const fechaStr =
            fecha.toLocaleDateString("es-AR") +
            " - " +
            fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) +
            "hs";

        let msg = `*El pana*\n\n`;
        msg += `Fecha: ${fechaStr}\n`;
        msg += `Nombre y apellido: ${name}\n`;
        msg += `Teléfono: ${phone}\n`;
        msg += `Forma de pago: ${paymentType}\n`;
        if (paymentType === "efectivo") msg += `Abona con: $${cash}\n`;

        msg += `\nEntrega:\n`;
        msg += deliveryType === "delivery" ? "Delivery\n" : "Retiro en el local\n";

        if (deliveryType === "delivery") {
            msg += `Dirección: ${address}\n`;
            if (reference) msg += `Referencia: ${reference}\n`;
            msg += `Ubicación: https://www.google.com/maps?q=${userLat},${userLng}\n`;
            msg += `Costo de envío: $${deliveryCost}\n`;
        }

        if (obs) msg += `Observaciones: ${obs}\n`;

        msg += `\n*Mi pedido es*\n\n`;

        let subtotal = 0;

        cart.forEach(p => {
            const sub = p.priceUnit * p.quantity;
            subtotal += sub;

            msg += `• ${p.name} x${p.quantity}\n`;
            if (p.salsa) msg += `   Salsa: ${p.salsa}\n`;
            if (p.rellenos?.length) msg += `   Rellenos: ${p.rellenos.join(", ")}\n`;
            if (p.note) msg += `   Observación: ${p.note}\n`;
            msg += `   Subtotal: $${sub}\n\n`;
        });

        const total = subtotal + deliveryCost;

        msg += `Subtotal: $${subtotal}\n`;
        if (deliveryCost) msg += `Costo de envío: +$${deliveryCost}\n`;
        msg += `*TOTAL: $${total}*\n\n`;
        msg += `Espero tu respuesta para confirmar mi pedido`;

        window.open(
            `https://wa.me/5493516994795?text=${encodeURIComponent(msg)}`,
            "_blank"
        );
    });

    updateTotal();

})();
