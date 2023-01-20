const { default: axios } = require('axios');
const moment = require('moment/moment');
const cron = require('node-cron')
require('dotenv').config()
const Parser = require('rss-parser');
const fs = require("fs")
const { EmbedBuilder, AttachmentBuilder, WebhookClient } = require('discord.js');
let parser = new Parser();
const { v4: uuidv4 } = require('uuid');
const { exit } = require('process');




if (process.env['WEBHOOK'] == null || process.env['WEBHOOK'] == '') {

    console.error('Set WEBHOOK env variable in .env file.')
    exit()
}
console.log("BOT IS RUNNING")



cron.schedule('* * * * *', async () => {

    await fetchRss();

    console.log(`${moment().toISOString()}: Fetch done`)

});



async function fetchRss() {

    let feed = await parser.parseURL('https://rsshub.app/weibo/user/7455256856');

    feed.items.forEach(async (item) => {
        if (checkIfNew(item)) await processItem(item)
    });

}


function checkIfNew(item) {

    return moment(item.isoDate) > lastCheck()

}

async function processItem(item) {

    console.log(`New Valid RSS Found (${item.link})`.green);

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


function lastCheck() {


    if (!fs.existsSync('last_check.txt')) {
        fs.writeFileSync("last_check.txt", moment().toISOString());
        console.log('Last Check Date Unavailable. Starting from scratch.')
        return moment();
    } else {
        try {
            const text = fs.readFileSync('last_check.txt',
                { encoding: 'utf8', flag: 'r' });

            return moment(text);
        } catch (error) {
            console.log('Date reading error. Starting from scratch.');
            fs.writeFileSync("last_check.txt", moment().toISOString());
            return moment();
        }
    }

}