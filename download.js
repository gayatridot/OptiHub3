const https = require('https');
const fs = require('fs');

https.get('https://raw.githubusercontent.com/gzuidhof/coi-serviceworker/master/coi-serviceworker.js', (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to download: ${res.statusCode}`);
    process.exit(1);
  }
  const file = fs.createWriteStream('coi-serviceworker.min.js');
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download complete');
  });
}).on('error', (err) => {
  console.error(err);
  process.exit(1);
});
