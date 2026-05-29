const https = require('https');

https.get("https://api.microlink.io/?url=https://stripe.com&screenshot=true&fullPage=true&meta=false", res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data).data?.screenshot?.url || data));
});
