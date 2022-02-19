const { GoogleSpreadsheet } = require("google-spreadsheet");

const CREDS = require("./key.json");
const SPREADSHEET_ID = "1dYyHBLW92jrXyRHlAH5kPDDbDpWAWfbfu-m0_1f2csg";

function convertMsToTimestamp(milliseconds) {
    return milliseconds / 1000 / 60 / 60 / 24 + 25569 + 1 / 24;
}

async function updateSpreadsheet(products, history) {
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    const start = new Date();
    await doc.useServiceAccountAuth(CREDS);

    await doc.loadInfo();
    const dataSheet = doc.sheetsByTitle["Data"];
    await dataSheet.loadHeaderRow();

    const date = new Date();
    const ts = convertMsToTimestamp(date.getTime()); // Convert javascript timestamp into google sheets epoch time

    if (!history) {
        let header_change = null;
        let new_row = {};

        for (const product of products) {
            if (!dataSheet.headerValues.includes(product.gpu_name)) {
                if (!header_change) header_change = dataSheet.headerValues;
                header_change.push(product.gpu_name);
            }
            new_row[product.gpu_name] = product.gpu_price;
        }
        if (header_change) {
            await dataSheet.setHeaderRow(header_change);
            // Chipset names need to be updated after header row has been updated
            let chipset_row = (
                await dataSheet.getRows({ offset: 0, limit: 1 })
            )[0];

            for (const product of products) {
                chipset_row[product.gpu_name] = product.gpu_chipset;
            }
            await chipset_row.save();
        }

        new_row.date = ts;
        dataSheet.addRow(new_row);
        let delta = new Date() - start;
        console.log(
            `Inserted new row into spreadsheet in ${delta / 1000} seconds`
        );
    } else {
        const first_price_row = await dataSheet.getRows({
            offset: 1,
            limit: 1,
        });
        if (first_price_row && first_price_row.length != 0) {
            console.log("Existing prices found in spreadsheet, stopping.");
            return;
        }

        let header_change = null;
        let rows_by_date = {};

        for (const product of products) {
            if (!dataSheet.headerValues.includes(product.gpu_name)) {
                if (!header_change) header_change = dataSheet.headerValues;
                header_change.push(product.gpu_name);
            }
            if (product.gpu_history) {
                for (const data_point of product.gpu_history) {
                    if (!rows_by_date[data_point.t])
                        rows_by_date[data_point.t] = {};
                    rows_by_date[data_point.t][product.gpu_name] = data_point.y;
                }
            }
        }
        if (header_change) {
            await dataSheet.setHeaderRow(header_change);
            // Chipset names need to be updated after header row has been updated
            let chipset_row = (
                await dataSheet.getRows({ offset: 0, limit: 1 })
            )[0];

            for (const product of products) {
                chipset_row[product.gpu_name] = product.gpu_chipset;
            }
            await chipset_row.save();
        }

        let new_rows = [];
        for (const [date, gpus] of Object.entries(rows_by_date)) {
            const new_row = {};
            for (const [gpu_name, price] of Object.entries(gpus)) {
                new_row[gpu_name] = price;
            }
            new_row.date = convertMsToTimestamp(date);
            new_rows.push(new_row);
        }

        new_rows = new_rows.sort((x, y) => x.date - y.date);
        await dataSheet.addRows(new_rows);
        let delta = new Date() - start;
        console.log(
            `Inserted history rows into spreadsheet in ${delta / 1000} seconds`
        );
    }
}

module.exports = updateSpreadsheet;
