const express = require('express')
const app = express()
const fs = require('fs')
const youtube = require('ytdl-core')
const { Readable, Writable } = require('stream')
const videoIds = {}

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
})

app.get('/video', function (req, res) {
  // Ensure there is a range given for the video
  const range = req.headers.range
  if (!range) {
    res.status(400).send('Requires Range header')
  }

  // get video stats (about 61MB)
  const videoPath = 'demo.mp4'
  const videoSize = fs.statSync('demo.mp4').size

  // Parse Range
  // Example: "bytes=32324-"
  const CHUNK_SIZE = 10 ** 6 // 1MB
  const start = Number(range.replace(/\D/g, ''))
  const end = Math.min(start + CHUNK_SIZE, videoSize - 1)

  // Create headers
  const contentLength = end - start + 1
  const headers = {
    'Content-Range': `bytes ${start}-${end}/${videoSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': contentLength,
    'Content-Type': 'video/mp4',
  }

  // HTTP Status 206 for Partial Content
  res.writeHead(206, headers)

  // create video read stream for this particular chunk
  const videoStream = fs.createReadStream(videoPath, { start, end })

  // Stream the video chunk to the client
  videoStream.pipe(res)
})
app.get('/youtube-video', async function (req, res) {
  const url = 'https://www.youtube.com/watch?v=ZjBLbXUuyWg'
  const range = req.headers.range
  if (!range) {
    res.status(400).send('Requires Range header')
  }
  const start = Number(range.replace(/\D/g, ''))
  const id = url.split('?')[-1]
  let info = videoIds[id] || {}
  if (!videoIds[id]) {
    info = await youtube.getInfo(url).then((info) => {
      console.log('find');
      const mp4 = info.formats.find((item) => {
        return (
          item.mimeType.includes('mp4') &&
          (item.qualityLabel === '1080p' ||
            item.qualityLabel === '480p' ||
            item.qualityLabel === '360p' ||
            item.qualityLabel === '240p')
        )
      })
      return mp4
    })
    videoIds[id] = info
  }
  const videoSize = info.contentLength
  const CHUNK_SIZE = 10 ** 6 // 1MB
  
  const end = Math.min(start + CHUNK_SIZE, videoSize - 1)
  const contentLength = end - start + 1
  const headers = {
    'Content-Range': `bytes ${start}-${end}/${videoSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': contentLength,
    'Content-Type': 'video/mp4',
  }
  console.log(start, end);
  res.writeHead(206, headers)
  const youtubeStream = youtube(url, {
    range: {
      start,
      end
    }
  })
  youtubeStream.pipe(res)
  youtubeStream.on('close', () => {
    console.log('end');
    res.end()

  })
})
app.listen(8000, function () {
  console.log('Listening on port 8000!')
})
