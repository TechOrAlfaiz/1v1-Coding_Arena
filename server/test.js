const axios = require('axios');

axios.post('https://glot.io/api/run/cpp/latest', {
  files: [{ name: 'main.cpp', content: 'int main(){ return 0; }' }]
}, {
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
})
.then(r => console.log('SUCCESS:', JSON.stringify(r.data)))
.catch(e => console.log('ERROR:', e.response?.status, e.message));