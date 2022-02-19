const axios = require("axios").default;
const { JSDOM } = require("jsdom");
const jsdom = require("jsdom");
const updateSpreadsheet = require("./spreadsheet");

const start_url =
    "https://www.arukereso.hu/videokartya-c3142/f:rtx-3070,rtx-3080,rtx-3090,rtx-3060,rtx-3060-ti,rx-6800,rx-6800-xt,rx-6900-xt,rx-6700-xt,rtx-3080-ti,rtx-3070-ti,rx-6600-xt,rx-6600,rx-6500-xt,rtx-3050/?start=0";
const GET_HISTORY = false;

async function main() {
    let start = new Date();
    let res = await axios.get(start_url);
    let products = await parsePages(res.data);
    let delta = new Date() - start;
    console.log(
        `Parsed ${products.length} products in ${delta / 1000} seconds`
    );
    updateSpreadsheet(products, GET_HISTORY);
}

async function parsePages(data) {
    let { document } = new JSDOM(data, { pretendToBeVisual: true }).window;
    let num_of_pages = document
        .querySelector(".pagination.hidden-xs")
        .querySelector("p")
        .textContent.split("/")[1]
        .trim();
    console.log(`Number of pages: ${num_of_pages}`);
    console.log(`--------------------------------`);

    let promises = [];
    for (let i = 0; i < num_of_pages; i++) {
        promises.push(requestAndParsePage(i));
    }
    return (await Promise.all(promises)).flat();
}

async function requestAndParsePage(page_index) {
    let res = await axios.get(
        start_url.replace("start=0", `start=${page_index * 25}`)
    );
    let { document } = new JSDOM(res.data, { pretendToBeVisual: true }).window;
    return await parseProductPage(document, GET_HISTORY);
}

async function parseProductPage(document, get_history) {
    const product_boxes = document.querySelectorAll(".product-box");

    const products = [];
    for (const product_box of product_boxes) {
        // Filter out ads
        if (!product_box.getAttribute("data-akpid")) continue;

        let akpid = product_box.getAttribute("data-akpid"); // Árukereső id
        let gpu_name = product_box.querySelector(".name").textContent.trim();
        let gpu_price = product_box
            .querySelector(".price")
            .textContent.replace("Ft-tól", "")
            .replace("Ft", "")
            .replace(" ", "")
            .replace(" ", "");
        gpu_price = Number(gpu_price);
        let gpu_chipset = product_box
            .querySelector(".description ul li b")
            .textContent.trim();

        let gpu_history = get_history ? await getProductHistory(akpid) : null;

        products.push({
            gpu_name,
            gpu_price,
            gpu_chipset,
            gpu_history,
        });
    }
    return products;
}

const HISTORY_URL =
    "https://www.arukereso.hu/Ajax.GetChartData.php?pt=p&pid=AKPID";
const data_regex = /"data": (\[.*\])/;

async function getProductHistory(akpid) {
    let res = await axios.get(
        HISTORY_URL.replace("AKPID", akpid.replace("p", ""))
    );
    // Convert javascript code to JSON object. This is horrible, please forgive me, for I have sinned!
    let chart = res.data.match(data_regex); // The first data portion contains minimum prices
    if (!chart) return null;

    const history = JSON.parse(chart[1]);
    return history;
}

main();
