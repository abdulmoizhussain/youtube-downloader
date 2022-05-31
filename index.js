// sources:
// how to add cookies: https://github.com/fent/node-ytdl-core/blob/master/example/cookies.js

const config = require("./config.json");
const cliProgress = require('cli-progress');
const fs = require("fs");
const ytdl = require("ytdl-core");
const { getInfo } = ytdl;
const Readline = require("readline");
const sample = require("./basic_info_sample.json");

const BYTES_IN_ONE_MB = 1048576;

/**
 * @type {ytdl.videoFormat[]}
 */
let formats;

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

(async function () {
  console.log("\nTrying to fetching video information..");
  videoInfo = await getInfo(config.video_url);

  console.log("Video Title:", videoInfo.videoDetails.title, "\n");

  formats = videoInfo.formats.map((v, i) => {
    // TODO use the following properties instead of regex (remove regex).
    // v.hasAudio;
    // v.hasVideo;
    // v.container;

    const regexMatch = v.mimeType.match(/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+);*/);
    const mediaType = regexMatch[1];
    const fileFormat = regexMatch[2];
    const sizeInMb = (v.contentLength / BYTES_IN_ONE_MB).toFixed(3);
    const qualityLabel = (v.qualityLabel || "").padEnd(11, ' ');

    console.log(
      i.toString().padStart(3, " "),
      v.itag.toString().padEnd(3, ' '),
      qualityLabel,
      (sizeInMb + " MB").padStart(12, ' '),
      v.mimeType,
    );

    return {
      itag: v.itag,
      quality: v.quality,
      qualityLabel: qualityLabel,
      mimeType: v.mimeType,
      mediaType: mediaType,
      fileFormat: fileFormat,
    };
  });

  readline.question("\nType format-index and enter: ", downloadVideoWithSelectedFormat);

})().catch(console.log);

/**
 * @param {String} userInputFormatIndex
 */
function downloadVideoWithSelectedFormat(userInputFormatIndex) {
  const selectedIndex = parseInt(userInputFormatIndex);
  const format = formats[selectedIndex];
  const { fileFormat, itag } = format;

  // for windows file naming.
  const cleanedTitle = videoInfo.videoDetails.title.replace(/[\/\\\:\*\?\"\<\>\|]+/g, "");
  const filePath = `./${cleanedTitle}-${itag}.${fileFormat}`;

  console.log("\n", "Saving file as: ", filePath, "\n");

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
