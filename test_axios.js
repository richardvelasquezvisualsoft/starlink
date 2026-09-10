const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function test() {
    fs.writeFileSync('test.txt', 'hello');
    const form = new FormData();
    form.append('file', fs.createReadStream('test.txt'));
    
    try {
        const res1 = await axios.post('http://127.0.0.1:8060/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log("With multipart/form-data:", res1.data);
    } catch(e) {
        console.log("With multipart/form-data Error:", e.response ? e.response.data : e.message);
    }

    try {
        const res2 = await axios.post('http://127.0.0.1:8060/upload', form, {
            headers: form.getHeaders()
        });
        console.log("With getHeaders:", res2.data);
    } catch(e) {
        console.log("With getHeaders Error:", e.response ? e.response.data : e.message);
    }
}
test();
