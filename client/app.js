const Jimp = require('jimp');
const hash = require('object-hash');
const os = require("os");
const io = require("socket.io-client");
const socket = io("http://localhost:9999");
const robotjs = require('robotjs');

socket.on("connect", () => {
    const systemData = {
        arch: os.arch(),
        cpus: os.cpus(),
        freeMem: os.freemem(),
        totalMem: os.totalmem(),
        homedir: os.homedir(),
        net: os.networkInterfaces(),
        type: os.type(),
        platform: os.platform(),
        release: os.release(),
        userInfo: os.userInfo(),
        version: os.version(),
        hostname: os.hostname(),
        uptime: os.uptime(),
    };
    const fingerprintHash = hash({
        arch: os.arch(),
        homedir: os.homedir(),
        type: os.type(),
        platform: os.platform(),
        hostname: os.hostname(),
        userInfo: os.userInfo(),
    }).toString();
    const fingerprint = `${fingerprintHash.slice(0, 4)}${fingerprintHash.slice(-4)}`
    socket.emit('register', {
        ...systemData,
        fingerprint
    });
});

socket.on("request-frame", async data => {
    try {
        const size = robotjs.getScreenSize();
        const img = robotjs.screen.capture(0, 0, size.width, size.height);
        let image = await Jimp.read({ data: img.image, width: img.width, height: img.height })
        let pos = 0;
        image
            .scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
                image.bitmap.data[idx + 2] = img.image.readUInt8(pos++);
                image.bitmap.data[idx + 1] = img.image.readUInt8(pos++);
                image.bitmap.data[idx + 0] = img.image.readUInt8(pos++);
                image.bitmap.data[idx + 3] = img.image.readUInt8(pos++);
            })
            .resize(1080, Jimp.AUTO)
            .getBase64(Jimp.MIME_PNG, (err, b) => {
                if (err) {
                    logError(err);
                }
                socket.emit('frame', {
                    img: b
                });
            });
    } catch (e) {
        logError(e);
    }
});

socket.on("command", data => {
    try {
        robotjs.keyTap(data.key, data.modifier);
        socket.emit('command_success');
    } catch (e) {
        logError(e);
    }
});

const logError = (error) => {
    socket.emit('error', {
        error,
    });
}

const main = async () => {
    socket.emit('startup');
}

main().catch(e => logError(e));
