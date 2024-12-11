const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid'); // uuid installieren: npm install uuid

module.exports = async function (context, req) {
    // Erstellen der Dateien "DUMMYS"
    const temp = path.join(__dirname, `${uuidv4()}.webm`);
    const tempOut = path.join(__dirname, `${uuidv4()}.wav`);
    const tempPath = path.join(__dirname, uuidv4());
    //const tempPath = path.join(__dirname);

    // Sicherstellen, dass das temporäre Verzeichnis existiert
    if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath, { recursive: true });
    }

    try {
        // Prüfen und Konvertieren des Bodies
        if (!req.body || (typeof req.body === 'string' && !Buffer.isBuffer(req.body))) {
            context.log(`Request body type: ${typeof req.body}`);
            throw new Error('Request body is empty or not a valid buffer.');
        }
       // context.log('Hello');
        //context.log(`req.body type: ${typeof req.body}`);
        //context.log(`req.body:`, req.body);

        if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
            req.body = Buffer.from(JSON.stringify(req.body)); // Konvertiere in Buffer 
        }if (!Buffer.isBuffer(req.body)) {
          throw new Error('Request body is not a valid Buffer.');
}

        // Konvertiere Body in Buffer falls nötig
        const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);

        // Schreiben des hochgeladenen Inhalts in eine temporäre Datei
        fs.writeFileSync(temp, bodyBuffer);

        // Protokollierung der Dateigröße
        const fileStats = fs.statSync(temp);
        context.log(`Renc Length: ${fileStats.size}`);
        //context.log('Hello');
        
        // FFMPEG ausführen, um die Datei zu konvertieren
        const ffmpegPath = "C:\\home\\site\\wwwroot\\ffmpeg\\ffmpeg.exe";
       // const ffmpegArgs = ['-i', temp, tempOut];
        const ffmpegArgs = ['-i', temp, '-c:a', 'pcm_s16le', '-ar', '44100', '-ac', '2', tempOut];

        context.log(`Args: ${ffmpegArgs.join(' ')}`);

        // Command wird ausgeführt 
        await new Promise((resolve, reject) => {
            const process = spawn(ffmpegPath, ffmpegArgs);

            process.stdout.on('data', (data) => context.log(data.toString()));
            process.stderr.on('data', (data) => context.log(data.toString()));
            process.on('error', (err) => reject(err));
            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`ffmpeg process exited with code ${code}`));
                } else {
                    resolve();
                }
            });
        });

        // Gelesene Datei zurückgeben
        const convertedFile = fs.readFileSync(tempOut); // .byteOffset TODO schauen ob byteOffset zurückgegeben werden soll oder was anderese 
        context.log(`Renc Length: ${convertedFile.length}`);
        // context.log('"""""""""""""""""');
        // context.log(convertedFile);

        context.res = {
            status: 200,
            body: convertedFile,
            headers: {
                'Content-Type': 'audio/wav'
            }
        };
    } catch (err) {
        context.log.error(err.message);
        context.res = {
            status: 500,
            body: `An error occurred: ${err.message}`
        };
    } finally {
        // Aufräumen der temporären Dateien
        if (fs.existsSync(temp)) fs.unlinkSync(temp);
        if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
        if (fs.existsSync(tempPath)) fs.rmdirSync(tempPath, { recursive: true });
    }
};
