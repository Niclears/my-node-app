const http = require('http');


const fullName = "Козлов Михаил Денисович";  
const group = "301";                    
const journalNumber = 9;                  


function calculatePi(iterations) {
    let pi = 0;
    let sign = 1;
    for (let i = 0; i < iterations; i++) {
        pi += sign / (2 * i + 1);
        sign *= -1;
    }
    return pi * 4;
}

const iterations = journalNumber * 100000;
const pi = calculatePi(iterations);

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write('<h1>Информация о студенте</h1>');
    res.write(`<p><strong>ФИО:</strong> ${fullName}</p>`);
    res.write(`<p><strong>Группа:</strong> ${group}</p>`);
    res.write(`<p><strong>Число Пи (вычисленное):</strong> ${pi}</p>`);
    res.write(`<p><strong>Количество итераций:</strong> ${iterations}</p>`);
    res.end();
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`ФИО: ${fullName}`);
    console.log(`Группа: ${group}`);
    console.log(`Число Пи: ${pi}`);
});