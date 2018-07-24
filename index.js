const path = require('path')
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const multer = require('multer')
const nowTempFolder = 'tmp'
const watermark = require('dynamic-watermark')
const HAPOEL_KATAMON_IMG_PATH = 'Hapoel_Katamon_FC.png'
const fs = require('fs')

// // load env from now.json
require('now-env');
require('isomorphic-fetch');

   
app.use(bodyParser.json());


const MediaPlatform = require('media-platform-js-sdk').MediaPlatform;



function embedWatermark(file) {
    let resolvePromise
    const promise = new Promise((res) => resolvePromise = res)

    const optionsImageWatermark = {
        type: "image",
        source: file.path,
        logo: HAPOEL_KATAMON_IMG_PATH, // This is optional if you have provided text Watermark
        destination: `${nowTempFolder}/${file.originalname}`,
        position: {
            logoX: 10,
            logoY: 10,
            logoHeight: 50,
            logoWidth: 50
        }
    };

    watermark.embed(optionsImageWatermark, function (status) {
        //Do what you want to do here
        resolvePromise(file)
    })

    return promise
}



const upload = multer({ dest: nowTempFolder })
app.post('/upload2', upload.array('images'), async function (req, res) {
    const gameId = req.body.gameId
    const originalFiles = req.files

    const mediaPlatform = new MediaPlatform({
        domain: process.env.WMP_DOMAIN,
        appId: process.env.WMP_APPID,
        sharedSecret: process.env.WMP_SHARED_SECRET
    })


    try {
        await Promise.all(originalFiles.map(embedWatermark))
        originalFiles.forEach(file => fs.unlinkSync(file.path))
        const filesToUpload = fs.readdirSync(nowTempFolder)
        await Promise.all(filesToUpload.map(fileName => {
            if (fileName !== '.keep') {
                return mediaPlatform.fileManager.uploadFile(`/${gameId}/${fileName}`, `./${nowTempFolder}/${fileName}`)
            }
        }))
        // cleanup
        fs.readdirSync('tmp').forEach(fileName => {
            if (fileName !== '.keep') {
                fs.unlinkSync(path.join(__dirname, 'tmp', fileName))
            }
        })

        res.status(204).send(`gameId: ${gameId}`)
    } catch (e) {
        // cleanup
        fs.readdirSync('tmp').forEach(fileName => {
            if (fileName !== '.keep') {
                fs.unlinkSync(path.join(__dirname, 'tmp', fileName))
            }
        }
        )
        console.log(e)
        res.status(204).send(`error: ${e}`)
    }

})

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))

app.listen(process.env.PORT || 3000);
console.log('listening on port ', process.env.PORT || 3000, '...');
