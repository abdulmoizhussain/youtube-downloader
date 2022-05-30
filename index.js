const config = require("./config.json");
const fs = require("fs");
const ytdl = require("ytdl-core");
const cliProgress = require('cli-progress');
const { getInfo, getBasicInfo, } = ytdl;
const sample = require("./basic_info_sample.json");

const BYTES_IN_ONE_MB = 1048576;

(async function () {
  sample.formats.forEach(v => console.log(v.itag, v.quality, v.qualityLabel, v.mimeType, v.contentLength));

  const progressBar = new cliProgress.SingleBar({
    // format: 'progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}'
    format: 'Downloading [{bar}] {percentage}% | {totalDownloadedMegaBytes}/{totalMegaBytes} MB'
  }, cliProgress.Presets.shades_classic);
  // const info = await getBasicInfo(config.video_url);

  console.log("Fetching video information..");
  console.time("getInfo");
  const info = await getInfo(config.video_url);
  console.timeEnd("getInfo");


  // for windows file naming.
  const cleanedTitle = info.videoDetails.title.replace(/[\/\\\:\*\?\"\<\>\|]+/g, "");
  const filePath = `./${cleanedTitle}.mp4`;

  progressBar.start(100, 0, { totalDownloadedMegaBytes: 0, totalMegaBytes: 0 });

  // ytdl(config.video_url, info)
  ytdl.downloadFromInfo(info)
    .on("end", onDownloadEnd.bind(null, progressBar))
    .on("progress", onProgressCallback.bind(null, progressBar))
    .pipe(fs.createWriteStream(filePath));

})().catch(console.log);

/**
 * 
 * @param {cliProgress.SingleBar} progressBar 
 * @param {Number} _ 
 * @param {Number} totalBytesDownloaded 
 * @param {Number} totalBytes 
 */
function onProgressCallback(progressBar, _, totalBytesDownloaded, totalBytes) {

  const percentage = parseInt((totalBytesDownloaded / totalBytes) * 100);

  const totalDownloadedMegaBytes = (totalBytesDownloaded / BYTES_IN_ONE_MB).toFixed(3);
  const totalMegaBytes = (totalBytes / BYTES_IN_ONE_MB).toFixed(3);

  progressBar.update(percentage, { totalDownloadedMegaBytes, totalMegaBytes });

  // console.log(`${percentage}% - ${totalDownloadedMegaBytes}/${totalMegaBytes} MB`);
}

/**
 * 
 * @param {cliProgress.SingleBar} progressBar
 */
function onDownloadEnd(progressBar) {
  progressBar.stop();
}