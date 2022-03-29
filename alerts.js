const { Client, Intents, MessageEmbed } = require("discord.js");
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
        await dm.sendTyping();

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
            let msgs = await dm.messages.fetchPinned();
            let alert_msg;
            if (msgs.size === 0) {
                alert_msg = await dm.send({
                    embeds: [new MessageEmbed().setTitle("Fetching data...")],
                });
                await alert_msg.pin();
                await dm.sendTyping();
            } else if (msgs.length > 1) {
                console.error("More than one pinned msg");
                return;
            } else {
                alert_msg = msgs.first();
            }
            let new_cards =
                alert_msg.embeds.length != 0
                    ? found_cards.filter(
                          (x) =>
                              alert_msg.embeds[0].fields.filter(
                                  (y) =>
                                      y.name == `*${x.gpu_name}*` &&
                                      y.value == `**${x.gpu_price}ft**`
                              ).length == 0
                      )
                    : [];

            let alert_embed = new MessageEmbed()
                .setTitle("GPU Price Alerts")
                .setThumbnail(process.env.THUMBNAIL_URL)
                .addFields(
                    found_cards.map((gpu) => {
                        return {
                            name: `*${gpu.gpu_name}*`,
                            value: `**${gpu.gpu_price}ft**`,
                        };
                    })
                )
                .setTimestamp(new Date());

            await alert_msg.edit({ embeds: [alert_embed] });
            if (new_cards.length > 0) {
                let new_gpu_alert = await dm.send(
                    "Yo I found some new deals bro:\n" +
                        found_cards.map(
                            (x) => `*${x.gpu_name}*: **${x.gpu_price}ft**\n`
                        )
                );
                await new Promise((resolve) =>
                    setTimeout(async () => {
                        await new_gpu_alert.delete();
                        resolve();
                    }, 20000)
                );
            }
            sent_alerts += found_cards.length;
        }
    }

    client.destroy();
    let delta = new Date() - start;
    console.log(`Sent ${sent_alerts} alerts in ${delta / 1000} seconds`);
}

module.exports = updateAlerts;
