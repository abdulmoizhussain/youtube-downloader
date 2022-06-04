// sources:
// how to add cookies: https://github.com/fent/node-ytdl-core/blob/master/example/cookies.js

const config = require("./config.json");
const cliProgress = require('cli-progress');
const fs = require("fs");
const ytdl = require("ytdl-core");
const { getInfo } = ytdl;
const Readline = require("readline");
const sample = require("./basic_info_sample.json");
const winston = require("winston");
const { format } = winston;

const logger = winston.createLogger({
  transports: [
    // new winston.transports.Console(),
    new winston.transports.File({
      filename: './logs/combined.log',
      format: format.combine(format.timestamp({}), format.splat(), format.simple())
    })
  ]
});

const BYTES_IN_ONE_MB = 1048576;

/**
 * @type {ytdl.videoInfo}
 */
let videoInfo;

const progressBar = new cliProgress.SingleBar({
  format: 'Downloading [{bar}] {percentage}% | {totalDownloadedMegaBytes}/{totalMegaBytes} MB'
}, cliProgress.Presets.shades_classic);

const readline = Readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = require("util").promisify(readline.question).bind(readline);

(async function () {
  const video_url = await question("\nEnter video URL: ");

  console.log("\nTrying to fetch video information..");
  logger.info("Trying to fetch video information: %s", video_url);

  videoInfo = await getInfo(video_url);

  console.log("\nVideo found! Title:", videoInfo.videoDetails.title, "\n");
  logger.info("Video found! Title: %s", videoInfo.videoDetails.title);

  videoInfo.formats.forEach((v, i) => {
    const regexMatch = v.mimeType.match(/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+);*/);
    const mediaTypeAndContainer = regexMatch[0];
    const sizeInMb = (v.contentLength / BYTES_IN_ONE_MB).toFixed(3);
    const qualityLabel = (v.qualityLabel || "").padEnd(11, ' ');

    console.log(
      i.toString().padStart(3, " "),
      v.itag.toString().padEnd(3, ' '),
      qualityLabel,
      (sizeInMb + " MB").padStart(12, ' '),
      mediaTypeAndContainer,
      v.hasAudio ? "" : "(no audio)"
    );
  });

  readline.question("\nType format-index and enter: ", downloadVideoWithSelectedFormat);

})().catch(catcher);


/**
 * @param {String} userInputFormatIndex
 */
function downloadVideoWithSelectedFormat(userInputFormatIndex) {
  const selectedIndex = parseInt(userInputFormatIndex);
  const format = videoInfo.formats[selectedIndex];
  const { itag, container } = format;

  // for windows file naming.
  const cleanedTitle = videoInfo.videoDetails.title.replace(/[\/\\\:\*\?\"\<\>\|]+/g, "");
  const filePath = `./${cleanedTitle}-${itag}.${container}`;

  console.log("\n", "Saving file as: ", filePath, "\n");
  logger.info("Saving file as: %s", filePath);

  progressBar.start(100, 0, { totalDownloadedMegaBytes: 0, totalMegaBytes: 0 });

  ytdl.downloadFromInfo(videoInfo, { quality: format.itag })
    .on("end", onDownloadEnd)
    .on("progress", onProgressCallback)
    .pipe(fs.createWriteStream(filePath));
}

/**
 * @param {Number} _
 * @param {Number} totalBytesDownloaded
 * @param {Number} totalBytes
 */
function onProgressCallback(_, totalBytesDownloaded, totalBytes) {

  const percentage = parseInt((totalBytesDownloaded / totalBytes) * 100);

  const totalDownloadedMegaBytes = (totalBytesDownloaded / BYTES_IN_ONE_MB).toFixed(3);
  const totalMegaBytes = (totalBytes / BYTES_IN_ONE_MB).toFixed(3);

  progressBar.update(percentage, { totalDownloadedMegaBytes, totalMegaBytes });
}

function onDownloadEnd() {
  progressBar.stop();
  readline.close();
}


function catcher(error) {
  progressBar.stop();
  readline.close();
  console.log(error);
  logger.log(error);
}
