const qrcode = require('qrcode-terminal');

const { Client } = require('whatsapp-web.js');
const client = new Client({ puppeteer: { product: "chrome", executablePath: "/usr/bin/chromium-browser" } });

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');
});

////////////////////////////////////////// END OF AUTHENTIFICATION //////////////////////////////////////////////
///////////////////////////////////////////////////////////////////




client.on('message', message => {
	console.log(message.body);
});








client.initialize();
