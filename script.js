// Obtener los elementos del formulario
const formulario = document.getElementById("formulario-cambio");
const mensaje = document.getElementById("mensaje-formulario");
const boton = document.getElementById("boton-calcular");

// Función para mostrar mensajes
function mostrarMensaje(texto) {
    mensaje.textContent = texto;
}

// Función para dar formato a los valores
function formatoDinero(valor, moneda = "COP") {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: moneda,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor);
}

// Consultar el archivo JSON
async function consultarJSON() {

    const respuesta = await fetch("./trm.json");

    if (!respuesta.ok) {
        throw new Error("Error al leer el archivo JSON");
    }

    return await respuesta.json();
}

// Consultar la API pública
async function consultarAPI() {

    console.log("Iniciando consulta a la API pública...");

    const respuesta = await fetch("https://open.er-api.com/v6/latest/COP");

    console.log("Código HTTP de la API:", respuesta.status);

    if (!respuesta.ok) {
        throw new Error("Error al consultar la API");
    }

    const datos = await respuesta.json();

    console.log("Respuesta completa de la API:", datos);

    if (datos.result !== "success" || !datos.rates) {
        throw new Error("No se encontraron las tasas");
    }

    return datos;
}

// Mostrar los resultados en la página
function mostrarResultado(datos) {

    document.getElementById("resultado-cliente").textContent = datos.nombre;

    document.getElementById("resultado-documento").textContent =
        "Documento: " + datos.documento;

    document.getElementById("resultado-fuente").textContent =
        "Fuente: " + datos.fuente;

    document.getElementById("resultado-fecha").textContent =
        "Fecha TRM: " + datos.fecha;

    document.getElementById("resultado-entregado").textContent =
        formatoDinero(datos.monto, datos.moneda);

    document.getElementById("moneda-recibida").textContent =
        datos.moneda;

    document.getElementById("tasa-moneda-entregada").textContent =
        formatoDinero(datos.tasaEntrega);

    document.getElementById("tasa-moneda-comprada").textContent =
        formatoDinero(datos.tasaCompra);

    document.getElementById("valor-bruto-cop").textContent =
        formatoDinero(datos.valorBruto);

    document.getElementById("comision-cop").textContent =
        formatoDinero(datos.comision);

    document.getElementById("neto-cop").textContent =
        formatoDinero(datos.neto);

    // Ocultar el mensaje inicial y mostrar el resultado
    document.getElementById("resultado-inicial").hidden = true;

    document.getElementById("contenido-resultado").hidden = false;
}

// Función principal para calcular el cambio
async function calcularCambio(evento) {

    evento.preventDefault();

    mostrarMensaje("");

    // Obtener los datos del cliente
    const nombre = document.getElementById("nombre-cliente").value.trim();

    const documento = document.getElementById("documento-cliente").value.trim();

    // Obtener los datos de la operación
    const monto = Number(document.getElementById("monto").value);

    const monedaEntrega = document.getElementById("moneda-entrega").value;

    const monedaCompra = document.getElementById("moneda-compra").value;

    const fuente = document.querySelector('input[name="fuente"]:checked').value;

    // Validar los datos del formulario
    if (
        nombre === "" ||
        documento === "" ||
        !/^[0-9]+$/.test(documento) ||
        document.getElementById("monto").value === "" ||
        !Number.isFinite(monto) ||
        monto <= 0
    ) {

        mostrarMensaje("Revise los datos del formulario");

        return;
    }

    // Revisar que las monedas sean diferentes
    if (monedaEntrega === monedaCompra) {

        mostrarMensaje("Seleccione monedas diferentes");

        return;
    }

    // Desactivar el botón mientras se consultan las tasas
    boton.disabled = true;

    boton.textContent = "Consultando TRM...";

    mostrarMensaje("Consultando TRM...");

    try {

        // Leer el archivo JSON porque allí está la comisión
        const datosJSON = await consultarJSON();

        let tasaEntrega;
        let tasaCompra;
        let fecha;
        let nombreFuente;

        // Revisar la fuente seleccionada
        if (fuente === "api") {

            // Consultar la API
            const datosAPI = await consultarAPI();

            // Buscar las tasas de las monedas
            const tasa1 = datosAPI.rates[monedaEntrega];

            const tasa2 = datosAPI.rates[monedaCompra];

            console.log("Moneda entregada:", monedaEntrega, "Tasa API:", tasa1);

            console.log("Moneda comprada:", monedaCompra, "Tasa API:", tasa2);

            // Verificar que las tasas existan
            if (
                typeof tasa1 !== "number" ||
                typeof tasa2 !== "number" ||
                tasa1 <= 0 ||
                tasa2 <= 0
            ) {

                throw new Error("No se encontraron las tasas de las monedas");

            }

            // Calcular las TRM usando el peso colombiano
            tasaEntrega = 1 / tasa1;

            tasaCompra = 1 / tasa2;

            // Redondear las tasas a dos decimales
            tasaEntrega = Math.round(tasaEntrega * 100) / 100;

            tasaCompra = Math.round(tasaCompra * 100) / 100;

            fecha = new Date(datosAPI.time_last_update_utc).toLocaleDateString("es-CO");

            nombreFuente = "API pública";

        } else {

            // Buscar las monedas en el archivo JSON
            const moneda1 = datosJSON.monedas.find(function(moneda) {

                return moneda.codigo === monedaEntrega;

            });

            const moneda2 = datosJSON.monedas.find(function(moneda) {

                return moneda.codigo === monedaCompra;

            });

            // Revisar que las monedas existan
            if (!moneda1 || !moneda2) {

                throw new Error("No se encontraron las monedas en el JSON");

            }

            tasaEntrega = moneda1.trm;

            tasaCompra = moneda2.trm;

            fecha = datosJSON.fecha;

            nombreFuente = "Archivo JSON";

        }

        // Realizar los cálculos
        const valorEnCOP = Math.round(monto * tasaEntrega);

        const comision = Math.round(valorEnCOP * datosJSON.comisionPorcentaje);

        const netoEnCOP = valorEnCOP - comision;

        const montoEntregado = Math.round((netoEnCOP / tasaCompra) * 100) / 100;

        // Guardar los datos para mostrar el resultado
        const resultado = {

            nombre: nombre,

            documento: documento,

            fuente: nombreFuente,

            fecha: fecha,

            tasaEntrega: tasaEntrega,

            tasaCompra: tasaCompra,

            valorBruto: valorEnCOP,

            comision: comision,

            neto: netoEnCOP,

            monto: montoEntregado,

            moneda: monedaCompra

        };

        // Mostrar el resultado
        mostrarResultado(resultado);

        mostrarMensaje("");

    } catch (error) {

        console.log(error);

        // Mostrar el mensaje dependiendo de la fuente
        if (fuente === "api") {

            mostrarMensaje("No se pudo consultar la API. Use el archivo JSON");

        } else {

            mostrarMensaje("No se pudo consultar el archivo JSON. Intente nuevamente.");

        }

    } finally {

        // Activar nuevamente el botón
        boton.disabled = false;

        boton.textContent = "Calcular cambio";

    }

}

// Ejecutar la función cuando se envíe el formulario
formulario.addEventListener("submit", calcularCambio);
