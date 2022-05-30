const config = require("./config.json");
const fs = require("fs");
const ytdl = require("ytdl-core");
const { getInfo, getBasicInfo, } = ytdl;
const sample = require("./basic_info_sample.json");

const BYTES_IN_ONE_MB = 1048576;

(async function () {
  try {


    sample.formats.forEach(v => console.log(v.quality, v.qualityLabel, v.mimeType));

    return;
    const info = await getBasicInfo(config.video_url);

    // const af = info.player_response.streamingData.adaptiveFormats.map(v => ({ ...v, url: null }));
    // console.log(af);
    // console.log(af.length);

    // for windows file naming.
    const cleanedTitle = info.videoDetails.title.replace(/[\/\\\:\*\?\"\<\>\|]+/g, "");
    const filePath = `./${cleanedTitle}.mp4`;

    ytdl(config.video_url)
      .on("progress", onProgressCallback)
      .pipe(fs.createWriteStream(filePath));
  }
  catch (e) {
    console.log(e);
  }
})();

function onProgressCallback(_, totalBytesDownloaded, totalBytes) {
  const percentage = parseInt((totalBytesDownloaded / totalBytes) * 100);

  const totalDownloadedMegaBytes = (totalBytesDownloaded / BYTES_IN_ONE_MB).toFixed(2);
  const totalMegaBytes = (totalBytes / BYTES_IN_ONE_MB).toFixed(2);

  console.log(`${percentage}% - ${totalDownloadedMegaBytes}/${totalMegaBytes} MB`);
}