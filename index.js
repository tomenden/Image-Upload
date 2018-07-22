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


app.get('/media-platform/auth-header', function (req, res) {
    /**
     * @description by default, the header authenticates the application
     * @type {{Authorization}}
     */

    const mediaPlatform = new MediaPlatform({
        domain: process.env.WMP_DOMAIN,
        appId: process.env.WMP_APP_ID,
        sharedSecret: process.env.WMP_SHARED_SECRET
    });

    global.mediaPlatform = mediaPlatform
    const header = mediaPlatform.getAuthorizationHeader();

    res.send(header);
});


const upload = multer({dest: nowTempFolder})



app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))


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

debugger

app.post('/upload2', upload.array('images'), function (req, res) {
    debugger
    const gameId = req.body.gameId
    const files = req.files
    /*
    File:
        {
          "fieldname": "images",
          "originalname": "2018-06-12_1343.png",
          "encoding": "7bit",
          "mimetype": "image/png",
          "destination": "./tmp",
          "filename": "309ad2251564705f69c8fdff1a97c994",
          "path": "tmp/309ad2251564705f69c8fdff1a97c994",
          "size": 297084
        }
    * */


    const mediaPlatform = new MediaPlatform({
        domain: process.env.WMP_DOMAIN,
        appId: process.env.WMP_APP_ID,
        sharedSecret: process.env.WMP_SHARED_SECRET
    })

    Promise.all(files.map(embedWatermark))
        .then(x => files.map(file => fs.unlinkSync(file.path)))
        .then(() => Promise.all(
            fs.readdirSync('tmp')
                .map(fileName => {
                    mediaPlatform.fileManager.uploadFile(`/${gameId}/${fileName}`, `./tmp/${fileName}`)
                })
            )
        )
        .then(() => res.status(204).send(`gameId: ${gameId}`))
        .catch(e => {
            console.log(e)
            res.status(204).send(e)
        })
})

app.post('/upload', async function (req, res, next) {
    const {mediaPlatform} = global
    const {gameId, files} = req


    global.files = files

    // upload.array(`${gameId}`)(req, res, next)

    const hasDir = async (name) => (await mediaPlatform.fileManager.listFiles('/')).files
        .filter(f => f.type === 'd')
        .map(d => d.path)
        .includes(`/${name}`)


    const createDir = async (gameId) => {

    }

    // if(!await hasDir(gameId)){
    //     createDir(gameId)
    // }

    // res.send('hello from upload!')

});


app.post('/temp_upload', upload.single('uploaded_file'), function (req, res) {
    console.log(req.files)
    res.redirect('/')
})
app.listen(3000, () => console.log('Example app listening on port 3000!'))
