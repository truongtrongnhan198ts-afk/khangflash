'use strict';
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(process.argv[2]||'.');
if(!fs.existsSync(path.join(root,'shell.js'))||!fs.existsSync(path.join(root,'dashboard.html'))){
 throw Error('Hãy chạy trong thư mục gốc của repo KhangFlash.');
}
const script='<script defer src="/speaking-menu.js?v=1"></script>';
const pages=new Map();
for(const name of fs.readdirSync(root)){
 if(!name.endsWith('.html'))continue;
 const file=path.join(root,name);
 const body=fs.readFileSync(file,'utf8');
 if(body.includes('/speaking-menu.js'))continue;
 const shell=/<script\b[^>]*\bsrc=["']\/?shell\.js(?:\?[^"']*)?["'][^>]*><\/script>/i;
 if(shell.test(body))pages.set(file,body.replace(shell,match=>match+script));
}
const assets=['ielts-speaking.html','ielts-speaking.css','ielts-speaking.js','speaking-menu.js'];
for(const name of assets)fs.copyFileSync(path.join(__dirname,name),path.join(root,name));
const speaking=path.join(root,'ielts-speaking.html');
fs.writeFileSync(speaking,fs.readFileSync(speaking,'utf8').replace('</head>',script+'\n</head>'));
for(const [file,body] of pages)if(file!==speaking)fs.writeFileSync(file,body);
console.log('Đã cài IELTS Speaking. Đã thêm menu trên '+pages.size+' trang có menu dùng chung.');
