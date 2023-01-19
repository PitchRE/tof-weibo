const { default: axios } = require('axios');
const moment = require('moment/moment');
const cron = require('node-cron')
require('dotenv').config()
const Parser = require('rss-parser');
const fs = require("fs")
const { EmbedBuilder, AttachmentBuilder, WebhookClient } = require('discord.js');
let parser = new Parser();
const { v4: uuidv4 } = require('uuid');



let lastCheck = moment().subtract(1, 'days');

cron.schedule('* * * * *', async () => {

    await fetchRss();

    lastCheck = moment();

    console.log('fetch done')

});



async function fetchRss() {

    let feed = await parser.parseURL('https://rsshub.app/weibo/user/7455256856');

    feed.items.forEach(async (item) => {
        if (checkIfNew(item)) await processItem(item)
    });
}


function checkIfNew(item) {
    if (moment(item.isoDate) > lastCheck) return true;
    return false;
}

async function processItem(item) {


    const files = await getFiles(item.content)

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(item.title)
        .setURL(item.link)
        .setDescription(item.contentSnippet)
        .setTimestamp()

    if (files[0]) embed.setImage('attachment://' + files[0].attachment.replace(/^.*[\\\/]/, ''))

    await sendWebhook(embed, files)
    if (files[0]) {

        fs.unlink(files[0].attachment, (err) => {
            if (err) throw err //handle your error the way you want to;
            console.log();//or else the file will be deleted
        });

    }

}


async function sendWebhook(embed, files) {

    const webhookClient = new WebhookClient({ url: process.env['WEBHOOK'] });

    await webhookClient.send({
        username: 'Tower of Fantasy Weibo',
        avatarURL: 'https://i.imgur.com/AfFp7pu.png',
        files: files,
        embeds: [embed],
    });
    return;

}


async function getFiles(html) {
    let arr = getImgSrc(html)

    let link = null;
    arr.forEach((el) => {

        if (el.includes('tvax3.sinaimg.cn')) {
            link = el;

        }
    })




    if (link != null) {


        let filename = `./temp/${uuidv4()}.png`;
        return axios.get(link, {
            responseEncoding: "base64",
            responseType: "text",
            headers: {
                referer: 'https://weibo.com/'
            }
        }).then(async (response) => {
            await fs.writeFileSync(filename, response.data, { encoding: "base64" })


            return [new AttachmentBuilder(filename)]


        })
    } else {
        return [];
    }

}


function getImgSrc(html) {


    return html.match(/<img [^>]*src="[^"]*"[^>]*>/gm)
        .map(x => x.replace(/.*src="([^"]*)".*/, '$1'));
}