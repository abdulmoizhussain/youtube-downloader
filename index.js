// sources:
// how to add cookies: https://github.com/fent/node-ytdl-core/blob/master/example/cookies.js

const cliProgress = require('cli-progress');
const fs = require("fs");
const ytdl = require("ytdl-core");
const inquirer = require('inquirer');
const { getInfo } = ytdl;
const winston = require("winston");
const { join } = require('path');
const { format: winstonFormat } = winston;

const logger = winston.createLogger({
  transports: [
    // new winston.transports.Console(),
    new winston.transports.File({
      filename: './logs/combined.log',
      format: winstonFormat.combine(winstonFormat.timestamp(), winstonFormat.splat(), winstonFormat.simple())
    })
  ]
});

const BYTES_IN_ONE_MB = 1048576;

const progressBar = new cliProgress.SingleBar({
  format: 'Downloading [{bar}] {percentage}% | {totalDownloadedMegaBytes}/{totalMegaBytes} MB'
}, cliProgress.Presets.shades_classic);


StartUp();

function StartUp() {
  Program().catch(catcher);
}

async function Program() {
  const { value: video_url } = await inquirer.prompt([{ type: "input", name: "value", message: "Enter video link (Right-Click in black area to paste):" }]);

  console.log("\nTrying to fetch video information..");
  logger.info("Trying to fetch video information: %s", video_url);

  const videoInfo = await getInfo(video_url);

  console.log("\nVideo found! Title:", videoInfo.videoDetails.title, "\n");
  logger.info("Video found! Title: %s", videoInfo.videoDetails.title);

  const choices = videoInfo.formats.map((format, index) => {
    const regexMatch = format.mimeType.match(/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+);*/);
    const mediaTypeAndContainer = regexMatch[0];
    const sizeInMb = format.contentLength === undefined ? "(unknown size)" : (format.contentLength / BYTES_IN_ONE_MB).toFixed(3) + " MB";
    const qualityLabel = (format.qualityLabel || "").padEnd(11, ' ');

    const choiceMessageSplitted = [
      // i.toString().padStart(3, " "), // index
      // v.itag.toString().padEnd(3, ' '), // itag
      qualityLabel,
      sizeInMb.padStart(14, ' '),
      mediaTypeAndContainer,
      format.hasAudio ? "" : "(without audio)",
    ];

    return { name: choiceMessageSplitted.join(" "), value: index };
  });

  const { value: selectedIndex } = await inquirer.prompt([{
    choices: choices,
    type: "list",
    name: "value",
    message: "Select media type and format:",
  }]);

  const format = videoInfo.formats[selectedIndex];
  const { itag, container } = format;

  // to follow windows file naming convention.
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
  console.log("Download complete! Need to download another video?\n");
  StartUp();
}

function catcher(error) {
  if (progressBar) {
    progressBar.stop();
  }
  if (typeof error.toString === "function") {
    logger.error(error.toString());
  }
  else if (typeof error.message === "string") {
    logger.error(error.message);
  }
  else {
    logger.error(JSON.stringify(error));
  }

  console.log("\nSome error occurred! Try again.");
  StartUp();
}
