const { Client, Intents } = require("discord.js");
const { discord_token, alerts } = require("./alerts_config.json");

async function updateAlerts(products) {
    let start = new Date();
    const client = new Client({ intents: [Intents.FLAGS.DIRECT_MESSAGES] });

    await client.login(discord_token);

    let sent_alerts = 0;
    for (const user in alerts) {
        var set_alerts = alerts[user];
        var found_cards = [];
        let dm = await client.users.createDM(user);

        for (const product of products) {
            for (const pattern in set_alerts) {
                const regex = new RegExp(pattern);
                if (
                    product.gpu_price < set_alerts[pattern] &&
                    regex.test(product.gpu_name)
                ) {
                    found_cards.push(product);
                }
            }
        }
        if (found_cards.length > 0) {
            const found_cards_string = found_cards
                .map((x) => `*${x.gpu_name}*: **${x.gpu_price}ft**`)
                .join("\n");
            await dm.send({
                content: `**Yo (${new Date().toISOString()}) I found some cards bro**: \n${found_cards_string}`,
            });
            sent_alerts += found_cards.length;
        }
    }

    client.destroy();
    let delta = new Date() - start;
    console.log(`Sent ${sent_alerts} alerts in ${delta / 1000} seconds`);
}

module.exports = updateAlerts;
